import { Heart } from 'lucide-react'
import type { MouseEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { useFavorites } from '../../hooks/useFavorites'
import { useToast } from '../../hooks/useToast'
import { errorKey } from '../../lib/errors'

type Props = {
  carId: number
  carName: string
  // "overlay" sits on a photo, "plain" next to text
  variant?: 'overlay' | 'plain'
  className?: string
}

// Heart that saves a car to the favorites. Logged-out visitors are sent
// to log in first.
export function FavoriteButton({ carId, carName, variant = 'overlay', className = '' }: Props) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { isFavorite, toggle } = useFavorites()
  const toast = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const saved = isFavorite(carId)

  async function handleClick(event: MouseEvent) {
    // The button sits inside the car card's link
    event.preventDefault()
    event.stopPropagation()

    if (!user) {
      toast.info(t('favorites.loginFirst'))
      navigate('/login', { state: { from: location.pathname + location.search } })
      return
    }

    try {
      const nowSaved = await toggle(carId)
      toast.success(t(nowSaved ? 'favorites.added' : 'favorites.removed', { car: carName }))
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  const look =
    variant === 'overlay'
      ? 'size-10 bg-white/90 text-neutral-900 shadow-md backdrop-blur hover:bg-white'
      : 'size-11 border border-border bg-surface text-text hover:bg-surface-muted'

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={t(saved ? 'favorites.remove' : 'favorites.add', { car: carName })}
      title={t(saved ? 'favorites.remove' : 'favorites.add', { car: carName })}
      className={`grid place-items-center rounded-full transition active:scale-90 ${look} ${className}`}
    >
      <Heart
        className={`size-5 transition-colors ${saved ? 'fill-red-500 text-red-500' : ''}`}
        aria-hidden
      />
    </button>
  )
}
