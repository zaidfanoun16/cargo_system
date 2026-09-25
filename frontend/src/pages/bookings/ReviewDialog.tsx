import { Star } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useConfirm } from '../../hooks/useConfirm'
import { api } from '../../lib/api'
import { errorKey } from '../../lib/errors'
import { formatNumber } from '../../lib/format'

const MAX_COMMENT = 1000

type Props = {
  reservationId: number | null
  carName: string
  onClose: () => void
  onReviewed: () => void
}

// Rate a finished booking: 1–5 stars and an optional comment. A review
// cannot be edited later, so sending it asks for confirmation first.
export function ReviewDialog({ reservationId, carName, onClose, onReviewed }: Props) {
  const { t, i18n } = useTranslation()
  const confirm = useConfirm()
  const dialog = useRef<HTMLDialogElement>(null)
  const stars = useRef<(HTMLButtonElement | null)[]>([])

  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string>()
  const [sending, setSending] = useState(false)

  const open = reservationId !== null

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  function close() {
    setRating(0)
    setComment('')
    setError(undefined)
    onClose()
  }

  // Arrow keys move between stars, like a radio group
  function handleKeyDown(event: KeyboardEvent, value: number) {
    const rtl = document.documentElement.dir === 'rtl'
    const next = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1, ArrowUp: 1, ArrowDown: -1 }[event.key]
    if (!next) return
    event.preventDefault()
    const target = Math.min(5, Math.max(1, value + next))
    setRating(target)
    stars.current[target - 1]?.focus()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!reservationId) return
    if (rating === 0) {
      setError('reviews.pickRating')
      return
    }

    const confirmed = await confirm({
      title: t('reviews.confirmTitle'),
      message: t('reviews.confirmText'),
      confirmLabel: t('reviews.send'),
    })
    if (!confirmed) return

    setSending(true)
    setError(undefined)
    try {
      await api(`/reservations/${reservationId}/review`, {
        method: 'POST',
        auth: true,
        body: { rating, ...(comment.trim() && { comment: comment.trim() }) },
      })
      setRating(0)
      setComment('')
      onReviewed()
    } catch (caught) {
      setError(errorKey(caught))
    } finally {
      setSending(false)
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby="review-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-transparent p-0 text-text backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      <form onSubmit={submit} className="rounded-3xl border border-border bg-surface p-6">
        <h2 id="review-title" className="text-xl font-extrabold">
          {t('reviews.title')}
        </h2>
        <p className="mt-1 text-sm text-muted">{carName}</p>

        <div
          role="radiogroup"
          aria-label={t('reviews.ratingLabel')}
          className="mt-5 flex justify-center gap-1"
        >
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              ref={(element) => {
                stars.current[value - 1] = element
              }}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={t('reviews.starOption', { count: value })}
              tabIndex={rating === value || (rating === 0 && value === 1) ? 0 : -1}
              onClick={() => {
                setRating(value)
                setError(undefined)
              }}
              onKeyDown={(event) => handleKeyDown(event, value)}
              className="rounded-xl p-1.5 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-primary"
            >
              <Star
                className={`size-9 transition-colors ${value <= rating ? 'fill-amber-400 text-amber-400' : 'fill-transparent text-border'}`}
                aria-hidden
              />
            </button>
          ))}
        </div>
        <p className="mt-1 h-5 text-center text-sm font-semibold text-muted">
          {rating > 0 && t(`reviews.ratingWords.${rating}`)}
        </p>

        <label className="mt-4 block text-sm font-semibold" htmlFor="review-comment">
          {t('reviews.comment')}
        </label>
        <textarea
          id="review-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          maxLength={MAX_COMMENT}
          rows={4}
          placeholder={t('reviews.commentPlaceholder')}
          className="mt-1.5 w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <p className="mt-1 text-end text-xs text-muted">
          {formatNumber(comment.length, i18n.language)} / {formatNumber(MAX_COMMENT, i18n.language)}
        </p>

        {error && (
          <div className="mt-3">
            <FormAlert type="error">{t(error)}</FormAlert>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="h-11" onClick={close}>
            {t('confirm.cancel')}
          </Button>
          <Button type="submit" className="h-11" disabled={sending}>
            {sending ? t('auth.loading') : t('reviews.send')}
          </Button>
        </div>
      </form>
    </dialog>
  )
}
