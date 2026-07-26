'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Calendar, MapPin, Send, Trash2, ChevronRight, Swords } from 'lucide-react'
import type { MatchPost, MatchApplication } from '@/types/database'
import { format, parseISO, isToday, isTomorrow } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { ConfirmSheet } from '@/components/ConfirmSheet'

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  '입문': { bg: '#334155', color: '#94a3b8' },
  '초급': { bg: '#0c3d5e', color: '#38bdf8' },
  '중급': { bg: '#052e16', color: '#4ade80' },
  '고급': { bg: 'var(--card2)', color: '#fbbf24' },
}

function formatDate(dateStr: string, t: any) {
  const d = parseISO(dateStr)
  if (isToday(d)) return t.todayLabel
  if (isTomorrow(d)) return t.tomorrowLabel
  return format(d, 'M월 d일(EEE)', { locale: ko })
}

export default function PostDetailPage() {
  const { t } = useI18n()
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

    if (!postData) { toast.error(t.postNotFound); router.back(); return }
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
      if (error.code === '23505') toast.error(t.alreadyApplied)
      else toast.error(t.applyFailed)
    } else {
      toast.success(t.applySent)
      setShowApplySheet(false)
      setApplyMessage('')
      loadPost(teamId)
    }
    setSubmitting(false)
  }

  const handleWithdraw = async () => {
    if (!myApplication) return
    const { error } = await supabase.from('match_applications').delete().eq('id', myApplication.id)
    if (error) toast.error(t.cancelApplyFailed)
    else { toast.success(t.applyCancelled); setMyApplication(null); loadPost(teamId || undefined) }
  }

  const handleDeletePost = async () => {
    const { error } = await supabase.from('match_posts').delete().eq('id', postId)
    if (error) toast.error(t.deleteFailed)
    else { toast.success(t.postDeleted); router.push('/community') }
  }

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }

  if (loading) {
    return (
      <div className="light min-h-screen" style={{ background: 'var(--bg)' }}>
        <div className="safe-top h-24" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }} />
        <div className="max-w-4xl mx-auto px-4 pt-4 space-y-3">
          {[1,2,3].map(i => <div key={i} className="rounded-2xl h-24 animate-pulse" style={{ background: 'var(--card2)' }} />)}
        </div>
      </div>
    )
  }
  if (!post) return null

  const matchedOrClosed = post.status !== 'open'
  const emoji = (post as any).team_profile?.emoji || '⚽'
  const levelStyle = LEVEL_STYLE[post.level] || LEVEL_STYLE['입문']

  return (
    <div className="min-h-screen pb-32" style={{ background: 'var(--bg)' }}>

      {/* Hero header */}
      <div className="relative overflow-hidden safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="absolute inset-0 field-pattern opacity-20" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 140" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="200" y2="150" stroke="rgba(204,255,0,0.08)" strokeWidth="1.5" />
          <line x1="380" y1="-10" x2="240" y2="150" stroke="rgba(204,255,0,0.04)" strokeWidth="1" />
          <circle cx="50" cy="100" r="50" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </svg>

        <div className="relative px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl" style={{ color: 'var(--text2)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.matchRequestLabel}</p>
            <p className="text-sm font-black text-[color:var(--text)] truncate">{post.team?.name}</p>
          </div>
          {isMyPost && isCoach && (
            <button onClick={() => setShowDeleteConfirm(true)} className="p-2 rounded-xl" style={{ color: 'rgba(255,255,255,0.3)' }}>
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Post title in hero */}
        <div className="relative px-4 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
              {emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-[color:var(--text)] leading-snug">{post.title}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                  style={{ background: levelStyle.bg, color: levelStyle.color }}>
                  {post.level}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--muted2)' }}>{post.format}</span>
                {matchedOrClosed && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-lg"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--muted2)' }}>
                    {post.status === 'matched' ? t.matchedDone : t.closedLabel}
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
          <div style={cardStyle} className="p-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--chip)' }}>
              <Calendar className="w-4 h-4" style={{ color: 'var(--text)' }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.dateLabel}</p>
              <p className="text-sm font-bold text-[color:var(--text)]">{formatDate(post.match_date, t)}</p>
              {post.match_time && <p className="text-xs" style={{ color: 'var(--muted2)' }}>{post.match_time}</p>}
            </div>
          </div>
          <div style={cardStyle} className="p-3.5 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--chip)' }}>
              <MapPin className="w-4 h-4" style={{ color: 'var(--text)' }} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.placeLabel}</p>
              <p className="text-sm font-bold text-[color:var(--text)] truncate">{post.region}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted2)' }}>{post.location}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        {post.description && (
          <div style={cardStyle} className="p-4">
            <p className="text-[11px] font-black uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{t.teamMessage}</p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'rgba(255,255,255,0.7)' }}>{post.description}</p>
          </div>
        )}

        {/* Applications (my post) */}
        {isMyPost && isCoach && (
          <Link href={`/community/${postId}/applications`}
            className="flex items-center justify-between rounded-2xl p-4 active:scale-[0.99] transition"
            style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--chip)' }}>
                <Send className="w-5 h-5" style={{ color: 'var(--text)' }} />
              </div>
              <div>
                <p className="font-black text-[color:var(--text)]">{t.viewApplications}</p>
                <p className="text-xs" style={{ color: 'var(--muted2)' }}>
                  {applicationCount > 0 ? t.nTeamsApplied.replace('{n}', String(applicationCount)) : t.noApplicationsYet}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {applicationCount > 0 && (
                <span className="w-6 h-6 text-xs font-black rounded-full flex items-center justify-center"
                  style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                  {applicationCount}
                </span>
              )}
              <ChevronRight className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.2)' }} />
            </div>
          </Link>
        )}

        {/* My application status */}
        {!isMyPost && myApplication && (
          <div className="rounded-2xl p-4" style={{
            background: myApplication.status === 'accepted' ? '#052e16' :
                        myApplication.status === 'rejected' ? 'var(--card2)' : 'var(--card2)',
            border: `1px solid ${myApplication.status === 'accepted' ? '#166534' : myApplication.status === 'rejected' ? 'var(--line)' : '#92400e'}`,
          }}>
            <div className="flex items-center gap-3">
              <div className="text-2xl">
                {myApplication.status === 'accepted' ? '🎉' :
                 myApplication.status === 'rejected' ? '😔' : '⏳'}
              </div>
              <div className="flex-1">
                <p className="font-black text-[color:var(--text)]">
                  {myApplication.status === 'accepted' ? t.matchAcceptedMsg : myApplication.status === 'rejected' ? t.matchRejectedMsg : t.matchPendingMsg}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted2)' }}>
                  {myApplication.status === 'accepted' ? t.checkMatchTab : myApplication.status === 'rejected' ? t.findOtherMatch : t.waitingResponse}
                </p>
              </div>
              {myApplication.status === 'pending' && (
                <button onClick={() => setShowWithdrawConfirm(true)}
                  className="text-xs px-3 py-1.5 rounded-xl transition"
                  style={{ color: 'var(--muted2)', border: '1px solid rgba(255,255,255,0.2)' }}>
                  {t.cancel}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Apply CTA */}
      {!isMyPost && !myApplication && !matchedOrClosed && isCoach && (
        <div className="fixed bottom-0 left-0 right-0 safe-bottom pt-4 px-4 pb-3"
          style={{ background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
          <button
            onClick={() => setShowApplySheet(true)}
            className="w-full max-w-4xl mx-auto py-4 rounded-2xl font-black text-base active:scale-[0.98] transition flex items-center justify-center gap-2"
            style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
            <Swords className="w-5 h-5" />
            {t.applyButton}
          </button>
        </div>
      )}

      {/* Apply Sheet */}
      {showApplySheet && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={() => setShowApplySheet(false)}>
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div className="relative w-full rounded-t-3xl px-5 pt-5 pb-8 safe-bottom"
            style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: 'var(--line)' }} />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: 'var(--chip)' }}>{emoji}</div>
              <div>
                <h3 className="font-black text-[color:var(--text)]">{post.team?.name}에 신청</h3>
                <p className="text-xs" style={{ color: 'var(--muted2)' }}>짧은 팀 소개를 남겨보세요</p>
              </div>
            </div>
            <textarea
              value={applyMessage}
              onChange={e => setApplyMessage(e.target.value)}
              placeholder="안녕하세요! 저희 팀은 창단 3년차 직장인팀이에요. 잘 부탁드립니다 🙏"
              rows={4}
              maxLength={200}
              className="w-full rounded-2xl p-3.5 text-sm resize-none outline-none transition placeholder-white/20"
              style={{ background: 'var(--card2)', border: '1px solid var(--line)', color: 'rgba(255,255,255,0.9)', caretColor: 'var(--text)' }}
            />
            <div className="flex justify-end mb-4">
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{applyMessage.length}/200</span>
            </div>
            <div className="space-y-2">
              <button onClick={handleApply} disabled={submitting}
                className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50 active:scale-[0.98] transition"
                style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                {submitting ? '신청 중...' : '신청 완료 🎯'}
              </button>
              <button onClick={() => setShowApplySheet(false)}
                className="w-full py-4 rounded-2xl font-semibold"
                style={{ background: 'var(--card2)', color: 'var(--text2)' }}>
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
