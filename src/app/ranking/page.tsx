'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BottomNav } from '@/components/BottomNav'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { buildPlayerRanking, type RankStatKey } from '@/lib/player-ranking'

export default function RankingPage() {
  const data = useAppData()
  const router = useRouter()

  useEffect(() => {
    if (!data.isLoaded) return
    if (!data.userId) router.replace('/login')
    else if (!data.selectedTeam) router.replace('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam, router])

  if (data.loading || !data.userId || !data.selectedTeam) {
    return <><PlayersListSkeleton /><BottomNav /></>
  }

  return <RankingContent key={data.selectedTeam.id} data={data} />
}

function RankingContent({ data }: { data: ReturnType<typeof useAppData> }) {
  const { t } = useI18n()
  const [stat, setStat] = useState<RankStatKey>('goals')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const players = useMemo(() => data.players.filter(player => player.team_id === data.selectedTeamId), [data.players, data.selectedTeamId])
  const ranking = useMemo(() => buildPlayerRanking(players, data.matches.filter(match => match.team_id === data.selectedTeamId), stat, start, end), [players, data.matches, data.selectedTeamId, stat, start, end])
  const stats: { key: RankStatKey; label: string }[] = [
    { key: 'goals', label: t.goals },
    { key: 'assists', label: t.assistsLabel },
    { key: 'contribution', label: t.contribution },
    { key: 'avgRating', label: t.rating },
    { key: 'attendance', label: t.attendance },
    { key: 'cleanSheets', label: t.cleanSheet },
  ]
  const selectedLabel = stats.find(item => item.key === stat)!.label

  return <div className="light app-shell pb-nav">
    <header className="safe-top">
      <div className="mx-auto max-w-md px-5 pb-5 pt-4">
        <p className="section-label break-words">{data.selectedTeam?.name}</p>
        <h1 className="mt-1 sn-page-title">{t.rankingTab}</h1>
        <p className="mt-2 text-sm text-[color:var(--text3)]">{t.rankingByStats}</p>
      </div>
    </header>
    <PullToRefresh onRefresh={data.refresh}>
      <main className="mx-auto max-w-md space-y-4 px-5 pb-8">
        <section aria-label={t.periodLabel} className="surface space-y-3 p-4">
          <div className="flex min-h-11 items-center justify-between gap-2">
            <h2 className="text-sm font-bold">{t.periodLabel}</h2>
            {start || end ? <button type="button" onClick={() => { setStart(''); setEnd('') }} className="focus-ring min-h-11 rounded-full bg-[color:var(--chip)] px-3 text-xs font-bold text-[color:var(--brand)]">{t.allPeriod}</button> : <span className="text-xs text-[color:var(--text3)]">{t.allPeriod}</span>}
          </div>
          <div className="grid grid-cols-1 gap-3">
            <label className="flex min-w-0 items-center gap-3 text-xs text-[color:var(--text3)]">
              <span className="w-16 shrink-0 break-words">{t.startDate}</span>
              <input type="date" value={start} max={end || undefined} onChange={event => setStart(event.target.value)} className="focus-ring min-h-11 w-full min-w-0 flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--card2)] px-2 text-base text-[color:var(--text)]" style={{ colorScheme: 'dark' }} />
            </label>
            <label className="flex min-w-0 items-center gap-3 text-xs text-[color:var(--text3)]">
              <span className="w-16 shrink-0 break-words">{t.endDate}</span>
              <input type="date" value={end} min={start || undefined} onChange={event => setEnd(event.target.value)} className="focus-ring min-h-11 w-full min-w-0 flex-1 rounded-xl border border-[color:var(--line)] bg-[color:var(--card2)] px-2 text-base text-[color:var(--text)]" style={{ colorScheme: 'dark' }} />
            </label>
          </div>
        </section>
        <div role="group" aria-label={t.rankingByStats} className="flex gap-2 overflow-x-auto pb-1">
          {stats.map(item => <button key={item.key} type="button" aria-pressed={stat === item.key} onClick={() => setStat(item.key)} className={`focus-ring min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold ${stat === item.key ? 'border-[color:var(--brand)] bg-[color:var(--brand)] text-[color:var(--on-accent)]' : 'border-[color:var(--line)] bg-[color:var(--card)] text-[color:var(--text2)]'}`}>{item.label}</button>)}
        </div>
        <section aria-label={selectedLabel} aria-live="polite">
          {players.length === 0 ? <div className="surface p-6 text-center">
            <p className="text-sm text-[color:var(--text3)]">{t.noPlayers}</p>
            <Link href="/team/players" className="focus-ring mt-3 inline-flex min-h-11 items-center text-sm font-bold text-[color:var(--brand)]">{t.playerManagement}</Link>
          </div> : !ranking.hasRecords ? <div className="surface p-6 text-center text-sm text-[color:var(--text3)]">{t.noRecords}</div> : <ol className="space-y-2">
            {ranking.rows.map(({ player, value, rank }) => <li key={player.id}>
              <Link href={`/ranking/${player.id}`} className="surface focus-ring flex min-h-[76px] items-center gap-3 px-4 py-3 active:opacity-80">
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${rank === 1 && value !== null ? 'bg-[color:var(--brand)] text-[color:var(--on-accent)]' : 'text-[color:var(--text3)]'}`}>{value === null ? '–' : rank}</span>
                <span className="min-w-0 flex-1">
                  <strong className="block break-words text-sm font-bold">{player.name}</strong>
                  <span className="mt-1 block text-xs text-[color:var(--text3)]">{player.default_position} · #{player.number ?? '–'}</span>
                </span>
                <span className="shrink-0 text-right">
                  <strong className="font-display block text-[28px] leading-none text-[color:var(--brand)]">{value === null ? '–' : stat === 'avgRating' ? value.toFixed(1) : value}</strong>
                  <span className="mt-1 block text-[10px] text-[color:var(--text3)]">{selectedLabel}</span>
                </span>
              </Link>
            </li>)}
          </ol>}
        </section>
      </main>
    </PullToRefresh>
    <BottomNav />
  </div>
}
