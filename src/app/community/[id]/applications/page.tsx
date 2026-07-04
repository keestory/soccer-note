'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-react'
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

  useEffect(() => {
    init()
  }, [postId])

  const init = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }

    const resolved = await resolveTeam(supabase, user.id)
    if (!resolved) { router.push('/dashboard'); return }

    // Load post
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
      .select(`
        *,
        applying_team:teams(id, name),
        applying_team_profile:team_public_profiles(emoji, bio, level, region, is_public)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false })

    setApplications(data || [])
    setLoading(false)
  }

  const handleAccept = async (app: MatchApplication) => {
    if (!post) return
    setAccepting(app.id)

    // Atomic accept: create match + update statuses
    const user = await getSessionUser(supabase)
    if (!user) return

    // 1. Create match between the two teams
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        team_id: post.team_id,
        opponent: (app as any).applying_team?.name || '상대팀',
        match_date: post.match_date,
        location: post.location,
        home_score: 0,
        away_score: 0,
        notes: `커뮤니티 매칭으로 성사된 경기입니다`,
      })
      .select('id')
      .single()

    if (matchError) {
      toast.error('경기 생성에 실패했어요')
      setAccepting(null)
      return
    }

    // 2. Accept this application
    await supabase
      .from('match_applications')
      .update({ status: 'accepted', match_id: match.id })
      .eq('id', app.id)

    // 3. Mark post as matched
    await supabase
      .from('match_posts')
      .update({ status: 'matched' })
      .eq('id', postId)

    // 4. Reject remaining pending applications
    await supabase
      .from('match_applications')
      .update({ status: 'rejected' })
      .eq('post_id', postId)
      .eq('status', 'pending')
      .neq('id', app.id)

    toast.success('매칭이 성사됐어요! 🎉 경기가 등록됐습니다')
    setAccepting(null)
    setConfirmAccept(null)
    loadApplications()
  }

  const handleReject = async (appId: string) => {
    const { error } = await supabase
      .from('match_applications')
      .update({ status: 'rejected' })
      .eq('id', appId)

    if (error) toast.error('거절에 실패했어요')
    else {
      toast.success('신청을 거절했어요')
      loadApplications()
    }
  }

  const pending = applications.filter(a => a.status === 'pending')
  const decided = applications.filter(a => a.status !== 'pending')

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-40 bg-white border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-gray-900">받은 신청</h1>
            {post && (
              <p className="text-xs text-gray-400 truncate">{post.title}</p>
            )}
          </div>
          <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-full">
            {pending.length}건
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2].map(i => (
              <div key={i} className="bg-white rounded-2xl h-28 animate-pulse" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-gray-500 font-medium">아직 신청이 없어요</p>
            <p className="text-gray-400 text-sm mt-1">게시글이 노출되면 신청이 들어올 거예요</p>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <section>
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  대기 중 · {pending.length}건
                </h2>
                <div className="space-y-3">
                  {pending.map(app => (
                    <ApplicationCard
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
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-1">
                  처리 완료 · {decided.length}건
                </h2>
                <div className="space-y-3">
                  {decided.map(app => (
                    <ApplicationCard
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
          title={`${(confirmAccept as any).applying_team?.name}팀 신청을 수락할까요?`}
          description="수락하면 경기가 자동 생성되고, 다른 신청은 거절돼요"
          confirmLabel="수락하기"
          onConfirm={() => handleAccept(confirmAccept)}
          onCancel={() => setConfirmAccept(null)}
        />
      )}
    </div>
  )
}

function ApplicationCard({ app, onAccept, onReject, loading, postMatched }: {
  app: MatchApplication
  onAccept: () => void
  onReject: () => void
  loading: boolean
  postMatched: boolean
}) {
  const profile = (app as any).applying_team_profile
  const team = (app as any).applying_team

  return (
    <div className="bg-white rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-11 h-11 rounded-2xl bg-primary-50 flex items-center justify-center text-xl flex-shrink-0">
          {profile?.emoji || '⚽'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 truncate">{team?.name}</p>
            {app.status === 'accepted' && (
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">수락됨</span>
            )}
            {app.status === 'rejected' && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">거절됨</span>
            )}
            {app.status === 'pending' && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">대기 중</span>
            )}
          </div>
          {profile?.level && (
            <p className="text-xs text-gray-500">{profile.level} · {profile.region || '지역 미설정'}</p>
          )}
        </div>
        <span className="text-xs text-gray-400 flex-shrink-0">
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
          <button
            onClick={onReject}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 text-gray-700 active:scale-95 transition disabled:opacity-50">
            거절
          </button>
          <button
            onClick={onAccept}
            disabled={loading}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold bg-primary-600 text-white active:scale-95 transition disabled:opacity-50 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-4 h-4" />
            {loading ? '처리 중...' : '수락하기'}
          </button>
        </div>
      )}
    </div>
  )
}
