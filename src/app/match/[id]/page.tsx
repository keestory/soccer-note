'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Star, Edit2, Trash2 } from 'lucide-react'
import type { Match, Player, Quarter } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import { formatDate, calculateMVP, getPlayerStatsFromMatch, formatRating } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function MatchDetailPage() {
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string

  const [loading, setLoading] = useState(true)
  const [match, setMatch] = useState<Match | null>(null)
  const [activeQuarter, setActiveQuarter] = useState(1)
  const [editingScore, setEditingScore] = useState(false)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)

  const supabase = createClient()

  useEffect(() => {
    loadMatch()
  }, [matchId])

  const loadMatch = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        quarters (
          *,
          quarter_records (
            *,
            player:players (*)
          )
        )
      `)
      .eq('id', matchId)
      .single()

    if (error || !data) {
      toast.error('경기를 불러올 수 없습니다')
      router.push('/dashboard')
      return
    }

    // Sort quarters by quarter_number
    data.quarters = data.quarters?.sort((a: Quarter, b: Quarter) => a.quarter_number - b.quarter_number)

    setMatch(data)
    setHomeScore(data.home_score)
    setAwayScore(data.away_score)
    setLoading(false)
  }

  const handleUpdateScore = async () => {
    const { error } = await supabase
      .from('matches')
      .update({ home_score: homeScore, away_score: awayScore })
      .eq('id', matchId)

    if (error) {
      toast.error('점수 저장에 실패했습니다')
      return
    }

    setMatch(prev => prev ? { ...prev, home_score: homeScore, away_score: awayScore } : null)
    setEditingScore(false)
    toast.success('점수가 저장되었습니다')
  }

  const handleDeleteMatch = async () => {
    if (!confirm('정말 이 경기를 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (error) {
      toast.error('삭제에 실패했습니다')
      return
    }

    toast.success('경기가 삭제되었습니다')
    router.push('/dashboard')
  }

  if (loading || !match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  const mvp = calculateMVP(match)
  const playerStats = getPlayerStatsFromMatch(match)
  const currentQuarter = match.quarters?.find(q => q.quarter_number === activeQuarter)

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-lg font-bold">vs {match.opponent}</h1>
              <p className="text-sm text-gray-500">{formatDate(match.match_date)}</p>
            </div>
          </div>
          <button
            onClick={handleDeleteMatch}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Score Section */}
        <section className="bg-white rounded-xl p-6 text-center">
          {editingScore ? (
            <div className="flex items-center justify-center gap-4 mb-4">
              <input
                type="number"
                min={0}
                value={homeScore}
                onChange={(e) => setHomeScore(parseInt(e.target.value) || 0)}
                className="w-20 text-4xl font-bold text-center border rounded-lg py-2"
              />
              <span className="text-2xl text-gray-400">:</span>
              <input
                type="number"
                min={0}
                value={awayScore}
                onChange={(e) => setAwayScore(parseInt(e.target.value) || 0)}
                className="w-20 text-4xl font-bold text-center border rounded-lg py-2"
              />
            </div>
          ) : (
            <div className="text-4xl font-bold mb-2">
              <span className="text-emerald-600">{match.home_score}</span>
              <span className="text-gray-400 mx-3">:</span>
              <span className="text-gray-700">{match.away_score}</span>
            </div>
          )}
          <div className="flex justify-center gap-4 text-sm text-gray-500 mb-4">
            <span>우리팀</span>
            <span>{match.opponent}</span>
          </div>
          {editingScore ? (
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setEditingScore(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                onClick={handleUpdateScore}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                저장
              </button>
            </div>
          ) : (
            <button
              onClick={() => setEditingScore(true)}
              className="text-emerald-600 text-sm hover:underline"
            >
              점수 수정
            </button>
          )}
        </section>

        {/* MVP Section */}
        {mvp && (
          <section className="bg-gradient-to-r from-amber-100 to-amber-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-400 rounded-full flex items-center justify-center">
              <Star className="w-6 h-6 text-white fill-white" />
            </div>
            <div>
              <p className="text-sm text-amber-700 font-medium">MVP</p>
              <p className="text-lg font-bold text-amber-900">
                {mvp.playerName}
                <span className="font-normal text-amber-700 ml-2">
                  평균 {mvp.averageRating.toFixed(1)}점
                </span>
              </p>
            </div>
          </section>
        )}

        {/* Quarter Tabs */}
        <section>
          <div className="flex gap-2 mb-4">
            {[1, 2, 3, 4].map((q) => (
              <button
                key={q}
                onClick={() => setActiveQuarter(q)}
                className={`flex-1 py-3 rounded-lg font-medium transition ${
                  activeQuarter === q
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {q}쿼터
              </button>
            ))}
          </div>

          {/* Quarter Content */}
          {currentQuarter && (
            <div className="bg-white rounded-xl overflow-hidden">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">{activeQuarter}쿼터 기록</h3>
                <Link
                  href={`/match/${matchId}/quarter/${activeQuarter}`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
                >
                  <Edit2 className="w-4 h-4" />
                  편집
                </Link>
              </div>

              {/* Soccer Field Preview */}
              <div className="p-4">
                <div className="relative w-full aspect-[3/2] bg-field rounded-lg overflow-hidden">
                  {/* Field markings */}
                  <div className="absolute inset-0 border-2 border-white/30" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/30" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border-2 border-white/30" />

                  {/* Players */}
                  {currentQuarter.quarter_records?.map((record) => (
                    <div
                      key={record.id}
                      className="absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                      style={{
                        left: `${record.position_x}%`,
                        top: `${record.position_y}%`,
                        backgroundColor: POSITION_COLORS[record.position_type],
                      }}
                    >
                      {record.player?.number || '?'}
                    </div>
                  ))}

                  {currentQuarter.quarter_records?.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/70">
                      선수를 배치해주세요
                    </div>
                  )}
                </div>
              </div>

              {/* Quarter Players List */}
              <div className="divide-y">
                {currentQuarter.quarter_records?.map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                        style={{ backgroundColor: POSITION_COLORS[record.position_type] }}
                      >
                        {record.player?.number || '?'}
                      </div>
                      <div>
                        <p className="font-medium">{record.player?.name}</p>
                        <p className="text-sm text-gray-500">
                          {POSITION_LABELS[record.position_type]}
                          {record.goals > 0 && ` | ${record.goals}골`}
                          {record.assists > 0 && ` ${record.assists}어시`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold font-mono">
                        {formatRating(record.rating)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Overall Player Stats */}
        {playerStats.length > 0 && (
          <section>
            <h3 className="font-semibold text-gray-900 mb-3">전체 선수 통계</h3>
            <div className="bg-white rounded-xl divide-y">
              {playerStats.map((stats, index) => (
                <div key={stats.playerId} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center text-gray-400 font-medium">
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium flex items-center gap-2">
                        {stats.playerName}
                        {index === 0 && mvp && (
                          <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {stats.totalGoals}골 {stats.totalAssists}어시
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-mono text-emerald-600">
                      {stats.averageRating.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400">평균</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
