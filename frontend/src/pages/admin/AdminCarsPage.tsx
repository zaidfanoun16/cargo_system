import { CarFront, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CarPhoto } from '../../components/cars/CarPhoto'
import { FormAlert } from '../../components/form/FormAlert'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import type { AdminCar } from '../../lib/admin'
import { api } from '../../lib/api'
import { type CarsPage, carName, categoryName } from '../../lib/cars'
import { errorKey } from '../../lib/errors'
import { formatPrice } from '../../lib/format'
import { AdminHeader } from './AdminLayout'

const carStatusStyles = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  MAINTENANCE: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  INACTIVE: 'bg-surface-muted text-muted',
} as const

export function CarStatusBadge({ status }: { status: AdminCar['status'] }) {
  const { t } = useTranslation()
  return (
    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${carStatusStyles[status]}`}>
      {t(`admin.cars.status.${status}`)}
    </span>
  )
}

export function AdminCarsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const confirm = useConfirm()
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')

  // Every status (not only available cars), up to 100 at a time
  const query = new URLSearchParams({ page: '1', limit: '100' })
  if (debounced.trim()) query.set('search', debounced.trim())
  const cars = useFetch<CarsPage>(`/cars?${query}`)

  // Search once typing pauses
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 350)
    return () => clearTimeout(timer)
  }, [search])

  async function remove(car: AdminCar) {
    const name = carName(car, language)
    const confirmed = await confirm({
      title: t('admin.cars.deleteTitle'),
      message: t('admin.cars.deleteText', { car: name }),
      confirmLabel: t('admin.delete'),
      tone: 'danger',
    })
    if (!confirmed) return

    try {
      await api(`/cars/${car.id}`, { method: 'DELETE', auth: true })
      toast.success(t('admin.cars.deleted', { car: name }))
      cars.reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  const list = (cars.data?.data ?? []) as AdminCar[]

  return (
    <>
      <AdminHeader
        title={t('admin.nav.cars')}
        subtitle={t('admin.cars.subtitle')}
        action={
          <Link
            to="/admin/cars/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden />
            {t('admin.cars.add')}
          </Link>
        }
      />

      <label className="relative block sm:max-w-sm">
        <span className="sr-only">{t('cars.searchLabel')}</span>
        <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('cars.searchPlaceholder')}
          className="h-11 w-full rounded-xl border border-border bg-surface ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <div className="mt-6">
        {cars.error && !cars.data ? (
          <FormAlert type="error">{t(errorKey(cars.error))}</FormAlert>
        ) : !cars.data ? (
          <div className="h-64 animate-pulse rounded-3xl bg-surface-muted" aria-hidden />
        ) : list.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-14 text-center">
            <CarFront className="size-8 text-muted" aria-hidden />
            <p className="mt-3 font-bold">{t('cars.emptyTitle')}</p>
          </div>
        ) : (
          <ul className={`divide-y divide-border overflow-hidden rounded-3xl border border-border bg-surface ${cars.loading ? 'opacity-60' : ''}`}>
            {list.map((car) => {
              const name = carName(car, language)
              return (
                <li key={car.id} className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                  <CarPhoto url={car.images[0]?.url} alt={name} className="h-14 w-20 shrink-0 rounded-xl sm:h-16 sm:w-24" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/admin/cars/${car.id}`} className="truncate font-bold hover:underline">
                        {name}
                      </Link>
                      <CarStatusBadge status={car.status} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      <span dir="ltr">{car.licensePlate}</span> · {categoryName(car.category, language)} ·{' '}
                      {formatPrice(car.pricePerDay, language)} / {t('currency.perDay')}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Link
                      to={`/admin/cars/${car.id}`}
                      className="grid size-10 place-items-center rounded-xl text-muted hover:bg-surface-muted hover:text-text"
                      aria-label={t('admin.editItem', { name })}
                      title={t('admin.edit')}
                    >
                      <Pencil className="size-4" aria-hidden />
                    </Link>
                    <button
                      type="button"
                      onClick={() => remove(car)}
                      className="grid size-10 place-items-center rounded-xl text-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label={t('admin.deleteItem', { name })}
                      title={t('admin.delete')}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </>
  )
}
