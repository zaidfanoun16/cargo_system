import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import bannerLarge from '../../assets/cars/suv-range-rover-1920.webp'
import bannerSmall from '../../assets/cars/suv-range-rover-960.webp'
import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'

// Wide photo that slides against the scroll direction (parallax)
export function CtaBanner() {
  const { t } = useTranslation()
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const imageY = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? ['0%', '0%'] : ['-15%', '15%'],
  )

  return (
    <section ref={ref} className="relative overflow-hidden bg-neutral-900">
      <motion.img
        src={bannerLarge}
        srcSet={`${bannerSmall} 960w, ${bannerLarge} 1920w`}
        sizes="100vw"
        alt=""
        loading="lazy"
        className="absolute inset-x-0 -top-[15%] h-[130%] w-full object-cover"
        style={{ y: imageY }}
      />
      <div className="absolute inset-0 bg-black/55" />

      <Container className="relative flex min-h-[70svh] flex-col items-center justify-center py-20 text-center text-white">
        <Reveal>
          <h2 className="text-3xl font-extrabold sm:text-5xl">{t('home.ctaTitle')}</h2>
          <p className="mx-auto mt-4 max-w-lg text-white/80 sm:text-lg">{t('home.ctaText')}</p>
          <Link
            to="/cars"
            className="mt-8 inline-flex rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-neutral-900 shadow-xl transition-transform hover:scale-105"
          >
            {t('home.ctaButton')}
          </Link>
        </Reveal>
      </Container>
    </section>
  )
}
