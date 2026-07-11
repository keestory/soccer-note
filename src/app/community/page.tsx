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

// Dark-theme level badge
const LEVEL_STYLE: Record<string, { color: string }> = {
  '입문': { color: '#94a3b8' },
  '초급': { color: '#38bdf8' },
  '중급': { color: '#2dd4bf' },
  '고급': { color: '#f59e0b' },
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
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Hero Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#0e0e0e', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-display text-[13px] tracking-widest mb-1" style={{ color: 'var(--accent)' }}>MATCH COMMUNITY</p>
              <h1 className="font-black text-[23px] text-white leading-none">{t.navMatching}</h1>
              <p className="text-[13px] mt-1" style={{ color: 'var(--muted2)' }}>{t.findTeamsTagline}</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setShowFilters(v => !v)}
                className="px-3 py-2 rounded-[9px] text-sm font-medium transition"
                style={{
                  border: '1px solid #2a2a2a',
                  background: showFilters || activeFilters > 0 ? 'var(--chip)' : 'transparent',
                  color: showFilters || activeFilters > 0 ? 'var(--accent)' : '#aaa',
                }}>
                {t.filter}{activeFilters > 0 ? ` (${activeFilters})` : ''}
              </button>
              {isCoach && (
                <Link href="/community/new"
                  className="px-3.5 py-2 rounded-[9px] text-sm font-black flex items-center gap-1.5 transition active:scale-95"
                  style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                  <Plus className="w-4 h-4" />
                  {t.writePost}
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="border-t px-5 py-3 space-y-2.5" style={{ borderColor: '#1a1a1a', background: '#0a0a0a' }}>
            <FilterRow label={t.region} options={REGIONS} value={filterRegion} onChange={setFilterRegion} />
            <FilterRow label={t.playType} options={FORMATS} value={filterFormat} onChange={setFilterFormat} />
            <FilterRow label={t.levelLabel} options={LEVELS} value={filterLevel} onChange={setFilterLevel} />
          </div>
        )}

        {/* Quick region chips */}
        {!showFilters && (
          <div className="flex gap-2 overflow-x-auto px-5 pb-3" style={{ scrollbarWidth: 'none' }}>
            {['전체', '서울', '경기', '6vs6'].map(chip => (
              <button key={chip}
                onClick={() => {
                  if (chip === '6vs6') setFilterFormat(filterFormat === '6vs6' ? '전체' : '6vs6')
                  else setFilterRegion(filterRegion === chip ? '전체' : chip)
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition"
                style={{
                  background: (chip === '6vs6' ? filterFormat === '6vs6' : filterRegion === chip) ? 'var(--accent)' : '#191919',
                  color: (chip === '6vs6' ? filterFormat === '6vs6' : filterRegion === chip) ? '#0a0a0a' : '#aaa',
                  border: '1px solid #2a2a2a',
                }}>
                {chip}
              </button>
            ))}
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-[16px] p-4 animate-pulse" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-[12px] flex-shrink-0" style={{ background: '#1a1a1a' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 rounded w-1/3" style={{ background: '#1a1a1a' }} />
                    <div className="h-4 rounded w-2/3" style={{ background: '#1a1a1a' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-black text-[18px] text-white mb-2">매칭 요청이 없어요</p>
            <p className="text-[13px] mb-6" style={{ color: '#555' }}>필터를 바꾸거나 먼저 글을 올려보세요</p>
            {isCoach && (
              <Link href="/community/new"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-[12px] font-black text-sm transition active:scale-95"
                style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
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
              const levelColor = (LEVEL_STYLE[post.level] || LEVEL_STYLE['입문']).color
              const regionParts = post.region?.split(' ') || []

              return (
                <Link key={post.id} href={`/community/${post.id}`}
                  className="flex items-start gap-3 p-[14px] rounded-[16px] active:opacity-80 transition"
                  style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>

                  {/* Region tile */}
                  <div className="w-12 h-12 rounded-[12px] flex-col items-center justify-center flex flex-shrink-0"
                    style={{ background: '#161616', border: '1px solid #262626' }}>
                    <p className="text-[10px] leading-none" style={{ color: '#888' }}>{regionParts[0] || '–'}</p>
                    <p className="text-[13px] font-black leading-tight text-white">{regionParts[1] || regionParts[0] || '–'}</p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] mb-0.5" style={{ color: '#888' }}>{post.team?.name}</p>
                    <p className="font-bold text-[13px] text-white leading-snug line-clamp-2 mb-2">{post.title}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-[6px]"
                        style={{ background: dateInfo.urgent ? 'rgba(192,90,77,.14)' : '#191919', color: dateInfo.urgent ? '#e07a6d' : '#aaa', border: dateInfo.urgent ? '1px solid rgba(192,90,77,.2)' : '1px solid transparent' }}>
                        {dateInfo.label}{post.match_time ? ` ${post.match_time}` : ''}
                      </span>
                      {(isMyPost || hasApplied) && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-[6px]"
                          style={{ background: 'var(--chip)', color: 'var(--accent)' }}>
                          {isMyPost ? '내 글' : '신청함'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right badges */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-[7px]"
                      style={{ color: levelColor, background: `${levelColor}1f` }}>
                      {post.level}
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-[7px]"
                      style={{ background: '#191919', color: '#aaa', border: '1px solid #2a2a2a' }}>
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
      <span className="text-[11px] font-bold w-7 flex-shrink-0" style={{ color: '#666' }}>{label}</span>
      <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className="px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition"
            style={{ background: value === opt ? 'var(--accent)' : '#191919', color: value === opt ? '#0a0a0a' : '#aaa', border: `1px solid ${value === opt ? 'transparent' : '#2a2a2a'}` }}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
