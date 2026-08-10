import { useEffect, useState } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import {
  ExternalLink,
  GalleryHorizontalEnd,
  Images,
  IndianRupee,
  Inbox,
  LogOut,
  MapPin,
  Menu,
  MessageSquareQuote,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react'
import { SITE_URL } from '@/lib/api'
import { api, clearToken, getToken } from '@/lib/api'
import ResourcePage, { Thumb } from '@/components/ResourcePage'
import ContactPage from '@/pages/ContactPage'
import EnquiriesPage from '@/pages/EnquiriesPage'
import AccountPage from '@/pages/AccountPage'
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

/** ₹ with thousands separators, matching how the website prints a price. */
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`

const PERIOD_LABEL = { hour: 'per hour', day: 'per day', week: 'per week', month: 'per month' }

const PLANS = {
  resource: 'plans',
  title: 'Rental plans',
  icon: IndianRupee,
  addLabel: 'Add plan',
  description:
    'What a vehicle costs to rent, by hour, day, week or month. These appear as the pricing cards on the home page, in the order below.',
  fields: [
    { name: 'name', label: 'Plan name', required: true, placeholder: 'Daily rental' },
    {
      name: 'period',
      label: 'Billing period',
      type: 'select',
      options: ['hour', 'day', 'week', 'month'],
      default: 'day',
      hint: 'How often the price is charged.',
    },
    {
      name: 'price',
      label: 'Price (₹)',
      type: 'number',
      required: true,
      placeholder: '129',
      hint: 'Numbers only — the website adds the ₹ and the period.',
    },
    {
      name: 'wasPrice',
      label: 'Was (₹)',
      type: 'number',
      placeholder: '0',
      hint: 'Shown struck through beside the price. Leave at 0 for no discount.',
    },
    { name: 'vehicle', label: 'Vehicle', placeholder: 'SGD City 25' },
    { name: 'note', label: 'Short note', placeholder: 'All-inclusive, cancel any day' },
    {
      name: 'includes',
      label: "What's included",
      type: 'textarea',
      placeholder: 'Insurance included\nServicing and spares\nRoadside assistance',
      hint: 'One per line. Each line becomes a ticked item on the card.',
    },
    {
      name: 'featured',
      label: 'Highlight this plan',
      type: 'toggle',
      toggleLabel: 'Show as the recommended plan',
      hint: 'Only mark one — it is drawn larger and in the brand colour.',
    },
  ],
  renderRow: (p) => (
    <div className="min-w-0">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-display text-[14.5px] font-bold text-ink-900">
        {p.name}
        <span className="text-brand-700">{rupees(p.price)}</span>
        <span className="text-[12.5px] font-normal text-ink-500">
          {PERIOD_LABEL[p.period] ?? p.period}
        </span>
        {p.wasPrice > 0 && (
          <span className="text-[12.5px] font-normal text-ink-500 line-through">
            {rupees(p.wasPrice)}
          </span>
        )}
        {p.featured && (
          <span className="rounded-full bg-volt-500/20 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-brand-800">
            Highlighted
          </span>
        )}
      </p>
      <p className="mt-0.5 truncate text-[13px] text-ink-500">
        {[p.vehicle, p.note].filter(Boolean).join(' · ') || 'No vehicle or note set'}
      </p>
    </div>
  ),
}

const NAV = [
  { to: '/banners', label: 'Banners', icon: GalleryHorizontalEnd },
  { to: '/team', label: 'Team', icon: Users },
  { to: '/gallery', label: 'Gallery', icon: Images },
  { to: '/reviews', label: 'Reviews', icon: MessageSquareQuote },
  { to: '/plans', label: 'Rental plans', icon: IndianRupee },
  { to: '/contact', label: 'Contact details', icon: MapPin },
  { to: '/enquiries', label: 'Enquiries', icon: Inbox },
  { to: '/account', label: 'Account', icon: ShieldCheck },
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

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav user={user} onSignOut={signOut} />

        <main className="min-w-0 flex-1 px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
          <div className="mx-auto max-w-5xl">
          <Routes>
            <Route path="/" element={<Navigate to="/banners" replace />} />
            <Route path="/banners" element={<ResourcePage {...BANNERS} />} />
            <Route path="/team" element={<ResourcePage {...TEAM} />} />
            <Route path="/gallery" element={<ResourcePage {...GALLERY} />} />
            <Route path="/reviews" element={<ResourcePage {...REVIEWS} />} />
              <Route path="/plans" element={<ResourcePage {...PLANS} />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/enquiries" element={<EnquiriesPage />} />
              <Route path="/account" element={<AccountPage user={user} />} />
              <Route path="*" element={<Navigate to="/banners" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  )
}

/**
 * The navigation links, shared by the sidebar and the mobile drawer.
 *
 * The active item is marked with a lime rule down its left edge rather than a
 * filled block: against the dark sheet a filled pill reads as a button you are
 * meant to press, not as where you already are.
 */
function NavItems({ pathname, onNavigate }) {
  return NAV.map((item) => {
    const Icon = item.icon
    const on = pathname.startsWith(item.to)
    return (
      <NavLink
        key={item.to}
        to={item.to}
        onClick={onNavigate}
        className={cn(
          'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold transition-colors duration-200',
          on ? 'bg-white/[.08] text-white' : 'text-white/55 hover:bg-white/[.05] hover:text-white/90',
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-volt-500 transition-opacity duration-200',
            on ? 'opacity-100' : 'opacity-0',
          )}
        />
        <Icon
          className={cn(
            'h-[17px] w-[17px] transition-colors duration-200',
            on ? 'text-volt-400' : 'text-white/40 group-hover:text-white/70',
          )}
        />
        {item.label}
      </NavLink>
    )
  })
}

/** The logo lockup, on the dark sheet. */
function Brand() {
  return (
    <a
      href={SITE_URL}
      target="_blank"
      rel="noreferrer noopener"
      title="Open the website"
      className="group block rounded-xl px-1 py-1 outline-none focus-visible:ring-2 focus-visible:ring-volt-500/50"
    >
      {/* the reversed artwork, since this sits on ink rather than white */}
      <img
        src="/logo-reversed.png"
        alt="SGD Electric"
        width="1040"
        height="514"
        className="h-9 w-auto"
      />
      <p className="mt-2 flex items-center gap-1.5 pl-0.5 text-[11px] font-semibold uppercase tracking-[.16em] text-white/40 transition-colors group-hover:text-white/60">
        Administration
        <ExternalLink className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
      </p>
    </a>
  )
}

function SignedInAs({ user, onSignOut }) {
  return (
    <div className="border-t border-white/10 p-3">
      <div className="flex items-center gap-2.5 px-2 pb-2.5 pt-1">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-500/20 font-display text-[12px] font-extrabold text-brand-300 ring-1 ring-inset ring-brand-400/30">
          {(user.email ?? '?').slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[12.5px] font-semibold text-white/85">
            {user.email}
          </span>
          <span className="block text-[11px] text-white/35">Signed in</span>
        </span>
      </div>
      <button
        type="button"
        onClick={onSignOut}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-semibold text-white/55 transition-colors hover:bg-white/[.06] hover:text-white"
      >
        <LogOut className="h-[17px] w-[17px] text-white/40" />
        Sign out
      </button>
    </div>
  )
}

function Sidebar({ user, onSignOut }) {
  const { pathname } = useLocation()

  return (
    <aside className="sidebar-sheen sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-ink-950 sm:flex">
      <div className="px-5 py-6">
        <Brand />
      </div>

      <nav className="flex-1 space-y-1 px-3">
        <NavItems pathname={pathname} />
      </nav>

      <SignedInAs user={user} onSignOut={onSignOut} />
    </aside>
  )
}

/**
 * Navigation for phones.
 *
 * The sidebar is desktop-only, and until now nothing replaced it below that
 * breakpoint — on a phone the panel had no way to move between sections at all.
 */
function MobileNav({ user, onSignOut }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // a route change should close the drawer, not leave it covering the page
  useEffect(() => setOpen(false), [pathname])

  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  return (
    <>
      <header className="sidebar-sheen sticky top-0 z-40 flex items-center justify-between bg-ink-950 px-4 py-3 sm:hidden">
        <img src="/logo-reversed.png" alt="SGD Electric" className="h-7 w-auto" />
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 sm:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-ink-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="sidebar-sheen absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-ink-950 shadow-2xl">
            <div className="flex items-start justify-between px-5 py-6">
              <Brand />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto px-3">
              <NavItems pathname={pathname} onNavigate={() => setOpen(false)} />
            </nav>
            <SignedInAs user={user} onSignOut={onSignOut} />
          </div>
        </div>
      )}
    </>
  )
}
