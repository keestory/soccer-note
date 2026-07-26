'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, Clock } from 'lucide-react'
import type { TrainingType } from '@/types/database'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { TRAINING_TYPE_COLORS } from '@/lib/training-colors'
import { formatDate } from '@/lib/utils'
import { PlayersListSkeleton } from '@/components/Skeleton'


export default function TrainingListPage() {
  const router = useRouter()
  const data = useAppData()
  const { t } = useI18n()
  const TYPE_LABELS: Record<TrainingType, string> = {
    'mini-game': t.trainingTypeMiniGame, passing: t.trainingTypePassing, shooting: t.trainingTypeShooting,
    fitness: t.trainingTypeFitness, tactics: t.trainingTypeTactics, mixed: t.trainingTypeMixed, other: t.trainingTypeOther,
  }

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam])

  const isCoach = data.selectedTeam?.role === 'coach'
  const canEdit = isCoach || data.selectedTeam?.membership?.can_edit_matches || false

  if (data.loading) return <PlayersListSkeleton />

  const trainings = data.trainings as any[]
  const teamName = data.selectedTeam?.name || ''

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex justify-between items-center">
          <div>
            <h1 className="font-black text-[20px] text-[color:var(--text)]">{t.trainingLabel}</h1>
            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{teamName} · {t.trainingCountN.replace('{n}', String(trainings.length))}</p>
          </div>
          {canEdit && (
            <Link href="/training/new"
              className="w-9 h-9 flex items-center justify-center rounded-[11px] font-black active:scale-95 transition"
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
              <Plus className="w-5 h-5" />
            </Link>
          )}
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
        <div className="max-w-4xl mx-auto px-5 py-4">
          {trainings.length === 0 ? (
            <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <p className="text-[14px] mb-1" style={{ color: 'var(--muted2)' }}>{t.noTrainings}</p>
              {canEdit && (
                <Link href="/training/new" className="inline-block mt-3 px-5 py-2.5 rounded-xl font-black text-sm"
                  style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                  {t.firstTraining}
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {trainings.map(tr => {
                const color = TRAINING_TYPE_COLORS[tr.training_type] || '#888'
                const attendeeCount = (tr.training_attendees ?? []).length
                return (
                  <Link key={tr.id} href={`/training/${tr.id}`}
                    className="flex items-center gap-3 p-4 rounded-[14px] active:opacity-80 transition"
                    style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                      style={{ background: `${color}1f` }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] text-[color:var(--text)]">
                        {TYPE_LABELS[tr.training_type as TrainingType] || tr.training_type}
                      </p>
                      <div className="flex items-center gap-2 text-[12px] mt-0.5" style={{ color: 'var(--muted2)' }}>
                        <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" />{t.minutesN.replace('{n}', String(tr.duration_minutes))}</span>
                        {tr.location && <span className="flex items-center gap-0.5 truncate"><MapPin className="w-3 h-3" />{tr.location}</span>}
                        {attendeeCount > 0 && <span>{t.attendCountN.replace('{n}', String(attendeeCount))}</span>}
                      </div>
                    </div>
                    <p className="text-[12px] flex-shrink-0" style={{ color: 'var(--muted2)' }}>{formatDate(tr.training_date)}</p>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </PullToRefresh>

      <BottomNav />
    </div>
  )
}
