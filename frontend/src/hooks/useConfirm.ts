import { useContext } from 'react'

import { ConfirmContext } from '../components/feedback/context'

// const confirm = useConfirm()
// if (await confirm({ title: '...', tone: 'danger' })) { ... }
export function useConfirm() {
  return useContext(ConfirmContext)
}
