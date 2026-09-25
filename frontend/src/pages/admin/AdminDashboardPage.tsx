import { AlertCircle, ArrowLeft, CalendarCheck, CarFront, Users, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { StatusBadge } from '../../components/cars/StatusBadge'
import { FormAlert } from '../../components/form/FormAlert'
import { useFetch } from '../../hooks/useFetch'
import type { Stats } from '../../lib/admin'
import { type BookingStatus, carName } from '../../lib/cars'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'
import { AdminHeader } from './AdminLayout'
import { RevenueChart } from './RevenueChart'

const STATUSES: BookingStatus[] = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { data: stats, error, reload } = useFetch<Stats>('/admin/stats', { auth: true })

  if (error && !stats) {
    return (
      <FormAlert type="error">
        {t(errorKey(error))}
        <button type="button" onClick={reload} className="mt-2 block font-bold underline underline-offset-4">
          {t('cars.retry')}
        </button>
      </FormAlert>
    )
  }

  if (!stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-hidden>
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-28 animate-pulse rounded-3xl bg-surface-muted" />
        ))}
      </div>
    )
  }

  const pending = stats.reservationsByStatus.PENDING
  const totalBookings = Math.max(1, stats.totals.reservations)
  const number = (value: number) => formatNumber(value, language)

  return (
    <>
      <AdminHeader title={t('admin.nav.dashboard')} subtitle={t('admin.stats.subtitle')} />

      {pending > 0 && (
        <Link
          to="/admin/bookings?status=PENDING"
          className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70"
        >
          <AlertCircle className="size-5 shrink-0" aria-hidden />
          <span className="flex-1">{t('admin.stats.pendingAlert', { count: pending, formatted: number(pending) })}</span>
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* The one number the dashboard leads with */}
        <StatTile icon={<Wallet className="size-5" aria-hidden />} label={t('admin.stats.revenue')} hero>
          {formatPrice(stats.totals.revenue, language)}
        </StatTile>
        <StatTile icon={<CalendarCheck className="size-5" aria-hidden />} label={t('admin.nav.bookings')}>
          {number(stats.totals.reservations)}
        </StatTile>
        <StatTile icon={<CarFront className="size-5" aria-hidden />} label={t('admin.nav.cars')}>
          {number(stats.totals.cars)}
        </StatTile>
        <StatTile icon={<Users className="size-5" aria-hidden />} label={t('admin.stats.customers')}>
          {number(stats.totals.users)}
        </StatTile>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card title={t('admin.stats.revenueByMonth')} subtitle={t('admin.stats.revenueNote')}>
          <RevenueChart months={stats.revenueByMonth} />
        </Card>

        <Card title={t('admin.stats.occupancy')} subtitle={t('admin.stats.occupancyNote')}>
          <p className="text-4xl font-extrabold">
            {formatNumber(stats.occupancy.percentage, language)}
            <span className="text-2xl">{language === 'ar' ? '٪' : '%'}</span>
          </p>
          {/* Meter: the track is a lighter step of the fill's color */}
          <div
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-soft"
            role="meter"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={stats.occupancy.percentage}
            aria-label={t('admin.stats.occupancy')}
          >
            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, stats.occupancy.percentage)}%` }} />
          </div>
          <p className="mt-3 text-sm text-muted">
            {t('admin.stats.occupancyDays', {
              booked: formatNumber(stats.occupancy.bookedDays, language),
              available: number(stats.occupancy.availableDays),
            })}
          </p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title={t('admin.stats.byStatus')}>
          <ul className="space-y-3">
            {STATUSES.map((status) => {
              const count = stats.reservationsByStatus[status]
              return (
                <li key={status}>
                  <Link to={`/admin/bookings?status=${status}`} className="group block">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={status} />
                      <span className="text-sm font-bold tabular-nums group-hover:underline">{number(count)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-muted" aria-hidden>
                      <div className="h-full rounded-full bg-primary/70" style={{ width: `${(count / totalBookings) * 100}%` }} />
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Card>

        <Card title={t('admin.stats.topCars')}>
          {stats.topCars.length === 0 ? (
            <p className="text-sm text-muted">{t('admin.stats.noData')}</p>
          ) : (
            <ol className="divide-y divide-border">
              {stats.topCars.map((car, index) => (
                <li key={car.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-bold">
                    {number(index + 1)}
                  </span>
                  <Link to={`/admin/cars/${car.id}`} className="min-w-0 flex-1 truncate text-sm font-bold hover:underline">
                    {carName(car, language)}
                  </Link>
                  <div className="text-end text-xs">
                    <p className="font-bold tabular-nums">{formatPrice(car.revenue, language)}</p>
                    <p className="text-muted">
                      {t('admin.stats.bookingsCount', { count: car.reservations, formatted: number(car.reservations) })}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </>
  )
}

function StatTile({ icon, label, children, hero = false }: { icon: ReactNode; label: string; children: ReactNode; hero?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 ${hero ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface'}`}>
      <p className={`flex items-center gap-2 text-sm font-semibold ${hero ? 'text-primary-fg/80' : 'text-muted'}`}>
        {icon}
        {label}
      </p>
      <p className={`mt-3 font-extrabold tabular-nums ${hero ? 'text-3xl sm:text-4xl' : 'text-3xl'}`}>{children}</p>
    </div>
  )
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-extrabold">{title}</h2>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}
