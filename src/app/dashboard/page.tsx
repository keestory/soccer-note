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

const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"

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

  const now = Date.now()
  const played = matches.filter(m => new Date(m.match_date).getTime() <= now)
  const upcoming = matches
    .filter(m => new Date(m.match_date).getTime() > now)
    .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
  const wins   = played.filter(m => m.home_score >  m.away_score).length
  const losses = played.filter(m => m.home_score <  m.away_score).length
  const draws  = played.filter(m => m.home_score === m.away_score).length
  const total  = played.length
  const winRate = total > 0 ? Math.round((wins / total) * 100) : null
  const latestMatch = played[0] ?? null
  const nextMatch = upcoming[0] ?? null
  const nextMatchDday = nextMatch
    ? Math.max(0, Math.ceil((new Date(nextMatch.match_date).getTime() - now) / 86400000))
    : null

  // No teams yet
  if (!selectedTeam || showCreateTeam) {
    return (
      <div className="light min-h-screen px-5 py-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <span className="font-display text-[30px] tracking-widest" style={{ color: 'var(--accent)' }}>SOCCERNOTE</span>
          </div>

          {teams.length > 0 && (
            <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <h2 className="font-black text-[color:var(--text)] mb-4">{t.myTeams} ({teams.length})</h2>
              <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                {teams.map(team => (
                  <button key={team.id} onClick={() => handleSelectTeam(team)}
                    className="w-full p-4 rounded-xl text-left flex items-center justify-between transition active:opacity-70"
                    style={{ background: 'var(--card2)' }}>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{team.name}</p>
                      <p className="text-sm" style={{ color: 'var(--muted2)' }}>{team.role === 'coach' ? t.coach : t.member}</p>
                    </div>
                    <ChevronDown className="w-4 h-4 -rotate-90" style={{ color: '#555' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleCreateTeam} className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <h2 className="font-black text-[color:var(--text)] mb-4">{t.createTeam}</h2>
            <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required
              className="w-full outline-none text-[color:var(--text)] placeholder-[#98a2b3] mb-3"
              style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 12, padding: '13px 15px' }}
              placeholder={t.teamName} />
            <button type="submit" className="w-full font-black py-3.5 rounded-xl active:scale-[0.98] transition"
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}>{t.createTeamButton}</button>
          </form>

          <div className="rounded-2xl p-5 mb-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <h2 className="font-black text-[color:var(--text)] mb-3">{t.joinTeam}</h2>
            <Link href="/team/join"
              className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold transition active:opacity-70"
              style={{ background: 'var(--card2)', color: 'var(--accent)' }}>
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
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

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
            <h3 className="font-black mb-3" style={{ color: 'var(--text)' }}>{t.selectTeam}</h3>
            <div className="space-y-2 mb-4 overflow-y-auto flex-1">
              {teams.map(team => {
                const active = selectedTeam?.id === team.id
                return (
                  <button key={team.id} onClick={() => handleSelectTeam(team)}
                    className="w-full p-4 rounded-xl text-left flex items-center justify-between transition active:opacity-70"
                    style={{
                      background: active ? 'var(--chip)' : 'var(--card2)',
                      border: `1px solid ${active ? 'var(--accent)' : 'transparent'}`
                    }}>
                    <div>
                      <p className="font-bold" style={{ color: 'var(--text)' }}>{team.name}</p>
                      <p className="text-sm" style={{ color: 'var(--muted2)' }}>{team.role === 'coach' ? t.coach : t.member}</p>
                    </div>
                    {active && <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: 'var(--accent)' }} />}
                  </button>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowTeamPicker(false)} className="flex-1 py-3 rounded-xl font-bold" style={{ background: 'var(--card2)', color: 'var(--text2)' }}>{t.close}</button>
              <button onClick={() => { setShowTeamPicker(false); setShowCreateTeam(true) }} className="flex-1 py-3 rounded-xl font-black" style={{ background: 'var(--navy)', color: 'var(--accent)' }}>{t.newTeamShort}</button>
              <Link href="/team/join" className="flex-1 py-3 rounded-xl font-bold text-center" style={{ background: 'var(--chip)', color: 'var(--text)' }}>{t.joinShort}</Link>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-md mx-auto flex justify-between items-center" style={{ padding: '10px 24px 14px' }}>
          <button onClick={() => setShowTeamPicker(true)} className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-[21px] truncate max-w-[200px]" style={{ color: '#101828' }}>{selectedTeam?.name || t.selectTeam}</span>
            <ChevronDown className="w-4 h-4 flex-shrink-0" style={{ color: '#98a2b3' }} />
          </button>
          <div className="flex items-center gap-2.5">
            <NotificationBadge />
            <Link href="/profile"
              className="rounded-full flex items-center justify-center font-bold text-[13px]"
              style={{ width: 34, height: 34, background: '#101828', color: '#c8f542' }}>
              {(displayName || '?').charAt(0).toUpperCase()}
            </Link>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
      <main className="max-w-md mx-auto flex flex-col" style={{ gap: 13, padding: '0 20px 16px' }}>

        {/* Pending join requests banner (coach only) */}
        {pendingCount > 0 && (
          <Link href="/team/members"
            className="flex items-center justify-between p-4 rounded-[14px] active:opacity-80 transition"
            style={{ background: 'var(--chip)', border: '1px solid var(--line2)' }}>
            <p className="font-bold text-[14px]" style={{ color: 'var(--text)' }}>
              {t.pendingJoinBadge.replace('{n}', String(pendingCount))}
            </p>
            <span className="text-[12px] font-bold" style={{ color: 'var(--text)' }}>{t.checkNow}</span>
          </Link>
        )}

        {/* Latest match KV scoreboard */}
        {latestMatch && (() => {
          const isWin = latestMatch.home_score > latestMatch.away_score
          const isLoss = latestMatch.home_score < latestMatch.away_score
          const result = isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW'
          const quarters = (latestMatch.quarters ?? []).slice().sort((a, b) => a.quarter_number - b.quarter_number)
          return (
            <Link href={`/match/${latestMatch.id}`}
              className="block active:opacity-90 transition" style={{ background: '#101828', borderRadius: 22, padding: 22 }}>
              <div className="flex items-center justify-between">
                <span style={{ fontFamily: BEBAS, fontSize: 13, letterSpacing: '.22em', color: '#c8f542' }}>
                  {t.lastMatch} · {formatDate(latestMatch.match_date)}
                </span>
                <span style={{
                  fontFamily: BEBAS, fontSize: 12, letterSpacing: '.1em', padding: '3px 11px', borderRadius: 6,
                  color: isWin ? '#101828' : '#fff',
                  background: isWin ? '#c8f542' : isLoss ? 'rgba(240,68,56,.9)' : '#1a2437',
                }}>{result}</span>
              </div>
              <div className="flex items-end" style={{ gap: 16, marginTop: 16 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 76, lineHeight: 0.75, color: '#fff' }}>
                  {latestMatch.home_score}<span style={{ color: '#344054' }}>–</span>{latestMatch.away_score}
                </span>
                <div style={{ paddingBottom: 4 }}>
                  <div style={{ fontSize: 11, color: '#667085' }}>{t.opponentShort}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>vs {latestMatch.opponent}</div>
                </div>
              </div>
              {quarters.length > 0 && (
                <div className="flex" style={{ gap: 6, marginTop: 18 }}>
                  {quarters.map((q) => {
                    const recs = (q as any).quarter_records ?? []
                    const hs = recs.filter((r: any) => r.is_home !== false).reduce((s: number, r: any) => s + (r.goals || 0), 0)
                    const as_ = recs.filter((r: any) => r.is_home === false).reduce((s: number, r: any) => s + (r.goals || 0), 0)
                    return (
                      <span key={q.id} style={{ flex: 1, textAlign: 'center', fontFamily: BEBAS, fontSize: 13, color: '#98a2b3', background: '#1a2437', padding: '6px 0', borderRadius: 7 }}>
                        {q.quarter_number}Q {hs}:{as_}
                      </span>
                    )
                  })}
                </div>
              )}
            </Link>
          )
        })()}

        {/* Next match D-day card */}
        {nextMatch && (
          <Link href={`/match/${nextMatch.id}`}
            className="flex items-center active:opacity-80 transition"
            style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: '14px 18px', gap: 12 }}>
            <span style={{ background: '#101828', color: '#c8f542', fontFamily: BEBAS, fontSize: 14, letterSpacing: '.06em', padding: '4px 10px', borderRadius: 8 }}>
              D-{nextMatchDday}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: '#101828' }}>{t.nextMatch} vs {nextMatch.opponent}</div>
              <div style={{ fontSize: 11.5, color: '#98a2b3', marginTop: 2 }}>
                {formatDate(nextMatch.match_date)}{nextMatch.location ? ` · ${nextMatch.location}` : ''}
              </div>
            </div>
            <span style={{ color: '#98a2b3' }}>›</span>
          </Link>
        )}

        {/* New match button */}
        {canEditMatches && (
          <Link href="/match/new"
            className="block text-center active:scale-[0.98] transition"
            style={{ background: '#101828', color: '#c8f542', fontWeight: 700, fontSize: 15, padding: 15, borderRadius: 14 }}>
            {t.newMatchRecord}
          </Link>
        )}

        {/* Season stats card */}
        <div className="flex items-center" style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: '16px 18px' }}>
          <div style={{ flex: 1.2 }}>
            <div style={{ fontSize: 11, color: '#98a2b3' }}>{t.seasonWinRate.replace('{n}', String(total))}</div>
            <div className="flex items-baseline" style={{ gap: 8, marginTop: 6 }}>
              <span style={{ fontFamily: BEBAS, fontSize: 44, lineHeight: 0.8, color: '#101828' }}>
                {winRate ?? '–'}{winRate !== null && <span style={{ fontSize: 24 }}>%</span>}
              </span>
              <span style={{ fontSize: 11, color: '#667085' }}>{t.winRateLabel}</span>
            </div>
          </div>
          <div className="flex" style={{ gap: 14 }}>
            {[
              { k: t.win, v: wins, c: '#101828' },
              { k: t.draw, v: draws, c: '#98a2b3' },
              { k: t.loss, v: losses, c: '#f04438' },
            ].map(s => (
              <div key={s.k} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: BEBAS, fontSize: 22, color: s.v === 0 ? '#d0d5dd' : s.c }}>{s.v}</div>
                <div style={{ fontSize: 10, color: '#98a2b3' }}>{s.k}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent matches */}
        <div className="flex items-center justify-between" style={{ marginTop: 2 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{t.recentMatches}</span>
        </div>
        {played.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 32, textAlign: 'center', fontSize: 14, color: '#98a2b3' }}>
            {t.noMatches}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 9 }}>
            {played.map((match) => {
              const mvp = calculateMVP(match as any)
              const isWin = match.home_score > match.away_score
              return (
                <Link key={match.id} href={`/match/${match.id}`}
                  className="flex items-center active:opacity-80 transition"
                  style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: '15px 18px', gap: 13 }}>
                  <span style={{ width: 4, height: 34, borderRadius: 2, background: isWin ? '#c8f542' : '#d0d5dd', flexShrink: 0 }} />
                  <span style={{ fontFamily: BEBAS, fontSize: 24, color: isWin ? '#101828' : '#667085', minWidth: 44 }}>
                    {match.home_score}:{match.away_score}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 13.5, fontWeight: 600, color: '#101828' }}>vs {match.opponent}</div>
                    <div style={{ fontSize: 11.5, color: '#98a2b3', marginTop: 2 }}>
                      {formatDate(match.match_date)}{mvp ? ` · MVP ${mvp.playerName}` : match.location ? ` · ${match.location}` : ''}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

      </main>
      </PullToRefresh>
      <BottomNav />
    </div>
  )
}
