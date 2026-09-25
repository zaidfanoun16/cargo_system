import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, NavLink } from 'react-router-dom'

import { Container } from '../ui/Container'
import { Logo } from './Logo'
import { LanguageButton, ThemeButton } from './SettingsButtons'

const links = [
  { to: '/', key: 'nav.home' },
  { to: '/cars', key: 'nav.cars' },
] as const

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
    isActive ? 'bg-primary-soft text-text' : 'text-muted hover:bg-surface-muted hover:text-text'
  }`
}

export function Header() {
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)

  // Close the mobile menu once a link in it is chosen
  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface/85 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Logo />

        {/* Desktop navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end className={navLinkClass}>
              {t(link.key)}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-1 md:flex">
          <LanguageButton />
          <ThemeButton />
          <Link
            to="/login"
            className="ms-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
          >
            {t('nav.login')}
          </Link>
        </div>

        {/* Mobile: theme stays one tap away, the rest is in the menu */}
        <div className="flex items-center gap-1 md:hidden">
          <ThemeButton />
          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl hover:bg-surface-muted"
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
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end className={navLinkClass} onClick={closeMenu}>
                {t(link.key)}
              </NavLink>
            ))}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <LanguageButton />
              <Link
                to="/login"
                className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg"
                onClick={closeMenu}
              >
                {t('nav.login')}
              </Link>
            </div>
          </Container>
        </div>
      )}
    </header>
  )
}
