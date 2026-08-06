import { useState } from 'react'
import { Lock } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Field, Input } from '@/components/ui'

export default function Login({ onSignedIn }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSignedIn(await api.login(email, password))
    } catch (err) {
      // deliberately not "no such user" vs "wrong password" — that difference
      // tells someone probing which addresses are real
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink-950 px-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand-500/15 text-brand-400 ring-1 ring-inset ring-brand-400/25">
            <Lock className="h-5 w-5" />
          </span>
          <h1 className="mt-4 font-display text-xl font-extrabold text-white">SGD Electric</h1>
          <p className="mt-1 text-[13.5px] text-white/45">Website administration</p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-2xl border border-white/10 bg-white/[.04] p-6 backdrop-blur-sm"
        >
          {error && (
            <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3.5 py-2.5 text-[13px] text-red-300">
              {error}
            </p>
          )}

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-white/70">Username</span>
            {/* text, not email: the account is identified by whatever string it
                was created with, and type="email" made the browser refuse to
                submit a plain username before the server ever saw it */}
            <Input
              type="text"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin123"
              className="border-white/15 bg-white/5 text-white placeholder:text-white/30"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-semibold text-white/70">Password</span>
            <Input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-white/15 bg-white/5 text-white"
            />
          </label>

          <Button type="submit" busy={busy} className="w-full py-2.5">
            Sign in
          </Button>
        </form>
      </div>
    </div>
  )
}
