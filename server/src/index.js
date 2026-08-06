import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import multer from 'multer'
import { z } from 'zod'

import { collection, singleton, changes, changedAt } from './store.js'
import { requireAuth, verify, issueToken, IS_DEFAULT_SECRET } from './auth.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS = path.join(HERE, '..', 'uploads')
fs.mkdirSync(UPLOADS, { recursive: true })

const PORT = Number(process.env.PORT ?? 4000)
const app = express()

app.use(cors())
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(UPLOADS, { maxAge: '7d' }))

/* ------------------------------------------------------------------ */
/* Uploads                                                             */
/* ------------------------------------------------------------------ */

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'])

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS,
    filename(_req, file, cb) {
      // keep something human-readable, but never trust the supplied name:
      // strip directories and anything that is not a safe character
      const safe = path
        .basename(file.originalname)
        .replace(/\.[^.]+$/, '')
        .replace(/[^a-zA-Z0-9-_]/g, '-')
        .slice(0, 40)
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10)
      cb(null, `${Date.now()}-${safe}${ext}`)
    },
  }),
  limits: { fileSize: 6 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WebP or SVG images are allowed'))
    }
    cb(null, true)
  },
})

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

const banners = collection('banners')
const team = collection('team')
const gallery = collection('gallery')
const reviews = collection('reviews')
const enquiries = collection('enquiries')
const contact = singleton('contact')

const schemas = {
  banners: z.object({
    image: z.string().min(1, 'An image is required'),
    alt: z.string().min(1, 'Alt text is required — it is read aloud and shown if the image fails'),
    active: z.boolean().optional(),
    position: z.number().int().optional(),
  }),
  team: z.object({
    name: z.string().min(1, 'Name is required'),
    role: z.string().min(1, 'Role is required'),
    bio: z.string().optional().default(''),
    photo: z.string().optional().default(''),
    active: z.boolean().optional(),
    position: z.number().int().optional(),
  }),
  gallery: z.object({
    image: z.string().min(1, 'An image is required'),
    caption: z.string().min(1, 'Caption is required'),
    tag: z.string().optional().default('Celebrations'),
    alt: z.string().optional().default(''),
    active: z.boolean().optional(),
    position: z.number().int().optional(),
  }),
  reviews: z.object({
    name: z.string().min(1, 'Name is required'),
    city: z.string().optional().default(''),
    stars: z.coerce.number().int().min(1).max(5).default(5),
    text: z.string().min(1, 'Review text is required'),
    active: z.boolean().optional(),
    position: z.number().int().optional(),
  }),
}

const contactSchema = z.object({
  phone: z.string().optional(),
  phoneHref: z.string().optional(),
  email: z.string().email('That does not look like an email address').optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  hours: z.array(z.object({ days: z.string(), time: z.string() })).optional(),
  socials: z.array(z.object({ label: z.string(), href: z.string(), icon: z.string() })).optional(),
})

/** Turn a Zod failure into { field: message }, which is what the form renders. */
function fieldErrors(err) {
  const out = {}
  for (const issue of err.issues) out[issue.path.join('.') || '_'] = issue.message
  return out
}

/**
 * Mounts list / create / update / delete / reorder for one resource.
 *
 * Reads are public so the website can render from them; writes need a token.
 */
function crud(name, store, schema) {
  app.get(`/api/${name}`, (req, res) => {
    // the public site asks for ?active=1; the admin wants everything
    res.json(store.all({ activeOnly: req.query.active === '1' }))
  })

  app.post(`/api/${name}`, requireAuth, (req, res) => {
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) return res.status(422).json({ errors: fieldErrors(parsed.error) })
    res.status(201).json(store.create({ active: true, ...parsed.data }))
  })

  app.put(`/api/${name}/:id`, requireAuth, (req, res) => {
    // partial() so a toggle can send just { active: false }
    const parsed = schema.partial().safeParse(req.body)
    if (!parsed.success) return res.status(422).json({ errors: fieldErrors(parsed.error) })
    const row = store.update(req.params.id, parsed.data)
    if (!row) return res.status(404).json({ error: 'Not found' })
    res.json(row)
  })

  app.delete(`/api/${name}/:id`, requireAuth, (req, res) => {
    if (!store.remove(req.params.id)) return res.status(404).json({ error: 'Not found' })
    res.status(204).end()
  })

  app.post(`/api/${name}/reorder`, requireAuth, (req, res) => {
    const parsed = z.object({ ids: z.array(z.string()) }).safeParse(req.body)
    if (!parsed.success) return res.status(422).json({ errors: fieldErrors(parsed.error) })
    res.json(store.reorder(parsed.data.ids))
  })
}

crud('banners', banners, schemas.banners)
crud('team', team, schemas.team)
crud('gallery', gallery, schemas.gallery)
crud('reviews', reviews, schemas.reviews)

/* ------------------------------------------------------------------ */
/* Contact — one row, plus the enquiries the public form produces       */
/* ------------------------------------------------------------------ */

app.get('/api/contact', (_req, res) => res.json(contact.get() ?? {}))

app.put('/api/contact', requireAuth, (req, res) => {
  const parsed = contactSchema.safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ errors: fieldErrors(parsed.error) })
  res.json(contact.set(parsed.data))
})

/** Public: the website's contact form posts here. */
app.post('/api/enquiries', (req, res) => {
  const parsed = z
    .object({
      name: z.string().min(1, 'Please tell us your name'),
      email: z.string().email('Please check the email address'),
      phone: z.string().optional().default(''),
      message: z.string().min(1, 'Please write a message'),
    })
    .safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ errors: fieldErrors(parsed.error) })

  enquiries.create({ ...parsed.data, read: false })
  // deliberately no echo of the stored row — the sender does not need an id
  res.status(201).json({ ok: true })
})

app.get('/api/enquiries', requireAuth, (_req, res) => res.json(enquiries.all()))

app.put('/api/enquiries/:id', requireAuth, (req, res) => {
  const row = enquiries.update(req.params.id, { read: Boolean(req.body.read) })
  if (!row) return res.status(404).json({ error: 'Not found' })
  res.json(row)
})

app.delete('/api/enquiries/:id', requireAuth, (req, res) => {
  if (!enquiries.remove(req.params.id)) return res.status(404).json({ error: 'Not found' })
  res.status(204).end()
})

/* ------------------------------------------------------------------ */
/* Auth, uploads, health                                               */
/* ------------------------------------------------------------------ */

app.post('/api/login', async (req, res) => {
  const parsed = z
    .object({ email: z.string().min(1), password: z.string().min(1) })
    .safeParse(req.body)
  if (!parsed.success) return res.status(422).json({ error: 'Email and password are required' })

  const user = await verify(parsed.data.email, parsed.data.password)
  if (!user) return res.status(401).json({ error: 'Wrong email or password' })

  res.json({
    token: issueToken(user),
    user: { id: user.id, email: user.email, name: user.name },
  })
})

app.get('/api/me', requireAuth, (req, res) => res.json({ user: req.user }))

app.post('/api/upload', requireAuth, (req, res) => {
  upload.single('file')(req, res, (err) => {
    // multer reports size and type failures here rather than throwing
    if (err) return res.status(422).json({ error: err.message })
    if (!req.file) return res.status(422).json({ error: 'No file received' })
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      type: req.file.mimetype,
    })
  })
})

/**
 * Live updates, over Server-Sent Events.
 *
 * One-way server-to-browser is exactly the shape of this problem, and SSE is
 * plain HTTP: no extra dependency, no upgrade handshake, and the browser
 * reconnects on its own if the connection drops or the API restarts.
 *
 * The payload is only a timestamp — the client refetches what it needs. Sending
 * the changed rows would mean every client parsing updates for content it does
 * not render.
 */
app.get('/api/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    // proxies that buffer would hold events until the connection closed
    'X-Accel-Buffering': 'no',
  })

  const send = (at) => res.write(`event: change\ndata: ${JSON.stringify({ at })}\n\n`)

  // tell a joiner where things stand, so it can tell whether it missed anything
  res.write(`event: hello\ndata: ${JSON.stringify({ at: changedAt() })}\n\n`)

  changes.on('change', send)

  // a comment line every 25s: idle connections get dropped by proxies and by
  // some hosts, and this is cheap enough to be invisible
  const keepAlive = setInterval(() => res.write(': keep-alive\n\n'), 25_000)

  req.on('close', () => {
    clearInterval(keepAlive)
    changes.off('change', send)
  })
})

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, counts: {
    banners: banners.all().length,
    team: team.all().length,
    gallery: gallery.all().length,
    reviews: reviews.all().length,
    enquiries: enquiries.all().length,
  } }),
)

// last resort, so a thrown error is JSON rather than an HTML stack page
app.use((err, _req, res, _next) => {
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

app.listen(PORT, () => {
  console.log(`SGD admin API on http://localhost:${PORT}`)
  if (IS_DEFAULT_SECRET) {
    console.warn('WARNING: JWT_SECRET is unset — using the public development secret.')
    console.warn('         Set it in the environment before exposing this to the internet.')
  }
})
