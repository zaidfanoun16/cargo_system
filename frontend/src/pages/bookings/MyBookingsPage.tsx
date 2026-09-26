import { ArrowLeft, CalendarX2, CarFront, CircleAlert, CircleCheck, Clock, RotateCcw, ShieldCheck, Star, XCircle } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CarPhoto } from '../../components/cars/CarPhoto'
import { StatusBadge } from '../../components/cars/StatusBadge'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { ScrollRow } from '../../components/ui/ScrollRow'
import { Container } from '../../components/ui/Container'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { type Booking, carName } from '../../lib/cars'
import { formatDate } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'
import { ReviewDialog } from './ReviewDialog'

type Tab = 'upcoming' | 'past' | 'cancelled'

function tabOf(booking: Booking, now: number): Tab {
  if (booking.status === 'CANCELLED' || booking.status === 'NO_SHOW') return 'cancelled'
  // The customer still has the car, even if the return time has passed
  if (booking.status === 'PICKED_UP') return 'upcoming'
  if (booking.status === 'COMPLETED' || new Date(booking.endDate).getTime() <= now) return 'past'
  return 'upcoming'
}

// Cancelling now would count as a late cancellation
function isLate(booking: Booking, now: number) {
  return booking.cancellation !== null && now > new Date(booking.cancellation.freeUntil).getTime()
}

export function MyBookingsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const confirm = useConfirm()
  const toast = useToast()

  const bookings = useFetch<Booking[]>('/reservations/my', { auth: true })
  const [now] = useState(() => Date.now())
  const [chosenTab, setChosenTab] = useState<Tab>()
  const [cancelling, setCancelling] = useState<number>()
  const [reviewing, setReviewing] = useState<Booking | null>(null)

  const list = bookings.data ?? []
  const counts: Record<Tab, number> = { upcoming: 0, past: 0, cancelled: 0 }
  for (const booking of list) counts[tabOf(booking, now)]++
  // Open on upcoming bookings, or on past ones when there are none
  const tab = chosenTab ?? (counts.upcoming === 0 && counts.past > 0 ? 'past' : 'upcoming')
  const shown = list.filter((booking) => tabOf(booking, now) === tab)

  const dateTime = (value: string) =>
    formatDate(value, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  async function cancel(booking: Booking) {
    const name = carName(booking.car, language)
    const late = isLate(booking, new Date().getTime())
    const confirmed = await confirm({
      title: t('bookings.cancelTitle'),
      message: (
        <>
          <p>{t('bookings.cancelText', { car: name, date: dateTime(booking.startDate) })}</p>
          {late && (
            <p className="mt-3 rounded-2xl bg-amber-100 p-3 font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {t('bookings.lateCancelWarning')}
            </p>
          )}
        </>
      ),
      confirmLabel: t('bookings.cancelConfirm'),
      cancelLabel: t('bookings.keep'),
      tone: 'danger',
    })
    if (!confirmed) return

    setCancelling(booking.id)
    try {
      await api(`/reservations/${booking.id}/cancel`, { method: 'PATCH', auth: true })
      toast.success(t('bookings.cancelled', { car: name }))
      bookings.reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    } finally {
      setCancelling(undefined)
    }
  }

  const tabs: Tab[] = ['upcoming', 'past', 'cancelled']

  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold sm:text-4xl">{t('nav.myBookings')}</h1>
      <p className="mt-2 text-muted">{t('bookings.subtitle')}</p>

      <ScrollRow className="mt-6" innerClassName="gap-2 pb-1" role="tablist">
        {tabs.map((name) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={tab === name}
            onClick={() => setChosenTab(name)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
              tab === name
                ? 'border-primary bg-primary text-primary-fg'
                : 'border-border bg-surface text-muted hover:text-text'
            }`}
          >
            {t(`bookings.tabs.${name}`)}
            {bookings.data && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${tab === name ? 'bg-primary-fg/20' : 'bg-surface-muted'}`}
              >
                {formatNumber(counts[name], language)}
              </span>
            )}
          </button>
        ))}
      </ScrollRow>

      <div className="mt-6">
        {bookings.error && !bookings.loading ? (
          <div className="max-w-md">
            <FormAlert type="error">
              {t(errorKey(bookings.error))}
              <button
                type="button"
                onClick={bookings.reload}
                className="mt-2 flex items-center gap-1.5 font-bold underline underline-offset-4"
              >
                <RotateCcw className="size-4" aria-hidden />
                {t('cars.retry')}
              </button>
            </FormAlert>
          </div>
        ) : !bookings.data ? (
          <div className="space-y-4" aria-hidden>
            {[0, 1].map((index) => (
              <div key={index} className="h-44 animate-pulse rounded-3xl bg-surface-muted" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft">
              <CalendarX2 className="size-6" aria-hidden />
            </span>
            <p className="mt-4 font-bold">{t(`bookings.empty.${tab}`)}</p>
            {tab === 'upcoming' && (
              <Link
                to="/cars"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
              >
                {t('home.ctaButton')}
                <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
              </Link>
            )}
          </div>
        ) : (
          <ul className={`space-y-4 transition-opacity ${bookings.loading ? 'opacity-60' : ''}`}>
            {shown.map((booking) => {
              const name = carName(booking.car, language)
              const canCancel =
                booking.cancellation !== null && now < new Date(booking.cancellation.until).getTime()
              const tooLate =
                booking.status === 'CONFIRMED' && !canCancel && new Date(booking.startDate).getTime() > now
              const canReview = booking.status === 'COMPLETED' && !booking.reviewed

              return (
                <li
                  key={booking.id}
                  className="overflow-hidden rounded-3xl border border-border bg-surface sm:flex"
                >
                  <Link to={`/cars/${booking.car.id}`} className="block shrink-0 sm:w-56">
                    <CarPhoto url={booking.car.images?.[0]?.url} alt={name} className="aspect-[16/9] w-full sm:h-full sm:aspect-auto" />
                  </Link>

                  <div className="flex flex-1 flex-col gap-4 p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link to={`/cars/${booking.car.id}`} className="text-lg font-extrabold hover:underline">
                          {name}
                        </Link>
                        <p className="text-xs text-muted">
                          {t('bookings.number', { id: formatNumber(booking.id, language) })}
                        </p>
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

                    <dl className="grid gap-3 text-sm sm:grid-cols-3">
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
                            <span className="ms-2 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              {t('booking.discount', { percent: formatNumber(booking.discountPercent, language) })}
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>

                    {booking.status === 'PENDING' && (
                      <p className="flex items-center gap-2 text-xs text-muted">
                        <Clock className="size-4 shrink-0" aria-hidden />
                        {t('bookings.pendingNote')}
                      </p>
                    )}

                    {booking.status === 'CONFIRMED' && canCancel && (
                      <p
                        className={`flex items-center gap-2 text-xs font-semibold ${
                          isLate(booking, now) ? 'text-amber-800 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-400'
                        }`}
                      >
                        {isLate(booking, now) ? (
                          <CircleAlert className="size-4 shrink-0" aria-hidden />
                        ) : (
                          <ShieldCheck className="size-4 shrink-0" aria-hidden />
                        )}
                        {isLate(booking, now)
                          ? t('bookings.lateUntil', { date: dateTime(booking.cancellation!.until) })
                          : t('bookings.freeUntil', { date: dateTime(booking.cancellation!.freeUntil) })}
                      </p>
                    )}
                    {tooLate && (
                      <p className="flex items-center gap-2 text-xs text-muted">
                        <Clock className="size-4 shrink-0" aria-hidden />
                        {t('bookings.tooLateNote')}
                      </p>
                    )}
                    {booking.status === 'PICKED_UP' && (
                      <p className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300">
                        <CarFront className="size-4 shrink-0" aria-hidden />
                        {t('bookings.pickedUpNote', { date: dateTime(booking.endDate) })}
                      </p>
                    )}
                    {booking.status === 'NO_SHOW' && (
                      <p className="flex items-center gap-2 text-xs font-semibold text-orange-800 dark:text-orange-300">
                        <CircleAlert className="size-4 shrink-0" aria-hidden />
                        {t('bookings.noShowNote')}
                      </p>
                    )}

                    {(canCancel || canReview || booking.reviewed) && (
                      <div className="mt-auto flex flex-wrap gap-2 border-t border-border pt-4">
                        {canReview && (
                          <Button className="h-10" onClick={() => setReviewing(booking)}>
                            <Star className="size-4" aria-hidden />
                            {t('bookings.review')}
                          </Button>
                        )}
                        {booking.reviewed && (
                          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                            <CircleCheck className="size-4" aria-hidden />
                            {t('bookings.reviewed')}
                          </span>
                        )}
                        {canCancel && (
                          <Button
                            variant="secondary"
                            className="h-10 text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                            disabled={cancelling === booking.id}
                            onClick={() => cancel(booking)}
                          >
                            <XCircle className="size-4" aria-hidden />
                            {cancelling === booking.id ? t('auth.loading') : t('bookings.cancel')}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <ReviewDialog
        reservationId={reviewing?.id ?? null}
        carName={reviewing ? carName(reviewing.car, language) : ''}
        onClose={() => setReviewing(null)}
        onReviewed={() => {
          setReviewing(null)
          toast.success(t('reviews.thanks'))
          bookings.reload()
        }}
      />
    </Container>
  )
}
