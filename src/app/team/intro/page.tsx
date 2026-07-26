'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { PositionType } from '@/types/database'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { overallRating } from '@/components/AbilityHexagon'

const POS_COLOR: Record<PositionType, string> = {
  GK: '#f5a623', DF: '#3b82f6', MF: '#2dd4bf', FW: '#ef4444',
}
const POS_TEXT: Record<PositionType, string> = {
  GK: '#3a2600', DF: '#fff', MF: '#06231d', FW: '#fff',
}

export default function TeamIntroPage() {
  const router = useRouter()
  const data = useAppData()
  const { t } = useI18n()

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam])

  if (data.loading) return <PlayersListSkeleton />

  const players = data.players as any[]
  const teamName = data.selectedTeam?.name || ''

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center gap-3">
          <Link href="/team/players" className="p-2 -ml-2 rounded-xl" style={{ color: 'var(--muted2)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-[20px] text-[color:var(--text)]">{t.teamIntro}</h1>
            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{teamName} · {t.playersN.replace('{n}', String(players.length))}</p>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
        <div className="max-w-4xl mx-auto px-5 py-4">
          {players.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <p className="text-[14px]" style={{ color: 'var(--muted2)' }}>{t.noPlayers}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {players.map(p => {
                const color = POS_COLOR[p.default_position as PositionType]
                const textColor = POS_TEXT[p.default_position as PositionType]
                return (
                  <Link key={p.id} href={`/team/players/${p.id}`}
                    className="rounded-[16px] p-4 active:opacity-80 transition"
                    style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center font-black text-[15px] flex-shrink-0"
                        style={{ background: color, color: textColor }}>
                        {p.photo_url
                          ? <img src={p.photo_url} alt={p.name} className="w-full h-full object-cover" />
                          : (p.number ?? '–')}
                      </div>
                      {p.attributes && (
                        <div className="flex flex-col items-center px-2 py-1 rounded-lg flex-shrink-0" style={{ background: 'var(--chip)' }}>
                          <span className="font-display text-[17px] leading-none" style={{ color: 'var(--text)' }}>{overallRating(p.attributes)}</span>
                          <span className="text-[8px] font-bold uppercase" style={{ color: 'var(--muted2)' }}>{t.overall}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[15px] text-[color:var(--text)] truncate">{p.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: color, color: textColor }}>
                            {p.default_position}
                          </span>
                          {(p.preferred_positions ?? []).slice(0, 3).map((pos: string, i: number) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--chip)', color: 'var(--chipText)' }}>{pos}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {p.bio ? (
                      <p className="text-[12px] mt-2.5 leading-relaxed line-clamp-2" style={{ color: 'var(--muted2)' }}>{p.bio}</p>
                    ) : (
                      <p className="text-[12px] mt-2.5 italic" style={{ color: 'var(--text-faint)' }}>{t.noBio}</p>
                    )}
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </PullToRefresh>

      <BottomNav />
    </div>
  )
}
