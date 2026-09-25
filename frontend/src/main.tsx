import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Cairo is bundled with the app, so it works without Google Fonts
import '@fontsource-variable/cairo'
import './i18n'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
