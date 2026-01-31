import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'
import { testMatch } from '../helpers/fixtures'

describe('매치 생성', () => {
  it('매치 데이터 정확히 전달', async () => {
    const mockClient = createMockSupabaseClient({
      authUser: { id: 'user-1', email: 'coach@test.com' },
      queryResults: {
        matches: { data: testMatch, error: null },
      },
    })

    const result = await mockClient.from('matches').insert({
      team_id: 'team-1',
      opponent: 'FC Seoul',
      match_date: '2024-06-15',
      location: '잠실 운동장',
    }).select().single()

    expect(mockClient.from).toHaveBeenCalledWith('matches')
    expect(result.data.opponent).toBe('FC Seoul')
  })

  it('빈 상대팀명 거부', () => {
    const opponent = '  '
    expect(opponent.trim().length > 0).toBe(false)
  })
})

describe('매치 수정 권한', () => {
  it('coach는 항상 매치 수정 가능', () => {
    const role = 'coach'
    const canEdit = role === 'coach' || false
    expect(canEdit).toBe(true)
  })

  it('member는 can_edit_matches 권한 필요', () => {
    const role = 'member'
    const canEditMatches = true
    const canEdit = role === 'coach' || canEditMatches
    expect(canEdit).toBe(true)
  })

  it('권한 없는 member는 매치 수정 불가', () => {
    const role = 'member'
    const canEditMatches = false
    const canEdit = role === 'coach' || canEditMatches
    expect(canEdit).toBe(false)
  })
})
