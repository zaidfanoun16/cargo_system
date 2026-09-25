import { Hammer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Container } from '../components/ui/Container'

// Placeholder for pages built in the next steps
export function ComingSoonPage({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation()

  return (
    <Container className="flex flex-col items-center py-20 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-primary-soft">
        <Hammer className="size-6" aria-hidden />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold">{t(titleKey)}</h1>
      <p className="mt-2 text-muted">{t('comingSoon')}</p>
    </Container>
  )
}
