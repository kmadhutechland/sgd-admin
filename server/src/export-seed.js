/**
 * Snapshot the current content into the repository, so a fresh server can be
 * seeded with it.
 *
 *   node src/export-seed.js
 *
 * The old seed read the website's source files directly, from a path hardcoded
 * to this laptop. That works nowhere else, so a deployed server could only ever
 * open onto empty tables.
 *
 * Snapshotting the live database rather than re-reading the website's files is
 * deliberate: the database holds the repaired image URLs and anything edited
 * through the panel since. What you see locally is what the server gets.
 *
 * Uploaded files are copied in alongside, because uploads/ is gitignored — a
 * row pointing at /uploads/x.jpg would otherwise arrive on the server with no
 * file behind it.
 *
 * Run this whenever the content changes and commit the result.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { collection, singleton } from './store.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.join(HERE, '..', 'seed')
const ASSET_DIR = path.join(SEED_DIR, 'assets')
const UPLOADS = path.join(HERE, '..', 'uploads')

fs.mkdirSync(ASSET_DIR, { recursive: true })

/* id, createdAt and updatedAt are per-database and get reassigned on seed */
const strip = ({ id, createdAt, updatedAt, ...rest }) => rest

const content = {
  banners: collection('banners').all().map(strip),
  team: collection('team').all().map(strip),
  gallery: collection('gallery').all().map(strip),
  reviews: collection('reviews').all().map(strip),
  contact: singleton('contact').get(),
}

fs.writeFileSync(
  path.join(SEED_DIR, 'content.json'),
  JSON.stringify(content, null, 2),
  'utf8',
)

/* copy every uploaded file the content still points at, and no others */
const referenced = new Set(
  [...JSON.stringify(content).matchAll(/\/uploads\/([^"\\]+)/g)].map((m) => m[1]),
)

let copied = 0
let missing = 0
for (const name of referenced) {
  const from = path.join(UPLOADS, name)
  if (!fs.existsSync(from)) {
    console.warn(`  ! ${name} is referenced but not on disk`)
    missing++
    continue
  }
  fs.copyFileSync(from, path.join(ASSET_DIR, name))
  copied++
}

/* drop assets nothing points at any more, so the repo does not accumulate */
let pruned = 0
for (const name of fs.readdirSync(ASSET_DIR)) {
  if (!referenced.has(name)) {
    fs.unlinkSync(path.join(ASSET_DIR, name))
    pruned++
  }
}

console.log('Snapshot written to server/seed/content.json')
for (const [k, v] of Object.entries(content)) {
  console.log(`  ${k.padEnd(9)} ${Array.isArray(v) ? `${v.length} rows` : v ? 'set' : 'empty'}`)
}
console.log(`  assets    ${copied} copied${missing ? `, ${missing} missing` : ''}${pruned ? `, ${pruned} pruned` : ''}`)
console.log('\nCommit server/seed/ so the deployed server can seed from it.')
