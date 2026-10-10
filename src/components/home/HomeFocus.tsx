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
  noUpcomingLabel: string; emptyDescription: string
  upcoming?: HomeUpcomingMatch | null; upcomingLabel?: string
}
export function HomeFocus(props: HomeFocusProps) {
  const { match, upcoming } = props
  const wideScore = match?.score.split('-').some(score => score.trim().length > 1)
  return <div className="flex min-w-0 flex-col gap-6">
    {!upcoming ? <div className="content-enter flex min-w-0 items-start gap-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--chip)] text-[color:var(--brand)]"><CalendarDays size={17} strokeWidth={1.7} aria-hidden /></span>
      <div className="min-w-0"><p className="sn-home-status">{props.noUpcomingLabel}</p>{match && <p className="mt-1 text-xs leading-[18px] text-[color:var(--text3)]">{props.seasonLine}</p>}</div>
    </div> : match && <p className="text-xs leading-[18px] text-[color:var(--text3)]">{props.seasonLine}</p>}
    {upcoming && <section className="content-enter min-w-0">
      <h2 className="sn-home-section-title mb-3">{props.upcomingLabel}</h2>
      <Link href={`/match/${upcoming.id}`} className="focus-ring sn-home-upcoming block">
        <div className="flex items-start justify-between gap-3">
          <span className="sn-home-upcoming-date flex min-w-0 items-start gap-2"><CalendarDays size={17} strokeWidth={1.7} aria-hidden className="mt-0.5 shrink-0" /><span className="[overflow-wrap:anywhere]">{upcoming.date}</span></span>
          <ArrowUpRight aria-hidden size={20} strokeWidth={1.7} className="shrink-0 text-[color:var(--brand)]" />
        </div>
        <p className="mt-5 text-xs leading-[18px] text-[color:var(--text3)]">{props.opponentLabel}</p>
        <h3 className="sn-home-upcoming-opponent mt-1">{upcoming.opponent}</h3>
        {upcoming.location && <p className="sn-home-upcoming-meta mt-3 flex min-w-0 items-start gap-2"><MapPin size={16} strokeWidth={1.7} aria-hidden className="mt-px shrink-0" /><span className="[overflow-wrap:anywhere]">{upcoming.location}</span></p>}
      </Link>
    </section>}
    <section className="content-enter min-w-0" aria-label={props.latestLabel}>
      <div className="mb-2 flex min-h-11 items-center justify-between gap-3"><h2 className="sn-home-section-title">{props.latestLabel}</h2><Link href="/matches" className="focus-ring -mr-2 flex min-h-11 shrink-0 items-center gap-1 rounded-lg px-2 text-[13px] font-medium leading-5 text-[color:var(--brand)]">{props.allMatchesLabel}<ChevronRight size={16} strokeWidth={1.7} aria-hidden /></Link></div>
      {match ? <Link href={`/match/${match.id}`} className="surface focus-ring sn-match-card block" data-secondary={upcoming ? true : undefined}>
        <div className="sn-match-summary" data-wide-score={wideScore || undefined}>
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-2"><p className="text-xs leading-[18px] text-[color:var(--text3)]">{match.date}</p><span className="sn-result" data-result={match.result}>{match.resultLabel}</span></div><h3 className="sn-opponent mt-2"><span className="mr-1.5 text-xs font-medium text-[color:var(--text3)]">{props.opponentLabel}</span>{match.opponent}</h3>{match.location && <p className="mt-2 flex items-start gap-1.5 text-xs leading-[18px] text-[color:var(--text3)]"><MapPin size={16} strokeWidth={1.7} aria-hidden className="mt-px shrink-0" /><span className="[overflow-wrap:anywhere]">{match.location}</span></p>}</div>
          <span className="score-display sn-match-score">{match.score.replace('-', ' : ')}</span>
        </div>
        {match.quarters.length > 0 && <div className="grid grid-cols-4 border-t border-[color:var(--line)] py-3">
          {match.quarters.slice(0, 4).map(q => <div key={q.label} className="min-w-0 px-1 text-center"><p className="text-xs leading-[18px] text-[color:var(--text3)]">{q.label}</p><p className="mt-1 text-sm font-medium leading-[21px] tabular-nums">{q.home} <span className="text-[color:var(--text3)]">:</span> {q.away}</p></div>)}
        </div>}
      </Link> : <div className="surface p-7 text-center"><p className="text-base font-semibold leading-6">{props.noMatchesLabel}</p><p className="mt-2 text-sm leading-[21px] text-[color:var(--text3)]">{props.emptyDescription}</p></div>}
    </section>
    {props.canCreateMatch && <Link href="/match/new" className="sn-button w-full" data-primary="true"><Plus size={20} strokeWidth={1.7} aria-hidden />{props.newMatchLabel}</Link>}
    <div>
      <HomeLink href="/team" label={props.teamOperationsLabel} description={props.teamOperationsDescription} />
    </div>
  </div>
}
function HomeLink({ href, label, description }: { href: string; label: string; description: string }) {
  return <Link href={href} className="interactive-row focus-ring flex min-h-16 items-center gap-3 rounded-lg py-3"><UsersRound size={20} strokeWidth={1.7} aria-hidden className="shrink-0 text-[color:var(--brand)]" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-[21px]">{label}</span><span className="mt-0.5 block text-xs leading-[18px] text-[color:var(--text3)]">{description}</span></span><ChevronRight aria-hidden size={20} strokeWidth={1.7} className="shrink-0 text-[color:var(--text3)]" /></Link>
}
