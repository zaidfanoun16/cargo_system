import { CircleCheck, IdCard } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/Button'
import { api } from '../../lib/api'
import { type Booking, carName } from '../../lib/cars'
import { formatDate } from '../../lib/dates'

// How often to check whether the staff scanned the code
const CHECK_EVERY_MS = 4000

type Props = {
  booking: Booking | null
  onClose: () => void
  // The staff scanned the code and handed the car over, or took it back
  onHandedOver: () => void
}

// The code the customer shows at pickup, and again when returning the
// car, as a QR code and as digits. While it is open it checks the
// booking, so the customer sees "handed over" (or "returned") as soon as
// the staff confirm it.
export function HandoverDialog({ booking, onClose, onHandedOver }: Props) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const dialog = useRef<HTMLDialogElement>(null)
  const [handedOver, setHandedOver] = useState(false)

  const open = booking !== null
  // A car the customer has is being returned
  const mode = booking?.status === 'PICKED_UP' ? 'return' : 'pickup'
  const doneStatus = mode === 'return' ? 'COMPLETED' : 'PICKED_UP'

  useEffect(() => {
    if (open && !dialog.current?.open) dialog.current?.showModal()
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  useEffect(() => {
    if (!booking || handedOver) return
    const timer = setInterval(async () => {
      try {
        const bookings = await api<Booking[]>('/reservations/my', { auth: true })
        if (bookings.find((item) => item.id === booking.id)?.status === doneStatus) {
          setHandedOver(true)
          onHandedOver()
        }
      } catch {
        // Try again at the next check
      }
    }, CHECK_EVERY_MS)
    return () => clearInterval(timer)
  }, [booking, handedOver, onHandedOver, doneStatus])

  function close() {
    setHandedOver(false)
    onClose()
  }

  const code = booking?.handoverCode ?? ''

  return (
    <dialog
      ref={dialog}
      aria-labelledby="handover-title"
      onCancel={(event) => {
        event.preventDefault()
        close()
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close()
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-3xl bg-transparent p-0 text-text backdrop:bg-black/50 backdrop:backdrop-blur-sm"
    >
      {booking && (
        <div className="rounded-3xl border border-border bg-surface p-6 text-center">
          <h2 id="handover-title" className="text-xl font-extrabold">
            {t(`handover.${mode}.title`)}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {carName(booking.car, language)} ·{' '}
            {formatDate(mode === 'return' ? booking.endDate : booking.startDate, language, {
              weekday: 'short',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>

          {handedOver ? (
            <div className="py-8" role="status">
              <CircleCheck className="mx-auto size-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
              <p className="mt-4 text-lg font-extrabold">{t(`handover.${mode}.done`)}</p>
              <p className="mt-1 text-sm text-muted">{t(`handover.${mode}.doneText`)}</p>
            </div>
          ) : (
            <>
              {/* Always black on white, so it scans in dark mode too */}
              <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-4">
                <QRCodeSVG value={code} size={208} level="M" title={t('handover.qrLabel')} />
              </div>
              <p className="mt-4 text-xs font-semibold text-muted">{t('handover.orCode')}</p>
              <p dir="ltr" className="mt-1 font-mono text-3xl font-extrabold tracking-[0.3em]">
                {code.slice(0, 3)} {code.slice(3)}
              </p>
              <p className="mt-4 flex items-start gap-2 rounded-2xl bg-surface-muted p-3 text-start text-sm text-muted">
                <IdCard className="mt-0.5 size-5 shrink-0" aria-hidden />
                {t(`handover.${mode}.instructions`)}
              </p>
            </>
          )}

          <Button variant="secondary" className="mt-5 h-11 w-full" onClick={close}>
            {t('handover.close')}
          </Button>
        </div>
      )}
    </dialog>
  )
}
