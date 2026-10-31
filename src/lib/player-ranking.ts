import type { Match, Player } from '@/types/database'

export type RankStatKey = 'goals' | 'assists' | 'contribution' | 'avgRating' | 'attendance' | 'cleanSheets'

export function buildPlayerRanking(players: Player[], matches: Match[], stat: RankStatKey, start = '', end = '') {
  const rangeMatches = matches.filter(match => (!start || match.match_date >= start) && (!end || match.match_date <= end))
  const records = rangeMatches.flatMap(match => (match.quarters ?? []).flatMap(quarter => quarter.quarter_records ?? []))
  const rows = players.map(player => {
    const playerRecords = records.filter(record => record.player_id === player.id)
    const rated = playerRecords.filter(record => record.rating != null)
    const stats = {
      goals: playerRecords.reduce((sum, record) => sum + (record.goals || 0), 0),
      assists: playerRecords.reduce((sum, record) => sum + (record.assists || 0), 0),
      contribution: playerRecords.reduce((sum, record) => sum + (record.contribution || 0), 0),
      avgRating: rated.length ? rated.reduce((sum, record) => sum + record.rating!, 0) / rated.length : null,
      attendance: rangeMatches.filter(match => (match.match_attendees ?? []).some(attendee => attendee.player_id === player.id)).length,
      cleanSheets: playerRecords.filter(record => record.clean_sheet).length,
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
