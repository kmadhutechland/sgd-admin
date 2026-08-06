import { useCallback, useEffect, useState } from 'react'
import { Inbox, Mail, Phone, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { Button, ConfirmDelete, Empty, IconButton, PageHeader, Toast, cn } from '@/components/ui'

/** Messages sent through the website's contact form. Read and delete only —
 *  these come from the public, so nothing here is editable. */
export default function EnquiriesPage() {
  const [rows, setRows] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')

  const load = useCallback(async () => {
    // newest first: an inbox is read from the top
    const list = await api.get('/api/enquiries')
    setRows([...list].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const markRead = async (row) => {
    if (row.read) return
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, read: true } : x)))
    try {
      await api.put(`/api/enquiries/${row.id}`, { read: true })
    } catch {
      load()
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await api.del(`/api/enquiries/${deleting.id}`)
      setDeleting(null)
      setToast('Message deleted')
      await load()
    } finally {
      setBusy(false)
    }
  }

  const unread = rows?.filter((r) => !r.read).length ?? 0

  return (
    <div>
      <PageHeader
        eyebrow={
          rows === null
            ? 'Loading'
            : unread > 0
              ? `${unread} waiting for a reply`
              : `${rows.length} message${rows.length === 1 ? '' : 's'}, all read`
        }
        title="Enquiries"
        description="Messages sent through the contact form on the website. Opening one marks it as read."
      />

      <div className="mt-6">
        {rows === null ? (
          <p className="py-10 text-center text-[14px] text-ink-500">Loading…</p>
        ) : rows.length === 0 ? (
          <Empty
            icon={Inbox}
            title="No messages yet"
            hint="When someone fills in the contact form on the website, it will arrive here."
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                onClick={() => markRead(row)}
                className={cn(
                  'relative cursor-default overflow-hidden rounded-2xl border bg-white p-4 pl-5 shadow-card',
                  'transition-all duration-200 hover:-translate-y-px hover:shadow-lift',
                  row.read
                    ? 'border-ink-900/[.07]'
                    : 'border-brand-400/40 bg-brand-50/50 shadow-glow',
                )}
              >
                {/* an unread message gets a lime edge, the same signal the
                    sidebar uses for "you are here" */}
                {!row.read && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 w-[3px] bg-volt-500"
                  />
                )}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-display text-[15px] font-bold text-ink-900">
                      {!row.read && (
                        <span
                          aria-label="Unread"
                          className="h-2 w-2 shrink-0 rounded-full bg-brand-500"
                        />
                      )}
                      {row.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-500">
                      <a
                        href={`mailto:${row.email}`}
                        className="inline-flex items-center gap-1.5 hover:text-brand-700"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {row.email}
                      </a>
                      {row.phone && (
                        <a
                          href={`tel:${row.phone}`}
                          className="inline-flex items-center gap-1.5 hover:text-brand-700"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {row.phone}
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <time className="text-[12.5px] text-ink-500" dateTime={row.createdAt}>
                      {new Date(row.createdAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                    <IconButton
                      type="button"
                      tone="danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        setDeleting(row)
                      }}
                      aria-label="Delete message"
                      title="Delete message"
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap border-t border-ink-900/[.07] pt-3 text-[14px] leading-relaxed text-ink-600">
                  {row.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDelete
        open={!!deleting}
        label={deleting ? `The message from ${deleting.name}` : ''}
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={remove}
      />
      <Toast message={toast} onDone={() => setToast('')} />
    </div>
  )
}
