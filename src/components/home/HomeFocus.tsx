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
  canCreateMatch: boolean; newMatchLabel: string; allMatchesLabel: string; allMatchesDescription: string
  teamOperationsLabel: string; teamOperationsDescription: string; noMatchesLabel: string
  upcoming?: HomeUpcomingMatch | null; upcomingLabel?: string
}
export function HomeFocus(props: HomeFocusProps) {
  const { match, upcoming } = props
  return <div className="flex flex-col gap-6">
    <p className="border-b border-[color:var(--line)] pb-4 text-xs text-[color:var(--text3)]">{props.seasonLine}</p>
    {upcoming && <section className="content-enter">
      <p className="sn-kicker mb-3">{props.upcomingLabel}</p>
      <Link href={`/match/${upcoming.id}`} className="focus-ring surface block overflow-hidden">
        <div className="flex items-start justify-between gap-3 p-5">
          <div className="min-w-0"><p className="text-xs text-[color:var(--text3)]">{props.opponentLabel}</p><h2 className="mt-2 break-words text-2xl font-semibold tracking-tight">{upcoming.opponent}</h2></div>
          <ArrowUpRight aria-hidden size={20} className="shrink-0 text-[color:var(--brand)]" />
        </div>
        <div className="flex flex-wrap gap-3 border-t border-[color:var(--line)] bg-[color:var(--chip)] px-5 py-4 text-xs text-[color:var(--brand)]">
          <span className="flex items-center gap-2"><CalendarDays size={14} aria-hidden />{upcoming.date}</span>
          {upcoming.location && <span className="flex items-center gap-2"><MapPin size={14} aria-hidden />{upcoming.location}</span>}
        </div>
      </Link>
    </section>}
    <section className="content-enter" aria-label={props.latestLabel}>
      <div className="mb-3 flex items-center justify-between"><p className="sn-kicker">{props.latestLabel}</p>{match && <span className="rounded-md border border-[color:var(--line)] px-2 py-1 text-[11px] font-medium text-[color:var(--brand)]">{match.resultLabel}</span>}</div>
      {match ? <Link href={`/match/${match.id}`} className="surface focus-ring block overflow-hidden">
        <div className="flex items-center justify-between gap-4 p-5">
          <div className="min-w-0"><p className="text-[11px] text-[color:var(--text3)]">{match.date}</p><h2 className="mt-2 break-words text-lg font-semibold tracking-tight">vs {match.opponent}</h2>{match.location && <p className="mt-2 flex items-center gap-1 text-[11px] text-[color:var(--text3)]"><MapPin size={12} aria-hidden />{match.location}</p>}</div>
          <span className="score-display shrink-0 whitespace-nowrap text-[48px] leading-none">{match.score.replace('-', ' : ')}</span>
        </div>
        {match.quarters.length > 0 && <div className="grid grid-cols-4 border-t border-[color:var(--line)] divide-x divide-[color:var(--line)] py-3">
          {match.quarters.slice(0, 4).map(q => <div key={q.label} className="text-center"><p className="text-[10px] text-[color:var(--text3)]">{q.label}</p><p className="mt-1 text-sm font-medium tabular-nums">{q.home} <span className="text-[color:var(--text3)]">:</span> {q.away}</p></div>)}
        </div>}
      </Link> : <div className="surface p-7 text-center text-sm text-[color:var(--text3)]">{props.noMatchesLabel}</div>}
    </section>
    {props.canCreateMatch && <Link href="/match/new" className="sn-button w-full" data-primary="true"><Plus size={18} strokeWidth={1.7} aria-hidden />{props.newMatchLabel}</Link>}
    <nav className="border-t border-[color:var(--line)] divide-y divide-[color:var(--line)]">
      <HomeLink href="/matches" label={props.allMatchesLabel} description={props.allMatchesDescription} icon="matches" />
      <HomeLink href="/team" label={props.teamOperationsLabel} description={props.teamOperationsDescription} icon="team" />
    </nav>
  </div>
}
function HomeLink({ href, label, description, icon }: { href: string; label: string; description: string; icon: 'matches' | 'team' }) {
  const Icon = icon === 'matches' ? CalendarDays : UsersRound
  return <Link href={href} className="interactive-row focus-ring flex min-h-[76px] items-center gap-3 py-3"><Icon size={20} strokeWidth={1.5} aria-hidden className="shrink-0 text-[color:var(--brand)]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-[11px] leading-relaxed text-[color:var(--text3)]">{description}</span></span><ChevronRight aria-hidden size={16} className="shrink-0 text-[color:var(--text3)]" /></Link>
}
