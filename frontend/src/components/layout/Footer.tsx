import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useAuth } from '../../hooks/useAuth'
import { Container } from '../ui/Container'
import { Logo } from './Logo'

const links = [
  { to: '/cars', key: 'nav.cars' },
  { to: '/offers', key: 'nav.offers' },
  { to: '/policy', key: 'nav.policy' },
  { to: '/about', key: 'nav.about' },
] as const

export function Footer() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col items-center justify-between gap-4 py-6 text-sm text-muted sm:flex-row">
        <Logo />
        {/* Admins only use the dashboard */}
        {user?.role !== 'ADMIN' && (
          <nav aria-label={t('footer.links')} className="flex flex-wrap justify-center gap-x-5 gap-y-2">
            {links.map((link) => (
              <Link key={link.to} to={link.to} className="font-semibold hover:text-text">
                {t(link.key)}
              </Link>
            ))}
          </nav>
        )}
        <span>
          © {new Date().getFullYear()} {t('footer.rights')}
        </span>
      </Container>
    </footer>
  )
}
