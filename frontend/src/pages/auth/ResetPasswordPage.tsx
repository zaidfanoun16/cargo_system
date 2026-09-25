import { ShieldCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'

import { CodeInput } from '../../components/form/CodeInput'
import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { PasswordInput } from '../../components/form/PasswordInput'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useCooldown } from '../../hooks/useCooldown'
import { errorKey } from '../../lib/errors'
import { MIN_PASSWORD_LENGTH } from '../../lib/validation'
import { AuthLayout } from './AuthLayout'
import type { LoginState } from './LoginPage'

const RESEND_SECONDS = 60

// Step 2 of resetting a forgotten password: the code and a new password
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { resetPassword, forgotPassword } = useAuth()
  const navigate = useNavigate()
  const email = useSearchParams()[0].get('email') ?? ''

  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string>()
  const [confirmError, setConfirmError] = useState<string>()
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [loading, setLoading] = useState(false)
  const cooldown = useCooldown()

  // The email comes from the previous step; without it, start again
  if (!email) {
    return <Navigate to="/forgot-password" replace />
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    setNotice(undefined)

    const tooShort = password.length < MIN_PASSWORD_LENGTH
    const mismatch = confirmPassword !== password
    setPasswordError(tooShort ? t('errors.passwordTooShort', { count: MIN_PASSWORD_LENGTH }) : undefined)
    setConfirmError(mismatch ? t('errors.passwordsDontMatch') : undefined)
    if (tooShort || mismatch) return

    setLoading(true)
    try {
      await resetPassword(email, code, password)
      navigate('/login', {
        replace: true,
        state: { notice: 'passwordReset', email } satisfies LoginState,
      })
    } catch (caught) {
      setError(errorKey(caught))
      setCode('')
      setLoading(false)
    }
  }

  async function resend() {
    setError(undefined)
    setNotice(undefined)
    try {
      await forgotPassword(email)
      setNotice('auth.verify.resent')
      setCode('')
      cooldown.start(RESEND_SECONDS)
    } catch (caught) {
      setError(errorKey(caught))
    }
  }

  return (
    <AuthLayout
      icon={<ShieldCheck className="size-6" aria-hidden />}
      title={t('auth.reset.title')}
      subtitle={
        <Trans
          i18nKey="auth.reset.subtitle"
          values={{ email }}
          components={{ email: <bdi className="font-bold text-text" /> }}
        />
      }
      footer={
        <Link to="/login" className="font-bold text-text underline-offset-4 hover:underline">
          {t('auth.backToLogin')}
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {notice && <FormAlert type="success">{t(notice)}</FormAlert>}
        {error && <FormAlert type="error">{t(error)}</FormAlert>}

        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold">{t('auth.codeLabel')}</p>
          <CodeInput value={code} onChange={setCode} invalid={error === 'errors.invalidCode'} autoFocus />
          <p className="text-center text-sm text-muted">
            {t('auth.verify.noCode')}{' '}
            <button
              type="button"
              onClick={resend}
              disabled={cooldown.secondsLeft > 0}
              className="font-bold text-text underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:font-semibold disabled:text-muted disabled:no-underline"
            >
              {cooldown.secondsLeft > 0
                ? t('auth.resendIn', { seconds: cooldown.secondsLeft })
                : t('auth.resend')}
            </button>
          </p>
        </div>

        <Field
          label={t('auth.newPassword')}
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={passwordError}
          hint={t('auth.passwordHint', { count: MIN_PASSWORD_LENGTH })}
          required
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />

        <Field
          label={t('auth.confirmPassword')}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          error={confirmError}
          required
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />

        <Button type="submit" disabled={loading} className="h-12 text-base">
          {loading ? t('auth.loading') : t('auth.reset.submit')}
        </Button>
      </form>
    </AuthLayout>
  )
}
