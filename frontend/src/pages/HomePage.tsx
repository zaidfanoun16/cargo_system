import { BadgePercent, CalendarCheck, Clock, Search, Star } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { CarIllustration } from '../components/CarIllustration'
import { Button } from '../components/ui/Button'
import { Container } from '../components/ui/Container'

const features = [
  { key: 'availability', icon: CalendarCheck },
  { key: 'hourly', icon: Clock },
  { key: 'discounts', icon: BadgePercent },
  { key: 'reviews', icon: Star },
] as const

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10)
}

export function HomePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const today = new Date()
  const [startDate, setStartDate] = useState(toDateInput(today))
  const [endDate, setEndDate] = useState(
    toDateInput(new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)),
  )

  function search(event: FormEvent) {
    event.preventDefault()
    navigate(`/cars?${new URLSearchParams({ startDate, endDate })}`)
  }

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-surface">
        <Container className="grid items-center gap-8 py-10 md:grid-cols-2 md:py-16">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight sm:text-4xl lg:text-5xl">
              {t('home.title')}
            </h1>
            <p className="mt-4 max-w-md text-base text-muted sm:text-lg">{t('home.subtitle')}</p>

            {/* Search by dates */}
            <form
              onSubmit={search}
              className="mt-8 rounded-2xl border border-border bg-bg p-4 shadow-sm"
            >
              <p className="mb-3 text-sm font-bold">{t('home.searchTitle')}</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  {t('home.from')}
                  <input
                    type="date"
                    value={startDate}
                    min={toDateInput(today)}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text"
                    required
                  />
                </label>
                <label className="flex flex-col gap-1 text-xs font-semibold text-muted">
                  {t('home.to')}
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="h-11 rounded-xl border border-border bg-surface px-3 text-sm text-text"
                    required
                  />
                </label>
                <Button type="submit" className="h-11 self-end">
                  <Search className="size-4" aria-hidden />
                  {t('home.search')}
                </Button>
              </div>
            </form>
          </div>

          <CarIllustration className="mx-auto w-full max-w-md" />
        </Container>
      </section>

      {/* Features */}
      <section>
        <Container className="py-12">
          <h2 className="mb-6 text-center text-2xl font-extrabold">{t('home.featuresTitle')}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ key, icon: Icon }) => (
              <div key={key} className="rounded-2xl border border-border bg-surface p-5">
                <span className="grid size-11 place-items-center rounded-xl bg-primary-soft">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{t(`home.features.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`home.features.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>
    </>
  )
}
