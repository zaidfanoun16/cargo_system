import { HeartCrack, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CarCard, CarCardSkeleton } from '../../components/cars/CarCard'
import { FormAlert } from '../../components/form/FormAlert'
import { Container } from '../../components/ui/Container'
import { useFavorites } from '../../hooks/useFavorites'
import { useFetch } from '../../hooks/useFetch'
import type { Car } from '../../lib/cars'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

export function FavoritesPage() {
  const { t, i18n } = useTranslation()
  const favorites = useFetch<Car[]>('/favorites', { auth: true })
  const { ids, loaded } = useFavorites()

  // A car un-hearted on this page disappears right away
  const cars = (favorites.data ?? []).filter((car) => !loaded || ids.has(car.id))

  return (
    <Container className="py-8 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">{t('nav.favorites')}</h1>
          <p className="mt-2 text-muted">{t('favorites.subtitle')}</p>
        </div>
        {favorites.data && (
          <p className="text-sm font-semibold text-muted" aria-live="polite">
            {t('cars.count', { count: cars.length, formatted: formatNumber(cars.length, i18n.language) })}
          </p>
        )}
      </div>

      <div className="mt-8">
        {favorites.error && !favorites.loading ? (
          <div className="max-w-md">
            <FormAlert type="error">
              {t(errorKey(favorites.error))}
              <button
                type="button"
                onClick={favorites.reload}
                className="mt-2 flex items-center gap-1.5 font-bold underline underline-offset-4"
              >
                <RotateCcw className="size-4" aria-hidden />
                {t('cars.retry')}
              </button>
            </FormAlert>
          </div>
        ) : !favorites.data ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <CarCardSkeleton key={index} />
            ))}
          </div>
        ) : cars.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-border py-16 text-center">
            <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft">
              <HeartCrack className="size-7" aria-hidden />
            </span>
            <h2 className="mt-4 text-xl font-extrabold">{t('favorites.emptyTitle')}</h2>
            <p className="mt-2 max-w-sm text-muted">{t('favorites.emptyText')}</p>
            <Link
              to="/cars"
              className="mt-5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
            >
              {t('home.ctaButton')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car) => (
              <CarCard key={car.id} car={car} />
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}
