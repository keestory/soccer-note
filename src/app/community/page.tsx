'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { Plus, MapPin, Calendar, Users, ChevronRight, Search, Filter, Clock, Trophy, Dumbbell, Settings } from 'lucide-react'
import type { MatchPost } from '@/types/database'
import { format, isToday, isTomorrow, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'

const REGIONS = ['전체', '서울', '경기', '인천', '부산', '대구', '광주', '대전', '강원', '충청', '전라', '경상', '제주']
const FORMATS = ['전체', '5vs5', '6vs6', '7vs7', '8vs8', '11vs11']
const LEVELS = ['전체', '입문', '초급', '중급', '고급']

const LEVEL_COLOR: Record<string, string> = {
  '입문': 'bg-gray-100 text-gray-600',
  '초급': 'bg-blue-100 text-blue-700',
  '중급': 'bg-emerald-100 text-emerald-700',
  '고급': 'bg-amber-100 text-amber-700',
}

function formatMatchDate(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return '오늘'
  if (isTomorrow(d)) return '내일'
  return format(d, 'M월 d일(EEE)', { locale: ko })
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

  useEffect(() => {
    init()
  }, [])

  useEffect(() => {
    if (teamId) loadPosts()
  }, [teamId, filterRegion, filterFormat, filterLevel])

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
      .select(`
        *,
        team:teams(id, name),
        team_profile:team_public_profiles(emoji, region, level)
      `)
      .eq('status', 'open')
      .gte('expires_at', new Date().toISOString())
      .order('match_date', { ascending: true })

    if (filterRegion !== '전체') query = query.eq('region', filterRegion)
    if (filterFormat !== '전체') query = query.eq('format', filterFormat)
    if (filterLevel !== '전체') query = query.eq('level', filterLevel)

    const { data, error } = await query
    if (error) { toast.error('게시글을 불러오지 못했어요'); setLoading(false); return }

    setPosts(data || [])

    // Load which posts are mine and which I've applied to
    if (teamId) {
      const { data: myPosts } = await supabase
        .from('match_posts')
        .select('id')
        .eq('team_id', teamId)

      const { data: myApps } = await supabase
        .from('match_applications')
        .select('post_id')
        .eq('applying_team_id', teamId)

      setMyPostIds(new Set((myPosts || []).map((p: { id: string }) => p.id)))
      setAppliedPostIds(new Set((myApps || []).map((a: { post_id: string }) => a.post_id)))
    }

    setLoading(false)
  }

  const activeFilters = [filterRegion, filterFormat, filterLevel].filter(f => f !== '전체').length

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">매칭 커뮤니티</h1>
            <p className="text-xs text-gray-400">상대팀을 찾아보세요</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`relative p-2 rounded-xl transition ${showFilters ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50'}`}
            >
              <Filter className="w-5 h-5" />
              {activeFilters > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-primary-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {activeFilters}
                </span>
              )}
            </button>
            {isCoach && (
              <Link href="/community/new"
                className="flex items-center gap-1.5 bg-primary-600 text-white px-3 py-2 rounded-xl text-sm font-semibold active:scale-95 transition">
                <Plus className="w-4 h-4" />
                <span>글쓰기</span>
              </Link>
            )}
          </div>
        </div>

        {/* Filter chips */}
        {showFilters && (
          <div className="border-t bg-gray-50 px-4 py-3 space-y-2.5">
            <FilterRow label="지역" options={REGIONS} value={filterRegion} onChange={setFilterRegion} />
            <FilterRow label="방식" options={FORMATS} value={filterFormat} onChange={setFilterFormat} />
            <FilterRow label="수준" options={LEVELS} value={filterLevel} onChange={setFilterLevel} />
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-2xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-2/3 mb-3" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/3" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-3">⚽</div>
            <p className="text-gray-500 font-medium">등록된 매칭 요청이 없어요</p>
            <p className="text-gray-400 text-sm mt-1">필터를 바꾸거나 먼저 글을 올려보세요</p>
            {isCoach && (
              <Link href="/community/new"
                className="inline-flex items-center gap-2 mt-6 bg-primary-600 text-white px-5 py-3 rounded-2xl font-semibold active:scale-95 transition">
                <Plus className="w-4 h-4" /> 매칭 요청 올리기
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const isMyPost = myPostIds.has(post.id)
              const hasApplied = appliedPostIds.has(post.id)

              return (
                <Link key={post.id} href={`/community/${post.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm active:scale-[0.99] transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Team name + badges */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-base">{(post as any).team_profile?.emoji || '⚽'}</span>
                        <span className="text-sm font-semibold text-gray-800 truncate">{post.team?.name}</span>
                        {isMyPost && (
                          <span className="text-[10px] font-bold bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">우리팀</span>
                        )}
                        {hasApplied && !isMyPost && (
                          <span className="text-[10px] font-bold bg-lime-100 text-lime-700 px-2 py-0.5 rounded-full">신청함</span>
                        )}
                      </div>

                      {/* Title */}
                      <p className="text-gray-900 font-medium text-sm leading-snug mb-2 line-clamp-2">{post.title}</p>

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatMatchDate(post.match_date)}
                          {post.match_time && <span className="ml-0.5">{post.match_time}</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          {post.region} · {post.location}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEVEL_COLOR[post.level] || 'bg-gray-100 text-gray-600'}`}>
                        {post.level}
                      </span>
                      <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">
                        {post.format}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-300 mt-1" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-bottom">
        <div className="max-w-4xl mx-auto px-2">
          <div className="flex justify-around py-2">
            <Link href="/dashboard" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Trophy className="w-6 h-6" />
              <span className="text-xs font-medium">경기</span>
            </Link>
            <Link href="/team/players" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Users className="w-6 h-6" />
              <span className="text-xs font-medium">선수</span>
            </Link>
            <Link href="/training/new" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Dumbbell className="w-6 h-6" />
              <span className="text-xs font-medium">훈련</span>
            </Link>
            <Link href="/community" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl bg-primary-50 text-primary-600">
              <span className="text-xl leading-6">⚽</span>
              <span className="text-xs font-medium">매칭</span>
            </Link>
            <Link href="/team/members" className="flex flex-col items-center gap-0.5 min-w-[56px] py-1.5 rounded-xl text-gray-400 hover:bg-gray-50">
              <Settings className="w-6 h-6" />
              <span className="text-xs font-medium">팀 관리</span>
            </Link>
          </div>
        </div>
      </nav>
    </div>
  )
}

function FilterRow({ label, options, value, onChange }: {
  label: string
  options: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold text-gray-500 w-8 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition flex-shrink-0 ${
              value === opt
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  )
}
