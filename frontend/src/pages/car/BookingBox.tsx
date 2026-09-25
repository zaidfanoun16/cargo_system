import { CalendarCheck, CircleAlert, Clock } from 'lucide-react'
import { type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { type Car, type Quote, carName } from '../../lib/cars'
import { addDays, atHour, formatDate, formatHour, isValidDateInput, toDateInput } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'

const MIN_HOURS = 2
const DEFAULT_HOUR = 10
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

const fieldClass =
  'h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type Props = {
  car: Car
  // Dates chosen on the cars page, used as the starting period
  initialStart: string | null
  initialEnd: string | null
}

// Pick the period, see the exact price (the same the booking will cost),
// then book. Prices come from the server, never calculated here.
export function BookingBox({ car, initialStart, initialEnd }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { user } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const location = useLocation()

  const tomorrow = toDateInput(addDays(new Date(), 1))
  const today = toDateInput(new Date())
  const startFromSearch = isValidDateInput(initialStart) && initialStart >= today ? initialStart : tomorrow
  const endFromSearch =
    isValidDateInput(initialEnd) && initialEnd > startFromSearch
      ? initialEnd
      : toDateInput(addDays(atHour(startFromSearch, 0), 3))

  const [pickupDate, setPickupDate] = useState(startFromSearch)
  const [pickupHour, setPickupHour] = useState(DEFAULT_HOUR)
  const [returnDate, setReturnDate] = useState(endFromSearch)
  const [returnHour, setReturnHour] = useState(DEFAULT_HOUR)

  // Read once: the server checks the time again when booking
  const [openedAt] = useState(() => Date.now())

  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState<string>()
  const [booked, setBooked] = useState<{ totalPrice: number }>()

  const start = isValidDateInput(pickupDate) ? atHour(pickupDate, pickupHour) : null
  const end = isValidDateInput(returnDate) ? atHour(returnDate, returnHour) : null

  // Same rules as the server, checked first so mistakes show at once
  let periodError: string | undefined
  if (!start || !end) periodError = 'errors.required'
  else if (start.getTime() <= openedAt) periodError = 'errors.pastDates'
  else if (end <= start) periodError = 'errors.endBeforeStart'
  else if (end.getTime() - start.getTime() < MIN_HOURS * 60 * 60 * 1000) periodError = 'errors.minHours'

  const quotePath =
    start && end && !periodError
      ? `/reservations/quote?${new URLSearchParams({
          carId: String(car.id),
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        })}`
      : null
  const quote = useFetch<Quote>(quotePath)
  const current = quotePath && !quote.loading ? quote.data : undefined

  async function book() {
    if (!start || !end || !current) return

    // Show exactly what is being booked before sending it
    const when = (date: Date) => formatDate(date, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    const confirmed = await confirm({
      title: t('booking.confirmTitle'),
      message: (
        <dl className="mt-1 space-y-1.5 rounded-2xl bg-surface-muted/70 p-4 text-text">
          <SummaryRow label={t('booking.car')} value={carName(car, language)} />
          <SummaryRow label={t('booking.pickup')} value={when(start)} />
          <SummaryRow label={t('booking.return')} value={when(end)} />
          <SummaryRow label={t('booking.total')} value={formatPrice(current.totalPrice, language)} strong />
        </dl>
      ),
      confirmLabel: t('booking.confirmButton'),
    })
    if (!confirmed) return

    setBooking(true)
    setBookError(undefined)
    try {
      const reservation = await api<{ totalPrice: number }>('/reservations', {
        method: 'POST',
        auth: true,
        body: { carId: car.id, startDate: start.toISOString(), endDate: end.toISOString() },
      })
      setBooked(reservation)
      toast.success(t('booking.successTitle'))
    } catch (caught) {
      setBookError(errorKey(caught))
      quote.reload()
    } finally {
      setBooking(false)
    }
  }

  if (booked) {
    return (
      <div className="rounded-3xl border border-border bg-surface p-5 text-center sm:p-6">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          <CalendarCheck className="size-7" aria-hidden />
        </span>
        <h2 className="mt-4 text-xl font-extrabold">{t('booking.successTitle')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">{t('booking.successText')}</p>
        <p className="mt-4 text-2xl font-extrabold">{formatPrice(booked.totalPrice, language)}</p>
        <Link
          to="/my-bookings"
          className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
        >
          {t('booking.viewBookings')}
        </Link>
      </div>
    )
  }

  const hourOptions = HOURS.map((hour) => (
    <option key={hour} value={hour}>
      {formatHour(hour, language)}
    </option>
  ))

  const days = current ? Math.floor(current.hours / 24) : 0
  const hours = current ? current.hours % 24 : 0
  const discount = current ? Math.round((current.basePrice - current.totalPrice) * 100) / 100 : 0

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold">{formatPrice(car.pricePerDay, language)}</span>
        <span className="text-sm text-muted">/ {t('currency.perDay')}</span>
      </p>
      {car.pricePerHour !== null && (
        <p className="mt-1 text-sm text-muted">
          {t('booking.orHourly', { price: formatPrice(car.pricePerHour, language) })}
        </p>
      )}

      <fieldset className="mt-5 space-y-4">
        <legend className="sr-only">{t('booking.period')}</legend>
        <PeriodRow label={t('booking.pickup')}>
          <input
            type="date"
            value={pickupDate}
            min={today}
            onChange={(event) => {
              const value = event.target.value
              setPickupDate(value)
              // Keep the return after the pickup
              if (value && returnDate < value) setReturnDate(value)
            }}
            className={fieldClass}
            aria-label={t('booking.pickupDate')}
          />
          <select
            value={pickupHour}
            onChange={(event) => setPickupHour(Number(event.target.value))}
            className={fieldClass}
            aria-label={t('booking.pickupTime')}
          >
            {hourOptions}
          </select>
        </PeriodRow>
        <PeriodRow label={t('booking.return')}>
          <input
            type="date"
            value={returnDate}
            min={pickupDate || today}
            onChange={(event) => setReturnDate(event.target.value)}
            className={fieldClass}
            aria-label={t('booking.returnDate')}
          />
          <select
            value={returnHour}
            onChange={(event) => setReturnHour(Number(event.target.value))}
            className={fieldClass}
            aria-label={t('booking.returnTime')}
          >
            {hourOptions}
          </select>
        </PeriodRow>
      </fieldset>

      <div className="mt-5 min-h-24 border-t border-border pt-4" aria-live="polite">
        {periodError ? (
          <p className="flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t(periodError, { count: MIN_HOURS })}
          </p>
        ) : quote.error && !quote.loading ? (
          <p className="flex items-start gap-2 text-sm font-semibold text-red-600 dark:text-red-400">
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            {t(errorKey(quote.error), { count: MIN_HOURS })}
          </p>
        ) : !current ? (
          <div className="space-y-2" role="status" aria-label={t('auth.loading')}>
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-surface-muted" />
            <div className="h-6 w-1/3 animate-pulse rounded bg-surface-muted" />
          </div>
        ) : (
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-2 text-muted">
              <dt className="inline-flex items-center gap-1.5">
                <Clock className="size-4" aria-hidden />
                {t('booking.duration')}
              </dt>
              <dd>
                {[
                  days > 0 && t('booking.days', { count: days, formatted: formatNumber(days, language) }),
                  hours > 0 && t('booking.hours', { count: hours, formatted: formatNumber(hours, language) }),
                ]
                  .filter(Boolean)
                  .join(t('booking.and'))}
              </dd>
            </div>
            <div className="flex justify-between gap-2 text-muted">
              <dt>{t('booking.basePrice')}</dt>
              <dd>{formatPrice(current.basePrice, language)}</dd>
            </div>
            {current.discountPercent > 0 && (
              <div className="flex justify-between gap-2 font-semibold text-emerald-700 dark:text-emerald-400">
                <dt>{t('booking.discount', { percent: formatNumber(current.discountPercent, language) })}</dt>
                <dd>−{formatPrice(discount, language)}</dd>
              </div>
            )}
            <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-extrabold">
              <dt>{t('booking.total')}</dt>
              <dd>{formatPrice(current.totalPrice, language)}</dd>
            </div>
          </dl>
        )}
      </div>

      {current && !current.available && !periodError && (
        <div className="mt-4">
          <FormAlert type="error">{t(`booking.unavailable.${current.unavailableReason}`)}</FormAlert>
        </div>
      )}
      {bookError && (
        <div className="mt-4">
          <FormAlert type="error">{t(bookError, { count: MIN_HOURS })}</FormAlert>
        </div>
      )}

      {user ? (
        <Button
          className="mt-5 h-12 w-full text-base"
          disabled={!current?.available || Boolean(periodError) || booking || quote.loading}
          onClick={book}
        >
          {booking ? t('auth.loading') : t('booking.book')}
        </Button>
      ) : (
        <Link
          to="/login"
          state={{ from: location.pathname + location.search }}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-primary px-4 text-base font-semibold text-primary-fg hover:bg-primary-hover"
        >
          {t('booking.loginToBook')}
        </Link>
      )}
      <p className="mt-3 text-center text-xs text-muted">{t('booking.note')}</p>
    </div>
  )
}

function PeriodRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-[1fr_auto] gap-2 [&>select]:w-32">{children}</div>
    </div>
  )
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? 'border-t border-border pt-1.5 text-base font-extrabold' : ''}`}>
      <dt className={strong ? '' : 'text-muted'}>{label}</dt>
      <dd className="text-end font-semibold">{value}</dd>
    </div>
  )
}
