'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Edit2, Trash2, Users, MapPin, Calendar, Check, Clock, X, Star, ChevronDown, ChevronUp } from 'lucide-react'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import type { Player, TrainingSession, TrainingAttendee, TrainingType, TeamVisibilitySettings } from '@/types/database'
import { formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { TrainingDetailSkeleton } from '@/components/Skeleton'
import { BottomNav } from '@/components/BottomNav'

const TRAINING_TYPES: TrainingType[] = ['mini-game', 'passing', 'shooting', 'fitness', 'tactics', 'mixed', 'other']

const TRAINING_TYPE_LABEL_KEYS: Record<TrainingType, string> = {
  'mini-game': 'trainingTypeMiniGame',
  'passing': 'trainingTypePassing',
  'shooting': 'trainingTypeShooting',
  'fitness': 'trainingTypeFitness',
  'tactics': 'trainingTypeTactics',
  'mixed': 'trainingTypeMixed',
  'other': 'trainingTypeOther',
}

const TRAINING_TYPE_STYLES: Record<TrainingType, { bg: string; color: string }> = {
  'mini-game': { bg: '#1a1200', color: '#f59e0b' },
  'passing':   { bg: '#001a2a', color: '#38bdf8' },
  'shooting':  { bg: '#2a0a0a', color: '#ef4444' },
  'fitness':   { bg: '#002a1a', color: '#2dd4bf' },
  'tactics':   { bg: '#120a2a', color: '#6366f1' },
  'mixed':     { bg: '#1a2a00', color: '#a3e635' },
  'other':     { bg: '#1a1a1a', color: '#666' },
}

export default function TrainingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const trainingId = params.id as string
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [training, setTraining] = useState<TrainingSession | null>(null)
  const [attendees, setAttendees] = useState<TrainingAttendee[]>([])
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [showAttendeePicker, setShowAttendeePicker] = useState(false)
  const [selectedAttendees, setSelectedAttendees] = useState<Set<string>>(new Set())
  const [canEdit, setCanEdit] = useState(false)
  const [isParent, setIsParent] = useState(false)
  const [linkedPlayerId, setLinkedPlayerId] = useState<string | null>(null)
  const [visibilitySettings, setVisibilitySettings] = useState<TeamVisibilitySettings | null>(null)

  // Edit training info
  const [editingInfo, setEditingInfo] = useState(false)
  const [editDate, setEditDate] = useState('')
  const [editType, setEditType] = useState<TrainingType>('mixed')
  const [editLocation, setEditLocation] = useState('')
  const [editDuration, setEditDuration] = useState(60)
  const [editNotes, setEditNotes] = useState('')

  // Player evaluation
  const [showEvaluation, setShowEvaluation] = useState(false)
  const [evalData, setEvalData] = useState<Record<string, { rating: number | null; feedback: string }>>({})
  const [savingEval, setSavingEval] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    loadTraining()
  }, [trainingId])

  const getTypeLabel = (type: TrainingType): string => {
    const key = TRAINING_TYPE_LABEL_KEYS[type]
    return (t as unknown as Record<string, string>)[key] || type
  }

  const loadTraining = async () => {
    const user = await getSessionUser(supabase)
    if (!user) {
      router.push('/login')
      return
    }

    const { data, error } = await supabase
      .from('training_sessions')
      .select('*')
      .eq('id', trainingId)
      .single()

    if (error || !data) {
      toast.error(t.trainingLoadFailed)
      router.push('/dashboard')
      return
    }

    setTraining(data)

    // Check permissions
    const { data: team } = await supabase
      .from('teams')
      .select('user_id')
      .eq('id', data.team_id)
      .single()

    if (team?.user_id === user.id) {
      setCanEdit(true)
    } else {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role, can_edit_matches, linked_player_id')
        .eq('team_id', data.team_id)
        .eq('user_id', user.id)
        .single()

      if (membership) {
        const isCoach = membership.role === 'coach'
        setCanEdit(isCoach || membership.can_edit_matches)
        setIsParent(membership.role === 'parent')
        if (membership.role === 'parent') {
          setLinkedPlayerId(membership.linked_player_id || null)
        }
      }
    }

    // Load visibility settings
    const { data: visSettings } = await supabase
      .from('team_visibility_settings')
      .select('*')
      .eq('team_id', data.team_id)
      .single()

    if (visSettings) {
      setVisibilitySettings(visSettings)
    }

    // Load attendees
    const { data: attendeesData } = await supabase
      .from('training_attendees')
      .select('*, player:players(*)')
      .eq('training_id', trainingId)

    if (attendeesData) {
      setAttendees(attendeesData)
      // Init eval data
      const evalInit: Record<string, { rating: number | null; feedback: string }> = {}
      attendeesData.forEach(a => {
        evalInit[a.player_id] = {
          rating: a.rating,
          feedback: a.feedback || '',
        }
      })
      setEvalData(evalInit)
    }

    // Load all team players
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

  const openAttendeePicker = () => {
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

    if (toAdd.length > 0) {
      const { error } = await supabase
        .from('training_attendees')
        .insert(toAdd.map(player_id => ({ training_id: trainingId, player_id })))
      if (error) {
        console.error('training_attendees insert error:', error)
        toast.error(`${t.trainingAttendeeSaveFailed}: ${error.message}`)
        return
      }
    }

    if (toRemove.length > 0) {
      const { error } = await supabase
        .from('training_attendees')
        .delete()
        .in('id', toRemove.map(a => a.id))
      if (error) {
        console.error('training_attendees delete error:', error)
        toast.error(`${t.trainingAttendeeSaveFailed}: ${error.message}`)
        return
      }
    }

    // Reload attendees
    const { data } = await supabase
      .from('training_attendees')
      .select('*, player:players(*)')
      .eq('training_id', trainingId)

    if (data) {
      setAttendees(data)
      const evalInit: Record<string, { rating: number | null; feedback: string }> = {}
      data.forEach(a => {
        evalInit[a.player_id] = {
          rating: a.rating,
          feedback: a.feedback || '',
        }
      })
      setEvalData(evalInit)
    }
    setShowAttendeePicker(false)
    toast.success(t.trainingAttendeeSaved)
  }

  const startEditInfo = () => {
    if (!training) return
    setEditDate(training.training_date)
    setEditType(training.training_type)
    setEditLocation(training.location || '')
    setEditDuration(training.duration_minutes)
    setEditNotes(training.notes || '')
    setEditingInfo(true)
  }

  const handleSaveInfo = async () => {
    if (!training || !editDate) return

    const { error } = await supabase
      .from('training_sessions')
      .update({
        training_date: editDate,
        training_type: editType,
        location: editLocation.trim() || null,
        duration_minutes: editDuration,
        notes: editNotes.trim() || null,
      })
      .eq('id', trainingId)

    if (error) {
      toast.error(t.trainingInfoSaveFailed)
      return
    }

    setTraining(prev => prev ? {
      ...prev,
      training_date: editDate,
      training_type: editType,
      location: editLocation.trim() || null,
      duration_minutes: editDuration,
      notes: editNotes.trim() || null,
    } : null)
    setEditingInfo(false)
    toast.success(t.trainingInfoSaved)
  }

  const handleSaveEvaluation = async () => {
    setSavingEval(true)
    try {
      for (const attendee of attendees) {
        const eval_ = evalData[attendee.player_id]
        if (!eval_) continue

        const { error } = await supabase
          .from('training_attendees')
          .update({
            rating: eval_.rating,
            feedback: eval_.feedback.trim() || null,
          })
          .eq('id', attendee.id)

        if (error) {
          toast.error(t.trainingEvalSaveFailed)
          setSavingEval(false)
          return
        }
      }
      toast.success(t.trainingEvalSaved)
    } finally {
      setSavingEval(false)
    }
  }

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async () => {

    const { error } = await supabase
      .from('training_sessions')
      .delete()
      .eq('id', trainingId)

    if (error) {
      toast.error(t.deleteFailed)
      return
    }

    toast.success(t.trainingDeleted)
    router.push('/dashboard')
  }

  if (loading) {
    return <TrainingDetailSkeleton />
  }

  if (!training) return null

  // Parent filter
  const displayAttendees = isParent && linkedPlayerId
    ? attendees.filter(a => a.player_id === linkedPlayerId)
    : attendees

  const showFeedback = !isParent || (visibilitySettings?.show_training_feedback ?? false)

  const TYPE_EMOJI: Record<TrainingType, string> = {
    'mini-game': '⚡', 'passing': '🎯', 'shooting': '🔥',
    'fitness': '💪', 'tactics': '🧠', 'mixed': '🌀', 'other': '📋',
  }

  const cardStyle = { background: '#111010', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 10 }

  return (
    <div className="min-h-screen pb-nav" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>훈련 기록</p>
            <h1 className="text-base font-black text-white">{getTypeLabel(training.training_type)}</h1>
          </div>
          {canEdit && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl text-white/40 hover:text-red-400">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Summary card */}
      <div className="px-4 pt-4">
        <div className="p-4 rounded-2xl flex items-center gap-3" style={cardStyle}>
          <span className="text-3xl">{TYPE_EMOJI[training.training_type]}</span>
          <div className="flex gap-5 text-sm">
            {[
              { label: '날짜', val: formatDate(training.training_date) },
              { label: '시간', val: `${training.duration_minutes}분` },
              ...(training.location ? [{ label: '장소', val: training.location }] : []),
            ].map(item => (
              <div key={item.label}>
                <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>{item.label}</p>
                <p className="text-white font-bold text-[13px]">{item.val}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 pb-12 space-y-3">
        {/* Training Info Card */}
        <div className="p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>훈련 정보</p>
            {canEdit && !editingInfo && (
              <button onClick={startEditInfo} className="p-1.5 text-white/40 hover:text-white rounded-xl">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingInfo ? (
            <div className="space-y-3">
              <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none text-white" style={inputStyle} />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {TRAINING_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditType(type)}
                    className="px-2 py-1.5 rounded-lg text-xs font-bold border-2 transition"
                    style={{
                      background: editType === type ? TRAINING_TYPE_STYLES[type].bg : '#1a1a1a',
                      color: editType === type ? TRAINING_TYPE_STYLES[type].color : 'var(--muted2)',
                      borderColor: editType === type ? TRAINING_TYPE_STYLES[type].color : '#2a2a2a',
                    }}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
              <input type="text" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} placeholder={t.locationPlaceholder} className="w-full px-3 py-2 rounded-lg text-sm outline-none text-white placeholder:text-white/20" style={inputStyle} />
              <input type="number" value={editDuration} onChange={(e) => setEditDuration(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={480} className="w-full px-3 py-2 rounded-lg text-sm outline-none text-white" style={inputStyle} />
              <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={2} placeholder={t.trainingNotesPlaceholder} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none text-white placeholder:text-white/20" style={inputStyle} />
              <div className="flex gap-2">
                <button onClick={handleSaveInfo} className="flex-1 py-2 rounded-lg text-sm font-bold" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>{t.save}</button>
                <button onClick={() => setEditingInfo(false)} className="px-4 py-2 rounded-lg text-sm font-bold text-white/50" style={{ background: '#1a1a1a' }}>{t.cancel}</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-[13px]" style={{ color: 'var(--muted2)' }}>
              <div className="flex items-center gap-2"><Calendar className="w-4 h-4" /><span>{formatDate(training.training_date)}</span></div>
              <div className="flex items-center gap-2"><Clock className="w-4 h-4" /><span>{training.duration_minutes}min</span></div>
              {training.location && <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{training.location}</span></div>}
              {training.notes && <p className="pt-2 text-white/50" style={{ borderTop: '1px solid var(--line)', marginTop: 8 }}>{training.notes}</p>}
            </div>
          )}
        </div>

        {/* Attendance Section */}
        <div className="p-4" style={cardStyle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>참석 선수</p>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>{displayAttendees.length}명</span>
            </div>
            {canEdit && (
              <button onClick={openAttendeePicker} className="px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>편집</button>
            )}
          </div>

          {displayAttendees.length === 0 ? (
            <p className="text-[13px] text-center py-6" style={{ color: 'var(--muted2)' }}>참석 선수를 추가해주세요</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {displayAttendees.map(a => (
                <div key={a.id} className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: '#1a1a1a' }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>
                    {a.player?.number || '-'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-bold truncate text-white">{a.player?.name}</p>
                    {showFeedback && a.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-current" style={{ color: 'var(--accent)' }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{a.rating}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Player Evaluation Section */}
        {canEdit && attendees.length > 0 && (
          <div className="overflow-hidden" style={cardStyle}>
            <button onClick={() => setShowEvaluation(!showEvaluation)} className="flex items-center justify-between w-full px-4 py-4">
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 fill-current" style={{ color: 'var(--accent)' }} />
                <span className="font-black text-white">{t.trainingEvaluationOptional}</span>
              </div>
              {showEvaluation ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
            </button>

            {showEvaluation && (
              <div className="px-4 py-4 space-y-4" style={{ borderTop: '1px solid var(--line)' }}>
                {attendees.map(a => {
                  const rating = evalData[a.player_id]?.rating ?? null
                  const ratingColor = rating === null ? 'var(--muted2)' : rating <= 4 ? '#ef4444' : rating <= 6 ? '#f59e0b' : 'var(--accent)'
                  return (
                    <div key={a.id} className="p-3 rounded-2xl" style={{ background: '#1a1a1a' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>{a.player?.number || '-'}</div>
                        <span className="font-bold text-white">{a.player?.name}</span>
                        <span className="ml-auto text-2xl font-black font-display tabular-nums" style={{ color: ratingColor }}>
                          {rating !== null ? rating.toFixed(1) : '−'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <button type="button" onClick={() => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], rating: Math.max(1, (prev[a.player_id]?.rating ?? 5) - 0.5) } }))}
                          className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: '#2a2a2a' }}>−</button>
                        <input type="range" min={1} max={10} step={0.5}
                          value={evalData[a.player_id]?.rating ?? 5}
                          onChange={(e) => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], rating: parseFloat(e.target.value) } }))}
                          className="flex-1 h-2 appearance-none cursor-pointer rounded-full"
                          style={{ accentColor: 'var(--accent)', background: '#2a2a2a' }}
                        />
                        <button type="button" onClick={() => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], rating: Math.min(10, (prev[a.player_id]?.rating ?? 5) + 0.5) } }))}
                          className="w-10 h-10 rounded-xl font-bold text-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>+</button>
                      </div>
                      <textarea value={evalData[a.player_id]?.feedback || ''} onChange={(e) => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], feedback: e.target.value } }))}
                        rows={2} className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none text-white placeholder:text-white/20" style={inputStyle}
                        placeholder={t.trainingFeedbackPlaceholder} />
                    </div>
                  )
                })}

                <button onClick={handleSaveEvaluation} disabled={savingEval} className="w-full py-3.5 rounded-2xl text-sm font-black disabled:opacity-50 transition active:scale-[0.98]" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                  {savingEval ? t.saving : `${t.save} 💾`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Parent view */}
        {isParent && showFeedback && displayAttendees.length > 0 && (
          <div className="p-5 rounded-xl" style={cardStyle}>
            <h2 className="text-[15px] font-bold flex items-center gap-2 mb-3 text-white">
              <Star className="w-5 h-5 fill-current" style={{ color: 'var(--accent)' }} />
              {t.trainingEvaluation}
            </h2>
            {displayAttendees.map(a => (
              <div key={a.id} className="space-y-2">
                {a.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm" style={{ color: 'var(--muted2)' }}>{t.rating}:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" style={{ color: 'var(--accent)' }} />
                      <span className="font-bold text-white">{a.rating}</span>
                    </div>
                  </div>
                )}
                {a.feedback && (
                  <div>
                    <span className="text-sm" style={{ color: 'var(--muted2)' }}>{t.trainingFeedback}:</span>
                    <p className="text-[13px] mt-1 text-white/70">{a.feedback}</p>
                  </div>
                )}
                {!a.rating && !a.feedback && (
                  <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{t.noRecord}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <ConfirmSheet
        open={showDeleteConfirm}
        title="훈련을 삭제할까요?"
        description="삭제하면 참석 기록과 평가가 모두 사라져요"
        confirmLabel="삭제"
        danger
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Attendee Picker Modal */}
      {showAttendeePicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center safe-bottom">
          <div className="rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col" style={cardStyle}>
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--line)' }}>
              <h3 className="font-bold text-white">{t.trainingAttendees}</h3>
              <button onClick={() => setShowAttendeePicker(false)} className="p-1 text-white/40 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
            </div>

            <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--line)' }}>
              <button
                onClick={() => {
                  if (selectedAttendees.size === allPlayers.length) setSelectedAttendees(new Set())
                  else setSelectedAttendees(new Set(allPlayers.map(p => p.id)))
                }}
                className="text-sm font-bold" style={{ color: 'var(--accent)' }}
              >
                {selectedAttendees.size === allPlayers.length ? t.cancel : `${t.selectAttendees} (${allPlayers.length})`}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {allPlayers.map(player => {
                const isSelected = selectedAttendees.has(player.id)
                return (
                  <button key={player.id} onClick={() => toggleAttendee(player.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg transition"
                    style={{ background: isSelected ? 'var(--chip)' : 'transparent' }}
                  >
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: isSelected ? 'var(--accent)' : '#2a2a2a', background: isSelected ? 'var(--accent)' : 'transparent' }}>
                      {isSelected && <Check className="w-4 h-4" style={{ color: '#0a0a0a' }} />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs w-6 text-right" style={{ color: 'var(--muted2)' }}>{player.number || '-'}</span>
                      <span className="text-sm font-medium text-white">{player.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-4" style={{ borderTop: '1px solid var(--line)' }}>
              <button onClick={saveAttendees} className="w-full py-3 rounded-lg font-bold" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                {t.save} ({selectedAttendees.size}{t.persons})
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
