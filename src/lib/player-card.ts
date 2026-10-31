import type { Match, Player } from '@/types/database'

export interface PlayerCardStats { games: number; goals: number; assists: number }

/** A player appears once per played match, regardless of the number of quarters. */
export function getPlayerCardStats(playerId: string, matches: Match[], start = '', end = ''): PlayerCardStats {
  const seen = new Set<string>()
  const stats = { games: 0, goals: 0, assists: 0 }
  for (const match of matches) {
    if (match.status === 'upcoming' || seen.has(match.id)) continue
    if ((start && match.match_date < start) || (end && match.match_date > end)) continue
    seen.add(match.id)
    const records = (match.quarters ?? []).flatMap(quarter => quarter.quarter_records ?? []).filter(record => record.player_id === playerId)
    if (!records.length) continue
    stats.games += 1
    stats.goals += records.reduce((sum, record) => sum + (record.goals || 0), 0)
    stats.assists += records.reduce((sum, record) => sum + (record.assists || 0), 0)
  }
  return stats
}

export function getPlayerAge(player: Pick<Player, 'attributes'>): number | null {
  const value = player.attributes?.card?.age
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 120 ? value : null
}

export function parsePlayerAge(input: string): number | null {
  if (!input.trim()) return null
  const value = Number(input)
  if (!/^\d+$/.test(input.trim()) || !Number.isInteger(value) || value < 1 || value > 120) throw new Error('invalid_age')
  return value
}

/** Preserve legacy skills and other metadata when updating optional card info. */
export function withPlayerAge(attributes: Player['attributes'], age: number | null): Player['attributes'] {
  if (age !== null && (!Number.isInteger(age) || age < 1 || age > 120)) throw new Error('invalid_age')
  if (!attributes && age === null) return null
  const current = attributes && typeof attributes === 'object' && !Array.isArray(attributes) ? attributes : {}
  const card = current.card && typeof current.card === 'object' && !Array.isArray(current.card) ? current.card : {}
  return { ...current, card: { ...card, age } }
}
