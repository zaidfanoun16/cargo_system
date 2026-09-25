import { ChevronDown } from 'lucide-react'
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react'
import { useRef } from 'react'
import { useTranslation } from 'react-i18next'

import heroLarge from '../../assets/cars/hero-bmw-1920.webp'
import heroSmall from '../../assets/cars/hero-bmw-960.webp'
import { SearchForm } from '../../components/SearchForm'
import { Container } from '../../components/ui/Container'

const ease = [0.22, 1, 0.36, 1] as const

// Full-screen photo behind the header. While scrolling down, the photo
// moves slower than the page and zooms in (parallax), and the text drifts
// up and fades out.
export function Hero() {
  const { t } = useTranslation()
  const ref = useRef<HTMLElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  })

  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', reduceMotion ? '0%' : '25%'])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1.05, reduceMotion ? 1.05 : 1.2])
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', reduceMotion ? '0%' : '40%'])
  const contentOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  return (
    <section
      ref={ref}
      // Pulled up under the header, which is see-through at the top
      className="relative -mt-16 flex min-h-[100svh] items-center overflow-hidden bg-neutral-900"
    >
      <motion.img
        src={heroLarge}
        srcSet={`${heroSmall} 960w, ${heroLarge} 1920w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        className="absolute inset-0 size-full object-cover object-[55%_center]"
        style={{ y: imageY, scale: imageScale }}
      />

      {/* Darkens the photo so the white text stays readable */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/35 to-black/80" />

      <motion.div
        className="relative z-10 w-full"
        style={{ y: contentY, opacity: contentOpacity }}
      >
        <Container className="pb-24 pt-32 text-white">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease }}
            className="inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide backdrop-blur"
          >
            {t('home.eyebrow')}
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
            className="mt-5 max-w-2xl text-4xl font-extrabold leading-[1.15] sm:text-6xl"
          >
            {t('home.title')}
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease }}
            className="mt-5 max-w-lg text-base text-white/80 sm:text-lg"
          >
            {t('home.subtitle')}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.35, ease }}
            className="mt-10 max-w-2xl"
          >
            <SearchForm variant="glass" />
          </motion.div>
        </Container>
      </motion.div>

      {/* Hint that there is more below */}
      <motion.a
        href="#highlights"
        className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-xs font-semibold text-white/70"
        animate={reduceMotion ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
      >
        {t('home.scroll')}
        <ChevronDown className="size-5" aria-hidden />
      </motion.a>
    </section>
  )
}
