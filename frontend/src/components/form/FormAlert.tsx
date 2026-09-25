import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

// A message above a form: an error, or a success such as "email verified"
export function FormAlert({ type, children }: { type: 'error' | 'success'; children: ReactNode }) {
  const styles =
    type === 'error'
      ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
  const Icon = type === 'error' ? CircleAlert : CircleCheck

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm ${styles}`}
    >
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="flex-1">{children}</div>
    </div>
  )
}
