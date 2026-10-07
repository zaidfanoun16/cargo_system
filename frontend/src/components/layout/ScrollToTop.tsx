import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

// A new page opens at its top. The browser's back and forward buttons
// keep their own scroll position, and changing only the search (filters
// on the cars page) does not jump.
export function ScrollToTop() {
  const { pathname } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    if (navigationType !== 'POP') {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    }
  }, [pathname, navigationType])

  return null
}
