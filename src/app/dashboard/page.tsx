'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trophy, Users, LogOut, Star, Settings } from 'lucide-react'
import type { Team, Match } from '@/types/database'
import { formatDate, calculateMVP } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
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

    // Load team
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('user_id', user.id)
      .limit(1)

    if (teams && teams.length > 0) {
      setTeam(teams[0])
      await loadMatches(teams[0].id)
    } else {
      setShowCreateTeam(true)
    }

    setLoading(false)
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
      return
    }

    toast.success('팀이 생성되었습니다!')
    setTeam(data)
    setShowCreateTeam(false)
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
            <h1 className="text-3xl font-bold text-gray-900">팀 만들기</h1>
            <p className="text-gray-600 mt-2">먼저 팀을 생성해주세요</p>
          </div>

          <form onSubmit={handleCreateTeam} className="bg-white rounded-xl shadow-lg p-8">
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
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-emerald-600">SoccerNote</h1>
            <p className="text-sm text-gray-600">{team?.name}</p>
          </div>
          <div className="flex items-center gap-2">
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
        <Link
          href="/match/new"
          className="flex items-center justify-center gap-2 w-full py-4 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition mb-6"
        >
          <Plus className="w-5 h-5" />
          새 경기 기록하기
        </Link>

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
          </div>
        </div>
      </nav>
    </div>
  )
}
