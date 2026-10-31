import { describe, expect, it } from 'vitest'
import { getPlayerAge, getPlayerCardStats, parsePlayerAge, withPlayerAge } from '@/lib/player-card'
import type { Match, Player } from '@/types/database'

const fixture = { id: 'match-a', match_date: '2026-10-10', status: 'completed', quarters: [
  { quarter_records: [{ player_id: 'player-a', goals: 1, assists: 2 }] },
  { quarter_records: [{ player_id: 'player-a', goals: 2, assists: 0 }, { player_id: 'player-b', goals: 1 }] },
], match_attendees: [{ player_id: 'attendance-only' }] } as Match

describe('player card records', () => {
  it('counts unique played matches, excludes scheduled games and sums actual records', () => {
    expect(getPlayerCardStats('player-a', [fixture, fixture, { ...fixture, id: 'future', status: 'upcoming' }])).toEqual({ games: 1, goals: 3, assists: 2 })
    expect(getPlayerCardStats('attendance-only', [fixture])).toEqual({ games: 0, goals: 0, assists: 0 })
  })
  it('includes calendar boundaries and supports missing records', () => {
    expect(getPlayerCardStats('player-a', [fixture], '2026-10-10', '2026-10-10').games).toBe(1)
    expect(getPlayerCardStats('player-a', [fixture], '2026-10-11').games).toBe(0)
    expect(getPlayerCardStats('new-player', [fixture])).toEqual({ games: 0, goals: 0, assists: 0 })
  })
})

describe('optional player card age', () => {
  it('accepts blank or whole years without collecting date of birth', () => {
    expect(parsePlayerAge('')).toBeNull()
    expect(parsePlayerAge('28')).toBe(28)
    expect(parsePlayerAge('120')).toBe(120)
    for (const value of ['0', '-1', '121', '20.5', 'abc', '2e1']) expect(() => parsePlayerAge(value)).toThrow()
  })
  it('preserves legacy and unknown metadata when setting or clearing age', () => {
    const original = { pace: 88, custom: 'preserved', card: { age: 28, extra: 'preserved' } }
    const updated = withPlayerAge(original, 29)
    expect(updated).toEqual({ pace: 88, custom: 'preserved', card: { age: 29, extra: 'preserved' } })
    expect(original.card.age).toBe(28)
    expect(withPlayerAge(updated, null)).toEqual({ pace: 88, custom: 'preserved', card: { age: null, extra: 'preserved' } })
    expect(withPlayerAge(null, null)).toBeNull()
    expect(withPlayerAge(null, 28)).toEqual({ card: { age: 28 } })
  })
  it('hides absent, invalid and malformed stored age values', () => {
    for (const attributes of [null, {}, { pace: 50 }, { card: { age: null } }, { card: { age: 0 } }, { card: { age: '28' } }, { card: [] }]) {
      expect(getPlayerAge({ attributes } as Pick<Player, 'attributes'>)).toBeNull()
    }
    expect(getPlayerAge({ attributes: { card: { age: 28 } } })).toBe(28)
  })
})
