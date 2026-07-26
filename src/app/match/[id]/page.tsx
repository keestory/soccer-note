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
import { useI18n } from '@/lib/i18n/context'
import { MatchDetailSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'
import { getStore } from '@/lib/dataStore'

const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"

export default function MatchDetailPage() {
  const { t } = useI18n()
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
    } catch { toast.error(t.voteFailed) }
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
      toast.error(t.matchLoadFailed)
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
      toast.error(t.scoreSaveFailed)
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
    toast.success(t.scoreSaved)
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
        toast.error(t.attendeeSaveFailed)
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
        toast.error(t.attendeeDeleteFailed)
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
    toast.success(t.attendeeSaved, {
      duration: 4000,
      icon: '✅',
    })
    // Prompt quick lineup edit
    if (selectedAttendees.size > 0) {
      setTimeout(() => {
        toast(
          (toastInst) => (
            <span className="flex items-center gap-2">
              <span>{t.lineupShortcutQ}</span>
              <Link
                href={`/match/${matchId}/quarter/1`}
                className="px-2 py-1 text-xs rounded-lg font-medium" style={{ background: 'var(--navy)', color: 'var(--accent)' }}
                onClick={() => toast.dismiss(toastInst.id)}
              >
                {t.shortcut}
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
      toast.error(t.matchInfoUpdateFailed)
      return
    }

    setMatch(prev => prev ? {
      ...prev,
      opponent: editOpponent.trim(),
      match_date: editDate,
      location: editLocation.trim() || null,
    } : null)
    setEditingMatchInfo(false)
    toast.success(t.matchInfoUpdated)
  }

  const handleDeleteMatch = async () => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId)

    if (error) {
      toast.error(t.deleteFailed)
      return
    }

    toast.success(t.matchDeleted)
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
    if (error) { toast.error(t.saveFailed); return }
    setMatch(prev => prev ? { ...prev, notes: notes.trim() || null } : null)
    setEditingNotes(false)
    toast.success(t.matchNoteSaved)
  }

  if (loading || !match) {
    return <MatchDetailSkeleton />
  }

  const mvp = calculateMVP(match)
  const playerStats = getPlayerStatsFromMatch(match)
  const currentQuarter = match.quarters?.find(q => q.quarter_number === activeQuarter)
  const homeTeamName = getStore().teams.find(tm => tm.id === (match as any).team_id)?.name || t.homeTeam

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-black text-[color:var(--text)]">vs {match.opponent}</h1>
              <div className="flex items-center gap-2 text-xs text-[color:var(--text)]/40">
                <span>{formatDate(match.match_date)}</span>
                {match.location && (
                  <>
                    <span className="text-[color:var(--text)]/20">|</span>
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
              <button onClick={startEditMatchInfo} className="p-2 text-[color:var(--text)]/40 hover:text-[color:var(--text)] rounded-xl">
                <Edit2 className="w-5 h-5" />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className="p-2 text-[color:var(--text)]/40 hover:text-red-400 rounded-xl">
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
              <h3 className="font-bold text-[color:var(--text)]">{t.editMatchInfo}</h3>
              <button onClick={() => setEditingMatchInfo(false)} className="p-1 text-[color:var(--text)]/40 hover:text-[color:var(--text)] rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              {[
                { label: t.opponent, type: 'text', value: editOpponent, onChange: setEditOpponent, placeholder: t.opponentPlaceholder },
                { label: t.matchDate, type: 'date', value: editDate, onChange: setEditDate, placeholder: '' },
                { label: t.location, type: 'text', value: editLocation, onChange: setEditLocation, placeholder: t.locationPlaceholder },
              ].map(f => (
                <div key={f.label}>
                  <label className="block text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>{f.label}</label>
                  <input
                    type={f.type}
                    value={f.value}
                    onChange={(e) => f.onChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-[color:var(--text)] outline-none text-sm"
                    style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}
                    placeholder={f.placeholder}
                  />
                </div>
              ))}
              <button
                onClick={handleSaveMatchInfo}
                className="w-full py-3 rounded-lg font-bold text-sm"
                style={{ background: 'var(--navy)', color: 'var(--accent)' }}
              >
                {t.editDone}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-md mx-auto flex flex-col" style={{ gap: 13, padding: '0 20px 16px' }}>
        {/* Score Section (navy scoreboard) */}
        {(() => {
          const total = getTotalScore()
          const isWin = total.home > total.away
          const isLoss = total.home < total.away
          const isDraw = total.home === total.away
          const quarters = (match.quarters ?? []).slice().sort((a, b) => a.quarter_number - b.quarter_number)
          return (
            <>
              <section style={{ background: '#101828', borderRadius: 22, padding: 22 }}>
                <div style={{ textAlign: 'center', fontSize: 11, color: '#98a2b3' }}>
                  {formatDate(match.match_date)}{match.location ? ` · ${match.location}` : ''}
                </div>
                <div className="flex items-center justify-between" style={{ marginTop: 14 }}>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{homeTeamName}</div>
                    <div style={{ fontSize: 10, color: '#667085', letterSpacing: '.12em', marginTop: 3 }}>HOME</div>
                  </div>
                  <div style={{ fontFamily: BEBAS, fontSize: 60, lineHeight: 0.78, color: '#c8f542', flexShrink: 0 }}>
                    {total.home}<span style={{ color: '#344054', padding: '0 6px' }}>:</span>{total.away}
                  </div>
                  <div style={{ textAlign: 'center', flex: 1, minWidth: 0 }}>
                    <div className="truncate" style={{ fontSize: 14, fontWeight: 700, color: '#98a2b3' }}>{match.opponent}</div>
                    <div style={{ fontSize: 10, color: '#667085', letterSpacing: '.12em', marginTop: 3 }}>AWAY</div>
                  </div>
                </div>
                <div className="flex justify-center" style={{ marginTop: 16 }}>
                  <span style={{ fontFamily: BEBAS, fontSize: 12, letterSpacing: '.1em', padding: '3px 10px', borderRadius: 6,
                    color: isWin ? '#101828' : '#fff', background: isWin ? '#c8f542' : isLoss ? 'rgba(240,68,56,.9)' : '#1a2437' }}>
                    {isWin ? 'WIN' : isLoss ? 'LOSS' : 'DRAW'}
                  </span>
                </div>
              </section>
              {quarters.length > 0 && (
                <div className="flex" style={{ gap: 8 }}>
                  {quarters.map((q, i) => (
                    <button key={q.id} onClick={() => canEditQuarters && startEditQuarterScore(q.quarter_number)}
                      style={{ flex: 1, textAlign: 'center', fontFamily: BEBAS, fontSize: 15, padding: '10px 0', borderRadius: 12,
                        background: i === 0 ? '#101828' : '#fff', color: i === 0 ? '#c8f542' : '#475467',
                        border: i === 0 ? 'none' : '1px solid #eaecf0' }}>
                      {q.quarter_number}Q {q.home_score || 0}:{q.away_score || 0}
                    </button>
                  ))}
                </div>
              )}
            </>
          )
        })()}

        {/* MVP Section */}
        {mvp && (
          <section className="flex items-center" style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: '15px 18px', gap: 12 }}>
            <span style={{ fontFamily: BEBAS, fontSize: 13, letterSpacing: '.14em', color: '#101828', background: '#c8f542', padding: '4px 10px', borderRadius: 8 }}>MVP</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{mvp.playerName}</span>
            <span style={{ fontSize: 12, color: '#98a2b3' }}>{t.avgPoints.replace('{n}', mvp.averageRating.toFixed(1))}</span>
          </section>
        )}

        {/* MOM 투표 */}
        {attendees.length > 0 && (
          <section className="p-4 rounded-2xl" style={cardStyle}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏅</span>
              <div>
                <h3 className="font-black text-[color:var(--text)] text-[14px]">{t.momQuestion}</h3>
                <p className="text-[11px]" style={{ color: 'var(--muted2)' }}>{t.momSubtitle}</p>
              </div>
              {myMomVote && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--chip)', color: 'var(--text)' }}>{t.voteDone}</span>
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
                    style={{ borderColor: isMyVote ? 'var(--navy)' : 'var(--line)', background: isMyVote ? 'var(--chip)' : 'var(--card2)' }}
                  >
                    {totalVotes > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 transition-all duration-500" style={{ width: `${pct}%`, background: 'rgba(204,255,0,0.08)' }} />
                    )}
                    <div className="relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-[color:var(--text)] flex-shrink-0"
                      style={{ backgroundColor: POSITION_COLORS[a.player?.default_position || 'MF'] }}>
                      {a.player?.number || '?'}
                    </div>
                    <div className="relative flex-1 text-left">
                      <p className="text-xs font-black truncate text-[color:var(--text)]">{a.player?.name}</p>
                      <p className="text-[10px]" style={{ color: 'var(--muted2)' }}>
                        {t.votesN.replace('{n}', String(voteCount))}{voteCount > 0 && totalVotes > 0 ? ` (${pct}%)` : ''}
                      </p>
                    </div>
                    {isMyVote && <Check className="relative w-4 h-4 flex-shrink-0" style={{ color: 'var(--text)' }} />}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* Attendees Section */}
        <section className="p-4 rounded-xl" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-[color:var(--text)] flex items-center gap-2">
              <Users className="w-4 h-4" style={{ color: 'var(--muted2)' }} />
              {t.attendees} ({attendees.length})
            </h3>
            {canEditMatches && (
              <button
                onClick={openAttendeePicker}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold"
                style={{ background: 'var(--chip)', color: 'var(--text)' }}
              >
                <Plus className="w-4 h-4" />
                {t.edit}
              </button>
            )}
          </div>
          {attendees.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {attendees.map(a => (
                <span
                  key={a.id}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-[color:var(--text)]"
                  style={{ backgroundColor: POSITION_COLORS[a.player?.default_position || 'MF'] }}
                >
                  {a.player?.number != null && <span className="text-[color:var(--text)]/70 text-xs">#{a.player.number}</span>}
                  {a.player?.name}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{t.selectAttendees}</p>
          )}
        </section>

        {/* Attendee Picker Modal */}
        {showAttendeePicker && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-4">
            <div className="rounded-xl w-full max-w-md p-4 max-h-[80vh] flex flex-col" style={cardStyle}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[color:var(--text)] text-lg">{t.attendees}</h3>
                <button onClick={() => setShowAttendeePicker(false)} className="p-1 text-[color:var(--text)]/40 hover:text-[color:var(--text)] rounded">
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
                              style={{ borderColor: isSelected ? 'var(--navy)' : 'var(--line)', background: isSelected ? 'var(--chip)' : 'var(--card2)' }}
                            >
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[color:var(--text)] text-xs font-bold" style={{ backgroundColor: POSITION_COLORS[pos] }}>
                                {p.number || '?'}
                              </div>
                              <span className="text-xs mt-1 text-[color:var(--text)]/70 truncate w-full text-center">{p.name}</span>
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
                style={{ background: 'var(--navy)', color: 'var(--accent)' }}
              >
                {t.saveNPlayers.replace('{n}', String(selectedAttendees.size))}
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
                  background: activeQuarter === q ? 'var(--navy)' : 'var(--card2)',
                  color: activeQuarter === q ? 'var(--accent)' : 'var(--muted2)',
                  border: activeQuarter === q ? 'none' : '1px solid var(--line)',
                }}
              >
                {t.quarterN.replace('{n}', String(q))}
              </button>
            ))}
          </div>

          {/* Quarter Content */}
          {currentQuarter && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
              <div className="p-4 flex justify-between items-center" style={{ borderBottom: '1px solid var(--line)' }}>
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-[color:var(--text)]">{t.quarterN.replace('{n}', String(activeQuarter))} {t.quarterRecord}</h3>
                  {canEditQuarters && editingQuarterScore === activeQuarter ? (
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] mb-0.5" style={{ color: 'var(--muted2)' }}>{t.homeTeam}</span>
                        <input
                          type="number"
                          min={0}
                          value={qHome}
                          onChange={(e) => setQHome(parseInt(e.target.value) || 0)}
                          className="w-12 text-center rounded py-1 text-sm text-[color:var(--text)] outline-none"
                          style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}
                        />
                      </div>
                      <span className="text-[color:var(--text)]/30 mt-3">:</span>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] mb-0.5" style={{ color: 'var(--muted2)' }}>{match.opponent}</span>
                        <input
                          type="number"
                          min={0}
                          value={qAway}
                          onChange={(e) => setQAway(parseInt(e.target.value) || 0)}
                          className="w-12 text-center rounded py-1 text-sm text-[color:var(--text)] outline-none"
                          style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}
                        />
                      </div>
                      <button onClick={handleSaveQuarterScore} className="px-2 py-1 rounded text-xs font-bold" style={{ background: 'var(--navy)', color: 'var(--accent)' }}>{t.save}</button>
                      <button onClick={() => setEditingQuarterScore(null)} className="px-2 py-1 rounded text-xs text-[color:var(--text)]/50" style={{ background: 'var(--card2)' }}>{t.cancel}</button>
                    </div>
                  ) : canEditQuarters ? (
                    <button
                      onClick={() => startEditQuarterScore(activeQuarter)}
                      className="flex items-center gap-1.5 text-sm rounded-lg px-3 min-h-[44px] transition"
                      style={{ border: '1px solid var(--line)', color: 'var(--muted2)' }}
                    >
                      <Edit2 className="w-3 h-3" />
                      <span style={{ color: 'var(--text)' }}>{currentQuarter.home_score || 0}</span>
                      <span className="mx-1">:</span>
                      <span>{currentQuarter.away_score || 0}</span>
                    </button>
                  ) : (
                    <span className="text-sm rounded-lg px-3 py-2" style={{ border: '1px solid var(--line)', color: 'var(--muted2)' }}>
                      <span style={{ color: 'var(--text)' }}>{currentQuarter.home_score || 0}</span>
                      <span className="mx-1">:</span>
                      <span>{currentQuarter.away_score || 0}</span>
                    </span>
                  )}
                </div>
                {canEditQuarters && (
                  <Link
                    href={`/match/${matchId}/quarter/${activeQuarter}`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-bold"
                    style={{ background: 'var(--chip)', color: 'var(--text)' }}
                  >
                    <Edit2 className="w-4 h-4" />
                    {t.edit}
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
                      <span className="bg-black/30 px-3 py-1.5 rounded">{t.placePlayersMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Substitutions */}
              {currentQuarter.quarter_substitutions && currentQuarter.quarter_substitutions.length > 0 && (
                <div className="px-4 py-3" style={{ background: '#0d1a10', borderTop: '1px solid var(--line)' }}>
                  <p className="text-xs font-bold mb-2 flex items-center gap-1" style={{ color: 'var(--text)' }}>
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {t.substitutionCount.replace('{n}', String(currentQuarter.quarter_substitutions.length))}
                  </p>
                  <div className="space-y-1.5">
                    {currentQuarter.quarter_substitutions
                      .sort((a: { minute: number }, b: { minute: number }) => a.minute - b.minute)
                      .map((sub: { id: string; minute: number; player_out?: { name: string; number: number | null }; player_in?: { name: string; number: number | null } }) => (
                        <div key={sub.id} className="flex items-center gap-2 text-[13px]">
                          <span className="text-[11px] font-bold w-8" style={{ color: 'var(--muted2)' }}>{sub.minute}&apos;</span>
                          <span className="text-red-400">{sub.player_out?.number ? `#${sub.player_out.number} ` : ''}{sub.player_out?.name}</span>
                          <span className="text-[color:var(--text)]/20">→</span>
                          <span style={{ color: 'var(--text)' }}>{sub.player_in?.number ? `#${sub.player_in.number} ` : ''}{sub.player_in?.name}</span>
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
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[color:var(--text)] text-sm font-bold" style={{ backgroundColor: POSITION_COLORS[record.position_type] }}>
                            {record.player?.number || '?'}
                          </div>
                          <div>
                            <p className="font-bold text-[color:var(--text)]">{record.player?.name}</p>
                            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{POSITION_LABELS[record.position_type]}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>{formatRating(record.rating)}</p>
                        </div>
                      </div>

                      <div className="mt-2 ml-11 flex flex-wrap gap-1.5">
                        {record.goals > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--text)' }}>{t.goals} {record.goals}</span>}
                        {record.assists > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--chipText)' }}>{t.assistsLabel} {record.assists}</span>}
                        {record.clean_sheet && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-900/50 text-purple-300">{t.cleanSheet}</span>}
                        {record.contribution > 0 && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{t.contribution}</span>}
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
                              <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--text)' }}>{t.praiseLabel}</p>
                              <p className="text-[13px] text-[color:var(--text)]/80">{record.praise_text}</p>
                            </div>
                          )}
                          {record.improvement_text && (
                            <div className="rounded-lg px-3 py-2" style={{ background: '#fef0c7' }}>
                              <p className="text-[10px] font-bold mb-0.5" style={{ color: '#b54708' }}>{t.improvementLabel}</p>
                              <p className="text-[13px] text-[color:var(--text)]/80">{record.improvement_text}</p>
                            </div>
                          )}
                          {record.highlight_text && (
                            <div className="rounded-lg px-3 py-2" style={{ background: 'var(--chip)' }}>
                              <p className="text-[10px] font-bold mb-0.5" style={{ color: 'var(--chipText)' }}>{t.highlightLabel}</p>
                              <p className="text-[13px] text-[color:var(--text)]/80">{record.highlight_text}</p>
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
              <h3 className="font-bold text-[color:var(--text)] flex items-center gap-2">
                <FileText className="w-4 h-4" style={{ color: 'var(--muted2)' }} />
                {t.matchNotes}
              </h3>
              {canEditMatches && !editingNotes && (
                <button onClick={() => setEditingNotes(true)} className="p-1.5 text-[color:var(--text)]/40 hover:text-[color:var(--text)] rounded-lg">
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
                  placeholder={t.matchNotePlaceholder}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none text-[color:var(--text)]"
                  style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleSaveNotes} disabled={savingNotes} className="flex-1 py-2.5 rounded-xl font-bold text-sm disabled:opacity-50" style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                    {savingNotes ? t.saving : t.save}
                  </button>
                  <button onClick={() => { setNotes(match.notes || ''); setEditingNotes(false) }} className="px-4 py-2.5 rounded-xl font-bold text-sm text-[color:var(--text)]/60" style={{ background: 'var(--card2)' }}>
                    {t.cancel}
                  </button>
                </div>
              </div>
            ) : match.notes ? (
              <p className="text-[13px] text-[color:var(--text)]/70 whitespace-pre-wrap">{match.notes}</p>
            ) : (
              <button onClick={() => setEditingNotes(true)} className="w-full py-4 border-2 border-dashed rounded-xl text-[13px] transition" style={{ borderColor: 'var(--line)', color: 'var(--muted2)' }}>
                {t.addNote}
              </button>
            )}
          </section>
        )}

        {/* Overall Player Stats */}
        {playerStats.length > 0 && (
          <section>
            <h3 className="font-bold text-[color:var(--text)] mb-3">{t.overallPlayerStats}</h3>
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
              {playerStats.map((stats, index) => (
                <div key={stats.playerId} className="p-4 flex items-center justify-between" style={{ borderTop: index > 0 ? '1px solid var(--line)' : 'none' }}>
                  <div className="flex items-center gap-3">
                    <span className="w-6 text-center font-bold text-[13px]" style={{ color: 'var(--muted2)' }}>{index + 1}</span>
                    <div>
                      <p className="font-bold text-[color:var(--text)] flex items-center gap-2">
                        {stats.playerName}
                        {index === 0 && mvp && <Star className="w-4 h-4 fill-current" style={{ color: 'var(--text)' }} />}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-0.5">
                        {stats.totalGoals > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--text)' }}>{t.goals} {stats.totalGoals}</span>}
                        {stats.totalAssists > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--chipText)' }}>{t.assistsLabel} {stats.totalAssists}</span>}
                        {stats.cleanSheets > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-purple-900/50 text-purple-300">{t.cleanSheet} {stats.cleanSheets}</span>}
                        {stats.avgContribution > 0 && <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">{t.contribution}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold font-display" style={{ color: 'var(--text)' }}>{stats.averageRating.toFixed(1)}</p>
                    <p className="text-[11px]" style={{ color: 'var(--muted2)' }}>{t.avgRatingShort}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <ConfirmSheet
        open={showDeleteConfirm}
        title={t.deleteMatchConfirm}
        description={t.deleteMatchDesc}
        confirmLabel={t.delete}
        danger
        onConfirm={() => { setShowDeleteConfirm(false); handleDeleteMatch() }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <BottomNav />
    </div>
  )
}
