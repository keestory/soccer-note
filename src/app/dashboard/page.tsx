'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { cacheResolvedTeam } from '@/lib/team-resolver'
import { ChevronDown, UserPlus, User, LogOut } from 'lucide-react'
import { NotificationBadge } from '@/components/NotificationBadge'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import type { TeamMember } from '@/types/database'
import { formatDate, calculateMVP } from '@/lib/utils'
import toast from 'react-hot-toast'
import { DashboardSkeleton } from '@/components/Skeleton'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { loadTeamData, updateStore } from '@/lib/dataStore'
import type { TeamWithRole } from '@/lib/dataStore'

function primeTeamCache(userId: string, team: TeamWithRole) {
  const isCoach = team.role === 'coach' || team.user_id === userId
  cacheResolvedTeam(userId, {
    teamId: team.id,
    role: team.role,
    isOwner: team.user_id === userId,
    canEditPlayers: isCoach || !!team.membership?.can_edit_players,
    canEditMatches: isCoach || !!team.membership?.can_edit_matches,
    canEditQuarters: isCoach || !!team.membership?.can_edit_quarters,
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const data = useAppData()
  const { t } = useI18n()
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [teamName, setTeamName] = useState('')

  // Redirect to login when store confirms no session
  useEffect(() => {
    if (data.isLoaded && !data.userId) {
      router.push('/login')
    }
  }, [data.isLoaded, data.userId])

  // Prime team-resolver cache whenever selected team changes
  useEffect(() => {
    if (data.userId && data.selectedTeam) {
      primeTeamCache(data.userId, data.selectedTeam)
      if (data.teams.length === 0) setShowCreateTeam(true)
    }
  }, [data.userId, data.selectedTeam?.id])

  // Lock body scroll when team picker is open
  useEffect(() => {
    document.body.style.overflow = showTeamPicker ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showTeamPicker])

  const handleSelectTeam = async (team: TeamWithRole) => {
    // Immediately update localStorage + store so header reflects new team at once
    localStorage.setItem('selectedTeamId', team.id)
    if (data.userId) primeTeamCache(data.userId, team)
    setShowTeamPicker(false)
    await data.selectTeam(team.id)
  }

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim() || !data.userId) return
    const supabase = createClient()
    const { data: team, error } = await supabase
      .from('teams').insert({ name: teamName, user_id: data.userId }).select().single()
    if (error) { toast.error(t.teamCreateFailed); return }
    const memberData = {
      id: crypto.randomUUID(), team_id: team.id, user_id: data.userId,
      role: 'coach' as const, can_edit_players: true, can_edit_matches: true,
      can_edit_quarters: true, joined_at: new Date().toISOString(), updated_at: new Date().toISOString()
    }
    await supabase.from('team_members').upsert(memberData)
    toast.success(t.teamCreated)
    setTeamName('')
    setShowCreateTeam(false)
    // Refresh store so new team appears
    updateStore({ isLoaded: false })
    await data.refresh()
  }

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (data.loading) return <DashboardSkeleton />

  const { teams, selectedTeam, matches, displayName, userId } = data
  const isCoach = selectedTeam?.role === 'coach' || selectedTeam?.user_id === userId
  const canEditMatches = isCoach || selectedTeam?.membership?.can_edit_matches
  const pendingCount = isCoach ? data.members.filter(m => m.status === 'pending' && !m.is_removed).length : 0

  const wins   = matches.filter(m => m.home_score >  m.away_score).length
  const losses = matches.filter(m => m.home_score <  m.away_score).length
  const draws  = matches.filter(m => m.home_score === m.away_score).length
  const total  = matches.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null
  const latestMatch = matches[0] ?? null

  // No teams yet
  if (!selectedTeam || showCreateTeam) {
    return (
      <div className="min-h-screen px-5 py-8" style={{ background: 'var(--bg)', color: '#fff' }}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <span className="font-display text-[30px] tracking-widest" style={{ color: 'var(--accent)' }}>SOCCERNOTE</span>
          </div>

          {teams.length > 0 && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <h2 className="font-black text-white mb-4">{t.myTeams} ({teams.length})</h2>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {teams.map(team => (
                  <button key={team.id} onClick={() => handleSelectTeam(team)}
                    className="w-full p-4 rounded-xl text-left flex items-center justify-between transition active:opacity-70"
                    style={{ background: '#1a1a1a' }}>
                    <div>
                      <p className="font-bold text-white">{team.name}</p>
                      <p className="text-sm" style={{ color: 'var(--muted2)' }}>{team.role === 'coach' ? t.coach : t.member}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 -rotate-90" style={{ color: '#555' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCreateTeam} className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <h2 className="font-black text-white mb-4">{t.createTeam}</h2>
            <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required
              className="w-full outline-none text-white placeholder-[#555] mb-3"
              style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 12, padding: '13px 15px' }}
              placeholder={t.teamName} />
            <button type="submit" className="w-full font-black py-3.5 rounded-xl active:scale-[0.98] transition"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}>{t.createTeamButton}</button>
          </form>

          <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <h2 className="font-black text-white mb-3">{t.joinTeam}</h2>
            <Link href="/team/join"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold transition active:opacity-70"
              style={{ background: '#1a1a1a', color: 'var(--accent)' }}>
              <UserPlus className="w-4 h-4" />
              {t.inviteCodeJoin}
            </Link>
          </div>

          <div className="flex flex-col gap-2 mt-4">
            <Link href="/profile" className="flex items-center justify-center gap-2 py-3 text-sm font-medium" style={{ color: 'var(--muted2)' }}>
              <User className="w-4 h-4" /> {t.myProfile}
            </Link>
            <button onClick={handleLogout} className="flex items-center justify-center gap-2 py-3 text-sm" style={{ color: '#555' }}>
              <LogOut className="w-4 h-4" /> {t.logout}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Team Picker Modal */}
      {showTeamPicker && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-5 pt-[calc(env(safe-area-inset-top)+56px)]"
          style={{ background: 'rgba(0,0,0,0.75)' }}
          onClick={() => setShowTeamPicker(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl p-5 flex flex-col"
            style={{ background: 'var(--card)', border: '1px solid var(--line)', maxHeight: '70dvh' }}
            onClick={e => e.stopPropagation()}
          >
            <h3 className="font-black text-white mb-3">{t.selectTeam}</h3>
            <div className="space-y-2 mb-4 overflow-y-auto flex-1">
              {teams.map(team => {
                const active = selectedTeam?.id === team.id
                return (
                  <button key={team.id} onClick={() => handleSelectTeam(team)}
                    className="w-full p-4 rounded-xl text-left flex items-center justify-between transition active:opacity-70"
                    style={{
                      background: active ? 'var(--chip)' : '#1a1a1a',
                      border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`
                    }}>
                    <div>
                      <p className="font-bold text-white">{team.name}</p>
                      <p className="text-sm" style={{ color: 'var(--muted2)' }}>{team.role === 'coach' ? t.coach : t.member}</p>
                    </div>
                    {active && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowTeamPicker(false)} className="flex-1 py-3 rounded-xl font-bold" style={{ background: '#1a1a1a', color: '#aaa' }}>{t.close}</button>
              <button onClick={() => { setShowTeamPicker(false); setShowCreateTeam(true) }} className="flex-1 py-3 rounded-xl font-black" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>{t.newTeamShort}</button>
              <Link href="/team/join" className="flex-1 py-3 rounded-xl font-bold text-center" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>{t.joinShort}</Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex justify-between items-center">
          <div className="min-w-0">
            <p className="font-display text-[13px] tracking-widest" style={{ color: 'var(--accent)' }}>SOCCERNOTE</p>
            <button onClick={() => setShowTeamPicker(true)} className="flex items-center gap-1 mt-0.5">
              <span className="font-black text-[19px] text-white truncate max-w-[180px]">{selectedTeam?.name || t.selectTeam}</span>
              <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#555' }} />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBadge />
            <Link href="/profile"
              className="w-[35px] h-[35px] rounded-full flex items-center justify-center font-display text-[15px]"
              style={{ background: 'var(--accent)', color: '#0a0a0a', border: '2px solid #2a2a2a' }}>
              {(displayName || '?').charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
      <main className="max-w-4xl mx-auto px-5 py-5 space-y-4">

        {/* Pending join requests banner (coach only) */}
        {pendingCount > 0 && (
          <Link href="/team/members"
            className="flex items-center justify-between p-4 rounded-[14px] active:opacity-80 transition"
            style={{ background: 'var(--chip)', border: '1px solid var(--accent)' }}>
            <p className="font-bold text-[14px]" style={{ color: 'var(--accent)' }}>
              {t.pendingJoinBadge.replace('{n}', String(pendingCount))}
            </p>
            <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>{t.checkNow}</span>
          </Link>
        )}

        {/* Latest match KV scoreboard */}
        {latestMatch && (() => {
          const isWin = latestMatch.home_score > latestMatch.away_score
          const isLoss = latestMatch.home_score < latestMatch.away_score
          const result = isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW'
          const mvp = calculateMVP(latestMatch)
          const quarters = (latestMatch as any).quarters ?? []
          return (
            <Link href={`/match/${latestMatch.id}`}
              className="block rounded-[20px] p-5 active:opacity-80 transition"
              style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-[13px]" style={{ color: 'var(--muted1)', letterSpacing: '0.08em' }}>
                  {t.lastMatch} · {formatDate(latestMatch.match_date)}
                </span>
                <span className="text-[12px] font-black px-3 py-1 rounded-full"
                  style={{ background: isWin ? 'var(--accent)' : isLoss ? 'rgba(192,90,77,.14)' : '#222', color: isWin ? '#0a0a0a' : isLoss ? '#e07a6d' : '#888' }}>
                  {result}
                </span>
              </div>
              <div className="flex items-end gap-4 mb-3">
                <span className="font-display leading-none" style={{ fontSize: 92, color: 'var(--accent)' }}>
                  {latestMatch.home_score}
                </span>
                <span className="font-display text-[64px] leading-none pb-2" style={{ color: 'var(--dash)' }}>–</span>
                <span className="font-display leading-none" style={{ fontSize: 92, color: isLoss ? '#c05a4d' : 'var(--accent)' }}>
                  {latestMatch.away_score}
                </span>
                <div className="pb-2 ml-2">
                  <p className="text-[11px] mb-0.5" style={{ color: 'var(--muted2)' }}>{t.opponentShort}</p>
                  <p className="font-black text-[19px] text-white">vs {latestMatch.opponent}</p>
                </div>
              </div>
              {quarters.length > 0 && (
                <div className="flex gap-2 mb-3">
                  {quarters.map((q: any) => {
                    const hs = q.quarter_records?.filter((r: any) => r.is_home !== false).reduce((s: number, r: any) => s + (r.goals||0), 0) ?? 0
                    const as_ = q.quarter_records?.filter((r: any) => r.is_home === false).reduce((s: number, r: any) => s + (r.goals||0), 0) ?? 0
                    return (
                      <div key={q.id} className="flex-1 text-center py-1.5 rounded-lg font-display text-[12px]"
                        style={{ background: 'var(--chip)', color: 'var(--chipText)', letterSpacing: '0.05em' }}>
                        Q{q.quarter_number} {hs}·{as_}
                      </div>
                    )
                  })}
                </div>
              )}
              {mvp && (
                <div className="flex items-center gap-1.5">
                  <span style={{ color: 'var(--accent)' }}>★</span>
                  <span className="text-[12px]" style={{ color: 'var(--muted2)' }}>MVP {mvp.playerName} · {mvp.averageRating.toFixed(1)}</span>
                </div>
              )}
            </Link>
          )
        })()}

        {/* New match button */}
        {canEditMatches && (
          <Link href="/match/new"
            className="flex items-center justify-center w-full py-4 font-black text-[16px] rounded-[14px] active:scale-[0.98] transition"
            style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
            {t.newMatchRecord}
          </Link>
        )}

        {/* Season stats card */}
        <div className="rounded-[20px] p-5" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <div className="flex gap-4">
            <div className="flex-[1.3] border-r pr-4" style={{ borderColor: 'var(--line)' }}>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-[46px] leading-none text-white">{winRate ?? '–'}</span>
                {winRate !== null && <span className="font-display text-[28px] leading-none" style={{ color: 'var(--accent)' }}>%</span>}
              </div>
              <p className="text-[12px] mt-1" style={{ color: 'var(--muted2)' }}>{t.seasonWinRate.replace('{n}', String(total))}</p>
            </div>
            <div className="flex-1 flex flex-col gap-2 justify-center">
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'var(--muted1)' }}>{t.win}</span>
                <span className="font-display text-[19px] leading-none" style={{ color: 'var(--accent)' }}>{wins}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'var(--muted1)' }}>{t.loss}</span>
                <span className="font-display text-[19px] leading-none" style={{ color: '#c05a4d' }}>{losses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px]" style={{ color: 'var(--muted1)' }}>{t.draw}</span>
                <span className="font-display text-[19px] leading-none" style={{ color: '#4a4636' }}>{draws}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent matches */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-black text-[16px] text-white">{t.recentMatches}</h2>
          </div>

          {matches.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <p className="text-[14px]" style={{ color: '#555' }}>{t.noMatches}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((match: any) => {
                const mvp = calculateMVP(match)
                const isWin = match.home_score > match.away_score
                const isLoss = match.home_score < match.away_score
                return (
                  <Link key={match.id} href={`/match/${match.id}`}
                    className="flex items-center justify-between p-4 rounded-[14px] active:opacity-80 transition"
                    style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="min-w-0">
                      <p className="font-bold text-[14px] text-white truncate">vs {match.opponent}</p>
                      {mvp && (
                        <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted2)' }}>
                          <span style={{ color: 'var(--accent)' }}>★</span> MVP {mvp.playerName} · {mvp.averageRating.toFixed(1)}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="font-display text-[23px] leading-none text-white">
                        {match.home_score} – {match.away_score}
                      </p>
                      <p className="font-display text-[12px] mt-0.5" style={{ color: isWin ? 'var(--accent)' : isLoss ? '#c05a4d' : '#555', letterSpacing: '0.08em' }}>
                        {isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW'} · {formatDate(match.match_date)}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>

      </main>
      </PullToRefresh>
      <BottomNav />
    </div>
  )
}
