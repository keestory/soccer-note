'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, CheckCircle, MessageCircle, Swords } from 'lucide-react'
import type { MatchApplication, MatchPost } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { ConfirmSheet } from '@/components/ConfirmSheet'

export default function ApplicationsPage() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<MatchPost | null>(null)
  const [applications, setApplications] = useState<MatchApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string | null>(null)
  const [confirmAccept, setConfirmAccept] = useState<MatchApplication | null>(null)
  const supabase = createClient()

  useEffect(() => { init() }, [postId])

  const init = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const resolved = await resolveTeam(supabase, user.id)
    if (!resolved) { router.push('/dashboard'); return }

    const { data: postData } = await supabase
      .from('match_posts')
      .select('*')
      .eq('id', postId)
      .eq('team_id', resolved.teamId)
      .single()

    if (!postData) { toast.error(t.noAccessPost); router.back(); return }
    setPost(postData)
    loadApplications()
  }

  const loadApplications = async () => {
    const { data } = await supabase
      .from('match_applications')
      .select('*, applying_team:teams(id, name), applying_team_profile:team_public_profiles(emoji, bio, level, region)')
      .eq('post_id', postId)
      .order('created_at', { ascending: false })
    setApplications(data || [])
    setLoading(false)
  }

  const handleAccept = async (app: MatchApplication) => {
    if (!post) return
    setAccepting(app.id)

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        team_id: post.team_id,
        opponent: (app as any).applying_team?.name || '상대팀',
        match_date: post.match_date,
        location: post.location,
        home_score: 0,
        away_score: 0,
        notes: '커뮤니티 매칭으로 성사된 경기입니다',
      })
      .select('id')
      .single()

    if (matchError) { toast.error(t.matchCreateFail); setAccepting(null); return }

    await Promise.all([
      supabase.from('match_applications').update({ status: 'accepted', match_id: match.id }).eq('id', app.id),
      supabase.from('match_posts').update({ status: 'matched' }).eq('id', postId),
      supabase.from('match_applications').update({ status: 'rejected' }).eq('post_id', postId).eq('status', 'pending').neq('id', app.id),
    ])

    toast.success(t.matchSuccessMsg)
    setAccepting(null)
    setConfirmAccept(null)
    loadApplications()
  }

  const handleReject = async (appId: string) => {
    const { error } = await supabase.from('match_applications').update({ status: 'rejected' }).eq('id', appId)
    if (error) toast.error(t.rejectApplyFailed)
    else { toast.success(t.applyRejected); loadApplications() }
  }

  const pending = applications.filter(a => a.status === 'pending')
  const decided = applications.filter(a => a.status !== 'pending')

  return (
    <div className="min-h-screen pb-12" style={{ background: '#0a0a0a' }}>

      {/* Hero */}
      <div className="relative overflow-hidden safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="absolute inset-0 field-pattern opacity-20" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="220" y2="110" stroke="rgba(204,255,0,0.08)" strokeWidth="1.5" />
          <line x1="380" y1="-10" x2="260" y2="110" stroke="rgba(204,255,0,0.04)" strokeWidth="1" />
        </svg>
        <div className="relative px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.receivedApplications}</p>
            {post && <p className="text-sm font-black text-white truncate">{post.title}</p>}
          </div>
          {pending.length > 0 && (
            <div className="text-sm font-black px-3 py-1.5 rounded-xl" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
              {t.nWaiting.replace('{n}', String(pending.length))}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="rounded-2xl h-28 animate-pulse" style={{ background: '#111010' }} />)}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mx-auto mb-3" style={{ background: '#1a1a1a' }}>📭</div>
            <p className="font-bold text-white">{t.noApplicationsYet}</p>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{t.noApplyDesc}</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'var(--accent)' }}>{t.waitingLabel}</span>
                  <span className="w-5 h-5 text-[10px] font-black rounded-full flex items-center justify-center"
                    style={{ background: 'var(--chip)', color: 'var(--accent)' }}>{pending.length}</span>
                </div>
                <div className="space-y-3">
                  {pending.map(app => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onAccept={() => setConfirmAccept(app)}
                      onReject={() => handleReject(app.id)}
                      loading={accepting === app.id}
                      postMatched={post?.status === 'matched'}
                    />
                  ))}
                </div>
              </section>
            )}

            {decided.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-black uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.processedLabel}</span>
                </div>
                <div className="space-y-3">
                  {decided.map(app => (
                    <AppCard
                      key={app.id}
                      app={app}
                      onAccept={() => {}}
                      onReject={() => {}}
                      loading={false}
                      postMatched={true}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {confirmAccept && (
        <ConfirmSheet
          open={true}
          title={t.acceptTeamQ.replace('{team}', (confirmAccept as any).applying_team?.name ?? '')}
          description={t.acceptDesc}
          confirmLabel={t.acceptLabel}
          onConfirm={() => handleAccept(confirmAccept)}
          onCancel={() => setConfirmAccept(null)}
        />
      )}
    </div>
  )
}

function AppCard({ app, onAccept, onReject, loading, postMatched }: {
  app: MatchApplication; onAccept: () => void; onReject: () => void
  loading: boolean; postMatched: boolean
}) {
  const { t } = useI18n()
  const profile = (app as any).applying_team_profile
  const team = (app as any).applying_team

  const statusConfig = {
    accepted: { label: t.acceptedLabel, bg: '#052e16', color: '#4ade80' },
    rejected: { label: t.rejectedLabel, bg: '#1a1a1a', color: 'rgba(255,255,255,0.4)' },
    pending: { label: t.waitingLabel, bg: '#451a03', color: '#fbbf24' },
  }[app.status]

  const accentLine = app.status === 'accepted' ? '#166534' : app.status === 'rejected' ? '#2a2a2a' : 'var(--accent)'

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: '#111010',
        border: `1px solid ${app.status === 'accepted' ? '#166534' : 'var(--line)'}`,
      }}>
      {/* Top accent line */}
      <div className="h-0.5" style={{ background: accentLine }} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'var(--chip)' }}>
            {profile?.emoji || '⚽'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-white">{team?.name}</p>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-lg"
                style={{ background: statusConfig.bg, color: statusConfig.color }}>
                {statusConfig.label}
              </span>
            </div>
            {profile?.level && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {profile.level}{profile.region ? ` · ${profile.region}` : ''}
              </p>
            )}
          </div>
          <span className="text-[11px] flex-shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {format(parseISO(app.created_at), 'M/d HH:mm', { locale: ko })}
          </span>
        </div>

        {app.message && (
          <div className="rounded-xl p-3 mb-3 flex gap-2" style={{ background: '#1a1a1a' }}>
            <MessageCircle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{app.message}</p>
          </div>
        )}

        {app.status === 'pending' && !postMatched && (
          <div className="flex gap-2">
            <button onClick={onReject} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition disabled:opacity-50"
              style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.6)' }}>
              {t.reject}
            </button>
            <button onClick={onAccept} disabled={loading}
              className="flex-[2] py-2.5 rounded-xl text-sm font-black active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
              <Swords className="w-4 h-4" />
              {loading ? t.processing : t.acceptLabel}
            </button>
          </div>
        )}

        {app.status === 'accepted' && (
          <div className="flex items-center gap-2 rounded-xl p-2.5" style={{ background: '#052e16' }}>
            <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#4ade80' }} />
            <p className="text-xs font-bold" style={{ color: '#4ade80' }}>{t.matchAutoCreated}</p>
          </div>
        )}
      </div>
    </div>
  )
}
