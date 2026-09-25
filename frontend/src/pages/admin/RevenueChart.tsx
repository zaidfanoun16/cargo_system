import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { Stats } from '../../lib/admin'
import { formatNumber, formatPrice } from '../../lib/format'

type Month = Stats['revenueByMonth'][number]

// A round top for the axis: 0 / half / top, e.g. 0, 2,500, 5,000
function niceMax(value: number) {
  if (value <= 0) return 1000
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const step = [1, 2, 2.5, 5, 10].find((factor) => factor * magnitude >= value) ?? 10
  return step * magnitude
}

// Revenue per month for the last 12 months: one series, so no legend;
// hovering (or focusing) a column shows its exact numbers
export function RevenueChart({ months }: { months: Month[] }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const locale = language === 'ar' ? 'ar-EG' : 'en-US'
  const [active, setActive] = useState<number | null>(null)

  const max = niceMax(Math.max(...months.map((month) => month.revenue)))
  const ticks = [max, max / 2, 0]
  const monthName = (month: string, style: 'short' | 'long') =>
    new Intl.DateTimeFormat(locale, { month: style, ...(style === 'long' && { year: 'numeric' }) }).format(
      new Date(`${month}-01T12:00:00`),
    )

  return (
    <div>
      {/* Two columns: the Y axis, then the plot with the month names under it */}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3">
        {/* Y axis */}
        <div className="flex h-52 flex-col justify-between py-0 text-end text-xs text-muted" aria-hidden>
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
              {formatPrice(tick, language)}
            </span>
          ))}
        </div>

        <div className="relative h-52 flex-1">
          {/* Gridlines: hairline and recessive */}
          {ticks.map((tick, index) => (
            <div
              key={tick}
              className="absolute inset-x-0 border-t border-border"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
              aria-hidden
            />
          ))}

          <div className="absolute inset-0 flex items-end" role="list">
            {months.map((month, index) => {
              const height = (month.revenue / max) * 100
              const label = `${monthName(month.month, 'long')}: ${formatPrice(month.revenue, language)}, ${t(
                'admin.stats.bookingsCount',
                { count: month.reservations, formatted: formatNumber(month.reservations, language) },
              )}`

              return (
                <div
                  key={month.month}
                  role="listitem"
                  tabIndex={0}
                  aria-label={label}
                  onMouseEnter={() => setActive(index)}
                  onMouseLeave={() => setActive(null)}
                  onFocus={() => setActive(index)}
                  onBlur={() => setActive(null)}
                  // The whole column is the hover target, not just the bar
                  className="relative flex h-full flex-1 items-end justify-center px-[1px] outline-none focus-visible:bg-surface-muted/60"
                >
                  <div
                    className={`w-full max-w-6 rounded-t-[4px] bg-primary transition-opacity ${
                      active !== null && active !== index ? 'opacity-40' : ''
                    }`}
                    style={{ height: `${height}%`, minHeight: month.revenue > 0 ? 2 : 0 }}
                  />
                  {active === index && (
                    <div
                      className="pointer-events-none absolute z-10 w-max max-w-48 -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg ltr:left-1/2 rtl:right-1/2 rtl:translate-x-1/2"
                      style={{ bottom: `calc(${height}% + 8px)` }}
                    >
                      <p className="font-bold">{monthName(month.month, 'long')}</p>
                      <p className="mt-0.5 text-sm font-extrabold">{formatPrice(month.revenue, language)}</p>
                      <p className="text-muted">
                        {t('admin.stats.bookingsCount', {
                          count: month.reservations,
                          formatted: formatNumber(month.reservations, language),
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* X axis: every month on wide screens; on phones every third month,
            written in full over the space of the hidden ones (never cut off) */}
        <div className="col-start-2 mt-2 flex" aria-hidden>
          {months.map((month, index) => (
            <span
              key={month.month}
              className={`min-w-0 flex-1 text-center text-[11px] whitespace-nowrap text-muted ${index % 3 === 2 ? '' : 'max-sm:invisible'}`}
            >
              {monthName(month.month, 'short')}
            </span>
          ))}
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer font-semibold text-muted hover:text-text">{t('admin.stats.showTable')}</summary>
        <table className="mt-3 w-full text-start">
          <thead className="text-xs text-muted">
            <tr>
              <th className="py-1.5 text-start font-semibold">{t('admin.stats.month')}</th>
              <th className="py-1.5 text-start font-semibold">{t('admin.stats.revenue')}</th>
              <th className="py-1.5 text-start font-semibold">{t('admin.nav.bookings')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {months.map((month) => (
              <tr key={month.month}>
                <td className="py-1.5">{monthName(month.month, 'long')}</td>
                <td className="py-1.5 font-semibold tabular-nums">{formatPrice(month.revenue, language)}</td>
                <td className="py-1.5 tabular-nums">{formatNumber(month.reservations, language)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}
