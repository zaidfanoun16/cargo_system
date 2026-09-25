import { CalendarDays, ChevronDown, Heart, LogOut, UserRound } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation } from 'react-router-dom'

import type { User } from '../../lib/auth-store'

type Props = {
  user: User
  onLogout: () => void
}

const items = [
  { to: '/account', key: 'nav.account', icon: UserRound },
  { to: '/my-bookings', key: 'nav.myBookings', icon: CalendarDays },
  { to: '/favorites', key: 'nav.favorites', icon: Heart },
] as const

// The first letter of the name, in a circle
export function Avatar({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-primary font-bold text-primary-fg group-data-[hero=true]/header:bg-white group-data-[hero=true]/header:text-neutral-900 ${className}`}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

// Tapping the avatar or name opens: profile, bookings, favorites, log out.
// Closes on a choice, a click outside, Escape, or a page change.
export function UserMenu({ user, onLogout }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const { pathname } = useLocation()

  // Close when the page changes (e.g. the browser's back button)
  const [openedAt, setOpenedAt] = useState(pathname)
  if (open && openedAt !== pathname) {
    setOpen(false)
    setOpenedAt(pathname)
  }

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    // Escape works wherever focus is (a tap on a phone does not move it)
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      if (container.current?.contains(document.activeElement)) trigger.current?.focus()
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function toggle() {
    setOpenedAt(pathname)
    setOpen((current) => !current)
  }

  // Arrow keys move between the choices, like a native menu
  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    event.preventDefault()
    const choices = [...(container.current?.querySelectorAll<HTMLElement>('[role=menuitem]') ?? [])]
    const index = choices.indexOf(document.activeElement as HTMLElement)
    const step = event.key === 'ArrowDown' ? 1 : -1
    choices[(index + step + choices.length) % choices.length]?.focus()
  }

  const itemClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-text transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none'

  return (
    <div ref={container} className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={trigger}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('nav.userMenu', { name: user.fullName })}
        className="flex items-center gap-2 rounded-full p-1 text-sm font-semibold transition-colors hover:bg-surface-muted md:rounded-xl md:py-1.5 md:ps-1.5 md:pe-2.5 group-data-[hero=true]/header:hover:bg-white/10"
      >
        <Avatar name={user.fullName} className="size-8 text-sm" />
        <span className="hidden max-w-32 truncate md:inline">{user.fullName}</span>
        <ChevronDown
          className={`hidden size-4 text-muted transition-transform md:block group-data-[hero=true]/header:text-white/70 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            aria-label={user.fullName}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="absolute end-0 top-full z-50 mt-2 w-64 origin-top-right rounded-2xl border border-border bg-surface p-2 text-text shadow-xl shadow-black/10 rtl:origin-top-left dark:shadow-black/40"
          >
            <div className="flex items-center gap-3 px-3 pb-3 pt-2">
              <Avatar name={user.fullName} className="size-10 text-base" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{user.fullName}</p>
                <p className="truncate text-xs text-muted" dir="ltr">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="border-t border-border pt-2">
              {items.map(({ to, key, icon: Icon }) => (
                <Link key={to} to={to} role="menuitem" className={itemClass} onClick={() => setOpen(false)}>
                  <Icon className="size-5 text-muted" aria-hidden />
                  {t(key)}
                </Link>
              ))}
            </div>
            <div className="mt-2 border-t border-border pt-2">
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} text-red-700 hover:bg-red-50 focus-visible:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 dark:focus-visible:bg-red-950/40`}
                onClick={() => {
                  setOpen(false)
                  onLogout()
                }}
              >
                <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />
                {t('nav.logout')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
