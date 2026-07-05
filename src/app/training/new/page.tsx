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
import { BottomNav } from '@/components/BottomNav'
import { TRAINING_TYPE_COLORS } from '@/lib/training-colors'

const TRAINING_TYPES: { key: TrainingType; label: string }[] = [
  { key: 'mini-game', label: '미니게임' },
  { key: 'passing',   label: '패스' },
  { key: 'shooting',  label: '슛' },
  { key: 'fitness',   label: '체력' },
  { key: 'tactics',   label: '전술' },
  { key: 'mixed',     label: '복합' },
  { key: 'other',     label: '기타' },
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

  const selectedTypeColor = TRAINING_TYPE_COLORS[trainingType] || '#888'
  const selectedTypeLabel = TRAINING_TYPES.find(t => t.key === trainingType)?.label || ''

  return (
    <div className="flex flex-col safe-top" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>

      {/* Header */}
      <header className="flex-shrink-0 sticky top-0 z-10" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl" style={{ color: '#555' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-[20px] text-white">훈련</h1>
              <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>새 훈련 기록</p>
            </div>
          </div>
          <button form="training-form" type="submit" disabled={loading}
            className="px-4 py-2.5 rounded-[11px] font-black text-sm disabled:opacity-40 active:scale-95 transition"
            style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
            {loading ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-5 py-5 safe-bottom">
        <form id="training-form" onSubmit={handleSubmit} className="space-y-3">

          {/* Training type */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="block text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--muted1)' }}>훈련 종류</label>
            <div className="grid grid-cols-4 gap-2">
              {TRAINING_TYPES.map(({ key, label }) => {
                const c = TRAINING_TYPE_COLORS[key] || '#888'
                const active = trainingType === key
                return (
                  <button key={key} type="button" onClick={() => setTrainingType(key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-[12px] text-xs font-bold transition"
                    style={{
                      background: active ? `${c}1f` : '#1a1a1a',
                      border: `1px solid ${active ? c : 'transparent'}`,
                      color: active ? c : '#555',
                    }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c }} />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Date */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--muted1)' }}>
              <Calendar className="w-3.5 h-3.5" /> 날짜
            </label>
            <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} required
              className="w-full font-bold text-base outline-none" style={{ background: 'transparent', color: '#fff', colorScheme: 'dark' }} />
          </div>

          {/* Duration */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--muted1)' }}>
              <Clock className="w-3.5 h-3.5" /> 훈련 시간
            </label>
            <div className="flex gap-2 mb-3">
              {DURATION_PRESETS.map(d => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black transition"
                  style={{ background: duration === d ? 'var(--accent)' : '#1a1a1a', color: duration === d ? '#0a0a0a' : '#555', border: '1px solid transparent' }}>
                  {d}분
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: '#151515' }}>
              <button type="button" onClick={() => setDuration(Math.max(10, duration - 10))}
                className="w-9 h-9 flex items-center justify-center rounded-xl font-bold text-lg"
                style={{ background: '#1e1e1e', color: '#888' }}>−</button>
              <span className="flex-1 text-center text-xl font-black text-white">{duration}분</span>
              <button type="button" onClick={() => setDuration(Math.min(480, duration + 10))}
                className="w-9 h-9 flex items-center justify-center rounded-xl font-bold text-lg"
                style={{ background: '#1e1e1e', color: 'var(--accent)' }}>+</button>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--muted1)' }}>
              <MapPin className="w-3.5 h-3.5" /> 장소 <span className="normal-case font-medium" style={{ color: '#444' }}>선택</span>
            </label>
            <input type="text" value={locationVal} onChange={e => setLocationVal(e.target.value)}
              className="w-full font-bold text-base outline-none placeholder-[#444]"
              style={{ background: 'transparent', color: '#fff' }}
              placeholder={t.locationPlaceholder} />
          </div>

          {/* Notes */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="block text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--muted1)' }}>
              메모 <span className="normal-case font-medium" style={{ color: '#444' }}>선택</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full text-sm outline-none resize-none leading-relaxed placeholder-[#444]"
              style={{ background: 'transparent', color: '#ccc' }}
              placeholder={t.trainingNotesPlaceholder} />
          </div>
        </form>
      </main>
      <BottomNav />
    </div>
  )
}
