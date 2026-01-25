'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trophy, Users, LogOut, Star, Settings, ChevronDown, UserPlus } from 'lucide-react'
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
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async (retryCount = 0) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Load teams where user is a member (via team_members table)
    const { data: memberships, error: membershipError } = await supabase
      .from('team_members')
      .select(`
        *,
        team:teams (*)
      `)
      .eq('user_id', user.id)

    if (membershipError) {
      console.error('Membership query error:', membershipError)
    }

    if (memberships && memberships.length > 0) {
      const teamsWithRole: TeamWithRole[] = memberships.map(m => ({
        ...m.team,
        role: m.role as 'coach' | 'member',
        membership: m
      }))
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
      // Check if user owns any teams (legacy support)
      const { data: ownedTeams } = await supabase
        .from('teams')
        .select('*')
        .eq('user_id', user.id)
        .limit(1)

      if (ownedTeams && ownedTeams.length > 0 && retryCount < 1) {
        // Migrate to team_members system
        const team = ownedTeams[0]
        const { error: upsertError } = await supabase
          .from('team_members')
          .upsert({
            team_id: team.id,
            user_id: user.id,
            role: 'coach',
            can_edit_players: true,
            can_edit_matches: true,
            can_edit_quarters: true
          })

        if (upsertError) {
          console.error('Migration error:', upsertError)
          // If migration fails, show create team screen
          setShowCreateTeam(true)
          setLoading(false)
          return
        }

        // Reload once
        await checkAuthAndLoadData(retryCount + 1)
        return
      }

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
        )
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

    const { data, error } = await supabase
      .from('teams')
      .insert({ name: teamName, user_id: user.id })
      .select()
      .single()

    if (error) {
      toast.error('팀 생성에 실패했습니다')
      console.error('Team creation error:', error)
      return
    }

    toast.success('팀이 생성되었습니다!')

    // Trigger automatically creates team_member record, so just reload
    await checkAuthAndLoadData()
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">시작하기</h1>
            <p className="text-gray-600 mt-2">팀을 만들거나 초대 코드로 가입하세요</p>
          </div>

          <form onSubmit={handleCreateTeam} className="bg-white rounded-xl shadow-lg p-8 mb-4">
            <h2 className="font-semibold text-lg mb-4">새 팀 만들기</h2>
            <div className="mb-6">
              <label htmlFor="teamName" className="block text-sm font-medium text-gray-700 mb-1">
                팀 이름
              </label>
              <input
                id="teamName"
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition"
                placeholder="예: 우리동네 FC"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              팀 만들기
            </button>
          </form>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="font-semibold text-lg mb-4">팀에 가입하기</h2>
            <p className="text-gray-600 text-sm mb-4">
              초대 코드가 있다면 아래 버튼을 눌러 팀에 가입하세요
            </p>
            <Link
              href="/team/join"
              className="flex items-center justify-center gap-2 w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              <UserPlus className="w-5 h-5" />
              초대 코드로 가입
            </Link>
          </div>
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
          <div className="bg-white rounded-xl w-full max-w-md p-4">
            <h3 className="font-semibold text-lg mb-4">팀 선택</h3>
            <div className="space-y-2 mb-4">
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
            {teams.length > 1 ? (
              <button
                onClick={() => setShowTeamPicker(true)}
                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
              >
                {selectedTeam?.name}
                <ChevronDown className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-sm text-gray-600">{selectedTeam?.name}</p>
            )}
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
              {matches.map((match) => {
                const mvp = calculateMVP(match)
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
                      </div>
                    </div>
                    {mvp && (
                      <div className="flex items-center gap-1 text-sm text-amber-600">
                        <Star className="w-4 h-4 fill-amber-400" />
                        <span>MVP: {mvp.playerName} ({mvp.averageRating.toFixed(1)}점)</span>
                      </div>
                    )}
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
