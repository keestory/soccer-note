'use client'

import { createClient } from '@/lib/supabase'
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

    // 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      updateStore({ isLoaded: true, lastFetch: Date.now() })
      loadPromise = null
      return
    }

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

    // 선택된 팀의 데이터 로드
    if (selectedTeamId) {
      await loadTeamData(selectedTeamId)
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
    supabase.from('matches').select('*, quarters (*, quarter_records (*, player:players (*))  ), match_attendees (id, player_id)').eq('team_id', teamId).order('match_date', { ascending: false }),
    supabase.from('training_sessions').select('*, training_attendees (id, player_id)').eq('team_id', teamId).order('training_date', { ascending: false }),
    supabase.from('players').select('*').eq('team_id', teamId).order('number'),
    supabase.from('team_visibility_settings').select('*').eq('team_id', teamId).single(),
    supabase.from('team_members').select('*').eq('team_id', teamId).or('is_removed.is.null,is_removed.eq.false').order('joined_at'),
    fetch(`/api/team-members-profiles?teamId=${teamId}`)
  ])

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
    matches: matchesResult.data || [],
    trainings: trainingsResult.data || [],
    players: playersResult.data || [],
    members: membersWithProfiles,
    visibilitySettings: visibilityResult.data || null
  })

  // localStorage에 저장
  if (typeof window !== 'undefined') {
    localStorage.setItem('selectedTeamId', teamId)
  }
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
