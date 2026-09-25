import { createContext, type ReactNode } from 'react'

export type ConfirmOptions = {
  title: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // "danger" for actions that cannot be undone, like cancelling a booking
  tone?: 'default' | 'danger'
}

export type Confirm = (options: ConfirmOptions) => Promise<boolean>

export const ConfirmContext = createContext<Confirm>(async () => {
  throw new Error('useConfirm must be used inside <ConfirmProvider>')
})

export type ToastType = 'success' | 'error' | 'info'

export type ShowToast = (type: ToastType, message: string) => void

export const ToastContext = createContext<ShowToast>(() => {
  throw new Error('useToast must be used inside <ToastProvider>')
})
