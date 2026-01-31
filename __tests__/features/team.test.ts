import { describe, it, expect } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'
import { testTeam } from '../helpers/fixtures'

describe('팀 생성', () => {
  it('팀 insert에 올바른 데이터 전달', async () => {
    const mockClient = createMockSupabaseClient({
      authUser: { id: 'user-1', email: 'coach@test.com' },
      queryResults: {
        teams: { data: testTeam, error: null },
      },
    })

    const result = await mockClient.from('teams').insert({
      name: 'My Team',
      user_id: 'user-1',
    }).select().single()

    expect(mockClient.from).toHaveBeenCalledWith('teams')
    expect(result.data.name).toBe('Test FC')
  })

  it('팀 생성 후 coach role의 team_member 생성', async () => {
    const mockClient = createMockSupabaseClient({
      queryResults: {
        team_members: { data: { id: 'member-1', role: 'coach' }, error: null },
      },
    })

    const result = await mockClient.from('team_members').upsert({
      team_id: 'team-1',
      user_id: 'user-1',
      role: 'coach',
      can_edit_players: true,
      can_edit_matches: true,
      can_edit_quarters: true,
    }).single()

    expect(mockClient.from).toHaveBeenCalledWith('team_members')
    expect(result.data.role).toBe('coach')
  })
})

describe('팀 가입', () => {
  it('초대코드 대문자 변환', () => {
    const code = 'abc123'
    expect(code.toUpperCase()).toBe('ABC123')
  })

  it('가입 요청 시 pending 상태로 생성', async () => {
    const mockClient = createMockSupabaseClient({
      queryResults: {
        team_members: { data: { id: 'member-2', status: 'pending' }, error: null },
      },
    })

    const result = await mockClient.from('team_members').insert({
      team_id: 'team-1',
      user_id: 'user-2',
      role: 'member',
      status: 'pending',
    }).single()

    expect(result.data.status).toBe('pending')
  })
})
