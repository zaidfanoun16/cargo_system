import { authStore } from './auth-store'

// The backend address. Set VITE_API_URL in frontend/.env to change it.
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3000').replace(/\/$/, '')

// An error returned by the backend, or a network failure (status 0)
export class ApiError extends Error {
  readonly status: number
  readonly messages: string[]

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? `Request failed with status ${status}`)
    this.status = status
    this.messages = messages
  }
}

type Options = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  // Sends the access token and refreshes it once when it has expired
  auth?: boolean
}

async function send(path: string, { method = 'GET', body, auth = false }: Options) {
  const headers: Record<string, string> = {}

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const accessToken = authStore.get()?.accessToken
  if (auth && accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    // The server is down or the device is offline
    throw new ApiError(0, ['Network error'])
  }
}

async function readError(response: Response) {
  try {
    const data = await response.json()
    // Validation errors come as a list, other errors as one message
    const message = data?.message
    return new ApiError(response.status, Array.isArray(message) ? message : [String(message)])
  } catch {
    return new ApiError(response.status, [])
  }
}

// Gets a new access token with the refresh token. Several requests may
// fail at the same time, so they all wait for the same refresh.
let refreshing: Promise<boolean> | null = null

function refreshAccessToken() {
  refreshing ??= (async () => {
    const session = authStore.get()
    if (!session) return false

    const response = await send('/auth/refresh', {
      method: 'POST',
      body: { refreshToken: session.refreshToken },
    })

    if (!response.ok) {
      // The refresh token expired or the password was reset
      authStore.clear()
      return false
    }

    const { accessToken } = (await response.json()) as { accessToken: string }
    authStore.updateAccessToken(accessToken)
    return true
  })().finally(() => {
    refreshing = null
  })

  return refreshing
}

export async function api<T>(path: string, options: Options = {}): Promise<T> {
  let response = await send(path, options)

  if (response.status === 401 && options.auth && authStore.get()) {
    if (await refreshAccessToken()) {
      response = await send(path, options)
    }
  }

  if (!response.ok) {
    throw await readError(response)
  }

  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
