import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { useConfirm } from '../../hooks/useConfirm'
import { useToast } from '../../hooks/useToast'
import { Container } from '../ui/Container'
import { Logo } from './Logo'
import { LanguageButton, ThemeButton } from './SettingsButtons'
import { NotificationBell } from './NotificationBell'
import { UserMenu } from './UserMenu'

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

const loginLinkClass =
  'rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover group-data-[hero=true]/header:bg-white group-data-[hero=true]/header:text-neutral-900'

export function Header() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const { pathname } = useLocation()
  const scrolled = useScrolled()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const confirm = useConfirm()
  const toast = useToast()

  const navLinks = user ? [...links, { to: '/my-bookings', key: 'nav.myBookings' } as const] : links

  async function confirmLogout() {
    setMenuOpen(false)
    const confirmed = await confirm({
      title: t('confirm.logoutTitle'),
      message: t('confirm.logoutText'),
      confirmLabel: t('nav.logout'),
    })
    if (!confirmed) return
    // Back to the home page (pages for logged-in users do the same,
    // see RequireAuth)
    logout()
    navigate('/', { replace: true })
    toast.info(t('confirm.loggedOut'))
  }

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
            <>
              <NotificationBell />
              <div className="ms-2">
                <UserMenu user={user} onLogout={confirmLogout} />
              </div>
            </>
          ) : (
            <Link to="/login" className={`ms-2 ${loginLinkClass}`}>
              {t('nav.login')}
            </Link>
          )}
        </div>

        {/* Mobile: theme and the account menu stay one tap away */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeButton />
          {user && <NotificationBell />}
          {user && <UserMenu user={user} onLogout={confirmLogout} />}
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
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <LanguageButton />
              {!user && (
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
