import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from './ar'
import en from './en'

export type Language = 'ar' | 'en'

function savedLanguage(): Language {
  try {
    return localStorage.getItem('language') === 'en' ? 'en' : 'ar'
  } catch {
    return 'ar'
  }
}

// Arabic reads right to left, English left to right
function applyLanguage(language: string) {
  document.documentElement.lang = language
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr'
}

i18n.use(initReactI18next).init({
  resources: {
    ar: { translation: ar },
    en: { translation: en },
  },
  lng: savedLanguage(),
  fallbackLng: 'ar',
  interpolation: { escapeValue: false },
})

applyLanguage(i18n.language)

i18n.on('languageChanged', (language) => {
  applyLanguage(language)
  try {
    localStorage.setItem('language', language)
  } catch {
    // Private browsing can block storage; the choice just won't be kept
  }
})

export default i18n
