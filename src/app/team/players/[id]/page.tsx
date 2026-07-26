'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import type { Player, PositionType } from '@/types/database'
import { POSITION_LABELS } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { PlayerDetailSkeleton } from '@/components/Skeleton'
import { BottomNav } from '@/components/BottomNav'
import { AbilityHexagon, overallRating } from '@/components/AbilityHexagon'

interface MatchRecord {
  matchId: string
  opponent: string
  matchDate: string
  goals: number
  assists: number
  cleanSheet: boolean
  rating: number | null
  praise: string | null
  improvement: string | null
  highlight: string | null
}

interface SeasonStats {
  games: number
  goals: number
  assists: number
  cleanSheets: number
  matchAttendance: number
  trainingAttendance: number
}

interface Badge {
  dot: string
  label: string
  desc: string
}

// Badges are derived from goals / assists / clean sheets — no ratings.
function computeBadges(stats: SeasonStats, t: any): Badge[] {
  const badges: Badge[] = []

  if (stats.matchAttendance >= 10)
    badges.push({ dot: '#fb923c', label: t.badgeAttendKing, desc: t.badgeAttendDesc.replace('{n}', String(stats.matchAttendance)) })

  if (stats.goals >= 10)
    badges.push({ dot: '#c8f542', label: t.badgeTopScorer, desc: t.badgeGoalsDesc.replace('{n}', String(stats.goals)) })
  else if (stats.goals >= 5)
    badges.push({ dot: '#22c55e', label: t.badgeStriker, desc: t.badgeGoalsDesc.replace('{n}', String(stats.goals)) })

  if (stats.assists >= 5)
    badges.push({ dot: '#38bdf8', label: t.badgeTeamPlayer, desc: t.badgeAssistsDesc.replace('{n}', String(stats.assists)) })

  if (stats.cleanSheets >= 3)
    badges.push({ dot: '#a78bfa', label: t.badgeWall, desc: t.badgeWallDesc.replace('{n}', String(stats.cleanSheets)) })

  return badges
}

const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"

// MM.DD short date for chart labels
function shortDate(d: string): string {
  const dt = new Date(d)
  const mm = String(dt.getMonth() + 1).padStart(2, '0')
  const dd = String(dt.getDate()).padStart(2, '0')
  return `${mm}.${dd}`
}

// 경기별 공격 포인트 — flex bars, navy=goals gray=assists, 28px per point.
function AttackPointsChart({ records, total }: { records: MatchRecord[]; total: number }) {
  const { t } = useI18n()
  // oldest → newest along the x-axis, cap to the most recent 6 games
  const games = [...records].reverse().slice(-6)

  return (
    <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14 }}>
      <div className="flex justify-between items-center" style={{ marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em' }}>{t.matchAttackPoints}</span>
        <div className="flex items-center" style={{ gap: 10 }}>
          <span className="flex items-center" style={{ gap: 4, fontSize: 10, color: '#98a2b3' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#101828' }} />{t.goal}
          </span>
          <span className="flex items-center" style={{ gap: 4, fontSize: 10, color: '#98a2b3' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#d0d5dd' }} />{t.assistShort}
          </span>
        </div>
      </div>
      <div className="flex items-end" style={{ gap: 22, minHeight: 88, padding: '0 8px', overflowX: 'auto' }}>
        {games.map((g, i) => (
          <div key={i} className="flex flex-col items-center justify-end" style={{ flex: 1, minWidth: 54, gap: 6 }}>
            <div className="flex items-end" style={{ gap: 5 }}>
              <div style={{ width: 22, height: Math.max(g.goals * 28, g.goals > 0 ? 6 : 3), borderRadius: '5px 5px 2px 2px', background: '#101828' }} />
              <div style={{ width: 22, height: Math.max(g.assists * 28, g.assists > 0 ? 6 : 3), borderRadius: '5px 5px 2px 2px', background: '#d0d5dd' }} />
            </div>
            <span style={{ fontSize: 10, color: '#98a2b3', whiteSpace: 'nowrap' }}>{shortDate(g.matchDate)} {g.opponent}</span>
          </div>
        ))}
        <div style={{ width: 1, alignSelf: 'stretch', background: '#eaecf0' }} />
        <div className="flex flex-col items-center justify-end" style={{ gap: 2, paddingBottom: 16 }}>
          <div style={{ fontFamily: BEBAS, fontSize: 28, lineHeight: 1, color: '#101828' }}>{total}</div>
          <span style={{ fontSize: 10, color: '#98a2b3', whiteSpace: 'nowrap' }}>{t.seasonTotal}</span>
        </div>
      </div>
    </div>
  )
}

export default function PlayerStatsPage() {
  const router = useRouter()
  const params = useParams()
  const playerId = params.id as string
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<Player | null>(null)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([])
  const [badges, setBadges] = useState<Badge[]>([])

  const supabase = createClient()

  useEffect(() => { loadPlayerData() }, [playerId])

  const loadPlayerData = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }

    const { data: playerData, error } = await supabase
      .from('players').select('*').eq('id', playerId).single()

    if (error || !playerData) { router.push('/team/players'); return }
    setPlayer(playerData)

    const [{ data: records }, { data: matchAttendance }, { data: trainingAttendance }] = await Promise.all([
      supabase.from('quarter_records').select(`
        *, quarter:quarters(quarter_number, match:matches(id, opponent, match_date, status))
      `).eq('player_id', playerId).order('created_at', { ascending: false }),
      supabase.from('match_attendees').select('match_id').eq('player_id', playerId),
      supabase.from('training_attendees').select('training_id').eq('player_id', playerId),
    ])

    const matchMap = new Map<string, MatchRecord>()
    if (records) {
      for (const record of records) {
        const match = record.quarter?.match
        if (!match || match.status === 'upcoming') continue
        const matchId = match.id
        if (!matchMap.has(matchId)) {
          matchMap.set(matchId, {
            matchId, opponent: match.opponent, matchDate: match.match_date,
            goals: 0, assists: 0, cleanSheet: false, rating: null,
            praise: record.praise_text, improvement: record.improvement_text, highlight: record.highlight_text,
          })
        }
        const mr = matchMap.get(matchId)!
        mr.goals += record.goals || 0
        mr.assists += record.assists || 0
        if (record.clean_sheet) mr.cleanSheet = true
        if (record.rating !== null)
          mr.rating = mr.rating === null ? record.rating : (mr.rating + record.rating) / 2
        if (record.praise_text) mr.praise = record.praise_text
        if (record.improvement_text) mr.improvement = record.improvement_text
        if (record.highlight_text) mr.highlight = record.highlight_text
      }
    }

    const sortedRecords = Array.from(matchMap.values()).sort(
      (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
    )
    setMatchRecords(sortedRecords)

    const totalGoals = sortedRecords.reduce((s, r) => s + r.goals, 0)
    const totalAssists = sortedRecords.reduce((s, r) => s + r.assists, 0)
    const totalCleanSheets = sortedRecords.filter(r => r.cleanSheet).length

    const stats: SeasonStats = {
      games: sortedRecords.length, goals: totalGoals, assists: totalAssists,
      cleanSheets: totalCleanSheets,
      matchAttendance: matchAttendance?.length || 0,
      trainingAttendance: trainingAttendance?.length || 0,
    }
    setSeasonStats(stats)
    setBadges(computeBadges(stats, t))
    setLoading(false)
  }

  if (loading || !player) return <PlayerDetailSkeleton />

  const posLabel = POSITION_LABELS[player.default_position as PositionType]
  const attackPoints = (seasonStats?.goals || 0) + (seasonStats?.assists || 0)
  const maxMatchPoints = matchRecords.reduce((m, r) => Math.max(m, r.goals + r.assists), 0)

  return (
    <div className="light min-h-screen pb-nav" style={{ background: '#f5f6f8', fontFamily: 'var(--font-sans), Gothic A1, system-ui, sans-serif' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#fff', borderBottom: '1px solid #eaecf0' }}>
        <div className="max-w-md mx-auto flex items-center" style={{ gap: 10, padding: '6px 20px 12px' }}>
          <Link href="/team/players" style={{ fontSize: 20, color: '#101828', lineHeight: 1 }}>‹</Link>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#101828' }}>{t.playerSeasonStats}</span>
        </div>
      </header>

      <main className="max-w-md mx-auto flex flex-col" style={{ gap: 13, padding: '13px 20px 20px' }}>

        {/* 1. 히어로 카드 */}
        <section className="flex items-center" style={{ background: '#101828', borderRadius: 20, padding: 20, gap: 14 }}>
          <div className="flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ width: 56, height: 56, borderRadius: 16, background: '#c8f542', color: '#101828', fontFamily: BEBAS, fontSize: 28 }}>
            {player.photo_url
              ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
              : (player.number ?? '-')}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 700, color: '#fff' }}>{player.name}</div>
            <div style={{ fontSize: 12, color: '#98a2b3', marginTop: 3 }}>{player.default_position} · {posLabel}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: BEBAS, fontSize: 34, lineHeight: 0.9, color: '#c8f542' }}>
              {attackPoints}<span style={{ fontSize: 18 }}>P</span>
            </div>
            <div style={{ fontSize: 10, color: '#667085', marginTop: 2 }}>{t.seasonAttackPoints}</div>
          </div>
        </section>

        {/* 2. 업적 뱃지 */}
        {badges.length > 0 && (
          <section style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em', marginBottom: 10 }}>{t.achievementBadges}</div>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {badges.map((b, i) => (
                <div key={i} className="flex items-center" style={{ gap: 8, background: '#f2f4f7', borderRadius: 11, padding: '8px 12px' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: b.dot, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#101828' }}>{b.label}</div>
                    <div style={{ fontSize: 10, color: '#98a2b3' }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. 시즌 스탯 그리드 */}
        {seasonStats && (
          <section style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em', marginBottom: 12 }}>{t.seasonStatsTitle}</div>
            <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
              {[
                { label: t.statAppearances, value: seasonStats.matchAttendance },
                { label: t.goals, value: seasonStats.goals },
                { label: t.assistsLabel, value: seasonStats.assists },
                { label: t.cleanSheet, value: seasonStats.cleanSheets },
                { label: t.statTraining, value: seasonStats.trainingAttendance },
                { label: t.statRecordedMatches, value: seasonStats.games },
              ].map(s => (
                <div key={s.label} style={{ background: '#f2f4f7', borderRadius: 11, padding: 11, textAlign: 'center' }}>
                  <div style={{ fontFamily: BEBAS, fontSize: 24, color: s.value === 0 ? '#d0d5dd' : '#101828' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#98a2b3', marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. 경기별 공격 포인트 차트 */}
        {matchRecords.length > 0 && (
          <AttackPointsChart records={matchRecords} total={attackPoints} />
        )}

        {/* 능력치 (선수 자가 능력 — 경기 평점과 무관) */}
        {player.attributes && (
          <section style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em' }}>{t.abilityCard}</span>
              <div className="flex items-baseline" style={{ gap: 6 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 28, lineHeight: 1, color: '#101828' }}>{overallRating(player.attributes)}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#98a2b3' }}>{t.overall}</span>
              </div>
            </div>
            <div className="flex justify-center">
              <AbilityHexagon attributes={player.attributes} />
            </div>
          </section>
        )}

        {/* 강점 태그 */}
        {player.strength_tags && player.strength_tags.length > 0 && (
          <section style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em', marginBottom: 10 }}>{t.strengths}</div>
            <div className="flex flex-wrap" style={{ gap: 8 }}>
              {player.strength_tags.map((tag, i) => (
                <span key={i} style={{ fontSize: 13, fontWeight: 700, color: '#101828', background: '#f2f4f7', borderRadius: 11, padding: '8px 12px' }}>{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* 멤버 소개 */}
        {(player.bio || player.preferred_positions?.length || player.preferred_numbers) && (
          <section className="flex flex-col" style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14, gap: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em' }}>{t.memberIntro}</div>
            {player.bio && (
              <p style={{ fontSize: 14, lineHeight: 1.6, color: '#475467', whiteSpace: 'pre-wrap' }}>{player.bio}</p>
            )}
            <div className="flex flex-wrap" style={{ gap: 16 }}>
              {player.preferred_positions && player.preferred_positions.length > 0 && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#98a2b3', marginBottom: 6 }}>{t.preferredPositions}</div>
                  <div className="flex flex-wrap" style={{ gap: 6 }}>
                    {player.preferred_positions.map((pos, i) => (
                      <span key={i} style={{ fontSize: 12, fontWeight: 700, color: '#101828', background: '#f2f4f7', borderRadius: 8, padding: '2px 8px' }}>{pos}</span>
                    ))}
                  </div>
                </div>
              )}
              {player.preferred_numbers && (
                <div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#98a2b3', marginBottom: 6 }}>{t.preferredNumbers}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{player.preferred_numbers}</div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 5. 경기 기록 리스트 */}
        <div style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3', letterSpacing: '.1em' }}>{t.matchRecordSection}</div>
        {matchRecords.length === 0 ? (
          <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 40, textAlign: 'center', fontSize: 13, color: '#98a2b3' }}>
            {t.noMatchRecord}
          </div>
        ) : (
          matchRecords.map((record) => {
            const p = record.goals + record.assists
            const isTop = p > 0 && p === maxMatchPoints
            return (
              <Link key={record.matchId} href={`/match/${record.matchId}`}
                className="block active:scale-[0.99] transition"
                style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 14 }}>
                <div className="flex justify-between items-start" style={{ marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{t.vs} {record.opponent}</div>
                    <div style={{ fontSize: 11, color: '#98a2b3', marginTop: 2 }}>{formatDate(record.matchDate)}</div>
                  </div>
                  <span style={{
                    fontFamily: BEBAS, fontSize: 15, padding: '4px 10px', borderRadius: 8,
                    color: isTop ? '#101828' : '#475467',
                    background: isTop ? '#c8f542' : '#f2f4f7',
                  }}>{p}P</span>
                </div>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {[
                    { label: t.goal, value: record.goals, active: record.goals > 0 },
                    { label: t.assistShort, value: record.assists, active: record.assists > 0 },
                    { label: t.cleanSheet, value: record.cleanSheet ? '✓' : '-', active: record.cleanSheet },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#98a2b3' }}>{s.label}</div>
                      <div style={{ fontFamily: BEBAS, fontSize: 18, color: s.active ? '#101828' : '#d0d5dd' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {(record.highlight || record.praise || record.improvement) && (
                  <div className="flex flex-col" style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #eaecf0', gap: 4 }}>
                    {record.highlight && <p style={{ fontSize: 12, color: '#b54708', background: '#fef0c7', padding: '4px 8px', borderRadius: 8 }}>⭐ {record.highlight}</p>}
                    {record.praise && <p style={{ fontSize: 12, color: '#475467', background: '#f2f4f7', padding: '4px 8px', borderRadius: 8 }}>👍 {record.praise}</p>}
                    {record.improvement && <p style={{ fontSize: 12, color: '#667085', background: '#f2f4f7', padding: '4px 8px', borderRadius: 8 }}>💡 {record.improvement}</p>}
                  </div>
                )}
              </Link>
            )
          })
        )}
      </main>
      <BottomNav />
    </div>
  )
}
