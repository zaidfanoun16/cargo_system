import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CarPhoto } from '../../components/cars/CarPhoto'
import type { CarImage } from '../../lib/cars'
import { formatNumber } from '../../lib/format'

// Photos slide sideways: swipe on phones, arrows or thumbnails on larger
// screens. Scroll snapping does the sliding, so it feels native.
export function Gallery({ images, name }: { images: CarImage[]; name: string }) {
  const { t, i18n } = useTranslation()
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  if (images.length === 0) {
    return <CarPhoto alt={name} className="aspect-[16/10] w-full rounded-3xl" />
  }

  function show(index: number) {
    const slide = track.current?.children[index] as HTMLElement | undefined
    slide?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  // scrollLeft is negative in right-to-left pages, so use its size
  function updateActive() {
    const element = track.current
    if (!element) return
    setActive(Math.round(Math.abs(element.scrollLeft) / element.clientWidth))
  }

  const arrowClass =
    'absolute top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/85 text-neutral-900 shadow-lg backdrop-blur transition hover:bg-white disabled:opacity-0 sm:grid'
  const language = i18n.language

  return (
    <div>
      <div className="relative overflow-hidden rounded-3xl">
        <div
          ref={track}
          onScroll={updateActive}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label={t('car.photos')}
          role="region"
        >
          {images.map((image, index) => (
            <CarPhoto
              key={image.id}
              url={image.url}
              alt={`${name} (${index + 1})`}
              eager={index === 0}
              className="aspect-[16/10] w-full shrink-0 snap-start"
            />
          ))}
        </div>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => show(active - 1)}
              disabled={active === 0}
              className={`${arrowClass} start-3`}
              aria-label={t('car.previousPhoto')}
            >
              <ChevronLeft className="size-6 rtl:rotate-180" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => show(active + 1)}
              disabled={active === images.length - 1}
              className={`${arrowClass} end-3`}
              aria-label={t('car.nextPhoto')}
            >
              <ChevronRight className="size-6 rtl:rotate-180" aria-hidden />
            </button>
            <span className="absolute bottom-3 end-3 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur">
              {formatNumber(active + 1, language)} / {formatNumber(images.length, language)}
            </span>
          </>
        )}
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => show(index)}
              className={`shrink-0 overflow-hidden rounded-xl border-2 transition ${
                index === active ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
              }`}
              aria-label={t('car.showPhoto', { number: index + 1 })}
              aria-current={index === active}
            >
              <img src={image.url} alt="" loading="lazy" className="h-14 w-20 object-cover sm:h-16 sm:w-24" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
