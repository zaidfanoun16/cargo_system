import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'light'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover',
  secondary:
    'border border-border bg-surface text-text hover:bg-surface-muted',
  ghost: 'text-text hover:bg-surface-muted',
  // For use over photos, in both themes
  light: 'bg-white text-neutral-900 hover:bg-white/85',
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
}

export function Button({ variant = 'primary', className = '', ...props }: Props) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
