import { Camera, CameraOff, CircleCheck, KeyRound, MessageCircle, Printer, RotateCcw, Search, Undo2 } from 'lucide-react'
import QrScanner from 'qr-scanner'
import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CarPhoto } from '../../components/cars/CarPhoto'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import { whatsappLink } from '../../lib/admin'
import { api } from '../../lib/api'
import { type Car, carName, colorName } from '../../lib/cars'
import { formatDate } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'
import { AdminHeader } from './AdminLayout'
import { type HandoverEvent, HandoverLog } from './HandoverLog'

type Handover = {
  id: number
  // Hand the car over, or take it back
  mode: 'pickup' | 'return'
  // NO_SHOW: the customer arrived after the pickup time had passed
  status: 'CONFIRMED' | 'NO_SHOW' | 'PICKED_UP'
  pickedUpAt: string | null
  startDate: string
  endDate: string
  totalPrice: number
  runningLate: boolean
  // From when the car can be handed over (an hour before pickup)
  handoverFrom: string
  // Until when the car is kept for the customer
  pickupDeadline: string
  // After a no-show, someone else booked the car since
  carTaken: boolean
  user: { id: number; fullName: string; email: string; phoneNumber: string | null }
  car: Pick<Car, 'id' | 'brand' | 'brandAr' | 'model' | 'modelAr' | 'color' | 'colorAr' | 'images'> & {
    licensePlate: string
  }
}

// The customer's QR code holds the 6-digit handover code
function codeFrom(text: string) {
  return text.match(/\b\d{6}\b/)?.[0] ?? null
}

// Hand a car over at pickup, or take it back at return: scan the QR code
// on the customer's phone (or type the code), check the customer and the
// car, then confirm and print the receipt. The same code is used for both;
// a car the customer already has is being returned.
export function AdminHandoverPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const toast = useToast()

  const video = useRef<HTMLVideoElement>(null)
  const scanner = useRef<QrScanner | null>(null)
  const [scanning, setScanning] = useState(false)
  const [cameraError, setCameraError] = useState(false)

  const [typed, setTyped] = useState('')
  const [code, setCode] = useState<string>()
  const [handover, setHandover] = useState<Handover>()
  // When the booking was loaded; the server checks the time again
  const [loadedAt, setLoadedAt] = useState(0)
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)
  const [checkedId, setCheckedId] = useState(false)
  const [checkedLicense, setCheckedLicense] = useState(false)
  const [done, setDone] = useState<Handover>()
  const log = useFetch<HandoverEvent[]>('/reservations/handovers', { auth: true })
  const logSection = <HandoverLog events={log.data} error={log.error} loading={log.loading} />

  // Turn the camera off when leaving the page
  useEffect(() => () => scanner.current?.destroy(), [])

  function stopCamera() {
    scanner.current?.stop()
    setScanning(false)
  }

  async function startCamera() {
    if (!video.current) return
    setCameraError(false)
    setError(undefined)
    scanner.current ??= new QrScanner(
      video.current,
      (result) => {
        const scanned = codeFrom(result.data)
        if (!scanned) return
        stopCamera()
        setTyped('')
        void lookUp(scanned)
      },
      { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true, returnDetailedScanResult: true },
    )
    try {
      await scanner.current.start()
      setScanning(true)
    } catch {
      setCameraError(true)
      setScanning(false)
    }
  }

  async function lookUp(value: string) {
    setLoading(true)
    setError(undefined)
    setHandover(undefined)
    setCheckedId(false)
    setCheckedLicense(false)
    try {
      setHandover(await api<Handover>(`/reservations/handover/${value}`, { auth: true }))
      setLoadedAt(new Date().getTime())
      setCode(value)
    } catch (caught) {
      setError(errorKey(caught))
    } finally {
      setLoading(false)
    }
  }

  function submitTyped(event: FormEvent) {
    event.preventDefault()
    const value = codeFrom(typed.replace(/\s/g, ''))
    if (!value) {
      setError('handover.errors.format')
      return
    }
    stopCamera()
    void lookUp(value)
  }

  async function submit() {
    if (!code || !handover) return
    setLoading(true)
    setError(undefined)
    try {
      const path = handover.mode === 'return' ? '/reservations/return' : '/reservations/handover'
      await api(path, { method: 'POST', auth: true, body: { code } })
      toast.success(t(`handover.admin.${handover.mode}.toast`, { id: formatNumber(handover.id, language) }))
      setDone(handover)
      setHandover(undefined)
      log.reload()
    } catch (caught) {
      setError(errorKey(caught))
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setDone(undefined)
    setHandover(undefined)
    setCode(undefined)
    setTyped('')
    setError(undefined)
  }

  const dateTime = (value: string) => formatDate(value, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })
  const isReturn = handover?.mode === 'return'
  const tooEarly = handover && !isReturn ? new Date(handover.handoverFrom).getTime() > loadedAt : false
  // Hours past the return time (0 when on time)
  const lateHours =
    handover && isReturn ? Math.max(0, Math.ceil((loadedAt - new Date(handover.endDate).getTime()) / (60 * 60 * 1000))) : 0

  if (done) {
    return (
      <>
        <AdminHeader title={t('admin.nav.handover')} />
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-6 text-center" role="status">
          <CircleCheck className="mx-auto size-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 className="mt-4 text-xl font-extrabold">{t(`handover.admin.${done.mode}.doneTitle`)}</h2>
          <p className="mt-2 text-sm text-muted">
            {t(`handover.admin.${done.mode}.doneText`, {
              name: done.user.fullName,
              car: carName(done.car, language),
              date: dateTime(done.endDate),
            })}
          </p>
          <Link
            to={`/receipt/${done.id}?type=${done.mode}`}
            target="_blank"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            <Printer className="size-4" aria-hidden />
            {t(`handover.admin.${done.mode}.print`)}
          </Link>
          <Button variant="secondary" className="mt-2 h-11 w-full" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            {t('handover.admin.next')}
          </Button>
        </div>
        {logSection}
      </>
    )
  }

  return (
    <>
      <AdminHeader title={t('admin.nav.handover')} subtitle={t('handover.admin.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {/* Camera */}
          <div className="overflow-hidden rounded-3xl border border-border bg-surface">
            <div className={`relative aspect-square bg-black sm:aspect-[4/3] ${scanning ? '' : 'hidden'}`}>
              <video ref={video} className="size-full object-cover" muted playsInline />
            </div>
            {!scanning && (
              <div className="flex aspect-[4/3] flex-col items-center justify-center gap-3 p-6 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft">
                  <Camera className="size-7" aria-hidden />
                </span>
                <p className="text-sm text-muted">{t('handover.admin.cameraHint')}</p>
                {cameraError && <p className="text-sm font-semibold text-red-600 dark:text-red-400">{t('handover.admin.cameraError')}</p>}
              </div>
            )}
            <div className="border-t border-border p-3">
              {scanning ? (
                <Button variant="secondary" className="h-11 w-full" onClick={stopCamera}>
                  <CameraOff className="size-4" aria-hidden />
                  {t('handover.admin.stopCamera')}
                </Button>
              ) : (
                <Button className="h-11 w-full" onClick={startCamera}>
                  <Camera className="size-4" aria-hidden />
                  {t('handover.admin.startCamera')}
                </Button>
              )}
            </div>
          </div>

          {/* Or type the code */}
          <form onSubmit={submitTyped} className="rounded-3xl border border-border bg-surface p-4">
            <label htmlFor="handover-code" className="text-sm font-semibold">
              {t('handover.admin.typeCode')}
            </label>
            <div className="mt-2 flex gap-2">
              <input
                id="handover-code"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                inputMode="numeric"
                autoComplete="off"
                maxLength={7}
                dir="ltr"
                placeholder="123 456"
                className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 text-center font-mono text-lg tracking-[0.3em] focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <Button type="submit" className="h-11" disabled={loading}>
                <Search className="size-4" aria-hidden />
                {t('handover.admin.find')}
              </Button>
            </div>
          </form>
        </div>

        {/* The booking */}
        <div aria-live="polite">
          {error && <FormAlert type="error">{t(error)}</FormAlert>}

          {loading && !handover && <div className="h-80 animate-pulse rounded-3xl bg-surface-muted" />}

          {!handover && !loading && !error && (
            <div className="flex h-full min-h-60 flex-col items-center justify-center rounded-3xl border border-dashed border-border p-6 text-center">
              <KeyRound className="size-8 text-muted" aria-hidden />
              <p className="mt-3 text-sm text-muted">{t('handover.admin.empty')}</p>
            </div>
          )}

          {handover && (
            <div className="overflow-hidden rounded-3xl border border-border bg-surface">
              <CarPhoto
                url={handover.car.images?.[0]?.url}
                alt={carName(handover.car, language)}
                className="aspect-[16/9] w-full"
              />
              <div className="space-y-4 p-5">
                <div>
                  <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-bold ${
                        isReturn
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {isReturn ? <Undo2 className="size-3.5" aria-hidden /> : <KeyRound className="size-3.5" aria-hidden />}
                      {t(`handover.admin.${handover.mode}.badge`)}
                    </span>
                    {t('bookings.number', { id: formatNumber(handover.id, language) })}
                  </p>
                  <h2 className="text-xl font-extrabold">
                    {carName(handover.car, language)}{' '}
                    <span className="ms-1 text-sm font-semibold text-muted" dir="ltr">
                      {handover.car.licensePlate}
                    </span>
                  </h2>
                  <p className="text-sm text-muted">{colorName(handover.car, language)}</p>
                </div>

                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-muted">{t('admin.bookings.customer')}</dt>
                    <dd className="mt-0.5 text-base font-extrabold">{handover.user.fullName}</dd>
                    {handover.user.phoneNumber && (
                      <dd>
                        <a
                          href={whatsappLink(handover.user.phoneNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline dark:text-emerald-400"
                        >
                          <MessageCircle className="size-3.5" aria-hidden />
                          <span dir="ltr">{handover.user.phoneNumber}</span>
                        </a>
                      </dd>
                    )}
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted">{t('booking.total')}</dt>
                    <dd className="mt-0.5 text-base font-extrabold">{formatPrice(handover.totalPrice, language)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted">{t('booking.pickup')}</dt>
                    <dd className="mt-0.5 font-semibold">{dateTime(handover.startDate)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted">{t('booking.return')}</dt>
                    <dd className="mt-0.5 font-semibold">{dateTime(handover.endDate)}</dd>
                  </div>
                  {isReturn && handover.pickedUpAt && (
                    <div>
                      <dt className="text-xs font-semibold text-muted">{t('handover.admin.return.pickedUpAt')}</dt>
                      <dd className="mt-0.5 font-semibold">{dateTime(handover.pickedUpAt)}</dd>
                    </div>
                  )}
                </dl>

                {isReturn && (
                  <p
                    className={`rounded-2xl p-3 text-sm font-semibold ${
                      lateHours > 0
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
                        : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    }`}
                  >
                    {lateHours > 0
                      ? t('handover.admin.return.late', {
                          duration: t('booking.hours', { count: lateHours, formatted: formatNumber(lateHours, language) }),
                        })
                      : t('handover.admin.return.onTime')}
                  </p>
                )}

                {tooEarly && (
                  <FormAlert type="error">{t('handover.admin.tooEarly', { date: dateTime(handover.handoverFrom) })}</FormAlert>
                )}
                {handover.status === 'CONFIRMED' && handover.runningLate && (
                  <p className="rounded-2xl bg-blue-50 p-3 text-sm font-semibold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300">
                    {t('handover.admin.runningLate', { date: dateTime(handover.pickupDeadline) })}
                  </p>
                )}
                {handover.status === 'NO_SHOW' &&
                  (handover.carTaken ? (
                    <FormAlert type="error">{t('handover.admin.carTaken')}</FormAlert>
                  ) : (
                    <p className="rounded-2xl bg-amber-100 p-3 text-sm font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                      {t('handover.admin.noShow')}
                    </p>
                  ))}

                <fieldset className="space-y-2 border-t border-border pt-4">
                  <legend className="sr-only">{t(`handover.admin.${handover.mode}.checks`)}</legend>
                  <Check
                    checked={checkedId}
                    onChange={setCheckedId}
                    label={t(isReturn ? 'handover.admin.return.checkCondition' : 'handover.admin.checkId', { name: handover.user.fullName })}
                  />
                  <Check
                    checked={checkedLicense}
                    onChange={setCheckedLicense}
                    label={t(isReturn ? 'handover.admin.return.checkFuel' : 'handover.admin.checkLicense')}
                  />
                </fieldset>

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="secondary" className="h-11" onClick={reset}>
                    {t('confirm.cancel')}
                  </Button>
                  <Button
                    className="h-11"
                    disabled={!checkedId || !checkedLicense || tooEarly || handover.carTaken || loading}
                    onClick={submit}
                  >
                    {isReturn ? <Undo2 className="size-4" aria-hidden /> : <KeyRound className="size-4" aria-hidden />}
                    {loading
                      ? t('auth.loading')
                      : t(
                          isReturn
                            ? 'handover.admin.return.confirm'
                            : handover.status === 'NO_SHOW'
                              ? 'handover.admin.confirmLate'
                              : 'handover.admin.confirm',
                        )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {logSection}
    </>
  )
}

function Check({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border p-3 text-sm font-semibold">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-[var(--primary)]"
      />
      {label}
    </label>
  )
}
