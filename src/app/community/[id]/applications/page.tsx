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
import { ConfirmSheet } from '@/components/ConfirmSheet'

export default function ApplicationsPage() {
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

    if (!postData) { toast.error('접근 권한이 없어요'); router.back(); return }
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

    if (matchError) { toast.error('경기 생성에 실패했어요'); setAccepting(null); return }

    await Promise.all([
      supabase.from('match_applications').update({ status: 'accepted', match_id: match.id }).eq('id', app.id),
      supabase.from('match_posts').update({ status: 'matched' }).eq('id', postId),
      supabase.from('match_applications').update({ status: 'rejected' }).eq('post_id', postId).eq('status', 'pending').neq('id', app.id),
    ])

    toast.success('매칭 성사! 🎉 경기가 등록됐어요')
    setAccepting(null)
    setConfirmAccept(null)
    loadApplications()
  }

  const handleReject = async (appId: string) => {
    const { error } = await supabase.from('match_applications').update({ status: 'rejected' }).eq('id', appId)
    if (error) toast.error('거절에 실패했어요')
    else { toast.success('신청을 거절했어요'); loadApplications() }
  }

  const pending = applications.filter(a => a.status === 'pending')
  const decided = applications.filter(a => a.status !== 'pending')

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-12">

      {/* Hero */}
      <div className="relative bg-[#0f2d0f] overflow-hidden safe-top">
        <div className="absolute inset-0 field-pattern opacity-60" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="220" y2="110" stroke="rgba(163,230,53,0.12)" strokeWidth="1.5" />
          <line x1="380" y1="-10" x2="260" y2="110" stroke="rgba(163,230,53,0.07)" strokeWidth="1" />
        </svg>
        <div className="relative px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">받은 신청</p>
            {post && <p className="text-sm font-black text-white truncate">{post.title}</p>}
          </div>
          {pending.length > 0 && (
            <div className="bg-lime-400 text-[#0f2d0f] text-sm font-black px-3 py-1.5 rounded-xl">
              {pending.length}건 대기
            </div>
          )}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />)}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl bg-[#0f2d0f]/10 flex items-center justify-center text-3xl mx-auto mb-3">📭</div>
            <p className="text-gray-700 font-bold">아직 신청이 없어요</p>
            <p className="text-gray-400 text-sm mt-1">게시글이 노출되면 신청이 들어올 거예요</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2 px-1">
                  <span className="text-xs font-black text-[#0f2d0f] uppercase tracking-wider">대기 중</span>
                  <span className="w-5 h-5 bg-[#0f2d0f] text-lime-400 text-[10px] font-black rounded-full flex items-center justify-center">{pending.length}</span>
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
                  <span className="text-xs font-black text-gray-400 uppercase tracking-wider">처리 완료</span>
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
          title={`${(confirmAccept as any).applying_team?.name}팀을 수락할까요?`}
          description="수락하면 경기가 자동 생성되고, 다른 신청은 거절돼요"
          confirmLabel="수락하기"
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
  const profile = (app as any).applying_team_profile
  const team = (app as any).applying_team

  const statusConfig = {
    accepted: { label: '수락됨', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    rejected: { label: '거절됨', bg: 'bg-red-50', text: 'text-red-600' },
    pending: { label: '대기 중', bg: 'bg-amber-50', text: 'text-amber-600' },
  }[app.status]

  return (
    <div className={`bg-white rounded-2xl overflow-hidden ${app.status === 'accepted' ? 'ring-2 ring-emerald-400' : ''}`}>
      {/* Top accent */}
      <div className={`h-1 ${app.status === 'accepted' ? 'bg-emerald-400' : app.status === 'rejected' ? 'bg-gray-200' : 'bg-lime-400'}`} />

      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-[#0f2d0f] flex items-center justify-center text-xl flex-shrink-0">
            {profile?.emoji || '⚽'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-black text-gray-900">{team?.name}</p>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                {statusConfig.label}
              </span>
            </div>
            {profile?.level && (
              <p className="text-xs text-gray-500 mt-0.5">{profile.level}{profile.region ? ` · ${profile.region}` : ''}</p>
            )}
          </div>
          <span className="text-[11px] text-gray-400 flex-shrink-0">
            {format(parseISO(app.created_at), 'M/d HH:mm', { locale: ko })}
          </span>
        </div>

        {app.message && (
          <div className="bg-gray-50 rounded-xl p-3 mb-3 flex gap-2">
            <MessageCircle className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-gray-700 leading-relaxed">{app.message}</p>
          </div>
        )}

        {app.status === 'pending' && !postMatched && (
          <div className="flex gap-2">
            <button onClick={onReject} disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-gray-100 text-gray-600 active:scale-95 transition disabled:opacity-50">
              거절
            </button>
            <button onClick={onAccept} disabled={loading}
              className="flex-[2] py-2.5 rounded-xl text-sm font-black bg-[#0f2d0f] text-lime-400 active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
              <Swords className="w-4 h-4" />
              {loading ? '처리 중...' : '수락하기'}
            </button>
          </div>
        )}

        {app.status === 'accepted' && (
          <div className="flex items-center gap-2 bg-emerald-50 rounded-xl p-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-bold text-emerald-700">매칭 성사 — 경기가 자동으로 생성됐어요</p>
          </div>
        )}
      </div>
    </div>
  )
}
