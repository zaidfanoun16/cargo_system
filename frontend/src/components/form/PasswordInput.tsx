import { Eye, EyeOff } from 'lucide-react'
import { type InputHTMLAttributes, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { inputClass } from './Field'

// Password input with a button to show what was typed
export function PasswordInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  return (
    // The password reads left to right in both languages, so the box does too
    <div className="relative" dir="ltr">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={`${inputClass} pe-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        className="absolute inset-y-0 end-0 grid w-12 place-items-center rounded-e-xl text-muted hover:text-text focus-visible:outline-2 focus-visible:outline-primary"
        aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
      </button>
    </div>
  )
}
