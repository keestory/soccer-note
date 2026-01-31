'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Star, Edit2, Trash2, Plus, X, Users, MapPin, Calendar, Check } from 'lucide-react'
import type { Match, Player, Quarter, MatchAttendee } from '@/types/database'
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
  const [editingQuarterScore, setEditingQuarterScore] = useState<number | null>(null)
  const [qHome, setQHome] = useState(0)
  const [qAway, setQAway] = useState(0)
  const [attendees, setAttendees] = useState<MatchAttendee[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [showAttendeePicker, setShowAttendeePicker] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set())
  const [editingMatchInfo, setEditingMatchInfo] = useState(false)
  const [editOpponent, setEditOpponent] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editLocation, setEditLocation] = useState('')

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

    // Load attendees
    const { data: attendeesData } = await supabase
      .from('match_attendees')
      .select('*, player:players(*)')
      .eq('match_id', matchId)

    if (attendeesData) {
      setAttendees(attendeesData)
    }

    // Load all team players for picker
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', data.team_id)
      .order('name')

    if (playersData) {
      setAllPlayers(playersData)
    }

    setLoading(false)
  }

  const getTotalScore = () => {
    if (!match?.quarters) return { home: 0, away: 0 }
    return match.quarters.reduce(
      (acc, q) => ({
        home: acc.home + (q.home_score || 0),
        away: acc.away + (q.away_score || 0),
      }),
      { home: 0, away: 0 }
    )
  }

  const startEditQuarterScore = (quarterNum: number) => {
    const q = match?.quarters?.find(q => q.quarter_number === quarterNum)
    setQHome(q?.home_score || 0)
    setQAway(q?.away_score || 0)
    setEditingQuarterScore(quarterNum)
  }

  const handleSaveQuarterScore = async () => {
    if (editingQuarterScore === null || !match) return
    const q = match.quarters?.find(q => q.quarter_number === editingQuarterScore)
    if (!q) return

    const { error } = await supabase
      .from('quarters')
      .update({ home_score: qHome, away_score: qAway })
      .eq('id', q.id)

    if (error) {
      toast.error('점수 저장에 실패했습니다')
      return
    }

    // Update local state
    setMatch(prev => {
      if (!prev) return prev
      const updatedQuarters = prev.quarters?.map(quarter =>
        quarter.quarter_number === editingQuarterScore
          ? { ...quarter, home_score: qHome, away_score: qAway }
          : quarter
      )
      return { ...prev, quarters: updatedQuarters }
    })

    // Also update match total score
    const newTotal = match.quarters?.reduce(
      (acc, q) => ({
        home: acc.home + (q.quarter_number === editingQuarterScore ? qHome : (q.home_score || 0)),
        away: acc.away + (q.quarter_number === editingQuarterScore ? qAway : (q.away_score || 0)),
      }),
      { home: 0, away: 0 }
    ) || { home: 0, away: 0 }

    await supabase
      .from('matches')
      .update({ home_score: newTotal.home, away_score: newTotal.away })
      .eq('id', matchId)

    setMatch(prev => prev ? { ...prev, home_score: newTotal.home, away_score: newTotal.away } : null)
    setEditingQuarterScore(null)
    toast.success('점수가 저장되었습니다')
  }

  const openAttendeePicker = () => {
    // Pre-select already attending players
    setSelectedAttendees(new Set(attendees.map(a => a.player_id)))
    setShowAttendeePicker(true)
  }

  const toggleAttendee = (playerId: string) => {
    setSelectedAttendees(prev => {
      const newSet = new Set(prev)
      if (newSet.has(playerId)) {
        newSet.delete(playerId)
      } else {
        newSet.add(playerId)
      }
      return newSet
    })
  }

  const saveAttendees = async () => {
    const currentIds = new Set(attendees.map(a => a.player_id))
    const toAdd = Array.from(selectedAttendees).filter(id => !currentIds.has(id))
    const toRemove = attendees.filter(a => !selectedAttendees.has(a.player_id))

    // Add new attendees
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('match_attendees')
        .insert(toAdd.map(player_id => ({ match_id: matchId, player_id })))
      if (error) {
        toast.error('참석 선수 저장에 실패했습니다')
        return
      }
    }

    // Remove deselected attendees
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('match_attendees')
        .delete()
        .in('id', toRemove.map(a => a.id))
      if (error) {
        toast.error('참석 선수 삭제에 실패했습니다')
        return
      }
    }

    // Reload attendees
    const { data } = await supabase
      .from('match_attendees')
      .select('*, player:players(*)')
      .eq('match_id', matchId)

    if (data) setAttendees(data)
    setShowAttendeePicker(false)
    toast.success('참석 선수가 저장되었습니다')
  }

  const startEditMatchInfo = () => {
    if (!match) return
    setEditOpponent(match.opponent)
    setEditDate(match.match_date)
    setEditLocation(match.location || '')
    setEditingMatchInfo(true)
  }

  const handleSaveMatchInfo = async () => {
    if (!match || !editOpponent.trim() || !editDate) return

    const { error } = await supabase
      .from('matches')
      .update({
        opponent: editOpponent.trim(),
        match_date: editDate,
        location: editLocation.trim() || null,
      })
      .eq('id', matchId)

    if (error) {
      toast.error('경기 정보 수정에 실패했습니다')
      return
    }

    setMatch(prev => prev ? {
      ...prev,
      opponent: editOpponent.trim(),
      match_date: editDate,
      location: editLocation.trim() || null,
    } : null)
    setEditingMatchInfo(false)
    toast.success('경기 정보가 수정되었습니다')
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
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{formatDate(match.match_date)}</span>
                {match.location && (
                  <>
                    <span className="text-gray-300">|</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {match.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={startEditMatchInfo}
              className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleDeleteMatch}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Match Info Edit Form */}
      {editingMatchInfo && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">경기 정보 수정</h3>
              <button onClick={() => setEditingMatchInfo(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">상대팀</label>
                <input
                  type="text"
                  value={editOpponent}
                  onChange={(e) => setEditOpponent(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="상대팀 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경기 날짜</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">경기장</label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                  placeholder="경기장 이름 (선택사항)"
                />
              </div>
              <button
                onClick={handleSaveMatchInfo}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                수정 완료
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Score Section */}
        <section className="bg-white rounded-xl p-6 text-center">
          {(() => {
            const total = getTotalScore()
            return (
              <div className="text-4xl font-bold mb-2">
                <span className="text-emerald-600">{total.home}</span>
                <span className="text-gray-400 mx-3">:</span>
                <span className="text-gray-700">{total.away}</span>
              </div>
            )
          })()}
          <div className="flex justify-center gap-4 text-sm text-gray-500 mb-3">
            <span>우리팀</span>
            <span>{match.opponent}</span>
          </div>
          {/* Quarter score breakdown */}
          <div className="flex justify-center gap-3 text-xs text-gray-400">
            {match.quarters?.sort((a, b) => a.quarter_number - b.quarter_number).map(q => (
              <span key={q.id}>
                {q.quarter_number}Q {q.home_score || 0}:{q.away_score || 0}
              </span>
            ))}
          </div>
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

        {/* Attendees Section */}
        <section className="bg-white rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="w-4 h-4 text-gray-500" />
              참석 선수 ({attendees.length}명)
            </h3>
            <button
              onClick={openAttendeePicker}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-200"
            >
              <Plus className="w-4 h-4" />
              편집
            </button>
          </div>
          {attendees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attendees.map(a => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: POSITION_COLORS[a.player?.default_position || 'MF'] }}
                >
                  {a.player?.number != null && <span className="text-white/80 text-xs">#{a.player.number}</span>}
                  {a.player?.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">참석한 선수를 추가해주세요</p>
          )}
        </section>

        {/* Attendee Picker Modal */}
        {showAttendeePicker && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-xl w-full max-w-md p-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">참석 선수 선택</h3>
                <button onClick={() => setShowAttendeePicker(false)} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-4 mb-4">
                {(['GK', 'DF', 'MF', 'FW'] as const).map(pos => {
                  const posPlayers = allPlayers.filter(p => p.default_position === pos)
                  if (posPlayers.length === 0) return null
                  return (
                    <div key={pos}>
                      <p className="text-xs font-semibold text-gray-500 mb-2">{POSITION_LABELS[pos]}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {posPlayers.map(p => {
                          const isSelected = selectedAttendees.has(p.id)
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleAttendee(p.id)}
                              className={`flex flex-col items-center p-2 rounded-lg border-2 transition ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                style={{ backgroundColor: POSITION_COLORS[pos] }}
                              >
                                {p.number || '?'}
                              </div>
                              <span className="text-xs mt-1 text-gray-700 truncate w-full text-center">{p.name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              <button
                onClick={saveAttendees}
                className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
              >
                {selectedAttendees.size}명 저장
              </button>
            </div>
          </div>
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
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">{activeQuarter}쿼터 기록</h3>
                  {editingQuarterScore === activeQuarter ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 mb-0.5">우리팀</span>
                        <input
                          type="number"
                          min={0}
                          value={qHome}
                          onChange={(e) => setQHome(parseInt(e.target.value) || 0)}
                          className="w-12 text-center border rounded py-1 text-sm"
                        />
                      </div>
                      <span className="text-gray-400 mt-3">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-gray-400 mb-0.5">{match.opponent}</span>
                        <input
                          type="number"
                          min={0}
                          value={qAway}
                          onChange={(e) => setQAway(parseInt(e.target.value) || 0)}
                          className="w-12 text-center border rounded py-1 text-sm"
                        />
                      </div>
                      <button
                        onClick={handleSaveQuarterScore}
                        className="px-2 py-1 bg-emerald-600 text-white rounded text-xs"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => setEditingQuarterScore(null)}
                        className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                      >
                        취소
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEditQuarterScore(activeQuarter)}
                      className="text-sm text-gray-500 hover:text-emerald-600 border rounded-lg px-3 py-1"
                    >
                      <span className="text-[10px] text-gray-400">우리팀</span> <span className="text-emerald-600 font-medium">{currentQuarter.home_score || 0}</span>
                      <span className="mx-1">:</span>
                      <span className="font-medium">{currentQuarter.away_score || 0}</span> <span className="text-[10px] text-gray-400">{match.opponent}</span>
                    </button>
                  )}
                </div>
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
                <div className="relative w-full aspect-[3/2] bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-lg overflow-hidden shadow-inner">
                  {/* Grass pattern */}
                  <div className="absolute inset-0" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)',
                  }} />

                  {/* Field outline */}
                  <div className="absolute inset-3 border-2 border-white/60 rounded" />

                  {/* Center line */}
                  <div className="absolute left-1/2 top-3 bottom-3 w-0.5 bg-white/60" />

                  {/* Center circle */}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 border-white/60" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/60" />

                  {/* Left penalty area */}
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border-2 border-white/60 border-l-0" />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[6%] h-[30%] border-2 border-white/60 border-l-0" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-[18%] bg-white/40 rounded-r" />

                  {/* Right penalty area */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border-2 border-white/60 border-r-0" />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[6%] h-[30%] border-2 border-white/60 border-r-0" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-[18%] bg-white/40 rounded-l" />

                  {/* Players */}
                  {currentQuarter.quarter_records?.map((record) => (
                    <div
                      key={record.id}
                      className="absolute flex flex-col items-center"
                      style={{
                        left: `${record.position_x}%`,
                        top: `${record.position_y}%`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg"
                        style={{ backgroundColor: POSITION_COLORS[record.position_type] }}
                      >
                        {record.player?.number || '?'}
                      </div>
                      <span className="mt-0.5 px-1 py-0.5 bg-black/50 text-white text-[10px] rounded font-medium whitespace-nowrap">
                        {record.player?.name}
                      </span>
                    </div>
                  ))}

                  {currentQuarter.quarter_records?.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/70">
                      <span className="bg-black/30 px-3 py-1.5 rounded">선수를 배치해주세요</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quarter Players List */}
              <div className="divide-y">
                {currentQuarter.quarter_records?.map((record) => {
                  const hasReview = record.praise_text || record.improvement_text || record.highlight_text || (record.media_urls && record.media_urls.length > 0)
                  return (
                    <div key={record.id} className="p-4">
                      <div className="flex items-center justify-between">
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
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold font-mono">
                            {formatRating(record.rating)}
                          </p>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-2 ml-11 flex flex-wrap gap-2">
                        {record.goals > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            골 {record.goals}
                          </span>
                        )}
                        {record.assists > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            어시스트 {record.assists}
                          </span>
                        )}
                        {record.clean_sheet && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            클린시트
                          </span>
                        )}
                        {record.contribution > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            기여도
                          </span>
                        )}
                      </div>

                      {/* Review Display */}
                      {hasReview && (
                        <div className="mt-3 ml-11 space-y-2">
                          {record.media_urls && record.media_urls.length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5">
                              {record.media_urls.map((url: string, idx: number) => (
                                <div key={idx} className="rounded-lg overflow-hidden aspect-square bg-gray-100">
                                  {url.match(/\.(mp4|mov|webm)/i) ? (
                                    <video src={url} className="w-full h-full object-cover" controls />
                                  ) : (
                                    <img src={url} alt="" className="w-full h-full object-cover" />
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          {record.praise_text && (
                            <div className="bg-emerald-50 rounded-lg px-3 py-2">
                              <p className="text-xs font-semibold text-emerald-700 mb-0.5">참 잘했어요</p>
                              <p className="text-sm text-emerald-900">{record.praise_text}</p>
                            </div>
                          )}
                          {record.improvement_text && (
                            <div className="bg-amber-50 rounded-lg px-3 py-2">
                              <p className="text-xs font-semibold text-amber-700 mb-0.5">조금 더 연습해볼까요?</p>
                              <p className="text-sm text-amber-900">{record.improvement_text}</p>
                            </div>
                          )}
                          {record.highlight_text && (
                            <div className="bg-blue-50 rounded-lg px-3 py-2">
                              <p className="text-xs font-semibold text-blue-700 mb-0.5">이 부분을 칭찬해주세요!</p>
                              <p className="text-sm text-blue-900">{record.highlight_text}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
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
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {stats.totalGoals > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            골 {stats.totalGoals}
                          </span>
                        )}
                        {stats.totalAssists > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            어시스트 {stats.totalAssists}
                          </span>
                        )}
                        {stats.cleanSheets > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            클린시트 {stats.cleanSheets}
                          </span>
                        )}
                        {stats.avgContribution > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                            기여도
                          </span>
                        )}
                      </div>
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
