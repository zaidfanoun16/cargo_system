import { Link } from 'react-router-dom'

// The CarGo mark: a road shaped like a "C" with a forward arrow ("Go").
// It uses the theme colors, so it follows light and dark mode.
export function LogoMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <rect width="64" height="64" rx="16" className="fill-primary" />
      <path
        d="M44 20.5A17 17 0 1 0 44 43.5"
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        className="stroke-primary-fg"
      />
      <path
        d="M44 20.5A17 17 0 1 0 44 43.5"
        fill="none"
        strokeWidth="1.6"
        strokeDasharray="3.2 3.6"
        strokeLinecap="round"
        className="stroke-primary"
      />
      <path
        d="M40 32h12m-4.5-5 5 5-5 5"
        fill="none"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-fg"
      />
    </svg>
  )
}

// The brand name is always "CarGo" in English, in both languages
export function Logo({ className = '' }: { className?: string }) {
  return (
    <Link to="/" dir="ltr" className={`flex items-center gap-2 ${className}`} aria-label="CarGo">
      <LogoMark className="size-9" />
      <span className="text-xl font-extrabold tracking-tight">
        Car<span className="font-medium text-muted">Go</span>
      </span>
    </Link>
  )
}
