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

/*
 * The first account. Only used on a database that has never been seeded —
 * changing these afterwards does nothing, use `node src/set-admin.js` for that.
 *
 * ADMIN_USERNAME rather than ADMIN_EMAIL: the account is identified by whatever
 * string it was created with, and this one is not an address.
 */
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME ?? 'admin123'
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD ?? 'password123'

const avatar = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=400`
const photo = (id, w = 1600) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?w=${w}`

/*
 * The real IMG map, filled in before anything else is read.
 *
 * Stubbing IMG with a proxy that returned the key name seeded every gallery row
 * with the literal string "IMG.cultureCheer" instead of a URL, and the site
 * rendered broken images. IMG lives in the same file as the content that
 * references it, so it is resolved first and handed to every later read.
 */
export const IMG_MAP = {}

/**
 * Pull one `export const NAME = [...]` or `{...}` out of a source file.
 *
 * The data files are plain ES modules of literals, so evaluating the extracted
 * literal is enough — no bundler, no import of the site's whole dependency tree.
 */
export function readExport(file, name) {
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
    // eslint-disable-next-line no-new-func
    return new Function('IMG', 'avatar', 'photo', `return (${literal})`)(IMG_MAP, avatar, photo)
  } catch (e) {
    console.warn(`  could not evaluate ${name}: ${e.message}`)
    return null
  }
}

/** Resolve IMG before any content that references it is read. */
export function loadImageMap() {
  Object.assign(IMG_MAP, readExport('media.js', 'IMG') ?? {})
  console.log(`Resolved ${Object.keys(IMG_MAP).length} image keys`)
}

async function run() {
  loadImageMap()

  if (!isEmpty()) {
    console.log('Database already seeded — nothing to do.')
    console.log('Delete server/data/db.json first if you want to start over.')
    return
  }

  const user = await createUser({
    email: DEFAULT_USERNAME,
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
  console.log(`  username ${DEFAULT_USERNAME}`)
  console.log(`  password ${DEFAULT_PASSWORD}`)
  console.log('\nChange the password before this is reachable from the internet.')
}

if (process.argv[1]?.endsWith('seed.js')) {
  run().catch((e) => {
    console.error(e)
    process.exit(1)
  })
}
