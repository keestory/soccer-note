'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { isUpcomingMatchDate } from '@/lib/match-date'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Check, ChevronDown, Loader2, LogOut, User } from 'lucide-react'
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
import { cancelTeamSelection, type TeamWithRole } from '@/lib/dataStore'
import { Sheet } from '@/components/design/Sheet'
import { getAppLoadErrorCopy, getTeamSelectionCopy } from '@/lib/team-selection-copy'
import { formatDate } from '@/lib/utils'
import { EntryBrand, TeamChoiceContent } from '@/components/entry/Entry'
import { getEntryCopy } from '@/lib/entry-copy'
import entryStyles from '@/components/entry/entry.module.css'

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
  const selectionCopy = getTeamSelectionCopy(locale)
  const selectionAttempt = useRef(0)

  useEffect(() => { if (data.isLoaded && !data.userId) router.push('/login') }, [data.isLoaded, data.userId, router])
  useEffect(() => () => { selectionAttempt.current++; cancelTeamSelection() }, [])
  useEffect(() => { setShowTeamPicker(false); selectionAttempt.current++ }, [data.userId])

  const closeTeamPicker = () => {
    selectionAttempt.current++
    data.cancelTeamSelection()
    setShowTeamPicker(false)
  }

  const handleSelectTeam = async (team: TeamWithRole) => {
    if (team.id === data.selectedTeamId) { closeTeamPicker(); return }
    const attempt = ++selectionAttempt.current
    const committed = await data.selectTeam(team.id)
    if (committed && attempt === selectionAttempt.current) setShowTeamPicker(false)
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
  const pendingTeam = teams.find(team => team.id === data.pendingTeamId)
  const failedTeam = teams.find(team => team.id === data.teamLoadError)
  const selectionStatus = <div id="team-selection-status" className="min-w-0 space-y-3 [overflow-wrap:anywhere]">
    {pendingTeam && <p role="status" className="flex min-w-0 items-start gap-2 text-sm text-[color:var(--text)]"><Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /><span className="min-w-0">{selectionCopy.loading.replace('{team}', pendingTeam.name)}</span></p>}
    {failedTeam && <div className="min-w-0 space-y-2"><p role="alert" className="text-sm text-[color:var(--text)]">{selectionCopy.failed.replace('{team}', failedTeam.name)}</p><button type="button" onClick={() => handleSelectTeam(failedTeam)} className="sn-button w-full">{selectionCopy.retry}</button></div>}
    {pendingTeam && <button type="button" onClick={closeTeamPicker} className="sn-button w-full">{selectionCopy.cancel}</button>}
  </div>
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

  if (data.appLoadError && !selectedTeam) return <main className="app-shell flex min-h-screen items-center justify-center p-5"><div className="max-w-md space-y-4"><p role="alert">{getAppLoadErrorCopy(locale)}</p><button className="sn-button w-full" onClick={() => void data.refresh()}>{selectionCopy.retry}</button><button className="sn-button w-full" onClick={handleLogout}>{t.logout}</button></div></main>

  if (!selectedTeam || showCreateTeam) {
    return (
      <main className={entryStyles.page}>
        <div className={entryStyles.firstTeam}>
          <header className={entryStyles.header}><EntryBrand href="/dashboard" /><Link href="/profile" className={entryStyles.textLink}><User size={16} aria-hidden="true" />&nbsp;{t.myProfile}</Link></header>
          <div className={entryStyles.heading}><h1 className={entryStyles.title}>{entryCopy.teamTitle}</h1><p className={entryStyles.description}>{entryCopy.teamDescription}</p></div>
          {teams.length > 0 && <section className={entryStyles.teamList}><h2>{t.myTeams} ({teams.length})</h2><div className="space-y-2">{teams.map(team => <button key={team.id} onClick={() => handleSelectTeam(team)} className="flex min-h-[64px] w-full items-center justify-between rounded-xl bg-[color:var(--card2)] p-4 text-left"><span><span className="block font-bold">{team.name}</span><span className="text-sm text-[color:var(--muted2)]">{team.role === 'coach' ? t.coach : t.member}</span></span><ChevronDown aria-hidden="true" className="h-4 w-4 -rotate-90 text-[color:var(--text3)]" /></button>)}</div></section>}
          {selectionStatus}
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
      {showTeamPicker && <Sheet title={t.selectTeam} closeLabel={t.close} onClose={closeTeamPicker}>
        <div className="mb-4 space-y-2">{teams.map(team => <button key={team.id} type="button" onClick={() => handleSelectTeam(team)} disabled={team.id === data.pendingTeamId} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl bg-[color:var(--card2)] p-4 text-left font-bold disabled:opacity-70">
          <span className="min-w-0 break-words">{team.name}{team.id === selectedTeam.id && <span className="mt-1 block text-xs font-medium text-[color:var(--muted2)]">{selectionCopy.current}</span>}</span>
          {team.id === selectedTeam.id && <Check className="h-5 w-5 shrink-0" aria-hidden="true" />}
        </button>)}</div>{selectionStatus}
      </Sheet>}
      <HomeHeader teamName={selectedTeam.name} displayName={displayName || '?'} teamPickerLabel={t.selectTeam} profileLabel={t.myProfile} notification={<NotificationBadge />} onSelectTeam={() => setShowTeamPicker(true)} />
      <PullToRefresh onRefresh={data.refresh}><main className="mx-auto max-w-md px-5 pb-8 pt-1">
        {data.appLoadError && <div className="mb-4 space-y-2"><p role="alert">{getAppLoadErrorCopy(locale)}</p><button className="sn-button" onClick={() => void data.refresh()}>{selectionCopy.retry}</button></div>}
        {pendingCount > 0 && <Link href="/team/members" className="mb-4 flex items-center justify-between rounded-xl bg-[color:var(--chip)] p-3 text-sm font-bold"><span>{t.pendingJoinBadge.replace('{n}', String(pendingCount))}</span><span>{t.checkNow}</span></Link>}
        <HomeFocus upcoming={nextMatch ? { id: nextMatch.id, opponent: nextMatch.opponent, date: formatDate(nextMatch.match_date, locale), location: nextMatch.location } : null} upcomingLabel={t.nextMatch} seasonLine={t.homeSeasonSummary.replace('{n}', String(played.length)).replace('{rate}', String(winRate ?? '–'))} latestLabel={t.lastMatch} opponentLabel={t.opponentShort} match={latestMatch} canCreateMatch={canEditMatches} newMatchLabel={t.newMatchRecord} allMatchesLabel={t.viewAll} teamOperationsLabel={t.homeTeamOperationsLabel} teamOperationsDescription={t.homeTeamOperationsDescription} noMatchesLabel={t.noMatches} noUpcomingLabel={t.homeNoUpcoming} emptyDescription={t.homeEmptyDescription} />
      </main></PullToRefresh>
      <BottomNav />
    </div>
  )
}
