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

const TRAINING_TYPE_STYLES: Record<TrainingType, string> = {
  'mini-game': 'bg-amber-100 text-amber-800 border border-amber-300',
  'passing':   'bg-sky-100 text-sky-800 border border-sky-300',
  'shooting':  'bg-red-100 text-red-800 border border-red-300',
  'fitness':   'bg-green-100 text-green-800 border border-green-300',
  'tactics':   'bg-indigo-100 text-indigo-800 border border-indigo-300',
  'mixed':     'bg-primary-100 text-primary-800 border border-primary-300',
  'other':     'bg-gray-100 text-gray-700 border border-gray-300',
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

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-20">
      {/* Hero header */}
      <div className="relative overflow-hidden safe-top" style={{ background: 'linear-gradient(135deg, #0a1f0a 0%, #1a3f1a 55%, #2D5A27 100%)' }}>
        <div className="field-pattern absolute inset-0" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 140" fill="none" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="200" y2="150" stroke="rgba(163,230,53,0.15)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="375" y1="-10" x2="235" y2="150" stroke="rgba(163,230,53,0.08)" strokeWidth="1" strokeLinecap="round"/>
          <circle cx="50" cy="110" r="55" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </svg>
        <div className="relative px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">훈련 기록</p>
            <h1 className="text-base font-black text-white">{getTypeLabel(training.training_type)}</h1>
          </div>
          {canEdit && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="relative px-4 pb-5">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-3xl">{TYPE_EMOJI[training.training_type]}</span>
            <div className="flex gap-4 text-sm">
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold">날짜</p>
                <p className="text-white font-bold">{formatDate(training.training_date)}</p>
              </div>
              <div>
                <p className="text-white/40 text-[10px] uppercase font-bold">시간</p>
                <p className="text-white font-bold">{training.duration_minutes}분</p>
              </div>
              {training.location && (
                <div>
                  <p className="text-white/40 text-[10px] uppercase font-bold">장소</p>
                  <p className="text-white font-bold truncate max-w-[100px]">{training.location}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 pb-12 space-y-3">
        {/* Training Info Card */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">훈련 정보</p>
            {canEdit && !editingInfo && (
              <button onClick={startEditInfo} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {editingInfo ? (
            <div className="space-y-3">
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {TRAINING_TYPES.map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setEditType(type)}
                    className={`px-2 py-1.5 rounded-lg text-xs font-medium border transition ${
                      editType === type
                        ? `${TRAINING_TYPE_STYLES[type]} ring-1 ring-primary-500`
                        : 'bg-white text-gray-500 border-gray-200'
                    }`}
                  >
                    {getTypeLabel(type)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder={t.locationPlaceholder}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <input
                type="number"
                value={editDuration}
                onChange={(e) => setEditDuration(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={480}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                placeholder={t.trainingNotesPlaceholder}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveInfo} className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition">
                  {t.save}
                </button>
                <button onClick={() => setEditingInfo(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
                  {t.cancel}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{formatDate(training.training_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>{training.duration_minutes}min</span>
              </div>
              {training.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span>{training.location}</span>
                </div>
              )}
              {training.notes && (
                <p className="pt-2 text-gray-500 border-t mt-2">{training.notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Attendance Section */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">참석 선수</p>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{displayAttendees.length}명</span>
            </div>
            {canEdit && (
              <button
                onClick={openAttendeePicker}
                className="px-3 py-1.5 bg-[#0f2d0f] text-lime-400 rounded-xl text-xs font-bold transition active:scale-95"
              >
                편집
              </button>
            )}
          </div>

          {displayAttendees.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">참석 선수를 추가해주세요</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {displayAttendees.map(a => (
                <div key={a.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                  <div className="w-8 h-8 bg-[#0f2d0f]/10 rounded-xl flex items-center justify-center text-[#0f2d0f] text-xs font-black">
                    {a.player?.number || '-'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-gray-800">{a.player?.name}</p>
                    {showFeedback && a.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                        <span className="text-xs font-semibold text-amber-600">{a.rating}</span>
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
          <div className="bg-white rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowEvaluation(!showEvaluation)}
              className="flex items-center justify-between w-full px-4 py-4"
            >
              <div className="flex items-center gap-2">
                <Star className="w-5 h-5 text-amber-500" />
                <span className="font-black text-gray-900">{t.trainingEvaluationOptional}</span>
              </div>
              {showEvaluation ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>

            {showEvaluation && (
              <div className="border-t border-gray-50 px-4 py-4 space-y-4">
                {attendees.map(a => {
                  const rating = evalData[a.player_id]?.rating ?? null
                  const ratingColor = rating === null ? 'text-gray-400' : rating <= 4 ? 'text-red-500' : rating <= 6 ? 'text-amber-500' : 'text-emerald-600'
                  return (
                    <div key={a.id} className="bg-gray-50 rounded-2xl p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-[#0f2d0f]/10 rounded-xl flex items-center justify-center text-[#0f2d0f] text-xs font-black">
                          {a.player?.number || '-'}
                        </div>
                        <span className="font-bold text-gray-900">{a.player?.name}</span>
                        <span className={`ml-auto text-2xl font-black font-mono tabular-nums ${ratingColor}`}>
                          {rating !== null ? rating.toFixed(1) : '−'}
                        </span>
                      </div>
                      {/* Rating stepper */}
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          type="button"
                          onClick={() => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], rating: Math.max(1, (prev[a.player_id]?.rating ?? 5) - 0.5) } }))}
                          className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-lg flex items-center justify-center active:bg-gray-100 flex-shrink-0"
                        >−</button>
                        <input
                          type="range" min={1} max={10} step={0.5}
                          value={evalData[a.player_id]?.rating ?? 5}
                          onChange={(e) => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], rating: parseFloat(e.target.value) } }))}
                          className="flex-1 h-2 appearance-none cursor-pointer rounded-full bg-gray-200 accent-[#0f2d0f]"
                        />
                        <button
                          type="button"
                          onClick={() => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], rating: Math.min(10, (prev[a.player_id]?.rating ?? 5) + 0.5) } }))}
                          className="w-10 h-10 rounded-xl bg-white border border-gray-200 text-[#0f2d0f] font-bold text-lg flex items-center justify-center active:bg-gray-100 flex-shrink-0"
                        >+</button>
                      </div>
                      <textarea
                        value={evalData[a.player_id]?.feedback || ''}
                        onChange={(e) => setEvalData(prev => ({ ...prev, [a.player_id]: { ...prev[a.player_id], feedback: e.target.value } }))}
                        rows={2}
                        className="w-full px-3 py-2 border-2 border-gray-100 focus:border-[#0f2d0f] rounded-xl text-sm outline-none resize-none bg-white"
                        placeholder={t.trainingFeedbackPlaceholder}
                      />
                    </div>
                  )
                })}

                <button
                  onClick={handleSaveEvaluation}
                  disabled={savingEval}
                  className="w-full py-3.5 rounded-2xl text-sm font-black disabled:opacity-50 transition active:scale-[0.98]"
                  style={{ background: '#0f2d0f', color: '#a3e635' }}
                >
                  {savingEval ? t.saving : `${t.save} 💾`}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Parent view: show feedback for linked player */}
        {isParent && showFeedback && displayAttendees.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-toss">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-amber-500" />
              {t.trainingEvaluation}
            </h2>
            {displayAttendees.map(a => (
              <div key={a.id} className="space-y-2">
                {a.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{t.rating}:</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="font-medium">{a.rating}</span>
                    </div>
                  </div>
                )}
                {a.feedback && (
                  <div>
                    <span className="text-sm text-gray-500">{t.trainingFeedback}:</span>
                    <p className="text-sm mt-1">{a.feedback}</p>
                  </div>
                )}
                {!a.rating && !a.feedback && (
                  <p className="text-gray-400 text-sm">{t.noRecord}</p>
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center safe-bottom">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[70vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-bold">{t.trainingAttendees}</h3>
              <button onClick={() => setShowAttendeePicker(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Select all */}
            <div className="px-4 py-2 border-b">
              <button
                onClick={() => {
                  if (selectedAttendees.size === allPlayers.length) {
                    setSelectedAttendees(new Set())
                  } else {
                    setSelectedAttendees(new Set(allPlayers.map(p => p.id)))
                  }
                }}
                className="text-sm text-primary-600 font-medium"
              >
                {selectedAttendees.size === allPlayers.length ? t.cancel : `${t.selectAttendees} (${allPlayers.length})`}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-1">
              {allPlayers.map(player => {
                const isSelected = selectedAttendees.has(player.id)
                return (
                  <button
                    key={player.id}
                    onClick={() => toggleAttendee(player.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
                      isSelected ? 'bg-primary-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'bg-primary-600 border-primary-600' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-6 text-right">
                        {player.number || '-'}
                      </span>
                      <span className="text-sm font-medium">{player.name}</span>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="p-4 border-t">
              <button
                onClick={saveAttendees}
                className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition"
              >
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
