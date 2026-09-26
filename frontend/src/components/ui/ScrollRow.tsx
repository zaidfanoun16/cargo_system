import { ChevronLeft, ChevronRight } from 'lucide-react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

type Props = {
  children: ReactNode
  // Classes for the outer box (margins, width)
  className?: string
  // Classes for the scrolling row (gap, padding)
  innerClassName?: string
  // Background the edges fade into (the color behind the row)
  fadeClassName?: string
  role?: string
  'aria-label'?: string
}

// A row of chips or tabs that scrolls sideways when it does not fit.
// Arrows appear on the side that has more to show, since a mouse cannot
// easily scroll sideways, and the selected item is kept in view.
export function ScrollRow({
  children,
  className = '',
  innerClassName = '',
  fadeClassName = 'from-bg',
  ...rest
}: Props) {
  const { t } = useTranslation()
  const row = useRef<HTMLDivElement>(null)
  const [canStart, setCanStart] = useState(false)
  const [canEnd, setCanEnd] = useState(false)

  const measure = useCallback(() => {
    const element = row.current
    if (!element) return
    // In right-to-left pages scrollLeft goes from 0 down to negative values
    const position = Math.abs(element.scrollLeft)
    const max = element.scrollWidth - element.clientWidth
    setCanStart(position > 1)
    setCanEnd(position < max - 1)
  }, [])

  useEffect(() => {
    const element = row.current
    if (!element) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    for (const child of element.children) observer.observe(child)
    return () => observer.disconnect()
  }, [measure, children])

  // Keep the selected tab or chip visible
  useEffect(() => {
    row.current
      ?.querySelector<HTMLElement>('[aria-selected="true"], [aria-pressed="true"]')
      ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [children])

  function scroll(towards: 'start' | 'end') {
    const element = row.current
    if (!element) return
    const rtl = getComputedStyle(element).direction === 'rtl'
    const amount = element.clientWidth * 0.7
    const left = (towards === 'end') !== rtl ? amount : -amount
    element.scrollBy({ left, behavior: 'smooth' })
  }

  const arrow =
    'absolute top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full border border-border bg-surface text-text shadow-md hover:bg-surface-muted'

  return (
    <div className={`relative ${className}`}>
      <div
        ref={row}
        onScroll={measure}
        className={`flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${innerClassName}`}
        {...rest}
      >
        {children}
      </div>

      {canStart && (
        <>
          <div className={`pointer-events-none absolute inset-y-0 start-0 w-16 bg-gradient-to-r ${fadeClassName} to-transparent rtl:bg-gradient-to-l`} />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => scroll('start')}
            className={`${arrow} start-1`}
            aria-label={t('app.scrollBack')}
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
          </button>
        </>
      )}
      {canEnd && (
        <>
          <div className={`pointer-events-none absolute inset-y-0 end-0 w-16 bg-gradient-to-l ${fadeClassName} to-transparent rtl:bg-gradient-to-r`} />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => scroll('end')}
            className={`${arrow} end-1`}
            aria-label={t('app.scrollMore')}
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
          </button>
        </>
      )}
    </div>
  )
}
