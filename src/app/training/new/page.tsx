'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, MapPin, Calendar, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import type { TrainingType } from '@/types/database'

const TRAINING_TYPES: { key: TrainingType; emoji: string; label: string; color: string; activeColor: string }[] = [
  { key: 'mini-game', emoji: '⚡', label: '미니게임', color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-amber-400 bg-amber-50 text-amber-800 ring-2 ring-amber-300' },
  { key: 'passing',   emoji: '🎯', label: '패스',    color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-sky-400 bg-sky-50 text-sky-800 ring-2 ring-sky-300' },
  { key: 'shooting',  emoji: '🔥', label: '슛',     color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-red-400 bg-red-50 text-red-800 ring-2 ring-red-300' },
  { key: 'fitness',   emoji: '💪', label: '체력',   color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-green-400 bg-green-50 text-green-800 ring-2 ring-green-300' },
  { key: 'tactics',   emoji: '🧠', label: '전술',   color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-indigo-400 bg-indigo-50 text-indigo-800 ring-2 ring-indigo-300' },
  { key: 'mixed',     emoji: '🌀', label: '복합',   color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-primary-400 bg-primary-50 text-primary-800 ring-2 ring-primary-300' },
  { key: 'other',     emoji: '📋', label: '기타',   color: 'border-gray-100 text-gray-500 bg-gray-50', activeColor: 'border-gray-400 bg-gray-100 text-gray-700 ring-2 ring-gray-300' },
]

const DURATION_PRESETS = [30, 60, 90, 120]

export default function NewTrainingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0])
  const [trainingType, setTrainingType] = useState<TrainingType>('mixed')
  const [locationVal, setLocationVal] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')
  const supabase = createClient()

  useEffect(() => { loadTeam() }, [])

  const loadTeam = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const team = await resolveTeam(supabase, user.id)
    if (team && team.canEditMatches) {
      setTeamId(team.teamId)
    } else {
      toast.error(t.noCreateTrainingPermission)
      router.push('/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId) return
    setLoading(true)
    try {
      const user = await getSessionUser(supabase)
      const { data, error } = await supabase
        .from('training_sessions')
        .insert({
          team_id: teamId,
          training_date: trainingDate,
          training_type: trainingType,
          location: locationVal.trim() || null,
          duration_minutes: duration,
          notes: notes.trim() || null,
          created_by: user?.id || null,
        })
        .select()
        .single()
      if (error) throw error
      toast.success(t.trainingCreated)
      router.push(`/training/${data.id}`)
    } catch {
      toast.error(t.trainingCreateFailed)
    } finally {
      setLoading(false)
    }
  }

  const selectedType = TRAINING_TYPES.find(t => t.key === trainingType)

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-12">

      {/* Hero header */}
      <div className="relative overflow-hidden safe-top" style={{ background: 'linear-gradient(135deg, #0a1f0a 0%, #1a3f1a 55%, #2D5A27 100%)' }}>
        <div className="field-pattern absolute inset-0" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 130" fill="none" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="200" y2="140" stroke="rgba(163,230,53,0.18)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="380" y1="-10" x2="240" y2="140" stroke="rgba(163,230,53,0.10)" strokeWidth="1" strokeLinecap="round"/>
          <circle cx="50" cy="100" r="55" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1"/>
        </svg>
        <div className="relative px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">훈련</p>
            <h1 className="text-base font-black text-white">새 훈련 기록</h1>
          </div>
          <button
            form="training-form"
            type="submit"
            disabled={loading}
            className="bg-lime-400 text-[#0f2d0f] px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95 transition shadow-lg shadow-lime-400/30"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* Selected type preview */}
        <div className="relative px-4 pb-5">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-2xl">{selectedType?.emoji}</span>
            <div>
              <p className="text-white font-black">{selectedType?.label} 훈련</p>
              <p className="text-white/40 text-xs">{trainingDate} · {duration}분</p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        <form id="training-form" onSubmit={handleSubmit} className="space-y-3">

          {/* Training type */}
          <div className="bg-white rounded-2xl p-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">훈련 종류</label>
            <div className="grid grid-cols-4 gap-2">
              {TRAINING_TYPES.map(({ key, emoji, label, color, activeColor }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTrainingType(key)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-bold border transition ${
                    trainingType === key ? activeColor : `${color} hover:bg-gray-100`
                  }`}
                >
                  <span className="text-xl">{emoji}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Date */}
          <div className="bg-white rounded-2xl p-4">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              <Calendar className="w-3.5 h-3.5" /> 날짜
            </label>
            <input
              type="date"
              value={trainingDate}
              onChange={(e) => setTrainingDate(e.target.value)}
              required
              className="w-full text-base font-bold text-gray-900 outline-none"
            />
          </div>

          {/* Duration */}
          <div className="bg-white rounded-2xl p-4">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">
              <Clock className="w-3.5 h-3.5" /> 훈련 시간
            </label>
            <div className="flex gap-2 mb-3">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-black border transition ${
                    duration === d
                      ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}
                >
                  {d}분
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
              <button type="button" onClick={() => setDuration(Math.max(10, duration - 10))}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 font-bold text-lg active:bg-gray-100">−</button>
              <span className="flex-1 text-center text-xl font-black text-gray-900">{duration}분</span>
              <button type="button" onClick={() => setDuration(Math.min(480, duration + 10))}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-[#0f2d0f] font-bold text-lg active:bg-gray-100">+</button>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl p-4">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              <MapPin className="w-3.5 h-3.5" /> 장소 <span className="text-gray-300 normal-case font-medium">선택</span>
            </label>
            <input
              type="text"
              value={locationVal}
              onChange={(e) => setLocationVal(e.target.value)}
              className="w-full text-base font-bold text-gray-900 placeholder-gray-300 outline-none"
              placeholder={t.locationPlaceholder}
            />
          </div>

          {/* Notes */}
          <div className="bg-white rounded-2xl p-4">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              메모 <span className="text-gray-300 normal-case font-medium">선택</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full text-sm text-gray-800 placeholder-gray-300 outline-none resize-none leading-relaxed"
              placeholder={t.trainingNotesPlaceholder}
            />
          </div>
        </form>
      </main>
    </div>
  )
}
