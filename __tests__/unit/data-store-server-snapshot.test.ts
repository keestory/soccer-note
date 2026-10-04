import { describe, expect, it } from 'vitest'
import {
  EMPTY_SERVER_SNAPSHOT,
  getServerSnapshot,
  getStore,
  updateStore,
} from '@/lib/dataStore'

describe('data store server snapshot', () => {
  it('stays stable and empty when the live store is hydrated or updated', () => {
    const serverSnapshot = getServerSnapshot()

    updateStore({
      userId: 'cached-user',
      displayName: 'Cached User',
      selectedTeamId: 'cached-team',
      isLoaded: true,
      lastFetch: 123,
    })

    expect(getStore()).not.toBe(serverSnapshot)
    expect(getStore()).toMatchObject({
      userId: 'cached-user',
      selectedTeamId: 'cached-team',
      isLoaded: true,
    })

    expect(getServerSnapshot()).toBe(serverSnapshot)
    expect(getServerSnapshot()).toBe(EMPTY_SERVER_SNAPSHOT)
    expect(serverSnapshot).toMatchObject({
      userId: null,
      displayName: null,
      selectedTeamId: null,
      lastFetch: 0,
      isLoaded: false,
    })
    expect(serverSnapshot.teams).toEqual([])
    expect(serverSnapshot.matches).toEqual([])
    expect(serverSnapshot.trainings).toEqual([])
    expect(serverSnapshot.players).toEqual([])
    expect(serverSnapshot.members).toEqual([])
    expect(Object.isFrozen(serverSnapshot)).toBe(true)
    expect(Object.isFrozen(serverSnapshot.teams)).toBe(true)
  })
})
