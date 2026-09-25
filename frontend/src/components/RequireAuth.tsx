import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'

// Pages for logged-in users: others go to log in, then come back.
// "admin" pages also send non-admins to the home page.
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (admin && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}
