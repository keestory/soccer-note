'use client'

import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'

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

const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"

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
    <div className="flex flex-col gap-6">
      <p className="text-[18px] font-medium tracking-[-0.02em] text-[color:var(--text3)]">
        {seasonLine}
      </p>

      <div className="h-px bg-[color:var(--line)]" />

      {match ? (
        <section aria-labelledby="latest-match-title">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p id="latest-match-title" className="text-[18px] font-medium text-[color:var(--text3)]">{latestLabel}</p>
              <span
                className="mt-3 inline-flex rounded-xl px-4 py-2 text-[16px] font-black"
                style={{
                  background: match.result === 'WIN' ? 'var(--accent)' : match.result === 'LOSS' ? 'var(--danger)' : 'var(--card2)',
                  color: match.result === 'LOSS' ? '#fff' : 'var(--navy)',
                }}
              >
                {match.result}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[16px] font-semibold text-[color:var(--text)]">{match.date}</p>
              {match.location && <p className="mt-1 text-[14px] text-[color:var(--text3)]">{match.location}</p>}
            </div>
          </div>

          <Link href={`/match/${match.id}`} className="group block rounded-[22px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8f542]/60">
            <div className="flex items-end gap-5 px-2 pb-6 pt-2">
              <span style={{ fontFamily: BEBAS }} className="text-[clamp(76px,24vw,112px)] leading-[0.78] tracking-[-0.03em] text-[color:var(--navy)]">
                {match.score}
              </span>
              <div className="mb-1 border-l border-[color:var(--line)] pl-5">
                <p className="text-[14px] text-[color:var(--text3)]">{opponentLabel}</p>
                <p className="mt-1 text-[22px] font-black tracking-[-0.04em] text-[color:var(--text)]">vs {match.opponent}</p>
              </div>
            </div>

            <div
              className="relative overflow-hidden rounded-[20px] bg-cover bg-center px-4 py-7"
              style={{ backgroundImage: "linear-gradient(90deg, rgba(8,16,31,.93), rgba(8,16,31,.62)), url('/match-stadium-bg.png')" }}
            >
              <div className="relative grid grid-cols-4 divide-x divide-white/25">
                {(match.quarters.length ? match.quarters.slice(0, 4) : [
                  { label: '1Q', home: 0, away: 0 }, { label: '2Q', home: 0, away: 0 },
                  { label: '3Q', home: 0, away: 0 }, { label: '4Q', home: 0, away: 0 },
                ]).map((quarter) => (
                  <div key={quarter.label} className="flex items-baseline justify-center gap-2 px-1">
                    <span style={{ fontFamily: BEBAS }} className="text-[15px] text-white/50">{quarter.label}</span>
                    <span style={{ fontFamily: BEBAS }} className="text-[20px] text-white">{quarter.home}:{quarter.away}</span>
                  </div>
                ))}
              </div>
            </div>
          </Link>
        </section>
      ) : (
        <div className="rounded-[20px] border border-[color:var(--line)] bg-white p-10 text-center text-[15px] text-[color:var(--text3)]">
          {noMatchesLabel}
        </div>
      )}

      {canCreateMatch && (
        <Link
          href="/match/new"
          className="flex min-h-16 items-center justify-center gap-3 rounded-[18px] bg-[color:var(--accent)] px-5 text-[18px] font-black text-[color:var(--navy)] transition-transform active:scale-[0.985] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#101828]/20"
        >
          <Plus aria-hidden="true" size={26} strokeWidth={3} />
          {newMatchLabel}
        </Link>
      )}

      <nav aria-label="Quick links" className="divide-y divide-[color:var(--line)] border-y border-[color:var(--line)]">
        <HomeLink href="/matches" label={allMatchesLabel} description={allMatchesDescription} />
        <HomeLink href="/team" label={teamOperationsLabel} description={teamOperationsDescription} />
      </nav>
    </div>
  )
}

function HomeLink({ href, label, description }: { href: string; label: string; description: string }) {
  return (
    <Link href={href} className="flex min-h-[88px] items-center gap-4 py-5 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#c8f542]/50">
      <span className="min-w-0 flex-1">
        <span className="block text-[18px] font-black tracking-[-0.03em] text-[color:var(--text)]">{label}</span>
        <span className="mt-1 block text-[14px] text-[color:var(--text3)]">{description}</span>
      </span>
      <ChevronRight aria-hidden="true" className="text-[color:var(--text3)]" />
    </Link>
  )
}
