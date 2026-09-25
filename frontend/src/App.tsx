import { BrowserRouter, Route, Routes } from 'react-router-dom'

import { Layout } from './components/layout/Layout'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="cars" element={<ComingSoonPage titleKey="nav.cars" />} />
          <Route path="login" element={<ComingSoonPage titleKey="nav.login" />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
