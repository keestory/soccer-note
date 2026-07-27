'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { getStore, subscribe, loadAppData, selectTeam, refreshData, type TeamWithRole } from '@/lib/dataStore'
import type { Match, Player, TeamVisibilitySettings, TrainingSession } from '@/types/database'
import type { MemberWithProfile } from '@/lib/dataStore'

/**
 * 앱 데이터를 사용하는 훅
 * - 캐시된 데이터를 즉시 반환 (0.01초)
 * - 백그라운드에서 자동 로드
 */
export function useAppData() {
  const store = useSyncExternalStore(subscribe, getStore, getStore)
  const [isInitializing, setIsInitializing] = useState(!store.isLoaded)

  useEffect(() => {
    // 항상 로드를 시도한다. loadAppData는 내부적으로 중복/신선도(60초)를 검사하므로
    // 캐시가 신선하면 즉시 반환하고, 하이드레이트된 오래된 캐시는 백그라운드에서 갱신한다.
    loadAppData().finally(() => setIsInitializing(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    // 상태
    loading: isInitializing && !store.isLoaded,
    isLoaded: store.isLoaded,

    // 사용자
    userId: store.userId,
    displayName: store.displayName,

    // 팀
    teams: store.teams,
    selectedTeamId: store.selectedTeamId,
    selectedTeam: store.teams.find(t => t.id === store.selectedTeamId) || null,

    // 팀 데이터
    matches: store.matches,
    trainings: store.trainings,
    players: store.players,
    members: store.members,
    visibilitySettings: store.visibilitySettings,

    // 액션
    selectTeam,
    refresh: refreshData
  }
}

/**
 * 대시보드용 데이터 훅
 */
export function useDashboardData(): {
  loading: boolean
  userId: string | null
  displayName: string | null
  teams: TeamWithRole[]
  selectedTeam: TeamWithRole | null
  matches: Match[]
  trainings: TrainingSession[]
  visibilitySettings: TeamVisibilitySettings | null
  selectTeam: (teamId: string) => Promise<void>
  refresh: () => Promise<void>
} {
  const data = useAppData()

  return {
    loading: data.loading,
    userId: data.userId,
    displayName: data.displayName,
    teams: data.teams,
    selectedTeam: data.selectedTeam,
    matches: data.matches,
    trainings: data.trainings,
    visibilitySettings: data.visibilitySettings,
    selectTeam: data.selectTeam,
    refresh: data.refresh
  }
}

/**
 * 선수 목록용 데이터 훅
 */
export function usePlayersData(): {
  loading: boolean
  players: Player[]
  selectedTeam: TeamWithRole | null
  canEdit: boolean
  refresh: () => Promise<void>
} {
  const data = useAppData()
  const canEdit = data.selectedTeam?.role === 'coach' || data.selectedTeam?.membership?.can_edit_players || false

  return {
    loading: data.loading,
    players: data.players,
    selectedTeam: data.selectedTeam,
    canEdit,
    refresh: data.refresh
  }
}
