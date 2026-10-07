import { ArrowLeft, BadgePercent, CalendarCheck, CalendarX2, KeyRound, ShieldAlert, ShieldCheck, Undo2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'
import { InfoCard, PageIntro } from './PageIntro'

// The same rules the server applies (src/reservations/reservation-policy.ts)
const sections = [
  { key: 'booking', icon: CalendarCheck },
  { key: 'cancellation', icon: CalendarX2 },
  { key: 'pickup', icon: KeyRound },
  { key: 'return', icon: Undo2 },
  { key: 'prices', icon: BadgePercent },
  { key: 'strikes', icon: ShieldAlert },
] as const

const highlights = ['free', 'grace', 'active'] as const

export function PolicyPage() {
  const { t } = useTranslation()

  return (
    <>
      <PageIntro
        icon={<ShieldCheck className="size-6" aria-hidden />}
        eyebrow={t('policy.eyebrow')}
        title={t('nav.policy')}
        text={t('policy.intro')}
      />

      <Container className="py-12 sm:py-16">
        {/* The three rules to remember */}
        <div className="grid gap-4 sm:grid-cols-3">
          {highlights.map((key, index) => (
            <Reveal key={key} delay={index * 0.06}>
              <div className="h-full rounded-3xl bg-primary p-6 text-primary-fg">
                <p className="text-3xl font-extrabold">{t(`policy.highlights.${key}.value`)}</p>
                <p className="mt-1 text-sm text-primary-fg/80">{t(`policy.highlights.${key}.label`)}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {sections.map(({ key, icon: Icon }, index) => (
            <Reveal key={key} delay={(index % 2) * 0.06}>
              <InfoCard
                icon={<Icon className="size-5" aria-hidden />}
                title={t(`policy.sections.${key}.title`)}
                items={t(`policy.sections.${key}.items`, { returnObjects: true }) as string[]}
              />
            </Reveal>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border p-8 text-center">
          <p className="font-bold">{t('policy.ctaText')}</p>
          <Link
            to="/cars"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            {t('home.ctaButton')}
            <ArrowLeft className="size-4 ltr:rotate-180" aria-hidden />
          </Link>
        </div>
      </Container>
    </>
  )
}
