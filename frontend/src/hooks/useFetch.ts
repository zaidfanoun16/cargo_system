import { useEffect, useState } from 'react'

import { api } from '../lib/api'

type Result<T> = { key: string; data?: T; error?: unknown }

// Loads a GET endpoint and reloads when the path changes. A null path
// loads nothing. While new data loads, the last result stays available
// (as "data") so the page does not flash empty.
export function useFetch<T>(path: string | null, { auth = false } = {}) {
  const [reloads, setReloads] = useState(0)
  const [result, setResult] = useState<Result<T>>()
  const [lastData, setLastData] = useState<T>()

  const key = path === null ? null : `${path}#${reloads}`

  useEffect(() => {
    if (path === null || key === null) return
    let cancelled = false

    api<T>(path, { auth }).then(
      (data) => {
        if (cancelled) return
        setResult({ key, data })
        setLastData(data)
      },
      (error: unknown) => {
        if (!cancelled) setResult({ key, error })
      },
    )

    return () => {
      cancelled = true
    }
  }, [path, key, auth])

  const current = result?.key === key ? result : undefined

  return {
    data: current ? current.data : lastData,
    error: current?.error,
    loading: key !== null && !current,
    reload: () => setReloads((count) => count + 1),
  }
}
