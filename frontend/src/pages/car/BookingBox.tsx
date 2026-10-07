import { CalendarCheck, CalendarDays, CircleAlert, Clock, Minus, Plus, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
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
// Same as the server: a booking starts at least this many hours from now
const MIN_LEAD_HOURS = 2
const DEFAULT_HOUR = 10
const HOURS = Array.from({ length: 24 }, (_, hour) => hour)

// Quick choices for the length of the rental
const DAY_CHOICES = [1, 3, 7, 30]
const HOUR_CHOICES = [2, 4, 6, 8, 12]
const MAX_DAYS = 90
// From a full day on, a rental is booked by the day
const MAX_HOURS = 23
// Same as the server: long rentals cost less (days → percent off)
const DAY_DISCOUNTS: [number, number][] = [
  [30, 20],
  [7, 10],
]

type Mode = 'days' | 'hours'

const fieldClass =
  'h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

type Props = {
  car: Car
  // Dates chosen on the cars page, used as the starting period
  initialStart: string | null
  initialEnd: string | null
  // A pickup time chosen on the availability calendar
  pick?: Date
  // Tells the calendar which period is being booked, to show it there
  onPeriodChange?: (period: { start: number; end: number } | null) => void
}

// Whole days from the pickup day to the return day (at least 1)
function daysBetween(start: string, end: string) {
  return Math.max(1, Math.round((atHour(end, 12).getTime() - atHour(start, 12).getTime()) / (24 * 60 * 60 * 1000)))
}

// Choose "by the day" or "by the hour", then only what that needs: the
// pickup day and time and how many days (or hours). The return time
// follows from them. Prices come from the server, never calculated here.
export function BookingBox({ car, initialStart, initialEnd, pick, onPeriodChange }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { user } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const location = useLocation()

  const hourly = car.pricePerHour !== null
  const tomorrow = toDateInput(addDays(new Date(), 1))
  const today = toDateInput(new Date())
  const startFromSearch = isValidDateInput(initialStart) && initialStart >= today ? initialStart : tomorrow
  const daysFromSearch =
    isValidDateInput(initialEnd) && initialEnd > startFromSearch ? daysBetween(startFromSearch, initialEnd) : 1

  const [mode, setMode] = useState<Mode>('days')
  const [pickupDate, setPickupDate] = useState(startFromSearch)
  const [pickupHour, setPickupHour] = useState(DEFAULT_HOUR)
  const [days, setDays] = useState(Math.min(daysFromSearch, MAX_DAYS))
  const [hours, setHours] = useState(4)

  // A time picked on the calendar becomes the pickup time
  const [seenPick, setSeenPick] = useState(pick)
  if (pick !== seenPick) {
    setSeenPick(pick)
    if (pick) {
      setPickupDate(toDateInput(pick))
      setPickupHour(pick.getHours())
    }
  }

  // Read once: the server checks the time again when booking
  const [openedAt] = useState(() => Date.now())

  const [booking, setBooking] = useState(false)
  const [bookError, setBookError] = useState<string>()
  const [booked, setBooked] = useState<{ totalPrice: number }>()

  const byHour = mode === 'hours' && hourly
  const start = isValidDateInput(pickupDate) ? atHour(pickupDate, pickupHour) : null
  const end = start
    ? byHour
      ? new Date(start.getTime() + hours * 60 * 60 * 1000)
      : new Date(start.getFullYear(), start.getMonth(), start.getDate() + days, pickupHour)
    : null

  // Same rules as the server, checked first so mistakes show at once
  let periodError: string | undefined
  if (!start || !end) periodError = 'errors.required'
  else if (start.getTime() <= openedAt) periodError = 'errors.pastDates'
  else if (start.getTime() - openedAt < MIN_LEAD_HOURS * 60 * 60 * 1000) periodError = 'errors.minLead'

  // Show the chosen period on the calendar
  const startTime = start?.getTime()
  const endTime = end?.getTime()
  useEffect(() => {
    onPeriodChange?.(startTime && endTime ? { start: startTime, end: endTime } : null)
  }, [startTime, endTime, onPeriodChange])

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
    const confirmingAt = new Date().getTime()
    const when = (date: Date) => formatDate(date, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
    const confirmed = await confirm({
      title: t('booking.confirmTitle'),
      message: (
        <>
          <dl className="mt-1 space-y-1.5 rounded-2xl bg-surface-muted/70 p-4 text-text">
            <SummaryRow label={t('booking.car')} value={carName(car, language)} />
            <SummaryRow label={t('booking.pickup')} value={when(start)} />
            <SummaryRow label={t('booking.return')} value={when(end)} />
            <SummaryRow label={t('booking.total')} value={formatPrice(current.totalPrice, language)} strong />
          </dl>
          <PolicySummary quote={current} now={confirmingAt} />
        </>
      ),
      acknowledge: t('booking.acceptPolicy'),
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

  const durationDays = current ? Math.floor(current.hours / 24) : 0
  const durationHours = current ? current.hours % 24 : 0
  const discount = current ? Math.round((current.basePrice - current.totalPrice) * 100) / 100 : 0
  const when = (date: Date) => formatDate(date, language, { weekday: 'long', hour: 'numeric', minute: '2-digit' })

  return (
    <div className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
      {/* The price for the chosen way of renting */}
      <p className="flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold">
          {formatPrice(byHour ? car.pricePerHour! : car.pricePerDay, language)}
        </span>
        <span className="text-sm text-muted">/ {t(byHour ? 'currency.perHour' : 'currency.perDay')}</span>
      </p>

      {/* By the day or by the hour */}
      {hourly ? (
        <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-surface-muted p-1" role="radiogroup" aria-label={t('booking.modeLabel')}>
          {(['days', 'hours'] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={`flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors ${
                mode === value ? 'bg-surface text-text shadow-sm' : 'text-muted hover:text-text'
              }`}
            >
              {value === 'days' ? <CalendarDays className="size-4" aria-hidden /> : <Timer className="size-4" aria-hidden />}
              {t(`booking.mode.${value}`)}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1 text-xs font-semibold text-muted">
          <CalendarDays className="size-3.5" aria-hidden />
          {t('booking.dailyOnly')}
        </p>
      )}

      <fieldset className="mt-5 space-y-4">
        <legend className="sr-only">{t('booking.period')}</legend>

        <div className="grid grid-cols-[1fr_8rem] gap-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t('booking.pickupDay')}</span>
            <input
              type="date"
              value={pickupDate}
              min={today}
              onChange={(event) => setPickupDate(event.target.value)}
              className={fieldClass}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold">{t('booking.pickupTime')}</span>
            <select value={pickupHour} onChange={(event) => setPickupHour(Number(event.target.value))} className={fieldClass}>
              {hourOptions}
            </select>
          </label>
        </div>

        {byHour ? (
          <Duration
            label={t('booking.howManyHours')}
            value={hours}
            min={MIN_HOURS}
            max={MAX_HOURS}
            onChange={setHours}
            choices={HOUR_CHOICES}
            format={(count) => t('booking.hours', { count, formatted: formatNumber(count, language) })}
          />
        ) : (
          <Duration
            label={t('booking.howManyDays')}
            value={days}
            min={1}
            max={MAX_DAYS}
            onChange={setDays}
            choices={DAY_CHOICES}
            format={(count) => t('booking.days', { count, formatted: formatNumber(count, language) })}
            badge={(count) => {
              const percent = DAY_DISCOUNTS.find(([from]) => count >= from)?.[1]
              return percent ? `−${formatNumber(percent, language)}${language === 'ar' ? '٪' : '%'}` : undefined
            }}
          />
        )}

        {!byHour && (
          <p className="text-xs text-muted">
            {t('booking.discountHint', { week: formatNumber(10, language), month: formatNumber(20, language) })}
          </p>
        )}

        {/* The return follows from the pickup and the length */}
        {end && (
          <p className="flex items-center justify-between gap-2 rounded-2xl bg-surface-muted px-4 py-3 text-sm">
            <span className="font-semibold text-muted">{t('booking.returnOn')}</span>
            <span className="text-end font-bold">{when(end)}</span>
          </p>
        )}
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
                  durationDays > 0 && t('booking.days', { count: durationDays, formatted: formatNumber(durationDays, language) }),
                  durationHours > 0 && t('booking.hours', { count: durationHours, formatted: formatNumber(durationHours, language) }),
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

// How many days or hours: − and + buttons, and quick choices
function Duration({
  label,
  value,
  min,
  max,
  onChange,
  choices,
  format,
  badge,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
  choices: number[]
  format: (count: number) => string
  badge?: (count: number) => string | undefined
}) {
  const { t, i18n } = useTranslation()
  const stepClass =
    'grid size-11 shrink-0 place-items-center rounded-xl border border-border bg-bg text-text transition-colors hover:bg-surface-muted disabled:opacity-40'

  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold">{label}</p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={stepClass}
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={t('booking.less')}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <p className="flex h-11 flex-1 items-center justify-center rounded-xl border border-border bg-bg text-base font-extrabold" aria-live="polite">
          {format(value)}
        </p>
        <button
          type="button"
          className={stepClass}
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={t('booking.more')}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {choices.map((choice) => {
          const extra = badge?.(choice)
          return (
            <button
              key={choice}
              type="button"
              onClick={() => onChange(choice)}
              aria-pressed={value === choice}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                value === choice ? 'border-primary bg-primary text-primary-fg' : 'border-border text-muted hover:text-text'
              }`}
            >
              {formatNumber(choice, i18n.language)}
              {extra && (
                <span className={`rounded-full px-1.5 ${value === choice ? 'bg-primary-fg/20' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'}`}>
                  {extra}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// The cancellation and no-show rules, with the numbers from the server
function PolicySummary({ quote, now }: { quote: Quote; now: number }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { policy } = quote
  const hours = (count: number) => t('booking.withinHours', { count, formatted: formatNumber(count, language) })
  const freeUntil = new Date(quote.freeCancellationUntil)

  return (
    <div className="mt-3">
      <p className="font-bold text-text">{t('booking.policyTitle')}</p>
      <ul className="mt-1 list-disc space-y-1 ps-5">
        <li>
          {freeUntil.getTime() > now
            ? t('booking.policyFree', {
                date: formatDate(freeUntil, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
              })
            : t('booking.policyNoFree')}
        </li>
        <li>{t('booking.policyCutoff', { hours: hours(policy.cancellationCutoffHours) })}</li>
        <li>{t('booking.policyNoShow', { hours: hours(policy.noShowGraceHours) })}</li>
        <li>{t('booking.policyStrikes')}</li>
      </ul>
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
