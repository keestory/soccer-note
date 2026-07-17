import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  getStore, subscribe, loadAppData, selectTeam, refreshData,
} from '@/lib/dataStore'

export function useAppData() {
  const store = useSyncExternalStore(subscribe, getStore, getStore)
  const [initializing, setInitializing] = useState(!store.isLoaded)

  useEffect(() => {
    if (!store.isLoaded) loadAppData().finally(() => setInitializing(false))
    else setInitializing(false)
  }, [store.isLoaded])

  return {
    loading: initializing && !store.isLoaded,
    isLoaded: store.isLoaded,
    userId: store.userId,
    displayName: store.displayName,
    teams: store.teams,
    selectedTeamId: store.selectedTeamId,
    selectedTeam: store.teams.find((t) => t.id === store.selectedTeamId) || null,
    matches: store.matches,
    trainings: store.trainings,
    players: store.players,
    members: store.members,
    visibilitySettings: store.visibilitySettings,
    selectTeam,
    refresh: refreshData,
  }
}
