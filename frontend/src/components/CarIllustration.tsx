// Simple side view of a car for the home page, drawn with the theme colors
export function CarIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 200" className={className} aria-hidden>
      <ellipse cx="200" cy="172" rx="170" ry="10" className="fill-border" />
      <path
        d="M40 140c0-14 8-24 22-27l44-10 38-40c8-8 19-13 30-13h86c12 0 23 5 31 14l32 38 30 6c13 3 23 14 23 28v14c0 6-5 11-11 11H51c-6 0-11-5-11-11z"
        className="fill-primary"
      />
      <path
        d="M160 70c5-5 11-8 18-8h40v42h-80zM230 62h40c8 0 15 3 20 9l28 33h-88z"
        className="fill-surface"
        opacity=".9"
      />
      <rect x="54" y="128" width="22" height="8" rx="4" className="fill-surface" opacity=".8" />
      <rect x="330" y="126" width="26" height="8" rx="4" className="fill-surface" opacity=".8" />
      <circle cx="120" cy="160" r="26" className="fill-text" />
      <circle cx="120" cy="160" r="11" className="fill-surface-muted" />
      <circle cx="300" cy="160" r="26" className="fill-text" />
      <circle cx="300" cy="160" r="11" className="fill-surface-muted" />
    </svg>
  )
}
