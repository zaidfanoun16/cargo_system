import { ArrowLeft, Calendar, CarFront, Palette, Tag } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { RatingBadge } from '../../components/cars/Rating'
import { Container } from '../../components/ui/Container'
import { useFetch } from '../../hooks/useFetch'
import { ApiError } from '../../lib/api'
import { type Car, carName, categoryDescription, categoryName, colorName } from '../../lib/cars'
import { formatNumber, formatPrice } from '../../lib/format'
import { AvailabilityCalendar } from './AvailabilityCalendar'
import { BookingBox } from './BookingBox'
import { Gallery } from './Gallery'
import { Reviews } from './Reviews'

export function CarDetailsPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { id } = useParams()
  const [params] = useSearchParams()
  const carId = Number(id)
  const validId = Number.isInteger(carId) && carId > 0

  const { data: car, error } = useFetch<Car>(validId ? `/cars/${carId}` : null)
  const current = car?.id === carId ? car : undefined

  // Back to the list with the same dates
  const backSearch = params.toString() ? `?${params}` : ''
  const backLink = (
    <Link
      to={`/cars${backSearch}`}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text"
    >
      <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
      {t('car.back')}
    </Link>
  )

  if (!validId || (error instanceof ApiError && error.status === 404)) {
    return (
      <Container className="flex flex-col items-center py-20 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary-soft">
          <CarFront className="size-7" aria-hidden />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold">{t('car.notFound')}</h1>
        <div className="mt-4">{backLink}</div>
      </Container>
    )
  }

  if (!current) {
    return (
      <Container className="py-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="aspect-[16/10] animate-pulse rounded-3xl bg-surface-muted" />
          <div className="h-96 animate-pulse rounded-3xl bg-surface-muted" />
        </div>
      </Container>
    )
  }

  const name = carName(current, language)
  const description = categoryDescription(current.category, language)

  return (
    <Container className="py-6 sm:py-10">
      {backLink}

      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <div className="lg:col-start-1">
          <Gallery images={current.images} name={name} />
        </div>

        <div className="lg:col-start-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs font-bold">
              {categoryName(current.category, language)}
            </span>
            <RatingBadge rating={current.averageRating} count={current.reviewsCount} />
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-4xl">{name}</h1>

          {current.status !== 'AVAILABLE' && (
            <p className="mt-3 inline-block rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
              {t(`booking.unavailable.${current.status === 'MAINTENANCE' ? 'maintenance' : 'inactive'}`)}
            </p>
          )}

          <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Spec icon={<Calendar className="size-5" aria-hidden />} label={t('car.year')} value={formatNumber(current.year, language)} />
            <Spec icon={<Palette className="size-5" aria-hidden />} label={t('car.color')} value={colorName(current, language)} />
            <Spec icon={<Tag className="size-5" aria-hidden />} label={t('car.pricePerDay')} value={formatPrice(current.pricePerDay, language)} />
            <Spec
              icon={<Tag className="size-5" aria-hidden />}
              label={t('car.pricePerHour')}
              value={current.pricePerHour === null ? t('car.dailyOnly') : formatPrice(current.pricePerHour, language)}
            />
          </dl>

          {description && <p className="mt-5 leading-relaxed text-muted">{description}</p>}
        </div>

        {/* Beside the photos on large screens, under the title on phones */}
        <div id="booking" className="scroll-mt-20 lg:sticky lg:top-20 lg:col-start-2 lg:row-span-3 lg:row-start-1">
          <BookingBox car={current} initialStart={params.get('startDate')} initialEnd={params.get('endDate')} />
        </div>

        <div className="grid gap-6 lg:col-start-1">
          <AvailabilityCalendar carId={current.id} />
          <Reviews carId={current.id} />
        </div>
      </div>
    </Container>
  )
}

function Spec({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  )
}
