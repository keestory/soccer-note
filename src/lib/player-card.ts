import type { Match, Player, QuarterRecord } from '@/types/database'

export interface PlayerRecordTotals { goals: number; assists: number; cleanSheets: number; contribution: number }
export interface PlayerCardStats extends PlayerRecordTotals { games: number }

/** Preserve the existing ranking's per-quarter record totals. */
export function getQuarterRecordTotals(records: Pick<QuarterRecord, 'goals' | 'assists' | 'clean_sheet' | 'contribution'>[]): PlayerRecordTotals {
  const totals = { goals: 0, assists: 0, cleanSheets: 0, contribution: 0 }
  for (const record of records) {
    totals.goals += record.goals || 0
    totals.assists += record.assists || 0
    totals.cleanSheets += record.clean_sheet ? 1 : 0
    totals.contribution += record.contribution || 0
  }
  // Stored contribution values have one decimal place; avoid floating-point tails.
  totals.contribution = Math.round(totals.contribution * 10) / 10
  return totals
}

/** A player appears once per played match, regardless of the number of quarters. */
export function getPlayerCardStats(playerId: string, matches: Match[], start = '', end = ''): PlayerCardStats {
  const seen = new Set<string>()
  const playerRecords: QuarterRecord[] = []
  let games = 0
  for (const match of matches) {
    if (match.status === 'upcoming' || seen.has(match.id)) continue
    if ((start && match.match_date < start) || (end && match.match_date > end)) continue
    seen.add(match.id)
    const records = (match.quarters ?? []).flatMap(quarter => quarter.quarter_records ?? []).filter(record => record.player_id === playerId)
    if (!records.length) continue
    games += 1
    playerRecords.push(...records)
  }
  return { games, ...getQuarterRecordTotals(playerRecords) }
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
