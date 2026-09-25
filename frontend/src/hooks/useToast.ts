import { useContext, useMemo } from 'react'

import { ToastContext } from '../components/feedback/context'

// const toast = useToast()
// toast.success('Booking cancelled')
export function useToast() {
  const show = useContext(ToastContext)

  return useMemo(
    () => ({
      success: (message: string) => show('success', message),
      error: (message: string) => show('error', message),
      info: (message: string) => show('info', message),
    }),
    [show],
  )
}
