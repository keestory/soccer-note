'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { TrainingType } from '@/types/database'
import { BottomNav } from '@/components/BottomNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { TRAINING_TYPE_COLORS } from '@/lib/training-colors'
import { PlayersListSkeleton } from '@/components/Skeleton'

const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"


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
  const now = Date.now()
  const weekAgo = now - 7 * 86400000
  const thisWeekCount = trainings.filter(tr => new Date(tr.training_date).getTime() >= weekAgo).length
  const totalMinutes = trainings.reduce((s, tr) => s + (tr.duration_minutes || 0), 0)

  return (
    <div className="light min-h-screen pb-nav" style={{ background: '#f5f6f8' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #eaecf0' }}>
        <div className="max-w-md mx-auto flex justify-between items-center" style={{ padding: '10px 22px 14px' }}>
          <div style={{ fontSize: 21, fontWeight: 700, color: '#101828' }}>{t.trainingLabel}</div>
          {canEdit && (
            <Link href="/training/new"
              className="flex items-center justify-center active:scale-95 transition"
              style={{ width: 36, height: 36, borderRadius: 11, background: '#101828', color: '#c8f542', fontSize: 20 }}>
              +
            </Link>
          )}
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
        <div className="max-w-md mx-auto flex flex-col" style={{ gap: 12, padding: '0 20px 16px' }}>
          {/* THIS WEEK summary */}
          <div className="flex justify-between items-end" style={{ background: '#101828', borderRadius: 20, padding: 20 }}>
            <div>
              <div style={{ fontFamily: BEBAS, fontSize: 12, letterSpacing: '.2em', color: '#c8f542' }}>{t.thisWeek}</div>
              <div className="flex items-baseline" style={{ gap: 8, marginTop: 8 }}>
                <span style={{ fontFamily: BEBAS, fontSize: 48, lineHeight: 0.8, color: '#fff' }}>{thisWeekCount}</span>
                <span style={{ fontSize: 13, color: '#98a2b3', fontWeight: 600 }}>{t.sessionsLabel}</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: BEBAS, fontSize: 26, color: '#c8f542', lineHeight: 1 }}>
                {totalMinutes}<span style={{ fontSize: 14, color: '#667085' }}>{t.minUnit}</span>
              </div>
              <div style={{ fontSize: 11, color: '#667085', marginTop: 2 }}>{t.cumulativeTrainingTime}</div>
            </div>
          </div>

          {trainings.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: 32, textAlign: 'center' }}>
              <p style={{ fontSize: 14, color: '#98a2b3', marginBottom: 4 }}>{t.noTrainings}</p>
              {canEdit && (
                <Link href="/training/new" className="inline-block" style={{ marginTop: 12, padding: '10px 20px', borderRadius: 12, fontWeight: 700, fontSize: 14, background: '#101828', color: '#c8f542' }}>
                  {t.firstTraining}
                </Link>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{t.recentTraining}</div>
              <div className="flex flex-col" style={{ gap: 9 }}>
                {trainings.map(tr => {
                  const color = TRAINING_TYPE_COLORS[tr.training_type] || '#888'
                  const d = new Date(tr.training_date)
                  return (
                    <Link key={tr.id} href={`/training/${tr.id}`}
                      className="flex items-center active:opacity-80 transition"
                      style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: '13px 15px', gap: 12 }}>
                      <div className="flex flex-col items-center justify-center flex-shrink-0"
                        style={{ width: 44, height: 44, borderRadius: 12, background: '#f2f4f7' }}>
                        <span style={{ fontSize: 9, color: '#98a2b3' }}>{String(d.getMonth() + 1).padStart(2, '0')}</span>
                        <span style={{ fontSize: 16, fontWeight: 700, color: '#101828', lineHeight: 1.05 }}>{String(d.getDate()).padStart(2, '0')}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center" style={{ fontSize: 14, fontWeight: 600, color: '#101828', gap: 6 }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span className="truncate">{TYPE_LABELS[tr.training_type as TrainingType] || tr.training_type}</span>
                        </div>
                        {tr.location && <div className="truncate" style={{ fontSize: 11, color: '#98a2b3', marginTop: 2 }}>{tr.location}</div>}
                      </div>
                      <span style={{ fontFamily: BEBAS, fontSize: 18, color: '#101828', flexShrink: 0 }}>{tr.duration_minutes}{t.minUnit}</span>
                    </Link>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </PullToRefresh>

      <BottomNav />
    </div>
  )
}
