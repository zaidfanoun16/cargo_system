import { UserPlus } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { PasswordInput } from '../../components/form/PasswordInput'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { errorKey } from '../../lib/errors'
import {
  MIN_PASSWORD_LENGTH,
  isEmail,
  isInternationalPhone,
  normalizePhone,
} from '../../lib/validation'
import { AuthLayout } from './AuthLayout'

type Form = {
  fullName: string
  email: string
  phoneNumber: string
  password: string
  confirmPassword: string
}

type Errors = Partial<Record<keyof Form, string>>

// Errors from the backend that belong to one field
const fieldOfError: Record<string, keyof Form> = {
  'errors.emailTaken': 'email',
  'errors.phoneTaken': 'phoneNumber',
  'errors.invalidPhone': 'phoneNumber',
}

export function RegisterPage() {
  const { t } = useTranslation()
  const { user, register } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<Form>({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<Errors>({})
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  function update(field: keyof Form, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    // Hide a field's error once the user starts fixing it
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }))
  }

  function validate(): Errors {
    const found: Errors = {}
    if (!form.fullName.trim()) found.fullName = t('errors.required')
    if (!isEmail(form.email)) found.email = t('errors.invalidEmail')
    if (!isInternationalPhone(form.phoneNumber)) found.phoneNumber = t('errors.invalidPhone')
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      found.password = t('errors.passwordTooShort', { count: MIN_PASSWORD_LENGTH })
    }
    if (form.confirmPassword !== form.password) found.confirmPassword = t('errors.passwordsDontMatch')
    return found
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)

    const found = validate()
    setErrors(found)
    if (Object.values(found).some(Boolean)) return

    setLoading(true)
    const email = form.email.trim()
    try {
      await register({
        fullName: form.fullName.trim(),
        email,
        phoneNumber: normalizePhone(form.phoneNumber),
        password: form.password,
      })
      navigate(`/verify-email?${new URLSearchParams({ email })}`, {
        state: { justRegistered: true },
      })
    } catch (caught) {
      const key = errorKey(caught)
      const field = fieldOfError[key]
      if (field) {
        setErrors({ [field]: t(key) })
      } else {
        setError(key)
      }
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      icon={<UserPlus className="size-6" aria-hidden />}
      title={t('auth.register.title')}
      subtitle={t('auth.register.subtitle')}
      footer={
        <>
          {t('auth.register.haveAccount')}{' '}
          <Link to="/login" className="font-bold text-text underline-offset-4 hover:underline">
            {t('nav.login')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <FormAlert type="error">{t(error)}</FormAlert>}

        <Field
          label={t('auth.fullName')}
          autoComplete="name"
          value={form.fullName}
          onChange={(event) => update('fullName', event.target.value)}
          error={errors.fullName}
          maxLength={100}
          required
        />

        <Field
          label={t('auth.email')}
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder="name@example.com"
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          error={errors.email}
          maxLength={150}
          required
        />

        <Field
          label={t('auth.phone')}
          type="tel"
          dir="ltr"
          autoComplete="tel"
          inputMode="tel"
          placeholder="+970 59 123 4567"
          value={form.phoneNumber}
          onChange={(event) => update('phoneNumber', event.target.value)}
          error={errors.phoneNumber}
          hint={t('auth.phoneHint')}
          className="[&_input]:text-start"
          required
        />

        <Field
          label={t('auth.password')}
          autoComplete="new-password"
          value={form.password}
          onChange={(event) => update('password', event.target.value)}
          error={errors.password}
          hint={t('auth.passwordHint', { count: MIN_PASSWORD_LENGTH })}
          required
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />

        <Field
          label={t('auth.confirmPassword')}
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={(event) => update('confirmPassword', event.target.value)}
          error={errors.confirmPassword}
          required
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />

        <Button type="submit" disabled={loading} className="h-12 text-base">
          {loading ? t('auth.loading') : t('auth.register.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
