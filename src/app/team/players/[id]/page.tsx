'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Star, Trophy, Target, Shield, TrendingUp, Calendar, Dumbbell } from 'lucide-react'
import type { Player, Match, PositionType } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import { formatDate } from '@/lib/utils'
import { useI18n } from '@/lib/i18n/context'
import { PlayerDetailSkeleton } from '@/components/Skeleton'

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

export default function PlayerStatsPage() {
  const router = useRouter()
  const params = useParams()
  const playerId = params.id as string
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [player, setPlayer] = useState<Player | null>(null)
  const [seasonStats, setSeasonStats] = useState<SeasonStats | null>(null)
  const [matchRecords, setMatchRecords] = useState<MatchRecord[]>([])

  const supabase = createClient()

  useEffect(() => {
    loadPlayerData()
  }, [playerId])

  const loadPlayerData = async () => {
    const user = await getSessionUser(supabase)
    if (!user) {
      router.push('/login')
      return
    }

    // Load player
    const { data: playerData, error } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (error || !playerData) {
      router.push('/team/players')
      return
    }

    setPlayer(playerData)

    // Load all quarter_records for this player with match info
    const { data: records } = await supabase
      .from('quarter_records')
      .select(`
        *,
        quarter:quarters (
          quarter_number,
          match:matches (
            id,
            opponent,
            match_date,
            status
          )
        )
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })

    // Load match attendance
    const { data: matchAttendance } = await supabase
      .from('match_attendees')
      .select('match_id')
      .eq('player_id', playerId)

    // Load training attendance
    const { data: trainingAttendance } = await supabase
      .from('training_attendees')
      .select('training_id')
      .eq('player_id', playerId)

    // Aggregate records per match
    const matchMap = new Map<string, MatchRecord>()

    if (records) {
      for (const record of records) {
        const match = record.quarter?.match
        if (!match || match.status === 'upcoming') continue

        const matchId = match.id
        if (!matchMap.has(matchId)) {
          matchMap.set(matchId, {
            matchId,
            opponent: match.opponent,
            matchDate: match.match_date,
            goals: 0,
            assists: 0,
            cleanSheet: false,
            rating: null,
            contribution: 0,
            praise: record.praise_text,
            improvement: record.improvement_text,
            highlight: record.highlight_text,
          })
        }

        const mr = matchMap.get(matchId)!
        mr.goals += record.goals || 0
        mr.assists += record.assists || 0
        if (record.clean_sheet) mr.cleanSheet = true
        if (record.contribution) mr.contribution = Math.max(mr.contribution, record.contribution)
        if (record.rating !== null) {
          mr.rating = mr.rating === null
            ? record.rating
            : (mr.rating + record.rating) / 2
        }
        if (record.praise_text) mr.praise = record.praise_text
        if (record.improvement_text) mr.improvement = record.improvement_text
        if (record.highlight_text) mr.highlight = record.highlight_text
      }
    }

    const sortedRecords = Array.from(matchMap.values()).sort(
      (a, b) => new Date(b.matchDate).getTime() - new Date(a.matchDate).getTime()
    )

    setMatchRecords(sortedRecords)

    // Compute season stats
    const totalGoals = sortedRecords.reduce((s, r) => s + r.goals, 0)
    const totalAssists = sortedRecords.reduce((s, r) => s + r.assists, 0)
    const totalCleanSheets = sortedRecords.filter(r => r.cleanSheet).length
    const ratingsWithValue = sortedRecords.filter(r => r.rating !== null)
    const avgRating = ratingsWithValue.length > 0
      ? ratingsWithValue.reduce((s, r) => s + (r.rating || 0), 0) / ratingsWithValue.length
      : null

    setSeasonStats({
      games: sortedRecords.length,
      goals: totalGoals,
      assists: totalAssists,
      cleanSheets: totalCleanSheets,
      avgRating,
      matchAttendance: matchAttendance?.length || 0,
      trainingAttendance: trainingAttendance?.length || 0,
    })

    setLoading(false)
  }

  if (loading || !player) {
    return <PlayerDetailSkeleton />
  }

  const posColor = POSITION_COLORS[player.default_position as PositionType]
  const posLabel = POSITION_LABELS[player.default_position as PositionType]

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-20">
      {/* Header */}
      <header className="bg-[#0f2d0f] sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/team/players" className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-white">{t.playerSeasonStats}</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Player Profile */}
        <section className="bg-white rounded-xl p-6 flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: posColor }}
          >
            {player.number || '-'}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{player.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="text-xs font-semibold px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: posColor }}
              >
                {posLabel}
              </span>
              {player.number && (
                <span className="text-sm text-gray-500">#{player.number}</span>
              )}
            </div>
          </div>
        </section>

        {/* Season Summary Stats */}
        {seasonStats && (
          <section className="bg-white rounded-xl p-4">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              {t.seasonSummary}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-gray-50 rounded-xl">
                <p className="text-2xl font-bold text-gray-900">{seasonStats.matchAttendance}</p>
                <p className="text-xs text-gray-500 mt-1">{t.rankAttendance}</p>
              </div>
              <div className="text-center p-3 bg-primary-50 rounded-xl">
                <p className="text-2xl font-bold text-primary-600">{seasonStats.goals}</p>
                <p className="text-xs text-gray-500 mt-1">{t.rankGoals}</p>
              </div>
              <div className="text-center p-3 bg-primary-50 rounded-xl">
                <p className="text-2xl font-bold text-primary-600">{seasonStats.assists}</p>
                <p className="text-xs text-gray-500 mt-1">{t.rankAssists}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-xl">
                <p className="text-2xl font-bold text-purple-600">{seasonStats.cleanSheets}</p>
                <p className="text-xs text-gray-500 mt-1">{t.rankCleanSheets}</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-xl">
                <p className="text-2xl font-bold text-amber-600">
                  {seasonStats.avgRating !== null ? seasonStats.avgRating.toFixed(1) : '-'}
                </p>
                <p className="text-xs text-gray-500 mt-1">{t.rankRating}</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-xl">
                <p className="text-2xl font-bold text-green-600">{seasonStats.trainingAttendance}</p>
                <p className="text-xs text-gray-500 mt-1">{t.trainingAttendance}</p>
              </div>
            </div>
          </section>
        )}

        {/* Match History */}
        <section>
          <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            {t.matchHistory}
          </h3>

          {matchRecords.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center">
              <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{t.noMatchRecord}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {matchRecords.map((record) => (
                <Link
                  key={record.matchId}
                  href={`/match/${record.matchId}`}
                  className="block bg-white rounded-xl p-4 hover:shadow-md transition"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{t.vs} {record.opponent}</p>
                      <p className="text-sm text-gray-500">{formatDate(record.matchDate)}</p>
                    </div>
                    {record.rating !== null && (
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                        <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        <span className="font-bold text-amber-700">{record.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{t.goal}</p>
                      <p className={`font-bold text-lg ${record.goals > 0 ? 'text-primary-600' : 'text-gray-300'}`}>
                        {record.goals}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{t.assist}</p>
                      <p className={`font-bold text-lg ${record.assists > 0 ? 'text-primary-600' : 'text-gray-300'}`}>
                        {record.assists}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{t.cleanSheet}</p>
                      <p className={`font-bold text-lg ${record.cleanSheet ? 'text-purple-600' : 'text-gray-300'}`}>
                        {record.cleanSheet ? '✓' : '-'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-0.5">{t.contribution}</p>
                      <p className={`font-bold text-lg ${record.contribution > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                        {record.contribution > 0 ? record.contribution : '-'}
                      </p>
                    </div>
                  </div>

                  {/* Coach feedback */}
                  {(record.praise || record.improvement || record.highlight) && (
                    <div className="mt-3 pt-3 border-t space-y-1">
                      {record.highlight && (
                        <p className="text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
                          ⭐ {record.highlight}
                        </p>
                      )}
                      {record.praise && (
                        <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
                          👍 {record.praise}
                        </p>
                      )}
                      {record.improvement && (
                        <p className="text-xs text-primary-700 bg-primary-50 px-2 py-1 rounded">
                          💡 {record.improvement}
                        </p>
                      )}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
