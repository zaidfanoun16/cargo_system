import { useTranslation } from 'react-i18next'

import { Container } from '../ui/Container'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted sm:flex-row">
        <Logo />
        <span>
          © {new Date().getFullYear()} {t('footer.rights')}
        </span>
      </Container>
    </footer>
  )
}
