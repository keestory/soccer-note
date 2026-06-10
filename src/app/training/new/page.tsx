'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import type { TrainingType } from '@/types/database'

const TRAINING_TYPES: { key: TrainingType; color: string }[] = [
  { key: 'mini-game', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { key: 'passing', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { key: 'shooting', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { key: 'fitness', color: 'bg-gray-50 text-gray-600 border-gray-200' },
  { key: 'tactics', color: 'bg-gray-100 text-gray-700 border-gray-300' },
  { key: 'mixed', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  { key: 'other', color: 'bg-gray-50 text-gray-500 border-gray-200' },
]

const DURATION_PRESETS = [30, 60, 90, 120]

const TRAINING_TYPE_LABEL_MAP: Record<TrainingType, keyof ReturnType<typeof useI18n>['t'] extends string ? string : never> = {
  'mini-game': 'trainingTypeMiniGame',
  'passing': 'trainingTypePassing',
  'shooting': 'trainingTypeShooting',
  'fitness': 'trainingTypeFitness',
  'tactics': 'trainingTypeTactics',
  'mixed': 'trainingTypeMixed',
  'other': 'trainingTypeOther',
}

export default function NewTrainingPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)

  // Form state
  const [trainingDate, setTrainingDate] = useState(new Date().toISOString().split('T')[0])
  const [trainingType, setTrainingType] = useState<TrainingType>('mixed')
  const [locationVal, setLocationVal] = useState('')
  const [duration, setDuration] = useState(60)
  const [notes, setNotes] = useState('')

  const supabase = createClient()

  useEffect(() => {
    loadTeam()
  }, [])

  const loadTeam = async () => {
    const user = await getSessionUser(supabase)
    if (!user) {
      router.push('/login')
      return
    }

    // Resolve the active team (cached across tabs — skips repeat queries)
    const team = await resolveTeam(supabase, user.id)

    if (team && team.canEditMatches) {
      setTeamId(team.teamId)
      if (!localStorage.getItem('selectedTeamId')) {
        localStorage.setItem('selectedTeamId', team.teamId)
      }
    } else {
      toast.error(t.noCreateTrainingPermission)
      router.push('/dashboard')
    }
  }

  const getTypeLabel = (type: TrainingType): string => {
    const key = TRAINING_TYPE_LABEL_MAP[type]
    return (t as unknown as Record<string, string>)[key] || type
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
    } catch (error) {
      toast.error(t.trainingCreateFailed)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <h1 className="text-xl font-bold">{t.newTraining}</h1>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-toss space-y-5">
          {/* Training Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.trainingDate}
            </label>
            <input
              type="date"
              value={trainingDate}
              onChange={(e) => setTrainingDate(e.target.value)}
              required
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Training Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.trainingType}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TRAINING_TYPES.map(({ key, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTrainingType(key)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition ${
                    trainingType === key
                      ? `${color} ring-2 ring-blue-500`
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {getTypeLabel(key)}
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t.trainingDuration}
            </label>
            <div className="flex gap-2 mb-2">
              {DURATION_PRESETS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium border transition ${
                    duration === d
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {d}{t.trainingDuration.includes('분') ? '분' : 'min'}
                </button>
              ))}
            </div>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              max={480}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.location}
            </label>
            <input
              type="text"
              value={locationVal}
              onChange={(e) => setLocationVal(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={t.locationPlaceholder}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t.trainingNotes}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              placeholder={t.trainingNotesPlaceholder}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? t.creating : t.newTrainingRecord}
          </button>
        </form>
      </main>
    </div>
  )
}
