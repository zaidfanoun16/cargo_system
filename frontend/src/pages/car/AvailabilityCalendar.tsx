import { ChevronLeft, ChevronRight, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFetch } from '../../hooks/useFetch'
import type { Availability } from '../../lib/cars'
import { formatTime, toDateInput } from '../../lib/dates'

const HOUR = 60 * 60 * 1000

// Same as the server: a booking starts at least this many hours from now
const MIN_LEAD_HOURS = 2

// Same as the booking box's starting pickup time
const DEFAULT_PICKUP_HOUR = 10

type Range = { start: number; end: number }

type DayState = 'free' | 'partial' | 'full' | 'past'

type Day = {
  state: DayState
  start: number
  end: number
  // Before this the day cannot be booked any more (past, or too soon)
  bookableFrom: number
  booked: Range[]
  free: Range[]
}

const weekdayNames = {
  ar: ['سبت', 'أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
}

// Booked and free hours of one local day. Free time starts on a whole
// hour, at least MIN_LEAD_HOURS from now, like a real booking.
function describeDay(date: Date, periods: Range[], now: number): Day {
  const start = date.getTime()
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime()
  const earliest = Math.ceil((now + MIN_LEAD_HOURS * HOUR) / HOUR) * HOUR
  const bookableFrom = Math.min(Math.max(start, earliest), end)

  // The day's bookings, clipped to the day and merged
  const booked: Range[] = []
  for (const period of periods
    .filter((period) => period.start < end && period.end > start)
    .map((period) => ({ start: Math.max(period.start, start), end: Math.min(period.end, end) }))
    .sort((a, b) => a.start - b.start)) {
    const last = booked.at(-1)
    if (last && period.start <= last.end) last.end = Math.max(last.end, period.end)
    else booked.push({ ...period })
  }

  // Free = from bookableFrom to the end of the day, minus the bookings,
  // on whole hours
  const free: Range[] = []
  let cursor = bookableFrom
  for (const range of [...booked, { start: end, end }]) {
    const from = Math.ceil(cursor / HOUR) * HOUR
    const to = Math.floor(range.start / HOUR) * HOUR
    if (to - from >= HOUR) free.push({ start: from, end: to })
    cursor = Math.max(cursor, range.end)
  }

  const bookedLater = booked.some((range) => range.end > bookableFrom)
  const state: DayState =
    bookableFrom >= end ? 'past' : free.length === 0 ? 'full' : bookedLater ? 'partial' : 'free'

  return { state, start, end, bookableFrom, booked, free }
}

const cellStyles: Record<DayState, string> = {
  free: 'bg-emerald-100 text-emerald-900 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:hover:bg-emerald-900/60',
  partial: 'bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:hover:bg-amber-900/60',
  full: 'bg-red-100 text-red-800/60 line-through dark:bg-red-950/50 dark:text-red-300/60',
  past: 'text-muted/40',
}

const dotStyles: Record<DayState, string> = {
  free: 'bg-emerald-500',
  partial: 'bg-amber-500',
  full: 'bg-red-500',
  past: 'bg-transparent',
}

type Props = {
  carId: number
  // Use this as the pickup time (the first free hour of a tapped day)
  onPick?: (start: Date) => void
  // The period being booked, outlined on the calendar
  period?: { start: number; end: number } | null
}

// A small month where each day is green (free all day), amber (free for
// part of the day) or red (booked). Tapping a day makes it the pickup day
// and says in words which hours are free; the period being booked is
// outlined.
export function AvailabilityCalendar({ carId, onPick, period }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const locale = language === 'ar' ? 'ar-EG' : 'en-US'

  const [now] = useState(() => Date.now())
  const today = new Date(now)
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState<string>()
  const monthKey = toDateInput(month).slice(0, 7)
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()

  const availability = useFetch<Availability>(`/cars/${carId}/availability?month=${monthKey}`)
  const data = availability.data?.month === monthKey ? availability.data : undefined
  const periods: Range[] = (data?.bookedPeriods ?? []).map((booked) => ({
    start: new Date(booked.startDate).getTime(),
    end: new Date(booked.endDate).getTime(),
  }))
  const unavailable = data && data.carStatus !== 'AVAILABLE' ? data.carStatus : null

  // Weeks start on Saturday in Arabic and Sunday in English
  const firstWeekday = language === 'ar' ? 6 : 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = (month.getDay() - firstWeekday + 7) % 7
  const days = Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(month.getFullYear(), month.getMonth(), index + 1)
    return { key: toDateInput(date), date, day: describeDay(date, periods, now) }
  })
  const chosen = days.find((item) => item.key === selected)

  const moveMonth = (step: number) => {
    setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))
    setSelected(undefined)
  }

  // Midnight reads "midnight", not "12:00 AM"
  const time = (value: number) => {
    const date = new Date(value)
    return date.getHours() === 0 && date.getMinutes() === 0 ? t('calendar.midnight') : formatTime(date, language)
  }

  // Pick up at the hour already chosen (10:00 at first) when it is free
  // that day, otherwise at the day's first free hour
  function pickupTime(day: Day) {
    const hour = period ? new Date(period.start).getHours() : DEFAULT_PICKUP_HOUR
    const date = new Date(day.start)
    const preferred = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour).getTime()
    const fits = day.free.some((range) => preferred >= range.start && preferred + HOUR <= range.end)
    return fits ? preferred : day.free[0].start
  }

  function choose(key: string, day: Day) {
    setSelected(key)
    if (!unavailable && day.free.length > 0) onPick?.(new Date(pickupTime(day)))
  }

  const dayName = (date: Date) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
  const inPeriod = (day: Day) => Boolean(period && period.start < day.end && period.end > day.start)

  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="calendar-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="calendar-title" className="font-extrabold">
          {t('car.availability')}
        </h2>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            disabled={isCurrentMonth}
            className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted disabled:opacity-30"
            aria-label={t('car.previousMonth')}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" aria-hidden />
          </button>
          <p className="min-w-28 text-center text-sm font-bold" aria-live="polite">
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
          </p>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted"
            aria-label={t('car.nextMonth')}
          >
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </button>
        </div>
      </div>
      <p className="mt-0.5 text-xs text-muted">{t('calendar.hint')}</p>

      {unavailable && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-100 p-2.5 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Wrench className="size-4 shrink-0" aria-hidden />
          {t(`booking.unavailable.${unavailable === 'MAINTENANCE' ? 'maintenance' : 'inactive'}`)}
        </p>
      )}

      {/* The month */}
      <div
        className={`mt-3 grid grid-cols-7 gap-1 text-center transition-opacity ${availability.loading || !data ? 'opacity-50' : ''}`}
        role="grid"
        aria-label={t('car.availability')}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className="pb-0.5 text-[10px] font-bold text-muted" aria-hidden>
            {language === 'ar' ? weekdayNames.ar[index] : weekdayNames.en[index]}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {days.map(({ key, date, day }) => {
          const state: DayState = unavailable && day.state !== 'past' ? 'full' : day.state
          const booking = state !== 'past' && inPeriod(day)
          return (
            <button
              key={key}
              type="button"
              disabled={state === 'past' || state === 'full'}
              onClick={() => choose(key, day)}
              aria-pressed={selected === key}
              aria-label={`${dayName(date)}: ${t(`calendar.states.${state}`)}`}
              className={`grid h-9 place-items-center rounded-lg text-xs font-bold transition-colors disabled:cursor-default sm:text-sm ${cellStyles[state]} ${
                booking ? 'ring-2 ring-primary ring-inset' : ''
              } ${selected === key ? 'outline-2 outline-offset-1 outline-primary' : ''} ${
                key === toDateInput(today) ? 'underline decoration-2 underline-offset-4' : ''
              }`}
            >
              {date.toLocaleDateString(locale, { day: 'numeric' })}
            </button>
          )
        })}
      </div>

      {/* What the colors mean */}
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-muted">
        {(['free', 'partial', 'full'] as const).map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${dotStyles[state]}`} aria-hidden />
            {t(`calendar.legend.${state}`)}
          </li>
        ))}
        {period && (
          <li className="inline-flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm ring-2 ring-primary" aria-hidden />
            {t('calendar.legend.yourBooking')}
          </li>
        )}
      </ul>

      {/* The tapped day, in words */}
      {chosen && data && (
        <div className="mt-3 rounded-2xl bg-surface-muted p-3 text-xs leading-relaxed" aria-live="polite">
          <p className="font-extrabold">{dayName(chosen.date)}</p>
          {unavailable ? null : chosen.day.free.length === 0 ? (
            <p className="text-muted">{t('calendar.noFree')}</p>
          ) : (
            <>
              <p>
                <span className="font-bold text-emerald-700 dark:text-emerald-400">{t('calendar.freeTimes')}: </span>
                {chosen.day.free
                  .map((range) => t('calendar.fromTo', { from: time(range.start), to: time(range.end) }))
                  .join(t('calendar.and'))}
              </p>
              {chosen.day.booked.length > 0 && (
                <p>
                  <span className="font-bold text-red-700 dark:text-red-400">{t('calendar.bookedTimes')}: </span>
                  {chosen.day.booked
                    .map((range) => t('calendar.fromTo', { from: time(range.start), to: time(range.end) }))
                    .join(t('calendar.and'))}
                </p>
              )}
              {onPick && <p className="mt-1 font-semibold text-muted">{t('calendar.pickedAsPickup', { time: time(pickupTime(chosen.day)) })}</p>}
            </>
          )}
        </div>
      )}
    </section>
  )
}
