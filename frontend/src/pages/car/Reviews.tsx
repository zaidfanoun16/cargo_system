import { MessageSquareText, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Stars } from '../../components/cars/Rating'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import type { CarReviews, Review } from '../../lib/cars'
import { formatDate } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

export function Reviews({ carId }: { carId: number }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { data, reload } = useFetch<CarReviews>(`/cars/${carId}/reviews`)
  const { user } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()
  const isAdmin = user?.role === 'ADMIN'

  // Admins can remove an inappropriate review
  async function remove(review: Review) {
    const confirmed = await confirm({
      title: t('admin.reviews.deleteTitle'),
      message: t('admin.reviews.deleteText', { name: review.reviewer }),
      confirmLabel: t('admin.delete'),
      tone: 'danger',
    })
    if (!confirmed) return

    try {
      await api(`/reviews/${review.id}`, { method: 'DELETE', auth: true })
      toast.success(t('admin.reviews.deleted'))
      reload()
    } catch (caught) {
      toast.error(t(errorKey(caught)))
    }
  }

  return (
    <section className="rounded-3xl border border-border bg-surface p-5 sm:p-6" aria-labelledby="reviews-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reviews-title" className="text-lg font-extrabold">
          {t('car.reviews')}
        </h2>
        {data && data.averageRating !== null && (
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold">{data.averageRating.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
            <div className="flex flex-col">
              <Stars rating={data.averageRating} />
              <span className="text-xs text-muted">
                {t('car.reviewsCount', { count: data.reviewsCount, formatted: formatNumber(data.reviewsCount, language) })}
              </span>
            </div>
          </div>
        )}
      </div>

      {!data ? (
        <div className="mt-4 space-y-3" aria-hidden>
          <div className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
          <div className="h-16 animate-pulse rounded-2xl bg-surface-muted" />
        </div>
      ) : data.reviews.length === 0 ? (
        <div className="mt-4 flex items-center gap-3 rounded-2xl bg-surface-muted/60 p-4 text-sm text-muted">
          <MessageSquareText className="size-5 shrink-0" aria-hidden />
          {t('car.noReviews')}
        </div>
      ) : (
        <ul className="mt-4 divide-y divide-border">
          {data.reviews.map((review) => (
            <li key={review.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-primary-soft text-sm font-bold" aria-hidden>
                    {review.reviewer.trim().charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-bold">{review.reviewer}</p>
                    <p className="text-xs text-muted">{formatDate(review.createdAt, language)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Stars rating={review.rating} size="size-3.5" />
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => remove(review)}
                      className="grid size-8 place-items-center rounded-lg text-muted hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label={t('admin.reviews.delete', { name: review.reviewer })}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
              </div>
              {review.comment && <p className="mt-2 text-sm leading-relaxed">{review.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
