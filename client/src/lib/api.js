const BASE = import.meta.env.VITE_API ?? 'http://localhost:4000'
const TOKEN_KEY = 'sgd-admin-token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

/** Absolute URL for an uploaded file — stored paths are server-relative. */
export const mediaUrl = (p) => (!p ? '' : /^https?:|^data:/.test(p) ? p : `${BASE}${p}`)

/**
 * Thrown for any non-2xx response.
 *
 * `fields` carries the server's per-field messages so a form can show them
 * against the right input instead of one banner at the top.
 */
export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message)
    this.status = status
    this.fields = fields ?? {}
  }
}

async function request(method, path, body, isForm = false) {
  const token = getToken()
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(isForm || !body ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    /* server returned something that is not JSON */
  }

  if (!res.ok) {
    // an expired token should return the editor to the sign-in screen rather
    // than showing "not signed in" on every panel
    if (res.status === 401) clearToken()
    throw new ApiError(
      data?.error ?? (data?.errors ? 'Please check the highlighted fields' : `Request failed (${res.status})`),
      res.status,
      data?.errors,
    )
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b) => request('POST', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p) => request('DELETE', p),

  async upload(file) {
    const form = new FormData()
    form.append('file', file)
    return request('POST', '/api/upload', form, true)
  },

  async login(email, password) {
    const out = await request('POST', '/api/login', { email, password })
    setToken(out.token)
    return out.user
  },
}
