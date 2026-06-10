import type { SupabaseClient } from '@supabase/supabase-js'

export interface ResolvedTeam {
  teamId: string
  role: 'coach' | 'member' | 'parent'
  isOwner: boolean
  canEditPlayers: boolean
  canEditMatches: boolean
  canEditQuarters: boolean
}

const TTL = 5 * 60 * 1000 // 5 minutes
const cacheKey = (userId: string) => `team_resolve_${userId}`

interface CacheEntry extends ResolvedTeam {
  ts: number
}

function readCache(userId: string): ResolvedTeam | null {
  try {
    const raw = sessionStorage.getItem(cacheKey(userId))
    if (!raw) return null
    const entry: CacheEntry = JSON.parse(raw)
    if (Date.now() - entry.ts > TTL) return null
    // Invalidate when the user switched teams via the dashboard picker
    const selected = localStorage.getItem('selectedTeamId')
    if (selected && selected !== entry.teamId) return null
    return entry
  } catch {
    return null
  }
}

/** Call when the user leaves/disbands a team so stale cache doesn't linger. */
export function clearResolvedTeam(userId: string) {
  try {
    sessionStorage.removeItem(cacheKey(userId))
  } catch {
    // ignore
  }
}

export function cacheResolvedTeam(userId: string, team: ResolvedTeam) {
  try {
    const entry: CacheEntry = { ...team, ts: Date.now() }
    sessionStorage.setItem(cacheKey(userId), JSON.stringify(entry))
  } catch {
    // sessionStorage unavailable — skip caching
  }
}

/**
 * Resolves which team the user is working with (and their role in it),
 * caching the result in sessionStorage so switching tabs doesn't re-run the
 * same 2-3 Supabase queries every time. Server-side RLS still enforces real
 * permissions; this only drives client UI.
 *
 * Resolution order: explicit teamIdParam > cache > localStorage selection >
 * first owned team > first approved membership.
 */
export async function resolveTeam(
  supabase: SupabaseClient,
  userId: string,
  teamIdParam?: string | null
): Promise<ResolvedTeam | null> {
  // Explicit ?team= param bypasses the cache (but refreshes it)
  if (!teamIdParam) {
    const cached = readCache(userId)
    if (cached) return cached
  }

  const asOwner = (teamId: string): ResolvedTeam => ({
    teamId,
    role: 'coach',
    isOwner: true,
    canEditPlayers: true,
    canEditMatches: true,
    canEditQuarters: true,
  })

  type MembershipRow = {
    team_id: string
    role: string | null
    can_edit_players: boolean | null
    can_edit_matches: boolean | null
    can_edit_quarters: boolean | null
  }

  const asMember = (m: MembershipRow): ResolvedTeam => {
    const isCoach = m.role === 'coach'
    return {
      teamId: m.team_id,
      role: (m.role as ResolvedTeam['role']) || 'member',
      isOwner: false,
      canEditPlayers: isCoach || !!m.can_edit_players,
      canEditMatches: isCoach || !!m.can_edit_matches,
      canEditQuarters: isCoach || !!m.can_edit_quarters,
    }
  }

  const MEMBER_COLS = 'team_id, role, can_edit_players, can_edit_matches, can_edit_quarters'

  if (teamIdParam) {
    const [{ data: owned }, { data: membership }] = await Promise.all([
      supabase.from('teams').select('id').eq('id', teamIdParam).eq('user_id', userId).maybeSingle(),
      supabase
        .from('team_members')
        .select(`${MEMBER_COLS}, status`)
        .eq('team_id', teamIdParam)
        .eq('user_id', userId)
        .maybeSingle(),
    ])
    if (owned) {
      const team = asOwner(teamIdParam)
      cacheResolvedTeam(userId, team)
      return team
    }
    if (membership && membership.status === 'approved') {
      const team = asMember(membership)
      cacheResolvedTeam(userId, team)
      return team
    }
    return null
  }

  const selectedTeamId = typeof window !== 'undefined' ? localStorage.getItem('selectedTeamId') : null

  // Run both lookups in parallel instead of the old sequential waterfall
  const [{ data: ownedTeams }, { data: memberships }] = await Promise.all([
    supabase
      .from('teams')
      .select('id')
      .eq('user_id', userId)
      .or('is_removed.is.null,is_removed.eq.false'),
    supabase
      .from('team_members')
      .select(MEMBER_COLS)
      .eq('user_id', userId)
      .eq('status', 'approved')
      .or('is_removed.is.null,is_removed.eq.false'),
  ])

  const pick = (teamId: string): ResolvedTeam | null => {
    if (ownedTeams?.some(t => t.id === teamId)) return asOwner(teamId)
    const m = memberships?.find(m => m.team_id === teamId)
    return m ? asMember(m) : null
  }

  let team: ResolvedTeam | null = null
  if (selectedTeamId) team = pick(selectedTeamId)
  if (!team && ownedTeams && ownedTeams.length > 0) team = asOwner(ownedTeams[0].id)
  if (!team && memberships && memberships.length > 0) team = asMember(memberships[0])

  if (team) cacheResolvedTeam(userId, team)
  return team
}
