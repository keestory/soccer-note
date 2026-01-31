'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Users, ArrowLeft, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { Team, MemberStatus } from '@/types/database'
import toast from 'react-hot-toast'

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
      return
    }

    // Load display_name from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single()

    if (profile?.display_name) {
      setDisplayName(profile.display_name)
    } else {
      // Fallback to auth metadata
      const metaName = user.user_metadata?.display_name
      setDisplayName(metaName || null)
    }
    setLoadingProfile(false)
  }

  const findTeam = async (code: string) => {
    setLoading(true)
    setError(null)
    setExistingStatus(null)

    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('invite_code', code.toUpperCase())
      .single()

    if (error || !data) {
      setError('유효하지 않은 초대 코드입니다')
      setTeam(null)
      setLoading(false)
      return
    }

    setTeam(data)

    // Check existing membership status (ignore errors - RLS may block non-members)
    if (user) {
      try {
        const { data: existing, error: memberError } = await supabase
          .from('team_members')
          .select('status')
          .eq('team_id', data.id)
          .eq('user_id', user.id)
          .single()

        // Only set status if we got valid data (no error)
        if (!memberError && existing) {
          setExistingStatus(existing.status as MemberStatus)
        }
      } catch (e) {
        // Ignore errors - user is likely not a member yet
        console.log('Membership check skipped - user may not be a member yet')
      }
    }

    setLoading(false)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputCode.trim()) {
      findTeam(inputCode.trim())
    }
  }

  const handleJoinRequest = async () => {
    if (!team) return

    setJoining(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      toast.error('로그인이 필요합니다')
      return
    }

    // Request to join team with pending status
    const { error } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'member',
        status: 'pending',
        can_edit_players: false,
        can_edit_matches: false,
        can_edit_quarters: false,
      })

    if (error) {
      console.error('Team join error:', error)
      if (error.code === '23505') {
        // Duplicate - check current status (with error handling)
        try {
          const { data: existing, error: checkError } = await supabase
            .from('team_members')
            .select('status')
            .eq('team_id', team.id)
            .eq('user_id', user.id)
            .single()

          if (!checkError && existing) {
            setExistingStatus(existing.status as MemberStatus)
          } else {
            // If we can't check status, assume pending
            toast.success('이미 가입 요청이 있습니다. 관리자 승인을 기다려주세요.')
            setExistingStatus('pending')
          }
        } catch (e) {
          toast.success('이미 가입 요청이 있습니다. 관리자 승인을 기다려주세요.')
          setExistingStatus('pending')
        }
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

  const renderStatusMessage = () => {
    if (!existingStatus || !team) return null

    switch (existingStatus) {
      case 'pending':
        return (
          <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">승인 대기 중</h2>
                <p className="text-gray-500">{team.name}</p>
              </div>
            </div>
            <p className="text-amber-700 text-sm">
              관리자가 가입 요청을 검토 중입니다. 승인되면 팀에 참여할 수 있습니다.
            </p>
          </div>
        )
      case 'approved':
        return (
          <div className="border-2 border-emerald-200 bg-emerald-50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">이미 가입된 팀입니다</h2>
                <p className="text-gray-500">{team.name}</p>
              </div>
            </div>
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
            >
              대시보드로 이동
            </button>
          </div>
        )
      case 'rejected':
        return (
          <div className="border-2 border-red-200 bg-red-50 rounded-xl p-6 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">가입 요청이 거절되었습니다</h2>
                <p className="text-gray-500">{team.name}</p>
              </div>
            </div>
            <p className="text-red-700 text-sm">
              관리자가 가입 요청을 거절했습니다. 필요시 관리자에게 문의해주세요.
            </p>
          </div>
        )
    }
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
            <p className="text-gray-500 mt-2">초대 코드를 입력하여 팀에 가입 요청하세요</p>
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

          {/* Show status message if exists */}
          {renderStatusMessage()}

          {/* Show join button only if no existing status */}
          {team && !loading && !existingStatus && (
            <div className="border rounded-xl p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">{team.name}</h2>
              {team.description && (
                <p className="text-gray-500 mb-4">{team.description}</p>
              )}

              {/* Display name info */}
              {!loadingProfile && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">가입 이름</p>
                  {displayName ? (
                    <p className="font-semibold text-gray-900">{displayName}</p>
                  ) : (
                    <div>
                      <p className="text-red-500 text-sm mb-2">이름이 설정되지 않았습니다. 프로필에서 이름을 먼저 설정해주세요.</p>
                      <Link
                        href="/profile"
                        className="inline-block px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                      >
                        프로필 설정하기
                      </Link>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleJoinRequest}
                disabled={joining || !displayName}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    요청 중...
                  </>
                ) : (
                  '가입 요청하기'
                )}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2">
                관리자 승인 후 팀에 참여할 수 있습니다
              </p>
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

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <JoinTeamContent />
    </Suspense>
  )
}
