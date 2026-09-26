import { History, KeyRound, Printer, Search, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { ScrollRow } from '../../components/ui/ScrollRow'
import { type Car, carName } from '../../lib/cars'
import { formatDate, formatTime } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

export type HandoverEvent = {
  reservationId: number
  type: 'pickup' | 'return'
  at: string
  staff: string | null
  // Hours after the booked pickup or return time
  lateHours: number
  user: { id: number; fullName: string; phoneNumber: string | null }
  car: Pick<Car, 'id' | 'brand' | 'brandAr' | 'model' | 'modelAr'> & { licensePlate: string }
}

type Filter = 'all' | 'pickup' | 'return'

const PAGE = 20

type Props = {
  events: HandoverEvent[] | undefined
  error: unknown
  loading: boolean
}

// Every handover and return, newest first and grouped by day, so the
// staff can look back at them and print a receipt again at any time
export function HandoverLog({ events, error, loading }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [shown, setShown] = useState(PAGE)

  const query = search.trim().toLowerCase().replace(/^#/, '')
  const list = (events ?? []).filter((event) => {
    if (filter !== 'all' && event.type !== filter) return false
    if (!query) return true
    return [
      String(event.reservationId),
      event.user.fullName,
      event.user.phoneNumber ?? '',
      event.staff ?? '',
      carName(event.car, 'en'),
      carName(event.car, 'ar'),
      event.car.licensePlate,
    ].some((value) => value.toLowerCase().includes(query))
  })

  // Group by day, keeping the newest-first order
  const days: { day: string; events: HandoverEvent[] }[] = []
  for (const event of list.slice(0, shown)) {
    const day = formatDate(event.at, language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (days.at(-1)?.day === day) days.at(-1)!.events.push(event)
    else days.push({ day, events: [event] })
  }

  const filters: Filter[] = ['all', 'pickup', 'return']

  return (
    <section className="mt-10" aria-labelledby="handover-log-title">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 id="handover-log-title" className="flex items-center gap-2 text-xl font-extrabold">
          <History className="size-5" aria-hidden />
          {t('handover.log.title')}
        </h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ScrollRow innerClassName="gap-2" role="tablist" aria-label={t('handover.log.title')}>
            {filters.map((name) => (
              <button
                key={name}
                type="button"
                role="tab"
                aria-selected={filter === name}
                onClick={() => {
                  setFilter(name)
                  setShown(PAGE)
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  filter === name ? 'border-primary bg-primary text-primary-fg' : 'border-border bg-surface text-muted hover:text-text'
                }`}
              >
                {t(`handover.log.filters.${name}`)}
              </button>
            ))}
          </ScrollRow>
          <label className="relative block sm:w-64">
            <span className="sr-only">{t('handover.log.search')}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value)
                setShown(PAGE)
              }}
              placeholder={t('handover.log.search')}
              className="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </div>
      </div>

      {error && !events ? (
        <FormAlert type="error">{t(errorKey(error))}</FormAlert>
      ) : !events ? (
        <div className="h-48 animate-pulse rounded-3xl bg-surface-muted" aria-hidden />
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-12 text-center">
          <History className="size-8 text-muted" aria-hidden />
          <p className="mt-3 text-sm text-muted">{t('handover.log.empty')}</p>
        </div>
      ) : (
        <div className={`space-y-5 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          {days.map(({ day, events: dayEvents }) => (
            <div key={day}>
              <h3 className="mb-2 text-xs font-bold text-muted">{day}</h3>
              <ul className="divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface">
                {dayEvents.map((event) => {
                  const isReturn = event.type === 'return'
                  const Icon = isReturn ? Undo2 : KeyRound
                  return (
                    <li key={`${event.reservationId}-${event.type}`} className="flex flex-wrap items-center gap-3 p-4">
                      <span
                        className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
                          isReturn
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        }`}
                        aria-hidden
                      >
                        <Icon className="size-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 font-bold">
                          {t(`handover.log.${event.type}`)}
                          <span className="text-muted">·</span>
                          <span>
                            {carName(event.car, language)}{' '}
                            <span className="whitespace-nowrap text-xs font-semibold text-muted" dir="ltr">
                              {event.car.licensePlate}
                            </span>
                          </span>
                          {event.lateHours > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                              {t('handover.log.late', {
                                duration: t('booking.hours', {
                                  count: event.lateHours,
                                  formatted: formatNumber(event.lateHours, language),
                                }),
                              })}
                            </span>
                          )}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">
                          {formatTime(event.at, language)} ·{' '}
                          {t('bookings.number', { id: formatNumber(event.reservationId, language) })} · {event.user.fullName}
                          {event.staff && <> · {t('handover.log.by', { name: event.staff })}</>}
                        </p>
                      </div>
                      <Link
                        to={`/receipt/${event.reservationId}?type=${event.type}`}
                        target="_blank"
                        className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold hover:bg-surface-muted"
                        aria-label={t('handover.log.printFor', { id: formatNumber(event.reservationId, language) })}
                      >
                        <Printer className="size-4" aria-hidden />
                        <span className="max-sm:hidden">{t('handover.log.print')}</span>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}

          {list.length > shown && (
            <Button variant="secondary" className="h-11 w-full" onClick={() => setShown((count) => count + PAGE)}>
              {t('handover.log.more', { formatted: formatNumber(list.length - shown, language) })}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}
