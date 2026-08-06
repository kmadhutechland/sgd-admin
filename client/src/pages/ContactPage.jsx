import { useEffect, useState } from 'react'
import { Clock, Link2, Phone, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, Card, Field, Input, PageHeader, Toast } from '@/components/ui'

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
    <form onSubmit={save} className="max-w-3xl pb-24">
      <PageHeader
        eyebrow="Shown across the whole website"
        title="Contact details"
        description="These appear in the website footer, on the contact page and anywhere a phone number or address is shown."
      />

      {errors._ && (
        <p className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          {errors._}
        </p>
      )}

      <div className="mt-7 space-y-5">
        <Card icon={Phone} title="How people reach you" hint="The number, address and inbox shown on the site.">
          <div className="space-y-5">
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

            <div className="grid gap-5 sm:grid-cols-[1fr_12rem]">
              <Field label="Head office address" error={errors.address}>
                <Input value={form.address} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <Field label="City" error={errors.city}>
                <Input value={form.city} onChange={(e) => set('city', e.target.value)} />
              </Field>
            </div>
          </div>
        </Card>
      </div>

      <RepeatingRows
        icon={Clock}
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
        icon={Link2}
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

      {/*
        The save bar is fixed rather than sitting at the foot of the form. This
        page is long enough to scroll on a laptop, and a button below the last
        repeating row is out of sight exactly when it is needed.
      */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-900/[.07] bg-white/85 px-5 py-3.5 backdrop-blur-md sm:left-64">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <p className="text-[12.5px] text-ink-500">Changes reach the website as soon as you save.</p>
          <Button type="submit" busy={busy}>
            Save changes
          </Button>
        </div>
      </div>

      <Toast message={toast} onDone={() => setToast('')} />
    </form>
  )
}

function RepeatingRows({ icon, title, hint, rows, columns, onChange, onAdd, onRemove, addLabel }) {
  return (
    <Card icon={icon} title={title} hint={hint} className="mt-5">
      <div className="space-y-2.5">
        {rows.length === 0 && (
          <p className="rounded-xl border border-dashed border-brand-600/25 bg-brand-50/40 px-4 py-7 text-center text-[13px] text-ink-500">
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
              className="shrink-0 rounded-xl p-2 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" onClick={onAdd} className="mt-4">
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </Button>
    </Card>
  )
}
