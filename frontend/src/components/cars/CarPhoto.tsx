import { CarFront } from 'lucide-react'

// The car's photo, or a neutral placeholder when it has none yet
export function CarPhoto({ url, alt, className = '', eager = false }: { url?: string; alt: string; className?: string; eager?: boolean }) {
  if (!url) {
    return (
      <div className={`grid place-items-center bg-surface-muted text-muted ${className}`} role="img" aria-label={alt}>
        <CarFront className="size-12 opacity-60" aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={url}
      alt={alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      className={`bg-surface-muted object-cover ${className}`}
    />
  )
}
