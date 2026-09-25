import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { type ReactNode, useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToastContext, type ToastType } from './context'

type Toast = { id: number; type: ToastType; message: string }

const DURATION_MS = 4500

const styles: Record<ToastType, string> = {
  success: 'text-emerald-600 dark:text-emerald-400',
  error: 'text-red-600 dark:text-red-400',
  info: 'text-text',
}

const icons = { success: CircleCheck, error: CircleAlert, info: Info }

// Short messages after an action, e.g. "Booking cancelled". They sit at
// the bottom of the screen and disappear on their own.
export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const show = useCallback(
    (type: ToastType, message: string) => {
      const id = nextId.current++
      // Keep at most three on screen
      setToasts((current) => [...current.slice(-2), { id, type, message }])
      setTimeout(() => dismiss(id), DURATION_MS)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:items-end"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = icons[toast.type]
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
                className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text shadow-xl shadow-black/10 dark:shadow-black/40"
              >
                <Icon className={`size-5 shrink-0 ${styles[toast.type]}`} aria-hidden />
                <p className="flex-1">{toast.message}</p>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  className="grid size-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-muted hover:text-text"
                  aria-label={t('confirm.dismiss')}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}
