import type { Player, PositionType, Quarter, QuarterRecord } from '@/types/database'

export type ImportIssue = 'duplicate' | 'conflicting' | 'unavailable' | 'invalidPosition' | 'edge' | 'scope'
export interface ImportCandidate {
  playerId: string
  name: string
  player: Player | null
  position: { type: PositionType; x: number; y: number } | null
  issues: ImportIssue[]
  events: { direction: 'IN' | 'OUT'; minute: number | null }[]
}

// Postgres numeric columns may arrive as strings. Do not coerce null, blanks,
// booleans or arrays into plausible pitch coordinates.
function coordinate(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return null
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null
}

export function buildImportCandidates(source: Quarter, roster: Player[], eligibleIds: ReadonlySet<string>): ImportCandidate[] {
  const groups = new Map<string, QuarterRecord[]>()
  for (const row of source.quarter_records ?? []) {
    const rows = groups.get(row.player_id) ?? []
    rows.push(row)
    groups.set(row.player_id, rows)
  }
  return [...groups].map(([playerId, rows]) => {
    const row = rows[0]
    const player = roster.find(item => item.id === playerId) ?? null
    const x = coordinate(row.position_x), y = coordinate(row.position_y)
    const position = x !== null && y !== null && ['GK', 'DF', 'MF', 'FW'].includes(row.position_type)
      ? { type: row.position_type, x, y } : null
    const issues: ImportIssue[] = []
    if (rows.length > 1) {
      const positions = new Set(rows.map(item => JSON.stringify([item.position_type, item.position_x, item.position_y])))
      issues.push(positions.size > 1 ? 'conflicting' : 'duplicate')
    }
    if (!player || !eligibleIds.has(playerId)) issues.push('unavailable')
    if (rows.some(item => item.quarter_id !== source.id)) issues.push('scope')
    if (!position) issues.push('invalidPosition')
    // The existing pitch clips controls outside its editable area. Refuse these
    // positions visibly rather than silently moving an imported player.
    else if (position.x < 8 || position.x > 92 || position.y < 10 || position.y > 90) issues.push('edge')
    const events: ImportCandidate['events'] = []
    for (const event of source.quarter_substitutions ?? []) {
      if (event.quarter_id !== source.id) continue
      const minute = typeof event.minute === 'number' && Number.isFinite(event.minute) && event.minute >= 0 ? event.minute : null
      if (event.player_in_id === playerId) events.push({ direction: 'IN', minute })
      if (event.player_out_id === playerId) events.push({ direction: 'OUT', minute })
    }
    return { playerId, name: player?.name ?? (typeof row.player?.name === 'string' ? row.player.name : ''), player, position, issues, events }
  })
}

export function collidingImportIds(candidates: ImportCandidate[], selectedIds: ReadonlySet<string>): Set<string> {
  const positions = new Map<string, string[]>()
  for (const candidate of candidates) {
    if (!selectedIds.has(candidate.playerId) || !candidate.position) continue
    const key = `${candidate.position.x},${candidate.position.y}`
    positions.set(key, [...(positions.get(key) ?? []), candidate.playerId])
  }
  return new Set([...positions.values()].filter(ids => ids.length > 1).flat())
}

/** Only placement enters a new draft. Never spread a source record into it. */
export function createImportedPlayers(candidates: ImportCandidate[], selectedIds: ReadonlySet<string>) {
  const selected = candidates.filter(candidate => selectedIds.has(candidate.playerId))
  if (!selected.length || selected.length !== selectedIds.size || selected.some(candidate => candidate.issues.length || !candidate.player || !candidate.position) || collidingImportIds(candidates, selectedIds).size) {
    throw new Error('Invalid quarter import selection')
  }
  return selected.map(candidate => ({
    playerId: candidate.playerId, player: candidate.player!,
    positionType: candidate.position!.type, positionX: candidate.position!.x, positionY: candidate.position!.y,
    rating: null, goals: 0, assists: 0, cleanSheet: false, contribution: 0,
    praiseText: '', improvementText: '', highlightText: '', mediaUrls: [] as string[],
  }))
}
