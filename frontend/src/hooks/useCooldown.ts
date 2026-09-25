import { useEffect, useState } from 'react'

// Seconds left before an action (like "resend code") can run again
export function useCooldown() {
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    if (secondsLeft <= 0) return
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000)
    return () => clearTimeout(timer)
  }, [secondsLeft])

  return { secondsLeft, start: (seconds: number) => setSecondsLeft(seconds) }
}
