import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useFetch } from '../../hooks/useFetch'
import type { Availability } from '../../lib/cars'
import { toDateInput } from '../../lib/dates'

// One month at a time, with the days that already have a booking marked
export function AvailabilityCalendar({ carId }: { carId: number }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const locale = language === 'ar' ? 'ar-EG' : 'en-US'

  const now = new Date()
  const [month, setMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const monthKey = toDateInput(month).slice(0, 7)
  const isCurrentMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()

  const availability = useFetch<Availability>(`/cars/${carId}/availability?month=${monthKey}`)
  const booked = new Set(availability.data?.month === monthKey ? availability.data.bookedDates : [])

  // Weeks start on Saturday in Arabic and Sunday in English
  const firstWeekday = language === 'ar' ? 6 : 0
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const leadingBlanks = (month.getDay() - firstWeekday + 7) % 7
  const weekdays = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(locale, { weekday: 'narrow' }).format(new Date(2024, 0, 7 + ((firstWeekday + index) % 7))),
  )
  const today = toDateInput(now)

  const moveMonth = (step: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + step, 1))

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="calendar-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="calendar-title" className="text-lg font-extrabold">
          {t('car.availability')}
        </h2>
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

      <div className={`mt-4 grid grid-cols-7 gap-1 text-center transition-opacity ${availability.loading ? 'opacity-50' : ''}`}>
        {weekdays.map((weekday, index) => (
          <span key={index} className="pb-1 text-xs font-bold text-muted" aria-hidden>
            {weekday}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const date = new Date(month.getFullYear(), month.getMonth(), index + 1)
          const key = toDateInput(date)
          const isBooked = booked.has(key)
          const isPast = key < today
          const label = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' }).format(date)

          return (
            <span
              key={key}
              className={`grid h-10 place-items-center rounded-xl text-sm font-semibold sm:h-11 ${
                isBooked
                  ? 'bg-red-100 text-red-700 line-through dark:bg-red-950/60 dark:text-red-300'
                  : isPast
                    ? 'text-muted/50'
                    : 'bg-surface-muted/60'
              } ${key === today ? 'ring-2 ring-primary' : ''}`}
              aria-label={`${label}: ${isBooked ? t('car.dayBooked') : isPast ? t('car.dayPast') : t('car.dayFree')}`}
            >
              {date.toLocaleDateString(locale, { day: 'numeric' })}
            </span>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-surface-muted" aria-hidden />
          {t('car.dayFree')}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded bg-red-200 dark:bg-red-900" aria-hidden />
          {t('car.dayBookedLegend')}
        </span>
      </div>
    </section>
  )
}
