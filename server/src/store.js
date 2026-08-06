import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(HERE, '..', 'data')
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
  enquiries: [],
  // single-row tables, kept as objects rather than arrays of one
  settings: {},
}

let cache = null

function load() {
  if (cache) return cache
  fs.mkdirSync(DATA_DIR, { recursive: true })
  try {
    cache = { ...EMPTY, ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
  } catch {
    // missing or unreadable — start from empty rather than crashing on boot
    cache = structuredClone(EMPTY)
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
