'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, MapPin, Calendar, Swords } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')

  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')

  const supabase = createClient()

  useEffect(() => { loadTeam() }, [])

  const loadTeam = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const team = await resolveTeam(supabase, user.id)
    if (team && team.canEditMatches) {
      setTeamId(team.teamId)
      if (!localStorage.getItem('selectedTeamId')) localStorage.setItem('selectedTeamId', team.teamId)
      // Fetch team name for the "vs" display
      const { data } = await supabase.from('teams').select('name').eq('id', team.teamId).single()
      if (data) setTeamName(data.name)
    } else {
      toast.error('경기를 생성할 권한이 없습니다')
      router.push('/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId || !opponent.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({ team_id: teamId, opponent: opponent.trim(), match_date: matchDate, location: location.trim() || null })
        .select().single()
      if (error) throw error
      toast.success('경기가 생성되었습니다')
      router.push(`/match/${data.id}`)
    } catch {
      toast.error('경기 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">새 경기</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        {/* vs visual */}
        <div className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-primary-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-400 mb-1">우리 팀</p>
              <p className="font-bold text-primary-700 truncate">{teamName || '…'}</p>
            </div>
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Swords className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex-1 bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-400 mb-1">상대 팀</p>
              <p className="font-bold text-gray-500 truncate">{opponent || '?'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {/* 상대팀 */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Swords className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-0.5">상대팀 이름 *</label>
                <input
                  type="text"
                  value={opponent}
                  onChange={(e) => setOpponent(e.target.value)}
                  required
                  autoFocus
                  className="w-full text-base font-medium text-gray-900 outline-none bg-transparent placeholder:text-gray-300"
                  placeholder="예: FC 서울"
                />
              </div>
            </div>

            {/* 날짜 */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-0.5">경기 날짜 *</label>
                <input
                  type="date"
                  value={matchDate}
                  onChange={(e) => setMatchDate(e.target.value)}
                  required
                  className="w-full text-base font-medium text-gray-900 outline-none bg-transparent"
                />
              </div>
            </div>

            {/* 장소 */}
            <div className="flex items-center gap-3 px-5 py-4">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-4 h-4 text-gray-500" />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-0.5">장소 (선택)</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full text-base font-medium text-gray-900 outline-none bg-transparent placeholder:text-gray-300"
                  placeholder="예: 잠실 운동장"
                />
              </div>
            </div>
          </div>

          <div className="px-5 py-4">
            <button
              type="submit"
              disabled={loading || !opponent.trim()}
              className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition"
            >
              {loading ? '생성 중…' : '경기 생성하기'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3">
              생성하면 4쿼터가 자동으로 만들어집니다
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
