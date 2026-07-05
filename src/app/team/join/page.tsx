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

  const cardStyle = { background: '#111010', border: '1px solid var(--line)', borderRadius: 16 }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-white">팀 가입</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Code input */}
        <div style={cardStyle} className="p-5">
          <p className="text-[13px] mb-3" style={{ color: 'var(--muted2)' }}>초대 코드를 입력하여 팀에 가입 요청하세요</p>
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder="초대 코드 입력"
              maxLength={8}
              className="w-full px-5 py-4 rounded-xl text-center font-display text-[28px] tracking-[0.3em] uppercase outline-none transition"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: 'var(--accent)' }}
            />
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? '검색 중…' : '팀 찾기'}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-4 rounded-2xl text-[13px] font-medium text-red-400" style={{ background: '#2a1010', border: '1px solid #4a1a1a' }}>
            {error}
          </div>
        )}

        {/* Status cards */}
        {existingStatus === 'pending' && team && (
          <div className="p-5 rounded-2xl" style={{ background: '#1a1500', border: '1px solid #3a3000' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#2a2000' }}>
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="font-bold text-white">승인 대기 중</p>
                <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>
              </div>
            </div>
            <p className="text-[13px] text-amber-400/80">관리자가 가입 요청을 검토 중입니다.</p>
          </div>
        )}

        {existingStatus === 'approved' && team && (
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--chip)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--line)' }}>
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-bold text-white">이미 가입된 팀입니다</p>
                <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="w-full py-3 rounded-xl font-bold text-[14px] transition" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
              대시보드로 이동
            </button>
          </div>
        )}

        {existingStatus === 'rejected' && team && (
          <div className="p-5 rounded-2xl" style={{ background: '#2a1010', border: '1px solid #4a1a1a' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#3a1515' }}>
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="font-bold text-white">가입 요청이 거절되었습니다</p>
                <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>
              </div>
            </div>
            <p className="text-[13px] text-red-400/80">관리자에게 문의해주세요.</p>
          </div>
        )}

        {/* Team found, no existing status */}
        {team && !loading && !existingStatus && (
          <div style={cardStyle} className="overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>팀 이름</p>
              <p className="text-[17px] font-bold text-white">{team.name}</p>
              {team.description && <p className="text-[13px] mt-1" style={{ color: 'var(--muted2)' }}>{team.description}</p>}
            </div>

            {!loadingProfile && (
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>가입 이름</p>
                {displayName ? (
                  <p className="font-semibold text-white">{displayName}</p>
                ) : (
                  <div>
                    <p className="text-[13px] text-red-400 mb-1">이름이 설정되지 않았습니다.</p>
                    <Link href="/profile" className="text-[13px] font-bold" style={{ color: 'var(--accent)' }}>프로필에서 이름 설정하기 →</Link>
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-4">
              <button
                onClick={handleJoinRequest}
                disabled={joining || !displayName}
                className="w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 transition active:scale-[0.98]"
                style={{ background: 'var(--accent)', color: '#0a0a0a' }}
              >
                {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {joining ? '요청 중…' : '가입 요청하기'}
              </button>
              <p className="text-[11px] text-center mt-2" style={{ color: 'var(--muted2)' }}>관리자 승인 후 팀에 참여할 수 있습니다</p>
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
      <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
        <header className="safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
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
