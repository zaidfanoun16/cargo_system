import { Languages, Moon, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useTheme } from '../../hooks/useTheme'

const iconButton =
  'inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-text transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-primary group-data-[hero=true]/header:text-white group-data-[hero=true]/header:hover:bg-white/10'

export function LanguageButton() {
  const { t, i18n } = useTranslation()

  return (
    <button
      type="button"
      className={iconButton}
      onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
      aria-label={t('settings.languageLabel')}
    >
      <Languages className="size-5" aria-hidden />
      <span>{t('settings.language')}</span>
    </button>
  )
}

export function ThemeButton() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      className={`${iconButton} w-10 px-0`}
      onClick={toggleTheme}
      aria-label={isDark ? t('settings.lightMode') : t('settings.darkMode')}
      title={isDark ? t('settings.lightMode') : t('settings.darkMode')}
    >
      {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  )
}
