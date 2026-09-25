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

// When the user last logged out themselves (not a session that expired).
// Right after that, pages for logged-in users send them home instead of
// to the login page; a later visit to such a page asks to log in again.
let loggedOutAt = 0
const JUST_LOGGED_OUT_MS = 1000

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
  // The session ended by itself, e.g. the refresh token expired
  clear: () => save(null),
  // The user chose to log out
  logout: () => {
    loggedOutAt = Date.now()
    save(null)
  },
  justLoggedOut: () => Date.now() - loggedOutAt < JUST_LOGGED_OUT_MS,
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
