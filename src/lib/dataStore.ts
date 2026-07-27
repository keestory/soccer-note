'use client'

import { createClient, authHeader } from '@/lib/supabase'
import type { Team, Match, TeamMember, Player, TeamVisibilitySettings, TrainingSession, Profile } from '@/types/database'

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

export interface TeamWithRole extends Team {
  role: 'coach' | 'member' | 'parent'
  membership: TeamMember
}

// 싱글톤 스토어
// NOTE: updateStore가 매번 새 객체를 만들어 참조를 교체한다.
// useSyncExternalStore는 스냅샷을 참조로 비교하므로, 제자리 변경(Object.assign)을
// 하면 리렌더가 트리거되지 않는다 (예: 팀 전환 시 헤더가 즉시 안 바뀜).
let store: DataStore = {
  userId: null,
  displayName: null,
  teams: [],
  selectedTeamId: null,
  matches: [],
  trainings: [],
  players: [],
  members: [],
  visibilitySettings: null,
  lastFetch: 0,
  isLoaded: false
}

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
  // 새 객체를 만들어 참조를 교체 → useSyncExternalStore가 변경을 감지해 리렌더
  store = { ...store, ...partial }
  notify()
}

// 스토어 읽기
export function getStore(): Readonly<DataStore> {
  return store
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
    store = { ...store, ...s, isLoaded: true, lastFetch: 0 }
  } catch {
    // 파싱 실패 시 캐시 무시
  }
}

// 모듈 로드 시 1회 하이드레이트 (클라이언트 전용)
hydrateFromCache()

// 데이터 로드 상태
let loadPromise: Promise<void> | null = null

/**
 * 앱 데이터 초기 로드 (한 번만 실행)
 */
export async function loadAppData(): Promise<void> {
  // 이미 로딩 중이면 기다림
  if (loadPromise) return loadPromise

  // 이미 로드됨
  if (store.isLoaded && Date.now() - store.lastFetch < 60000) {
    return
  }

  loadPromise = (async () => {
    const supabase = createClient()

    // 인증 확인 — getSession()은 로컬 저장소에서 즉시 읽어 네트워크 왕복이 없다
    // (getUser()는 매번 서버에 토큰 검증 요청을 보내 느리다).
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      // 로그아웃 상태 — 남아있는 캐시 제거
      if (typeof window !== 'undefined') { try { localStorage.removeItem(CACHE_KEY) } catch {} }
      updateStore({ isLoaded: true, lastFetch: Date.now(), userId: null, teams: [], matches: [], trainings: [], players: [], members: [] })
      loadPromise = null
      return
    }
    // 캐시가 다른 사용자 것이면 폐기
    if (store.userId && store.userId !== user.id && typeof window !== 'undefined') {
      try { localStorage.removeItem(CACHE_KEY) } catch {}
    }

    // 저장된 팀 ID가 있으면 팀 상세 데이터를 기본 조회와 동시에 시작한다
    // (팀 목록이 돌아올 때까지 기다리지 않아 왕복 한 번을 절약).
    const cachedTeamId = typeof window !== 'undefined' ? localStorage.getItem('selectedTeamId') : null
    const eagerTeamDataPromise = cachedTeamId ? loadTeamData(cachedTeamId).catch(() => {}) : null

    // 병렬로 모든 기본 데이터 로드
    const [profileResult, ownedTeamsResult, membershipsResult] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.from('teams').select('*').eq('user_id', user.id).or('is_removed.is.null,is_removed.eq.false'),
      supabase.from('team_members').select('*, team:teams (*)').eq('user_id', user.id).eq('status', 'approved').or('is_removed.is.null,is_removed.eq.false')
    ])

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
    const savedTeamId = typeof window !== 'undefined' ? localStorage.getItem('selectedTeamId') : null
    const selectedTeamId = teamsWithRole.find(t => t.id === savedTeamId)?.id || teamsWithRole[0]?.id || null

    updateStore({
      userId: user.id,
      displayName,
      teams: teamsWithRole,
      selectedTeamId,
      isLoaded: true,
      lastFetch: Date.now()
    })

    persistSnapshot()

    // 선택된 팀의 데이터 로드 (이미 병렬로 받은 팀이면 그 결과를 재사용)
    if (selectedTeamId) {
      if (selectedTeamId === cachedTeamId && eagerTeamDataPromise) {
        await eagerTeamDataPromise
      } else {
        await loadTeamData(selectedTeamId)
      }
    }

    loadPromise = null
  })()

  return loadPromise
}

/**
 * 특정 팀의 상세 데이터 로드
 */
export async function loadTeamData(teamId: string): Promise<void> {
  const supabase = createClient()

  const [matchesResult, trainingsResult, playersResult, visibilityResult, membersResult, profilesResponse] = await Promise.all([
    // 쿼터 기록에 선수 전체를 조인하지 않는다 (기록마다 중복돼 페이로드가 커짐).
    // 아래에서 players 목록으로 record.player를 클라이언트에서 붙여 같은 형태를 유지한다.
    supabase.from('matches').select('*, quarters (*, quarter_records (*)), match_attendees (id, player_id)').eq('team_id', teamId).order('match_date', { ascending: false }),
    supabase.from('training_sessions').select('*, training_attendees (id, player_id)').eq('team_id', teamId).order('training_date', { ascending: false }),
    supabase.from('players').select('*').eq('team_id', teamId).order('number'),
    supabase.from('team_visibility_settings').select('*').eq('team_id', teamId).single(),
    supabase.from('team_members').select('*').eq('team_id', teamId).or('is_removed.is.null,is_removed.eq.false').order('joined_at'),
    fetch(`/api/team-members-profiles?teamId=${teamId}`, { headers: await authHeader(supabase) })
  ])

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
  } catch (e) {
    // 프로필 로드 실패 시 무시
  }

  updateStore({
    selectedTeamId: teamId,
    matches,
    trainings: trainingsResult.data || [],
    players,
    members: membersWithProfiles,
    visibilitySettings: visibilityResult.data || null
  })

  // localStorage에 저장
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedTeamId', teamId)
  }
  persistSnapshot()
}

/**
 * 팀 변경
 */
export async function selectTeam(teamId: string): Promise<void> {
  // Update selectedTeamId immediately so the header reflects the new team
  // before DB queries finish loading the team's data
  updateStore({ selectedTeamId: teamId })
  if (typeof window !== 'undefined') localStorage.setItem('selectedTeamId', teamId)
  await loadTeamData(teamId)
}

/**
 * 데이터 새로고침
 */
export async function refreshData(): Promise<void> {
  updateStore({ isLoaded: false })
  await loadAppData()
}
