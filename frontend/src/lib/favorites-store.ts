import { api } from './api'
import { authStore } from './auth-store'

// Ids of the logged-in user's favorite cars, shared by every heart button.
// Loaded once per login; changes show at once and are then sent to the
// server (and undone if the server refuses).

type State = { userId: number | null; ids: ReadonlySet<number>; loaded: boolean }

let state: State = { userId: null, ids: new Set(), loaded: false }
const listeners = new Set<() => void>()

function set(next: State) {
  state = next
  listeners.forEach((listener) => listener())
}

async function load(userId: number) {
  try {
    const ids = await api<number[]>('/favorites/ids', { auth: true })
    if (state.userId === userId) set({ userId, ids: new Set(ids), loaded: true })
  } catch {
    // Hearts stay empty; the next toggle still works
  }
}

// Follow logins and logouts
function sync() {
  const userId = authStore.get()?.user.id ?? null
  if (userId === state.userId) return
  set({ userId, ids: new Set(), loaded: false })
  if (userId !== null) void load(userId)
}
authStore.subscribe(sync)
sync()

function change(carId: number, saved: boolean) {
  const ids = new Set(state.ids)
  if (saved) ids.add(carId)
  else ids.delete(carId)
  set({ ...state, ids })
}

export const favoritesStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
  // Returns whether the car is now a favorite
  async toggle(carId: number) {
    const saved = !state.ids.has(carId)
    change(carId, saved)
    try {
      await api(`/favorites/${carId}`, { method: saved ? 'PUT' : 'DELETE', auth: true })
      return saved
    } catch (error) {
      change(carId, !saved)
      throw error
    }
  },
}
