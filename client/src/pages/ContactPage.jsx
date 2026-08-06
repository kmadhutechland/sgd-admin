import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Field, Input, Toast } from '@/components/ui'

/**
 * Contact details — one record, so a form rather than a list.
 *
 * Hours and socials are repeating rows inside that one record, which is why
 * they are edited here instead of being their own screens.
 */
export default function ContactPage() {
  const [form, setForm] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    api.get('/api/contact').then((c) =>
      setForm({
        phone: '',
        phoneHref: '',
        email: '',
        address: '',
        city: '',
        hours: [],
        socials: [],
        ...c,
      }),
    )
  }, [])

  if (!form) return <p className="py-10 text-[14px] text-ink-500">Loading…</p>

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const setRow = (key, i, patch) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].map((row, n) => (n === i ? { ...row, ...patch } : row)),
    }))

  const addRow = (key, blank) => setForm((f) => ({ ...f, [key]: [...f[key], blank] }))
  const dropRow = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, n) => n !== i) }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setErrors({})
    try {
      // strip the bookkeeping the server adds, so it is not sent back
      const { updatedAt, ...payload } = form
      await api.put('/api/contact', payload)
      setToast('Contact details saved')
    } catch (err) {
      setErrors(err.fields && Object.keys(err.fields).length ? err.fields : { _: err.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="max-w-3xl">
      <header>
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900">
          Contact details
        </h1>
        <p className="mt-1.5 text-[14px] leading-relaxed text-ink-500">
          These appear in the website footer, on the contact page and anywhere a phone number or
          address is shown.
        </p>
      </header>

      {errors._ && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          {errors._}
        </p>
      )}

      <div className="mt-7 space-y-5 rounded-xl border border-ink-900/10 bg-white p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone number" error={errors.phone}>
            <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field
            label="Phone link"
            hint="What the number dials when tapped on a phone"
            error={errors.phoneHref}
          >
            <Input
              value={form.phoneHref}
              onChange={(e) => set('phoneHref', e.target.value)}
              placeholder="tel:+918500085120"
            />
          </Field>
        </div>

        <Field label="Email address" error={errors.email}>
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>

        <Field label="Head office address" error={errors.address}>
          <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
        </Field>

        <Field label="City" error={errors.city}>
          <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
        </Field>
      </div>

      <RepeatingRows
        title="Opening hours"
        hint="One row per line shown on the site — for example Office, 10:00 AM – 7:00 PM."
        rows={form.hours}
        columns={[
          { key: 'days', placeholder: 'Office' },
          { key: 'time', placeholder: '10:00 AM – 7:00 PM' },
        ]}
        onChange={(i, patch) => setRow('hours', i, patch)}
        onAdd={() => addRow('hours', { days: '', time: '' })}
        onRemove={(i) => dropRow('hours', i)}
        addLabel="Add hours row"
      />

      <RepeatingRows
        title="Social links"
        hint="The icon name must be one the site knows: Linkedin, Instagram, Youtube, Twitter or Facebook."
        rows={form.socials}
        columns={[
          { key: 'label', placeholder: 'LinkedIn' },
          { key: 'href', placeholder: 'https://www.linkedin.com/company/…' },
          { key: 'icon', placeholder: 'Linkedin' },
        ]}
        onChange={(i, patch) => setRow('socials', i, patch)}
        onAdd={() => addRow('socials', { label: '', href: '', icon: '' })}
        onRemove={(i) => dropRow('socials', i)}
        addLabel="Add social link"
      />

      <div className="mt-7 flex justify-end">
        <Button type="submit" busy={busy}>
          Save changes
        </Button>
      </div>

      <Toast message={toast} onDone={() => setToast('')} />
    </form>
  )
}

function RepeatingRows({ title, hint, rows, columns, onChange, onAdd, onRemove, addLabel }) {
  return (
    <section className="mt-6 rounded-xl border border-ink-900/10 bg-white p-6">
      <h2 className="font-display text-[15px] font-bold text-ink-900">{title}</h2>
      <p className="mt-1 text-[13px] text-ink-500">{hint}</p>

      <div className="mt-4 space-y-2">
        {rows.length === 0 && (
          <p className="rounded-lg border border-dashed border-ink-900/15 px-4 py-6 text-center text-[13px] text-ink-500">
            Nothing here yet.
          </p>
        )}

        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            {columns.map((c) => (
              <Input
                key={c.key}
                value={row[c.key] ?? ''}
                placeholder={c.placeholder}
                onChange={(e) => onChange(i, { [c.key]: e.target.value })}
              />
            ))}
            <button
              type="button"
              onClick={() => onRemove(i)}
              aria-label={`Remove row ${i + 1}`}
              className="shrink-0 rounded-lg p-2 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={onAdd} className="mt-3">
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </section>
  )
}
