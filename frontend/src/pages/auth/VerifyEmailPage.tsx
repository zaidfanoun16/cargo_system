import { MailCheck } from 'lucide-react'
import { type FormEvent, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'

import { CodeInput } from '../../components/form/CodeInput'
import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useCooldown } from '../../hooks/useCooldown'
import { errorKey } from '../../lib/errors'
import { isEmail } from '../../lib/validation'
import { AuthLayout } from './AuthLayout'
import type { LoginState } from './LoginPage'

const RESEND_SECONDS = 60

// Step 2 of creating an account: enter the 6-digit code from the email
export function VerifyEmailPage() {
  const { t } = useTranslation()
  const { verifyEmail, resendVerification } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const justRegistered = Boolean((useLocation().state as { justRegistered?: boolean } | null)?.justRegistered)

  const emailFromLink = searchParams.get('email') ?? ''
  const [email, setEmail] = useState(emailFromLink)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [loading, setLoading] = useState(false)
  const cooldown = useCooldown()

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    setNotice(undefined)

    if (!isEmail(email)) {
      setError('errors.invalidEmail')
      return
    }

    setLoading(true)
    try {
      await verifyEmail(email.trim(), code)
      navigate('/login', {
        replace: true,
        state: { notice: 'verified', email: email.trim() } satisfies LoginState,
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

    if (!isEmail(email)) {
      setError('errors.invalidEmail')
      return
    }

    try {
      await resendVerification(email.trim())
      setNotice('auth.verify.resent')
      setCode('')
      cooldown.start(RESEND_SECONDS)
    } catch (caught) {
      const key = errorKey(caught)
      // Already verified: nothing left to do but sign in
      if (key === 'errors.alreadyVerified') {
        navigate('/login', { replace: true, state: { email: email.trim() } satisfies LoginState })
        return
      }
      setError(key)
    }
  }

  return (
    <AuthLayout
      icon={<MailCheck className="size-6" aria-hidden />}
      title={t('auth.verify.title')}
      subtitle={
        emailFromLink ? (
          <Trans
            i18nKey="auth.verify.subtitle"
            values={{ email: emailFromLink }}
            components={{ email: <bdi className="font-bold text-text" /> }}
          />
        ) : (
          t('auth.verify.subtitleNoEmail')
        )
      }
      footer={
        <Link to="/register" className="font-bold text-text underline-offset-4 hover:underline">
          {t('auth.verify.wrongEmail')}
        </Link>
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        {justRegistered && !error && !notice && <FormAlert type="success">{t('auth.verify.sent')}</FormAlert>}
        {notice && <FormAlert type="success">{t(notice)}</FormAlert>}
        {error && <FormAlert type="error">{t(error)}</FormAlert>}

        {!emailFromLink && (
          <Field
            label={t('auth.email')}
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        )}

        <CodeInput value={code} onChange={setCode} invalid={error === 'errors.invalidCode'} autoFocus={Boolean(emailFromLink)} />

        <Button type="submit" disabled={loading} className="h-12 text-base">
          {loading ? t('auth.loading') : t('auth.verify.submit')}
        </Button>

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
      </form>
    </AuthLayout>
  )
}
