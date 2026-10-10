'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { isUpcomingMatchDate } from '@/lib/match-date'
import { useRouter } from 'next/navigation'
import { ChevronDown, LogOut, User, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { BottomNav } from '@/components/BottomNav'
import { HomeFocus, type HomeMatchSummary } from '@/components/home/HomeFocus'
import { HomeHeader } from '@/components/home/HomeHeader'
import { NotificationBadge } from '@/components/NotificationBadge'
import { PullToRefresh } from '@/components/PullToRefresh'
import { DashboardSkeleton } from '@/components/Skeleton'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase'
import { cacheResolvedTeam } from '@/lib/team-resolver'
import { updateStore, type TeamWithRole } from '@/lib/dataStore'
import { formatDate } from '@/lib/utils'

function primeTeamCache(userId: string, team: TeamWithRole) {
  const isCoach = team.role === 'coach' || team.user_id === userId
  cacheResolvedTeam(userId, {
    teamId: team.id, role: team.role, isOwner: team.user_id === userId,
    canEditPlayers: isCoach || !!team.membership?.can_edit_players,
    canEditMatches: isCoach || !!team.membership?.can_edit_matches,
    canEditQuarters: isCoach || !!team.membership?.can_edit_quarters,
  })
}

export default function DashboardPage() {
  const router = useRouter()
  const data = useAppData()
  const { t, locale } = useI18n()
  const [showCreateTeam, setShowCreateTeam] = useState(false)
  const [showTeamPicker, setShowTeamPicker] = useState(false)
  const [teamName, setTeamName] = useState('')

  useEffect(() => { if (data.isLoaded && !data.userId) router.push('/login') }, [data.isLoaded, data.userId, router])
  useEffect(() => {
    if (data.userId && data.selectedTeam) {
      primeTeamCache(data.userId, data.selectedTeam)
      if (data.teams.length === 0) setShowCreateTeam(true)
    }
  }, [data.userId, data.selectedTeam, data.teams.length])
  useEffect(() => {
    document.body.style.overflow = showTeamPicker ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showTeamPicker])

  const handleSelectTeam = async (team: TeamWithRole) => {
    localStorage.setItem('selectedTeamId', team.id)
    if (data.userId) primeTeamCache(data.userId, team)
    setShowTeamPicker(false)
    await data.selectTeam(team.id)
  }

  const handleCreateTeam = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!teamName.trim() || !data.userId) return
    const supabase = createClient()
    const { data: team, error } = await supabase.from('teams').insert({ name: teamName, user_id: data.userId }).select().single()
    if (error) { toast.error(t.teamCreateFailed); return }
    await supabase.from('team_members').upsert({
      id: crypto.randomUUID(), team_id: team.id, user_id: data.userId,
      role: 'coach', can_edit_players: true, can_edit_matches: true, can_edit_quarters: true,
      joined_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })
    toast.success(t.teamCreated)
    setTeamName('')
    setShowCreateTeam(false)
    updateStore({ isLoaded: false })
    await data.refresh()
  }

  const handleLogout = async () => { await createClient().auth.signOut(); router.push('/') }

  if (data.loading) return <DashboardSkeleton />

  const { teams, selectedTeam, matches, displayName, userId } = data
  const isCoach = selectedTeam?.role === 'coach' || selectedTeam?.user_id === userId
  const canEditMatches = isCoach || !!selectedTeam?.membership?.can_edit_matches
  const pendingCount = isCoach ? data.members.filter(member => member.status === 'pending' && !member.is_removed).length : 0
  const played = matches.filter(match => !isUpcomingMatchDate(match.match_date)).sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime())
  const wins = played.filter(match => match.home_score > match.away_score).length
  const winRate = played.length ? Math.round((wins / played.length) * 100) : null
  const nextMatch = matches.filter(match => isUpcomingMatchDate(match.match_date)).sort((a, b) => +new Date(a.match_date) - +new Date(b.match_date))[0]
  const latest = played[0]
  const latestMatch: HomeMatchSummary | null = latest ? {
    id: latest.id, opponent: latest.opponent, score: `${latest.home_score}-${latest.away_score}`,
    date: formatDate(latest.match_date, locale), location: latest.location,
    result: latest.home_score > latest.away_score ? 'WIN' : latest.home_score < latest.away_score ? 'LOSS' : 'DRAW',
    resultLabel: latest.home_score > latest.away_score ? t.win : latest.home_score < latest.away_score ? t.loss : t.draw,
    quarters: (latest.quarters ?? []).slice().sort((a, b) => a.quarter_number - b.quarter_number).map(quarter => ({ label: `${quarter.quarter_number}Q`, home: quarter.home_score, away: quarter.away_score })),
  } : null

  if (!selectedTeam || showCreateTeam) {
    return (
      <div className="light min-h-screen px-5 py-8" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <div className="mx-auto max-w-lg">
          <div className="mb-8 text-center"><span className="font-display text-[30px] tracking-widest text-[color:var(--navy)]">FOOTBALL NOTE</span></div>
          {teams.length > 0 && <div className="mb-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-5"><h2 className="mb-4 font-black">{t.myTeams} ({teams.length})</h2><div className="max-h-[40vh] space-y-2 overflow-y-auto">{teams.map(team => <button key={team.id} onClick={() => handleSelectTeam(team)} className="flex w-full items-center justify-between rounded-xl bg-[color:var(--card2)] p-4 text-left"><span><span className="block font-bold">{team.name}</span><span className="text-sm text-[color:var(--muted2)]">{team.role === 'coach' ? t.coach : t.member}</span></span><ChevronDown aria-hidden="true" className="h-4 w-4 -rotate-90 text-[color:var(--text3)]" /></button>)}</div></div>}
          <form noValidate onSubmit={handleCreateTeam} className="mb-4 rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-5">
            <h2 className="mb-4 font-black">{t.createTeam}</h2>
            <input aria-label={t.teamName} value={teamName} onChange={event => setTeamName(event.target.value)} className="mb-3 w-full rounded-xl border border-[color:var(--line)] bg-[color:var(--card2)] px-4 py-3 outline-none" placeholder={t.teamName} />
            <button type="submit" disabled={!teamName.trim()} className="w-full rounded-xl bg-[color:var(--navy)] py-3.5 font-black text-[color:var(--accent)] disabled:opacity-40">{t.createTeamButton}</button>
          </form>
          <Link href="/team/join" className="flex items-center justify-center gap-2 rounded-xl bg-[color:var(--card)] py-4 font-bold"><UserPlus size={17} />{t.inviteCodeJoin}</Link>
          <div className="mt-4 flex flex-col gap-2"><Link href="/profile" className="flex items-center justify-center gap-2 py-3 text-sm text-[color:var(--text3)]"><User size={16} />{t.myProfile}</Link><button onClick={handleLogout} className="flex items-center justify-center gap-2 py-3 text-sm text-[color:var(--text3)]"><LogOut size={16} />{t.logout}</button></div>
        </div>
      </div>
    )
  }

  return (
    <div className="light app-shell pb-nav">
      {showTeamPicker && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-5 pt-[calc(env(safe-area-inset-top)+56px)]" role="presentation" onClick={() => setShowTeamPicker(false)}><div role="dialog" aria-modal="true" aria-labelledby="team-picker-title" className="flex max-h-[70dvh] w-full max-w-md flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-5" onClick={event => event.stopPropagation()}><h2 id="team-picker-title" className="mb-3 font-black">{t.selectTeam}</h2><div className="mb-4 flex-1 space-y-2 overflow-y-auto">{teams.map(team => <button key={team.id} onClick={() => handleSelectTeam(team)} className="w-full rounded-xl bg-[color:var(--card2)] p-4 text-left font-bold">{team.name}</button>)}</div><button onClick={() => setShowTeamPicker(false)} className="rounded-xl bg-[color:var(--navy)] py-3 font-black text-[color:var(--accent)]">{t.close}</button></div></div>}
      <HomeHeader teamName={selectedTeam.name} displayName={displayName || '?'} teamPickerLabel={t.selectTeam} profileLabel={t.myProfile} notification={<NotificationBadge />} onSelectTeam={() => setShowTeamPicker(true)} />
      <PullToRefresh onRefresh={data.refresh}><main className="mx-auto max-w-md px-5 pb-8 pt-1">
        {pendingCount > 0 && <Link href="/team/members" className="mb-4 flex items-center justify-between rounded-xl bg-[color:var(--chip)] p-3 text-sm font-bold"><span>{t.pendingJoinBadge.replace('{n}', String(pendingCount))}</span><span>{t.checkNow}</span></Link>}
        <HomeFocus upcoming={nextMatch ? { id: nextMatch.id, opponent: nextMatch.opponent, date: formatDate(nextMatch.match_date, locale), location: nextMatch.location } : null} upcomingLabel={t.upcomingMatches} seasonLine={t.homeSeasonSummary.replace('{n}', String(played.length)).replace('{rate}', String(winRate ?? '–'))} latestLabel={t.lastMatch} opponentLabel={t.opponentShort} match={latestMatch} canCreateMatch={canEditMatches} newMatchLabel={t.newMatchRecord} allMatchesLabel={t.viewAll} teamOperationsLabel={t.homeTeamOperationsLabel} teamOperationsDescription={t.homeTeamOperationsDescription} noMatchesLabel={t.noMatches} />
      </main></PullToRefresh>
      <BottomNav />
    </div>
  )
}
