import { AlarmClockOff, ArrowLeft, CalendarClock, KeyRound, Undo2 } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useFetch } from '../../hooks/useFetch'
import type { AdminBooking } from '../../lib/admin'
import { carName } from '../../lib/cars'
import { formatDate, formatTime, isSameDay } from '../../lib/dates'
import { formatNumber } from '../../lib/format'

// What the office has to do today: cars to hand over, cars coming back,
// and cars that should have come back already
export function TodaySchedule() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const bookings = useFetch<AdminBooking[]>('/reservations', { auth: true })
  const [now] = useState(() => Date.now())

  const all = bookings.data ?? []
  const byTime = (a: AdminBooking, b: AdminBooking, key: 'startDate' | 'endDate') =>
    new Date(a[key]).getTime() - new Date(b[key]).getTime()

  const overdue = all
    .filter((booking) => booking.status === 'PICKED_UP' && new Date(booking.endDate).getTime() <= now)
    .sort((a, b) => byTime(a, b, 'endDate'))
  const pickups = all
    .filter((booking) => booking.status === 'CONFIRMED' && isSameDay(booking.startDate, now))
    .sort((a, b) => byTime(a, b, 'startDate'))
  const returns = all
    .filter(
      (booking) =>
        booking.status === 'PICKED_UP' && isSameDay(booking.endDate, now) && new Date(booking.endDate).getTime() > now,
    )
    .sort((a, b) => byTime(a, b, 'endDate'))

  const nothing = overdue.length + pickups.length + returns.length === 0

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 font-extrabold">
            <CalendarClock className="size-5" aria-hidden />
            {t('admin.today.title')}
          </h2>
          <p className="mt-0.5 text-xs text-muted">{formatDate(new Date(now), language, { weekday: 'long' })}</p>
        </div>
        <Link
          to="/admin/handover"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
        >
          {t('admin.nav.handover')}
          <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
        </Link>
      </div>

      {!bookings.data ? (
        <div className="mt-5 h-24 animate-pulse rounded-2xl bg-surface-muted" aria-hidden />
      ) : nothing ? (
        <p className="mt-5 rounded-2xl bg-surface-muted px-4 py-6 text-center text-sm text-muted">{t('admin.today.empty')}</p>
      ) : (
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <Group
            icon={<AlarmClockOff className="size-4" aria-hidden />}
            title={t('admin.today.overdue')}
            count={formatNumber(overdue.length, language)}
            tone="red"
          >
            {overdue.map((booking) => (
              <Row
                key={booking.id}
                booking={booking}
                time={formatDate(booking.endDate, language, { hour: 'numeric', minute: '2-digit', year: undefined })}
              />
            ))}
          </Group>
          <Group
            icon={<KeyRound className="size-4" aria-hidden />}
            title={t('admin.today.pickups')}
            count={formatNumber(pickups.length, language)}
            tone="blue"
          >
            {pickups.map((booking) => (
              <Row key={booking.id} booking={booking} time={formatTime(booking.startDate, language)} late={booking.runningLate} />
            ))}
          </Group>
          <Group
            icon={<Undo2 className="size-4" aria-hidden />}
            title={t('admin.today.returns')}
            count={formatNumber(returns.length, language)}
            tone="emerald"
          >
            {returns.map((booking) => (
              <Row key={booking.id} booking={booking} time={formatTime(booking.endDate, language)} />
            ))}
          </Group>
        </div>
      )}
    </section>
  )
}

function Row({ booking, time, late = false }: { booking: AdminBooking; time: string; late?: boolean }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language

  return (
    <li className="rounded-2xl border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-extrabold tabular-nums">{time}</span>
        <span className="text-xs text-muted">{t('bookings.number', { id: formatNumber(booking.id, language) })}</span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{carName(booking.car, language)}</p>
      <p className="truncate text-xs text-muted">
        {booking.user.fullName}
        {late && <span className="ms-1 font-bold text-blue-700 dark:text-blue-300">· {t('admin.today.runningLate')}</span>}
      </p>
    </li>
  )
}

const tones = {
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
}

function Group({
  icon,
  title,
  count,
  tone,
  children,
}: {
  icon: ReactNode
  title: string
  count: string
  tone: keyof typeof tones
  children: ReactNode[]
}) {
  return (
    <div>
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <span className={`grid size-7 place-items-center rounded-full ${tones[tone]}`}>{icon}</span>
        {title}
        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs">{count}</span>
      </h3>
      {children.length === 0 ? (
        <p className="mt-3 text-sm text-muted">—</p>
      ) : (
        <ul className="mt-3 space-y-2">{children}</ul>
      )}
    </div>
  )
}
