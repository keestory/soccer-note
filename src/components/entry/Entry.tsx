'use client'

import Link from 'next/link'
import { ArrowUpRight, Plus, Users } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { getEntryCopy } from '@/lib/entry-copy'
import { getPlayerCardCopy } from '@/lib/player-card-copy'
import { PlayerCard } from '@/components/players/PlayerCard'
import styles from './entry.module.css'

export function EntryBrand({ href = '/' }: { href?: string }) {
  return <Link href={href} className={styles.brand} aria-label="Soccer Note"><span className={styles.brandMark} aria-hidden="true"><span style={{ fontSize: 22 }}>S</span></span>SOCCER NOTE</Link>
}

export function EntryPlayerPreview() {
  const { locale } = useI18n()
  const copy = getEntryCopy(locale)
  return <div className={styles.playerVisual}>
    <PlayerCard player={{ name: copy.player, number: 7, default_position: 'MF', photo_url: null, attributes: null }} stats={{ games: 12, goals: 3, assists: 5, cleanSheets: 2, contribution: 8 }} scope={copy.example} />
  </div>
}

export function EntryRecordsPreview() {
  const { locale, t } = useI18n()
  const copy = getEntryCopy(locale)
  const playerCopy = getPlayerCardCopy(locale)
  return <div className={styles.recordsVisual}>
    <div className={styles.scoreCard}>
      <div className={styles.scoreTop}><span>{copy.matchResult}</span><span className="sn-result" data-result="WIN">{t.win}</span></div>
      <div className={styles.score}><span>{copy.ourTeam}</span><strong>3 : 1</strong><span>{copy.opponent}</span></div>
    </div>
    <div className={styles.metricCard}>
      <p className={styles.metricIdentity}><span>#7</span>{copy.player}<span style={{ marginLeft: 'auto' }}>MF</span></p>
      <dl className={styles.metrics}>{[[playerCopy.games, '12'], [playerCopy.goals, '3'], [playerCopy.assists, '5'], [t.cleanSheet, '2'], [t.contribution, '8']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
    </div>
    <p className={styles.example}>{copy.example}</p>
  </div>
}

export function TeamChoiceContent({ join = false }: { join?: boolean }) {
  const { locale, t } = useI18n()
  const copy = getEntryCopy(locale)
  return <><span className={styles.choiceIcon}>{join ? <Users size={22} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}</span><span><strong>{join ? t.inviteCodeJoin : t.createTeam}</strong><p>{join ? copy.joinTeamDescription : copy.createTeamDescription}</p></span><ArrowUpRight size={18} aria-hidden="true" /></>
}

export function EntryTeamPreview() {
  const { locale, t } = useI18n()
  const copy = getEntryCopy(locale)
  return <div className={styles.recordsVisual}>
    <div className={styles.previewChoice}><span className={styles.choiceIcon}><Plus size={24} aria-hidden="true" /></span><div><strong>{t.createTeam}</strong><p>{copy.createTeamDescription}</p></div></div>
    <div className={styles.previewChoice}><span className={styles.choiceIcon}><Users size={22} aria-hidden="true" /></span><div><strong>{t.inviteCodeJoin}</strong><p>{copy.joinTeamDescription}</p></div></div>
  </div>
}

export function GoogleIcon() {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" /><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" /><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" /><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" /></svg>
}
