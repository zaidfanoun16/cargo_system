import { CarFront } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function Logo() {
  const { t } = useTranslation()

  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-fg">
        <CarFront className="size-5" aria-hidden />
      </span>
      <span className="text-lg font-extrabold tracking-tight">{t('app.name')}</span>
    </Link>
  )
}
