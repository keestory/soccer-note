import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Player, QuarterRecord } from '@/types/database'

const mocks = vi.hoisted(() => ({ client: {} as any }))
vi.mock('@/lib/supabase', () => ({ createClient: () => mocks.client, authHeader: async () => ({}) }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}
function storage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}
const team = (id: string) => ({ id, name: id, user_id: 'u', role: id === 'B' ? 'member' : 'coach', membership: { team_id: id, user_id: 'u', role: id === 'B' ? 'member' : 'coach', can_edit_players: false } })
const player = (id: string, teamId = 'A') => ({ id, team_id: teamId, name: id } as Player)

describe('confirmed team and account context', () => {
  let data: typeof import('@/lib/dataStore')
  let authEvent: (event: string, session: any) => void
  let currentUser: string | null
  let userTeams: Record<string, ReturnType<typeof team>[]>
  let holds: Map<string, ReturnType<typeof deferred<any>>>
  let failures: Set<string>
  let requests: string[]

  beforeEach(async () => {
    vi.resetModules()
    vi.stubGlobal('window', {})
    vi.stubGlobal('localStorage', storage())
    vi.stubGlobal('sessionStorage', storage())
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ profiles: [] }) })))
    currentUser = 'u'
    userTeams = { u: [team('A'), team('B'), team('C')] }
    holds = new Map()
    failures = new Set()
    requests = []
    mocks.client = {
      auth: {
        getSession: vi.fn(async () => ({ data: { session: currentUser ? { user: { id: currentUser, user_metadata: {} } } : null } })),
        onAuthStateChange: vi.fn((callback: typeof authEvent) => { authEvent = callback; return { data: { subscription: { unsubscribe: vi.fn() } } } }),
      },
      from(table: string) {
        const filters: Record<string, string> = {}
        const query: any = {
          select: () => query, eq: (key: string, value: string) => { filters[key] = value; return query },
          order: () => query, or: () => query, single: () => query, maybeSingle: () => query,
          then(resolve: (result: any) => void, reject: (error: unknown) => void) {
            const id = filters.team_id ?? ''
            const key = `${table}:${id}`
            requests.push(key)
            if (holds.has(key)) return holds.get(key)!.promise.then(resolve, reject)
            let result: unknown = []
            if (table === 'profiles') result = { display_name: currentUser }
            if (table === 'teams') result = userTeams[currentUser ?? ''] ?? []
            if (table === 'matches') result = [{ id: `match-${id}`, team_id: id, quarters: [] }]
            if (table === 'players') result = [player(`player-${id}`, id)]
            if (table === 'team_visibility_settings') result = { team_id: id }
            return Promise.resolve({ data: result, error: failures.has(key) ? new Error('offline') : null }).then(resolve, reject)
          },
        }
        return query
      },
    }
    data = await import('@/lib/dataStore')
    data.updateStore({ ...data.EMPTY_SERVER_SNAPSHOT, userId: 'u', selectedTeamId: 'A', teams: [team('A'), team('B'), team('C')] as any, matches: [{ id: 'match-A', team_id: 'A', quarters: [] }] as any, players: [player('player-A')], isLoaded: true, lastFetch: Date.now() })
    localStorage.setItem('selectedTeamId', 'A')
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('keeps A identity, records and permission cache until B is completely ready', async () => {
    const pending = deferred<any>()
    holds.set('matches:B', pending)
    const snapshots: string[] = []
    const stop = data.subscribe(() => {
      const store = data.getStore()
      snapshots.push(`${store.selectedTeamId}:${store.matches[0]?.team_id}`)
    })
    const selecting = data.selectTeam('B')
    expect(data.getStore()).toMatchObject({ selectedTeamId: 'A', pendingTeamId: 'B' })
    expect(localStorage.getItem('selectedTeamId')).toBe('A')
    pending.resolve({ data: [{ id: 'match-B', team_id: 'B', quarters: [] }], error: null })
    await expect(selecting).resolves.toBe(true)
    expect(data.getStore()).toMatchObject({ selectedTeamId: 'B', pendingTeamId: null, players: [player('player-B', 'B')] })
    expect(JSON.parse(sessionStorage.getItem('team_resolve_u')!)).toMatchObject({ teamId: 'B' })
    expect(snapshots).toEqual(['A:A', 'B:B'])
    stop()
  })

  it('ignores delayed B after C wins the selection race', async () => {
    const pending = deferred<any>(); holds.set('matches:B', pending)
    const b = data.selectTeam('B')
    await expect(data.selectTeam('C')).resolves.toBe(true)
    pending.resolve({ data: [{ id: 'late-B', team_id: 'B' }], error: null })
    await expect(b).resolves.toBe(false)
    expect(data.getStore()).toMatchObject({ selectedTeamId: 'C', matches: [{ id: 'match-C' }] })
    expect(localStorage.getItem('selectedTeamId')).toBe('C')
  })

  it('keeps confirmed A on any detail failure and supports a complete retry', async () => {
    failures.add('players:B')
    await expect(data.selectTeam('B')).resolves.toBe(false)
    expect(data.getStore()).toMatchObject({ selectedTeamId: 'A', teamLoadError: 'B', pendingTeamId: null, players: [player('player-A')] })
    failures.clear()
    await expect(data.selectTeam('B')).resolves.toBe(true)
    expect(data.getStore().teamLoadError).toBe(null)
  })

  it('cancel invalidates late success and late failure without changing A', async () => {
    for (const error of [null, new Error('late failure')]) {
      const pending = deferred<any>(); holds.set('matches:B', pending)
      const selecting = data.selectTeam('B')
      data.cancelTeamSelection()
      pending.resolve({ data: [], error })
      await expect(selecting).resolves.toBe(false)
      expect(data.getStore()).toMatchObject({ selectedTeamId: 'A', pendingTeamId: null, teamLoadError: null })
    }
  })

  it('does not request a team absent from the confirmed account team list', async () => {
    await expect(data.selectTeam('unknown')).resolves.toBe(false)
    expect(requests).toEqual([])
  })

  it('clears all old fields immediately on logout while a selection is pending', async () => {
    data.observeDataAuth()
    const pending = deferred<any>(); holds.set('matches:B', pending)
    const selecting = data.selectTeam('B')
    currentUser = null
    authEvent('SIGNED_OUT', null)
    expect(data.getStore()).toMatchObject({ userId: null, selectedTeamId: null, teams: [], matches: [], players: [], visibilitySettings: null, pendingTeamId: null })
    pending.resolve({ data: [{ id: 'late-B', team_id: 'B' }], error: null })
    await selecting
    expect(data.getStore().matches).toEqual([])
    expect(localStorage.getItem('selectedTeamId')).toBe(null)
  })

  it('new account load completes without waiting for an old stalled auth response', async () => {
    const old = deferred<any>()
    mocks.client.auth.getSession.mockImplementationOnce(() => old.promise)
    data.updateStore({ lastFetch: 0 })
    const previous = data.loadAppData()
    currentUser = 'new'
    await data.refreshDataAfterAuth('new')
    expect(data.getStore()).toMatchObject({ userId: 'new', selectedTeamId: null, teams: [], isLoaded: true })
    old.resolve({ data: { session: { user: { id: 'u', user_metadata: {} } } } })
    await previous
    expect(data.getStore().userId).toBe('new')
  })

  it('an old account write finishing during the new account first team fetch cannot strand initialization', async () => {
    const oldWrite = data.beginTeamWrite()
    const pending = deferred<any>(); holds.set('matches:N', pending)
    userTeams.new = [{ ...team('N'), user_id: 'new' }]
    currentUser = 'new'
    const initializing = data.refreshDataAfterAuth('new')
    await vi.waitFor(() => expect(requests).toContain('matches:N'))
    oldWrite.finish()
    pending.resolve({ data: [{ id: 'match-N', team_id: 'N', quarters: [] }], error: null })
    await initializing
    expect(data.getStore()).toMatchObject({ userId: 'new', selectedTeamId: 'N', isLoaded: true, appLoadError: false, matches: [{ id: 'match-N' }] })
    expect(localStorage.getItem('selectedTeamId')).toBe('N')
    expect(JSON.parse(sessionStorage.getItem('team_resolve_new')!)).toMatchObject({ teamId: 'N' })
    expect(data.applyPlayerWrite(oldWrite.context, player('late-old-player'))).toBe(false)
  })

  it('a same-context write that interrupts first loading exposes a retry instead of a permanent spinner', async () => {
    data.updateStore({ isLoaded: false, lastFetch: 0 })
    const pending = deferred<any>(); holds.set('matches:A', pending)
    const initializing = data.loadAppData()
    await vi.waitFor(() => expect(requests).toContain('matches:A'))
    const write = data.beginTeamWrite()
    write.finish()
    pending.resolve({ data: [{ id: 'stale-match', team_id: 'A', quarters: [] }], error: null })
    await initializing
    expect(data.getStore()).toMatchObject({ isLoaded: false, appLoadError: true, matches: [{ id: 'match-A' }] })
    holds.delete('matches:A')
    await data.refreshData()
    expect(data.getStore()).toMatchObject({ selectedTeamId: 'A', isLoaded: true, appLoadError: false, matches: [{ id: 'match-A' }] })
  })

  it('route cleanup without a pending picker must not cancel first app loading', async () => {
    data.updateStore({ isLoaded: false, lastFetch: 0 })
    const pending = deferred<any>(); holds.set('matches:A', pending)
    const initializing = data.loadAppData()
    await vi.waitFor(() => expect(requests).toContain('matches:A'))
    data.cancelTeamSelection()
    pending.resolve({ data: [{ id: 'fresh-match', team_id: 'A', quarters: [] }], error: null })
    await initializing
    expect(data.getStore()).toMatchObject({ selectedTeamId: 'A', isLoaded: true, appLoadError: false, matches: [{ id: 'fresh-match' }] })
  })

  it('same-team refresh while saving preserves operation context and acknowledged player', async () => {
    const write = data.beginTeamWrite()
    await data.refreshData()
    expect(data.isDataContextCurrent(write.context)).toBe(true)
    expect(data.applyPlayerWrite(write.context, player('new-player'))).toBe(true)
    write.finish()
    expect(data.getStore().players.map(item => item.id)).toEqual(['player-A', 'new-player'])
  })

  it('releasing an abandoned editor write allows later same-team refresh and is idempotent', async () => {
    const write = data.beginTeamWrite()
    write.finish()
    write.finish()
    data.updateStore({ players: [player('old-local')] })
    await data.refreshData()
    expect(data.getStore().players.map(item => item.id)).toEqual(['player-A'])
  })

  it('a refresh begun before a save cannot overwrite a later acknowledged row', async () => {
    const pending = deferred<any>(); holds.set('matches:A', pending)
    const refreshing = data.refreshData()
    await vi.waitFor(() => expect(requests).toContain('matches:A'))
    const write = data.beginTeamWrite()
    data.applyPlayerWrite(write.context, player('new-player'))
    write.finish()
    pending.resolve({ data: [{ id: 'stale-match', team_id: 'A' }], error: null })
    await refreshing
    expect(data.getStore().players.map(item => item.id)).toContain('new-player')
    expect(data.getStore().matches[0].id).toBe('match-A')
  })

  it('old writes cannot patch B or A after A→B→A', async () => {
    const write = data.beginTeamWrite()
    await data.selectTeam('B')
    expect(data.applyPlayerWrite(write.context, player('late-player'))).toBe(false)
    await data.selectTeam('A')
    expect(data.applyPlayerWrite(write.context, player('late-player'))).toBe(false)
    write.finish()
    expect(data.getStore().players.map(item => item.id)).toEqual(['player-A'])
  })

  it('old quarter acknowledgements cannot patch the same team after account handoff', async () => {
    const context = data.getDataContext()
    currentUser = 'new'
    await data.refreshDataAfterAuth('new')
    data.updateStore({ selectedTeamId: 'A', matches: [{ id: 'match-A', team_id: 'A', quarters: [{ id: 'q', quarter_records: [] }] }] as any })
    data.applySavedQuarterRecords('A', 'match-A', 'q', [{ id: 'late', quarter_id: 'q', player_id: 'p' }] as QuarterRecord[], [], context)
    expect(data.getStore().matches[0].quarters![0].quarter_records).toEqual([])
  })

  it('initial team list failure exposes an error without fabricating an empty successful load', async () => {
    data.updateStore({ ...data.EMPTY_SERVER_SNAPSHOT, userId: 'u' })
    failures.add('teams:')
    await data.loadAppData()
    expect(data.getStore()).toMatchObject({ appLoadError: true, isLoaded: false, selectedTeamId: null })
    failures.clear()
    await data.refreshData()
    expect(data.getStore()).toMatchObject({ appLoadError: false, isLoaded: true, selectedTeamId: 'A' })
  })

  it('an old resolver cannot replace the permission cache after a confirmed switch', async () => {
    const { resolveTeam } = await import('@/lib/team-resolver')
    const pending = deferred<any>(); holds.set('teams:', pending)
    const resolving = resolveTeam(mocks.client, 'u', 'A')
    await vi.waitFor(() => expect(requests).toContain('teams:'))
    await data.selectTeam('B')
    pending.resolve({ data: { id: 'A' }, error: null })
    await resolving
    expect(JSON.parse(sessionStorage.getItem('team_resolve_u')!)).toMatchObject({ teamId: 'B' })
  })
})
