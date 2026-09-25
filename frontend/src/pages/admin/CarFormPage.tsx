import { ArrowLeft } from 'lucide-react'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { Field, inputClass } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useFetch } from '../../hooks/useFetch'
import { useToast } from '../../hooks/useToast'
import type { AdminCar } from '../../lib/admin'
import { api } from '../../lib/api'
import { type Category, carName, categoryName } from '../../lib/cars'
import { errorKey } from '../../lib/errors'
import { AdminHeader } from './AdminLayout'
import { CarStatusBadge } from './AdminCarsPage'
import { CarImages } from './CarImages'

type Form = {
  brand: string
  brandAr: string
  model: string
  modelAr: string
  year: string
  color: string
  colorAr: string
  licensePlate: string
  pricePerDay: string
  pricePerHour: string
  categoryId: string
  status: AdminCar['status']
}

const empty: Form = {
  brand: '',
  brandAr: '',
  model: '',
  modelAr: '',
  year: String(new Date().getFullYear()),
  color: '',
  colorAr: '',
  licensePlate: '',
  pricePerDay: '',
  pricePerHour: '',
  categoryId: '',
  status: 'AVAILABLE',
}

function toForm(car: AdminCar): Form {
  return {
    brand: car.brand,
    brandAr: car.brandAr ?? '',
    model: car.model,
    modelAr: car.modelAr ?? '',
    year: String(car.year),
    color: car.color,
    colorAr: car.colorAr ?? '',
    licensePlate: car.licensePlate,
    pricePerDay: String(car.pricePerDay),
    pricePerHour: car.pricePerHour === null ? '' : String(car.pricePerHour),
    categoryId: String(car.category.id),
    status: car.status,
  }
}

// /admin/cars/new adds a car; /admin/cars/:id edits one and its photos
export function CarFormPage() {
  const { t } = useTranslation()
  const { id } = useParams()
  const carId = id === undefined ? null : Number(id)
  const car = useFetch<AdminCar>(carId ? `/cars/${carId}` : null)

  if (carId && !car.data) {
    return car.error ? (
      <FormAlert type="error">{t(errorKey(car.error))}</FormAlert>
    ) : (
      <div className="h-96 animate-pulse rounded-3xl bg-surface-muted" aria-hidden />
    )
  }

  // key: a fresh form for each car
  return <CarForm key={carId ?? 'new'} car={carId ? car.data : undefined} onSaved={car.reload} />
}

function CarForm({ car, onSaved }: { car?: AdminCar; onSaved: () => void }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const navigate = useNavigate()
  const toast = useToast()
  const categories = useFetch<Category[]>('/car-categories')

  const [form, setForm] = useState<Form>(car ? toForm(car) : empty)
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const set = (field: keyof Form) => (value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate() {
    const found: Partial<Record<keyof Form, string>> = {}
    for (const field of ['brand', 'model', 'color', 'licensePlate'] as const) {
      if (!form[field].trim()) found[field] = t('errors.required')
    }
    const year = Number(form.year)
    const maxYear = new Date().getFullYear() + 1
    if (!Number.isInteger(year) || year < 1900 || year > maxYear) found.year = t('admin.cars.yearRange', { max: maxYear })
    if (!(Number(form.pricePerDay) > 0)) found.pricePerDay = t('admin.cars.pricePositive')
    if (form.pricePerHour.trim() && !(Number(form.pricePerHour) > 0)) found.pricePerHour = t('admin.cars.pricePositive')
    if (!form.categoryId) found.categoryId = t('errors.required')
    return found
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    // Empty Arabic names and hourly price are sent as null to clear them
    const optional = (value: string) => value.trim() || null
    const body = {
      brand: form.brand.trim(),
      brandAr: optional(form.brandAr),
      model: form.model.trim(),
      modelAr: optional(form.modelAr),
      year: Number(form.year),
      color: form.color.trim(),
      colorAr: optional(form.colorAr),
      licensePlate: form.licensePlate.trim(),
      pricePerDay: Number(form.pricePerDay),
      pricePerHour: form.pricePerHour.trim() ? Number(form.pricePerHour) : null,
      categoryId: Number(form.categoryId),
      status: form.status,
    }

    setSaving(true)
    try {
      if (car) {
        await api(`/cars/${car.id}`, { method: 'PATCH', auth: true, body })
        toast.success(t('admin.cars.saved'))
        onSaved()
      } else {
        const created = await api<AdminCar>('/cars', { method: 'POST', auth: true, body })
        toast.success(t('admin.cars.created'))
        // Straight to the edit page, where photos can be added
        navigate(`/admin/cars/${created.id}`, { replace: true })
      }
    } catch (caught) {
      const key = errorKey(caught)
      if (key === 'admin.errors.plateTaken') setErrors({ licensePlate: t(key) })
      else setError(key)
    } finally {
      setSaving(false)
    }
  }

  const field = (name: keyof Form, label: string, extra: Record<string, unknown> = {}) => (
    <Field
      label={label}
      value={form[name]}
      onChange={(event) => set(name)(event.target.value)}
      error={errors[name]}
      {...extra}
    />
  )

  return (
    <>
      <Link to="/admin/cars" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-text">
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('admin.nav.cars')}
      </Link>
      <AdminHeader
        title={car ? carName(car, language) : t('admin.cars.add')}
        action={
          car && (
            <div className="flex items-center gap-3">
              <CarStatusBadge status={car.status} />
              <Link to={`/cars/${car.id}`} className="text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline">
                {t('admin.cars.viewPublic')}
              </Link>
            </div>
          )
        }
      />

      <div className="space-y-6">
        <form onSubmit={submit} noValidate className="rounded-3xl border border-border bg-surface p-5 sm:p-6">
          {error && (
            <div className="mb-5">
              <FormAlert type="error">{t(error)}</FormAlert>
            </div>
          )}

          <FormGroup title={t('admin.cars.names')}>
            {field('brand', t('admin.cars.brand'), { dir: 'ltr', placeholder: 'Toyota', maxLength: 100 })}
            {field('brandAr', t('admin.cars.brandAr'), { dir: 'rtl', placeholder: 'تويوتا', maxLength: 100 })}
            {field('model', t('admin.cars.model'), { dir: 'ltr', placeholder: 'Camry', maxLength: 100 })}
            {field('modelAr', t('admin.cars.modelAr'), { dir: 'rtl', placeholder: 'كامري', maxLength: 100 })}
            {field('color', t('admin.cars.color'), { dir: 'ltr', placeholder: 'White', maxLength: 100 })}
            {field('colorAr', t('admin.cars.colorAr'), { dir: 'rtl', placeholder: 'أبيض', maxLength: 100 })}
          </FormGroup>

          <FormGroup title={t('admin.cars.details')}>
            {field('licensePlate', t('admin.cars.plate'), { dir: 'ltr', maxLength: 50 })}
            {field('year', t('car.year'), { type: 'number', inputMode: 'numeric', dir: 'ltr' })}
            <SelectField
              label={t('admin.cars.category')}
              value={form.categoryId}
              onChange={set('categoryId')}
              error={errors.categoryId}
            >
              <option value="">{t('admin.cars.chooseCategory')}</option>
              {categories.data?.map((category) => (
                <option key={category.id} value={category.id}>
                  {categoryName(category, language)}
                </option>
              ))}
            </SelectField>
            <SelectField label={t('admin.cars.statusLabel')} value={form.status} onChange={set('status')}>
              {(['AVAILABLE', 'MAINTENANCE', 'INACTIVE'] as const).map((status) => (
                <option key={status} value={status}>
                  {t(`admin.cars.status.${status}`)}
                </option>
              ))}
            </SelectField>
          </FormGroup>

          <FormGroup title={t('admin.cars.prices')}>
            {field('pricePerDay', `${t('car.pricePerDay')} (₪)`, { type: 'number', inputMode: 'decimal', min: 0, step: '0.01', dir: 'ltr' })}
            {field('pricePerHour', `${t('car.pricePerHour')} (₪)`, {
              type: 'number',
              inputMode: 'decimal',
              min: 0,
              step: '0.01',
              dir: 'ltr',
              hint: t('admin.cars.hourlyHint'),
            })}
          </FormGroup>

          <div className="flex flex-wrap gap-2 border-t border-border pt-5">
            <Button type="submit" className="h-11" disabled={saving}>
              {saving ? t('auth.loading') : car ? t('account.save') : t('admin.cars.create')}
            </Button>
            <Link to="/admin/cars" className="inline-flex h-11 items-center rounded-xl px-4 text-sm font-semibold text-muted hover:bg-surface-muted">
              {t('confirm.cancel')}
            </Link>
          </div>
        </form>

        {car ? (
          <CarImages carId={car.id} images={car.images} onChange={onSaved} />
        ) : (
          <p className="rounded-2xl bg-surface-muted/70 p-4 text-sm text-muted">{t('admin.images.afterCreate')}</p>
        )}
      </div>
    </>
  )
}

function FormGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mb-6">
      <legend className="mb-3 text-sm font-extrabold">{title}</legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  )
}

function SelectField({
  label,
  value,
  onChange,
  error,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  children: ReactNode
}) {
  return (
    <Field
      label={label}
      error={error}
      render={(props) => (
        <select
          id={props.id}
          aria-invalid={props['aria-invalid']}
          aria-describedby={props['aria-describedby']}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          {children}
        </select>
      )}
    />
  )
}
