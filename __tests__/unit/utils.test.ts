import { describe, it, expect } from 'vitest'
import { calculateMVP, getPlayerStatsFromMatch, formatDate, formatRating, cn } from '@/lib/utils'
import {
  testMatch,
  testMatchNoQuarters,
  testMatchNullRating,
  testMatchMultiQuarter,
  testMatchMultiPlayer,
} from '../helpers/fixtures'

describe('calculateMVP', () => {
  it('quarters가 없으면 null 반환', () => {
    expect(calculateMVP(testMatchNoQuarters)).toBeNull()
  })

  it('단일 선수의 MVP를 정확히 반환', () => {
    const mvp = calculateMVP(testMatch)
    expect(mvp).not.toBeNull()
    expect(mvp!.playerName).toBe('김민수')
    expect(mvp!.averageRating).toBe(8.5)
    expect(mvp!.totalGoals).toBe(1)
    expect(mvp!.totalAssists).toBe(2)
  })

  it('rating이 null인 선수는 MVP에서 제외', () => {
    expect(calculateMVP(testMatchNullRating)).toBeNull()
  })

  it('복수 쿼터의 평균 rating 계산', () => {
    const mvp = calculateMVP(testMatchMultiQuarter)
    expect(mvp).not.toBeNull()
    // (8.5 + 9.0) / 2 = 8.75
    expect(mvp!.averageRating).toBe(8.75)
    expect(mvp!.totalGoals).toBe(1) // 1 + 0
    expect(mvp!.totalAssists).toBe(3) // 2 + 1
  })

  it('복수 선수 중 가장 높은 평균 rating 선수를 MVP로 선정', () => {
    const mvp = calculateMVP(testMatchMultiPlayer)
    expect(mvp).not.toBeNull()
    expect(mvp!.playerName).toBe('김민수') // 8.5 > 7.0
    expect(mvp!.averageRating).toBe(8.5)
  })
})

describe('getPlayerStatsFromMatch', () => {
  it('quarters가 없으면 빈 배열 반환', () => {
    expect(getPlayerStatsFromMatch(testMatchNoQuarters)).toEqual([])
  })

  it('averageRating 내림차순 정렬', () => {
    const stats = getPlayerStatsFromMatch(testMatchMultiPlayer)
    expect(stats.length).toBe(2)
    expect(stats[0].playerName).toBe('김민수') // 8.5
    expect(stats[1].playerName).toBe('박지성') // 7.0
  })

  it('골/어시스트/클린시트 정확히 집계', () => {
    const stats = getPlayerStatsFromMatch(testMatchMultiQuarter)
    const player = stats.find(s => s.playerId === 'player-1')
    expect(player).toBeDefined()
    expect(player!.totalGoals).toBe(1)
    expect(player!.totalAssists).toBe(3)
    expect(player!.cleanSheets).toBe(0)
  })

  it('rating null인 선수도 결과에 포함 (averageRating 0)', () => {
    const stats = getPlayerStatsFromMatch(testMatchNullRating)
    expect(stats.length).toBe(1)
    expect(stats[0].averageRating).toBe(0)
  })
})

describe('formatDate', () => {
  it('한국어 날짜 포맷으로 변환', () => {
    const result = formatDate('2024-06-15')
    expect(result).toContain('2024')
    expect(result).toContain('6')
    expect(result).toContain('15')
  })
})

describe('formatRating', () => {
  it('null이면 "-" 반환', () => {
    expect(formatRating(null)).toBe('-')
  })

  it('소수점 1자리로 포맷', () => {
    expect(formatRating(8)).toBe('8.0')
    expect(formatRating(7.56)).toBe('7.6')
    expect(formatRating(10)).toBe('10.0')
  })
})

describe('cn', () => {
  it('Tailwind 클래스 병합', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('조건부 클래스 처리', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })
})
