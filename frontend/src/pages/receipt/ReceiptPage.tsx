import { ArrowRight, Printer } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams, useSearchParams } from 'react-router-dom'

import { FormAlert } from '../../components/form/FormAlert'
import { LogoMark } from '../../components/layout/Logo'
import { Button } from '../../components/ui/Button'
import { useFetch } from '../../hooks/useFetch'
import { type Car, carName, colorName } from '../../lib/cars'
import { formatDate } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'

type Receipt = {
  id: number
  startDate: string
  endDate: string
  basePrice: number
  discountPercent: number
  totalPrice: number
  pickedUpAt: string
  returnedAt: string | null
  user: { fullName: string; email: string; phoneNumber: string | null }
  car: Pick<Car, 'brand' | 'brandAr' | 'model' | 'modelAr' | 'year' | 'color' | 'colorAr'> & {
    licensePlate: string
    category: { name: string; nameAr: string | null } | null
  }
  pickedUpBy: { fullName: string } | null
  returnedBy: { fullName: string } | null
}

const HOUR_IN_MS = 60 * 60 * 1000

// The receipt handed to the customer when they pick up the car
// (?type=pickup) or return it (?type=return). Opens in its own tab
// without the site's header, and prints on one A4 page.
export function ReceiptPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const { id } = useParams()
  const [params] = useSearchParams()
  const receipt = useFetch<Receipt>(`/reservations/${id}/receipt`, { auth: true })

  const data = receipt.data
  // A return receipt only exists once the car is back
  const type = params.get('type') === 'return' && data?.returnedAt ? 'return' : 'pickup'

  const dateTime = (value: string) =>
    formatDate(value, language, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  const hours = (count: number) => t('booking.hours', { count, formatted: formatNumber(count, language) })
  const days = (count: number) => t('booking.days', { count, formatted: formatNumber(count, language) })
  // Hours past the return time, rounded up
  const lateness = (due: string, returned: string) => {
    const late = Math.ceil((new Date(returned).getTime() - new Date(due).getTime()) / HOUR_IN_MS)
    return late > 0 ? t('receipt.late', { duration: hours(late) }) : t('receipt.onTime')
  }
  const duration = (from: string, to: string) => {
    const total = Math.round((new Date(to).getTime() - new Date(from).getTime()) / HOUR_IN_MS)
    return [Math.floor(total / 24) > 0 && days(Math.floor(total / 24)), total % 24 > 0 && hours(total % 24)]
      .filter(Boolean)
      .join(t('booking.and'))
  }

  return (
    <div className="min-h-dvh bg-bg py-6 print:bg-white print:py-0">
      {/* Toolbar, not printed */}
      <div className="mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3 px-4 print:hidden">
        <Link to="/admin/handover" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
          <ArrowRight className="size-4 ltr:rotate-180" aria-hidden />
          {t('receipt.back')}
        </Link>
        <Button className="h-11" onClick={() => window.print()} disabled={!data}>
          <Printer className="size-4" aria-hidden />
          {t('receipt.print')}
        </Button>
      </div>

      {receipt.error && !receipt.loading ? (
        <div className="mx-auto max-w-md px-4">
          <FormAlert type="error">{t(errorKey(receipt.error))}</FormAlert>
        </div>
      ) : !data ? (
        <div className="mx-auto h-[297mm] max-w-[210mm] animate-pulse rounded-3xl bg-surface-muted" />
      ) : (
        <article className="paper mx-auto max-w-[210mm] bg-surface p-8 text-sm text-text shadow-sm sm:rounded-3xl print:max-w-none print:p-0 print:shadow-none">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-primary pb-5">
            <div dir="ltr" className="flex items-center gap-2">
              <LogoMark className="size-11" />
              <span className="text-2xl font-extrabold tracking-tight">
                Car<span className="font-medium text-muted">Go</span>
              </span>
            </div>
            <div className="text-end">
              <h1 className="text-2xl font-extrabold">{t(`receipt.${type}.title`)}</h1>
              <p className="mt-1 text-muted">
                {t('receipt.number')}:{' '}
                <span dir="ltr" className="font-bold text-text">
                  {type === 'return' ? 'R' : 'P'}-{String(data.id).padStart(6, '0')}
                </span>
              </p>
              <p className="text-muted">
                {t('receipt.issued')}: {dateTime(type === 'return' ? data.returnedAt! : data.pickedUpAt)}
              </p>
            </div>
          </header>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            <Section title={t('receipt.customer')}>
              <Row label={t('receipt.name')} value={data.user.fullName} />
              {data.user.phoneNumber && <Row label={t('receipt.phone')} value={<span dir="ltr">{data.user.phoneNumber}</span>} />}
              <Row label={t('receipt.email')} value={<span dir="ltr">{data.user.email}</span>} />
            </Section>

            <Section title={t('receipt.car')}>
              <Row label={t('receipt.model')} value={carName(data.car, language)} />
              <Row label={t('receipt.year')} value={formatNumber(data.car.year, language)} />
              <Row label={t('receipt.color')} value={colorName(data.car, language)} />
              <Row label={t('receipt.plate')} value={<span dir="ltr">{data.car.licensePlate}</span>} />
              {data.car.category && (
                <Row
                  label={t('receipt.category')}
                  value={language === 'ar' ? data.car.category.nameAr || data.car.category.name : data.car.category.name}
                />
              )}
            </Section>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 print:grid-cols-2">
            <Section title={t('receipt.rental')}>
              <Row label={t('receipt.booking')} value={formatNumber(data.id, language)} />
              <Row label={t('receipt.pickupDue')} value={dateTime(data.startDate)} />
              <Row label={t('receipt.returnDue')} value={dateTime(data.endDate)} />
              <Row label={t('receipt.duration')} value={duration(data.startDate, data.endDate)} />
            </Section>

            <Section title={t(`receipt.${type}.details`)}>
              <Row label={t('receipt.pickedUpAt')} value={dateTime(data.pickedUpAt)} />
              {data.pickedUpBy && <Row label={t('receipt.pickedUpBy')} value={data.pickedUpBy.fullName} />}
              {type === 'return' && data.returnedAt && (
                <>
                  <Row label={t('receipt.returnedAt')} value={dateTime(data.returnedAt)} />
                  {data.returnedBy && <Row label={t('receipt.returnedBy')} value={data.returnedBy.fullName} />}
                  <Row label={t('receipt.lateness')} value={lateness(data.endDate, data.returnedAt)} />
                </>
              )}
            </Section>
          </div>

          {/* Price */}
          <Section title={t('receipt.amount')} className="mt-6">
            <Row label={t('booking.basePrice')} value={formatPrice(data.basePrice, language)} />
            {data.discountPercent > 0 && (
              <Row
                label={t('booking.discount', { percent: formatNumber(data.discountPercent, language) })}
                value={`−${formatPrice(Math.round((data.basePrice - data.totalPrice) * 100) / 100, language)}`}
              />
            )}
            <div className="mt-1 flex justify-between gap-3 border-t-2 border-primary pt-2 text-base font-extrabold">
              <span>{t('receipt.total')}</span>
              <span>{formatPrice(data.totalPrice, language)}</span>
            </div>
          </Section>

          {/* Terms */}
          <Section title={t('receipt.terms')} className="mt-6">
            <ul className="list-disc space-y-1 ps-5 text-muted">
              {(t(`receipt.${type}.terms`, { returnObjects: true }) as string[]).map((term) => (
                <li key={term}>{term}</li>
              ))}
            </ul>
          </Section>

          {/* Signatures */}
          <div className="mt-10 grid grid-cols-2 gap-8">
            {[t('receipt.staffSignature'), t('receipt.customerSignature')].map((label) => (
              <div key={label}>
                <div className="h-16 border-b border-dashed border-text/60" />
                <p className="mt-2 text-center font-semibold text-muted">{label}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-center text-xs text-muted">{t('receipt.thanks')}</p>
        </article>
      )}
    </div>
  )
}

function Section({ title, className = '', children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section className={`break-inside-avoid ${className}`}>
      <h2 className="mb-2 border-b border-border pb-1.5 text-xs font-extrabold uppercase tracking-wide text-muted">{title}</h2>
      <dl className="space-y-1.5">{children}</dl>
    </section>
  )
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-semibold">{value}</dd>
    </div>
  )
}
