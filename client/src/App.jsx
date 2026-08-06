import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  GalleryHorizontalEnd,
  Images,
  Inbox,
  LogOut,
  MapPin,
  MessageSquareQuote,
  Users,
} from 'lucide-react'
import { api, clearToken, getToken } from '@/lib/api'
import ResourcePage, { Thumb } from '@/components/ResourcePage'
import ContactPage from '@/pages/ContactPage'
import EnquiriesPage from '@/pages/EnquiriesPage'
import Login from '@/pages/Login'
import { cn } from '@/components/ui'

/* ------------------------------------------------------------------ */
/* What each CRUD screen edits                                         */
/* ------------------------------------------------------------------ */

const BANNERS = {
  resource: 'banners',
  title: 'Banners',
  icon: GalleryHorizontalEnd,
  addLabel: 'Add banner',
  description:
    'The rotating images at the top of the home page. They play in the order below; hide one to take it off the site without deleting it.',
  fields: [
    { name: 'image', label: 'Image', type: 'image', required: true },
    {
      name: 'alt',
      label: 'Description of the image',
      required: true,
      hint: 'Read aloud by screen readers, and shown if the image fails to load.',
      placeholder: 'A row of green SGD Electric scooters lined up',
    },
  ],
  renderRow: (r) => (
    <div className="flex items-center gap-3">
      <Thumb src={r.image} />
      <p className="truncate text-[14px] text-ink-700">{r.alt || '— no description —'}</p>
    </div>
  ),
}

const TEAM = {
  resource: 'team',
  title: 'Team',
  icon: Users,
  addLabel: 'Add member',
  description: 'The leadership team shown on the About page.',
  fields: [
    { name: 'photo', label: 'Photograph', type: 'image' },
    { name: 'name', label: 'Full name', required: true, placeholder: 'Barupati Srikanth' },
    { name: 'role', label: 'Job title', required: true, placeholder: 'Founder & Chief Executive' },
    { name: 'bio', label: 'Short biography', type: 'textarea', placeholder: 'One or two sentences.' },
  ],
  renderRow: (r) => (
    <div className="flex items-center gap-3">
      <Thumb src={r.photo} />
      <div className="min-w-0">
        <p className="truncate font-display text-[14.5px] font-bold text-ink-900">{r.name}</p>
        <p className="truncate text-[13px] text-ink-500">{r.role}</p>
      </div>
    </div>
  ),
}

const GALLERY = {
  resource: 'gallery',
  title: 'Gallery',
  icon: Images,
  addLabel: 'Add photo',
  description: 'Photographs on the gallery page and the strip on the home page.',
  fields: [
    { name: 'image', label: 'Photograph', type: 'image', required: true },
    { name: 'caption', label: 'Caption', required: true, placeholder: 'Every excuse taken' },
    {
      name: 'tag',
      label: 'Category',
      type: 'select',
      default: 'Celebrations',
      options: ['Celebrations', 'Milestones', 'Festivals', 'Games', 'Office', 'Showroom', 'Rides'],
      hint: 'Used by the filter buttons on the gallery page.',
    },
    { name: 'alt', label: 'Description of the image', hint: 'For screen readers.' },
  ],
  renderRow: (r) => (
    <div className="flex items-center gap-3">
      <Thumb src={r.image} />
      <div className="min-w-0">
        <p className="truncate font-display text-[14.5px] font-bold text-ink-900">{r.caption}</p>
        <p className="truncate text-[12.5px] uppercase tracking-wider text-brand-700">{r.tag}</p>
      </div>
    </div>
  ),
}

const REVIEWS = {
  resource: 'reviews',
  title: 'Reviews',
  icon: MessageSquareQuote,
  addLabel: 'Add review',
  description: 'Rider reviews shown on the home page.',
  fields: [
    { name: 'name', label: 'Name', required: true, placeholder: 'Arun P.' },
    { name: 'city', label: 'City', placeholder: 'Chennai' },
    { name: 'stars', label: 'Rating', type: 'stars', default: 5 },
    {
      name: 'text',
      label: 'What they said',
      type: 'textarea',
      required: true,
      hint: 'Keep it to a sentence or two — long reviews are cut off in the card.',
    },
  ],
  renderRow: (r) => (
    <div className="min-w-0">
      <p className="flex items-center gap-2 truncate font-display text-[14.5px] font-bold text-ink-900">
        {r.name}
        <span className="text-[13px] font-normal text-ink-500">{r.city}</span>
        <span className="text-amber-400">{'★'.repeat(r.stars ?? 5)}</span>
      </p>
      <p className="mt-0.5 truncate text-[13px] text-ink-500">{r.text}</p>
    </div>
  ),
}

const NAV = [
  { to: '/banners', label: 'Banners', icon: GalleryHorizontalEnd },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { to: '/contact', label: 'Contact details', icon: MapPin },
  { to: '/enquiries', label: 'Enquiries', icon: Inbox },
]

/* ------------------------------------------------------------------ */

export default function App() {
  const [user, setUser] = useState(null)
  const [checking, setChecking] = useState(true)

  // A token in storage is not proof it is still valid — ask the server before
  // showing the panel, or an expired session lands on a screen of failed calls.
  useEffect(() => {
    if (!getToken()) {
      setChecking(false)
      return
    }
    api
      .get('/api/me')
      .then((r) => setUser(r.user))
      .catch(() => clearToken())
      .finally(() => setChecking(false))
  }, [])

  const signOut = () => {
    clearToken()
    setUser(null)
  }

  if (checking) {
    return <div className="grid min-h-screen place-items-center bg-ink-950 text-white/40">…</div>
  }

  if (!user) return <Login onSignedIn={setUser} />

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} onSignOut={signOut} />

      <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl">
          <Routes>
            <Route path="/" element={<Navigate to="/banners" replace />} />
            <Route path="/banners" element={<ResourcePage {...BANNERS} />} />
            <Route path="/team" element={<ResourcePage {...TEAM} />} />
            <Route path="/gallery" element={<ResourcePage {...GALLERY} />} />
            <Route path="/reviews" element={<ResourcePage {...REVIEWS} />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/enquiries" element={<EnquiriesPage />} />
            <Route path="*" element={<Navigate to="/banners" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

function Sidebar({ user, onSignOut }) {
  const { pathname } = useLocation()

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-900/10 bg-white sm:flex">
      <div className="border-b border-ink-900/10 px-5 py-5">
        <p className="font-display text-[15px] font-extrabold tracking-tight text-ink-900">
          SGD <span className="text-brand-600">Electric</span>
        </p>
        <p className="mt-0.5 text-[12px] text-ink-500">Website administration</p>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV.map((item) => {
          const Icon = item.icon
          const on = pathname.startsWith(item.to)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold transition-colors',
                on ? 'bg-brand-50 text-brand-800' : 'text-ink-600 hover:bg-ink-900/[.04]',
              )}
            >
              <Icon className={cn('h-4 w-4', on ? 'text-brand-600' : 'text-ink-500')} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-ink-900/10 p-3">
        <p className="px-3 pb-2 text-[12px] text-ink-500">{user.email}</p>
        <button
          type="button"
          onClick={onSignOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-semibold text-ink-600 transition-colors hover:bg-ink-900/[.04]"
        >
          <LogOut className="h-4 w-4 text-ink-500" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
