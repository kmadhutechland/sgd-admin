import { useState } from 'react'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Card, Field, Input, PageHeader, Toast } from '@/components/ui'

/**
 * The signed-in account — currently just the password.
 *
 * There is one account, shared. That is fine while it is the client and one
 * developer, but it means changing the password locks out everyone who has it,
 * which is worth saying on the page rather than discovering afterwards.
 */
export default function AccountPage({ user }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setErrors({})

    // checked here rather than at the server: the confirmation box is a
    // typing-mistake guard for this form, not something the API needs to know
    if (form.newPassword !== form.confirm) {
      setErrors({ confirm: 'These two do not match' })
      return
    }

    setBusy(true)
    try {
      await api.put('/api/me/password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      })
      setForm({ currentPassword: '', newPassword: '', confirm: '' })
      setToast('Password changed')
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { _: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        eyebrow={`Signed in as ${user?.email ?? 'admin'}`}
        title="Account"
        description="Your sign-in details for this panel. Nothing here appears on the website."
      />

      <form onSubmit={submit} className="mt-7 space-y-5">
        <Card
          icon={KeyRound}
          title="Change password"
          hint="You will stay signed in on this device. Anyone else using this account will need the new password."
        >
          <div className="space-y-5">
            {errors._ && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
                {errors._}
              </p>
            )}

            <Field label="Current password" required error={errors.currentPassword}>
              <Input
                type="password"
                autoComplete="current-password"
                value={form.currentPassword}
                onChange={(e) => set('currentPassword', e.target.value)}
                error={errors.currentPassword}
              />
            </Field>

            <Field
              label="New password"
              required
              hint="At least 12 characters. Longer is better than complicated."
              error={errors.newPassword}
            >
              <Input
                type="password"
                autoComplete="new-password"
                value={form.newPassword}
                onChange={(e) => set('newPassword', e.target.value)}
                error={errors.newPassword}
              />
            </Field>

            <Field label="Confirm new password" required error={errors.confirm}>
              <Input
                type="password"
                autoComplete="new-password"
                value={form.confirm}
                onChange={(e) => set('confirm', e.target.value)}
                error={errors.confirm}
              />
            </Field>

            <div className="flex justify-end">
              <Button type="submit" busy={busy}>
                Change password
              </Button>
            </div>
          </div>
        </Card>
      </form>

      <Card icon={ShieldCheck} title="Who can sign in" className="mt-5">
        <p className="text-[14px] leading-relaxed text-ink-600">
          There is one account for this panel, so everyone who edits the website shares these
          details. Changing the password here changes it for all of them.
        </p>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-600">
          If more than one person needs access and you want to be able to remove just one of them
          later, separate accounts are the next thing to add.
        </p>
      </Card>

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
