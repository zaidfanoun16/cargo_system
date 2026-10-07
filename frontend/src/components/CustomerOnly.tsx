import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

// Pages for customers and visitors. Staff do not rent cars for
// themselves; they work from the dashboard, so an admin is sent there.
export function CustomerOnly({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />
  }

  return children
}
