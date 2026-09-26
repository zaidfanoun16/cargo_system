import {
  AlarmClock,
  Ban,
  Bell,
  CalendarCheck,
  CalendarPlus,
  CheckCheck,
  CircleAlert,
  CircleCheck,
  KeyRound,
  type LucideIcon,
  ShieldCheck,
  Timer,
  XCircle,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'

import { api } from '../../lib/api'
import { carName } from '../../lib/cars'
import { formatDate } from '../../lib/dates'
import { formatNumber } from '../../lib/format'

type NotificationType =
  | 'RESERVATION_CONFIRMED'
  | 'RESERVATION_CANCELLED'
  | 'RESERVATION_PICKED_UP'
  | 'RESERVATION_COMPLETED'
  | 'RESERVATION_NO_SHOW'
  | 'PICKUP_REMINDER'
  | 'BOOKING_BLOCKED'
  | 'BOOKING_ALLOWED'
  | 'NEW_RESERVATION'
  | 'CUSTOMER_CANCELLED'
  | 'CUSTOMER_RUNNING_LATE'
  | 'CUSTOMER_NO_SHOW'

type Notification = {
  id: number
  type: NotificationType
  data: {
    reservationId?: number
    car?: { brand: string; brandAr: string | null; model: string; modelAr: string | null }
    startDate?: string
    customer?: string
    cancelledBy?: 'user' | 'admin' | 'system'
    lateCancellation?: boolean
  }
  readAt: string | null
  createdAt: string
}

// How often to look for new notifications while the page is open
const CHECK_EVERY_MS = 30_000

// Icon, color and page for each kind of notification
const kinds: Record<NotificationType, { icon: LucideIcon; tone: string; to: string }> = {
  RESERVATION_CONFIRMED: { icon: CalendarCheck, tone: 'emerald', to: '/my-bookings' },
  RESERVATION_CANCELLED: { icon: XCircle, tone: 'red', to: '/my-bookings' },
  RESERVATION_PICKED_UP: { icon: KeyRound, tone: 'blue', to: '/my-bookings' },
  RESERVATION_COMPLETED: { icon: CircleCheck, tone: 'emerald', to: '/my-bookings' },
  RESERVATION_NO_SHOW: { icon: CircleAlert, tone: 'orange', to: '/my-bookings' },
  PICKUP_REMINDER: { icon: AlarmClock, tone: 'blue', to: '/my-bookings' },
  BOOKING_BLOCKED: { icon: Ban, tone: 'red', to: '/my-bookings' },
  BOOKING_ALLOWED: { icon: ShieldCheck, tone: 'emerald', to: '/cars' },
  NEW_RESERVATION: { icon: CalendarPlus, tone: 'amber', to: '/admin/bookings' },
  CUSTOMER_CANCELLED: { icon: XCircle, tone: 'red', to: '/admin/bookings?status=CANCELLED' },
  CUSTOMER_RUNNING_LATE: { icon: Timer, tone: 'blue', to: '/admin/bookings?status=CONFIRMED' },
  CUSTOMER_NO_SHOW: { icon: CircleAlert, tone: 'orange', to: '/admin/bookings?status=NO_SHOW' },
}

const tones: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  orange: 'bg-orange-100 text-orange-900 dark:bg-orange-950 dark:text-orange-200',
  amber: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
}

// "5 minutes ago", "yesterday"
function timeAgo(date: string, language: string, now: number) {
  const format = new Intl.RelativeTimeFormat(language === 'ar' ? 'ar-EG' : 'en-US', { numeric: 'auto' })
  const seconds = Math.round((new Date(date).getTime() - now) / 1000)
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps) {
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  }
  return format.format(0, 'minute')
}

// The bell in the header: the unread count, and the latest notifications
// about bookings (for customers) or new requests and changes (for staff).
// Checks for new ones every 30 seconds while the page is visible.
export function NotificationBell() {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const container = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Notification[]>()
  const [unread, setUnread] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    try {
      const result = await api<{ items: Notification[]; unreadCount: number }>('/notifications', { auth: true })
      setItems(result.items)
      setUnread(result.unreadCount)
      setNow(Date.now())
    } catch {
      // Try again at the next check
    }
  }, [])

  useEffect(() => {
    // Load right after the first render, then every CHECK_EVERY_MS
    const first = setTimeout(() => void load(), 0)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, CHECK_EVERY_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  // Close on a page change, a click outside, or Escape
  const [openedAt, setOpenedAt] = useState(pathname)
  if (open && openedAt !== pathname) {
    setOpen(false)
    setOpenedAt(pathname)
  }

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function toggle() {
    setOpenedAt(pathname)
    if (!open) void load()
    setOpen((current) => !current)
  }

  async function openNotification(notification: Notification) {
    setOpen(false)
    if (!notification.readAt) {
      setItems((list) => list?.map((item) => (item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)))
      setUnread((count) => Math.max(0, count - 1))
      void api(`/notifications/${notification.id}/read`, { method: 'PATCH', auth: true }).catch(() => undefined)
    }
    navigate(kinds[notification.type].to)
  }

  async function markAllRead() {
    setItems((list) => list?.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })))
    setUnread(0)
    await api('/notifications/read-all', { method: 'PATCH', auth: true }).catch(() => undefined)
  }

  function text(notification: Notification) {
    const { data } = notification
    const values = {
      car: data.car ? carName(data.car, language) : '',
      date: data.startDate ? formatDate(data.startDate, language, { weekday: 'short', hour: 'numeric', minute: '2-digit' }) : '',
      customer: data.customer ?? '',
      id: data.reservationId ? formatNumber(data.reservationId, language) : '',
    }
    if (notification.type === 'RESERVATION_CANCELLED') {
      const who = data.lateCancellation ? 'late' : (data.cancelledBy ?? 'admin')
      return t(`notifications.types.RESERVATION_CANCELLED.${who}`, values)
    }
    if (notification.type === 'CUSTOMER_CANCELLED' && data.lateCancellation) {
      return t('notifications.types.CUSTOMER_CANCELLED_LATE', values)
    }
    return t(`notifications.types.${notification.type}`, values)
  }

  return (
    <div ref={container} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={unread > 0 ? t('notifications.openUnread', { formatted: formatNumber(unread, language) }) : t('notifications.open')}
        className="relative grid size-10 place-items-center rounded-xl transition-colors hover:bg-surface-muted group-data-[hero=true]/header:hover:bg-white/10"
      >
        <Bell className="size-5" aria-hidden />
        {unread > 0 && (
          <span className="absolute -end-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface group-data-[hero=true]/header:ring-transparent">
            {unread > 9 ? '9+' : formatNumber(unread, language)}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label={t('notifications.title')}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.12 } }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            className="fixed inset-x-4 top-16 z-50 origin-top rounded-2xl border border-border bg-surface text-text shadow-xl shadow-black/10 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-96 sm:origin-top-right sm:rtl:origin-top-left dark:shadow-black/40"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <p className="font-extrabold">{t('notifications.title')}</p>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-muted hover:bg-surface-muted hover:text-text"
                >
                  <CheckCheck className="size-4" aria-hidden />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            {!items ? (
              <div className="space-y-2 p-4" aria-hidden>
                {[0, 1, 2].map((index) => (
                  <div key={index} className="h-14 animate-pulse rounded-xl bg-surface-muted" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <Bell className="size-8 text-muted" aria-hidden />
                <p className="mt-3 text-sm text-muted">{t('notifications.empty')}</p>
              </div>
            ) : (
              <ul className="max-h-[min(70vh,28rem)] overflow-y-auto p-2">
                {items.map((notification) => {
                  const { icon: Icon, tone } = kinds[notification.type]
                  return (
                    <li key={notification.id}>
                      <button
                        type="button"
                        onClick={() => openNotification(notification)}
                        className={`flex w-full items-start gap-3 rounded-xl p-3 text-start transition-colors hover:bg-surface-muted ${
                          notification.readAt ? '' : 'bg-primary-soft/60'
                        }`}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${tones[tone]}`} aria-hidden>
                          <Icon className="size-4.5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={`block text-sm leading-relaxed ${notification.readAt ? 'text-muted' : 'font-semibold'}`}>
                            {text(notification)}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">{timeAgo(notification.createdAt, language, now)}</span>
                        </span>
                        {!notification.readAt && (
                          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-red-600" aria-label={t('notifications.unread')} />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
