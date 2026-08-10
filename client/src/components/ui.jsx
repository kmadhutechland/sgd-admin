import { useEffect, useRef, useState } from 'react'
import { AlertCircle, Check, ImagePlus, Loader2, Upload, X } from 'lucide-react'
import { api, mediaUrl } from '@/lib/api'

export const cn = (...c) => c.filter(Boolean).join(' ')

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

export function Button({ variant = 'primary', busy, children, className, ...rest }) {
  const styles = {
    // the glow is what makes the primary action findable on a page of white
    // cards — colour alone at this size reads as just another label
    primary:
      'bg-brand-600 text-white shadow-glow hover:bg-brand-700 hover:shadow-lift disabled:bg-brand-600/50 disabled:shadow-none',
    ghost: 'text-ink-600 hover:bg-ink-900/5',
    danger: 'text-red-600 hover:bg-red-50',
    outline:
      'border border-ink-900/[.12] bg-white text-ink-700 shadow-sm hover:border-brand-500/40 hover:text-brand-700',
  }
  return (
    <button
      {...rest}
      disabled={busy || rest.disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-semibold',
        'transition-all duration-200 active:scale-[.97]',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:cursor-not-allowed disabled:active:scale-100',
        styles[variant],
        className,
      )}
    >
      {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
}

/**
 * A square icon action — edit, hide, delete, reorder.
 *
 * These used to be bare icons on a white row: three grey glyphs that read as
 * decoration until hovered, with nothing to say which one was destructive. Each
 * now sits on its own tinted chip, so the row shows what it can do at rest, and
 * delete is visibly the odd one out before it is clicked rather than after.
 *
 * `tone` picks the colour; `active` is for a toggle that is currently on.
 */
export function IconButton({ tone = 'neutral', active = false, className, children, ...rest }) {
  const tones = {
    neutral:
      'bg-ink-900/[.04] text-ink-500 ring-ink-900/[.06] hover:bg-ink-900/[.07] hover:text-ink-800 hover:ring-ink-900/10',
    brand:
      'bg-brand-50 text-brand-600 ring-brand-600/[.12] hover:bg-brand-100 hover:text-brand-700 hover:ring-brand-600/25',
    danger:
      'bg-red-50/70 text-red-500/80 ring-red-500/10 hover:bg-red-100 hover:text-red-600 hover:ring-red-500/30',
  }
  return (
    <button
      {...rest}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-xl ring-1 ring-inset',
        'transition-all duration-200 hover:-translate-y-px hover:shadow-sm active:translate-y-0 active:scale-95',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500',
        'disabled:pointer-events-none disabled:opacity-30',
        tones[active ? 'brand' : tone],
        className,
      )}
    >
      {children}
    </button>
  )
}

/** The up/down pair — narrower, since they sit as a stacked column. */
export function StepButton({ className, children, ...rest }) {
  return (
    <button
      {...rest}
      className={cn(
        'grid h-[18px] w-7 place-items-center rounded-md text-ink-500 transition-all duration-150',
        'hover:bg-brand-50 hover:text-brand-700 active:scale-90',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500',
        'disabled:pointer-events-none disabled:opacity-20',
        className,
      )}
    >
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
  'w-full rounded-xl border bg-white px-3.5 py-2.5 text-[14px] text-ink-900 outline-none transition-all duration-200 placeholder:text-ink-500/50 hover:border-ink-900/25 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/[.12]'

export const Input = ({ error, className, ...rest }) => (
  <input
    {...rest}
    className={cn(inputBase, error ? 'border-red-400' : 'border-ink-900/[.12]', className)}
  />
)

export const Textarea = ({ error, rows = 4, className, ...rest }) => (
  <textarea
    {...rest}
    rows={rows}
    className={cn(inputBase, 'resize-y', error ? 'border-red-400' : 'border-ink-900/[.12]', className)}
  />
)

export const Select = ({ error, options = [], className, ...rest }) => (
  <select
    {...rest}
    className={cn(inputBase, error ? 'border-red-400' : 'border-ink-900/[.12]', className)}
  >
    {options.map((o) => (
      <option key={o} value={o}>
        {o}
      </option>
    ))}
  </select>
)

/** A yes/no switch. A real checkbox underneath, so it is keyboard-operable. */
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex cursor-pointer select-none items-center gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500',
          checked ? 'bg-brand-600' : 'bg-ink-900/15',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          )}
        />
      </span>
      {label && <span className="text-[13.5px] text-ink-600">{label}</span>}
    </label>
  )
}

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
        <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-ink-900/10 bg-brand-50/60">
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
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink-950/60 p-4 backdrop-blur-md sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          'my-auto w-full animate-fade-up rounded-[1.25rem] bg-white shadow-2xl ring-1 ring-ink-900/5',
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
      className="fixed bottom-5 left-1/2 z-[60] flex -translate-x-1/2 items-center gap-2 animate-fade-up rounded-full bg-ink-950 px-5 py-3 text-[13.5px] font-medium text-white shadow-xl"
    >
      <Check className="h-4 w-4 text-brand-400" />
      {message}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Page furniture — shared so every screen is laid out identically      */
/* ------------------------------------------------------------------ */

/**
 * The heading block at the top of every screen.
 *
 * `eyebrow` carries the status line — how many rows are live, how many
 * enquiries are unread. It sits above the title rather than beside it so the
 * answer to "is there anything to do here" arrives before the page name.
 */
export function PageHeader({ eyebrow, title, description, action }) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-2 font-display text-[11px] font-bold uppercase tracking-[.18em] text-brand-700">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-volt-500" />
            {eyebrow}
          </p>
        )}
        <h1 className="mt-2.5 font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-ink-900">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-500">{description}</p>
        )}
      </div>
      {action}
    </header>
  )
}

/** A white panel. `title`/`icon` give it a labelled header strip. */
export function Card({ icon: Icon, title, hint, children, className }) {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-2xl border border-ink-900/[.07] bg-white shadow-card',
        className,
      )}
    >
      {title && (
        <div className="flex items-start gap-3 border-b border-ink-900/[.07] bg-brand-50/40 px-6 py-4">
          {Icon && (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-brand-600 ring-1 ring-inset ring-brand-600/15">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-[14.5px] font-bold text-ink-900">{title}</h2>
            {hint && <p className="mt-0.5 text-[12.5px] leading-relaxed text-ink-500">{hint}</p>}
          </div>
        </div>
      )}
      <div className="p-6">{children}</div>
    </section>
  )
}

export function Empty({ icon: Icon, title, hint, action }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-900/15 px-6 py-14 text-center">
      {Icon && <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10"><Icon className="h-6 w-6" /></span>}
      <p className="mt-3 font-display text-[15px] font-bold text-ink-900">{title}</p>
      {hint && <p className="mx-auto mt-1.5 max-w-sm text-[13.5px] text-ink-500">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
