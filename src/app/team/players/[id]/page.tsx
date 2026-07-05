'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Star, Trophy, Calendar, TrendingUp } from 'lucide-react'
import type { Player, PositionType } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { PlayerDetailSkeleton } from '@/components/Skeleton'
import { BottomNav } from '@/components/BottomNav'

interface MatchRecord {
  matchId: string
  opponent: string
  matchDate: string
  goals: number
  assists: number
  cleanSheet: boolean
  rating: number | null
  contribution: number
  praise: string | null
  improvement: string | null
  highlight: string | null
}

interface SeasonStats {
  games: number
  goals: number
  assists: number
  cleanSheets: number
  avgRating: number | null
  matchAttendance: number
  trainingAttendance: number
}

interface Badge {
  emoji: string
  label: string
  desc: string
  color: string
}

function computeBadges(stats: SeasonStats, records: MatchRecord[]): Badge[] {
  const badges: Badge[] = []

  if (stats.matchAttendance >= 10)
    badges.push({ emoji: '🔥', label: '출석왕', desc: `${stats.matchAttendance}경기 출전`, color: 'bg-orange-50 text-orange-700 border-orange-200' })

  if (stats.goals >= 10)
    badges.push({ emoji: '⚽', label: '득점왕', desc: `${stats.goals}골`, color: 'bg-lime-50 text-[#0f2d0f] border-lime-300' })
  else if (stats.goals >= 5)
    badges.push({ emoji: '🎯', label: '공격수', desc: `${stats.goals}골`, color: 'bg-green-50 text-green-700 border-green-200' })

  if (stats.assists >= 5)
    badges.push({ emoji: '🤝', label: '팀플레이어', desc: `${stats.assists}어시스트`, color: 'bg-blue-50 text-blue-700 border-blue-200' })

  if (stats.avgRating !== null && stats.avgRating >= 4.0)
    badges.push({ emoji: '⭐', label: '에이스', desc: `평균 ${stats.avgRating.toFixed(1)}점`, color: 'bg-amber-50 text-amber-700 border-amber-200' })

  if (stats.cleanSheets >= 3)
    badges.push({ emoji: '🧤', label: '철벽', desc: `클린시트 ${stats.cleanSheets}회`, color: 'bg-purple-50 text-purple-700 border-purple-200' })

  // 3경기 연속 4.5+ 평점
  let streak = 0
  for (const r of records) {
    if (r.rating !== null && r.rating >= 4.5) { streak++; if (streak >= 3) break }
    else streak = 0
  }
  if (streak >= 3)
    badges.push({ emoji: '💪', label: '무결점', desc: '3연속 4.5+ 평점', color: 'bg-rose-50 text-rose-700 border-rose-200' })

  return badges
}

// SVG 라인차트 (인라인, 외부 의존 없음)
function RatingSparkline({ records }: { records: MatchRecord[] }) {
  const ratedRecords = [...records].reverse().filter(r => r.rating !== null)
  if (ratedRecords.length < 2) return (
    <div className="flex items-center justify-center h-20 text-xs text-gray-400">경기 기록이 쌓이면 그래프가 표시됩니다</div>
  )

  const W = 300, H = 80, PAD = 12
  const vals = ratedRecords.map(r => r.rating!)
  const minV = Math.min(...vals, 1)
  const maxV = Math.max(...vals, 5)
  const range = maxV - minV || 1

  const pts = vals.map((v, i) => {
    const x = PAD + (i / (vals.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((v - minV) / range) * (H - PAD * 2)
    return { x, y, v, rec: ratedRecords[i] }
  })

  const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const areaD = `${pathD} L ${pts[pts.length - 1].x} ${H - PAD} L ${PAD} ${H - PAD} Z`

  const last = pts[pts.length - 1]
  const trend = vals.length >= 2 ? vals[vals.length - 1] - vals[vals.length - 2] : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">평점 추이</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
          trend > 0 ? 'bg-green-100 text-green-700' : trend < 0 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'
        }`}>
          {trend > 0 ? `▲ +${trend.toFixed(1)}` : trend < 0 ? `▼ ${trend.toFixed(1)}` : '→ 유지'}
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 80 }}>
        <defs>
          <linearGradient id="ratingGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3e635" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#a3e635" stopOpacity="0.0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill="url(#ratingGrad)" />
        <path d={pathD} fill="none" stroke="#0f2d0f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3}
            fill={i === pts.length - 1 ? '#0f2d0f' : '#a3e635'}
            stroke="white" strokeWidth="1.5"
          />
        ))}
        {/* 마지막 값 라벨 */}
        <text x={last.x} y={last.y - 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#0f2d0f">
          {last.v.toFixed(1)}
        </text>
      </svg>
      <div className="flex justify-between text-[10px] text-gray-400 mt-1 px-1">
        <span>{formatDate(ratedRecords[0].matchDate)}</span>
        <span>{formatDate(ratedRecords[ratedRecords.length - 1].matchDate)}</span>
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
            goals: 0, assists: 0, cleanSheet: false, rating: null, contribution: 0,
            praise: record.praise_text, improvement: record.improvement_text, highlight: record.highlight_text,
          })
        }
        const mr = matchMap.get(matchId)!
        mr.goals += record.goals || 0
        mr.assists += record.assists || 0
        if (record.clean_sheet) mr.cleanSheet = true
        if (record.contribution) mr.contribution = Math.max(mr.contribution, record.contribution)
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
    const ratingsWithValue = sortedRecords.filter(r => r.rating !== null)
    const avgRating = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((s, r) => s + (r.rating || 0), 0) / ratingsWithValue.length
      : null

    const stats: SeasonStats = {
      games: sortedRecords.length, goals: totalGoals, assists: totalAssists,
      cleanSheets: totalCleanSheets, avgRating,
      matchAttendance: matchAttendance?.length || 0,
      trainingAttendance: trainingAttendance?.length || 0,
    }
    setSeasonStats(stats)
    setBadges(computeBadges(stats, sortedRecords))
    setLoading(false)
  }

  if (loading || !player) return <PlayerDetailSkeleton />

  const posColor = POSITION_COLORS[player.default_position as PositionType]
  const posLabel = POSITION_LABELS[player.default_position as PositionType]

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-20">
      <header className="bg-[#0f2d0f] sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/team/players" className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-white">{t.playerSeasonStats}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">

        {/* 선수 프로필 */}
        <section className="bg-white rounded-2xl p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-black flex-shrink-0"
            style={{ backgroundColor: posColor }}>
            {player.number || '-'}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-black text-gray-900">{player.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: posColor }}>
                {posLabel}
              </span>
              {player.number && <span className="text-sm text-gray-400">#{player.number}</span>}
            </div>
          </div>
          {seasonStats?.avgRating !== null && seasonStats?.avgRating !== undefined && (
            <div className="flex flex-col items-center bg-amber-50 rounded-2xl px-4 py-3">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400 mb-0.5" />
              <span className="text-xl font-black text-amber-700">{seasonStats.avgRating.toFixed(1)}</span>
              <span className="text-[10px] text-amber-500">평균 평점</span>
            </div>
          )}
        </section>

        {/* 뱃지 */}
        {badges.length > 0 && (
          <section className="bg-white rounded-2xl p-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">업적 뱃지</p>
            <div className="flex flex-wrap gap-2">
              {badges.map((b, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${b.color}`}>
                  <span>{b.emoji}</span>
                  <div>
                    <div className="font-black">{b.label}</div>
                    <div className="text-[10px] opacity-70">{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 시즌 스탯 */}
        {seasonStats && (
          <section className="bg-white rounded-2xl p-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">시즌 스탯</p>
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: '출전', value: seasonStats.matchAttendance, color: 'text-[#0f2d0f]', bg: 'bg-[#0f2d0f]/[0.06]' },
                { label: '골', value: seasonStats.goals, color: 'text-lime-700', bg: 'bg-lime-50' },
                { label: '어시스트', value: seasonStats.assists, color: 'text-blue-700', bg: 'bg-blue-50' },
                { label: '클린시트', value: seasonStats.cleanSheets, color: 'text-purple-700', bg: 'bg-purple-50' },
                { label: '훈련', value: seasonStats.trainingAttendance, color: 'text-orange-700', bg: 'bg-orange-50' },
                { label: '기록 경기', value: seasonStats.games, color: 'text-gray-600', bg: 'bg-gray-50' },
              ].map(s => (
                <div key={s.label} className={`${s.bg} rounded-xl p-3 text-center`}>
                  <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
                  <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 성장 그래프 */}
        {matchRecords.length >= 2 && (
          <section className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-[#0f2d0f]" />
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">성장 그래프</p>
            </div>
            <RatingSparkline records={matchRecords} />
          </section>
        )}

        {/* 경기 기록 */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-[#0f2d0f]" />
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">{t.matchHistory}</p>
          </div>

          {matchRecords.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center">
              <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400 text-sm">{t.noMatchRecord}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {matchRecords.map((record) => (
                <Link key={record.matchId} href={`/match/${record.matchId}`}
                  className="block bg-white rounded-2xl p-4 active:scale-[0.99] transition">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-black text-gray-900">{t.vs} {record.opponent}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatDate(record.matchDate)}</p>
                    </div>
                    {record.rating !== null && (
                      <div className="flex items-center gap-1 bg-amber-50 px-2.5 py-1.5 rounded-xl">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="font-black text-sm text-amber-700">{record.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { label: t.goal, value: record.goals, active: record.goals > 0, color: 'text-[#0f2d0f]' },
                      { label: t.assist, value: record.assists, active: record.assists > 0, color: 'text-blue-600' },
                      { label: t.cleanSheet, value: record.cleanSheet ? '✓' : '-', active: record.cleanSheet, color: 'text-purple-600' },
                      { label: t.contribution, value: record.contribution > 0 ? record.contribution : '-', active: record.contribution > 0, color: 'text-green-600' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <p className="text-[10px] text-gray-400 mb-0.5">{s.label}</p>
                        <p className={`font-black text-lg ${s.active ? s.color : 'text-gray-200'}`}>{s.value}</p>
                      </div>
                    ))}
                  </div>

                  {(record.highlight || record.praise || record.improvement) && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {record.highlight && <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">⭐ {record.highlight}</p>}
                      {record.praise && <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">👍 {record.praise}</p>}
                      {record.improvement && <p className="text-xs text-[#0f2d0f] bg-[#0f2d0f]/[0.06] px-2 py-1 rounded-lg">💡 {record.improvement}</p>}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <BottomNav />
    </div>
  )
}
