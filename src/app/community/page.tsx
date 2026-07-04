'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { Plus, MapPin, Calendar, Users, ChevronRight, Filter, Clock, Trophy, Dumbbell, Settings, Swords } from 'lucide-react'
import type { MatchPost } from '@/types/database'
import { format, isToday, isTomorrow, parseISO, differenceInDays } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'

const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '강원', '충청', '전라', '경상', '제주']
const FORMATS = ['전체', '5vs5', '6vs6', '7vs7', '8vs8', '11vs11']
const LEVELS = ['전체', '입문', '초급', '중급', '고급']

const LEVEL_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  '입문': { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
  '초급': { bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
  '중급': { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  '고급': { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
}

function formatMatchDate(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return { label: '오늘', urgent: true }
  if (isTomorrow(d)) return { label: '내일', urgent: true }
  const diff = differenceInDays(d, new Date())
  if (diff <= 7) return { label: `${diff}일 후`, urgent: false }
  return { label: format(d, 'M월 d일(EEE)', { locale: ko }), urgent: false }
}

export default function CommunityPage() {
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

    if (filterRegion !== '전체') query = query.eq('region', filterRegion)
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
    <div className="min-h-screen bg-[#f0f4f0] pb-24">

      {/* Hero Header */}
      <header className="relative overflow-hidden bg-[#0f2d0f] safe-top">
        {/* Field stripe pattern */}
        <div className="absolute inset-0 field-pattern opacity-60" />
        {/* Diagonal speed lines SVG */}
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice">
          <line x1="320" y1="-10" x2="180" y2="130" stroke="rgba(163,230,53,0.15)" strokeWidth="1.5" />
          <line x1="360" y1="-10" x2="220" y2="130" stroke="rgba(163,230,53,0.10)" strokeWidth="1" />
          <line x1="395" y1="-10" x2="255" y2="130" stroke="rgba(163,230,53,0.07)" strokeWidth="0.8" />
          <circle cx="60" cy="85" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
          <circle cx="60" cy="85" r="22" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
        </svg>

        <div className="relative px-4 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-lime-400/80 uppercase">Match Community</span>
              </div>
              <h1 className="text-2xl font-black text-white tracking-tight leading-none">
                상대팀 찾기
              </h1>
              <p className="text-sm text-white/50 mt-1">함께 뛸 팀을 구해보세요</p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`relative p-2.5 rounded-xl border transition ${
                  showFilters || activeFilters > 0
                    ? 'bg-lime-400 border-lime-400 text-[#0f2d0f]'
                    : 'bg-white/10 border-white/20 text-white/70'
                }`}>
                <Filter className="w-4 h-4" />
                {activeFilters > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-white text-[#0f2d0f] text-[10px] font-black rounded-full flex items-center justify-center">
                    {activeFilters}
                  </span>
                )}
              </button>
              {isCoach && (
                <Link href="/community/new"
                  className="flex items-center gap-1.5 bg-lime-400 text-[#0f2d0f] px-3.5 py-2.5 rounded-xl text-sm font-black active:scale-95 transition shadow-lg shadow-lime-400/20">
                  <Plus className="w-4 h-4" />
                  글쓰기
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="relative border-t border-white/10 bg-[#0a2208]/80 backdrop-blur-sm px-4 py-3 space-y-2.5">
            <FilterRow label="지역" options={REGIONS} value={filterRegion} onChange={setFilterRegion} />
            <FilterRow label="방식" options={FORMATS} value={filterFormat} onChange={setFilterFormat} />
            <FilterRow label="수준" options={LEVELS} value={filterLevel} onChange={setFilterLevel} />
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gray-100 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-100 rounded w-1/3" />
                    <div className="h-4 bg-gray-100 rounded w-2/3" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-3xl bg-[#0f2d0f] flex items-center justify-center text-4xl mx-auto mb-4">⚽</div>
            <p className="text-gray-700 font-bold text-lg">매칭 요청이 없어요</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">필터를 바꾸거나 먼저 글을 올려보세요</p>
            {isCoach && (
              <Link href="/community/new"
                className="inline-flex items-center gap-2 bg-[#0f2d0f] text-lime-400 px-5 py-3 rounded-2xl font-bold active:scale-95 transition">
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
              const emoji = (post as any).team_profile?.emoji || '⚽'

              return (
                <Link key={post.id} href={`/community/${post.id}`}
                  className="block bg-white rounded-2xl overflow-hidden shadow-sm active:scale-[0.99] transition">

                  {/* Accent bar */}
                  <div className={`h-1 w-full ${isMyPost ? 'bg-primary-500' : hasApplied ? 'bg-lime-400' : 'bg-gray-100'}`} />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Team emoji avatar */}
                      <div className="w-11 h-11 rounded-2xl bg-[#0f2d0f] flex items-center justify-center text-xl flex-shrink-0">
                        {emoji}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Team name row */}
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-gray-500 truncate">{post.team?.name}</span>
                          {isMyPost && <span className="text-[10px] font-black bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-md">내 글</span>}
                          {hasApplied && !isMyPost && <span className="text-[10px] font-black bg-lime-100 text-lime-700 px-1.5 py-0.5 rounded-md">신청함</span>}
                        </div>

                        {/* Title */}
                        <p className="text-sm font-bold text-gray-900 leading-snug line-clamp-2 mb-2.5">{post.title}</p>

                        {/* Date + Location chips */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg ${
                            dateInfo.urgent ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {dateInfo.label}
                            {post.match_time && <span className="ml-0.5 opacity-70">{post.match_time}</span>}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="w-3 h-3" />
                            {post.region}
                          </span>
                        </div>
                      </div>

                      {/* Right badges */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-xl ${levelStyle.bg} ${levelStyle.text}`}>
                          {post.level}
                        </span>
                        <span className="text-xs font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg">
                          {post.format}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-bottom">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around py-2">
            <Link href="/dashboard" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Trophy className="w-6 h-6" /><span className="text-xs font-medium">경기</span>
            </Link>
            <Link href="/team/players" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Users className="w-6 h-6" /><span className="text-xs font-medium">선수</span>
            </Link>
            <Link href="/training/new" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Dumbbell className="w-6 h-6" /><span className="text-xs font-medium">훈련</span>
            </Link>
            <Link href="/community" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl bg-[#0f2d0f] text-lime-400">
              <span className="text-xl leading-6">⚽</span><span className="text-xs font-black">매칭</span>
            </Link>
            <Link href="/team/members" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Settings className="w-6 h-6" /><span className="text-xs font-medium">팀 관리</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

function FilterRow({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-white/50 w-7 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap flex-shrink-0 transition ${
              value === opt
                ? 'bg-lime-400 text-[#0f2d0f]'
                : 'bg-white/10 text-white/60 border border-white/10'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
