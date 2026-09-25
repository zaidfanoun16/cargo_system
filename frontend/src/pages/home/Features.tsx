import { BadgePercent, CalendarCheck, Clock, Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'

const features = [
  { key: 'availability', icon: CalendarCheck },
  { key: 'hourly', icon: Clock },
  { key: 'discounts', icon: BadgePercent },
  { key: 'reviews', icon: Star },
] as const

export function Features() {
  const { t } = useTranslation()

  return (
    <section>
      <Container className="py-16 sm:py-24">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('home.featuresTitle')}</h2>
        </Reveal>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ key, icon: Icon }, index) => (
            <Reveal key={key} delay={index * 0.08}>
              <div className="h-full rounded-3xl border border-border bg-surface p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-5 font-bold">{t(`home.features.${key}.title`)}</h3>
                <p className="mt-1 text-sm text-muted">{t(`home.features.${key}.text`)}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
