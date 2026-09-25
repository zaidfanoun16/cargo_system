import { Suspense } from 'react'
import { Outlet } from 'react-router-dom'

import { Footer } from './Footer'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main className="flex-1">
        {/* Shown for the moment a page is still downloading */}
        <Suspense fallback={<PageLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}

function PageLoading() {
  return (
    <div className="grid min-h-[60dvh] place-items-center" role="status" aria-live="polite">
      <span className="size-8 animate-spin rounded-full border-3 border-border border-t-primary" />
    </div>
  )
}
