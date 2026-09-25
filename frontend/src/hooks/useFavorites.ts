import { useSyncExternalStore } from 'react'

import { favoritesStore } from '../lib/favorites-store'

export function useFavorites() {
  const state = useSyncExternalStore(favoritesStore.subscribe, favoritesStore.get)

  return {
    ids: state.ids,
    loaded: state.loaded,
    isFavorite: (carId: number) => state.ids.has(carId),
    toggle: favoritesStore.toggle,
  }
}
