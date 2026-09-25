import { type InputHTMLAttributes, type ReactNode, useId } from 'react'

export const inputClass =
  'h-12 w-full rounded-xl border border-border bg-surface px-3.5 text-base text-text transition-colors placeholder:text-muted/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-[invalid=true]:border-red-500 aria-[invalid=true]:ring-red-500/20'

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
  hint?: string
  // Replaces the plain input, e.g. a password input with a show button.
  // It receives the id and aria attributes the input must use.
  render?: (inputProps: InputHTMLAttributes<HTMLInputElement>) => ReactNode
}

// A labelled input with its error or hint below it
export function Field({ label, error, hint, render, className = '', ...props }: Props) {
  const id = useId()
  const messageId = `${id}-message`
  const message = error ?? hint

  const inputProps = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': message ? messageId : undefined,
    ...props,
  }

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      {render ? render(inputProps) : <input className={inputClass} {...inputProps} />}
      {message && (
        <p
          id={messageId}
          className={`text-xs ${error ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted'}`}
        >
          {message}
        </p>
      )}
    </div>
  )
}
