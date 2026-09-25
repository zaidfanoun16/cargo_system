import { useTranslation } from 'react-i18next'

import { Container } from '../ui/Container'

export function Footer() {
  const { t } = useTranslation()

  return (
    <footer className="border-t border-border bg-surface">
      <Container className="flex flex-col items-center justify-between gap-2 py-6 text-sm text-muted sm:flex-row">
        <span className="font-bold text-text">{t('app.name')}</span>
        <span>
          © {new Date().getFullYear()} {t('footer.rights')}
        </span>
      </Container>
    </footer>
  )
}
