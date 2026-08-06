import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { api, mediaUrl } from '@/lib/api'

export const cn = (...c) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({ variant = 'primary', busy, children, className, ...rest }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-600/50',
    ghost: 'text-ink-600 hover:bg-ink-900/5',
    danger: 'text-red-600 hover:bg-red-50',
    outline: 'border border-ink-900/15 text-ink-700 hover:border-ink-900/30 hover:bg-ink-900/[.03]',
  }
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-[13.5px] font-semibold transition-colors duration-200',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed',
        styles[variant],
        className,
      )}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ */
/* Form fields                                                         */
/* ------------------------------------------------------------------ */

export function Field({ label, error, hint, children, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-ink-700">
        {label}
        {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {/* the hint disappears once there is an error, so the two never stack */}
      {error ? (
        <span className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-red-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12.5px] text-ink-500">{hint}</span>
      ) : null}
    </label>
  )
}

const inputBase =
  'w-full rounded-lg border bg-white px-3 py-2.5 text-[14px] text-ink-900 outline-none transition-colors placeholder:text-ink-500/60 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20'

export const Input = ({ error, className, ...rest }) => (
  <input
    {...rest}
    className={cn(inputBase, error ? 'border-red-400' : 'border-ink-900/15', className)}
  />
)

export const Textarea = ({ error, rows = 4, className, ...rest }) => (
  <textarea
    {...rest}
    rows={rows}
    className={cn(inputBase, 'resize-y', error ? 'border-red-400' : 'border-ink-900/15', className)}
  />
)

export const Select = ({ error, options = [], className, ...rest }) => (
  <select
    {...rest}
    className={cn(inputBase, error ? 'border-red-400' : 'border-ink-900/15', className)}
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
)

/** A star rating that is still operable from the keyboard. */
export function Stars({ value, onChange }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          aria-pressed={n === value}
          className="rounded p-0.5 text-lg leading-none transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
        >
          <span className={n <= value ? 'text-amber-400' : 'text-ink-900/20'}>★</span>
        </button>
      ))}
      <span className="ml-2 text-[13px] text-ink-500">{value} of 5</span>
    </div>
  )
}

/**
 * Image picker: upload a file, or paste a URL.
 *
 * Both are allowed because much of the existing content points at remote stock
 * images, and forcing a re-upload to edit a caption would be absurd.
 */
export function ImageInput({ value, onChange, error }) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(null)
  const fileRef = useRef(null)

  const pick = async (file) => {
    if (!file) return
    setBusy(true)
    setFailed(null)
    try {
      const { url } = await api.upload(file)
      onChange(url)
    } catch (e) {
      setFailed(e.message)
    } finally {
      setBusy(false)
      // clear the input so choosing the same file twice still fires
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-ink-900/15 bg-ink-900/[.03]">
          {value ? (
            <img src={mediaUrl(value)} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-5 w-5 text-ink-500/50" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <Input
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="/uploads/photo.jpg or https://…"
            error={error}
          />
          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              busy={busy}
              onClick={() => fileRef.current?.click()}
            >
              {!busy && <Upload className="h-3.5 w-3.5" />}
              {busy ? 'Uploading' : 'Upload image'}
            </Button>
            {value && (
              <Button type="button" variant="ghost" onClick={() => onChange('')}>
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>
      {failed && <p className="mt-2 text-[12.5px] text-red-600">{failed}</p>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/50 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'my-auto w-full rounded-2xl bg-white shadow-2xl',
          wide ? 'max-w-3xl' : 'max-w-xl',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-ink-900/10 px-6 py-4">
          <h2 className="font-display text-[17px] font-bold text-ink-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-ink-500 transition-colors hover:bg-ink-900/5 hover:text-ink-900"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  )
}

/** Confirm before anything irreversible. */
export function ConfirmDelete({ open, label, onCancel, onConfirm, busy }) {
  return (
    <Modal open={open} title="Delete this item?" onClose={onCancel}>
      <p className="text-[14.5px] leading-relaxed text-ink-600">
        <span className="font-semibold text-ink-900">{label}</span> will be removed from the
        website. This cannot be undone.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          busy={busy}
          onClick={onConfirm}
          className="bg-red-600 hover:bg-red-700 disabled:bg-red-600/50"
        >
          Delete
        </Button>
      </div>
    </Modal>
  )
}

/** Brief confirmation after a save, so an action never looks like it did nothing. */
export function Toast({ message, onDone }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onDone, 2600)
    return () => clearTimeout(t)
  }, [message, onDone])

  if (!message) return null
  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-ink-900 px-4 py-2.5 text-[13.5px] font-medium text-white shadow-xl"
    >
      <Check className="h-4 w-4 text-brand-400" />
      {message}
    </div>
  )
}

export function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-900/15 px-6 py-14 text-center">
      {Icon && <Icon className="mx-auto h-7 w-7 text-ink-500/40" />}
      <p className="mt-3 font-display text-[15px] font-bold text-ink-900">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-ink-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
