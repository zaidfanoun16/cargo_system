import type { ReactNode } from 'react'

// Centers content with a comfortable side gutter on every screen size
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 sm:px-6 ${className}`}>{children}</div>
}
