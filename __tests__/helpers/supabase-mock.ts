import { vi } from 'vitest'

export function createMockQueryBuilder(resolvedValue: { data: any; error: any }) {
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(resolvedValue),
    then: vi.fn((resolve: any) => resolve(resolvedValue)),
  }
  return builder
}

export function createMockSupabaseClient(overrides: {
  authUser?: { id: string; email: string } | null
  queryResults?: Record<string, { data: any; error: any }>
  storageUpload?: { data: any; error: any }
} = {}) {
  const { authUser = null, queryResults = {}, storageUpload } = overrides

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: authUser },
        error: authUser ? null : { message: 'Not authenticated' },
      }),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn((table: string) => {
      if (queryResults[table]) {
        return createMockQueryBuilder(queryResults[table])
      }
      return createMockQueryBuilder({ data: null, error: null })
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue(
          storageUpload || { data: { path: 'test/path.jpg' }, error: null }
        ),
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://test-project.supabase.co/storage/v1/object/public/player-media/test/path.jpg' },
        }),
      })),
    },
  }
}
