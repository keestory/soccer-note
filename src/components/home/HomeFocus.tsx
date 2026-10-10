'use client'
import Link from 'next/link'
import { ArrowUpRight, CalendarDays, ChevronRight, MapPin, Plus, UsersRound } from 'lucide-react'
export interface HomeQuarterScore { label: string; home: number; away: number }
export interface HomeMatchSummary {
  id: string; opponent: string; score: string; date: string; location?: string | null
  result: 'WIN' | 'DRAW' | 'LOSS'; resultLabel: string; quarters: HomeQuarterScore[]
}
export interface HomeUpcomingMatch { id: string; opponent: string; date: string; location?: string | null }
interface HomeFocusProps {
  seasonLine: string; latestLabel: string; opponentLabel: string; match: HomeMatchSummary | null
  canCreateMatch: boolean; newMatchLabel: string; allMatchesLabel: string
  teamOperationsLabel: string; teamOperationsDescription: string; noMatchesLabel: string
  upcoming?: HomeUpcomingMatch | null; upcomingLabel?: string
}
export function HomeFocus(props: HomeFocusProps) {
  const { match, upcoming } = props
  const wideScore = match?.score.split('-').some(score => score.trim().length > 1)
  return <div className="flex min-w-0 flex-col gap-6">
    <p className="border-b border-[color:var(--line)] pb-4 text-xs leading-[18px] text-[color:var(--text3)]">{props.seasonLine}</p>
    {upcoming && <section className="content-enter min-w-0">
      <h2 className="sn-kicker mb-3">{props.upcomingLabel}</h2>
      <Link href={`/match/${upcoming.id}`} className="focus-ring surface block">
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="min-w-0"><p className="text-xs leading-[18px] text-[color:var(--text3)]">{props.opponentLabel}</p><h3 className="sn-opponent mt-2">{upcoming.opponent}</h3></div>
          <ArrowUpRight aria-hidden size={20} strokeWidth={1.7} className="shrink-0 text-[color:var(--brand)]" />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-b-xl border-t border-[color:var(--line)] bg-[color:var(--chip)] px-5 py-4 text-xs leading-[18px] text-[color:var(--brand)]">
          <span className="flex min-w-0 items-start gap-2"><CalendarDays size={16} strokeWidth={1.7} aria-hidden className="mt-px shrink-0" /><span className="[overflow-wrap:anywhere]">{upcoming.date}</span></span>
          {upcoming.location && <span className="flex min-w-0 items-start gap-2"><MapPin size={16} strokeWidth={1.7} aria-hidden className="mt-px shrink-0" /><span className="[overflow-wrap:anywhere]">{upcoming.location}</span></span>}
        </div>
      </Link>
    </section>}
    <section className="content-enter min-w-0" aria-label={props.latestLabel}>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3"><h2 className="sn-kicker">{props.latestLabel}</h2><Link href="/matches" className="focus-ring -mr-2 flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-medium leading-[18px] text-[color:var(--brand)]">{props.allMatchesLabel}<ChevronRight size={16} strokeWidth={1.7} aria-hidden /></Link></div>
      {match ? <Link href={`/match/${match.id}`} className="surface focus-ring sn-match-card block">
        <div className="sn-match-summary" data-wide-score={wideScore || undefined}>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-2"><p className="text-xs leading-[18px] text-[color:var(--text3)]">{match.date}</p><span className="sn-result" data-result={match.result}>{match.resultLabel}</span></div><h3 className="sn-opponent mt-2"><span className="mr-1.5 text-xs font-medium text-[color:var(--text3)]">{props.opponentLabel}</span>{match.opponent}</h3>{match.location && <p className="mt-2 flex items-start gap-1.5 text-xs leading-[18px] text-[color:var(--text3)]"><MapPin size={16} strokeWidth={1.7} aria-hidden className="mt-px shrink-0" /><span className="[overflow-wrap:anywhere]">{match.location}</span></p>}</div>
          <span className="score-display sn-match-score">{match.score.replace('-', ' : ')}</span>
        </div>
        {match.quarters.length > 0 && <div className="grid grid-cols-4 border-t border-[color:var(--line-strong)] divide-x divide-[color:var(--line)] py-3">
          {match.quarters.slice(0, 4).map(q => <div key={q.label} className="min-w-0 px-1 text-center"><p className="text-xs leading-[18px] text-[color:var(--text3)]">{q.label}</p><p className="mt-1 text-sm font-medium leading-[21px] tabular-nums">{q.home} <span className="text-[color:var(--text3)]">:</span> {q.away}</p></div>)}
        </div>}
      </Link> : <div className="surface p-7 text-center text-sm text-[color:var(--text3)]">{props.noMatchesLabel}</div>}
    </section>
    {props.canCreateMatch && <Link href="/match/new" className="sn-button w-full" data-primary="true"><Plus size={20} strokeWidth={1.7} aria-hidden />{props.newMatchLabel}</Link>}
    <nav className="border-t border-[color:var(--line)] divide-y divide-[color:var(--line)]">
      <HomeLink href="/team" label={props.teamOperationsLabel} description={props.teamOperationsDescription} />
    </nav>
  </div>
}
function HomeLink({ href, label, description }: { href: string; label: string; description: string }) {
  return <Link href={href} className="interactive-row focus-ring flex min-h-16 items-center gap-3 rounded-lg py-3"><UsersRound size={20} strokeWidth={1.7} aria-hidden className="shrink-0 text-[color:var(--brand)]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-[21px]">{label}</span><span className="mt-0.5 block text-xs leading-[18px] text-[color:var(--text3)]">{description}</span></span><ChevronRight aria-hidden size={20} strokeWidth={1.7} className="shrink-0 text-[color:var(--text3)]" /></Link>
}
