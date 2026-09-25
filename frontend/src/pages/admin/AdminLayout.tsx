import { CalendarCheck, CarFront, LayoutDashboard, Tags, Users } from 'lucide-react'
import { type ReactNode, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink, Outlet } from 'react-router-dom'

import { Container } from '../../components/ui/Container'

const sections = [
  { to: '/admin', key: 'admin.nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/bookings', key: 'admin.nav.bookings', icon: CalendarCheck, end: false },
  { to: '/admin/cars', key: 'admin.nav.cars', icon: CarFront, end: false },
  { to: '/admin/categories', key: 'admin.nav.categories', icon: Tags, end: false },
  { to: '/admin/users', key: 'admin.nav.users', icon: Users, end: false },
] as const

// Side menu on large screens, a sideways-scrolling row on phones
export function AdminLayout() {
  const { t } = useTranslation()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors ${
      isActive ? 'bg-primary text-primary-fg' : 'text-muted hover:bg-surface-muted hover:text-text'
    }`

  return (
    <Container className="py-6 sm:py-10">
      <div className="grid items-start gap-6 lg:grid-cols-[220px_1fr]">
        <nav
          aria-label={t('nav.admin')}
          className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 lg:sticky lg:top-20 lg:mx-0 lg:flex-col lg:rounded-3xl lg:border lg:border-border lg:bg-surface lg:p-3"
        >
          <p className="hidden px-3.5 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-muted lg:block">
            {t('nav.admin')}
          </p>
          {sections.map(({ to, key, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon className="size-5" aria-hidden />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="min-w-0">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-surface-muted" />}>
            <Outlet />
          </Suspense>
        </div>
      </div>
    </Container>
  )
}

// Title row shared by the admin pages
export function AdminHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
