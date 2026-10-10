import { describe, expect, it } from 'vitest'
import { isUpcomingMatchDate, matchCalendarDay } from '@/lib/match-date'
import { formatDate } from '@/lib/utils'
describe('local-calendar match scheduling', () => {
  it('keeps date-only fixtures scheduled for the whole local day', () => {
    for (const hour of [0, 9, 23]) expect(isUpcomingMatchDate('2026-10-18', new Date(2026, 9, 18, hour, 59))).toBe(true)
    expect(isUpcomingMatchDate('2026-10-17', new Date(2026, 9, 18))).toBe(false)
    expect(isUpcomingMatchDate('2026-10-19', new Date(2026, 9, 18))).toBe(true)
  })
  it('still compares actual kickoff timestamps by instant', () => {
    const now = new Date('2026-10-18T12:00:00Z')
    expect(isUpcomingMatchDate('2026-10-18T11:00:00Z', now)).toBe(false)
    expect(isUpcomingMatchDate('2026-10-18T13:00:00Z', now)).toBe(true)
  })
  it('uses the same calendar day for a badge and a localized label', () => {
    expect(matchCalendarDay('2026-10-18')).toBe(18)
    expect(formatDate('2026-10-18', 'en_US')).toBe('October 18, 2026')
    expect(formatDate('2026-10-18', 'de')).toBe('18. Oktober 2026')
  })
})
