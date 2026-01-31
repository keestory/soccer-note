import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createUploadRequest } from '../helpers/request-helpers'

// vi.hoisted로 mock 객체를 호이스팅
const { mockAuthGetUser, mockStorageFrom } = vi.hoisted(() => {
  const mockStorageFrom = vi.fn(() => ({
    upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }),
    getPublicUrl: vi.fn().mockReturnValue({
      data: { publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/player-media/test/photo.jpg' },
    }),
  }))
  const mockAuthGetUser = vi.fn().mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com' } },
    error: null,
  })
  return { mockAuthGetUser, mockStorageFrom }
})

vi.mock('@/lib/supabase-server', () => ({
  createServerSupabaseClient: vi.fn(() => Promise.resolve({
    auth: { getUser: mockAuthGetUser },
  })),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    storage: { from: mockStorageFrom },
  })),
}))

import { POST } from '@/app/api/upload/route'

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuthGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'test@test.com' } },
      error: null,
    })
    mockStorageFrom.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test/photo.jpg' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/player-media/test/photo.jpg' },
      }),
    })
  })

  it('비인증 요청 → 401', async () => {
    mockAuthGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const file = new File(['test'], 'photo.jpg', { type: 'image/jpeg' })
    const request = createUploadRequest(file, 'test/photo.jpg')
    const response = await POST(request)

    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toBe('인증이 필요합니다')
  })

  it('파일 누락 → 400', async () => {
    const formData = new FormData()
    formData.append('filePath', 'test/photo.jpg')
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('filePath 누락 → 400', async () => {
    const formData = new FormData()
    formData.append('file', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))
    const request = new NextRequest('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    expect(response.status).toBe(400)
  })

  it('정상 업로드 → 200 + URL 반환', async () => {
    const file = new File(['image-data'], 'photo.jpg', { type: 'image/jpeg' })
    const request = createUploadRequest(file, 'test/photo.jpg')

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.url).toContain('supabase.co')
    expect(body.url).toContain('player-media')
  })

  it('스토리지 에러 → 500', async () => {
    mockStorageFrom.mockReturnValueOnce({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      }),
      getPublicUrl: vi.fn(),
    })

    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })
    const request = createUploadRequest(file, 'test/photo.jpg')

    const response = await POST(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('Storage quota exceeded')
  })
})
