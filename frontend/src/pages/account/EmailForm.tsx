import { type FormEvent, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'

import { CodeInput } from '../../components/form/CodeInput'
import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { PasswordInput } from '../../components/form/PasswordInput'
import { Button } from '../../components/ui/Button'
import { useCooldown } from '../../hooks/useCooldown'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { authStore, type User } from '../../lib/auth-store'
import { errorKey } from '../../lib/errors'
import { isEmail } from '../../lib/validation'
import { Section } from './Section'

const RESEND_SECONDS = 60

// Two steps: the new email and the password, then the code sent to the
// new email. The email changes only once the code is confirmed.
export function EmailForm({ user }: { user: User }) {
  const { t } = useTranslation()
  const toast = useToast()
  const cooldown = useCooldown()

  const [newEmail, setNewEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'request' | 'confirm'>('request')
  const [errors, setErrors] = useState<{ newEmail?: string; password?: string }>({})
  const [error, setError] = useState<string>()
  const [notice, setNotice] = useState<string>()
  const [loading, setLoading] = useState(false)

  async function sendCode() {
    await api('/users/profile/email', {
      method: 'PATCH',
      auth: true,
      body: { newEmail: newEmail.trim(), password },
    })
    cooldown.start(RESEND_SECONDS)
  }

  async function request(event: FormEvent) {
    event.preventDefault()
    setError(undefined)

    const found = {
      newEmail: !isEmail(newEmail)
        ? t('errors.invalidEmail')
        : newEmail.trim().toLowerCase() === user.email.toLowerCase()
          ? t('errors.sameEmail')
          : undefined,
      password: password ? undefined : t('errors.required'),
    }
    setErrors(found)
    if (found.newEmail || found.password) return

    setLoading(true)
    try {
      await sendCode()
      setStep('confirm')
    } catch (caught) {
      const key = errorKey(caught)
      if (key === 'errors.currentPasswordWrong') setErrors({ password: t(key) })
      else if (key === 'errors.emailTaken' || key === 'errors.sameEmail') setErrors({ newEmail: t(key) })
      else setError(key)
    } finally {
      setLoading(false)
    }
  }

  async function confirmCode(event: FormEvent) {
    event.preventDefault()
    setError(undefined)
    setNotice(undefined)
    setLoading(true)
    try {
      const updated = await api<User>('/users/profile/email/confirm', {
        method: 'POST',
        auth: true,
        body: { code },
      })
      authStore.updateUser({ email: updated.email })
      toast.success(t('account.emailChanged'))
      reset()
    } catch (caught) {
      setError(errorKey(caught))
      setCode('')
    } finally {
      setLoading(false)
    }
  }

  async function resend() {
    setError(undefined)
    try {
      await sendCode()
      setNotice('auth.verify.resent')
      setCode('')
    } catch (caught) {
      setError(errorKey(caught))
    }
  }

  function reset() {
    setStep('request')
    setNewEmail('')
    setPassword('')
    setCode('')
    setError(undefined)
    setNotice(undefined)
  }

  return (
    <Section title={t('account.emailTitle')} description={t('account.emailText')}>
      {step === 'request' ? (
        <form onSubmit={request} noValidate className="flex flex-col gap-5">
          {error && <FormAlert type="error">{t(error)}</FormAlert>}
          <p className="text-sm">
            {t('account.currentEmail')}{' '}
            <bdi className="font-bold" dir="ltr">
              {user.email}
            </bdi>
          </p>
          <Field
            label={t('account.newEmail')}
            type="email"
            dir="ltr"
            autoComplete="email"
            placeholder="name@example.com"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            error={errors.newEmail}
            maxLength={150}
          />
          <Field
            label={t('auth.password')}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            error={errors.password}
            hint={t('account.passwordToConfirm')}
            render={(inputProps) => <PasswordInput {...inputProps} />}
          />
          <Button type="submit" className="h-11 self-start" disabled={loading}>
            {loading ? t('auth.loading') : t('auth.forgot.submit')}
          </Button>
        </form>
      ) : (
        <form onSubmit={confirmCode} noValidate className="flex flex-col gap-5">
          {notice && <FormAlert type="success">{t(notice)}</FormAlert>}
          {error && <FormAlert type="error">{t(error)}</FormAlert>}
          <p className="text-sm leading-relaxed text-muted">
            <Trans
              i18nKey="account.codeSent"
              values={{ email: newEmail.trim() }}
              components={{ email: <bdi className="font-bold text-text" /> }}
            />
          </p>
          <CodeInput value={code} onChange={setCode} invalid={error === 'errors.invalidCode'} autoFocus />
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" className="h-11" disabled={loading || code.length !== 6}>
              {loading ? t('auth.loading') : t('account.confirmEmail')}
            </Button>
            <button
              type="button"
              onClick={resend}
              disabled={cooldown.secondsLeft > 0}
              className="text-sm font-bold underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:font-semibold disabled:text-muted disabled:no-underline"
            >
              {cooldown.secondsLeft > 0 ? t('auth.resendIn', { seconds: cooldown.secondsLeft }) : t('auth.resend')}
            </button>
            <button type="button" onClick={reset} className="text-sm font-semibold text-muted hover:text-text">
              {t('account.useAnotherEmail')}
            </button>
          </div>
        </form>
      )}
    </Section>
  )
}
