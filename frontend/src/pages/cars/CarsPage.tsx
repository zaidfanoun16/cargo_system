import { CalendarRange, RotateCcw, Search, SearchX, X } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

import { CarCard, CarCardSkeleton } from '../../components/cars/CarCard'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { Container } from '../../components/ui/Container'
import { useFetch } from '../../hooks/useFetch'
import { type CarsPage as CarsResponse, type Category, categoryName } from '../../lib/cars'
import { toDateInput } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

const PAGE_SIZE = 12

const dateLabelClass =
  'flex flex-col gap-1 text-xs font-semibold text-muted sm:flex-row sm:items-center sm:gap-2'

const fieldClass =
  'h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

// Filters live in the address (?q=&category=&startDate=&endDate=), so a
// search can be shared, bookmarked, or reached from the home page
export function CarsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const [params, setParams] = useSearchParams()

  const q = params.get('q') ?? ''
  const categoryId = params.get('category')
  const startDate = params.get('startDate') ?? ''
  const endDate = params.get('endDate') ?? ''
  const datesSet = Boolean(startDate && endDate && startDate < endDate)
  const hasFilters = Boolean(q || categoryId || startDate || endDate)

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [name, value] of Object.entries(changes)) {
      if (value) next.set(name, value)
      else next.delete(name)
    }
    setParams(next, { replace: true })
  }

  // The search box updates the address once typing pauses
  const [text, setText] = useState(q)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (text.trim() !== q) update({ q: text.trim() || null })
    }, 400)
    return () => clearTimeout(timer)
    // Only typing should trigger this, not other filter changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text])

  // "Show more" grows the list; any filter change starts again at one page
  const filtersKey = params.toString()
  const [paging, setPaging] = useState({ key: filtersKey, limit: PAGE_SIZE })
  const limit = paging.key === filtersKey ? paging.limit : PAGE_SIZE

  const query = new URLSearchParams({ status: 'AVAILABLE', page: '1', limit: String(limit) })
  if (q) query.set('search', q)
  if (categoryId) query.set('categoryId', categoryId)
  if (datesSet) {
    query.set('startDate', startDate)
    query.set('endDate', endDate)
  }

  const cars = useFetch<CarsResponse>(`/cars?${query}`)
  const categories = useFetch<Category[]>('/car-categories')

  // Dates travel on to the car page, where the booking starts from them
  const carSearch = datesSet ? `?${new URLSearchParams({ startDate, endDate })}` : ''
  const today = toDateInput(new Date())

  function clearFilters() {
    setText('')
    setParams(new URLSearchParams(), { replace: true })
  }

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
      active
        ? 'border-primary bg-primary text-primary-fg'
        : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-text'
    }`

  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t('cars.title')}</h1>
          <p className="mt-2 text-muted">{datesSet ? t('cars.subtitleDates') : t('cars.subtitle')}</p>
        </div>
        {cars.data && (
          <p className="text-sm font-semibold text-muted" aria-live="polite">
            {t('cars.count', { count: cars.data.total, formatted: formatNumber(cars.data.total, language) })}
          </p>
        )}
      </div>

      {/* Filters */}
      <div className="mt-6 rounded-3xl border border-border bg-surface p-4 sm:p-5">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative block">
            <span className="sr-only">{t('cars.searchLabel')}</span>
            <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={t('cars.searchPlaceholder')}
              className={`${fieldClass} ps-10`}
              maxLength={100}
            />
          </label>

          <div className="grid grid-cols-2 gap-3 sm:flex sm:items-center">
            <label className={dateLabelClass}>
              <CalendarRange className="hidden size-4 sm:block" aria-hidden />
              {t('home.from')}
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(event) => {
                  const value = event.target.value
                  // Keep the return date after the pickup date
                  update({ startDate: value, endDate: endDate && endDate <= value ? null : endDate })
                }}
                className={`${fieldClass} sm:w-40`}
              />
            </label>
            <label className={dateLabelClass}>
              {t('home.to')}
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(event) => update({ endDate: event.target.value })}
                className={`${fieldClass} sm:w-40`}
              />
            </label>
          </div>
        </div>

        {/* Categories scroll sideways on phones */}
        <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:-mx-5 sm:px-5 [scrollbar-width:none]">
          <button type="button" className={chipClass(!categoryId)} onClick={() => update({ category: null })}>
            {t('cars.allCategories')}
          </button>
          {categories.data?.map((category) => (
            <button
              key={category.id}
              type="button"
              className={chipClass(categoryId === String(category.id))}
              onClick={() => update({ category: String(category.id) })}
              aria-pressed={categoryId === String(category.id)}
            >
              {categoryName(category, language)}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"
          >
            <X className="size-4" aria-hidden />
            {t('cars.clearFilters')}
          </button>
        )}
      </div>

      {/* Results */}
      <div className="mt-8">
        {cars.error && !cars.loading ? (
          <div className="mx-auto max-w-md">
            <FormAlert type="error">
              {t(errorKey(cars.error))}
              <button type="button" onClick={cars.reload} className="mt-2 flex items-center gap-1.5 font-bold underline underline-offset-4">
                <RotateCcw className="size-4" aria-hidden />
                {t('cars.retry')}
              </button>
            </FormAlert>
          </div>
        ) : !cars.data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <CarCardSkeleton key={index} />
            ))}
          </div>
        ) : cars.data.data.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft">
              <SearchX className="size-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold">{t('cars.emptyTitle')}</h2>
            <p className="mt-2 max-w-sm text-muted">{datesSet ? t('cars.emptyDates') : t('cars.emptyText')}</p>
            {hasFilters && (
              <Button variant="secondary" className="mt-5" onClick={clearFilters}>
                {t('cars.clearFilters')}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div
              className={`grid gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${cars.loading ? 'opacity-60' : ''}`}
              aria-busy={cars.loading}
            >
              {cars.data.data.map((car, index) => (
                <motion.div
                  key={car.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: Math.min(index % PAGE_SIZE, 6) * 0.05 }}
                >
                  <CarCard car={car} search={carSearch} />
                </motion.div>
              ))}
            </div>

            {cars.data.total > cars.data.data.length && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="secondary"
                  disabled={cars.loading}
                  onClick={() => setPaging({ key: filtersKey, limit: limit + PAGE_SIZE })}
                >
                  {cars.loading ? t('auth.loading') : t('cars.showMore')}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Container>
  )
}
