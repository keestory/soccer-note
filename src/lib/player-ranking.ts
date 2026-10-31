import type { Match, Player } from '@/types/database'
import { getQuarterRecordTotals } from './player-card'

export type RankStatKey = 'goals' | 'assists' | 'contribution' | 'avgRating' | 'attendance' | 'cleanSheets'

export function buildPlayerRanking(players: Player[], matches: Match[], stat: RankStatKey, start = '', end = '') {
  const rangeMatches = matches.filter(match => (!start || match.match_date >= start) && (!end || match.match_date <= end))
  const records = rangeMatches.filter(match => match.status !== 'upcoming').flatMap(match => (match.quarters ?? []).flatMap(quarter => quarter.quarter_records ?? []))
  const rows = players.map(player => {
    const playerRecords = records.filter(record => record.player_id === player.id)
    const rated = playerRecords.filter(record => record.rating != null)
    const stats = {
      ...getQuarterRecordTotals(playerRecords),
      avgRating: rated.length ? rated.reduce((sum, record) => sum + record.rating!, 0) / rated.length : null,
      attendance: rangeMatches.filter(match => (match.match_attendees ?? []).some(attendee => attendee.player_id === player.id)).length,
    }
    return { player, value: stats[stat] }
  }).sort((a, b) => (b.value ?? -1) - (a.value ?? -1))

  return {
    hasRecords: stat === 'attendance'
      ? rangeMatches.some(match => match.match_attendees?.some(attendee => players.some(player => player.id === attendee.player_id)))
      : records.some(record => players.some(player => player.id === record.player_id)),
    rows: rows.map(row => ({ ...row, rank: rows.findIndex(other => other.value === row.value) + 1 })),
  }
}
