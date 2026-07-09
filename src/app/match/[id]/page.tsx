'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Star, Edit2, Trash2, Plus, X, Users, MapPin, Check, ArrowRightLeft, FileText } from 'lucide-react'
import type { Match, Player, Quarter, MatchAttendee } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import { formatDate, calculateMVP, getPlayerStatsFromMatch, formatRating } from '@/lib/utils'
import toast from 'react-hot-toast'
import { MatchDetailSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'

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
  const [canEditMatches, setCanEditMatches] = useState(false)
  const [canEditQuarters, setCanEditQuarters] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [notes, setNotes] = useState('')
  const [editingNotes, setEditingNotes] = useState(false)
  const [savingNotes, setSavingNotes] = useState(false)
  // MOM 투표
  const [momVotes, setMomVotes] = useState<Record<string, number>>({}) // playerId → voteCount
  const [myMomVote, setMyMomVote] = useState<string | null>(null) // voted playerId
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [votingMom, setVotingMom] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadMatch()
  }, [matchId])

  // Auto-open the attendee picker right after creating a match (?attendees=1)
  useEffect(() => {
    if (loading || !canEditMatches) return
    const params = new URLSearchParams(window.location.search)
    if (params.get('attendees') === '1' && attendees.length === 0) {
      setSelectedAttendees(new Set())
      setShowAttendeePicker(true)
      // Clean the param so refresh/back doesn't re-open the picker
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [loading, canEditMatches])

  const loadMomVotes = async () => {
    const { data } = await supabase
      .from('match_mom_votes')
      .select('voted_player_id, voter_user_id')
      .eq('match_id', matchId)
    if (!data) return
    const counts: Record<string, number> = {}
    for (const v of data) counts[v.voted_player_id] = (counts[v.voted_player_id] || 0) + 1
    setMomVotes(counts)
  }

  const handleMomVote = async (playerId: string) => {
    if (votingMom || !currentUserId) return
    setVotingMom(true)
    try {
      if (myMomVote === playerId) {
        await supabase.from('match_mom_votes')
          .delete().eq('match_id', matchId).eq('voter_user_id', currentUserId)
        setMyMomVote(null)
        setMomVotes(prev => { const n = {...prev}; n[playerId] = Math.max(0, (n[playerId] || 1) - 1); return n })
      } else {
        if (myMomVote) {
          await supabase.from('match_mom_votes')
            .delete().eq('match_id', matchId).eq('voter_user_id', currentUserId)
          setMomVotes(prev => { const n = {...prev}; n[myMomVote] = Math.max(0, (n[myMomVote] || 1) - 1); return n })
        }
        await supabase.from('match_mom_votes')
          .upsert({ match_id: matchId, voter_user_id: currentUserId, voted_player_id: playerId })
        setMyMomVote(playerId)
        setMomVotes(prev => ({ ...prev, [playerId]: (prev[playerId] || 0) + 1 }))
        toast.success('MOM 투표 완료! 🏅')
      }
    } catch { toast.error('투표에 실패했습니다') }
    finally { setVotingMom(false) }
  }

  const loadMatch = async () => {
    const user = await getSessionUser(supabase)
    if (user) setCurrentUserId(user.id)

    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        quarters (
          *,
          quarter_records (
            *,
            player:players (*)
          ),
          quarter_substitutions (
            *,
            player_out:players!player_out_id (*),
            player_in:players!player_in_id (*)
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
    setNotes(data.notes || '')

    // Check user permissions
    if (user) {
      // Check if owner
      const { data: team } = await supabase
        .from('teams')
        .select('user_id')
        .eq('id', data.team_id)
        .single()

      if (team?.user_id === user.id) {
        setCanEditMatches(true)
        setCanEditQuarters(true)
      } else {
        // Check team_members permissions
        const { data: membership } = await supabase
          .from('team_members')
          .select('role, can_edit_matches, can_edit_quarters')
          .eq('team_id', data.team_id)
          .eq('user_id', user.id)
          .single()

        if (membership) {
          const isCoach = membership.role === 'coach'
          setCanEditMatches(isCoach || membership.can_edit_matches)
          setCanEditQuarters(isCoach || membership.can_edit_quarters)
        }
      }
    }

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

    // MOM 투표 로드
    await loadMomVotes()
    if (user) {
      const { data: myVote } = await supabase
        .from('match_mom_votes')
        .select('voted_player_id')
        .eq('match_id', matchId)
        .eq('voter_user_id', user.id)
        .maybeSingle()
      if (myVote) setMyMomVote(myVote.voted_player_id)
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
    toast.success('참석 선수가 저장되었습니다', {
      duration: 4000,
      icon: '✅',
    })
    // Prompt quick lineup edit
    if (selectedAttendees.size > 0) {
      setTimeout(() => {
        toast(
          (t) => (
            <span className="flex items-center gap-2">
              <span>1쿼터 라인업 바로 편집할까요?</span>
              <Link
                href={`/match/${matchId}/quarter/1`}
                className="px-2 py-1 text-xs rounded-lg font-medium" style={{ background: 'var(--accent)', color: '#0a0a0a' }}
                onClick={() => toast.dismiss(t.id)}
              >
                바로가기
              </Link>
            </span>
          ),
          { duration: 5000 }
        )
      }, 500)
    }
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

  const handleSaveNotes = async () => {
    if (!match) return
    setSavingNotes(true)
    const { error } = await supabase
      .from('matches')
      .update({ notes: notes.trim() || null })
      .eq('id', matchId)
    setSavingNotes(false)
    if (error) { toast.error('저장에 실패했습니다'); return }
    setMatch(prev => prev ? { ...prev, notes: notes.trim() || null } : null)
    setEditingNotes(false)
    toast.success('경기 메모가 저장되었습니다')
  }

  if (loading || !match) {
    return <MatchDetailSkeleton />
  }

  const mvp = calculateMVP(match)
  const playerStats = getPlayerStatsFromMatch(match)
  const currentQuarter = match.quarters?.find(q => q.quarter_number === activeQuarter)

  const cardStyle = { background: '#111010', border: '1px solid var(--line)', borderRadius: 16 }

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-black text-white">vs {match.opponent}</h1>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>{formatDate(match.match_date)}</span>
                {match.location && (
                  <>
                    <span className="text-white/20">|</span>
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3" />
                      {match.location}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          {canEditMatches && (
            <div className="flex items-center gap-1">
              <button onClick={startEditMatchInfo} className="p-2 text-white/40 hover:text-white rounded-xl">
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-white/40 hover:text-red-400 rounded-xl">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Match Info Edit Form */}
      {editingMatchInfo && (
        <div className="max-w-4xl mx-auto px-4 pt-4">
          <div className="p-4 rounded-xl" style={cardStyle}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-white">경기 정보 수정</h3>
              <button onClick={() => setEditingMatchInfo(false)} className="p-1 text-white/40 hover:text-white rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: '상대팀', type: 'text', value: editOpponent, onChange: setEditOpponent, placeholder: '상대팀 이름' },
                { label: '경기 날짜', type: 'date', value: editDate, onChange: setEditDate, placeholder: '' },
                { label: '경기장', type: 'text', value: editLocation, onChange: setEditLocation, placeholder: '경기장 이름 (선택사항)' },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-white outline-none text-sm"
                    style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <button
                onClick={handleSaveMatchInfo}
                className="w-full py-3 rounded-lg font-bold text-sm"
                style={{ background: 'var(--accent)', color: '#0a0a0a' }}
              >
                수정 완료
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Score Section */}
        <section className="p-6 text-center" style={cardStyle}>
          {(() => {
            const total = getTotalScore()
            const isWin = total.home > total.away
            const isDraw = total.home === total.away
            return (
              <>
                <div className="font-display text-[56px] leading-none mb-2 flex items-center justify-center gap-4">
                  <span style={{ color: 'var(--accent)' }}>{total.home}</span>
                  <span className="text-white/20 text-[32px]">:</span>
                  <span className="text-white/60">{total.away}</span>
                </div>
                {!isDraw && (
                  <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest mb-2"
                    style={{ background: isWin ? 'var(--chip)' : '#2a1010', color: isWin ? 'var(--accent)' : '#ef4444' }}>
                    {isWin ? 'WIN' : 'LOSS'}
                  </span>
                )}
              </>
            )
          })()}
          <div className="flex justify-center gap-6 text-[12px] mb-3" style={{ color: 'var(--muted2)' }}>
            <span>우리팀</span>
            <span>{match.opponent}</span>
          </div>
          <div className="flex justify-center gap-3 text-[11px]" style={{ color: 'var(--muted2)' }}>
            {match.quarters?.sort((a, b) => a.quarter_number - b.quarter_number).map(q => (
              <span key={q.id}>{q.quarter_number}Q {q.home_score || 0}:{q.away_score || 0}</span>
            ))}
          </div>
        </section>

        {/* MVP Section */}
        {mvp && (
          <section className="p-4 rounded-2xl flex items-center gap-4" style={{ background: 'var(--chip)', border: '1px solid var(--line)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent)' }}>
              <Star className="w-6 h-6 fill-current" style={{ color: '#0a0a0a' }} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--accent)' }}>코치 MVP</p>
              <p className="text-[17px] font-black text-white">
                {mvp.playerName}
                <span className="font-normal text-[13px] ml-2" style={{ color: 'var(--muted2)' }}>
                  평균 {mvp.averageRating.toFixed(1)}점
                </span>
              </p>
            </div>
          </section>
        )}

        {/* MOM 투표 */}
        {attendees.length > 0 && (
          <section className="p-4 rounded-2xl" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏅</span>
              <div>
                <h3 className="font-black text-white text-[14px]">이 경기의 MOM은?</h3>
                <p className="text-[11px]" style={{ color: 'var(--muted2)' }}>팀원이 뽑는 Man of the Match</p>
              </div>
              {myMomVote && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>투표 완료</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {attendees.map(a => {
                const pid = a.player?.id || ''
                const voteCount = momVotes[pid] || 0
                const isMyVote = myMomVote === pid
                const totalVotes = Object.values(momVotes).reduce((s, n) => s + n, 0)
                const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0
                return (
                  <button
                    key={a.id}
                    onClick={() => handleMomVote(pid)}
                    disabled={votingMom}
                    className="relative flex items-center gap-2 p-2.5 rounded-xl border-2 transition active:scale-[0.97] overflow-hidden"
                    style={{ borderColor: isMyVote ? 'var(--accent)' : 'var(--line)', background: isMyVote ? 'var(--chip)' : '#1a1a1a' }}
                  >
                    {totalVotes > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 transition-all duration-500" style={{ width: `${pct}%`, background: 'rgba(204,255,0,0.08)' }} />
                    )}
                    <div className="relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                      style={{ backgroundColor: POSITION_COLORS[a.player?.default_position || 'MF'] }}>
                      {a.player?.number || '?'}
                    </div>
                    <div className="relative flex-1 text-left">
                      <p className="text-xs font-black truncate text-white">{a.player?.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted2)' }}>
                        {voteCount > 0 ? `${voteCount}표${totalVotes > 0 ? ` (${pct}%)` : ''}` : '0표'}
                      </p>
                    </div>
                    {isMyVote && <Check className="relative w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Attendees Section */}
        <section className="p-4 rounded-xl" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--muted2)' }} />
              참석 선수 ({attendees.length}명)
            </h3>
            {canEditMatches && (
              <button
                onClick={openAttendeePicker}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ background: 'var(--chip)', color: 'var(--accent)' }}
              >
                <Plus className="w-4 h-4" />
                편집
              </button>
            )}
          </div>
          {attendees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attendees.map(a => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-white"
                  style={{ backgroundColor: POSITION_COLORS[a.player?.default_position || 'MF'] }}
                >
                  {a.player?.number != null && <span className="text-white/70 text-xs">#{a.player.number}</span>}
                  {a.player?.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>참석한 선수를 추가해주세요</p>
          )}
        </section>

        {/* Attendee Picker Modal */}
        {showAttendeePicker && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
            <div className="rounded-xl w-full max-w-md p-4 max-h-[80vh] flex flex-col" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white text-lg">참석 선수 선택</h3>
                <button onClick={() => setShowAttendeePicker(false)} className="p-1 text-white/40 hover:text-white rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 space-y-4 mb-4">
                {(['GK', 'DF', 'MF', 'FW'] as const).map(pos => {
                  const posPlayers = allPlayers.filter(p => p.default_position === pos)
                  if (posPlayers.length === 0) return null
                  return (
                    <div key={pos}>
                      <p className="text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted2)' }}>{POSITION_LABELS[pos]}</p>
                      <div className="grid grid-cols-3 gap-2">
                        {posPlayers.map(p => {
                          const isSelected = selectedAttendees.has(p.id)
                          return (
                            <button
                              key={p.id}
                              onClick={() => toggleAttendee(p.id)}
                              className="flex flex-col items-center p-2 rounded-lg border-2 transition"
                              style={{ borderColor: isSelected ? 'var(--accent)' : 'var(--line)', background: isSelected ? 'var(--chip)' : '#1a1a1a' }}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: POSITION_COLORS[pos] }}>
                                {p.number || '?'}
                              </div>
                              <span className="text-xs mt-1 text-white/70 truncate w-full text-center">{p.name}</span>
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
                className="w-full py-3 rounded-lg font-bold"
                style={{ background: 'var(--accent)', color: '#0a0a0a' }}
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
                className="flex-1 py-3 rounded-lg font-bold text-sm transition"
                style={{
                  background: activeQuarter === q ? 'var(--accent)' : '#111010',
                  color: activeQuarter === q ? '#0a0a0a' : 'var(--muted2)',
                  border: activeQuarter === q ? 'none' : '1px solid var(--line)',
                }}
              >
                {q}쿼터
              </button>
            ))}
          </div>

          {/* Quarter Content */}
          {currentQuarter && (
            <div className="rounded-xl overflow-hidden" style={{ background: '#111010', border: '1px solid var(--line)' }}>
              <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-white">{activeQuarter}쿼터 기록</h3>
                  {canEditQuarters && editingQuarterScore === activeQuarter ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] mb-0.5" style={{ color: 'var(--muted2)' }}>우리팀</span>
                        <input
                          type="number"
                          min={0}
                          value={qHome}
                          onChange={(e) => setQHome(parseInt(e.target.value) || 0)}
                          className="w-12 text-center rounded py-1 text-sm text-white outline-none"
                          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                        />
                      </div>
                      <span className="text-white/30 mt-3">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] mb-0.5" style={{ color: 'var(--muted2)' }}>{match.opponent}</span>
                        <input
                          type="number"
                          min={0}
                          value={qAway}
                          onChange={(e) => setQAway(parseInt(e.target.value) || 0)}
                          className="w-12 text-center rounded py-1 text-sm text-white outline-none"
                          style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                        />
                      </div>
                      <button onClick={handleSaveQuarterScore} className="px-2 py-1 rounded text-xs font-bold" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>저장</button>
                      <button onClick={() => setEditingQuarterScore(null)} className="px-2 py-1 rounded text-xs text-white/50" style={{ background: '#1a1a1a' }}>취소</button>
                    </div>
                  ) : canEditQuarters ? (
                    <button
                      onClick={() => startEditQuarterScore(activeQuarter)}
                      className="flex items-center gap-1.5 text-sm rounded-lg px-3 min-h-[44px] transition"
                      style={{ border: '1px solid var(--line)', color: 'var(--muted2)' }}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span style={{ color: 'var(--accent)' }}>{currentQuarter.home_score || 0}</span>
                      <span className="mx-1">:</span>
                      <span>{currentQuarter.away_score || 0}</span>
                    </button>
                  ) : (
                    <span className="text-sm rounded-lg px-3 py-2" style={{ border: '1px solid var(--line)', color: 'var(--muted2)' }}>
                      <span style={{ color: 'var(--accent)' }}>{currentQuarter.home_score || 0}</span>
                      <span className="mx-1">:</span>
                      <span>{currentQuarter.away_score || 0}</span>
                    </span>
                  )}
                </div>
                {canEditQuarters && (
                  <Link
                    href={`/match/${matchId}/quarter/${activeQuarter}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold"
                    style={{ background: 'var(--chip)', color: 'var(--accent)' }}
                  >
                    <Edit2 className="w-4 h-4" />
                    편집
                  </Link>
                )}
              </div>

              {/* Soccer Field Preview */}
              <div className="p-4">
                <div className="relative w-full aspect-[3/2] rounded-lg overflow-hidden shadow-inner" style={{ background: 'linear-gradient(180deg,#0e2018,#0a1a13)', border: '1px solid #143325' }}>
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
                  {(() => {
                    // Build substitution lookup maps
                    const subsOutMap = new Map<string, { minute: number; player_in?: { name: string; number: number | null; default_position?: string } }>()
                    const subsInMap = new Map<string, { minute: number; player_out?: { name: string; number: number | null } }>()
                    currentQuarter.quarter_substitutions?.forEach((sub: { player_out_id?: string; player_in_id?: string; player_out?: { id: string; name: string; number: number | null }; player_in?: { id: string; name: string; number: number | null; default_position?: string }; minute: number }) => {
                      const outId = sub.player_out_id || sub.player_out?.id
                      const inId = sub.player_in_id || sub.player_in?.id
                      if (outId) subsOutMap.set(outId, { minute: sub.minute, player_in: sub.player_in || undefined })
                      if (inId) subsInMap.set(inId, { minute: sub.minute, player_out: sub.player_out || undefined })
                    })

                    return currentQuarter.quarter_records?.map((record) => {
                      const hasStats = record.goals > 0 || record.assists > 0 || record.clean_sheet || record.contribution > 0
                      const subOut = subsOutMap.get(record.player_id)
                      const subIn = subsInMap.get(record.player_id)

                      return (
                        <div
                          key={record.id}
                          className="absolute flex flex-col items-center"
                          style={{
                            left: `${record.position_x}%`,
                            top: `${record.position_y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                        >
                          {/* Rating badge */}
                          {record.rating != null && (
                            <span className="absolute -top-2 -right-3 px-1 py-0.5 bg-amber-400 text-[9px] font-bold text-white rounded shadow z-10">
                              {record.rating.toFixed(1)}
                            </span>
                          )}
                          {/* IN badge for substituted-in players */}
                          {subIn && (
                            <span className="absolute -top-2 -left-3 px-1 py-0.5 text-[8px] font-bold rounded shadow z-10" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                              IN {subIn.minute}&apos;
                            </span>
                          )}
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg ${subOut ? 'opacity-60' : ''}`}
                            style={{ backgroundColor: POSITION_COLORS[record.position_type] }}
                          >
                            {record.player?.number || '?'}
                          </div>
                          <span className={`mt-0.5 px-1 py-0.5 bg-black/50 text-white text-[10px] rounded font-medium whitespace-nowrap ${subOut ? 'line-through opacity-70' : ''}`}>
                            {record.player?.name}
                          </span>
                          {/* OUT indicator with sub info */}
                          {subOut && (
                            <div className="flex flex-col items-center mt-0.5">
                              <span className="px-1 py-0.5 bg-red-500 text-white text-[8px] font-bold rounded">
                                OUT {subOut.minute}&apos;
                              </span>
                              {subOut.player_in && (
                                <span className="mt-0.5 px-1 py-0.5 text-[8px] font-bold rounded whitespace-nowrap" style={{ background: 'rgba(204,255,0,0.8)', color: '#0a0a0a' }}>
                                  ↑ {subOut.player_in.name}
                                </span>
                              )}
                            </div>
                          )}
                          {/* Stats badges */}
                          {hasStats && !subOut && (
                            <div className="flex gap-0.5 mt-0.5">
                              {record.goals > 0 && (
                                <span className="px-1 text-[8px] font-bold rounded" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                                  G{record.goals}
                                </span>
                              )}
                              {record.assists > 0 && (
                                <span className="px-1 text-[8px] font-bold rounded" style={{ background: 'rgba(204,255,0,0.6)', color: '#0a0a0a' }}>
                                  A{record.assists}
                                </span>
                              )}
                              {record.clean_sheet && (
                                <span className="px-1 bg-purple-500 text-white text-[8px] font-bold rounded">
                                  CS
                                </span>
                              )}
                              {record.contribution > 0 && (
                                <span className="px-1 bg-amber-600 text-white text-[8px] font-bold rounded">
                                  +
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })
                  })()}

                  {currentQuarter.quarter_records?.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-white/70">
                      <span className="bg-black/30 px-3 py-1.5 rounded">선수를 배치해주세요</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Substitutions */}
              {currentQuarter.quarter_substitutions && currentQuarter.quarter_substitutions.length > 0 && (
                <div className="px-4 py-3" style={{ background: '#0d1a10', borderTop: '1px solid var(--line)' }}>
                  <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    교체 ({currentQuarter.quarter_substitutions.length}건)
                  </p>
                  <div className="space-y-1.5">
                    {currentQuarter.quarter_substitutions
                      .sort((a: { minute: number }, b: { minute: number }) => a.minute - b.minute)
                      .map((sub: { id: string; minute: number; player_out?: { name: string; number: number | null }; player_in?: { name: string; number: number | null } }) => (
                        <div key={sub.id} className="flex items-center gap-2 text-[13px]">
                          <span className="text-[11px] font-bold w-8" style={{ color: 'var(--muted2)' }}>{sub.minute}&apos;</span>
                          <span className="text-red-400">{sub.player_out?.number ? `#${sub.player_out.number} ` : ''}{sub.player_out?.name}</span>
                          <span className="text-white/20">→</span>
                          <span style={{ color: 'var(--accent)' }}>{sub.player_in?.number ? `#${sub.player_in.number} ` : ''}{sub.player_in?.name}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Quarter Players List */}
              <div>
                {currentQuarter.quarter_records?.map((record, idx) => {
                  const hasReview = record.praise_text || record.improvement_text || record.highlight_text || (record.media_urls && record.media_urls.length > 0)
                  return (
                    <div key={record.id} className="p-4" style={{ borderTop: idx > 0 ? '1px solid var(--line)' : '1px solid var(--line)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: POSITION_COLORS[record.position_type] }}>
                            {record.player?.number || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-white">{record.player?.name}</p>
                            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{POSITION_LABELS[record.position_type]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold font-display" style={{ color: 'var(--accent)' }}>{formatRating(record.rating)}</p>
                        </div>
                      </div>

                      <div className="mt-2 ml-11 flex flex-wrap gap-1.5">
                        {record.goals > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>골 {record.goals}</span>}
                        {record.assists > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--chipText)' }}>어시스트 {record.assists}</span>}
                        {record.clean_sheet && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-900/50 text-purple-300">클린시트</span>}
                        {record.contribution > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-900/40 text-amber-300">기여도</span>}
                      </div>

                      {hasReview && (
                        <div className="mt-3 ml-11 space-y-2">
                          {record.media_urls && record.media_urls.length > 0 && (
                            <div className="grid grid-cols-4 gap-1.5">
                              {record.media_urls.map((url: string, i: number) => (
                                <div key={i} className="rounded-lg overflow-hidden aspect-square bg-white/5">
                                  {url.match(/\.(mp4|mov|webm)/i) ? <video src={url} className="w-full h-full object-cover" controls /> : <img src={url} alt="" className="w-full h-full object-cover" />}
                                </div>
                              ))}
                            </div>
                          )}
                          {record.praise_text && (
                            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--chip)' }}>
                              <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--accent)' }}>참 잘했어요</p>
                              <p className="text-[13px] text-white/80">{record.praise_text}</p>
                            </div>
                          )}
                          {record.improvement_text && (
                            <div className="rounded-lg px-3 py-2 bg-amber-900/20">
                              <p className="text-[10px] font-bold text-amber-400 mb-0.5">조금 더 연습해볼까요?</p>
                              <p className="text-[13px] text-white/80">{record.improvement_text}</p>
                            </div>
                          )}
                          {record.highlight_text && (
                            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--chip)' }}>
                              <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--chipText)' }}>이 부분을 칭찬해주세요!</p>
                              <p className="text-[13px] text-white/80">{record.highlight_text}</p>
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

        {/* Match Notes */}
        {(canEditMatches || match.notes) && (
          <section className="p-4 rounded-xl" style={cardStyle}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--muted2)' }} />
                경기 메모
              </h3>
              {canEditMatches && !editingNotes && (
                <button onClick={() => setEditingNotes(true)} className="p-1.5 text-white/40 hover:text-white rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {editingNotes ? (
              <div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  placeholder="경기에 대한 메모를 남겨보세요"
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none text-white"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSaveNotes} disabled={savingNotes} className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                    {savingNotes ? '저장 중...' : '저장'}
                  </button>
                  <button onClick={() => { setNotes(match.notes || ''); setEditingNotes(false) }} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white/60" style={{ background: '#1a1a1a' }}>
                    취소
                  </button>
                </div>
              </div>
            ) : match.notes ? (
              <p className="text-[13px] text-white/70 whitespace-pre-wrap">{match.notes}</p>
            ) : (
              <button onClick={() => setEditingNotes(true)} className="w-full py-4 border-2 border-dashed rounded-xl text-[13px] transition" style={{ borderColor: 'var(--line)', color: 'var(--muted2)' }}>
                메모 추가하기
              </button>
            )}
          </section>
        )}

        {/* Overall Player Stats */}
        {playerStats.length > 0 && (
          <section>
            <h3 className="font-bold text-white mb-3">전체 선수 통계</h3>
            <div className="rounded-xl overflow-hidden" style={{ background: '#111010', border: '1px solid var(--line)' }}>
              {playerStats.map((stats, index) => (
                <div key={stats.playerId} className="p-4 flex items-center justify-between" style={{ borderTop: index > 0 ? '1px solid var(--line)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-[13px]" style={{ color: 'var(--muted2)' }}>{index + 1}</span>
                    <div>
                      <p className="font-bold text-white flex items-center gap-2">
                        {stats.playerName}
                        {index === 0 && mvp && <Star className="w-4 h-4 fill-current" style={{ color: 'var(--accent)' }} />}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {stats.totalGoals > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>골 {stats.totalGoals}</span>}
                        {stats.totalAssists > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--chipText)' }}>어시스트 {stats.totalAssists}</span>}
                        {stats.cleanSheets > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-purple-900/50 text-purple-300">클린시트 {stats.cleanSheets}</span>}
                        {stats.avgContribution > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-900/40 text-amber-300">기여도</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-display" style={{ color: 'var(--accent)' }}>{stats.averageRating.toFixed(1)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted2)' }}>평균</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <ConfirmSheet
        open={showDeleteConfirm}
        title="경기를 삭제하시겠습니까?"
        description="삭제된 경기는 복구할 수 없습니다."
        confirmLabel="삭제"
        danger
        onConfirm={() => { setShowDeleteConfirm(false); handleDeleteMatch() }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <BottomNav />
    </div>
  )
}
