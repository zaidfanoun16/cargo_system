import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../hooks/useAuth'
import { authStore } from '../lib/auth-store'

// Pages for logged-in users: others go to log in, then come back.
// "admin" pages also send non-admins to the home page.
export function RequireAuth({ children, admin = false }: { children: ReactNode; admin?: boolean }) {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    // Someone who just logged out goes home, not back to the login page
    if (authStore.justLoggedOut()) return <Navigate to="/" replace />
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (admin && user.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}
