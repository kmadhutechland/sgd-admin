/**
 * Seeds the database from the content already on the site.
 *
 * The admin panel is worth nothing opening onto empty tables, and re-typing what
 * is already in src/data is both slow and a chance to introduce differences. So
 * this reads the real site files and imports them.
 *
 * Safe to re-run: it does nothing if an admin user already exists, so it cannot
 * quietly wipe edits made through the panel.
 */
import fs from 'node:fs'
import path from 'node:path'
import { collection, singleton, isEmpty } from './store.js'
import { createUser } from './auth.js'

const SITE = 'c:/techland/zapp/src/data'

const DEFAULT_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@sgdlogistics.in'
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD ?? 'sgd-admin-2026'

/**
 * Pull one `export const NAME = [...]` or `{...}` out of a source file.
 *
 * The data files are plain ES modules of literals, so evaluating the extracted
 * literal is enough — no bundler, no import of the site's whole dependency tree.
 */
function readExport(file, name) {
  const src = fs.readFileSync(path.join(SITE, file), 'utf8')
  const start = src.indexOf(`export const ${name} =`)
  if (start === -1) return null

  const open = src.indexOf('=', start) + 1
  let i = open
  while (i < src.length && ' \n\r\t'.includes(src[i])) i++
  const opener = src[i]
  const closer = opener === '[' ? ']' : '}'
  if (!'[{'.includes(opener)) return null

  let depth = 0
  let end = i
  let inStr = null
  for (; i < src.length; i++) {
    const c = src[i]

    if (inStr) {
      if (c === '\\') i++
      else if (c === inStr) inStr = null
      continue
    }

    // Comments have to be skipped, not scanned. CONTACT carries a block comment
    // containing "the client's address"; that apostrophe was opening a string
    // that never closed, so the scan ran past the end of the object.
    if (c === '/' && src[i + 1] === '/') {
      i = src.indexOf('\n', i)
      if (i === -1) break
      continue
    }
    if (c === '/' && src[i + 1] === '*') {
      i = src.indexOf('*/', i + 2)
      if (i === -1) break
      i += 1
      continue
    }

    if (c === "'" || c === '"' || c === '`') inStr = c
    else if (c === opener) depth++
    else if (c === closer) {
      depth--
      if (depth === 0) {
        end = i + 1
        break
      }
    }
  }

  const literal = src.slice(src.indexOf(opener, open), end)
  try {
    // the literals reference IMG.* and helpers; stub them so they evaluate
    const IMG = new Proxy({}, { get: (_t, k) => `IMG.${String(k)}` })
    const avatar = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=400`
    const photo = (id, w = 1600) =>
      `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=${w}`
    // eslint-disable-next-line no-new-func
    return new Function('IMG', 'avatar', 'photo', `return (${literal})`)(IMG, avatar, photo)
  } catch (e) {
    console.warn(`  could not evaluate ${name}: ${e.message}`)
    return null
  }
}

async function run() {
  if (!isEmpty()) {
    console.log('Database already seeded — nothing to do.')
    console.log('Delete server/data/db.json first if you want to start over.')
    return
  }

  const user = await createUser({
    email: DEFAULT_EMAIL,
    password: DEFAULT_PASSWORD,
    name: 'SGD Administrator',
  })
  console.log(`Created admin user: ${user.email}`)

  // ---- banners -----------------------------------------------------
  const slides = readExport('media.js', 'BANNER_SLIDES') ?? []
  const banners = collection('banners')
  slides.forEach((s, i) =>
    banners.create({ image: s.src, alt: s.alt ?? '', active: true, position: i }),
  )
  console.log(`Imported ${slides.length} banners`)

  // ---- team --------------------------------------------------------
  const leadership = readExport('content.js', 'LEADERSHIP') ?? []
  const team = collection('team')
  leadership.forEach((m, i) =>
    team.create({
      name: m.name,
      role: m.role,
      bio: m.bio ?? '',
      photo: typeof m.photo === 'string' ? m.photo : '',
      active: true,
      position: i,
    }),
  )
  console.log(`Imported ${leadership.length} team members`)

  // ---- gallery -----------------------------------------------------
  const shots = readExport('content.js', 'GALLERY') ?? []
  const gallery = collection('gallery')
  shots.forEach((g, i) =>
    gallery.create({
      image: typeof g.src === 'string' ? g.src : '',
      caption: g.caption ?? '',
      tag: g.tag ?? 'Celebrations',
      alt: g.alt ?? '',
      active: true,
      position: i,
    }),
  )
  console.log(`Imported ${shots.length} gallery images`)

  // ---- reviews -----------------------------------------------------
  const list = readExport('content.js', 'REVIEWS') ?? []
  const reviews = collection('reviews')
  list.forEach((r, i) =>
    reviews.create({
      name: r.name,
      city: r.city ?? '',
      stars: r.stars ?? 5,
      text: r.text ?? '',
      active: true,
      position: i,
    }),
  )
  console.log(`Imported ${list.length} reviews`)

  // ---- contact -----------------------------------------------------
  const c = readExport('site.js', 'CONTACT')
  const socials = readExport('site.js', 'SOCIALS') ?? []
  if (c) {
    singleton('contact').set({
      phone: c.phone ?? '',
      phoneHref: c.phoneHref ?? '',
      email: c.supportEmail ?? '',
      address: [c.hq?.line1, c.hq?.line2, c.hq?.city].filter(Boolean).join(', '),
      city: 'Hyderabad',
      hours: c.hours ?? [],
      socials,
    })
    console.log('Imported contact details')
  }

  console.log('\nSeed complete. Sign in with:')
  console.log(`  email    ${DEFAULT_EMAIL}`)
  console.log(`  password ${DEFAULT_PASSWORD}`)
  console.log('\nChange the password before this is reachable from the internet.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
