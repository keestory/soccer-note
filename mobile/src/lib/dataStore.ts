import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from './supabase'
import type {
  Team, Match, TeamMember, Player, TeamVisibilitySettings, TrainingSession, Profile,
} from '@/types/database'

const SELECTED_TEAM_KEY = 'selectedTeamId'

export interface MemberWithProfile extends TeamMember {
  profile?: Profile
}

export interface TeamWithRole extends Team {
  role: 'coach' | 'member' | 'parent'
  membership: TeamMember
}

interface DataStore {
  userId: string | null
  displayName: string | null
  teams: TeamWithRole[]
  selectedTeamId: string | null
  matches: Match[]
  trainings: TrainingSession[]
  players: Player[]
  members: MemberWithProfile[]
  visibilitySettings: TeamVisibilitySettings | null
  lastFetch: number
  isLoaded: boolean
}

let store: DataStore = {
  userId: null, displayName: null, teams: [], selectedTeamId: null,
  matches: [], trainings: [], players: [], members: [],
  visibilitySettings: null, lastFetch: 0, isLoaded: false,
}

type Listener = () => void
const listeners = new Set<Listener>()
export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
function notify() { listeners.forEach((l) => l()) }

export function updateStore(partial: Partial<DataStore>) {
  store = { ...store, ...partial }
  notify()
}
export function getStore(): Readonly<DataStore> { return store }

let loadPromise: Promise<void> | null = null

export async function loadAppData(): Promise<void> {
  if (loadPromise) return loadPromise
  if (store.isLoaded && Date.now() - store.lastFetch < 60000) return

  loadPromise = (async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      updateStore({ isLoaded: true, lastFetch: Date.now() })
      loadPromise = null
      return
    }

    const [profileResult, ownedTeamsResult, membershipsResult] = await Promise.all([
      supabase.from('profiles').select('display_name').eq('id', user.id).single(),
      supabase.from('teams').select('*').eq('user_id', user.id).or('is_removed.is.null,is_removed.eq.false'),
      supabase.from('team_members').select('*, team:teams (*)').eq('user_id', user.id).eq('status', 'approved').or('is_removed.is.null,is_removed.eq.false'),
    ])

    const displayName = profileResult.data?.display_name || (user.user_metadata as any)?.display_name || null

    const teamsWithRole: TeamWithRole[] = []
    if (ownedTeamsResult.data) {
      for (const team of ownedTeamsResult.data as Team[]) {
        teamsWithRole.push({
          ...team, role: 'coach',
          membership: {
            id: 'owner', team_id: team.id, user_id: user.id, role: 'coach',
            can_edit_players: true, can_edit_matches: true, can_edit_quarters: true,
            joined_at: team.created_at, updated_at: team.updated_at, status: 'approved',
          } as TeamMember,
        })
      }
    }
    if (membershipsResult.data) {
      for (const m of membershipsResult.data as any[]) {
        if (!teamsWithRole.find((t) => t.id === m.team_id) && m.team && !m.team.is_removed) {
          teamsWithRole.push({ ...m.team, role: m.role, membership: m })
        }
      }
    }

    const savedTeamId = await AsyncStorage.getItem(SELECTED_TEAM_KEY)
    const selectedTeamId = teamsWithRole.find((t) => t.id === savedTeamId)?.id || teamsWithRole[0]?.id || null

    updateStore({
      userId: user.id, displayName, teams: teamsWithRole, selectedTeamId,
      isLoaded: true, lastFetch: Date.now(),
    })

    if (selectedTeamId) await loadTeamData(selectedTeamId)
    loadPromise = null
  })()

  return loadPromise
}

export async function loadTeamData(teamId: string): Promise<void> {
  const [matchesResult, trainingsResult, playersResult, visibilityResult, membersResult] = await Promise.all([
    supabase.from('matches').select('*, quarters (*, quarter_records (*, player:players (*))), match_attendees (id, player_id)').eq('team_id', teamId).order('match_date', { ascending: false }),
    supabase.from('training_sessions').select('*, training_attendees (id, player_id)').eq('team_id', teamId).order('training_date', { ascending: false }),
    supabase.from('players').select('*').eq('team_id', teamId).order('number'),
    supabase.from('team_visibility_settings').select('*').eq('team_id', teamId).single(),
    supabase.from('team_members').select('*').eq('team_id', teamId).or('is_removed.is.null,is_removed.eq.false').order('joined_at'),
  ])

  const members: MemberWithProfile[] = ((membersResult.data as TeamMember[]) || []).map((m) => ({ ...m, profile: undefined }))

  updateStore({
    selectedTeamId: teamId,
    matches: (matchesResult.data as Match[]) || [],
    trainings: (trainingsResult.data as TrainingSession[]) || [],
    players: (playersResult.data as Player[]) || [],
    members,
    visibilitySettings: (visibilityResult.data as TeamVisibilitySettings) || null,
  })
  await AsyncStorage.setItem(SELECTED_TEAM_KEY, teamId)
}

export async function selectTeam(teamId: string): Promise<void> {
  updateStore({ selectedTeamId: teamId })
  await AsyncStorage.setItem(SELECTED_TEAM_KEY, teamId)
  await loadTeamData(teamId)
}

export async function refreshData(): Promise<void> {
  updateStore({ isLoaded: false })
  await loadAppData()
}
