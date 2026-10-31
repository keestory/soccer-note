import { describe, expect, it } from 'vitest'
import { buildPlayerRanking } from '@/lib/player-ranking'
import type { Match, Player, QuarterRecord } from '@/types/database'

const players = ['a', 'b', 'c'].map(id => ({ id, team_id: 'team', name: id, number: 0, default_position: 'FW' } as Player))
function match(date: string, records: Partial<QuarterRecord>[], attendees: string[] = []): Match {
  return {
    id: date, team_id: 'team', match_date: date,
    quarters: [{ quarter_records: records }],
    match_attendees: attendees.map(player_id => ({ player_id })),
  } as Match
}
const matches = [
  match('2026-10-01', [
    { player_id: 'a', goals: 2, assists: 1, contribution: 3, clean_sheet: true, rating: 8 },
    { player_id: 'a', goals: 1, assists: 0, contribution: 1, clean_sheet: false, rating: 6 },
    { player_id: 'b', goals: 3, assists: 2, contribution: 2, clean_sheet: false, rating: null },
  ], ['a', 'b']),
  match('2026-10-31', [{ player_id: 'c', goals: 1, assists: 4, contribution: 5, clean_sheet: true, rating: 9 }], ['a', 'c']),
]

describe('team player rankings', () => {
  it('keeps competition ties and sums quarter records without double-counting attendance', () => {
    expect(buildPlayerRanking(players, matches, 'goals').rows.map(({ player, value, rank }) => [player.id, value, rank])).toEqual([['a', 3, 1], ['b', 3, 1], ['c', 1, 3]])
    expect(buildPlayerRanking(players, matches, 'attendance').rows.map(({ player, value }) => [player.id, value])).toEqual([['a', 2], ['b', 1], ['c', 1]])
  })
  it('preserves the other metrics and sorts unrated players last', () => {
    expect(buildPlayerRanking(players, matches, 'assists').rows[0].value).toBe(4)
    expect(buildPlayerRanking(players, matches, 'contribution').rows[0].value).toBe(5)
    expect(buildPlayerRanking(players, matches, 'cleanSheets').rows.map(row => row.value)).toEqual([1, 1, 0])
    expect(buildPlayerRanking(players, matches, 'avgRating').rows.map(row => row.value)).toEqual([9, 7, null])
  })
  it('counts every recorded clean sheet and keeps fractional contributions consistent', () => {
    const played = match('2026-10-10', [
      { player_id: 'a', goals: 0, assists: 0, contribution: 0.1, clean_sheet: true },
      { player_id: 'a', goals: 0, assists: 0, contribution: 0.2, clean_sheet: true },
    ])
    const upcoming = { ...match('2026-10-11', [{ player_id: 'a', contribution: 9, clean_sheet: true }]), status: 'upcoming' as const }
    expect(buildPlayerRanking(players, [played, upcoming], 'contribution').rows[0].value).toBe(0.3)
    expect(buildPlayerRanking(players, [played, upcoming], 'cleanSheets').rows[0].value).toBe(2)
    expect(buildPlayerRanking(players, [upcoming], 'cleanSheets').hasRecords).toBe(false)
  })
  it('includes both date boundaries and supports open-ended ranges', () => {
    expect(buildPlayerRanking(players, matches, 'goals', '2026-10-01', '2026-10-01').rows[0].value).toBe(3)
    expect(buildPlayerRanking(players, matches, 'goals', '2026-10-31').rows[0].player.id).toBe('c')
    expect(buildPlayerRanking(players, matches, 'goals', '', '2026-09-30').hasRecords).toBe(false)
    expect(buildPlayerRanking(players, matches, 'goals', '2026-11-01', '2026-10-01').hasRecords).toBe(false)
  })
  it('distinguishes no records from real zero values and attendance-only matches', () => {
    expect(buildPlayerRanking([], matches, 'goals').rows).toEqual([])
    expect(buildPlayerRanking(players, [], 'goals').hasRecords).toBe(false)
    expect(buildPlayerRanking(players, [match('2026-10-01', [{ player_id: 'a', goals: 0 }])], 'goals').hasRecords).toBe(true)
    const attendanceOnly = [match('2026-10-01', [], ['a'])]
    expect(buildPlayerRanking(players, attendanceOnly, 'attendance').hasRecords).toBe(true)
    expect(buildPlayerRanking(players, attendanceOnly, 'goals').hasRecords).toBe(false)
  })
})
