import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { Match, PlayerStats, QuarterRecord } from '@/types/database'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Calculate MVP from match data
export function calculateMVP(match: Match): PlayerStats | null {
  if (!match.quarters) return null

  const playerStatsMap = new Map<string, PlayerStats>()

  match.quarters.forEach(quarter => {
    quarter.quarter_records?.forEach(record => {
      if (!record.player) return

      const existing = playerStatsMap.get(record.player_id) || {
        playerId: record.player_id,
        playerName: record.player.name,
        playerNumber: record.player.number,
        totalRating: 0,
        ratingCount: 0,
        averageRating: 0,
        totalGoals: 0,
        totalAssists: 0,
        cleanSheets: 0,
        avgContribution: 0,
      }

      if (record.rating !== null) {
        existing.totalRating += record.rating
        existing.ratingCount += 1
      }
      existing.totalGoals += record.goals
      existing.totalAssists += record.assists
      if (record.clean_sheet) existing.cleanSheets += 1
      existing.avgContribution += record.contribution

      playerStatsMap.set(record.player_id, existing)
    })
  })

  let mvp: PlayerStats | null = null
  let highestAvg = 0

  playerStatsMap.forEach(stats => {
    if (stats.ratingCount > 0) {
      stats.averageRating = stats.totalRating / stats.ratingCount
      stats.avgContribution = stats.avgContribution / stats.ratingCount

      if (stats.averageRating > highestAvg) {
        highestAvg = stats.averageRating
        mvp = stats
      }
    }
  })

  return mvp
}

// Get all player stats from match
export function getPlayerStatsFromMatch(match: Match): PlayerStats[] {
  if (!match.quarters) return []

  const playerStatsMap = new Map<string, PlayerStats>()

  match.quarters.forEach(quarter => {
    quarter.quarter_records?.forEach(record => {
      if (!record.player) return

      const existing = playerStatsMap.get(record.player_id) || {
        playerId: record.player_id,
        playerName: record.player.name,
        playerNumber: record.player.number,
        totalRating: 0,
        ratingCount: 0,
        averageRating: 0,
        totalGoals: 0,
        totalAssists: 0,
        cleanSheets: 0,
        avgContribution: 0,
      }

      if (record.rating !== null) {
        existing.totalRating += record.rating
        existing.ratingCount += 1
      }
      existing.totalGoals += record.goals
      existing.totalAssists += record.assists
      if (record.clean_sheet) existing.cleanSheets += 1
      existing.avgContribution += record.contribution

      playerStatsMap.set(record.player_id, existing)
    })
  })

  const results: PlayerStats[] = []
  playerStatsMap.forEach(stats => {
    if (stats.ratingCount > 0) {
      stats.averageRating = stats.totalRating / stats.ratingCount
      stats.avgContribution = stats.avgContribution / stats.ratingCount
    }
    results.push(stats)
  })

  return results.sort((a, b) => b.averageRating - a.averageRating)
}

// Format date in Korean
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Format rating with one decimal
export function formatRating(rating: number | null): string {
  if (rating === null) return '-'
  return rating.toFixed(1)
}
