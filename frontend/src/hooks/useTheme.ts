import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

// One shared theme for the whole app: every toggle button reads and
// changes the same value. index.html already applied the saved theme
// before the first paint.
const listeners = new Set<() => void>()

function getTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function toggleTheme() {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'

  document.documentElement.classList.toggle('dark', next === 'dark')

  try {
    localStorage.setItem('theme', next)
  } catch {
    // Private browsing can block storage; the choice just won't be kept
  }

  listeners.forEach((listener) => listener())
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getTheme)

  return { theme, toggleTheme }
}
