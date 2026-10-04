'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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
    <div className="light min-h-screen pb-nav bg-[color:var(--bg)]">
      <header className="safe-top sticky top-0 z-10 border-b border-[color:var(--line)] bg-[color:var(--nav)]"><div className="mx-auto flex max-w-md items-center justify-between px-5 pb-4 pt-3"><div><h1 className="text-[24px] font-black tracking-[-0.04em]">{t.allMatches}</h1><p className="mt-1 text-xs text-[color:var(--text3)]">{data.selectedTeam?.name}</p></div>{canEdit && <Link href="/match/new" aria-label={t.newMatchRecord} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color:var(--navy)] text-[color:var(--accent)]"><Plus aria-hidden="true" /></Link>}</div></header>
      <PullToRefresh onRefresh={data.refresh}><main className="mx-auto flex max-w-md flex-col gap-6 px-5 pb-8">
        <section aria-label={t.teamRecord} className="grid grid-cols-4 rounded-[18px] bg-[color:var(--navy)] p-4 text-center">
          {[{ label: t.totalGames, value: completed.length }, { label: t.win, value: wins }, { label: t.draw, value: draws }, { label: t.loss, value: losses }].map(item => <div key={item.label}><strong className="block text-2xl text-white">{item.value}</strong><span className="text-[11px] text-white/55">{item.label}</span></div>)}
        </section>
        {upcoming.length > 0 && <MatchSection title={t.upcomingMatches} matches={upcoming} />}
        <MatchSection title={t.completedMatches} matches={completed} empty={t.noMatches} />
      </main></PullToRefresh>
      <BottomNav />
    </div>
  )
}

function MatchSection({ title, matches, empty }: { title: string; matches: ReturnType<typeof useAppData>['matches']; empty?: string }) {
  return <section><h2 className="mb-3 text-[15px] font-black">{title}</h2>{matches.length === 0 ? <div className="rounded-2xl border border-[color:var(--line)] bg-white p-8 text-center text-sm text-[color:var(--text3)]">{empty}</div> : <div className="space-y-2">{matches.map(match => { const mvp = calculateMVP(match); const won = match.home_score > match.away_score; return <Link key={match.id} href={`/match/${match.id}`} className="flex items-center gap-3 rounded-2xl border border-[color:var(--line)] bg-white p-4"><span className="h-9 w-1 rounded-full" style={{ background: won ? 'var(--accent)' : 'var(--line)' }} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm">vs {match.opponent}</strong><span className="mt-1 block text-xs text-[color:var(--text3)]">{formatDate(match.match_date)}{mvp ? ` · MVP ${mvp.playerName}` : match.location ? ` · ${match.location}` : ''}</span></span><strong className="text-xl">{match.home_score}:{match.away_score}</strong></Link> })}</div>}</section>
}
