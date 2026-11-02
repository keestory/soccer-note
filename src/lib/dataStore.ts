'use client'

import { createClient, authHeader } from '@/lib/supabase'
import { cacheResolvedTeam, clearResolvedTeam } from '@/lib/team-resolver'
import type { Team, Match, TeamMember, Player, TeamVisibilitySettings, TrainingSession, Profile, QuarterRecord } from '@/types/database'

// 프로필이 포함된 멤버 타입
export interface MemberWithProfile extends TeamMember {
  profile?: Profile
}

// 전역 데이터 스토어
interface DataStore {
  // 인증
  userId: string | null
  displayName: string | null

  // 팀 데이터
  teams: TeamWithRole[]
  selectedTeamId: string | null
  pendingTeamId: string | null
  teamLoadError: string | null
  appLoadError: boolean
  contextVersion: number

  // 선택된 팀의 데이터
  matches: Match[]
  trainings: TrainingSession[]
  players: Player[]
  members: MemberWithProfile[]
  visibilitySettings: TeamVisibilitySettings | null

  // 메타
  lastFetch: number
  isLoaded: boolean
}

const EMPTY_TEAMS = Object.freeze([]) as unknown as TeamWithRole[]
const EMPTY_MATCHES = Object.freeze([]) as unknown as Match[]
const EMPTY_TRAININGS = Object.freeze([]) as unknown as TrainingSession[]
const EMPTY_PLAYERS = Object.freeze([]) as unknown as Player[]
const EMPTY_MEMBERS = Object.freeze([]) as unknown as MemberWithProfile[]

/**
 * SSR와 최초 hydration이 공유하는 고정 스냅샷.
 *
 * 브라우저 캐시는 모듈 초기화 시 live store를 채울 수 있지만, React의
 * useSyncExternalStore는 서버 렌더와 최초 hydration에서 동일한
 * getServerSnapshot 결과를 요구한다. 이 값은 live store와 분리되어 있으며
 * 이후 store가 갱신되어도 같은 참조를 유지한다.
 */
export const EMPTY_SERVER_SNAPSHOT: Readonly<DataStore> = Object.freeze({
  userId: null,
  displayName: null,
  teams: EMPTY_TEAMS,
  selectedTeamId: null,
  pendingTeamId: null,
  teamLoadError: null,
  appLoadError: false,
  contextVersion: 0,
  matches: EMPTY_MATCHES,
  trainings: EMPTY_TRAININGS,
  players: EMPTY_PLAYERS,
  members: EMPTY_MEMBERS,
  visibilitySettings: null,
  lastFetch: 0,
  isLoaded: false,
})

export interface TeamWithRole extends Team {
  role: 'coach' | 'member' | 'parent'
  membership: TeamMember
}

// 싱글톤 스토어
// NOTE: updateStore가 매번 새 객체를 만들어 참조를 교체한다.
// useSyncExternalStore는 스냅샷을 참조로 비교하므로, 제자리 변경(Object.assign)을
// 하면 리렌더가 트리거되지 않는다 (예: 팀 전환 시 헤더가 즉시 안 바뀜).
let store: DataStore = { ...EMPTY_SERVER_SNAPSHOT }
let appRequest = 0
let teamRequest = 0
let writeRevision = 0
const activeWrites = new Set<DataContext>()

// 리스너들
type Listener = () => void
const listeners = new Set<Listener>()

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notify() {
  listeners.forEach(l => l())
}

// 스토어 업데이트
export function updateStore(partial: Partial<DataStore>) {
  const identityChanged = ('userId' in partial && partial.userId !== store.userId) ||
    ('selectedTeamId' in partial && partial.selectedTeamId !== store.selectedTeamId)
  if (identityChanged) {
    teamRequest++
    partial = { ...partial, contextVersion: store.contextVersion + 1 }
  }
  // 새 객체를 만들어 참조를 교체 → useSyncExternalStore가 변경을 감지해 리렌더
  store = { ...store, ...partial }
  notify()
}

/** Identity is stable across refreshes, but never across account/team changes. */
export interface DataContext { userId: string | null; teamId: string | null; version: number }
export function getDataContext(): DataContext {
  return { userId: store.userId, teamId: store.selectedTeamId, version: store.contextVersion }
}
export function isDataContextCurrent(context: DataContext) {
  return context.userId === store.userId && context.teamId === store.selectedTeamId && context.version === store.contextVersion
}
export function beginTeamWrite(): { context: DataContext; finish: () => void } {
  const context = getDataContext()
  writeRevision++
  activeWrites.add(context)
  let finished = false
  return { context, finish: () => {
    if (finished) return
    finished = true
    activeWrites.delete(context)
    // A departed editor must not invalidate another account's first load.
    if (isDataContextCurrent(context)) {
      writeRevision++
      updateStore({ lastFetch: 0 })
    }
  } }
}
export function applyPlayerWrite(context: DataContext, player: Player | null, removedId?: string, memberId?: string) {
  if (!isDataContextCurrent(context) || (player && player.team_id !== context.teamId)) return false
  updateStore({
    players: player
      ? store.players.some(item => item.id === player.id)
        ? store.players.map(item => item.id === player.id ? player : item)
        : [...store.players, player]
      : store.players.filter(item => item.id !== removedId),
    members: memberId && player ? store.members.map(item => item.id === memberId ? { ...item, linked_player_id: player.id } : item) : store.members,
    lastFetch: 0,
  })
  persistSnapshot()
  return true
}

// 스토어 읽기
export function getStore(): Readonly<DataStore> {
  return store
}

export function getServerSnapshot(): Readonly<DataStore> {
  return EMPTY_SERVER_SNAPSHOT
}

// ── 영속 캐시 (stale-while-revalidate) ────────────────────────────
// 로그인/새로고침/탭 전환 시 마지막으로 본 데이터를 즉시 그려주고,
// 백그라운드에서 최신 데이터로 갱신한다. 네트워크 왕복을 기다리지 않는다.
const CACHE_KEY = 'fn-appcache-v2'

function persistSnapshot() {
  if (typeof window === 'undefined' || !store.userId) return
  try {
    const snapshot = {
      userId: store.userId,
      displayName: store.displayName,
      teams: store.teams,
      selectedTeamId: store.selectedTeamId,
      matches: store.matches,
      trainings: store.trainings,
      players: store.players,
      members: store.members,
      visibilitySettings: store.visibilitySettings,
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(snapshot))
  } catch {
    // 용량 초과 등은 무시 (캐시는 최적화일 뿐 필수 아님)
  }
}

function hydrateFromCache() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return
    const s = JSON.parse(raw)
    if (!s?.userId) return
    // 즉시 그릴 수 있도록 isLoaded=true, 단 lastFetch=0으로 두어 곧바로 재검증
    store = { ...store, ...s, pendingTeamId: null, teamLoadError: null, contextVersion: 0, isLoaded: false, lastFetch: 0 }
  } catch {
    // 파싱 실패 시 캐시 무시
  }
}

// 모듈 로드 시 1회 하이드레이트 (클라이언트 전용)
hydrateFromCache()

// 데이터 로드 상태
let loadPromise: Promise<void> | null = null
let observedClient: ReturnType<typeof createClient> | null = null

function savedTeamId() {
  try { return typeof window === 'undefined' ? null : localStorage.getItem('selectedTeamId') } catch { return null }
}

function resetAccount(userId: string | null) {
  appRequest++
  teamRequest++
  loadPromise = null
  if (store.userId) clearResolvedTeam(store.userId)
  try {
    localStorage.removeItem(CACHE_KEY)
    if (store.userId !== userId) localStorage.removeItem('selectedTeamId')
  } catch { /* Optional browser cache. */ }
  updateStore({ ...EMPTY_SERVER_SNAPSHOT, contextVersion: store.contextVersion + 1, userId, isLoaded: !userId })
}

/** Auth callbacks invalidate synchronously; requests start outside the auth lock. */
export function observeDataAuth() {
  const client = createClient()
  if (observedClient === client || !client.auth.onAuthStateChange) return
  observedClient = client
  client.auth.onAuthStateChange((_event, session) => {
    const userId = session?.user.id ?? null
    if (userId === store.userId) return
    resetAccount(userId)
    if (userId) queueMicrotask(() => { void loadAppData().catch(() => {}) })
  })
}

function commitTeam(teamId: string, snapshot: Partial<DataStore>, base: Partial<DataStore> = {}) {
  const userId = base.userId ?? store.userId
  const team = (base.teams ?? store.teams).find(item => item.id === teamId)
  if (!userId || !team) return
  const isCoach = team.role === 'coach' || team.user_id === userId
  // Browser storage and resolver cache are ready before subscribers see the snapshot.
  try { localStorage.setItem('selectedTeamId', teamId) } catch { /* Optional cache. */ }
  clearResolvedTeam(userId)
  cacheResolvedTeam(userId, {
    teamId, role: team.role, isOwner: team.user_id === userId,
    canEditPlayers: isCoach || !!team.membership?.can_edit_players,
    canEditMatches: isCoach || !!team.membership?.can_edit_matches,
    canEditQuarters: isCoach || !!team.membership?.can_edit_quarters,
  })
  updateStore({ ...base, ...snapshot, selectedTeamId: teamId, pendingTeamId: null, teamLoadError: null, isLoaded: true, lastFetch: Date.now() })
  persistSnapshot()
}

/**
 * 앱 데이터 초기 로드 (한 번만 실행)
 */
export async function loadAppData(): Promise<void> {
  observeDataAuth()
  // 이미 로딩 중이면 기다림
  if (loadPromise) return loadPromise

  // 이미 로드됨
  if (store.isLoaded && Date.now() - store.lastFetch < 60000) {
    return
  }

  const request = ++appRequest
  const selection = teamRequest
  const revision = writeRevision
  const current = () => request === appRequest
  updateStore({ appLoadError: false })
  const promise = (async () => {
    const supabase = createClient()

    // 인증 확인 — getSession()은 로컬 저장소에서 즉시 읽어 네트워크 왕복이 없다
    // (getUser()는 매번 서버에 토큰 검증 요청을 보내 느리다).
    const { data: { session } } = await supabase.auth.getSession()
    if (!current()) return
    const user = session?.user
    if (!user) {
      resetAccount(null)
      return
    }
    // 캐시가 다른 사용자 것이면 폐기
    if (store.userId !== user.id) {
      resetAccount(user.id)
      await loadAppData()
      return
    }

    // 병렬로 모든 기본 데이터 로드
    const [profileResult, ownedTeamsResult, membershipsResult] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.from('teams').select('*').eq('user_id', user.id).or('is_removed.is.null,is_removed.eq.false'),
      supabase.from('team_members').select('*, team:teams (*)').eq('user_id', user.id).eq('status', 'approved').or('is_removed.is.null,is_removed.eq.false')
    ])
    if (!current()) return
    if (ownedTeamsResult.error || membershipsResult.error) throw ownedTeamsResult.error || membershipsResult.error

    const displayName = profileResult.data?.display_name || user.user_metadata?.display_name || null

    // 팀 목록 구성
    const teamsWithRole: TeamWithRole[] = []

    if (ownedTeamsResult.data) {
      for (const team of ownedTeamsResult.data) {
        teamsWithRole.push({
          ...team,
          role: 'coach',
          membership: {
            id: 'owner',
            team_id: team.id,
            user_id: user.id,
            role: 'coach',
            can_edit_players: true,
            can_edit_matches: true,
            can_edit_quarters: true,
            joined_at: team.created_at,
            updated_at: team.updated_at
          } as TeamMember
        })
      }
    }

    if (membershipsResult.data) {
      for (const m of membershipsResult.data) {
        if (!teamsWithRole.find(t => t.id === m.team_id) && m.team && !m.team.is_removed) {
          teamsWithRole.push({
            ...m.team,
            role: m.role as 'coach' | 'member' | 'parent',
            membership: m
          })
        }
      }
    }

    // 선택된 팀 결정
    const preferredTeamId = store.selectedTeamId ?? savedTeamId()
    const selectedTeamId = teamsWithRole.find(t => t.id === preferredTeamId)?.id || teamsWithRole[0]?.id || null
    const base = { userId: user.id, displayName, teams: teamsWithRole }
    if (teamRequest !== selection) return
    if (!selectedTeamId) {
      clearResolvedTeam(user.id)
      try { localStorage.removeItem('selectedTeamId') } catch {}
      updateStore({ ...EMPTY_SERVER_SNAPSHOT, ...base, contextVersion: store.contextVersion, isLoaded: true, lastFetch: Date.now() })
      persistSnapshot()
      return
    }
    try {
      const snapshot = await fetchTeamData(selectedTeamId)
      if (!current() || teamRequest !== selection) return
      if (revision !== writeRevision || hasCurrentWrite()) {
        // Existing screens can keep their confirmed snapshot. An interrupted
        // first load needs a retry state rather than an endless loading screen.
        if (!store.isLoaded) updateStore({ appLoadError: true })
        return
      }
      commitTeam(selectedTeamId, snapshot, base)
    } catch (error) {
      if (!current() || teamRequest !== selection) return
      // On first entry keep the team list so a failed load can be retried.
      updateStore({ ...(store.selectedTeamId ? {} : base), isLoaded: true, teamLoadError: selectedTeamId })
      throw error
    }
  })()
  loadPromise = promise
  try { await promise } catch {
    if (current() && !store.teamLoadError) updateStore({ appLoadError: true })
  } finally { if (loadPromise === promise) loadPromise = null }
}

/**
 * 특정 팀의 상세 데이터 로드
 */
async function fetchTeamData(teamId: string): Promise<Partial<DataStore>> {
  const supabase = createClient()

  const [matchesResult, trainingsResult, playersResult, visibilityResult, membersResult, profilesResponse] = await Promise.all([
    // 쿼터 기록에 선수 전체를 조인하지 않는다 (기록마다 중복돼 페이로드가 커짐).
    // 아래에서 players 목록으로 record.player를 클라이언트에서 붙여 같은 형태를 유지한다.
    supabase.from('matches').select('*, quarters (*, quarter_records (*)), match_attendees (id, player_id)').eq('team_id', teamId).order('match_date', { ascending: false }),
    supabase.from('training_sessions').select('*, training_attendees (id, player_id)').eq('team_id', teamId).order('training_date', { ascending: false }),
    supabase.from('players').select('*').eq('team_id', teamId).order('number'),
    supabase.from('team_visibility_settings').select('*').eq('team_id', teamId).maybeSingle(),
    supabase.from('team_members').select('*').eq('team_id', teamId).or('is_removed.is.null,is_removed.eq.false').order('joined_at'),
    fetch(`/api/team-members-profiles?teamId=${teamId}`, { headers: await authHeader(supabase) })
  ])
  for (const result of [matchesResult, trainingsResult, playersResult, visibilityResult, membersResult]) {
    if (result.error) throw result.error
  }
  if (!profilesResponse.ok) throw new Error('Team profiles could not be loaded')

  // record.player를 players 목록에서 붙여 기존 코드와 호환되는 형태로 복원
  const players = playersResult.data || []
  const playerById = new Map<string, Player>(players.map((p: Player) => [p.id, p]))
  const matches = (matchesResult.data || []).map((m: any) => ({
    ...m,
    quarters: (m.quarters || []).map((q: any) => ({
      ...q,
      quarter_records: (q.quarter_records || []).map((r: any) => ({ ...r, player: playerById.get(r.player_id) })),
    })),
  }))

  // 멤버 프로필 매핑
  let membersWithProfiles: MemberWithProfile[] = (membersResult.data || []).map((m: TeamMember) => ({ ...m, profile: undefined }))
  try {
    if (profilesResponse.ok) {
      const profilesJson = await profilesResponse.json()
      const profileMap = new Map<string, Profile>(profilesJson.profiles?.map((p: Profile) => [p.id, p]) || [])
      membersWithProfiles = (membersResult.data || []).map((m: TeamMember) => ({
        ...m,
        profile: profileMap.get(m.user_id)
      }))
    }
  } catch {
    // 프로필 로드 실패 시 무시
  }

  return {
    matches,
    trainings: trainingsResult.data || [],
    players,
    members: membersWithProfiles,
    visibilitySettings: visibilityResult.data || null
  }
}

function hasCurrentWrite() {
  return [...activeWrites].some(isDataContextCurrent)
}

export function cancelTeamSelection() {
  // Route/StrictMode cleanup also calls this when no picker request exists.
  // It must not cancel an unrelated first app load.
  if (store.pendingTeamId !== null) teamRequest++
  updateStore({ pendingTeamId: null, teamLoadError: null })
}

/**
 * 팀 변경
 */
export async function selectTeam(teamId: string): Promise<boolean> {
  if (!store.userId || !store.teams.some(team => team.id === teamId)) return false
  const request = ++teamRequest
  const context = getDataContext()
  const revision = writeRevision
  updateStore({ pendingTeamId: teamId, teamLoadError: null })
  try {
    const snapshot = await fetchTeamData(teamId)
    if (request !== teamRequest || !isDataContextCurrent(context)) return false
    if (teamId === context.teamId && (revision !== writeRevision || hasCurrentWrite())) {
      updateStore({ pendingTeamId: null })
      return false
    }
    commitTeam(teamId, snapshot)
    return true
  } catch {
    if (request === teamRequest && isDataContextCurrent(context)) updateStore({ pendingTeamId: null, teamLoadError: teamId })
    return false
  }
}

export async function loadTeamData(teamId: string): Promise<void> { await selectTeam(teamId) }

/** Apply acknowledged editor writes only to an already loaded matching team.
 * Preserve other records (including ones another editor may have added). */
export function applySavedQuarterRecords(teamId: string, matchId: string, quarterId: string, records: QuarterRecord[], removedIds: string[], context?: DataContext) {
  if ((context && !isDataContextCurrent(context)) || store.selectedTeamId !== teamId || records.some(record => record.quarter_id !== quarterId)) return
  const match = store.matches.find(item => item.id === matchId && item.team_id === teamId)
  if (!match?.quarters?.some(quarter => quarter.id === quarterId)) return
  const playerIds = new Set(records.map(record => record.player_id))
  const removed = new Set(removedIds)
  updateStore({
    lastFetch: 0,
    matches: store.matches.map(item => item !== match ? item : {
      ...item,
      quarters: item.quarters?.map(quarter => quarter.id !== quarterId ? quarter : {
        ...quarter,
        quarter_records: [
          ...(quarter.quarter_records ?? []).filter(record => !removed.has(record.id) && !playerIds.has(record.player_id)),
          ...records.map(record => ({ ...record, player: store.players.find(player => player.id === record.player_id) })),
        ],
      }),
    }),
  })
  persistSnapshot()
}

/**
 * 데이터 새로고침
 */
export async function refreshData(): Promise<void> {
  updateStore({ lastFetch: 0 })
  await loadAppData()
}

/** An authentication handoff must not reuse anonymous or another account's cache. */
export async function refreshDataAfterAuth(userId: string): Promise<void> {
  resetAccount(userId)
  await loadAppData()
}
