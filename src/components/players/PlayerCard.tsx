'use client'

import { useId, useState } from 'react'
import type { Player } from '@/types/database'
import { useI18n } from '@/lib/i18n/context'
import { getPlayerAge, type PlayerCardStats } from '@/lib/player-card'
import { getPlayerCardCopy } from '@/lib/player-card-copy'

type CardPlayer = Pick<Player, 'name' | 'number' | 'default_position' | 'photo_url' | 'attributes'>

export function PlayerPortrait({ player, compact = false }: { player: CardPlayer; compact?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const photoUrl = player.photo_url && failedUrl !== player.photo_url ? player.photo_url : undefined
  return <div className={`player-card-portrait${compact ? ' is-compact' : ''}${photoUrl ? ' has-photo' : ''}`}>
    {photoUrl
      ? <img src={photoUrl} alt="" loading="lazy" decoding="async" onError={() => setFailedUrl(photoUrl)} />
      : <svg viewBox="0 0 160 180" aria-hidden="true" className="player-card-silhouette"><circle cx="80" cy="52" r="29" /><path d="M25 172v-38c0-34 23-51 55-51s55 17 55 51v38Z" /></svg>}
  </div>
}

export function PlayerCard({ player, stats, scope, large = false }: { player: CardPlayer; stats: PlayerCardStats; scope?: string; large?: boolean }) {
  const { locale, t } = useI18n()
  const copy = getPlayerCardCopy(locale)
  const age = getPlayerAge(player)
  const id = useId().replace(/:/g, '')
  return <article className={`player-card${large ? ' player-card-large' : ''}`} aria-label={player.name}>
    <div className="player-card-frame" aria-hidden="true">
      <svg className="player-card-frame-top" viewBox="0 0 300 54" preserveAspectRatio="none">
        <path d="M4 54V46L14 34 110 22 150 4 190 22 286 34 296 46V54Z" fill="var(--card2)" />
        <path d="M4 54V46L14 34 110 22 150 4 190 22 286 34 296 46V54" fill="none" stroke="var(--brand)" strokeWidth="2" />
        <path d="M12 54V49L19 42 112 30 150 12 188 30 281 42 288 49V54" fill="none" stroke="var(--brand)" strokeOpacity=".22" />
      </svg>
      <svg className="player-card-frame-body" viewBox="0 0 300 1" preserveAspectRatio="none">
        <defs><linearGradient id={`card-${id}`} x1="0" y1="0" x2="0" y2="1"><stop stopColor="var(--card2)" /><stop offset="1" stopColor="var(--nav)" /></linearGradient></defs>
        <path d="M4 0H296V1H4Z" fill={`url(#card-${id})`} />
        <path d="M4 0V1M296 0V1" fill="none" stroke="var(--brand)" strokeWidth="2" />
        <path d="M12 0V1M288 0V1" fill="none" stroke="var(--brand)" strokeOpacity=".22" />
      </svg>
      <svg className="player-card-frame-bottom" viewBox="0 0 300 52" preserveAspectRatio="none">
        <path d="M4 0Q4 13 18 18L150 48 282 18Q296 13 296 0Z" fill="var(--nav)" />
        <path d="M4 0Q4 13 18 18L150 48 282 18Q296 13 296 0" fill="none" stroke="var(--brand)" strokeWidth="2" />
        <path d="M12 0Q12 6 21 10L150 40 279 10Q288 6 288 0" fill="none" stroke="var(--brand)" strokeOpacity=".22" />
      </svg>
    </div>
    <div className="player-card-content">
      <div className="player-card-topline"><span className="player-card-number"><small>#</small>{player.number ?? '—'}</span><span className="player-card-position">{player.default_position}</span></div>
      <PlayerPortrait player={player} />
      <div className="player-card-identity"><h2>{player.name}</h2>{age !== null && <p>{copy.ageFormat.replace('{n}', String(age))}</p>}</div>
      <dl className="player-card-stats">{([{ key: 'games', label: copy.games }, { key: 'goals', label: copy.goals }, { key: 'assists', label: copy.assists }, { key: 'cleanSheets', label: t.cleanSheet }, { key: 'contribution', label: t.contribution }] as const).map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{stats[key]}</dd></div>)}</dl>
      <p className="player-card-scope">{scope ?? copy.allTime}</p>
    </div>
  </article>
}
