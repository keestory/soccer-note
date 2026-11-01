'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { isUpcomingMatchDate } from '@/lib/match-date'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ChevronDown, LogOut, User } from 'lucide-react'
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
import { EntryBrand, TeamChoiceContent } from '@/components/entry/Entry'
import { getEntryCopy } from '@/lib/entry-copy'
import entryStyles from '@/components/entry/entry.module.css'

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
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [createError, setCreateError] = useState('')
  const createPending = useRef(false)
  const createChoice = useRef<HTMLButtonElement>(null)
  const entryCopy = getEntryCopy(locale)

  useEffect(() => { if (data.isLoaded && !data.userId) router.push('/login') }, [data.isLoaded, data.userId, router])
  useEffect(() => {
    if (data.userId && data.selectedTeam) {
      primeTeamCache(data.userId, data.selectedTeam)
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
    if (!teamName.trim() || !data.userId || createPending.current) return
    createPending.current = true
    setCreatingTeam(true)
    setCreateError('')
    try {
      const supabase = createClient()
      const { data: team, error } = await supabase.from('teams').insert({ name: teamName.trim(), user_id: data.userId }).select().single()
      if (error) { setCreateError(t.teamCreateFailed); return }
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
    } catch { setCreateError(t.teamCreateFailed) }
    finally { createPending.current = false; setCreatingTeam(false) }
  }

  const closeCreateTeam = () => {
    setShowCreateTeam(false)
    requestAnimationFrame(() => createChoice.current?.focus())
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
      <main className={entryStyles.page}>
        <div className={entryStyles.firstTeam}>
          <header className={entryStyles.header}><EntryBrand href="/dashboard" /><Link href="/profile" className={entryStyles.textLink}><User size={16} aria-hidden="true" />&nbsp;{t.myProfile}</Link></header>
          <div className={entryStyles.heading}><h1 className={entryStyles.title}>{entryCopy.teamTitle}</h1><p className={entryStyles.description}>{entryCopy.teamDescription}</p></div>
          {teams.length > 0 && <section className={entryStyles.teamList}><h2>{t.myTeams} ({teams.length})</h2><div className="space-y-2">{teams.map(team => <button key={team.id} onClick={() => handleSelectTeam(team)} className="flex min-h-[64px] w-full items-center justify-between rounded-xl bg-[color:var(--card2)] p-4 text-left"><span><span className="block font-bold">{team.name}</span><span className="text-sm text-[color:var(--muted2)]">{team.role === 'coach' ? t.coach : t.member}</span></span><ChevronDown aria-hidden="true" className="h-4 w-4 -rotate-90 text-[color:var(--text3)]" /></button>)}</div></section>}
          {showCreateTeam ? <form onSubmit={handleCreateTeam} className={entryStyles.teamForm} aria-busy={creatingTeam}>
            <button type="button" onClick={closeCreateTeam} disabled={creatingTeam} className={entryStyles.textLink}><ArrowLeft size={16} aria-hidden="true" />&nbsp;{t.cancel}</button>
            <h2>{t.createTeam}</h2>
            {createError && <p role="alert" className={entryStyles.error}>{createError}</p>}
            <div className={entryStyles.field}><label htmlFor="new-team-name">{t.teamName}</label><input id="new-team-name" autoFocus required value={teamName} onChange={event => setTeamName(event.target.value)} placeholder={t.teamName} disabled={creatingTeam} /></div>
            <button type="submit" disabled={creatingTeam || !teamName.trim()} className={entryStyles.primary}>{creatingTeam ? t.loading : t.createTeamButton}</button>
          </form> : <div className={entryStyles.choices}>
            <button ref={createChoice} type="button" className={entryStyles.choice} onClick={() => setShowCreateTeam(true)}><TeamChoiceContent /></button>
            <Link href="/team/join" className={entryStyles.choice}><TeamChoiceContent join /></Link>
          </div>}
          <div className="mt-6 flex justify-center"><button onClick={handleLogout} className={entryStyles.textLink}><LogOut size={16} aria-hidden="true" />&nbsp;{t.logout}</button></div>
        </div>
      </main>
    )
  }

  return (
    <div className="light app-shell pb-nav">
      {showTeamPicker && <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-5 pt-[calc(env(safe-area-inset-top)+56px)]" role="presentation" onClick={() => setShowTeamPicker(false)}><div role="dialog" aria-modal="true" aria-labelledby="team-picker-title" className="flex max-h-[70dvh] w-full max-w-md flex-col rounded-2xl border border-[color:var(--line)] bg-[color:var(--card)] p-5" onClick={event => event.stopPropagation()}><h2 id="team-picker-title" className="mb-3 font-black">{t.selectTeam}</h2><div className="mb-4 flex-1 space-y-2 overflow-y-auto">{teams.map(team => <button key={team.id} onClick={() => handleSelectTeam(team)} className="w-full rounded-xl bg-[color:var(--card2)] p-4 text-left font-bold">{team.name}</button>)}</div><button onClick={() => setShowTeamPicker(false)} className="rounded-xl bg-[color:var(--navy)] py-3 font-black text-[color:var(--accent)]">{t.close}</button></div></div>}
      <HomeHeader teamName={selectedTeam.name} displayName={displayName || '?'} teamPickerLabel={t.selectTeam} profileLabel={t.myProfile} notification={<NotificationBadge />} onSelectTeam={() => setShowTeamPicker(true)} />
      <PullToRefresh onRefresh={data.refresh}><main className="mx-auto max-w-md px-5 pb-8 pt-1">
        {pendingCount > 0 && <Link href="/team/members" className="mb-4 flex items-center justify-between rounded-xl bg-[color:var(--chip)] p-3 text-sm font-bold"><span>{t.pendingJoinBadge.replace('{n}', String(pendingCount))}</span><span>{t.checkNow}</span></Link>}
        <HomeFocus upcoming={nextMatch ? { id: nextMatch.id, opponent: nextMatch.opponent, date: formatDate(nextMatch.match_date, locale), location: nextMatch.location } : null} upcomingLabel={t.nextMatch} seasonLine={t.homeSeasonSummary.replace('{n}', String(played.length)).replace('{rate}', String(winRate ?? '–'))} latestLabel={t.lastMatch} opponentLabel={t.opponentShort} match={latestMatch} canCreateMatch={canEditMatches} newMatchLabel={t.newMatchRecord} allMatchesLabel={t.viewAll} teamOperationsLabel={t.homeTeamOperationsLabel} teamOperationsDescription={t.homeTeamOperationsDescription} noMatchesLabel={t.noMatches} noUpcomingLabel={t.homeNoUpcoming} emptyDescription={t.homeEmptyDescription} />
      </main></PullToRefresh>
      <BottomNav />
    </div>
  )
}
