import { LogOut, Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { Container } from '../ui/Container'
import { Logo } from './Logo'
import { LanguageButton, ThemeButton } from './SettingsButtons'

const links = [
  { to: '/', key: 'nav.home' },
  { to: '/cars', key: 'nav.cars' },
] as const

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
    isActive
      ? 'bg-primary-soft text-text group-data-[hero=true]/header:bg-white/15 group-data-[hero=true]/header:text-white'
      : 'text-muted hover:bg-surface-muted hover:text-text group-data-[hero=true]/header:text-white/75 group-data-[hero=true]/header:hover:bg-white/10 group-data-[hero=true]/header:hover:text-white'
  }`
}

// True once the page has scrolled past the top
function useScrolled(offset = 40) {
  const [scrolled, setScrolled] = useState(() => window.scrollY > offset)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > offset)
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [offset])

  return scrolled
}

// First letter of the name, shown in the round avatar
function initial(name: string) {
  return name.trim().charAt(0).toUpperCase()
}

const loginLinkClass =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover group-data-[hero=true]/header:bg-white group-data-[hero=true]/header:text-neutral-900'

export function Header() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const scrolled = useScrolled()
  const { user, logout } = useAuth()
  const navLinks = user ? [...links, { to: '/my-bookings', key: 'nav.myBookings' } as const] : links

  // See-through over the home page photo until the page scrolls
  const overHero = pathname === '/' && !scrolled && !menuOpen

  // Close the mobile menu once a link in it is chosen
  const closeMenu = () => setMenuOpen(false)

  return (
    <header
      data-hero={overHero}
      className="group/header sticky top-0 z-40 border-b transition-colors duration-300 data-[hero=false]:border-border data-[hero=false]:bg-surface/85 data-[hero=false]:backdrop-blur data-[hero=true]:border-transparent data-[hero=true]:bg-transparent data-[hero=true]:text-white"
    >
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end className={navLinkClass}>
              {t(link.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LanguageButton />
          <ThemeButton />
          {user ? (
            <div className="ms-2 flex items-center gap-1">
              <Link
                to="/account"
                className="flex items-center gap-2 rounded-xl py-1.5 ps-1.5 pe-3 text-sm font-semibold transition-colors hover:bg-surface-muted group-data-[hero=true]/header:hover:bg-white/10"
              >
                <span
                  className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-fg group-data-[hero=true]/header:bg-white group-data-[hero=true]/header:text-neutral-900"
                  aria-hidden
                >
                  {initial(user.fullName)}
                </span>
                <span className="max-w-32 truncate">{user.fullName}</span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="grid size-10 place-items-center rounded-xl text-muted transition-colors hover:bg-surface-muted hover:text-text group-data-[hero=true]/header:text-white/75 group-data-[hero=true]/header:hover:bg-white/10 group-data-[hero=true]/header:hover:text-white"
                aria-label={t('nav.logout')}
                title={t('nav.logout')}
              >
                <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />
              </button>
            </div>
          ) : (
            <Link to="/login" className={`ms-2 ${loginLinkClass}`}>
              {t('nav.login')}
            </Link>
          )}
        </div>

        {/* Mobile: theme stays one tap away, the rest is in the menu */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeButton />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl hover:bg-surface-muted group-data-[hero=true]/header:hover:bg-white/10"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t('nav.close') : t('nav.menu')}
          >
            {menuOpen ? <X className="size-6" aria-hidden /> : <Menu className="size-6" aria-hidden />}
          </button>
        </div>
      </Container>

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border bg-surface md:hidden">
          <Container className="flex flex-col gap-1 py-3">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} end className={navLinkClass} onClick={closeMenu}>
                {t(link.key)}
              </NavLink>
            ))}
            {user && (
              <NavLink to="/account" className={navLinkClass} onClick={closeMenu}>
                <span className="flex items-center gap-2">
                  <span
                    className="grid size-7 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg"
                    aria-hidden
                  >
                    {initial(user.fullName)}
                  </span>
                  <span className="truncate">{user.fullName}</span>
                </span>
              </NavLink>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <LanguageButton />
              {user ? (
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    closeMenu()
                  }}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted hover:bg-surface-muted hover:text-text"
                >
                  <LogOut className="size-5 rtl:-scale-x-100" aria-hidden />
                  {t('nav.logout')}
                </button>
              ) : (
                <Link to="/login" className={loginLinkClass} onClick={closeMenu}>
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
