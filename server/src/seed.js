/**
 * Seeds an empty database from the snapshot in server/seed/.
 *
 * Safe to re-run: it does nothing if an admin account already exists, so it
 * cannot quietly wipe edits made through the panel.
 *
 * This used to read the website's source files from a path hardcoded to one
 * laptop, which meant a deployed server could only ever open onto empty tables.
 * It now reads a snapshot committed to this repository — run
 * `node src/export-seed.js` to refresh it.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { collection, singleton, isEmpty } from './store.js'
import { createUser } from './auth.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const SEED_DIR = path.join(HERE, '..', 'seed')
const ASSET_DIR = path.join(SEED_DIR, 'assets')
// must match the server's, or the seed restores files where nothing serves them
const UPLOADS = process.env.UPLOADS_DIR ?? path.join(HERE, '..', 'uploads')

/*
 * The first account. Only used on a database that has never been seeded —
 * changing these afterwards does nothing, use `node src/set-admin.js` for that.
 *
 * ADMIN_USERNAME rather than ADMIN_EMAIL: the account is identified by whatever
 * string it was created with, and this one is not an address.
 */
const DEFAULT_USERNAME = process.env.ADMIN_USERNAME ?? 'admin123'
const DEFAULT_PASSWORD = process.env.ADMIN_PASSWORD ?? 'password123'

async function run() {
  if (!isEmpty()) {
    console.log('Database already seeded — nothing to do.')
    console.log('Delete server/data/db.json first if you want to start over.')
    return
  }

  const file = path.join(SEED_DIR, 'content.json')
  if (!fs.existsSync(file)) {
    console.error('No snapshot at server/seed/content.json.')
    console.error('Run `node src/export-seed.js` on a machine that has the content.')
    process.exit(1)
  }
  const content = JSON.parse(fs.readFileSync(file, 'utf8'))

  const user = await createUser({
    email: DEFAULT_USERNAME,
    password: DEFAULT_PASSWORD,
    name: 'SGD Administrator',
  })
  console.log(`Created admin user: ${user.email}`)

  for (const name of ['banners', 'team', 'gallery', 'reviews']) {
    const rows = content[name] ?? []
    const store = collection(name)
    rows.forEach((row, i) => store.create({ ...row, position: row.position ?? i }))
    console.log(`Imported ${rows.length} ${name}`)
  }

  if (content.contact) {
    singleton('contact').set(content.contact)
    console.log('Imported contact details')
  }

  /*
   * Restore uploaded files.
   *
   * uploads/ is gitignored, so without this every row pointing at /uploads/…
   * would arrive on a fresh server with no file behind it — the images would be
   * in the panel and broken on the site.
   */
  if (fs.existsSync(ASSET_DIR)) {
    fs.mkdirSync(UPLOADS, { recursive: true })
    let restored = 0
    for (const name of fs.readdirSync(ASSET_DIR)) {
      const to = path.join(UPLOADS, name)
      // never overwrite a real upload that happens to share a name
      if (!fs.existsSync(to)) {
        fs.copyFileSync(path.join(ASSET_DIR, name), to)
        restored++
      }
    }
    if (restored) console.log(`Restored ${restored} uploaded files`)
  }

  console.log('\nSeed complete. Sign in with:')
  console.log(`  username ${DEFAULT_USERNAME}`)
  console.log(`  password ${DEFAULT_PASSWORD}`)
  console.log('\nChange both with `node src/set-admin.js` before this is public.')
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
