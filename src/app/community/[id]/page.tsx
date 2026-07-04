'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Calendar, MapPin, Users, Clock, ChevronRight, Send, Trash2, CheckCircle } from 'lucide-react'
import type { MatchPost, MatchApplication } from '@/types/database'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { ConfirmSheet } from '@/components/ConfirmSheet'

const LEVEL_COLOR: Record<string, string> = {
  '입문': 'bg-gray-100 text-gray-600',
  '초급': 'bg-blue-100 text-blue-700',
  '중급': 'bg-emerald-100 text-emerald-700',
  '고급': 'bg-amber-100 text-amber-700',
}

export default function PostDetailPage() {
  const router = useRouter()
  const params = useParams()
  const postId = params.id as string

  const [post, setPost] = useState<MatchPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [isMyPost, setIsMyPost] = useState(false)
  const [myApplication, setMyApplication] = useState<MatchApplication | null>(null)
  const [applicationCount, setApplicationCount] = useState(0)
  const [showApplySheet, setShowApplySheet] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false)
  const [applyMessage, setApplyMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    init()
  }, [postId])

  const init = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }

    const resolved = await resolveTeam(supabase, user.id)
    if (resolved) {
      setTeamId(resolved.teamId)
      setIsCoach(resolved.isOwner || resolved.role === 'coach')
    }

    loadPost(resolved?.teamId)
  }

  const loadPost = async (myTeamId?: string) => {
    const { data: postData } = await supabase
      .from('match_posts')
      .select(`
        *,
        team:teams(id, name),
        team_profile:team_public_profiles(emoji, bio, region, level, is_public)
      `)
      .eq('id', postId)
      .single()

    if (!postData) { toast.error('게시글을 찾을 수 없어요'); router.back(); return }
    setPost(postData)
    setIsMyPost(myTeamId === postData.team_id)

    // Count applications
    const { count } = await supabase
      .from('match_applications')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
    setApplicationCount(count || 0)

    // Check if I've applied
    if (myTeamId && myTeamId !== postData.team_id) {
      const { data: app } = await supabase
        .from('match_applications')
        .select('*')
        .eq('post_id', postId)
        .eq('applying_team_id', myTeamId)
        .maybeSingle()
      setMyApplication(app)
    }

    setLoading(false)
  }

  const handleApply = async () => {
    if (!teamId) return
    setSubmitting(true)

    const { error } = await supabase
      .from('match_applications')
      .insert({
        post_id: postId,
        applying_team_id: teamId,
        message: applyMessage.trim() || null,
      })

    if (error) {
      if (error.code === '23505') toast.error('이미 신청한 게시글이에요')
      else toast.error('신청에 실패했어요')
    } else {
      toast.success('매칭 신청을 보냈어요! 🎉')
      setShowApplySheet(false)
      setApplyMessage('')
      loadPost(teamId)
    }
    setSubmitting(false)
  }

  const handleWithdraw = async () => {
    if (!myApplication) return
    const { error } = await supabase
      .from('match_applications')
      .delete()
      .eq('id', myApplication.id)

    if (error) toast.error('신청 취소에 실패했어요')
    else {
      toast.success('신청을 취소했어요')
      setMyApplication(null)
      loadPost(teamId || undefined)
    }
  }

  const handleDeletePost = async () => {
    const { error } = await supabase
      .from('match_posts')
      .delete()
      .eq('id', postId)

    if (error) toast.error('삭제에 실패했어요')
    else {
      toast.success('게시글을 삭제했어요')
      router.push('/community')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b safe-top">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-4 bg-gray-100 rounded w-32 animate-pulse" />
          </div>
        </header>
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!post) return null

  const matchedOrClosed = post.status !== 'open'

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-40 bg-white border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1 truncate">매칭 요청</h1>
          {isMyPost && isCoach && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl text-gray-400 hover:text-red-500">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
        {/* Team card */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-50 flex items-center justify-center text-2xl">
              {(post as any).team_profile?.emoji || '⚽'}
            </div>
            <div>
              <p className="font-bold text-gray-900">{post.team?.name}</p>
              {(post as any).team_profile?.bio && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{(post as any).team_profile.bio}</p>
              )}
            </div>
          </div>

          <h2 className="text-lg font-bold text-gray-900 mb-3">{post.title}</h2>

          <div className="grid grid-cols-2 gap-2">
            <InfoChip icon={<Calendar className="w-4 h-4" />}
              label={format(parseISO(post.match_date), 'M월 d일(EEE)', { locale: ko })
                + (post.match_time ? ` ${post.match_time}` : '')} />
            <InfoChip icon={<MapPin className="w-4 h-4" />} label={`${post.region} · ${post.location}`} />
            <InfoChip icon={<Users className="w-4 h-4" />} label={post.format} />
            <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold ${LEVEL_COLOR[post.level] || 'bg-gray-100 text-gray-600'}`}>
              {post.level}
            </div>
          </div>
        </div>

        {/* Description */}
        {post.description && (
          <div className="bg-white rounded-2xl p-4">
            <p className="text-xs font-semibold text-gray-500 mb-2">추가 설명</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.description}</p>
          </div>
        )}

        {/* Application status (my post) */}
        {isMyPost && isCoach && (
          <Link href={`/community/${postId}/applications`}
            className="flex items-center justify-between bg-white rounded-2xl p-4 active:scale-[0.99] transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">받은 신청</p>
                <p className="text-xs text-gray-500">
                  {applicationCount > 0 ? `${applicationCount}팀이 신청했어요` : '아직 신청이 없어요'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-300" />
          </Link>
        )}

        {/* My application status */}
        {!isMyPost && myApplication && (
          <div className="bg-white rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                myApplication.status === 'accepted' ? 'bg-green-50' :
                myApplication.status === 'rejected' ? 'bg-red-50' : 'bg-amber-50'
              }`}>
                {myApplication.status === 'accepted' ? <CheckCircle className="w-5 h-5 text-green-600" /> :
                 myApplication.status === 'rejected' ? <span className="text-red-500 font-bold">✕</span> :
                 <Clock className="w-5 h-5 text-amber-500" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">
                  {myApplication.status === 'accepted' ? '신청이 수락됐어요! 🎉' :
                   myApplication.status === 'rejected' ? '이번엔 아쉽게도...' : '신청 검토 중'}
                </p>
                <p className="text-xs text-gray-500">
                  {myApplication.status === 'accepted' ? '경기가 자동으로 생성됐어요' :
                   myApplication.status === 'rejected' ? '다른 매칭을 찾아보세요' : '상대팀의 응답을 기다리고 있어요'}
                </p>
              </div>
              {myApplication.status === 'pending' && (
                <button onClick={() => setShowWithdrawConfirm(true)}
                  className="text-xs text-gray-400 hover:text-red-500 transition px-2 py-1 rounded-lg">
                  취소
                </button>
              )}
            </div>
          </div>
        )}

        {/* Status badge if matched/closed */}
        {matchedOrClosed && (
          <div className="bg-gray-100 rounded-2xl p-4 text-center">
            <p className="text-sm font-semibold text-gray-500">
              {post.status === 'matched' ? '✅ 매칭이 완료된 게시글이에요' : '이 게시글은 마감됐어요'}
            </p>
          </div>
        )}
      </main>

      {/* Apply CTA */}
      {!isMyPost && !myApplication && !matchedOrClosed && isCoach && (
        <div className="fixed bottom-0 left-0 right-0 safe-bottom bg-white border-t px-4 py-3">
          <button
            onClick={() => setShowApplySheet(true)}
            className="w-full max-w-4xl mx-auto bg-primary-600 text-white py-4 rounded-2xl font-bold text-base active:scale-[0.98] transition flex items-center justify-center gap-2">
            <Send className="w-5 h-5" />
            매칭 신청하기
          </button>
        </div>
      )}

      {/* Apply Sheet */}
      {showApplySheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowApplySheet(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-8 safe-bottom"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="font-bold text-gray-900 text-lg mb-1">매칭 신청</h3>
            <p className="text-sm text-gray-500 mb-4">상대팀에게 짧은 메시지를 남길 수 있어요</p>
            <textarea
              value={applyMessage}
              onChange={e => setApplyMessage(e.target.value)}
              placeholder="예) 안녕하세요! 저희 팀은 창단 3년차 직장인팀이에요. 잘 부탁드립니다 🙏"
              rows={4}
              maxLength={200}
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm resize-none outline-none focus:border-primary-400"
            />
            <p className="text-xs text-gray-400 text-right mb-4">{applyMessage.length}/200</p>
            <div className="space-y-2">
              <button onClick={handleApply} disabled={submitting}
                className="w-full bg-primary-600 text-white py-4 rounded-2xl font-bold text-base disabled:opacity-50 active:scale-[0.98] transition">
                {submitting ? '신청 중...' : '신청 완료'}
              </button>
              <button onClick={() => setShowApplySheet(false)}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-2xl font-semibold">
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={showDeleteConfirm}
        title="게시글을 삭제할까요?"
        description="삭제하면 받은 신청도 모두 사라져요"
        confirmLabel="삭제"
        danger
        onConfirm={handleDeletePost}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmSheet
        open={showWithdrawConfirm}
        title="신청을 취소할까요?"
        confirmLabel="취소하기"
        onConfirm={handleWithdraw}
        onCancel={() => setShowWithdrawConfirm(false)}
      />
    </div>
  )
}

function InfoChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-2 rounded-xl text-sm text-gray-600">
      <span className="text-gray-400">{icon}</span>
      <span className="truncate">{label}</span>
    </div>
  )
}
