import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { EventEmitter } from 'node:events'

const HERE = path.dirname(fileURLToPath(import.meta.url))
/*
 * Where the database lives.
 *
 * Overridable because a host's own filesystem is usually wiped on every deploy;
 * on Render this points into a mounted disk, which is the only thing that
 * survives a restart. Defaults to server/data for local work.
 */
const DATA_DIR = process.env.DATA_DIR ?? path.join(HERE, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

/**
 * The whole database, as one JSON file.
 *
 * Chosen because better-sqlite3 needs a native build and there is no MSVC
 * toolchain on this machine. At this scale — a few dozen rows, one editor — a
 * file is genuinely adequate, and every read is served from memory.
 *
 * Everything goes through the `collection()` helper below rather than touching
 * the file directly, so swapping this for Postgres later means rewriting this
 * module and nothing else.
 */

const EMPTY = {
  users: [],
  banners: [],
  team: [],
  gallery: [],
  reviews: [],
  plans: [],
  enquiries: [],
  // single-row tables, kept as objects rather than arrays of one
  settings: {},
}

/**
 * Announces every write, so the live-updates endpoint can tell connected
 * websites to refetch.
 *
 * Emitted from persist() rather than from each route, so nothing can change the
 * data without the website hearing about it — including the seed script.
 */
export const changes = new EventEmitter()
// several visitors plus the admin panel can be listening at once
changes.setMaxListeners(100)

let lastChange = Date.now()
export const changedAt = () => lastChange

let cache = null
/** mtime of the file the cache was built from, so we can tell if it moved on. */
let cacheMtime = 0

/**
 * Read the database, reloading if the file changed underneath us.
 *
 * Caching it forever was wrong: the seed and repair scripts are separate
 * processes writing the same file, and a running server would hold its stale
 * copy and re-persist it on the next edit — quietly undoing their work. The
 * mtime check costs one stat per read and makes those scripts safe to run
 * beside a live server.
 */
function load() {
  fs.mkdirSync(DATA_DIR, { recursive: true })

  let mtime = 0
  try {
    mtime = fs.statSync(DB_FILE).mtimeMs
  } catch {
    // no file yet
  }
  if (cache && mtime === cacheMtime) return cache

  try {
    cache = { ...EMPTY, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
    cacheMtime = mtime
  } catch {
    // missing or unreadable — start from empty rather than crashing on boot
    cache = structuredClone(EMPTY)
    cacheMtime = mtime
  }
  return cache
}

/**
 * Write the whole file, atomically.
 *
 * Writing in place risks a torn file if the process dies mid-write, and a torn
 * db.json takes the public site down with it. Writing a temp file and renaming
 * makes the swap atomic on every platform we care about.
 */
function persist() {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  const tmp = `${DB_FILE}.${process.pid}.tmp`
  fs.writeFileSync(tmp, JSON.stringify(cache, null, 2), 'utf8')
  fs.renameSync(tmp, DB_FILE)
  // record our own write, so load() does not treat it as someone else's
  try {
    cacheMtime = fs.statSync(DB_FILE).mtimeMs
  } catch {
    cacheMtime = 0
  }
  lastChange = Date.now()
  changes.emit('change', lastChange)
}

const now = () => new Date().toISOString()
export const newId = () => crypto.randomUUID()

/** CRUD over one named array, ordered by `position` then creation. */
export function collection(name) {
  return {
    all({ activeOnly = false } = {}) {
      const rows = load()[name] ?? []
      const list = activeOnly ? rows.filter((r) => r.active !== false) : rows
      return [...list].sort(
        (a, b) => (a.position ?? 0) - (b.position ?? 0) || (a.createdAt < b.createdAt ? -1 : 1),
      )
    },

    find(id) {
      return (load()[name] ?? []).find((r) => r.id === id) ?? null
    },

    create(data) {
      const db = load()
      const rows = db[name] ?? (db[name] = [])
      const row = {
        id: newId(),
        ...data,
        // new rows go to the end unless the caller placed them
        position: data.position ?? rows.length,
        createdAt: now(),
        updatedAt: now(),
      }
      rows.push(row)
      persist()
      return row
    },

    update(id, data) {
      const db = load()
      const rows = db[name] ?? []
      const i = rows.findIndex((r) => r.id === id)
      if (i === -1) return null
      // id and createdAt are not the caller's to change
      const { id: _i, createdAt: _c, ...rest } = data
      rows[i] = { ...rows[i], ...rest, updatedAt: now() }
      persist()
      return rows[i]
    },

    remove(id) {
      const db = load()
      const rows = db[name] ?? []
      const i = rows.findIndex((r) => r.id === id)
      if (i === -1) return false
      rows.splice(i, 1)
      persist()
      return true
    },

    /** Apply a new order in one write, so a drag never leaves a half-sorted list. */
    reorder(ids) {
      const db = load()
      const rows = db[name] ?? []
      ids.forEach((id, i) => {
        const row = rows.find((r) => r.id === id)
        if (row) {
          row.position = i
          row.updatedAt = now()
        }
      })
      persist()
      return this.all()
    },
  }
}

/** A single-row table — settings, contact details. */
export function singleton(name) {
  return {
    get() {
      return load().settings[name] ?? null
    },
    set(data) {
      const db = load()
      db.settings[name] = { ...(db.settings[name] ?? {}), ...data, updatedAt: now() }
      persist()
      return db.settings[name]
    },
  }
}

/** Used only by the seed script, which needs to know if it has run before. */
export function isEmpty() {
  const db = load()
  return db.users.length === 0
}

export function rawUsers() {
  return load().users
}

export function saveUsers(users) {
  load().users = users
  persist()
}
