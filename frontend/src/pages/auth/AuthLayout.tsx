import { CircleCheck } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import heroImage from '../../assets/cars/hero-bmw-960.webp'

type Props = {
  icon: ReactNode
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

// Shared frame for the sign-in pages: the form, with a car photo beside
// it on large screens. On phones the form takes the whole width.
export function AuthLayout({ icon, title, subtitle, children, footer }: Props) {
  const { t } = useTranslation()
  const points = ['auth.side.point1', 'auth.side.point2', 'auth.side.point3']

  return (
    <div className="grid min-h-[calc(100dvh-4rem)] lg:grid-cols-2">
      <div className="flex items-center justify-center px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-md"
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-text">
            {icon}
          </span>
          <h1 className="mt-5 text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-2 leading-relaxed text-muted">{subtitle}</p>}

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted">{footer}</div>}
        </motion.div>
      </div>

      {/* Stays in view while a long form (sign up) scrolls */}
      <div className="relative hidden overflow-hidden lg:sticky lg:top-16 lg:block lg:h-[calc(100dvh-4rem)]">
        <motion.img
          src={heroImage}
          alt=""
          initial={{ scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="absolute inset-0 size-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/90 via-neutral-950/40 to-neutral-950/10" />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <p className="text-3xl font-extrabold leading-tight">{t('auth.side.title')}</p>
          <ul className="mt-6 space-y-3">
            {points.map((point) => (
              <li key={point} className="flex items-center gap-2.5 text-white/85">
                <CircleCheck className="size-5 shrink-0" aria-hidden />
                {t(point)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
