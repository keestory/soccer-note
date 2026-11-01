import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EMPTY_SERVER_SNAPSHOT, getStore, refreshDataAfterAuth, updateStore } from '@/lib/dataStore'

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createClient: () => ({ auth: { getSession: mocks.getSession }, from: mocks.from }) }))

describe('authenticated entry data transition', () => {
  beforeEach(() => {
    updateStore({ ...EMPTY_SERVER_SNAPSHOT })
    mocks.getSession.mockReset().mockResolvedValue({ data: { session: { user: { id: 'new-user', user_metadata: {} } } } })
    mocks.from.mockReset().mockImplementation(() => {
      const query = { select: () => query, eq: () => query, or: () => Promise.resolve({ data: [] }), single: () => Promise.resolve({ data: { display_name: 'New user' } }) }
      return query
    })
  })

  it('does not reuse a fresh anonymous cache after password authentication', async () => {
    updateStore({ isLoaded: true, lastFetch: Date.now(), userId: null })
    await refreshDataAfterAuth('new-user')
    expect(mocks.getSession).toHaveBeenCalledTimes(1)
    expect(getStore()).toMatchObject({ userId: 'new-user', isLoaded: true, displayName: 'New user' })
  })

  it('clears old account team data before the new account with no teams loads', async () => {
    updateStore({ isLoaded: true, lastFetch: Date.now(), userId: 'old-user', selectedTeamId: 'old-team', matches: [{ id: 'old-match' }] as never, players: [{ id: 'old-player' }] as never })
    await refreshDataAfterAuth('new-user')
    expect(getStore()).toMatchObject({ userId: 'new-user', selectedTeamId: null, matches: [], players: [], teams: [] })
  })
})
