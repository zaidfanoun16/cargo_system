import { ArrowLeft, BadgeCheck, CalendarCheck, CarFront, Clock, Languages, QrCode, ScanLine, Star, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'
import { useFetch } from '../../hooks/useFetch'
import type { CarsPage, Category } from '../../lib/cars'
import { formatNumber } from '../../lib/format'
import { PageIntro } from './PageIntro'

const values = [
  { key: 'online', icon: Clock },
  { key: 'clear', icon: BadgeCheck },
  { key: 'qr', icon: QrCode },
  { key: 'languages', icon: Languages },
] as const

const steps = [
  { key: 'book', icon: CalendarCheck },
  { key: 'pickup', icon: ScanLine },
  { key: 'return', icon: Undo2 },
] as const

export function AboutPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  // Live numbers from the fleet
  const cars = useFetch<CarsPage>('/cars?limit=1')
  const categories = useFetch<Category[]>('/car-categories')

  const numbers = [
    { key: 'cars', icon: CarFront, value: cars.data ? formatNumber(cars.data.total, language) : '—' },
    { key: 'categories', icon: Star, value: categories.data ? formatNumber(categories.data.length, language) : '—' },
    { key: 'online', icon: Clock, value: '24/7' },
  ] as const

  return (
    <>
      <PageIntro
        icon={<CarFront className="size-6" aria-hidden />}
        eyebrow={t('about.eyebrow')}
        title={t('nav.about')}
        text={t('about.intro')}
      />

      <Container className="py-12 sm:py-16">
        <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_1fr]">
          <Reveal>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{t('about.storyTitle')}</h2>
            <p className="mt-4 leading-loose text-muted">{t('about.story1')}</p>
            <p className="mt-3 leading-loose text-muted">{t('about.story2')}</p>
          </Reveal>
          <div className="grid grid-cols-3 gap-3">
            {numbers.map(({ key, icon: Icon, value }, index) => (
              <Reveal key={key} delay={index * 0.06}>
                <div className="h-full rounded-3xl border border-border bg-surface p-4 text-center">
                  <Icon className="mx-auto size-5 text-muted" aria-hidden />
                  <p className="mt-2 text-3xl font-extrabold tabular-nums" dir="ltr">
                    {value}
                  </p>
                  <p className="mt-1 text-xs text-muted">{t(`about.numbers.${key}`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        <h2 className="mt-14 text-center text-2xl font-extrabold sm:text-3xl">{t('about.valuesTitle')}</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {values.map(({ key, icon: Icon }, index) => (
            <Reveal key={key} delay={index * 0.06}>
              <div className="h-full rounded-3xl border border-border bg-surface p-6">
                <span className="grid size-11 place-items-center rounded-2xl bg-primary-soft">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-bold">{t(`about.values.${key}.title`)}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted">{t(`about.values.${key}.text`)}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <h2 className="mt-14 text-center text-2xl font-extrabold sm:text-3xl">{t('about.stepsTitle')}</h2>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {steps.map(({ key, icon: Icon }, index) => (
            <Reveal key={key} delay={index * 0.06}>
              <li className="flex h-full gap-4 rounded-3xl bg-surface-muted p-6">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-fg">
                  {formatNumber(index + 1, language)}
                </span>
                <div>
                  <h3 className="flex items-center gap-2 font-bold">
                    <Icon className="size-4" aria-hidden />
                    {t(`about.steps.${key}.title`)}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{t(`about.steps.${key}.text`)}</p>
                </div>
              </li>
            </Reveal>
          ))}
        </ol>

        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/cars"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            {t('home.ctaButton')}
            <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
          </Link>
          <Link to="/policy" className="rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-surface-muted">
            {t('nav.policy')}
          </Link>
        </div>
      </Container>
    </>
  )
}
