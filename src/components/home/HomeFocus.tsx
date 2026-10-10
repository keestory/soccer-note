'use client'

import Link from 'next/link'
import { CalendarDays, ChevronRight, MapPin, Plus } from 'lucide-react'

export interface HomeQuarterScore {
  label: string
  home: number
  away: number
}

export interface HomeMatchSummary {
  id: string
  opponent: string
  score: string
  date: string
  location?: string | null
  result: 'WIN' | 'DRAW' | 'LOSS'
  resultLabel: string
  quarters: HomeQuarterScore[]
}

interface HomeFocusProps {
  seasonLine: string
  latestLabel: string
  opponentLabel: string
  match: HomeMatchSummary | null
  canCreateMatch: boolean
  newMatchLabel: string
  allMatchesLabel: string
  allMatchesDescription: string
  teamOperationsLabel: string
  teamOperationsDescription: string
  noMatchesLabel: string
}

export function HomeFocus({
  seasonLine,
  latestLabel,
  opponentLabel,
  match,
  canCreateMatch,
  newMatchLabel,
  allMatchesLabel,
  allMatchesDescription,
  teamOperationsLabel,
  teamOperationsDescription,
  noMatchesLabel,
}: HomeFocusProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="content-enter flex items-center border-b border-[color:var(--line)] pb-4">
        <p className="text-[13px] font-bold tracking-[-0.01em] text-[color:var(--text2)]">{seasonLine}</p>
      </div>

      {match ? (
        <section aria-labelledby="latest-match-title" className="content-enter overflow-hidden rounded-[22px] bg-[color:var(--navy)] text-white [animation-delay:50ms]">
          <Link href={`/match/${match.id}`} className="focus-ring group block rounded-[22px]">
            <div className="flex items-center justify-between gap-3 px-5 pb-1 pt-5">
              <p id="latest-match-title" className="text-[12px] font-black uppercase tracking-[0.16em] text-white/55">{latestLabel}</p>
              <span className="inline-flex min-h-8 items-center rounded-full border border-white/35 px-3 text-[11px] font-black text-white">
                {match.resultLabel}
              </span>
            </div>

            <div className="px-5 pb-5 pt-4">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold text-white/50">{opponentLabel}</p>
                  <p className="mt-1 max-w-[170px] truncate text-[21px] font-black tracking-[-0.04em]">vs {match.opponent}</p>
                </div>
                <span className="score-display text-[clamp(74px,25vw,104px)] leading-[0.72] tracking-[-0.035em] text-white">{match.score}</span>
              </div>

              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[12px] font-bold text-white/65">
                <span className="flex items-center gap-1.5"><CalendarDays aria-hidden="true" size={14} />{match.date}</span>
                {match.location && <span className="flex items-center gap-1.5"><MapPin aria-hidden="true" size={14} />{match.location}</span>}
              </div>
            </div>

            <div className="border-t border-white/20 px-4 py-4">
              <div className="grid grid-cols-4 divide-x divide-white/25">
                {(match.quarters.length ? match.quarters.slice(0, 4) : [
                  { label: '1Q', home: 0, away: 0 }, { label: '2Q', home: 0, away: 0 },
                  { label: '3Q', home: 0, away: 0 }, { label: '4Q', home: 0, away: 0 },
                ]).map((quarter) => (
                  <div key={quarter.label} className="flex flex-col items-center justify-center gap-1 px-1">
                    <span className="score-display text-[13px] tracking-wide text-white/55">{quarter.label}</span>
                    <span className="score-display text-[24px] leading-none text-white">{quarter.home}:{quarter.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <div className="surface content-enter p-10 text-center text-[15px] font-bold text-[color:var(--text2)]">
          {noMatchesLabel}
        </div>
      )}

      {canCreateMatch && (
        <Link
          href="/match/new"
          className="focus-ring content-enter flex min-h-14 items-center justify-center gap-3 rounded-[18px] bg-[color:var(--accent)] px-5 text-[16px] font-black text-[color:var(--navy)] transition-opacity active:opacity-70 [animation-delay:100ms]"
        >
          <Plus aria-hidden="true" size={26} strokeWidth={3} />
          {newMatchLabel}
        </Link>
      )}

      <nav className="surface content-enter divide-y divide-[color:var(--line)] overflow-hidden [animation-delay:140ms]">
        <HomeLink href="/matches" label={allMatchesLabel} description={allMatchesDescription} />
        <HomeLink href="/team" label={teamOperationsLabel} description={teamOperationsDescription} />
      </nav>
    </div>
  )
}

function HomeLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="interactive-row focus-ring flex min-h-[78px] items-center gap-4 px-4">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-black tracking-[-0.025em] text-[color:var(--text)]">{label}</span>
        <span className="mt-1 block truncate text-[12px] text-[color:var(--text3)]">{description}</span>
      </span>
      <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-[color:var(--text3)]" />
    </Link>
  )
}
