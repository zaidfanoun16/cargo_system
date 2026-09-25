import { CircleAlert, CircleHelp } from 'lucide-react'
import { motion } from 'motion/react'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '../ui/Button'
import { ConfirmContext, type ConfirmOptions } from './context'

type Request = { options: ConfirmOptions; resolve: (confirmed: boolean) => void }

// "Are you sure?" before important actions. Any component can call
// `await confirm({...})` (see useConfirm) and gets true or false.
// The native <dialog> keeps focus inside and closes with Escape.
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const dialog = useRef<HTMLDialogElement>(null)
  const [request, setRequest] = useState<Request | null>(null)

  const confirm = useCallback(
    (options: ConfirmOptions) => new Promise<boolean>((resolve) => setRequest({ options, resolve })),
    [],
  )

  useEffect(() => {
    if (request && !dialog.current?.open) dialog.current?.showModal()
  }, [request])

  function close(confirmed: boolean) {
    request?.resolve(confirmed)
    dialog.current?.close()
    setRequest(null)
  }

  const options = request?.options
  const danger = options?.tone === 'danger'
  const Icon = danger ? CircleAlert : CircleHelp

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <dialog
        ref={dialog}
        aria-labelledby="confirm-title"
        aria-describedby={options?.message ? 'confirm-message' : undefined}
        onCancel={(event) => {
          // Escape: treat as "no"
          event.preventDefault()
          close(false)
        }}
        onClick={(event) => {
          // A click on the dimmed area outside the box also means "no"
          if (event.target === event.currentTarget) close(false)
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl bg-transparent p-0 text-text backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        {options && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="rounded-3xl border border-border bg-surface p-6"
          >
            <span
              className={`grid size-12 place-items-center rounded-2xl ${
                danger ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' : 'bg-primary-soft text-text'
              }`}
            >
              <Icon className="size-6" aria-hidden />
            </span>
            <h2 id="confirm-title" className="mt-4 text-xl font-extrabold">
              {options.title}
            </h2>
            {options.message && (
              <div id="confirm-message" className="mt-2 text-sm leading-relaxed text-muted">
                {options.message}
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button variant="secondary" className="h-11" onClick={() => close(false)} autoFocus>
                {options.cancelLabel ?? t('confirm.cancel')}
              </Button>
              <Button
                className={`h-11 ${danger ? 'bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-500' : ''}`}
                onClick={() => close(true)}
              >
                {options.confirmLabel ?? t('confirm.ok')}
              </Button>
            </div>
          </motion.div>
        )}
      </dialog>
    </ConfirmContext.Provider>
  )
}
