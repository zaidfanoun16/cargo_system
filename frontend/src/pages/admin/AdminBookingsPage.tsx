import { Ban, CalendarX2, Check, CheckCheck, MessageCircle, ScanLine, Search, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router-dom'

import { StatusBadge } from '../../components/cars/StatusBadge'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { ScrollRow } from '../../components/ui/ScrollRow'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { type AdminBooking, whatsappLink } from '../../lib/admin'
import { api } from '../../lib/api'
import { type BookingStatus, carName } from '../../lib/cars'
import { formatDate } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'
import { AdminHeader } from './AdminLayout'

const FILTERS: (BookingStatus | 'ALL')[] = ['PENDING', 'CONFIRMED', 'PICKED_UP', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'ALL']

type Action = 'confirm' | 'pickup' | 'complete' | 'cancel'

export function AdminBookingsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const confirm = useConfirm()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const bookings = useFetch<AdminBooking[]>('/reservations', { auth: true })
  const [now] = useState(() => Date.now())
  const [busy, setBusy] = useState<number>()
  const [search, setSearch] = useState('')

  const status = (params.get('status') as BookingStatus | 'ALL' | null) ?? 'PENDING'
  const all = bookings.data ?? []
  const counts = Object.fromEntries(
    FILTERS.map((filter) => [filter, filter === 'ALL' ? all.length : all.filter((b) => b.status === filter).length]),
  ) as Record<(typeof FILTERS)[number], number>

  // Search by booking number, customer, phone, car or plate
  const query = search.trim().toLowerCase().replace(/^#/, '')
  const shown = all.filter((booking) => {
    if (status !== 'ALL' && booking.status !== status) return false
    if (!query) return true
    return [
      String(booking.id),
      booking.user.fullName,
      booking.user.email,
      booking.user.phoneNumber ?? '',
      carName(booking.car, 'en'),
      carName(booking.car, 'ar'),
      booking.car.licensePlate,
    ].some((value) => value.toLowerCase().includes(query))
  })

  const dateTime = (value: string) => formatDate(value, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  async function run(booking: AdminBooking, action: Action) {
    const car = carName(booking.car, language)
    const confirmed = await confirm({
      title: t(`admin.bookings.${action}Title`, { id: formatNumber(booking.id, language) }),
      message: t(`admin.bookings.${action}Text`, { name: booking.user.fullName, car }),
      confirmLabel: t(`admin.bookings.${action}`),
      cancelLabel: t('confirm.cancel'),
      tone: action === 'cancel' ? 'danger' : 'default',
    })
    if (!confirmed) return

    setBusy(booking.id)
    try {
      await api(`/reservations/${booking.id}/${action}`, { method: 'PATCH', auth: true })
      toast.success(t(`admin.bookings.${action}Done`, { id: formatNumber(booking.id, language) }))
      bookings.reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    } finally {
      setBusy(undefined)
    }
  }

  return (
    <>
      <AdminHeader title={t('admin.nav.bookings')} subtitle={t('admin.bookings.subtitle')} />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <ScrollRow className="-mx-4 min-w-0 sm:mx-0 md:flex-1" innerClassName="gap-2 px-4 pb-1 sm:px-0" role="tablist">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={status === filter}
              onClick={() => setParams(filter === 'PENDING' ? {} : { status: filter }, { replace: true })}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                status === filter
                  ? 'border-primary bg-primary text-primary-fg'
                  : 'border-border bg-surface text-muted hover:text-text'
              }`}
            >
              {filter === 'ALL' ? t('cars.allCategories') : t(`bookings.status.${filter}`)}
              {bookings.data && (
                <span className={`rounded-full px-2 py-0.5 text-xs ${status === filter ? 'bg-primary-fg/20' : 'bg-surface-muted'}`}>
                  {formatNumber(counts[filter], language)}
                </span>
              )}
            </button>
          ))}
        </ScrollRow>
        <label className="relative block md:w-72 md:shrink-0">
          <span className="sr-only">{t('admin.bookings.search')}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('admin.bookings.search')}
            className="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <div className="mt-6">
        {bookings.error && !bookings.data ? (
          <FormAlert type="error">{t(errorKey(bookings.error))}</FormAlert>
        ) : !bookings.data ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-40 animate-pulse rounded-3xl bg-surface-muted" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
            <CalendarX2 className="size-8 text-muted" aria-hidden />
            <p className="mt-3 font-bold">{t('admin.bookings.empty')}</p>
          </div>
        ) : (
          <ul className={`space-y-3 transition-opacity ${bookings.loading ? 'opacity-60' : ''}`}>
            {shown.map((booking) => {
              const started = new Date(booking.startDate).getTime() <= now
              const ended = new Date(booking.endDate).getTime() <= now
              const actions: Action[] = []
              if (booking.status === 'PENDING') actions.push('confirm')
              // Handed over by scanning the customer's code (from an hour before pickup)
              if (booking.status === 'CONFIRMED' && !ended) actions.push('pickup')
              if (booking.status === 'PICKED_UP') actions.push('complete')
              if ((booking.status === 'PENDING' || booking.status === 'CONFIRMED') && !started) actions.push('cancel')

              return (
                <li key={booking.id} className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold text-muted">
                        {t('bookings.number', { id: formatNumber(booking.id, language) })} ·{' '}
                        {t('admin.bookings.requested', { date: formatDate(booking.createdAt, language) })}
                      </p>
                      <Link to={`/admin/cars/${booking.car.id}`} className="mt-1 block text-lg font-extrabold hover:underline">
                        {carName(booking.car, language)}{' '}
                        <span className="ms-1 text-sm font-semibold text-muted" dir="ltr">
                          {booking.car.licensePlate}
                        </span>
                      </Link>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {booking.lateCancellation && (
                        <span className="inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                          {t('bookings.lateCancelled')}
                        </span>
                      )}
                      <StatusBadge status={booking.status} />
                    </div>
                  </div>

                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t('admin.bookings.customer')}</dt>
                      <dd className="mt-0.5 font-semibold">{booking.user.fullName}</dd>
                      <dd className="mt-1">
                        <CustomerRecord user={booking.user} />
                      </dd>
                      <dd className="truncate text-xs text-muted">
                        <bdi dir="ltr">{booking.user.email}</bdi>
                      </dd>
                      {booking.user.phoneNumber && (
                        <dd>
                          <a
                            href={whatsappLink(booking.user.phoneNumber)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                          >
                            <MessageCircle className="size-3.5" aria-hidden />
                            <span dir="ltr">{booking.user.phoneNumber}</span>
                          </a>
                        </dd>
                      )}
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t('booking.pickup')}</dt>
                      <dd className="mt-0.5 font-semibold">{dateTime(booking.startDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t('booking.return')}</dt>
                      <dd className="mt-0.5 font-semibold">{dateTime(booking.endDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t('booking.total')}</dt>
                      <dd className="mt-0.5 font-extrabold">
                        {formatPrice(booking.totalPrice, language)}
                        {booking.discountPercent > 0 && (
                          <span className="ms-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                            ({t('booking.discount', { percent: formatNumber(booking.discountPercent, language) })})
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {actions.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
                      {actions.includes('confirm') && (
                        <Button className="h-10" disabled={busy === booking.id} onClick={() => run(booking, 'confirm')}>
                          <Check className="size-4" aria-hidden />
                          {t('admin.bookings.confirm')}
                        </Button>
                      )}
                      {actions.includes('pickup') && (
                        <Link
                          to="/admin/handover"
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
                        >
                          <ScanLine className="size-4" aria-hidden />
                          {t('admin.bookings.pickup')}
                        </Link>
                      )}
                      {actions.includes('complete') && (
                        <Button className="h-10" disabled={busy === booking.id} onClick={() => run(booking, 'complete')}>
                          <CheckCheck className="size-4" aria-hidden />
                          {t('admin.bookings.complete')}
                        </Button>
                      )}
                      {actions.includes('cancel') && (
                        <Button
                          variant="secondary"
                          className="h-10 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                          disabled={busy === booking.id}
                          onClick={() => run(booking, 'cancel')}
                        >
                          <X className="size-4" aria-hidden />
                          {t('admin.bookings.cancel')}
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}

// Completed rentals, late cancellations and no-shows, so the admin can
// decide whether to confirm a request
function CustomerRecord({ user }: { user: AdminBooking['user'] }) {
  const { t, i18n } = useTranslation()
  const { completed, lateCancellations, noShows } = user.record
  const count = (value: number) => ({ formatted: formatNumber(value, i18n.language) })
  const chip = 'rounded-full px-2 py-0.5 text-xs font-bold'

  return (
    <ul className="flex flex-wrap gap-1" aria-label={t('admin.bookings.record')}>
      {user.bookingBlocked && (
        <li className={`${chip} inline-flex items-center gap-1 bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300`}>
          <Ban className="size-3" aria-hidden />
          {t('admin.users.blocked')}
        </li>
      )}
      {completed + lateCancellations + noShows === 0 ? (
        <li className={`${chip} bg-surface-muted text-muted`}>{t('admin.bookings.newCustomer')}</li>
      ) : (
        <>
          <li className={`${chip} bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300`}>
            {t('admin.bookings.completed', count(completed))}
          </li>
          {lateCancellations > 0 && (
            <li className={`${chip} bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200`}>
              {t('admin.bookings.lateCancellations', count(lateCancellations))}
            </li>
          )}
          {noShows > 0 && (
            <li className={`${chip} bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200`}>
              {t('admin.bookings.noShows', count(noShows))}
            </li>
          )}
        </>
      )}
    </ul>
  )
}
