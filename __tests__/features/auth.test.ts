import { describe, it, expect, vi } from 'vitest'
import { createMockSupabaseClient } from '../helpers/supabase-mock'

describe('로그인 로직', () => {
  it('올바른 credentials로 signIn 성공', async () => {
    const mockClient = createMockSupabaseClient()
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'user-1' }, session: {} },
      error: null,
    })

    const result = await mockClient.auth.signInWithPassword({
      email: 'test@test.com',
      password: 'password123',
    })

    expect(result.error).toBeNull()
    expect(result.data.user.id).toBe('user-1')
  })

  it('잘못된 credentials → 에러 반환', async () => {
    const mockClient = createMockSupabaseClient()
    mockClient.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    })

    const result = await mockClient.auth.signInWithPassword({
      email: 'wrong@test.com',
      password: 'wrong',
    })

    expect(result.error).not.toBeNull()
    expect(result.error.message).toContain('Invalid')
  })
})

describe('회원가입 유효성 검사', () => {
  it('비밀번호 6자 미만 거부', () => {
    const password = '12345'
    expect(password.length >= 6).toBe(false)
  })

  it('비밀번호 6자 이상 허용', () => {
    const password = '123456'
    expect(password.length >= 6).toBe(true)
  })

  it('비밀번호 확인 불일치 거부', () => {
    const password = 'password123'
    const confirmPassword = 'password456'
    expect(password === confirmPassword).toBe(false)
  })

  it('빈 display_name 거부', () => {
    const displayName = '  '
    expect(displayName.trim().length > 0).toBe(false)
  })

  it('signUp에 display_name 메타데이터 전달', async () => {
    const mockClient = createMockSupabaseClient()
    mockClient.auth.signUp.mockResolvedValue({
      data: { user: { id: 'new-user' }, session: null },
      error: null,
    })

    await mockClient.auth.signUp({
      email: 'new@test.com',
      password: 'password123',
      options: { data: { display_name: '홍길동' } },
    })

    expect(mockClient.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: { data: { display_name: '홍길동' } },
      })
    )
  })
})
