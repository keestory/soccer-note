'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowUpRight, CalendarDays, MapPin, Plus } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { calculateMVP, formatDate } from '@/lib/utils'

export default function MatchesPage() {
  const router = useRouter()
  const data = useAppData()
  const { t } = useI18n()

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam, router])

  if (data.loading) return <PlayersListSkeleton />
  const canEdit = data.selectedTeam?.role === 'coach' || !!data.selectedTeam?.membership?.can_edit_matches
  const now = Date.now()
  const upcoming = data.matches.filter(match => new Date(match.match_date).getTime() > now).sort((a, b) => +new Date(a.match_date) - +new Date(b.match_date))
  const completed = data.matches.filter(match => new Date(match.match_date).getTime() <= now).sort((a, b) => +new Date(b.match_date) - +new Date(a.match_date))
  const wins = completed.filter(match => match.home_score > match.away_score).length
  const draws = completed.filter(match => match.home_score === match.away_score).length
  const losses = completed.length - wins - draws

  return (
    <div className="light app-shell pb-nav">
      <header className="safe-top sticky top-0 z-10 bg-[color:var(--bg)]/92 backdrop-blur-xl"><div className="mx-auto flex max-w-md items-end justify-between px-5 pb-4 pt-4"><div><p className="section-label">{t.teamRecord}</p><h1 className="mt-1 text-[30px] font-black tracking-[-0.055em]">{t.allMatches}</h1><p className="mt-1 text-xs font-bold text-[color:var(--text3)]">{data.selectedTeam?.name}</p></div>{canEdit && <Link href="/match/new" aria-label={t.newMatchRecord} className="focus-ring flex h-12 w-12 items-center justify-center rounded-[14px] bg-[color:var(--navy)] text-white"><Plus aria-hidden="true" strokeWidth={2.5} /></Link>}</div></header>
      <PullToRefresh onRefresh={data.refresh}><main className="mx-auto flex max-w-md flex-col gap-7 px-5 pb-8 pt-1">
        <section aria-label={t.teamRecord} className="surface content-enter grid grid-cols-4 divide-x divide-[color:var(--line)] overflow-hidden">
          {[
            { label: t.totalGames, value: completed.length },
            { label: t.win, value: wins },
            { label: t.draw, value: draws },
            { label: t.loss, value: losses },
          ].map(item => <div key={item.label} className="flex min-h-[82px] flex-col items-center justify-center px-2 text-center"><strong className="score-display block text-[31px] leading-none text-[color:var(--text)]">{item.value}</strong><span className="mt-2 text-[10px] font-black text-[color:var(--text3)]">{item.label}</span></div>)}
        </section>
        {upcoming.length > 0 && <MatchSection title={t.upcomingMatches} matches={upcoming} />}
        <MatchSection title={t.completedMatches} matches={completed} empty={t.noMatches} resultLabels={{ win: t.win, draw: t.draw, loss: t.loss }} />
      </main></PullToRefresh>
      <BottomNav />
    </div>
  )
}

function MatchSection({ title, matches, empty, resultLabels }: { title: string; matches: ReturnType<typeof useAppData>['matches']; empty?: string; resultLabels?: { win: string; draw: string; loss: string } }) {
  return <section className="content-enter"><div className="mb-3 flex items-center justify-between"><h2 className="text-[16px] font-black tracking-[-0.03em]">{title}</h2><span className="score-display text-[19px] text-[color:var(--text3)]">{String(matches.length).padStart(2, '0')}</span></div>{matches.length === 0 ? <div className="surface p-8 text-center text-sm font-bold text-[color:var(--text3)]">{empty}</div> : <div className="surface divide-y divide-[color:var(--line)] overflow-hidden">{matches.map(match => {
    const mvp = calculateMVP(match)
    const result = match.home_score > match.away_score ? 'win' : match.home_score < match.away_score ? 'loss' : 'draw'
    const resultLabel = resultLabels?.[result]
    return <Link key={match.id} href={`/match/${match.id}`} className="interactive-row focus-ring flex min-h-[88px] items-center gap-4 px-4 py-3">
      <span className="flex h-[58px] w-[58px] shrink-0 flex-col items-center justify-center border-r border-[color:var(--line)] pr-4">
        <strong className="score-display text-[26px] leading-none text-[color:var(--text)]">{match.home_score}:{match.away_score}</strong>
        {resultLabel && <span className="mt-1 text-[9px] font-black text-[color:var(--text3)]">{resultLabel}</span>}
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block truncate text-[16px] font-black tracking-[-0.025em]">vs {match.opponent}</strong>
        <span className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-[color:var(--text3)]"><CalendarDays aria-hidden="true" size={13} />{formatDate(match.match_date)}</span>
        {(mvp || match.location) && <span className="mt-1 flex items-center gap-1.5 truncate text-[11px] font-bold text-[color:var(--text3)]">{mvp ? `MVP ${mvp.playerName}` : <><MapPin aria-hidden="true" size={13} />{match.location}</>}</span>}
      </span>
      <ArrowUpRight aria-hidden="true" size={20} className="shrink-0 text-[color:var(--text3)]" />
    </Link>
  })}</div>}</section>
}
