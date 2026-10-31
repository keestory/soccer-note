'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { PlayerCard } from '@/components/players/PlayerCard'
import { getPlayerCardStats } from '@/lib/player-card'

export default function TeamIntroPage() {
  const router = useRouter()
  const data = useAppData()
  const { t } = useI18n()

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam, router])

  if (data.loading) return <PlayersListSkeleton />

  const players = data.players
  const teamName = data.selectedTeam?.name || ''

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center gap-3">
          <Link href="/team/players" aria-label={t.playersLabel} className="focus-ring flex min-h-11 min-w-11 items-center justify-center -ml-2 rounded-xl" style={{ color: 'var(--muted2)' }}>
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="font-black text-[20px] text-[color:var(--text)]">{t.teamIntro}</h1>
            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{teamName} · {t.playersN.replace('{n}', String(players.length))}</p>
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
        <div className="max-w-4xl mx-auto px-4 py-4">
          {players.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <p className="text-[14px]" style={{ color: 'var(--muted2)' }}>{t.noPlayers}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {data.players.map(player => <Link key={player.id} href={`/team/players/${player.id}`} className="focus-ring block rounded-xl active:opacity-80"><PlayerCard player={player} stats={getPlayerCardStats(player.id, data.matches)} /></Link>)}
            </div>
          )}
        </div>
      </PullToRefresh>

      <BottomNav />
    </div>
  )
}
