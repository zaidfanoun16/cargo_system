import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import sports from '../../assets/cars/sports-amg-640.webp'
import superCar from '../../assets/cars/super-audi-640.webp'
import luxury from '../../assets/cars/luxury-maserati-640.webp'
import suv from '../../assets/cars/suv-range-rover-640.webp'
import { Reveal } from '../../components/motion/Reveal'
import { Container } from '../../components/ui/Container'

const categories = [
  { key: 'sports', image: sports },
  { key: 'super', image: superCar },
  { key: 'suv', image: suv },
  { key: 'luxury', image: luxury },
] as const

export function Categories() {
  const { t } = useTranslation()

  return (
    <section>
      <Container className="py-16 sm:py-24">
        <Reveal className="mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-extrabold sm:text-4xl">{t('home.categoriesTitle')}</h2>
          <p className="mt-3 text-muted">{t('home.categoriesSubtitle')}</p>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
          {categories.map(({ key, image }, index) => (
            <Reveal key={key} delay={index * 0.1}>
              <Link
                to="/cars"
                className="group relative block aspect-[3/4] overflow-hidden rounded-3xl bg-neutral-900"
              >
                <img
                  src={image}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                  <h3 className="text-lg font-extrabold sm:text-2xl">{t(`home.categories.${key}`)}</h3>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/75 transition-colors group-hover:text-white sm:text-sm">
                    {t('home.explore')}
                    <ArrowRight
                      className="size-4 transition-transform duration-300 group-hover:translate-x-1 rtl:rotate-180 rtl:group-hover:-translate-x-1"
                      aria-hidden
                    />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  )
}
