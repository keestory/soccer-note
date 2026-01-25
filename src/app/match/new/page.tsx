'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)

  // Form state
  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get selected team from localStorage
    const savedTeamId = localStorage.getItem('selectedTeamId')

    if (savedTeamId) {
      // Verify user has permission to create matches for this team
      const { data: membership } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', savedTeamId)
        .eq('user_id', user.id)
        .single()

      if (membership && (membership.role === 'coach' || membership.can_edit_matches)) {
        setTeamId(savedTeamId)
        return
      }
    }

    // Fallback: find any team where user can create matches
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id, role, can_edit_matches')
      .eq('user_id', user.id)

    const canCreateMatch = memberships?.find(m => m.role === 'coach' || m.can_edit_matches)

    if (canCreateMatch) {
      setTeamId(canCreateMatch.team_id)
      localStorage.setItem('selectedTeamId', canCreateMatch.team_id)
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
        .insert({
          team_id: teamId,
          opponent: opponent.trim(),
          match_date: matchDate,
          location: location.trim() || null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('경기가 생성되었습니다')
      router.push(`/match/${data.id}`)
    } catch (error) {
      toast.error('경기 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">새 경기</h1>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상대팀 이름 *
            </label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="예: FC 서울"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              경기 날짜 *
            </label>
            <input
              type="date"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              장소
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="예: 잠실 운동장"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {loading ? '생성 중...' : '경기 생성하기'}
          </button>
        </form>

        <p className="text-center text-gray-400 text-sm mt-4">
          경기를 생성하면 4쿼터가 자동으로 만들어집니다
        </p>
      </main>
    </div>
  )
}
