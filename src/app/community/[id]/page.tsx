'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Calendar, MapPin, Users, Clock, ChevronRight, Send, Trash2, CheckCircle, Swords } from 'lucide-react'
import type { MatchPost, MatchApplication } from '@/types/database'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { ConfirmSheet } from '@/components/ConfirmSheet'

const LEVEL_STYLE: Record<string, { bg: string; text: string }> = {
  '입문': { bg: 'bg-slate-100', text: 'text-slate-600' },
  '초급': { bg: 'bg-sky-100', text: 'text-sky-700' },
  '중급': { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  '고급': { bg: 'bg-amber-100', text: 'text-amber-700' },
}

function formatDate(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return '오늘'
  if (isTomorrow(d)) return '내일'
  return format(d, 'M월 d일(EEE)', { locale: ko })
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

  useEffect(() => { init() }, [postId])

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
      .select('*, team:teams(id, name), team_profile:team_public_profiles(emoji, bio, region, level, is_public)')
      .eq('id', postId)
      .single()

    if (!postData) { toast.error('게시글을 찾을 수 없어요'); router.back(); return }
    setPost(postData)
    setIsMyPost(myTeamId === postData.team_id)

    const { count } = await supabase
      .from('match_applications')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId)
    setApplicationCount(count || 0)

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
      .insert({ post_id: postId, applying_team_id: teamId, message: applyMessage.trim() || null })

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
    const { error } = await supabase.from('match_applications').delete().eq('id', myApplication.id)
    if (error) toast.error('신청 취소에 실패했어요')
    else { toast.success('신청을 취소했어요'); setMyApplication(null); loadPost(teamId || undefined) }
  }

  const handleDeletePost = async () => {
    const { error } = await supabase.from('match_posts').delete().eq('id', postId)
    if (error) toast.error('삭제에 실패했어요')
    else { toast.success('게시글을 삭제했어요'); router.push('/community') }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f0]">
        <div className="bg-[#0f2d0f] safe-top h-24" />
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-2xl h-24 animate-pulse" />)}
        </div>
      </div>
    )
  }
  if (!post) return null

  const matchedOrClosed = post.status !== 'open'
  const emoji = (post as any).team_profile?.emoji || '⚽'
  const levelStyle = LEVEL_STYLE[post.level] || LEVEL_STYLE['입문']

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-32">

      {/* Hero header */}
      <div className="relative bg-[#0f2d0f] overflow-hidden safe-top">
        <div className="absolute inset-0 field-pattern opacity-60" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="200" y2="150" stroke="rgba(163,230,53,0.12)" strokeWidth="1.5" />
          <line x1="380" y1="-10" x2="240" y2="150" stroke="rgba(163,230,53,0.08)" strokeWidth="1" />
          <circle cx="50" cy="100" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </svg>

        <div className="relative px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">매칭 요청</p>
            <p className="text-sm font-black text-white truncate">{post.team?.name}</p>
          </div>
          {isMyPost && isCoach && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl text-white/40 hover:text-red-400 hover:bg-red-400/10">
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Post title in hero */}
        <div className="relative px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-3xl flex-shrink-0">
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-white leading-snug">{post.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${levelStyle.bg} ${levelStyle.text}`}>
                  {post.level}
                </span>
                <span className="text-xs text-white/50 font-semibold">{post.format}</span>
                {matchedOrClosed && (
                  <span className="text-xs font-bold bg-white/20 text-white/70 px-2 py-0.5 rounded-lg">
                    {post.status === 'matched' ? '매칭완료' : '마감'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-3">

        {/* Info chips */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white rounded-2xl p-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0f2d0f]/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-4 h-4 text-[#0f2d0f]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">날짜</p>
              <p className="text-sm font-bold text-gray-900">{formatDate(post.match_date)}</p>
              {post.match_time && <p className="text-xs text-gray-500">{post.match_time}</p>}
            </div>
          </div>
          <div className="bg-white rounded-2xl p-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0f2d0f]/10 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-4 h-4 text-[#0f2d0f]" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase">장소</p>
              <p className="text-sm font-bold text-gray-900 truncate">{post.region}</p>
              <p className="text-xs text-gray-500 truncate">{post.location}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {post.description && (
          <div className="bg-white rounded-2xl p-4">
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">팀 메시지</p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{post.description}</p>
          </div>
        )}

        {/* Applications (my post) */}
        {isMyPost && isCoach && (
          <Link href={`/community/${postId}/applications`}
            className="flex items-center justify-between bg-[#0f2d0f] rounded-2xl p-4 active:scale-[0.99] transition">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-400/20 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-lime-400" />
              </div>
              <div>
                <p className="font-black text-white">받은 신청 확인</p>
                <p className="text-xs text-white/50">
                  {applicationCount > 0 ? `${applicationCount}팀이 신청했어요` : '아직 신청이 없어요'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {applicationCount > 0 && (
                <span className="w-6 h-6 bg-lime-400 text-[#0f2d0f] text-xs font-black rounded-full flex items-center justify-center">
                  {applicationCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-white/30" />
            </div>
          </Link>
        )}

        {/* My application status */}
        {!isMyPost && myApplication && (
          <div className={`rounded-2xl p-4 ${
            myApplication.status === 'accepted' ? 'bg-emerald-600' :
            myApplication.status === 'rejected' ? 'bg-gray-700' : 'bg-amber-500'
          }`}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {myApplication.status === 'accepted' ? '🎉' :
                 myApplication.status === 'rejected' ? '😔' : '⏳'}
              </div>
              <div className="flex-1">
                <p className="font-black text-white">
                  {myApplication.status === 'accepted' ? '매칭 성사! 경기가 등록됐어요' :
                   myApplication.status === 'rejected' ? '이번엔 아쉽게도 거절됐어요' : '신청 검토 중이에요'}
                </p>
                <p className="text-xs text-white/70 mt-0.5">
                  {myApplication.status === 'accepted' ? '경기 탭에서 확인해보세요' :
                   myApplication.status === 'rejected' ? '다른 매칭을 찾아보세요' : '상대팀의 응답을 기다리고 있어요'}
                </p>
              </div>
              {myApplication.status === 'pending' && (
                <button onClick={() => setShowWithdrawConfirm(true)}
                  className="text-xs text-white/60 hover:text-white border border-white/30 px-3 py-1.5 rounded-xl transition">
                  취소
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Apply CTA */}
      {!isMyPost && !myApplication && !matchedOrClosed && isCoach && (
        <div className="fixed bottom-0 left-0 right-0 safe-bottom bg-gradient-to-t from-white via-white to-transparent pt-4 px-4 pb-3">
          <button
            onClick={() => setShowApplySheet(true)}
            className="w-full max-w-4xl mx-auto bg-[#0f2d0f] text-lime-400 py-4 rounded-2xl font-black text-base active:scale-[0.98] transition flex items-center justify-center gap-2 shadow-xl shadow-[#0f2d0f]/30">
            <Swords className="w-5 h-5" />
            매칭 신청하기
          </button>
        </div>
      )}

      {/* Apply Sheet */}
      {showApplySheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowApplySheet(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full bg-white rounded-t-3xl px-5 pt-5 pb-8 safe-bottom"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#0f2d0f] flex items-center justify-center text-xl">{emoji}</div>
              <div>
                <h3 className="font-black text-gray-900">{post.team?.name}에 신청</h3>
                <p className="text-xs text-gray-500">짧은 팀 소개를 남겨보세요</p>
              </div>
            </div>
            <textarea
              value={applyMessage}
              onChange={e => setApplyMessage(e.target.value)}
              placeholder="안녕하세요! 저희 팀은 창단 3년차 직장인팀이에요. 잘 부탁드립니다 🙏"
              rows={4}
              maxLength={200}
              className="w-full border-2 border-gray-100 focus:border-[#0f2d0f] rounded-2xl p-3.5 text-sm resize-none outline-none transition"
            />
            <div className="flex justify-end mb-4">
              <span className="text-xs text-gray-400">{applyMessage.length}/200</span>
            </div>
            <div className="space-y-2">
              <button onClick={handleApply} disabled={submitting}
                className="w-full bg-[#0f2d0f] text-lime-400 py-4 rounded-2xl font-black text-base disabled:opacity-50 active:scale-[0.98] transition">
                {submitting ? '신청 중...' : '신청 완료 🎯'}
              </button>
              <button onClick={() => setShowApplySheet(false)}
                className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-semibold">
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
