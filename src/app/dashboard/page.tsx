'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trophy, Users, LogOut, Star, Settings, ChevronDown, UserPlus, User } from 'lucide-react'
import type { Team, Match, TeamMember } from '@/types/database'
import { formatDate, calculateMVP } from '@/lib/utils'
import toast from 'react-hot-toast'

interface TeamWithRole extends Team {
  role: 'coach' | 'member'
  membership: TeamMember
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<TeamWithRole[]>([])
  const [selectedTeam, setSelectedTeam] = useState<TeamWithRole | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [displayName, setDisplayName] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load user profile display name
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()
    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    } else if (user.user_metadata?.display_name) {
      setDisplayName(user.user_metadata.display_name)
    }

    const teamsWithRole: TeamWithRole[] = []

    // 1. First, load teams where user is the OWNER (always works, no RLS issues)
    // Filter out removed teams
    const { data: ownedTeams } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', user.id)
      .or('is_removed.is.null,is_removed.eq.false')

    if (ownedTeams && ownedTeams.length > 0) {
      for (const team of ownedTeams) {
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

    // 2. Then try to load teams via team_members (for teams user joined but doesn't own)
    // Only show approved memberships that are not removed
    const { data: memberships } = await supabase
      .from('team_members')
      .select(`
        *,
        team:teams (*)
      `)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .or('is_removed.is.null,is_removed.eq.false')

    if (memberships && memberships.length > 0) {
      for (const m of memberships) {
        // Skip if we already have this team (from owned teams)
        // Also skip if team is removed
        if (!teamsWithRole.find(t => t.id === m.team_id) && m.team && !m.team.is_removed) {
          teamsWithRole.push({
            ...m.team,
            role: m.role as 'coach' | 'member',
            membership: m
          })
        }
      }
    }

    if (teamsWithRole.length > 0) {
      setTeams(teamsWithRole)

      // Check localStorage for previously selected team
      const savedTeamId = localStorage.getItem('selectedTeamId')
      const savedTeam = teamsWithRole.find(t => t.id === savedTeamId)

      if (savedTeam) {
        setSelectedTeam(savedTeam)
        await loadMatches(savedTeam.id)
      } else {
        setSelectedTeam(teamsWithRole[0])
        await loadMatches(teamsWithRole[0].id)
      }
    } else {
      setShowCreateTeam(true)
    }

    setLoading(false)
  }

  const selectTeam = async (team: TeamWithRole) => {
    setSelectedTeam(team)
    setShowTeamPicker(false)
    localStorage.setItem('selectedTeamId', team.id)
    await loadMatches(team.id)
  }

  const loadMatches = async (teamId: string) => {
    const { data: matchesData } = await supabase
      .from('matches')
      .select(`
        *,
        quarters (
          *,
          quarter_records (
            *,
            player:players (*)
          )
        ),
        match_attendees (id, player_id)
      `)
      .eq('team_id', teamId)
      .order('match_date', { ascending: false })

    if (matchesData) {
      setMatches(matchesData)
    }
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name: teamName, user_id: user.id })
      .select()
      .single()

    if (error) {
      toast.error('팀 생성에 실패했습니다')
      console.error('Team creation error:', error)
      return
    }

    // Explicitly create team_member record (don't rely on trigger)
    const memberData = {
      id: crypto.randomUUID(),
      team_id: team.id,
      user_id: user.id,
      role: 'coach' as const,
      can_edit_players: true,
      can_edit_matches: true,
      can_edit_quarters: true,
      joined_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    await supabase
      .from('team_members')
      .upsert(memberData)

    toast.success('팀이 생성되었습니다!')

    // Directly set state without querying (to avoid RLS issues)
    const newTeam: TeamWithRole = {
      ...team,
      role: 'coach',
      membership: memberData as TeamMember
    }

    setTeams([newTeam])
    setSelectedTeam(newTeam)
    localStorage.setItem('selectedTeamId', team.id)
    setMatches([])
    setTeamName('')
    setShowCreateTeam(false)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  if (showCreateTeam) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-600">SoccerNote</h1>
            <p className="text-gray-600 mt-2">축구 경기 기록 앱</p>
          </div>

          {/* 가입된 팀 목록 */}
          {teams.length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                내 팀 목록 ({teams.length}개)
              </h2>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => selectTeam(team)}
                    className="w-full p-4 rounded-lg bg-gray-50 hover:bg-emerald-50 text-left transition flex items-center justify-between"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{team.name}</p>
                      <p className="text-sm text-gray-500">
                        {team.role === 'coach' ? '👑 감독' : '👤 팀원'}
                        {team.membership?.can_edit_matches && ' · 경기 편집'}
                        {team.membership?.can_edit_players && ' · 선수 편집'}
                      </p>
                    </div>
                    <ChevronDown className="w-5 h-5 text-gray-400 -rotate-90" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 새 팀 만들기 */}
          <form onSubmit={handleCreateTeam} className="bg-white rounded-xl shadow-lg p-6 mb-4">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-600" />
              새 팀 만들기
            </h2>
            <div className="mb-4">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="팀 이름 입력"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              팀 만들기
            </button>
          </form>

          {/* 팀 가입하기 */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-600" />
              팀에 가입하기
            </h2>
            <p className="text-gray-500 text-sm mb-4">
              초대 코드가 있다면 아래 버튼을 눌러 다른 팀에 가입하세요
            </p>
            <Link
              href="/team/join"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              초대 코드로 가입
            </Link>
          </div>

          {/* 내 프로필 */}
          <Link
            href="/profile"
            className="mt-6 w-full py-3 text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-2 font-medium"
          >
            <User className="w-4 h-4" />
            내 프로필
          </Link>

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="w-full py-3 text-gray-500 hover:text-gray-700 flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  const isCoach = selectedTeam?.role === 'coach'
  const canEditPlayers = isCoach || selectedTeam?.membership?.can_edit_players
  const canEditMatches = isCoach || selectedTeam?.membership?.can_edit_matches

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Team Picker Modal */}
      {showTeamPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-4 max-h-[80vh] flex flex-col">
            <h3 className="font-semibold text-lg mb-4">팀 선택</h3>
            <div className="space-y-2 mb-4 overflow-y-auto flex-1 max-h-[50vh]">
              {teams.map((team) => (
                <button
                  key={team.id}
                  onClick={() => selectTeam(team)}
                  className={`w-full p-3 rounded-lg text-left flex items-center justify-between ${
                    selectedTeam?.id === team.id
                      ? 'bg-emerald-100 border-2 border-emerald-500'
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div>
                    <p className="font-medium">{team.name}</p>
                    <p className="text-sm text-gray-500">
                      {team.role === 'coach' ? '감독' : '팀원'}
                    </p>
                  </div>
                  {selectedTeam?.id === team.id && (
                    <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTeamPicker(false)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
              <button
                onClick={() => { setShowTeamPicker(false); setShowCreateTeam(true) }}
                className="flex-1 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-center"
              >
                + 팀 만들기
              </button>
              <Link
                href="/team/join"
                className="flex-1 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 text-center"
              >
                + 팀 가입
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-emerald-600">SoccerNote</h1>
            <button
              onClick={() => setShowTeamPicker(true)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
            >
              {selectedTeam?.name || '팀 선택'}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            {isCoach && (
              <Link
                href="/team/members"
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                title="팀원 관리"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
            <Link
              href="/team/players"
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="선수 관리"
            >
              <Users className="w-5 h-5" />
            </Link>
            <Link
              href="/profile"
              className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="내 프로필"
            >
              <User className="w-5 h-5" />
              {displayName && (
                <span className="text-sm font-medium max-w-[80px] truncate">{displayName}</span>
              )}
            </Link>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
              title="로그아웃"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* New Match Button */}
        {canEditMatches && (
          <Link
            href="/match/new"
            className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition mb-6"
          >
            <Plus className="w-5 h-5" />
            새 경기 기록하기
          </Link>
        )}

        {/* Team Stats */}
        {matches.length > 0 && (() => {
          const totalGames = matches.length
          const wins = matches.filter(m => m.home_score > m.away_score).length
          const losses = matches.filter(m => m.home_score < m.away_score).length
          const draws = matches.filter(m => m.home_score === m.away_score).length
          const winRate = Math.round((wins / totalGames) * 100)
          return (
            <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-500">팀 전적</h2>
                <span className="text-sm font-bold text-emerald-600">승률 {winRate}%</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalGames}</p>
                  <p className="text-xs text-gray-500">총 경기</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{wins}</p>
                  <p className="text-xs text-gray-500">승</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-500">{losses}</p>
                  <p className="text-xs text-gray-500">패</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-400">{draws}</p>
                  <p className="text-xs text-gray-500">무</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Recent Matches */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">최근 경기</h2>

          {matches.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">아직 기록된 경기가 없습니다</p>
              <p className="text-gray-400 text-sm">첫 경기를 기록해보세요!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matches.map((match: Match & { match_attendees?: { id: string }[] }) => {
                const mvp = calculateMVP(match)
                const attendeeCount = match.match_attendees?.length || 0
                return (
                  <Link
                    key={match.id}
                    href={`/match/${match.id}`}
                    className="block bg-white rounded-xl p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-semibold text-gray-900">vs {match.opponent}</p>
                        <p className="text-sm text-gray-500">{formatDate(match.match_date)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">
                          <span className="text-emerald-600">{match.home_score}</span>
                          <span className="text-gray-400 mx-1">:</span>
                          <span className="text-gray-600">{match.away_score}</span>
                        </p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          match.home_score > match.away_score
                            ? 'bg-emerald-100 text-emerald-700'
                            : match.home_score < match.away_score
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {match.home_score > match.away_score ? '승' : match.home_score < match.away_score ? '패' : '무'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {mvp && (
                        <div className="flex items-center gap-1 text-sm text-amber-600">
                          <Star className="w-4 h-4 fill-amber-400" />
                          <span>MVP: {mvp.playerName} ({mvp.averageRating.toFixed(1)}점)</span>
                        </div>
                      )}
                      {attendeeCount > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Users className="w-4 h-4" />
                          <span>출석 {attendeeCount}명</span>
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-around py-3">
            <Link href="/dashboard" className="flex flex-col items-center text-emerald-600">
              <Trophy className="w-6 h-6" />
              <span className="text-xs mt-1">경기</span>
            </Link>
            <Link href="/team/players" className="flex flex-col items-center text-gray-400 hover:text-gray-600">
              <Users className="w-6 h-6" />
              <span className="text-xs mt-1">선수</span>
            </Link>
            {isCoach && (
              <Link href="/team/members" className="flex flex-col items-center text-gray-400 hover:text-gray-600">
                <Settings className="w-6 h-6" />
                <span className="text-xs mt-1">팀 관리</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </div>
  )
}
