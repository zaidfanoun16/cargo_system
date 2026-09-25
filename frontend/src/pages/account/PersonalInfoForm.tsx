import { type FormEvent, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Field } from '../../components/form/Field'
import { FormAlert } from '../../components/form/FormAlert'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../hooks/useToast'
import { api } from '../../lib/api'
import { authStore, type User } from '../../lib/auth-store'
import { errorKey } from '../../lib/errors'
import { isInternationalPhone, normalizePhone } from '../../lib/validation'
import { Section } from './Section'

// Name and WhatsApp number
export function PersonalInfoForm({ user }: { user: User }) {
  const { t } = useTranslation()
  const toast = useToast()

  const [fullName, setFullName] = useState(user.fullName)
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber ?? '')
  const [errors, setErrors] = useState<{ fullName?: string; phoneNumber?: string }>({})
  const [error, setError] = useState<string>()
  const [saving, setSaving] = useState(false)

  const changed = fullName.trim() !== user.fullName || normalizePhone(phoneNumber) !== (user.phoneNumber ?? '')

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(undefined)

    const found = {
      fullName: fullName.trim() ? undefined : t('errors.required'),
      phoneNumber: isInternationalPhone(phoneNumber) ? undefined : t('errors.invalidPhone'),
    }
    setErrors(found)
    if (found.fullName || found.phoneNumber) return

    setSaving(true)
    try {
      const updated = await api<User>('/users/profile', {
        method: 'PATCH',
        auth: true,
        body: { fullName: fullName.trim(), phoneNumber: normalizePhone(phoneNumber) },
      })
      authStore.updateUser({ fullName: updated.fullName, phoneNumber: updated.phoneNumber })
      setFullName(updated.fullName)
      setPhoneNumber(updated.phoneNumber ?? '')
      toast.success(t('account.infoSaved'))
    } catch (caught) {
      const key = errorKey(caught)
      if (key === 'errors.phoneTaken' || key === 'errors.invalidPhone') setErrors({ phoneNumber: t(key) })
      else setError(key)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Section title={t('account.infoTitle')} description={t('account.infoText')}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        {error && <FormAlert type="error">{t(error)}</FormAlert>}
        <Field
          label={t('auth.fullName')}
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={errors.fullName}
          maxLength={100}
        />
        <Field
          label={t('auth.phone')}
          type="tel"
          dir="ltr"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+970 59 123 4567"
          value={phoneNumber}
          onChange={(event) => setPhoneNumber(event.target.value)}
          error={errors.phoneNumber}
          hint={t('auth.phoneHint')}
          className="[&_input]:text-start"
        />
        <Button type="submit" className="h-11 self-start" disabled={saving || !changed}>
          {saving ? t('auth.loading') : t('account.save')}
        </Button>
      </form>
    </Section>
  )
}
