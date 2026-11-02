import { beforeEach, describe, expect, it, vi } from 'vitest'
import { applySavedQuarterRecords, EMPTY_SERVER_SNAPSHOT, getStore, updateStore } from '@/lib/dataStore'
import type { Match, QuarterRecord } from '@/types/database'

vi.mock('@/lib/supabase', () => ({ createClient: vi.fn(() => { throw new Error('Cache patch must not start requests') }) }))

describe('acknowledged quarter cache updates', () => {
  const saved = { id: 'r1', player_id: 'p1', quarter_id: 'q1', goals: 5 } as QuarterRecord
  beforeEach(() => {
    updateStore({ ...EMPTY_SERVER_SNAPSHOT, selectedTeamId: 'team1', lastFetch: Date.now(), matches: [
      { id: 'm1', team_id: 'team1', quarters: [{ id: 'q1', quarter_records: [
        { ...saved, goals: 1 }, { id: 'r2', player_id: 'p2', quarter_id: 'q1' }, { id: 'concurrent', player_id: 'p3', quarter_id: 'q1' },
      ] }, { id: 'q2', quarter_records: [] }] },
      { id: 'm2', team_id: 'team1', quarters: [] },
    ] as unknown as Match[] })
  })
  it('updates known writes and removals, keeps other records and marks cache stale', () => {
    const previous = getStore()
    applySavedQuarterRecords('team1', 'm1', 'q1', [saved], ['r2'])
    const next = getStore()
    expect(next.matches[0].quarters?.[0].quarter_records).toEqual([
      { id: 'concurrent', player_id: 'p3', quarter_id: 'q1' }, { ...saved, player: undefined },
    ])
    expect(next.matches[0].quarters?.[1]).toBe(previous.matches[0].quarters?.[1])
    expect(next.matches[1]).toBe(previous.matches[1])
    expect(next.lastFetch).toBe(0)
  })
  it('cannot patch a different selected team, match or quarter', () => {
    const previous = getStore()
    applySavedQuarterRecords('team2', 'm1', 'q1', [saved], [])
    applySavedQuarterRecords('team1', 'wrong-match', 'q1', [saved], [])
    applySavedQuarterRecords('team1', 'm1', 'q2', [saved], [])
    expect(getStore()).toBe(previous)
  })
})
