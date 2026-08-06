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
    <div className="sidebar-sheen relative grid min-h-screen place-items-center overflow-hidden bg-ink-950 px-5">
      {/* the same brand glow the sidebar carries, so signing in already looks
          like the product rather than a generic gate in front of it */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-brand-600/20 blur-[130px]"
      />

      <div className="relative w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <img
            src="/logo-reversed.png"
            alt="SGD Electric"
            width="1040"
            height="514"
            className="mx-auto h-11 w-auto"
          />
          <p className="mt-4 flex items-center justify-center gap-2 font-display text-[11px] font-bold uppercase tracking-[.2em] text-white/40">
            <Lock className="h-3 w-3" />
            Website administration
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-[1.25rem] border border-white/10 bg-white/[.05] p-6 shadow-2xl backdrop-blur-md"
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
