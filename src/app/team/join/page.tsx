'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Loader2, Clock, CheckCircle, XCircle, Search } from 'lucide-react'
import type { Team, MemberStatus } from '@/types/database'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { Skeleton } from '@/components/Skeleton'

function JoinTeamContent() {
  const { t } = useI18n()
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
    if (error || !data) { setError(t.invalidInviteCode); setTeam(null); setLoading(false); return }
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
    if (!user) { toast.error(t.loginRequired); return }
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
        toast.success(t.alreadyRequested)
      } else {
        toast.error(`${t.joinRequestFailed}: ${error.message}`)
      }
      setJoining(false)
      return
    }
    toast.success(t.joinRequestSent)
    setExistingStatus('pending')
    setJoining(false)
  }

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }

  return (
    <div className="light min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-[color:var(--text)]">{t.joinTeamTitle}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Code input */}
        <div style={cardStyle} className="p-5">
          <p className="text-[13px] mb-3" style={{ color: 'var(--muted2)' }}>{t.enterInviteCodeDescription}</p>
          <form onSubmit={handleSearch} className="space-y-3">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              placeholder={t.inviteCodePlaceholder}
              maxLength={8}
              className="w-full px-5 py-4 rounded-xl text-center font-display text-[28px] tracking-[0.3em] uppercase outline-none transition"
              style={{ background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)' }}
            />
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="w-full py-3.5 rounded-xl font-bold text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 transition"
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
              {loading ? t.searchingTeam : t.findTeamButton}
            </button>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="px-5 py-4 rounded-2xl text-[13px] font-medium" style={{ background: '#fef3f2', border: '1px solid #fecdca', color: '#b42318' }}>
            {error}
          </div>
        )}

        {/* Status cards */}
        {existingStatus === 'pending' && team && (
          <div className="p-5 rounded-2xl" style={{ background: '#fef0c7', border: '1px solid #fde68a' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fde68a' }}>
                <Clock className="w-5 h-5" style={{ color: '#b54708' }} />
              </div>
              <div>
                <p className="font-bold text-[color:var(--text)]">{t.pendingApproval}</p>
                <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>
              </div>
            </div>
            <p className="text-[13px]" style={{ color: '#b54708' }}>{t.pendingApprovalDescription}</p>
          </div>
        )}

        {existingStatus === 'approved' && team && (
          <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--chip)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--line)' }}>
                <CheckCircle className="w-5 h-5" style={{ color: 'var(--text)' }} />
              </div>
              <div>
                <p className="font-bold text-[color:var(--text)]">{t.alreadyJoinedTeam}</p>
                <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>
              </div>
            </div>
            <button onClick={() => router.push('/dashboard')} className="w-full py-3 rounded-xl font-bold text-[14px] transition" style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
              {t.goToDashboard}
            </button>
          </div>
        )}

        {existingStatus === 'rejected' && team && (
          <div className="p-5 rounded-2xl" style={{ background: '#fef3f2', border: '1px solid #fecdca' }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#fecdca' }}>
                <XCircle className="w-5 h-5" style={{ color: '#b42318' }} />
              </div>
              <div>
                <p className="font-bold text-[color:var(--text)]">{t.joinRequestRejected}</p>
                <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>
              </div>
            </div>
            <p className="text-[13px]" style={{ color: '#b42318' }}>{t.joinRejectedDescription}</p>
          </div>
        )}

        {/* Team found, no existing status */}
        {team && !loading && !existingStatus && (
          <div style={cardStyle} className="overflow-hidden">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>{t.teamName}</p>
              <p className="text-[17px] font-bold text-[color:var(--text)]">{team.name}</p>
              {team.description && <p className="text-[13px] mt-1" style={{ color: 'var(--muted2)' }}>{team.description}</p>}
            </div>

            {!loadingProfile && (
              <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--line)' }}>
                <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>{t.joinName}</p>
                {displayName ? (
                  <p className="font-semibold text-[color:var(--text)]">{displayName}</p>
                ) : (
                  <div>
                    <p className="text-[13px] text-red-400 mb-1">{t.nameNotSet}</p>
                    <Link href="/profile" className="text-[13px] font-bold" style={{ color: 'var(--text)' }}>{t.setNameLink}</Link>
                  </div>
                )}
              </div>
            )}

            <div className="px-5 py-4">
              <button
                onClick={handleJoinRequest}
                disabled={joining || !displayName}
                className="w-full py-4 rounded-xl font-bold text-[15px] flex items-center justify-center gap-2 disabled:opacity-40 transition active:scale-[0.98]"
                style={{ background: 'var(--navy)', color: 'var(--accent)' }}
              >
                {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
                {joining ? t.requesting : t.requestJoin}
              </button>
              <p className="text-[11px] text-center mt-2" style={{ color: 'var(--muted2)' }}>{t.approvalRequired}</p>
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
      <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
        <header className="safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
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
