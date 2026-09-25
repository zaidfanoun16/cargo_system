// The signed-in user and their tokens, kept in localStorage so the
// session survives a page reload. Components read it with useAuth().

export type User = {
  id: number
  fullName: string
  email: string
  phoneNumber: string | null
  role: 'USER' | 'ADMIN'
}

export type Session = {
  user: User
  accessToken: string
  refreshToken: string
}

const STORAGE_KEY = 'session'
const listeners = new Set<() => void>()

function load(): Session | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as Session) : null
  } catch {
    return null
  }
}

let session = load()

function save(next: Session | null) {
  session = next

  try {
    if (next) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } else {
      localStorage.removeItem(STORAGE_KEY)
    }
  } catch {
    // Private browsing can block storage; the session lasts until reload
  }

  listeners.forEach((listener) => listener())
}

export const authStore = {
  get: () => session,
  set: (next: Session) => save(next),
  clear: () => save(null),
  updateAccessToken(accessToken: string) {
    if (session) save({ ...session, accessToken })
  },
  // After editing the profile (name, phone, email)
  updateUser(changes: Partial<User>) {
    if (session) save({ ...session, user: { ...session.user, ...changes } })
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

// Signing in or out in another tab updates this one too
window.addEventListener('storage', (event) => {
  if (event.key === STORAGE_KEY) {
    session = load()
    listeners.forEach((listener) => listener())
  }
})
