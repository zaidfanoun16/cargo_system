import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { PasswordInput } from '../../components/form/PasswordInput'
import { Button } from '../../components/ui/Button'
import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import type { User } from '../../lib/auth-store'
import { errorKey } from '../../lib/errors'
import { MIN_PASSWORD_LENGTH } from '../../lib/validation'
import { Section } from './Section'

export function PasswordForm({ user }: { user: User }) {
  const { t } = useTranslation()
  const { login } = useAuth()
  const confirm = useConfirm()
  const toast = useToast()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; repeat?: string }>({})
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)

    const found = {
      current: current ? undefined : t('errors.required'),
      next:
        next.length < MIN_PASSWORD_LENGTH
          ? t('errors.passwordTooShort', { count: MIN_PASSWORD_LENGTH })
          : next === current
            ? t('errors.samePassword')
            : undefined,
      repeat: repeat === next ? undefined : t('errors.passwordsDontMatch'),
    }
    setErrors(found)
    if (found.current || found.next || found.repeat) return

    const confirmed = await confirm({
      title: t('account.passwordConfirmTitle'),
      message: t('account.passwordConfirmText'),
      confirmLabel: t('account.changePassword'),
    })
    if (!confirmed) return

    setSaving(true)
    try {
      await api('/users/profile/password', {
        method: 'PATCH',
        auth: true,
        body: { currentPassword: current, newPassword: next },
      })
      // Changing the password signs out every session, this one included,
      // so sign in again with the new password to stay logged in here
      await login(user.email, next)
      setCurrent('')
      setNext('')
      setRepeat('')
      toast.success(t('account.passwordChanged'))
    } catch (caught) {
      const key = errorKey(caught)
      if (key === 'errors.currentPasswordWrong') setErrors({ current: t(key) })
      else setError(key)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title={t('account.passwordTitle')} description={t('account.passwordText')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <FormAlert type="error">{t(error)}</FormAlert>}
        <Field
          label={t('account.currentPassword')}
          autoComplete="current-password"
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          error={errors.current}
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />
        <Field
          label={t('auth.newPassword')}
          autoComplete="new-password"
          value={next}
          onChange={(event) => setNext(event.target.value)}
          error={errors.next}
          hint={t('auth.passwordHint', { count: MIN_PASSWORD_LENGTH })}
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />
        <Field
          label={t('auth.confirmPassword')}
          autoComplete="new-password"
          value={repeat}
          onChange={(event) => setRepeat(event.target.value)}
          error={errors.repeat}
          render={(inputProps) => <PasswordInput {...inputProps} />}
        />
        <Button type="submit" className="h-11 self-start" disabled={saving}>
          {saving ? t('auth.loading') : t('account.changePassword')}
        </Button>
      </form>
    </Section>
  )
}
