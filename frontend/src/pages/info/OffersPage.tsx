import { BadgePercent, CalendarDays, CalendarRange, Clock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CarPhoto } from '../../components/cars/CarPhoto'
import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'
import { useFetch } from '../../hooks/useFetch'
import { type CarsPage, carName, categoryName } from '../../lib/cars'
import { addDays, toDateInput } from '../../lib/dates'
import { formatNumber, formatPrice } from '../../lib/format'
import { PageIntro } from './PageIntro'

// Same as the server: long rentals cost less
const WEEK = { days: 7, percent: 10 }
const MONTH = { days: 30, percent: 20 }

const offers = [
  { key: 'week', icon: CalendarDays },
  { key: 'month', icon: CalendarRange },
  { key: 'hourly', icon: Clock },
] as const

// The price of whole days after the long-rental discount, to the agora
function discounted(pricePerDay: number, { days, percent }: { days: number; percent: number }) {
  return Math.round(pricePerDay * days * (100 - percent)) / 100
}

export function OffersPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const cars = useFetch<CarsPage>('/cars?status=AVAILABLE&limit=50')
  const list = [...(cars.data?.data ?? [])].sort((a, b) => a.pricePerDay - b.pricePerDay)

  // From tomorrow at 10:00 (the booking box's starting time)
  const tomorrow = addDays(new Date(), 1)
  const bookLink = (id: number, days: number) =>
    `/cars/${id}?${new URLSearchParams({ startDate: toDateInput(tomorrow), endDate: toDateInput(addDays(tomorrow, days)) })}`

  return (
    <>
      <PageIntro
        icon={<BadgePercent className="size-6" aria-hidden />}
        eyebrow={t('offers.eyebrow')}
        title={t('nav.offers')}
        text={t('offers.intro')}
      />

      <Container className="py-12 sm:py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {offers.map(({ key, icon: Icon }, index) => (
            <Reveal key={key} delay={index * 0.06}>
              <div className={`h-full rounded-3xl p-6 ${key === 'month' ? 'bg-primary text-primary-fg' : 'border border-border bg-surface'}`}>
                <span className={`grid size-11 place-items-center rounded-2xl ${key === 'month' ? 'bg-primary-fg/15' : 'bg-primary-soft'}`}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <p className="mt-5 text-4xl font-extrabold">{t(`offers.cards.${key}.value`)}</p>
                <h2 className="mt-1 font-bold">{t(`offers.cards.${key}.title`)}</h2>
                <p className={`mt-2 text-sm leading-relaxed ${key === 'month' ? 'text-primary-fg/80' : 'text-muted'}`}>
                  {t(`offers.cards.${key}.text`)}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <h2 className="mt-14 text-2xl font-extrabold sm:text-3xl">{t('offers.pricesTitle')}</h2>
        <p className="mt-1 text-sm text-muted">{t('offers.pricesNote')}</p>

        {!cars.data ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((index) => (
              <div key={index} className="h-96 animate-pulse rounded-3xl bg-surface-muted" />
            ))}
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((car) => {
              const name = carName(car, language)
              return (
                <article key={car.id} className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface">
                  <Link to={`/cars/${car.id}`} className="relative block aspect-[16/10] overflow-hidden">
                    <CarPhoto url={car.images[0]?.url} alt={name} className="size-full" />
                    <span className="absolute start-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                      {categoryName(car.category, language)}
                    </span>
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link to={`/cars/${car.id}`} className="text-lg font-extrabold hover:underline">
                      {name}
                    </Link>
                    <dl className="mt-4 space-y-2 text-sm">
                      <Row label={t('offers.perDay')} value={formatPrice(car.pricePerDay, language)} />
                      <Row
                        label={t('offers.perWeek', { percent: formatNumber(WEEK.percent, language) })}
                        value={formatPrice(discounted(car.pricePerDay, WEEK), language)}
                        before={formatPrice(car.pricePerDay * WEEK.days, language)}
                      />
                      <Row
                        label={t('offers.perMonth', { percent: formatNumber(MONTH.percent, language) })}
                        value={formatPrice(discounted(car.pricePerDay, MONTH), language)}
                        before={formatPrice(car.pricePerDay * MONTH.days, language)}
                      />
                      <Row
                        label={t('offers.perHour')}
                        value={car.pricePerHour === null ? t('car.dailyOnly') : formatPrice(car.pricePerHour, language)}
                      />
                    </dl>
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
                      <Link
                        to={bookLink(car.id, WEEK.days)}
                        className="flex h-10 items-center justify-center rounded-xl border border-border text-sm font-semibold hover:bg-surface-muted"
                      >
                        {t('offers.bookWeek')}
                      </Link>
                      <Link
                        to={bookLink(car.id, MONTH.days)}
                        className="flex h-10 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-fg hover:bg-primary-hover"
                      >
                        {t('offers.bookMonth')}
                      </Link>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </Container>
    </>
  )
}

function Row({ label, value, before }: { label: string; value: string; before?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end">
        {before && <s className="me-2 text-xs text-muted">{before}</s>}
        <span className="font-extrabold">{value}</span>
      </dd>
    </div>
  )
}
