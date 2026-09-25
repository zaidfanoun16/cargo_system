import { KeyRound } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { errorKey } from '../../lib/errors'
import { isEmail } from '../../lib/validation'
import { AuthLayout } from './AuthLayout'

// Step 1 of resetting a forgotten password: email a code
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { forgotPassword } = useAuth()
  const navigate = useNavigate()
  const emailFromLogin = (useLocation().state as { email?: string } | null)?.email ?? ''

  const [email, setEmail] = useState(emailFromLogin)
  const [emailError, setEmailError] = useState<string>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)

    if (!isEmail(email)) {
      setEmailError(t('errors.invalidEmail'))
      return
    }
    setEmailError(undefined)

    setLoading(true)
    try {
      await forgotPassword(email.trim())
      navigate(`/reset-password?${new URLSearchParams({ email: email.trim() })}`)
    } catch (caught) {
      setError(errorKey(caught))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      icon={<KeyRound className="size-6" aria-hidden />}
      title={t('auth.forgot.title')}
      subtitle={t('auth.forgot.subtitle')}
      footer={
        <Link to="/login" className="font-bold text-text underline-offset-4 hover:underline">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <FormAlert type="error">{t(error)}</FormAlert>}

        <Field
          label={t('auth.email')}
          type="email"
          dir="ltr"
          autoComplete="email"
          placeholder="name@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
          required
        />

        <Button type="submit" disabled={loading} className="h-12 text-base">
          {loading ? t('auth.loading') : t('auth.forgot.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
