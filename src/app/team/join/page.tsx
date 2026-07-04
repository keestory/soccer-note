'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Loader2, Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import type { Team, MemberStatus } from '@/types/database'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/Skeleton'

function JoinTeamContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteCode = searchParams.get('code')

  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inputCode, setInputCode] = useState(inviteCode || '')
  const [existingStatus, setExistingStatus] = useState<MemberStatus | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(true)

  const supabase = createClient()

  useEffect(() => { checkAuth() }, [])
  useEffect(() => {
    if (inviteCode) findTeam(inviteCode)
    else setLoading(false)
  }, [inviteCode])

  const checkAuth = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push(`/login?redirect=/team/join${inviteCode ? `?code=${inviteCode}` : ''}`); return }
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    setDisplayName(profile?.display_name || user.user_metadata?.display_name || null)
    setLoadingProfile(false)
  }

  const findTeam = async (code: string) => {
    setLoading(true)
    setError(null)
    setExistingStatus(null)
    const user = await getSessionUser(supabase)
    const { data, error } = await supabase.from('teams').select('*').eq('invite_code', code.toUpperCase()).single()
    if (error || !data) { setError('유효하지 않은 초대 코드입니다'); setTeam(null); setLoading(false); return }
    setTeam(data)
    if (user) {
      try {
        const { data: existing, error: memberError } = await supabase
          .from('team_members').select('status').eq('team_id', data.id).eq('user_id', user.id).single()
        if (!memberError && existing) setExistingStatus(existing.status as MemberStatus)
      } catch { /* not a member yet */ }
    }
    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputCode.trim()) findTeam(inputCode.trim())
  }

  const handleJoinRequest = async () => {
    if (!team) return
    setJoining(true)
    const user = await getSessionUser(supabase)
    if (!user) { toast.error('로그인이 필요합니다'); return }
    const { error } = await supabase.from('team_members').insert({
      team_id: team.id, user_id: user.id, role: 'member', status: 'pending',
      can_edit_players: false, can_edit_matches: false, can_edit_quarters: false,
    })
    if (error) {
      if (error.code === '23505') {
        try {
          const { data: existing, error: checkError } = await supabase
            .from('team_members').select('status').eq('team_id', team.id).eq('user_id', user.id).single()
          setExistingStatus(!checkError && existing ? existing.status as MemberStatus : 'pending')
        } catch { setExistingStatus('pending') }
        toast.success('이미 가입 요청이 있습니다. 관리자 승인을 기다려주세요.')
      } else {
        toast.error(`가입 요청 실패: ${error.message}`)
      }
      setJoining(false)
      return
    }
    toast.success('가입 요청을 보냈습니다. 관리자 승인을 기다려주세요.')
    setExistingStatus('pending')
    setJoining(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">팀 가입</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Code input */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <p className="text-sm text-gray-500 mb-3">초대 코드를 입력하여 팀에 가입 요청하세요</p>
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="초대 코드 입력"
              maxLength={8}
              className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl text-center text-2xl font-mono tracking-[0.3em] uppercase focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none transition bg-gray-50 focus:bg-white"
            />
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? '검색 중…' : '팀 찾기'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-5 py-4 rounded-2xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* Status cards */}
        {existingStatus === 'pending' && team && (
          <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">승인 대기 중</p>
                <p className="text-sm text-gray-500">{team.name}</p>
              </div>
            </div>
            <p className="text-sm text-amber-700">관리자가 가입 요청을 검토 중입니다. 승인되면 팀에 참여할 수 있습니다.</p>
          </div>
        )}

        {existingStatus === 'approved' && team && (
          <div className="bg-primary-50 border-2 border-primary-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">이미 가입된 팀입니다</p>
                <p className="text-sm text-gray-500">{team.name}</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition">
              대시보드로 이동
            </button>
          </div>
        )}

        {existingStatus === 'rejected' && team && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900">가입 요청이 거절되었습니다</p>
                <p className="text-sm text-gray-500">{team.name}</p>
              </div>
            </div>
            <p className="text-sm text-red-700">관리자가 가입 요청을 거절했습니다. 필요시 관리자에게 문의해주세요.</p>
          </div>
        )}

        {/* Team found, no existing status */}
        {team && !loading && !existingStatus && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <p className="text-xs text-gray-400 mb-0.5">팀 이름</p>
              <p className="text-lg font-bold text-gray-900">{team.name}</p>
              {team.description && <p className="text-sm text-gray-500 mt-1">{team.description}</p>}
            </div>

            {/* My name info */}
            {!loadingProfile && (
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-xs text-gray-400 mb-1">가입 이름</p>
                {displayName ? (
                  <p className="font-semibold text-gray-900">{displayName}</p>
                ) : (
                  <div>
                    <p className="text-sm text-red-500 mb-2">이름이 설정되지 않았습니다.</p>
                    <Link href="/profile" className="text-sm text-primary-600 font-semibold">프로필에서 이름 설정하기 →</Link>
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-4">
              <button
                onClick={handleJoinRequest}
                disabled={joining || !displayName}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-primary-700 disabled:opacity-50 transition"
              >
                {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {joining ? '요청 중…' : '가입 요청하기'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">관리자 승인 후 팀에 참여할 수 있습니다</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b safe-top">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
            <Skeleton className="h-5 w-20" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-40 w-full rounded-2xl" />
        </main>
      </div>
    }>
      <JoinTeamContent />
    </Suspense>
  )
}
