import { Calendar, Palette } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { type Car, carName, categoryName, colorName } from '../../lib/cars'
import { formatNumber, formatPrice } from '../../lib/format'
import { CarPhoto } from './CarPhoto'
import { RatingBadge } from './Rating'

// "search" carries the chosen dates on to the car page
export function CarCard({ car, search = '' }: { car: Car; search?: string }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const name = carName(car, language)

  return (
    <Link
      to={`/cars/${car.id}${search}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-surface transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary dark:hover:shadow-black/40"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <CarPhoto
          url={car.images[0]?.url}
          alt={name}
          className="size-full transition-transform duration-700 ease-out group-hover:scale-105"
        />
        <span className="absolute start-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">
          {categoryName(car.category, language)}
        </span>
        <RatingBadge
          rating={car.averageRating}
          count={car.reviewsCount}
          className="absolute end-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-neutral-900 backdrop-blur"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <h3 className="text-lg font-extrabold leading-snug">{name}</h3>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="size-4" aria-hidden />
            {formatNumber(car.year, language)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Palette className="size-4" aria-hidden />
            {colorName(car, language)}
          </span>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
          <p>
            <span className="text-xl font-extrabold">{formatPrice(car.pricePerDay, language)}</span>
            <span className="ms-1 text-sm text-muted">/ {t('currency.perDay')}</span>
          </p>
          {car.pricePerHour !== null && (
            <p className="text-sm text-muted">
              {formatPrice(car.pricePerHour, language)} / {t('currency.perHour')}
            </p>
          )}
        </div>
      </div>
    </Link>
  )
}

export function CarCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-surface" aria-hidden>
      <div className="aspect-[4/3] animate-pulse bg-surface-muted" />
      <div className="space-y-3 p-5">
        <div className="h-5 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-4 w-1/2 animate-pulse rounded-lg bg-surface-muted" />
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-surface-muted" />
      </div>
    </div>
  )
}
