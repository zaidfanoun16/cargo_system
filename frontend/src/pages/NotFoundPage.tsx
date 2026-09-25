import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Container } from '../components/ui/Container'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <Container className="flex flex-col items-center py-20 text-center">
      <p className="text-6xl font-extrabold text-muted">404</p>
      <h1 className="mt-4 text-2xl font-extrabold">{t('notFound.title')}</h1>
      <p className="mt-2 text-muted">{t('notFound.text')}</p>
      <Link
        to="/"
        className="mt-6 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover"
      >
        {t('notFound.back')}
      </Link>
    </Container>
  )
}
