'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Users, ArrowLeft, Loader2 } from 'lucide-react'
import type { Team } from '@/types/database'
import toast from 'react-hot-toast'

export default function JoinTeamPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputCode, setInputCode] = useState(inviteCode || '')

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (inviteCode) {
      findTeam(inviteCode)
    } else {
      setLoading(false)
    }
  }, [inviteCode])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push(`/login?redirect=/team/join${inviteCode ? `?code=${inviteCode}` : ''}`)
    }
  }

  const findTeam = async (code: string) => {
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .single()

    if (error || !data) {
      setError('유효하지 않은 초대 코드입니다')
      setTeam(null)
    } else {
      setTeam(data)
    }

    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputCode.trim()) {
      findTeam(inputCode.trim())
    }
  }

  const handleJoin = async () => {
    if (!team) return

    setJoining(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', team.id)
      .eq('user_id', user.id)
      .single()

    if (existing) {
      toast.error('이미 가입된 팀입니다')
      router.push('/dashboard')
      return
    }

    // Join team as member
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'member',
        can_edit_players: false,
        can_edit_matches: false,
        can_edit_quarters: false,
      })

    if (error) {
      toast.error('팀 가입에 실패했습니다')
      setJoining(false)
      return
    }

    toast.success(`${team.name}에 가입했습니다!`)
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">팀 가입</h1>
            <p className="text-gray-500 mt-2">초대 코드를 입력하여 팀에 가입하세요</p>
          </div>

          {/* Code Input Form */}
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="초대 코드 입력"
                maxLength={8}
                className="flex-1 px-4 py-3 border rounded-lg text-center text-lg font-mono tracking-widest uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <button
                type="submit"
                disabled={loading || !inputCode.trim()}
                className="px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                검색
              </button>
            </div>
          </form>

          {loading && (
            <div className="flex justify-center py-8">
              <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
            </div>
          )}

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center mb-6">
              {error}
            </div>
          )}

          {team && !loading && (
            <div className="border rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h2>
              {team.description && (
                <p className="text-gray-500 mb-4">{team.description}</p>
              )}
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    가입 중...
                  </>
                ) : (
                  '팀 가입하기'
                )}
              </button>
            </div>
          )}

          <div className="text-center">
            <Link href="/dashboard" className="text-emerald-600 hover:underline flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              대시보드로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
