import { Star } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// "★ 4.5 (12)", or nothing when the car has no reviews yet
export function RatingBadge({ rating, count, className = '' }: { rating: number | null; count: number; className?: string }) {
  const { t, i18n } = useTranslation()
  if (rating === null || count === 0) return null

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-bold ${className}`}
      aria-label={t('cars.ratingLabel', { rating, count })}
    >
      <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
      {rating.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')}
      <span className="font-medium opacity-75">({count.toLocaleString(i18n.language === 'ar' ? 'ar-EG' : 'en-US')})</span>
    </span>
  )
}

// Five stars, filled up to the rating
export function Stars({ rating, size = 'size-4' }: { rating: number; size?: string }) {
  const { t } = useTranslation()

  return (
    <span className="inline-flex gap-0.5" role="img" aria-label={t('cars.starsLabel', { rating })}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'fill-border text-border'}`}
          aria-hidden
        />
      ))}
    </span>
  )
}
