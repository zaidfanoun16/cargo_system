import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Container } from '../../components/ui/Container'

// Counts up from 0 the first time it scrolls into view
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const value = useMotionValue(0)
  const rounded = useTransform(value, (latest) => `${Math.round(latest)}${suffix}`)

  useEffect(() => {
    if (!inView) return
    const controls = animate(value, to, { duration: 1.6, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, to, value])

  return (
    <motion.span ref={ref} dir="ltr">
      {rounded}
    </motion.span>
  )
}

export function Highlights() {
  const { t } = useTranslation()

  const items = [
    { value: <CountUp to={20} suffix="%" />, label: t('home.highlights.discount'), prefix: true },
    { value: <CountUp to={2} />, label: t('home.highlights.minimum') },
    { value: <span dir="ltr">24/7</span>, label: t('home.highlights.online') },
  ]

  return (
    <section id="highlights" className="scroll-mt-16 border-b border-border bg-surface">
      <Container className="grid grid-cols-3 divide-x divide-border py-8 text-center sm:py-10">
        {items.map((item, index) => (
          <div key={index} className="flex flex-col items-center gap-1 px-2">
            {item.prefix && <span className="text-[11px] text-muted sm:text-sm">{item.label}</span>}
            <span className="text-3xl font-extrabold tracking-tight sm:text-5xl">{item.value}</span>
            {!item.prefix && <span className="text-[11px] text-muted sm:text-sm">{item.label}</span>}
          </div>
        ))}
      </Container>
    </section>
  )
}
