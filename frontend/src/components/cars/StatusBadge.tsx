import { useTranslation } from 'react-i18next'

import type { BookingStatus } from '../../lib/cars'

const styles: Record<BookingStatus, string> = {
  PENDING: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  PICKED_UP: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  COMPLETED: 'bg-primary-soft text-text',
  CANCELLED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  NO_SHOW: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
}

// A booking's status as a colored label (always with its name, never color alone)
export function StatusBadge({ status, className = '' }: { status: BookingStatus; className?: string }) {
  const { t } = useTranslation()

  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${styles[status]} ${className}`}>
      {t(`bookings.status.${status}`)}
    </span>
  )
}
