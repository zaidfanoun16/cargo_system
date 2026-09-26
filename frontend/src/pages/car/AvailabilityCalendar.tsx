import { CalendarPlus, ChevronLeft, ChevronRight, Wrench } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/Button'
import { useFetch } from '../../hooks/useFetch'
import type { Availability } from '../../lib/cars'
import { formatTime, toDateInput } from '../../lib/dates'

const HOUR = 60 * 60 * 1000

// Same as the server: a booking starts at least this many hours from now
const MIN_LEAD_HOURS = 2

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
  free: 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:hover:bg-emerald-950/70',
  partial: 'bg-amber-50 text-amber-900 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-950/70',
  full: 'bg-red-50 text-red-800/70 line-through hover:bg-red-100 dark:bg-red-950/40 dark:text-red-300/70',
  past: 'text-muted/40',
}

const badgeStyles: Record<DayState, string> = {
  free: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  partial: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  full: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  past: 'bg-surface-muted text-muted',
}

const dotStyles: Record<DayState, string> = {
  free: 'bg-emerald-500',
  partial: 'bg-amber-500',
  full: 'bg-red-500',
  past: 'bg-transparent',
}

type Props = {
  carId: number
  // Start a booking at this time, returning at the latest by `end`
  onPick?: (start: Date, end: Date) => void
}

// A month of days coloured by how free the car is (all day, part of the
// day, or not at all). Choosing a day shows its hours on a 24-hour bar and
// the free times in words, with a button to book from the first free hour.
export function AvailabilityCalendar({ carId, onPick }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const locale = language === 'ar' ? 'ar-EG' : 'en-US'

  const [now] = useState(() => Date.now())
  const today = new Date(now)
  const [month, setMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selected, setSelected] = useState(() => toDateInput(today))
  const monthKey = toDateInput(month).slice(0, 7)
  const isCurrentMonth = month.getFullYear() === today.getFullYear() && month.getMonth() === today.getMonth()

  const availability = useFetch<Availability>(`/cars/${carId}/availability?month=${monthKey}`)
  const data = availability.data?.month === monthKey ? availability.data : undefined
  const periods: Range[] = (data?.bookedPeriods ?? []).map((period) => ({
    start: new Date(period.startDate).getTime(),
    end: new Date(period.endDate).getTime(),
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
    const next = new Date(month.getFullYear(), month.getMonth() + step, 1)
    setMonth(next)
    // Select today in this month, or its first day
    const inNext = today.getFullYear() === next.getFullYear() && today.getMonth() === next.getMonth()
    setSelected(toDateInput(inNext ? today : next))
  }

  // Midnight reads "midnight", not "12:00 AM"
  const time = (value: number) => {
    const date = new Date(value)
    return date.getHours() === 0 && date.getMinutes() === 0 ? t('calendar.midnight') : formatTime(date, language)
  }

  // Book from the first free hour of the day: a day long, or until the
  // next booking if that comes sooner
  function pickDay(day: Day) {
    const start = day.free[0].start
    const nextBooking = Math.min(...periods.filter((period) => period.start >= start).map((period) => period.start))
    onPick?.(new Date(start), new Date(Math.min(start + 24 * HOUR, nextBooking)))
  }
  const dayName = (date: Date) => new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(date)

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="calendar-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="calendar-title" className="text-lg font-extrabold">
            {t('car.availability')}
          </h2>
          <p className="text-xs text-muted">{t('calendar.hint')}</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => moveMonth(-1)}
            disabled={isCurrentMonth}
            className="grid size-9 place-items-center rounded-xl hover:bg-surface-muted disabled:opacity-30"
            aria-label={t('car.previousMonth')}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
          </button>
          <p className="min-w-32 text-center text-sm font-bold" aria-live="polite">
            {new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(month)}
          </p>
          <button
            type="button"
            onClick={() => moveMonth(1)}
            className="grid size-9 place-items-center rounded-xl hover:bg-surface-muted"
            aria-label={t('car.nextMonth')}
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
          </button>
        </div>
      </div>

      {unavailable && (
        <p className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Wrench className="size-4 shrink-0" aria-hidden />
          {t(`booking.unavailable.${unavailable === 'MAINTENANCE' ? 'maintenance' : 'inactive'}`)}
        </p>
      )}

      {/* The month */}
      <div
        className={`mt-4 grid grid-cols-7 gap-1 text-center transition-opacity sm:gap-1.5 ${availability.loading || !data ? 'opacity-50' : ''}`}
        role="grid"
        aria-label={t('car.availability')}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <span key={index} className="pb-1 text-[11px] font-bold text-muted sm:text-xs" aria-hidden>
            {language === 'ar' ? weekdayNames.ar[index] : weekdayNames.en[index]}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {days.map(({ key, date, day }) => {
          const state: DayState = unavailable && day.state !== 'past' ? 'full' : day.state
          return (
            <button
              key={key}
              type="button"
              disabled={state === 'past'}
              onClick={() => setSelected(key)}
              aria-pressed={selected === key}
              aria-label={`${dayName(date)}: ${t(`calendar.states.${state}`)}`}
              className={`flex h-11 flex-col items-center justify-center rounded-xl text-sm font-bold transition-colors disabled:cursor-default sm:h-12 ${cellStyles[state]} ${
                selected === key ? 'ring-2 ring-primary ring-offset-1 ring-offset-surface' : ''
              } ${key === toDateInput(today) ? 'border-2 border-primary/50' : ''}`}
            >
              {date.toLocaleDateString(locale, { day: 'numeric' })}
              <span className={`mt-0.5 size-1.5 rounded-full ${dotStyles[state]}`} aria-hidden />
            </button>
          )
        })}
      </div>

      {/* What the colors mean */}
      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {(['free', 'partial', 'full'] as const).map((state) => (
          <li key={state} className="inline-flex items-center gap-1.5">
            <span className={`size-2.5 rounded-full ${dotStyles[state]}`} aria-hidden />
            {t(`calendar.legend.${state}`)}
          </li>
        ))}
      </ul>

      {/* The chosen day, hour by hour */}
      {chosen && chosen.day.state !== 'past' && data && (
        <div className="mt-5 rounded-2xl border border-border p-4" aria-live="polite">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-extrabold">{dayName(chosen.date)}</p>
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${badgeStyles[unavailable ? 'full' : chosen.day.state]}`}>
              <span className={`size-2 rounded-full ${dotStyles[unavailable ? 'full' : chosen.day.state]}`} aria-hidden />
              {t(`calendar.states.${unavailable ? 'full' : chosen.day.state}`)}
            </span>
          </div>

          <DayBar day={chosen.day} language={language} />

          {!unavailable && (
            <div className="mt-4 space-y-2 text-sm">
              {chosen.day.free.length > 0 && (
                <p>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">{t('calendar.freeTimes')}: </span>
                  {chosen.day.free
                    .map((range) => t('calendar.fromTo', { from: time(range.start), to: time(range.end) }))
                    .join(t('calendar.and'))}
                </p>
              )}
              {chosen.day.booked.length > 0 && (
                <p>
                  <span className="font-bold text-red-700 dark:text-red-400">{t('calendar.bookedTimes')}: </span>
                  {chosen.day.booked
                    .map((range) =>
                      range.start <= chosen.day.start && range.end >= chosen.day.end
                        ? t('calendar.allDay')
                        : t('calendar.fromTo', { from: time(range.start), to: time(range.end) }),
                    )
                    .join(t('calendar.and'))}
                </p>
              )}
              {chosen.day.free.length === 0 && <p className="text-muted">{t('calendar.noFree')}</p>}
            </div>
          )}

          {onPick && !unavailable && chosen.day.free.length > 0 && (
            <Button
              className="mt-4 h-11 w-full sm:w-auto"
              onClick={() => pickDay(chosen.day)}
            >
              <CalendarPlus className="size-4" aria-hidden />
              {t('calendar.bookFrom', { time: time(chosen.day.free[0].start) })}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

// 24 hours from midnight to midnight: booked in red, free in green, and
// the part that can no longer be booked in grey
function DayBar({ day, language }: { day: Day; language: string }) {
  const { t } = useTranslation()
  const length = day.end - day.start
  const at = (value: number) => ((value - day.start) / length) * 100

  const segment = (range: Range, className: string, key: string) => (
    <span
      key={key}
      className={`absolute inset-y-0 ${className}`}
      style={{ insetInlineStart: `${at(range.start)}%`, width: `${at(range.end) - at(range.start)}%` }}
    />
  )

  return (
    <div className="mt-4" aria-hidden>
      <div className="relative h-4 overflow-hidden rounded-full bg-surface-muted">
        {day.free.map((range, index) => segment(range, 'bg-emerald-500', `free-${index}`))}
        {day.booked.map((range, index) => segment(range, 'bg-red-500', `booked-${index}`))}
        {day.bookableFrom > day.start &&
          segment({ start: day.start, end: day.bookableFrom }, 'bg-[repeating-linear-gradient(45deg,transparent_0_4px,rgb(0_0_0/0.08)_4px_8px)]', 'past')}
      </div>
      <div className="relative mt-1 h-4 text-[10px] font-semibold text-muted">
        {[0, 6, 12, 18, 24].map((hour) => (
          <span
            key={hour}
            className={`absolute top-0 whitespace-nowrap ${hour === 0 ? '' : hour === 24 ? '-translate-x-full rtl:translate-x-full' : '-translate-x-1/2 rtl:translate-x-1/2'}`}
            style={{ insetInlineStart: `${(hour / 24) * 100}%` }}
          >
            {new Intl.DateTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric' }).format(new Date(2000, 0, 1, hour % 24))}
          </span>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-emerald-500" />
          {t('calendar.legend.freeHours')}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 rounded-sm bg-red-500" />
          {t('calendar.legend.bookedHours')}
        </span>
        {day.bookableFrom > day.start && (
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-3 rounded-sm bg-surface-muted ring-1 ring-border" />
            {t('calendar.legend.tooSoon')}
          </span>
        )}
      </div>
    </div>
  )
}
