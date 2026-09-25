import { MotionConfig } from 'motion/react'
import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { ConfirmProvider } from './components/feedback/ConfirmProvider'
import { ToastProvider } from './components/feedback/ToastProvider'
import { Layout } from './components/layout/Layout'
import { RequireAuth } from './components/RequireAuth'
import { HomePage } from './pages/HomePage'

// The home page loads right away; the other pages download only when
// they are opened, so the first visit stays fast on phones
const ComingSoonPage = lazy(() => import('./pages/ComingSoonPage').then((m) => ({ default: m.ComingSoonPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))
const LoginPage = lazy(() => import('./pages/auth/LoginPage').then((m) => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('./pages/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })))
const VerifyEmailPage = lazy(() => import('./pages/auth/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage })))
const ForgotPasswordPage = lazy(() =>
  import('./pages/auth/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage })),
)
const MyBookingsPage = lazy(() =>
  import('./pages/bookings/MyBookingsPage').then((m) => ({ default: m.MyBookingsPage })),
)
const CarsPage = lazy(() => import('./pages/cars/CarsPage').then((m) => ({ default: m.CarsPage })))
const CarDetailsPage = lazy(() => import('./pages/car/CarDetailsPage').then((m) => ({ default: m.CarDetailsPage })))
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)

export default function App() {
  return (
    // Respects the device setting for reduced motion
    <MotionConfig reducedMotion="user">
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                <Route index element={<HomePage />} />
                <Route path="cars" element={<CarsPage />} />
                <Route path="cars/:id" element={<CarDetailsPage />} />
                <Route
                  path="my-bookings"
                  element={
                    <RequireAuth>
                      <MyBookingsPage />
                    </RequireAuth>
                  }
                />
                <Route path="login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify-email" element={<VerifyEmailPage />} />
                <Route path="forgot-password" element={<ForgotPasswordPage />} />
                <Route path="reset-password" element={<ResetPasswordPage />} />
                <Route
                  path="account"
                  element={
                    <RequireAuth>
                      <ComingSoonPage titleKey="nav.account" />
                    </RequireAuth>
                  }
                />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
