import { CalendarDays, CarFront, KeyRound } from 'lucide-react'
import { motion, useScroll, useSpring } from 'motion/react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'

const steps = [
  { key: 'search', icon: CalendarDays },
  { key: 'choose', icon: CarFront },
  { key: 'drive', icon: KeyRound },
] as const

// The line joining the steps draws itself as the section scrolls by
export function HowItWorks() {
  const { t } = useTranslation()
  const ref = useRef<HTMLDivElement>(null)

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 80%', 'end 55%'],
  })
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30 })

  return (
    <section className="border-y border-border bg-surface">
      <Container className="py-16 sm:py-24">
        <Reveal className="text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('home.stepsTitle')}</h2>
        </Reveal>

        <div ref={ref} className="relative mx-auto mt-12 max-w-4xl">
          {/* Vertical line on phones */}
          <div className="absolute bottom-7 start-7 top-7 w-0.5 bg-border md:hidden">
            <motion.div className="h-full w-full origin-top bg-primary" style={{ scaleY: progress }} />
          </div>
          {/* Horizontal line on larger screens */}
          <div className="absolute end-[16.66%] start-[16.66%] top-7 hidden h-0.5 bg-border md:block">
            <motion.div
              className="h-full w-full bg-primary ltr:origin-left rtl:origin-right"
              style={{ scaleX: progress }}
            />
          </div>

          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-6">
            {steps.map(({ key, icon: Icon }, index) => (
              <Reveal key={key} delay={index * 0.15}>
                <li className="flex items-start gap-4 md:flex-col md:items-center md:text-center">
                  <span className="relative grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-fg shadow-lg">
                    <Icon className="size-6" aria-hidden />
                    <span className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-surface bg-text text-xs font-bold text-surface">
                      {index + 1}
                    </span>
                  </span>
                  <div>
                    <h3 className="text-lg font-bold">{t(`home.steps.${key}.title`)}</h3>
                    <p className="mt-1 text-sm text-muted">{t(`home.steps.${key}.text`)}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  )
}
