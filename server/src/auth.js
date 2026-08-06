import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { rawUsers, saveUsers, newId } from './store.js'

/*
 * The signing secret.
 *
 * Falls back to a fixed development value so `npm run dev` works out of the box,
 * but that value is public — anyone with this source could mint a valid token.
 * Set JWT_SECRET in the environment before this is reachable from the internet.
 */
export const JWT_SECRET = process.env.JWT_SECRET ?? 'sgd-dev-secret-change-me'
export const IS_DEFAULT_SECRET = !process.env.JWT_SECRET

const TOKEN_TTL = '12h'

export async function createUser({ email, password, name }) {
  const users = rawUsers()
  const lower = email.trim().toLowerCase()
  if (users.some((u) => u.email === lower)) return null

  const user = {
    id: newId(),
    email: lower,
    name: name ?? 'Administrator',
    // 10 rounds: bcrypt is deliberately slow, and this runs on a login path
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  }
  users.push(user)
  saveUsers(users)
  return user
}

export async function verify(email, password) {
  const user = rawUsers().find((u) => u.email === email.trim().toLowerCase())
  // Hash even when the user does not exist, so a missing account and a wrong
  // password take the same time — otherwise the response time enumerates users.
  const hash = user?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv'
  const ok = await bcrypt.compare(password, hash)
  return ok && user ? user : null
}

export function issueToken(user) {
  return jwt.sign({ sub: user.id, email: user.email, name: user.name }, JWT_SECRET, {
    expiresIn: TOKEN_TTL,
  })
}

/** Express middleware — rejects anything without a valid bearer token. */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return res.status(401).json({ error: 'Not signed in' })

  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    // expired and malformed are the same to the client: sign in again
    res.status(401).json({ error: 'Session expired — please sign in again' })
  }
}
