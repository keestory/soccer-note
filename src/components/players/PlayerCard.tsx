'use client'

import { useId, useState } from 'react'
import type { Player } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'
import { getPlayerAge, type PlayerCardStats } from '@/lib/player-card'
import { getPlayerCardCopy } from '@/lib/player-card-copy'

type CardPlayer = Pick<Player, 'name' | 'number' | 'default_position' | 'photo_url' | 'attributes'>

export function PlayerPortrait({ player, compact = false }: { player: CardPlayer; compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  return <div className={`player-card-portrait${compact ? ' is-compact' : ''}`}>
    {player.photo_url && failedUrl !== player.photo_url
      ? <img src={player.photo_url} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(player.photo_url!)} />
      : <svg viewBox="0 0 160 180" aria-hidden="true" className="player-card-silhouette"><circle cx="80" cy="52" r="29" /><path d="M25 172v-38c0-34 23-51 55-51s55 17 55 51v38Z" /></svg>}
  </div>
}

export function PlayerCard({ player, stats, scope, large = false }: { player: CardPlayer; stats: PlayerCardStats; scope?: string; large?: boolean }) {
  const { locale } = useI18n()
  const copy = getPlayerCardCopy(locale)
  const age = getPlayerAge(player)
  const id = useId().replace(/:/g, '')
  return <article className={`player-card${large ? ' player-card-large' : ''}`} aria-label={player.name}>
    <svg className="player-card-frame" viewBox="0 0 300 440" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id={`card-${id}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="var(--card2)" /><stop offset="1" stopColor="var(--nav)" /></linearGradient></defs>
      <path d="M150 4 190 22 286 34 296 46 296 388Q296 401 282 406L150 436 18 406Q4 401 4 388L4 46 14 34 110 22Z" fill={`url(#card-${id})`} stroke="var(--brand)" strokeWidth="2" />
      <path d="M150 12 188 30 281 42 288 49 288 386Q288 394 279 398L150 428 21 398Q12 394 12 386L12 49 19 42 112 30Z" fill="none" stroke="var(--brand)" strokeOpacity=".22" />
    </svg>
    <div className="player-card-content">
      <div className="player-card-topline"><span className="player-card-number"><small>#</small>{player.number ?? '—'}</span><span className="player-card-position">{player.default_position}</span></div>
      <PlayerPortrait player={player} />
      <div className="player-card-identity"><h2>{player.name}</h2>{age !== null && <p>{copy.ageFormat.replace('{n}', String(age))}</p>}</div>
      <dl className="player-card-stats">{([{ key: 'games', label: copy.games }, { key: 'goals', label: copy.goals }, { key: 'assists', label: copy.assists }] as const).map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{stats[key]}</dd></div>)}</dl>
      <p className="player-card-scope">{scope ?? copy.allTime}</p>
    </div>
  </article>
}
