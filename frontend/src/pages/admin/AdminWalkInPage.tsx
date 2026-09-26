import { Ban, CalendarClock, CarFront, CircleCheck, KeyRound, Printer, RotateCcw, Search, UserPlus, UserRound } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { CarPhoto } from '../../components/cars/CarPhoto'
import { FormAlert } from '../../components/form/FormAlert'
import { Avatar } from '../../components/layout/UserMenu'
import { Button } from '../../components/ui/Button'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import type { AdminUser } from '../../lib/admin'
import { api } from '../../lib/api'
import { type CarsPage, carName } from '../../lib/cars'
import { addDays, formatDate, formatHour, toDateInput } from '../../lib/dates'
import { errorKey } from '../../lib/errors'
import { formatNumber, formatPrice } from '../../lib/format'
import { AdminHeader } from './AdminLayout'

type WalkInQuote = {
  hours: number
  available: boolean
  unavailableReason: 'maintenance' | 'inactive' | 'reserved' | null
  basePrice: number
  discountPercent: number
  totalPrice: number
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const RESULTS = 6

const fieldClass =
  'h-11 w-full rounded-xl border border-border bg-bg px-3 text-sm text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

// Local time "YYYY-MM-DD" and hour → ISO string
function atLocalHour(date: string, hour: number) {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, hour).toISOString()
}

// A customer at the office who wants a car now: pick them (or create
// their account), pick a free car and the return time, check their ID
// and license, and the car is booked and handed over in one step.
export function AdminWalkInPage() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const toast = useToast()

  // The rental starts when the page opens (the server uses the exact
  // time when booking); refreshed after each booking
  const [openedAt, setOpenedAt] = useState(() => Date.now())
  const tomorrow = new Date(openedAt + 24 * 60 * 60 * 1000)

  const [customer, setCustomer] = useState<AdminUser | null>(null)
  const [returnDate, setReturnDate] = useState(() => toDateInput(tomorrow))
  const [returnHour, setReturnHour] = useState(() => (tomorrow.getHours() + 1) % 24)
  const [carId, setCarId] = useState<number | null>(null)
  const [checkedId, setCheckedId] = useState(false)
  const [checkedLicense, setCheckedLicense] = useState(false)
  const [error, setError] = useState<string>()
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState<{ id: number; customer: string; car: string; endDate: string }>()

  const endDate = returnDate ? atLocalHour(returnDate, returnHour) : null
  const startDate = new Date(Math.floor(openedAt / 60000) * 60000).toISOString()
  const periodOk = endDate !== null && new Date(endDate).getTime() - openedAt >= 2 * 60 * 60 * 1000

  // Cars free from now until the return time
  const cars = useFetch<CarsPage>(
    periodOk ? `/cars?${new URLSearchParams({ startDate, endDate: endDate!, status: 'AVAILABLE', limit: '100' })}` : null,
  )
  const carsList = cars.data?.data ?? []
  const car = carsList.find((item) => item.id === carId) ?? null

  const quote = useFetch<WalkInQuote>(
    car && periodOk ? `/reservations/walk-in/quote?${new URLSearchParams({ carId: String(car.id), endDate: endDate! })}` : null,
    { auth: true },
  )
  const current = quote.loading ? undefined : quote.data

  const ready = customer && car && current?.available && checkedId && checkedLicense && !booking

  async function book() {
    if (!customer || !car || !endDate) return
    setBooking(true)
    setError(undefined)
    try {
      const reservation = await api<{ id: number }>('/reservations/walk-in', {
        method: 'POST',
        auth: true,
        body: { userId: customer.id, carId: car.id, endDate },
      })
      toast.success(t('walkIn.doneToast', { id: formatNumber(reservation.id, language) }))
      setDone({ id: reservation.id, customer: customer.fullName, car: carName(car, language), endDate })
    } catch (caught) {
      setError(errorKey(caught))
      quote.reload()
      cars.reload()
    } finally {
      setBooking(false)
    }
  }

  function reset() {
    const now = Date.now()
    const next = new Date(now + 24 * 60 * 60 * 1000)
    setOpenedAt(now)
    setDone(undefined)
    setCustomer(null)
    setCarId(null)
    setReturnDate(toDateInput(next))
    setReturnHour((next.getHours() + 1) % 24)
    setCheckedId(false)
    setCheckedLicense(false)
    setError(undefined)
  }

  const dateTime = (value: string) => formatDate(value, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' })

  if (done) {
    return (
      <>
        <AdminHeader title={t('admin.nav.walkIn')} />
        <div className="mx-auto max-w-md rounded-3xl border border-border bg-surface p-6 text-center" role="status">
          <CircleCheck className="mx-auto size-16 text-emerald-600 dark:text-emerald-400" aria-hidden />
          <h2 className="mt-4 text-xl font-extrabold">{t('walkIn.doneTitle')}</h2>
          <p className="mt-2 text-sm text-muted">
            {t('walkIn.doneText', { name: done.customer, car: done.car, date: dateTime(done.endDate) })}
          </p>
          <Link
            to={`/receipt/${done.id}?type=pickup`}
            target="_blank"
            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
          >
            <Printer className="size-4" aria-hidden />
            {t('handover.admin.pickup.print')}
          </Link>
          <Button variant="secondary" className="mt-2 h-11 w-full" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden />
            {t('walkIn.next')}
          </Button>
        </div>
      </>
    )
  }

  return (
    <>
      <AdminHeader title={t('admin.nav.walkIn')} subtitle={t('walkIn.subtitle')} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-6">
          <Step number={1} title={t('walkIn.customer')} icon={UserRound}>
            {customer ? (
              <div className="flex flex-wrap items-center gap-3">
                <Avatar name={customer.fullName} className="size-11 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{customer.fullName}</p>
                  <p className="truncate text-xs text-muted">
                    <span dir="ltr">{customer.phoneNumber}</span> · <span dir="ltr">{customer.email}</span>
                  </p>
                </div>
                <Button variant="secondary" className="h-10" onClick={() => setCustomer(null)}>
                  {t('walkIn.change')}
                </Button>
              </div>
            ) : (
              <CustomerPicker onPick={setCustomer} />
            )}
          </Step>

          <Step number={2} title={t('walkIn.carAndTime')} icon={CarFront}>
            <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
              <div>
                <p className="mb-1.5 text-sm font-semibold">{t('booking.pickup')}</p>
                <p className="flex h-11 items-center gap-2 rounded-xl border border-dashed border-border px-3 text-sm font-semibold">
                  <CalendarClock className="size-4 text-muted" aria-hidden />
                  {t('walkIn.now')}
                </p>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold">{t('booking.return')}</p>
                <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,7.5rem)] gap-2">
                  <input
                    type="date"
                    value={returnDate}
                    min={toDateInput(new Date(openedAt))}
                    max={toDateInput(addDays(new Date(openedAt), 90))}
                    onChange={(event) => setReturnDate(event.target.value)}
                    className={fieldClass}
                    aria-label={t('booking.returnDate')}
                  />
                  <select
                    value={returnHour}
                    onChange={(event) => setReturnHour(Number(event.target.value))}
                    className={fieldClass}
                    aria-label={t('booking.returnTime')}
                  >
                    {HOURS.map((hour) => (
                      <option key={hour} value={hour}>
                        {formatHour(hour, language)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {!periodOk ? (
              <p className="mt-4 text-sm font-semibold text-red-600 dark:text-red-400">{t('errors.minHours', { count: 2 })}</p>
            ) : !cars.data ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2" aria-hidden>
                {[0, 1].map((index) => (
                  <div key={index} className="h-24 animate-pulse rounded-2xl bg-surface-muted" />
                ))}
              </div>
            ) : carsList.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted">{t('walkIn.noCars')}</p>
            ) : (
              <div className="mt-4" role="radiogroup" aria-label={t('walkIn.freeCars')}>
                <p className="mb-2 text-xs font-bold text-muted">
                  {t('walkIn.freeCars')} ({formatNumber(carsList.length, language)})
                </p>
                <div className={`grid gap-3 sm:grid-cols-2 ${cars.loading ? 'opacity-60' : ''}`}>
                  {carsList.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={carId === item.id}
                      onClick={() => setCarId(item.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-2 text-start transition-colors ${
                        carId === item.id ? 'border-primary bg-primary-soft ring-2 ring-primary/30' : 'border-border hover:bg-surface-muted'
                      }`}
                    >
                      <CarPhoto url={item.images?.[0]?.url} alt="" className="h-16 w-24 shrink-0 rounded-xl" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{carName(item, language)}</span>
                        <span className="block text-xs text-muted">
                          {formatPrice(item.pricePerDay, language)} / {t('currency.perDay')}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </Step>
        </div>

        {/* Summary and confirmation */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <Step number={3} title={t('walkIn.confirm')} icon={KeyRound}>
            <dl className="space-y-2 text-sm">
              <SummaryRow label={t('walkIn.customer')} value={customer?.fullName ?? '—'} />
              <SummaryRow label={t('booking.car')} value={car ? carName(car, language) : '—'} />
              <SummaryRow label={t('booking.return')} value={endDate && periodOk ? dateTime(endDate) : '—'} />
              {current && (
                <>
                  <SummaryRow
                    label={t('booking.duration')}
                    value={[
                      Math.floor(current.hours / 24) > 0 &&
                        t('booking.days', { count: Math.floor(current.hours / 24), formatted: formatNumber(Math.floor(current.hours / 24), language) }),
                      current.hours % 24 > 0 && t('booking.hours', { count: current.hours % 24, formatted: formatNumber(current.hours % 24, language) }),
                    ]
                      .filter(Boolean)
                      .join(t('booking.and'))}
                  />
                  {current.discountPercent > 0 && (
                    <SummaryRow
                      label={t('booking.discount', { percent: formatNumber(current.discountPercent, language) })}
                      value={`−${formatPrice(Math.round((current.basePrice - current.totalPrice) * 100) / 100, language)}`}
                    />
                  )}
                  <div className="flex justify-between gap-2 border-t border-border pt-2 text-base font-extrabold">
                    <dt>{t('booking.total')}</dt>
                    <dd>{formatPrice(current.totalPrice, language)}</dd>
                  </div>
                </>
              )}
            </dl>

            {current && !current.available && (
              <div className="mt-3">
                <FormAlert type="error">{t(`booking.unavailable.${current.unavailableReason}`)}</FormAlert>
              </div>
            )}

            <fieldset className="mt-4 space-y-2">
              <legend className="sr-only">{t('handover.admin.pickup.checks')}</legend>
              <Check
                checked={checkedId}
                onChange={setCheckedId}
                label={t('handover.admin.checkId', { name: customer?.fullName ?? t('walkIn.theCustomer') })}
              />
              <Check checked={checkedLicense} onChange={setCheckedLicense} label={t('handover.admin.checkLicense')} />
            </fieldset>

            {error && (
              <div className="mt-3">
                <FormAlert type="error">{t(error)}</FormAlert>
              </div>
            )}

            <Button className="mt-4 h-12 w-full text-base" disabled={!ready} onClick={book}>
              <KeyRound className="size-5" aria-hidden />
              {booking ? t('auth.loading') : t('walkIn.book')}
            </Button>
          </Step>
        </div>
      </div>
    </>
  )
}

// Find the customer by name, phone or email, or create their account
function CustomerPicker({ onPick }: { onPick: (user: AdminUser) => void }) {
  const { t } = useTranslation()
  const users = useFetch<AdminUser[]>('/users', { auth: true })
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)

  const query = search.trim().toLowerCase().replace(/\s/g, '')
  const results = query
    ? (users.data ?? [])
        .filter((user) => user.role === 'USER')
        .filter((user) =>
          [user.fullName.toLowerCase().replace(/\s/g, ''), user.email.toLowerCase(), (user.phoneNumber ?? '').replace(/\s/g, '')].some(
            (value) => value.includes(query),
          ),
        )
        .slice(0, RESULTS)
    : []

  if (creating) {
    return <NewCustomerForm onCreated={onPick} onCancel={() => setCreating(false)} />
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative block flex-1">
          <span className="sr-only">{t('walkIn.search')}</span>
          <Search className="pointer-events-none absolute start-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('walkIn.search')}
            className={`${fieldClass} ps-10`}
          />
        </label>
        <Button variant="secondary" className="h-11" onClick={() => setCreating(true)}>
          <UserPlus className="size-4" aria-hidden />
          {t('walkIn.newCustomer')}
        </Button>
      </div>

      {query && (
        <ul className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {results.length === 0 ? (
            <li className="p-4 text-center text-sm text-muted">{t('walkIn.noResults')}</li>
          ) : (
            results.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={user.bookingBlocked}
                  onClick={() => onPick(user)}
                  className="flex w-full items-center gap-3 p-3 text-start hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Avatar name={user.fullName} className="size-9 text-sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{user.fullName}</span>
                    <span className="block truncate text-xs text-muted">
                      <span dir="ltr">{user.phoneNumber}</span> · <span dir="ltr">{user.email}</span>
                    </span>
                  </span>
                  {user.bookingBlocked && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-800 dark:bg-red-950 dark:text-red-300">
                      <Ban className="size-3.5" aria-hidden />
                      {t('admin.users.blocked')}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  )
}

function NewCustomerForm({ onCreated, onCancel }: { onCreated: (user: AdminUser) => void; onCancel: () => void }) {
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('+970')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(undefined)
    try {
      onCreated(
        await api<AdminUser>('/users/walk-in', {
          method: 'POST',
          auth: true,
          body: { fullName: fullName.trim(), phoneNumber: phoneNumber.replace(/\s/g, ''), email: email.trim() },
        }),
      )
    } catch (caught) {
      setError(errorKey(caught))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold">{t('auth.fullName')}</span>
          <input required value={fullName} onChange={(event) => setFullName(event.target.value)} className={fieldClass} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t('auth.phone')}</span>
          <input
            required
            type="tel"
            dir="ltr"
            value={phoneNumber}
            onChange={(event) => setPhoneNumber(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-semibold">{t('auth.email')}</span>
          <input required type="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} className={fieldClass} />
        </label>
      </div>
      <p className="text-xs text-muted">{t('walkIn.newCustomerNote')}</p>
      {error && <FormAlert type="error">{t(error)}</FormAlert>}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="secondary" className="h-11" onClick={onCancel}>
          {t('confirm.cancel')}
        </Button>
        <Button type="submit" className="h-11" disabled={saving}>
          <UserPlus className="size-4" aria-hidden />
          {saving ? t('auth.loading') : t('walkIn.addCustomer')}
        </Button>
      </div>
    </form>
  )
}

function Step({ number, title, icon: Icon, children }: { number: number; title: string; icon: typeof UserRound; children: ReactNode }) {
  const { i18n } = useTranslation()
  return (
    <section className="rounded-3xl border border-border bg-surface p-4 sm:p-5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold">
        <span className="grid size-8 place-items-center rounded-full bg-primary text-sm text-primary-fg">
          {formatNumber(number, i18n.language)}
        </span>
        <Icon className="size-5 text-muted" aria-hidden />
        {title}
      </h2>
      {children}
    </section>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted">{label}</dt>
      <dd className="text-end font-semibold">{value}</dd>
    </div>
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
