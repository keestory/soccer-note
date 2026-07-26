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


const DURATION_PRESETS = [30, 60, 90, 120]

export default function NewTrainingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const TRAINING_TYPES: { key: TrainingType; label: string }[] = [
    { key: 'mini-game', label: t.trainingTypeMiniGame },
    { key: 'passing',   label: t.trainingTypePassing },
    { key: 'shooting',  label: t.trainingTypeShooting },
    { key: 'fitness',   label: t.trainingTypeFitness },
    { key: 'tactics',   label: t.trainingTypeTactics },
    { key: 'mixed',     label: t.trainingTypeMixed },
    { key: 'other',     label: t.trainingTypeOther },
  ]
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
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 -ml-2 rounded-xl" style={{ color: 'var(--muted2)' }}>
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-[20px] text-[color:var(--text)]">{t.trainingLabel}</h1>
              <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{t.newTraining}</p>
            </div>
          </div>
          <button form="training-form" type="submit" disabled={loading}
            className="px-4 py-2.5 rounded-[11px] font-black text-sm disabled:opacity-40 active:scale-95 transition"
            style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
            {loading ? t.saving : t.save}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto w-full px-5 py-5">
        <form id="training-form" onSubmit={handleSubmit} className="space-y-3">

          {/* Training type */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="block text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--muted1)' }}>{t.trainingType}</label>
            <div className="grid grid-cols-4 gap-2">
              {TRAINING_TYPES.map(({ key, label }) => {
                const c = TRAINING_TYPE_COLORS[key] || '#888'
                const active = trainingType === key
                return (
                  <button key={key} type="button" onClick={() => setTrainingType(key)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-[12px] text-xs font-bold transition"
                    style={{
                      background: active ? `${c}1f` : 'var(--card2)',
                      border: `1px solid ${active ? c : 'transparent'}`,
                      color: active ? c : 'var(--muted2)',
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
              <Calendar className="w-3.5 h-3.5" /> {t.trainingDate}
            </label>
            <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} required
              className="w-full font-bold text-base outline-none" style={{ background: 'transparent', color: '#fff', colorScheme: 'dark' }} />
          </div>

          {/* Duration */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--muted1)' }}>
              <Clock className="w-3.5 h-3.5" /> {t.trainingDuration}
            </label>
            <div className="flex gap-2 mb-3">
              {DURATION_PRESETS.map(d => (
                <button key={d} type="button" onClick={() => setDuration(d)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black transition"
                  style={{ background: duration === d ? 'var(--navy)' : 'var(--card2)', color: duration === d ? 'var(--accent)' : 'var(--muted2)', border: '1px solid transparent' }}>
                  {t.minutesN.replace('{n}', String(d))}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'var(--card2)' }}>
              <button type="button" onClick={() => setDuration(Math.max(10, duration - 10))}
                className="w-9 h-9 flex items-center justify-center rounded-xl font-bold text-lg"
                style={{ background: 'var(--card2)', color: 'var(--muted1)' }}>−</button>
              <span className="flex-1 text-center text-xl font-black text-[color:var(--text)]">{t.minutesN.replace('{n}', String(duration))}</span>
              <button type="button" onClick={() => setDuration(Math.min(480, duration + 10))}
                className="w-9 h-9 flex items-center justify-center rounded-xl font-bold text-lg"
                style={{ background: 'var(--card2)', color: 'var(--text)' }}>+</button>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--muted1)' }}>
              <MapPin className="w-3.5 h-3.5" /> {t.location} <span className="normal-case font-medium" style={{ color: 'var(--text-faint)' }}>{t.optional}</span>
            </label>
            <input type="text" value={locationVal} onChange={e => setLocationVal(e.target.value)}
              className="w-full font-bold text-base outline-none placeholder-[#98a2b3]"
              style={{ background: 'transparent', color: '#fff' }}
              placeholder={t.locationPlaceholder} />
          </div>

          {/* Notes */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <label className="block text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'var(--muted1)' }}>
              {t.trainingNotes} <span className="normal-case font-medium" style={{ color: 'var(--text-faint)' }}>{t.optional}</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full text-sm outline-none resize-none leading-relaxed placeholder-[#98a2b3]"
              style={{ background: 'transparent', color: '#ccc' }}
              placeholder={t.trainingNotesPlaceholder} />
          </div>
        </form>
      </main>
      <BottomNav />
    </div>
  )
}
