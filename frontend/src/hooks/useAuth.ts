import { useSyncExternalStore } from 'react'

import { api } from '../lib/api'
import { authStore, type Session } from '../lib/auth-store'

export type RegisterData = {
  fullName: string
  email: string
  password: string
  phoneNumber: string
}

async function login(email: string, password: string) {
  const session = await api<Session>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
  authStore.set(session)
  return session.user
}

function register(data: RegisterData) {
  return api('/auth/register', { method: 'POST', body: data })
}

function verifyEmail(email: string, code: string) {
  return api('/auth/verify-email', { method: 'POST', body: { email, code } })
}

function resendVerification(email: string) {
  return api('/auth/resend-verification', { method: 'POST', body: { email } })
}

function forgotPassword(email: string) {
  return api('/auth/forgot-password', { method: 'POST', body: { email } })
}

function resetPassword(email: string, code: string, newPassword: string) {
  return api('/auth/reset-password', {
    method: 'POST',
    body: { email, code, newPassword },
  })
}

// The backend keeps no session to end, so signing out forgets the tokens
function logout() {
  authStore.clear()
}

export function useAuth() {
  const session = useSyncExternalStore(authStore.subscribe, authStore.get)

  return {
    user: session?.user ?? null,
    login,
    logout,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
  }
}
