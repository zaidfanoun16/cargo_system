import { LogIn } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'

import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { PasswordInput } from '../../components/form/PasswordInput'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { errorKey } from '../../lib/errors'
import { isEmail } from '../../lib/validation'
import { AuthLayout } from './AuthLayout'

// Other pages pass a notice (e.g. "email verified") and the email to fill in.
// "from" is the page to return to after signing in.
export type LoginState = {
  notice?: 'verified' | 'passwordReset'
  email?: string
  from?: string
}

export function LoginPage() {
  const { t } = useTranslation()
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const state = (useLocation().state ?? {}) as LoginState

  const [email, setEmail] = useState(state.email ?? '')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState<string>()
  const [passwordError, setPasswordError] = useState<string>()
  const [error, setError] = useState<string>()
  const [loading, setLoading] = useState(false)

  if (user && !loading) {
    return <Navigate to={state.from ?? '/'} replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)

    const badEmail = !isEmail(email)
    setEmailError(badEmail ? t('errors.invalidEmail') : undefined)
    setPasswordError(password ? undefined : t('errors.required'))
    if (badEmail || !password) return

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(state.from ?? '/', { replace: true })
    } catch (caught) {
      setError(errorKey(caught))
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      icon={<LogIn className="size-6" aria-hidden />}
      title={t('auth.login.title')}
      subtitle={t('auth.login.subtitle')}
      footer={
        <>
          {t('auth.login.noAccount')}{' '}
          <Link to="/register" className="font-bold text-text underline-offset-4 hover:underline">
            {t('auth.login.createAccount')}
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {state.notice && !error && <FormAlert type="success">{t(`auth.notice.${state.notice}`)}</FormAlert>}

        {error && (
          <FormAlert type="error">
            {t(error)}
            {error === 'errors.notVerified' && (
              <Link
                to={`/verify-email?${new URLSearchParams({ email: email.trim() })}`}
                className="mt-1 block font-bold underline underline-offset-4"
              >
                {t('auth.login.verifyNow')}
              </Link>
            )}
          </FormAlert>
        )}

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

        <div className="flex flex-col gap-1.5">
          <Field
            label={t('auth.password')}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={passwordError}
            required
            render={(inputProps) => <PasswordInput {...inputProps} />}
          />
          <Link
            to="/forgot-password"
            state={{ email: email.trim() }}
            className="self-end text-sm font-semibold text-muted underline-offset-4 hover:text-text hover:underline"
          >
            {t('auth.login.forgot')}
          </Link>
        </div>

        <Button type="submit" disabled={loading} className="h-12 text-base">
          {loading ? t('auth.loading') : t('auth.login.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
