import { useCallback, useEffect, useState } from 'react'
import { ChevronDown, ChevronUp, Eye, EyeOff, ImageOff, Pencil, Plus, Trash2 } from 'lucide-react'
import { api, mediaUrl } from '@/lib/api'
import {
  Button,
  ConfirmDelete,
  Empty,
  Field,
  ImageInput,
  Input,
  Modal,
  PageHeader,
  Select,
  Stars,
  Textarea,
  Toast,
  cn,
} from '@/components/ui'

/**
 * One CRUD screen, driven by a field list.
 *
 * Banners, team, gallery and reviews differ only in their fields and how a row
 * is summarised, so they share this rather than repeating four near-identical
 * screens — which is also why a fix to the delete flow or the ordering applies
 * to all of them at once.
 */
export default function ResourcePage({
  resource,
  title,
  description,
  fields,
  renderRow,
  icon,
  addLabel = 'Add item',
}) {
  const [rows, setRows] = useState(null)
  const [error, setError] = useState(null)
  const [editing, setEditing] = useState(null) // row object, or {} for a new one
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    try {
      setRows(await api.get(`/api/${resource}`))
      setError(null)
    } catch (e) {
      setError(e.message)
      setRows([])
    }
  }, [resource])

  useEffect(() => {
    load()
  }, [load])

  const save = async (values) => {
    setBusy(true)
    try {
      if (editing?.id) await api.put(`/api/${resource}/${editing.id}`, values)
      else await api.post(`/api/${resource}`, values)
      setEditing(null)
      setToast(editing?.id ? 'Saved' : 'Added')
      await load()
      return null
    } catch (e) {
      // hand field errors back to the form rather than showing a page-level banner
      return e.fields && Object.keys(e.fields).length ? e.fields : { _: e.message }
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/api/${resource}/${deleting.id}`)
      setDeleting(null)
      setToast('Deleted')
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (row) => {
    // optimistic: the switch should feel instant, and a failed call reloads truth
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, active: !row.active } : x)))
    try {
      await api.put(`/api/${resource}/${row.id}`, { active: !row.active })
    } catch (e) {
      setError(e.message)
      load()
    }
  }

  const move = async (index, delta) => {
    const next = [...rows]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setRows(next)
    try {
      await api.post(`/api/${resource}/reorder`, { ids: next.map((r) => r.id) })
    } catch (e) {
      setError(e.message)
      load()
    }
  }

  return (
    <div>
      {/* the count sits in the eyebrow rather than beside the heading — it
          answers "is anything here" before the eye reaches the list, and it
          counts what is actually visible rather than what merely exists */}
      <PageHeader
        eyebrow={
          rows === null
            ? 'Loading'
            : `${rows.filter((r) => r.active !== false).length} live on the website`
        }
        title={title}
        description={description}
        action={
          <Button onClick={() => setEditing({})}>
            <Plus className="h-4 w-4" />
            {addLabel}
          </Button>
        }
      />

      {error && (
        <p className="mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6">
        {rows === null ? (
          <p className="py-10 text-center text-[14px] text-ink-500">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty
            icon={icon}
            title={`No ${title.toLowerCase()} yet`}
            hint="Nothing here will appear on the website until you add something."
            action={
              <Button onClick={() => setEditing({})}>
                <Plus className="h-4 w-4" />
                {addLabel}
              </Button>
            }
          />
        ) : (
          <ul className="space-y-2.5">
            {rows.map((row, i) => (
              <li
                key={row.id}
                className={cn(
                  'group/row flex items-center gap-4 rounded-2xl border border-ink-900/[.07] bg-white p-3 shadow-card',
                  'transition-all duration-200 hover:-translate-y-px hover:border-brand-500/25 hover:shadow-lift',
                  // hidden rows are dimmed and desaturated, so "not on the site"
                  // is legible at a glance rather than needing the eye icon read
                  row.active === false && 'opacity-60 grayscale',
                )}
              >
                {/* order controls — buttons rather than drag, so this works on a
                    touch screen and from the keyboard without extra machinery */}
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Move up"
                    className="rounded p-0.5 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900 disabled:opacity-25"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === rows.length - 1}
                    aria-label="Move down"
                    className="rounded p-0.5 text-ink-500 hover:bg-ink-900/5 hover:text-ink-900 disabled:opacity-25"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">{renderRow(row)}</div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => toggle(row)}
                    aria-label={row.active === false ? 'Show on website' : 'Hide from website'}
                    title={row.active === false ? 'Hidden — click to show' : 'Visible — click to hide'}
                    className="rounded-xl p-2 text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
                  >
                    {row.active === false ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4 text-brand-600" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    aria-label="Edit"
                    className="rounded-xl p-2 text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-700"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleting(row)}
                    aria-label="Delete"
                    className="rounded-xl p-2 text-ink-500 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <RowForm
        open={!!editing}
        row={editing}
        fields={fields}
        title={editing?.id ? `Edit ${title.replace(/s$/, '').toLowerCase()}` : addLabel}
        busy={busy}
        onSave={save}
        onClose={() => setEditing(null)}
      />

      <ConfirmDelete
        open={!!deleting}
        label={deleting ? (deleting.name ?? deleting.caption ?? deleting.alt ?? 'This item') : ''}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />

      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}

/** The add/edit dialog, built from the same field list. */
function RowForm({ open, row, fields, title, busy, onSave, onClose }) {
  const [values, setValues] = useState({})
  const [errors, setErrors] = useState({})

  // reset whenever a different row is opened, or the form keeps the last one
  useEffect(() => {
    if (!open) return
    const init = {}
    for (const f of fields) init[f.name] = row?.[f.name] ?? f.default ?? ''
    setValues(init)
    setErrors({})
  }, [open, row, fields])

  const set = (name, v) => setValues((s) => ({ ...s, [name]: v }))

  const submit = async (e) => {
    e.preventDefault()
    const failed = await onSave(values)
    if (failed) setErrors(failed)
  }

  return (
    <Modal open={open} title={title} onClose={onClose} wide>
      <form onSubmit={submit} className="space-y-4">
        {errors._ && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] text-red-700">
            {errors._}
          </p>
        )}

        {fields.map((f) => (
          <Field
            key={f.name}
            label={f.label}
            hint={f.hint}
            required={f.required}
            error={errors[f.name]}
          >
            {f.type === 'image' ? (
              <ImageInput
                value={values[f.name]}
                onChange={(v) => set(f.name, v)}
                error={errors[f.name]}
              />
            ) : f.type === 'textarea' ? (
              <Textarea
                value={values[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
                error={errors[f.name]}
                placeholder={f.placeholder}
              />
            ) : f.type === 'select' ? (
              <Select
                value={values[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
                options={f.options}
                error={errors[f.name]}
              />
            ) : f.type === 'stars' ? (
              <Stars value={Number(values[f.name]) || 5} onChange={(v) => set(f.name, v)} />
            ) : (
              <Input
                value={values[f.name]}
                onChange={(e) => set(f.name, e.target.value)}
                error={errors[f.name]}
                placeholder={f.placeholder}
              />
            )}
          </Field>
        ))}

        <div className="flex justify-end gap-2 border-t border-ink-900/10 pt-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={busy}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

/** Small helper used by the row summaries. */
export function Thumb({ src }) {
  const [failed, setFailed] = useState(false)

  return (
    <div className="grid h-12 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-50 ring-1 ring-inset ring-ink-900/[.06]">
      {/*
        A dead image used to render as an unexplained grey rectangle. Saying so
        matters here: the usual cause is a file the website serves rather than
        the API, which looks identical to "no image set" if nothing is drawn.
      */}
      {src && !failed ? (
        <img
          src={mediaUrl(src)}
          alt=""
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        <ImageOff
          className="h-4 w-4 text-brand-600/35"
          aria-label={src ? 'Image could not be loaded' : 'No image'}
        />
      )}
    </div>
  )
}
