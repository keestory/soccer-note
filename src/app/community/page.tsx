'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { Plus } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { useI18n } from '@/lib/i18n/context'
import type { MatchPost } from '@/types/database'
import { format, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'

const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '강원', '충청', '전라', '경상', '제주']
const FORMATS = ['전체', '5vs5', '6vs6', '7vs7', '8vs8', '11vs11']
const LEVELS = ['전체', '입문', '초급', '중급', '고급']

// Navy Board level badge (text / bg) — matches reference match-level chips
const LEVEL_STYLE: Record<string, { color: string; bg: string }> = {
  '입문': { color: '#475467', bg: '#f2f4f7' },
  '초급': { color: '#026aa2', bg: '#e0f2fe' },
  '중급': { color: '#0e9384', bg: '#e0f5f2' },
  '고급': { color: '#b54708', bg: '#fef0c7' },
}

function formatMatchDate(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return { label: '오늘', urgent: true }
  if (isTomorrow(d)) return { label: '내일', urgent: true }
  const diff = differenceInDays(d, new Date())
  if (diff > 0 && diff <= 7) return { label: `${diff}일 후`, urgent: false }
  return { label: format(d, 'M월 d일(EEE)', { locale: ko }), urgent: false }
}

export default function CommunityPage() {
  const { t } = useI18n()
  const router = useRouter()
  const [posts, setPosts] = useState<MatchPost[]>([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [filterRegion, setFilterRegion] = useState('전체')
  const [filterFormat, setFilterFormat] = useState('전체')
  const [filterLevel, setFilterLevel] = useState('전체')
  const [showFilters, setShowFilters] = useState(false)
  const [myPostIds, setMyPostIds] = useState<Set<string>>(new Set())
  const [appliedPostIds, setAppliedPostIds] = useState<Set<string>>(new Set())
  const supabase = createClient()

  useEffect(() => { init() }, [])
  useEffect(() => { if (teamId) loadPosts() }, [teamId, filterRegion, filterFormat, filterLevel])

  const init = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const resolved = await resolveTeam(supabase, user.id)
    if (!resolved) { router.push('/dashboard'); return }
    setTeamId(resolved.teamId)
    setIsCoach(resolved.isOwner || resolved.role === 'coach')
  }

  const loadPosts = async () => {
    setLoading(true)
    let query = supabase
      .from('match_posts')
      .select('*, team:teams(id, name), team_profile:team_public_profiles(emoji, region, level)')
      .eq('status', 'open')
      .gte('expires_at', new Date().toISOString())
      .order('match_date', { ascending: true })

    if (filterRegion !== '전체') query = query.ilike('region', `${filterRegion}%`)
    if (filterFormat !== '전체') query = query.eq('format', filterFormat)
    if (filterLevel !== '전체') query = query.eq('level', filterLevel)

    const { data } = await query
    setPosts(data || [])

    if (teamId) {
      const [{ data: myPosts }, { data: myApps }] = await Promise.all([
        supabase.from('match_posts').select('id').eq('team_id', teamId),
        supabase.from('match_applications').select('post_id').eq('applying_team_id', teamId),
      ])
      setMyPostIds(new Set((myPosts || []).map((p: { id: string }) => p.id)))
      setAppliedPostIds(new Set((myApps || []).map((a: { post_id: string }) => a.post_id)))
    }
    setLoading(false)
  }

  const activeFilters = [filterRegion, filterFormat, filterLevel].filter(f => f !== '전체').length

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #eaecf0' }}>
        <div className="max-w-md mx-auto" style={{ padding: '8px 22px 14px' }}>
          <div className="flex items-start justify-between">
            <div>
              <div style={{ fontSize: 21, fontWeight: 700, color: '#101828' }}>{t.findOpponentTitle}</div>
              <div style={{ fontSize: 12, color: '#98a2b3', marginTop: 2 }}>{t.findTeamsTagline}</div>
            </div>
            <div className="flex" style={{ gap: 8 }}>
              <button onClick={() => setShowFilters(v => !v)}
                style={{ border: '1px solid #eaecf0', background: showFilters || activeFilters > 0 ? '#f2f4f7' : '#fff', fontSize: 12, fontWeight: 600, color: '#475467', padding: '8px 12px', borderRadius: 10 }}>
                {t.filter}{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </button>
              {isCoach && (
                <Link href="/community/new"
                  className="active:scale-95 transition"
                  style={{ fontSize: 12, fontWeight: 700, color: '#c8f542', background: '#101828', padding: '8px 12px', borderRadius: 10 }}>
                  {t.writePost}
                </Link>
              )}
            </div>
          </div>

          {/* Filter chips */}
          {showFilters ? (
            <div className="space-y-2.5" style={{ marginTop: 14 }}>
              <FilterRow label={t.region} options={REGIONS} value={filterRegion} onChange={setFilterRegion} />
              <FilterRow label={t.playType} options={FORMATS} value={filterFormat} onChange={setFilterFormat} />
              <FilterRow label={t.levelLabel} options={LEVELS} value={filterLevel} onChange={setFilterLevel} />
            </div>
          ) : (
            <div className="flex overflow-x-auto" style={{ gap: 7, marginTop: 14, scrollbarWidth: 'none' }}>
              {['전체', '서울', '경기', '6vs6'].map(chip => {
                const active = chip === '6vs6' ? filterFormat === '6vs6' : filterRegion === chip
                return (
                  <button key={chip}
                    onClick={() => {
                      if (chip === '6vs6') setFilterFormat(filterFormat === '6vs6' ? '전체' : '6vs6')
                      else setFilterRegion(filterRegion === chip ? '전체' : chip)
                    }}
                    className="whitespace-nowrap flex-shrink-0"
                    style={{
                      fontSize: 11, fontWeight: active ? 600 : 500, padding: '5px 12px', borderRadius: 20,
                      background: active ? '#101828' : '#fff', color: active ? '#c8f542' : '#475467',
                      border: active ? 'none' : '1px solid #eaecf0',
                    }}>
                    {chip === '전체' ? t.allLabel : chip}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-[16px] p-4 animate-pulse" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-[12px] flex-shrink-0" style={{ background: 'var(--card2)' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-1/3" style={{ background: 'var(--card2)' }} />
                    <div className="h-4 rounded w-2/3" style={{ background: 'var(--card2)' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-black text-[18px] text-[color:var(--text)] mb-2">매칭 요청이 없어요</p>
            <p className="text-[13px] mb-6" style={{ color: 'var(--muted2)' }}>필터를 바꾸거나 먼저 글을 올려보세요</p>
            {isCoach && (
              <Link href="/community/new"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] font-black text-sm transition active:scale-95"
                style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                <Plus className="w-4 h-4" /> 매칭 요청 올리기
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const isMyPost = myPostIds.has(post.id)
              const hasApplied = appliedPostIds.has(post.id)
              const dateInfo = formatMatchDate(post.match_date)
              const levelStyle = LEVEL_STYLE[post.level] || LEVEL_STYLE['입문']
              const regionParts = post.region?.split(' ') || []

              return (
                <Link key={post.id} href={`/community/${post.id}`}
                  className="flex items-start gap-3 p-[14px] rounded-[16px] active:opacity-80 transition"
                  style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>

                  {/* Region tile */}
                  <div className="flex flex-col items-center justify-center flex-shrink-0"
                    style={{ width: 48, height: 48, borderRadius: 12, background: '#f2f4f7' }}>
                    <span style={{ fontSize: 10, color: '#98a2b3' }}>{regionParts[0] || '–'}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>{regionParts[1] || regionParts[0] || '–'}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#98a2b3' }}>{post.team?.name}</div>
                    <div className="line-clamp-2" style={{ fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.35, margin: '2px 0 8px' }}>{post.title}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 7,
                        background: dateInfo.urgent ? '#fdecec' : '#f2f4f7', color: dateInfo.urgent ? '#f04438' : '#475467' }}>
                        {dateInfo.label}{post.match_time ? ` ${post.match_time}` : ''}
                      </span>
                      {(isMyPost || hasApplied) && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: '#f2f4f7', color: '#101828' }}>
                          {isMyPost ? t.myPostBadge : t.appliedBadge}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right badges */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 9, color: levelStyle.color, background: levelStyle.bg }}>
                      {post.level}
                    </span>
                    <span style={{ fontSize: 11, color: '#98a2b3', padding: '2px 8px', borderRadius: 7, background: '#f2f4f7' }}>
                      {post.format}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function FilterRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold w-7 flex-shrink-0" style={{ color: 'var(--muted2)' }}>{label}</span>
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition"
            style={{ background: value === opt ? 'var(--navy)' : 'var(--card2)', color: value === opt ? 'var(--accent)' : 'var(--text2)', border: `1px solid ${value === opt ? 'transparent' : 'var(--line)'}` }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
