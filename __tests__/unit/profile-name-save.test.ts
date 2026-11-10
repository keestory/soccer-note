import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createNameGateway, createNameJournal, newNameAttempt, runNameAttempt, type NameAccount, type NameAttempt, type NameGateway } from '@/lib/profile-name-save'

const owner: NameAccount = { id: 'owner-a', email: 'synthetic@example.test', token: 'synthetic-token-a' }
const target = 'Synthetic new name'
const key = 'soccernote-profile-name-v1:' + owner.id

function harness() {
  const values = new Map<string, string>()
  const storage = { getItem: vi.fn((key: string) => values.get(key) ?? null), setItem: vi.fn((key: string, value: string) => { values.set(key, value) }), removeItem: vi.fn((key: string) => { values.delete(key) }) }
  const journal = createNameJournal(storage)
  let authName = 'Old', profileName = 'Old', current = true
  const gateway: NameGateway = {
    account: vi.fn(async () => owner),
    readAuth: vi.fn(async () => authName), readProfile: vi.fn(async () => profileName),
    writeAuth: vi.fn(async (_owner, name) => { authName = name; return 'confirmed' }),
    writeProfile: vi.fn(async (_owner, name) => { profileName = name; return 'confirmed' }),
  }
  let latest = newNameAttempt(owner.id, target)
  const publish = vi.fn((attempt: NameAttempt) => { latest = attempt })
  const run = async (action: 'save' | 'retry' | 'check' = 'save') => {
    const result = await runNameAttempt(latest, action, gateway, journal, () => current, publish)
    latest = result.attempt
    return result
  }
  return { storage, values, journal, gateway, publish, run,
    setAuth: (name: string) => { authName = name }, setProfile: (name: string) => { profileName = name },
    leave: () => { current = false }, latest: () => latest }
}

describe('profile name two-stage recovery', () => {
  it('journals uncertainty before each mutation and clears only a complete save', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockImplementation(async () => {
      expect(h.journal.read(owner.id)).toMatchObject({ auth: 'unknown', profile: 'unstarted' })
      return 'confirmed'
    })
    vi.mocked(h.gateway.writeProfile).mockImplementation(async () => {
      expect(h.journal.read(owner.id)).toMatchObject({ auth: 'confirmed', profile: 'unknown' })
      return 'confirmed'
    })
    expect((await h.run()).outcome).toBe('saved')
    expect(h.journal.read(owner.id)).toBeNull()
  })

  it('retries only a rejected profile after fresh reads, preserving confirmed auth', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeProfile).mockResolvedValueOnce('rejected')
    expect((await h.run()).attempt).toMatchObject({ auth: 'confirmed', profile: 'rejected' })
    expect((await h.run('retry')).outcome).toBe('saved')
    expect(h.gateway.readAuth).toHaveBeenCalledOnce()
    expect(h.gateway.readProfile).toHaveBeenCalledOnce()
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
    expect(h.gateway.writeProfile).toHaveBeenCalledTimes(2)
  })

  it('does not start profile after rejected auth and retries on explicit checked action', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockResolvedValueOnce('rejected')
    await h.run()
    expect(h.gateway.writeProfile).not.toHaveBeenCalled()
    expect((await h.run('retry')).outcome).toBe('saved')
    expect(h.gateway.writeAuth).toHaveBeenCalledTimes(2)
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
  })

  it('keeps uncertain auth unknown after a mismatched read, including explicit retry', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockResolvedValueOnce('unknown')
    await h.run()
    expect((await h.run('check')).attempt.auth).toBe('unknown')
    expect((await h.run('retry')).attempt.auth).toBe('unknown')
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
    expect(h.gateway.writeProfile).not.toHaveBeenCalled()
  })

  it('matching auth read reconciles lost response without automatically writing profile', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockImplementationOnce(async () => { h.setAuth(target); return 'unknown' })
    await h.run()
    expect((await h.run('check')).attempt).toMatchObject({ auth: 'confirmed', profile: 'unstarted' })
    expect(h.gateway.writeProfile).not.toHaveBeenCalled()
    expect((await h.run('retry')).outcome).toBe('saved')
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
  })

  it('matching profile read reconciles an uncertain accepted write without resending', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeProfile).mockImplementationOnce(async () => { h.setProfile(target); return 'unknown' })
    await h.run()
    expect((await h.run('check')).outcome).toBe('saved')
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
    expect(h.journal.read(owner.id)).toBeNull()
  })

  it('failed verification reads preserve evidence and do not authorize writes', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeProfile).mockResolvedValueOnce('rejected')
    await h.run()
    vi.mocked(h.gateway.readProfile).mockRejectedValueOnce(new Error('offline'))
    const result = await h.run('retry')
    expect(result.outcome).toBe('unverified')
    expect(result.attempt.profile).toBe('rejected')
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
  })

  it('a changed acknowledged name becomes unresolved rather than being overwritten on retry', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeProfile).mockResolvedValueOnce('rejected')
    await h.run()
    h.setAuth('Another client changed it')
    expect((await h.run('retry')).attempt.auth).toBe('unknown')
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
  })

  it('a formerly rejected profile now matching is skipped', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeProfile).mockResolvedValueOnce('rejected')
    await h.run()
    h.setProfile(target)
    expect((await h.run('retry')).outcome).toBe('saved')
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
  })

  it('stale auth completion cannot update the journal or start profile for a new screen', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockImplementationOnce(async () => { h.leave(); return 'confirmed' })
    expect((await h.run()).outcome).toBe('stale')
    expect(h.journal.read(owner.id)?.auth).toBe('unknown')
    expect(h.gateway.writeProfile).not.toHaveBeenCalled()
  })

  it('changed account before a second stage prevents sending that stage', async () => {
    const h = harness()
    vi.mocked(h.gateway.account).mockResolvedValueOnce(owner).mockResolvedValueOnce(owner).mockResolvedValueOnce({ ...owner, id: 'owner-b' })
    expect((await h.run()).outcome).toBe('stale')
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
    expect(h.gateway.writeProfile).not.toHaveBeenCalled()
  })

  it('same-tab journal reload retains unknown while another account sees no attempt', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockResolvedValueOnce('unknown')
    await h.run()
    const restored = createNameJournal(h.storage)
    expect(restored.read(owner.id)).toMatchObject({ name: target, auth: 'unknown' })
    expect(restored.read('owner-b')).toBeNull()
    expect(h.values.get(key)).not.toContain('synthetic-token')
    expect(h.values.get(key)).not.toContain('synthetic@example.test')
  })

  it('storage failure before dispatch starts no mutation and keeps an unsent attempt retryable', async () => {
    const h = harness()
    h.storage.setItem.mockImplementationOnce(() => { throw new Error('storage blocked') })
    const result = await h.run()
    expect(result.outcome).toBe('storage-blocked')
    expect(result.attempt.auth).toBe('unstarted')
    expect(h.gateway.writeAuth).not.toHaveBeenCalled()
    expect((await h.run('retry')).outcome).toBe('saved')
  })

  it('failure to persist a successful first reply stops before the second mutation', async () => {
    const h = harness()
    vi.mocked(h.gateway.writeAuth).mockImplementationOnce(async () => {
      h.setAuth(target)
      h.storage.setItem.mockImplementationOnce(() => { throw new Error('storage blocked') })
      return 'confirmed'
    })
    expect((await h.run()).outcome).toBe('storage-blocked')
    expect(h.gateway.writeProfile).not.toHaveBeenCalled()
    expect(h.journal.read(owner.id)?.auth).toBe('unknown')
    expect((await h.run('retry')).outcome).toBe('saved')
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
  })

  it('a failed completed-journal cleanup is recoverable by checking without resending', async () => {
    const h = harness()
    h.storage.removeItem.mockImplementationOnce(() => { throw new Error('storage blocked') })
    const result = await h.run()
    expect(result.outcome).toBe('storage-blocked')
    expect(result.attempt).toMatchObject({ auth: 'confirmed', profile: 'confirmed' })
    expect((await h.run('check')).outcome).toBe('saved')
    expect(h.gateway.writeAuth).toHaveBeenCalledOnce()
    expect(h.gateway.writeProfile).toHaveBeenCalledOnce()
    expect(h.journal.read(owner.id)).toBeNull()
  })
})

describe('profile-only transport', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
  const gateway = () => createNameGateway({ auth: { getSession: vi.fn() } } as unknown as SupabaseClient, new AbortController().signal)

  it.each(['raw', 'wrapped'])('accepts %s auth response without touching the SDK session', async shape => {
    const user = { id: owner.id, user_metadata: { display_name: target } }
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(shape === 'raw' ? user : { user }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await gateway().writeAuth(owner, target)).toBe('confirmed')
    expect(await gateway().readAuth(owner)).toBe(target)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PUT', credentials: 'omit', headers: { Authorization: `Bearer ${owner.token}` } })
  })

  it.each([
    [403, { code: 'forbidden', message: 'denied' }, 'rejected'],
    [500, { code: 'server_error' }, 'unknown'],
    [200, { id: 'owner-b', user_metadata: { display_name: target } }, 'unknown'],
    [200, { id: owner.id, user_metadata: { display_name: 'Different' } }, 'unknown'],
    [200, null, 'unknown'],
  ] as const)('classifies status %s and body without inventing success', async (status, body, expected) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })))
    expect(await gateway().writeAuth(owner, target)).toBe(expected)
  })

  it('bounds a stalled auth response body as unknown without retrying', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: () => new Promise(() => {}) }))
    vi.stubGlobal('fetch', fetchMock)
    const pending = gateway().writeAuth(owner, target)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await pending).toBe('unknown')
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('binds profile authorization and payload to the captured account', async () => {
    const row = { id: owner.id, display_name: target }
    const builder = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), upsert: vi.fn().mockReturnThis(), abortSignal: vi.fn().mockReturnThis(), single: vi.fn().mockReturnThis(), maybeSingle: vi.fn().mockReturnThis(), setHeader: vi.fn().mockReturnThis(),
      then: (resolve: (result: unknown) => unknown) => Promise.resolve({ data: row, error: null, status: 200 }).then(resolve),
    }
    const client = { from: vi.fn(() => builder) } as unknown as SupabaseClient
    const scoped = createNameGateway(client, new AbortController().signal)
    expect(await scoped.readProfile(owner)).toBe(target)
    expect(await scoped.writeProfile(owner, target)).toBe('confirmed')
    expect(builder.setHeader).toHaveBeenCalledWith('Authorization', `Bearer ${owner.token}`)
    expect(builder.upsert).toHaveBeenCalledWith(expect.objectContaining({ id: owner.id, email: owner.email, display_name: target }))
  })
})
