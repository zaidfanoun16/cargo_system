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
const AccountPage = lazy(() => import('./pages/account/AccountPage').then((m) => ({ default: m.AccountPage })))
const FavoritesPage = lazy(() =>
  import('./pages/favorites/FavoritesPage').then((m) => ({ default: m.FavoritesPage })),
)
const CarsPage = lazy(() => import('./pages/cars/CarsPage').then((m) => ({ default: m.CarsPage })))
const CarDetailsPage = lazy(() => import('./pages/car/CarDetailsPage').then((m) => ({ default: m.CarDetailsPage })))
const ResetPasswordPage = lazy(() =>
  import('./pages/auth/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
)

// Admin pages download only for admins who open them
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout').then((m) => ({ default: m.AdminLayout })))
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })))
const AdminBookingsPage = lazy(() => import('./pages/admin/AdminBookingsPage').then((m) => ({ default: m.AdminBookingsPage })))
const AdminHandoverPage = lazy(() => import('./pages/admin/AdminHandoverPage').then((m) => ({ default: m.AdminHandoverPage })))
const AdminCarsPage = lazy(() => import('./pages/admin/AdminCarsPage').then((m) => ({ default: m.AdminCarsPage })))
const CarFormPage = lazy(() => import('./pages/admin/CarFormPage').then((m) => ({ default: m.CarFormPage })))
const AdminCategoriesPage = lazy(() => import('./pages/admin/AdminCategoriesPage').then((m) => ({ default: m.AdminCategoriesPage })))
const AdminUsersPage = lazy(() => import('./pages/admin/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })))

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
                <Route
                  path="favorites"
                  element={
                    <RequireAuth>
                      <FavoritesPage />
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
                      <AccountPage />
                    </RequireAuth>
                  }
                />
                <Route
                  path="admin"
                  element={
                    <RequireAuth admin>
                      <AdminLayout />
                    </RequireAuth>
                  }
                >
                  <Route index element={<AdminDashboardPage />} />
                  <Route path="bookings" element={<AdminBookingsPage />} />
                  <Route path="handover" element={<AdminHandoverPage />} />
                  <Route path="cars" element={<AdminCarsPage />} />
                  <Route path="cars/new" element={<CarFormPage />} />
                  <Route path="cars/:id" element={<CarFormPage />} />
                  <Route path="categories" element={<AdminCategoriesPage />} />
                  <Route path="users" element={<AdminUsersPage />} />
                </Route>
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </MotionConfig>
  )
}
