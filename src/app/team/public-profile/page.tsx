'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Globe, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '강원', '충청', '전라', '경상', '제주']
const FORMATS = ['5vs5', '6vs6', '7vs7', '8vs8', '11vs11']
const LEVELS = ['입문', '초급', '중급', '고급']
const EMOJIS = ['⚽', '🏆', '🔥', '⚡', '💪', '🦁', '🐯', '🦅', '🌟', '💎', '🎯', '🏅']

export default function PublicProfilePage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')
  const [form, setForm] = useState({
    emoji: '⚽', bio: '', region: '', preferred_format: '', level: '', is_public: false,
  })
  const supabase = createClient()

  useEffect(() => { init() }, [])

  const init = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const resolved = await resolveTeam(supabase, user.id)
    if (!resolved || (!resolved.isOwner && resolved.role !== 'coach')) {
      toast.error('감독/코치만 수정할 수 있어요'); router.back(); return
    }
    setTeamId(resolved.teamId)

    const [{ data: team }, { data: profile }] = await Promise.all([
      supabase.from('teams').select('name').eq('id', resolved.teamId).single(),
      supabase.from('team_public_profiles').select('*').eq('team_id', resolved.teamId).maybeSingle(),
    ])

    if (team) setTeamName(team.name)
    if (profile) {
      setForm({
        emoji: profile.emoji || '⚽',
        bio: profile.bio || '',
        region: profile.region || '',
        preferred_format: profile.preferred_format || '',
        level: profile.level || '',
        is_public: profile.is_public,
      })
    }
    setLoading(false)
  }

  const set = (key: string, val: string | boolean) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    if (!teamId) return
    setSaving(true)
    const { error } = await supabase
      .from('team_public_profiles')
      .upsert({ team_id: teamId, ...form, updated_at: new Date().toISOString() })
    if (error) toast.error('저장에 실패했어요')
    else toast.success('팀 프로필을 저장했어요 ✨')
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f2d0f] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-12">

      {/* Hero header */}
      <div className="relative bg-[#0f2d0f] overflow-hidden safe-top">
        <div className="absolute inset-0 field-pattern opacity-60" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="200" y2="120" stroke="rgba(163,230,53,0.12)" strokeWidth="1.5" />
          <line x1="375" y1="-10" x2="235" y2="120" stroke="rgba(163,230,53,0.07)" strokeWidth="1" />
          <circle cx="50" cy="80" r="45" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        </svg>

        <div className="relative px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold text-white/40 uppercase tracking-widest">매칭 커뮤니티</p>
            <h1 className="text-base font-black text-white">팀 프로필 설정</h1>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="bg-lime-400 text-[#0f2d0f] px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95 transition shadow-lg shadow-lime-400/30">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* Preview card in hero */}
        <div className="relative px-4 pb-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center text-2xl">
              {form.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-white truncate">{teamName}</p>
              <p className="text-xs text-white/50 truncate">
                {[form.level, form.region, form.preferred_format].filter(Boolean).join(' · ') || '프로필을 완성해주세요'}
              </p>
            </div>
            <div className={`w-2 h-2 rounded-full ${form.is_public ? 'bg-lime-400' : 'bg-white/30'}`} />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-3">

        {/* Visibility */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
                form.is_public ? 'bg-[#0f2d0f]' : 'bg-gray-100'
              }`}>
                {form.is_public
                  ? <Globe className="w-5 h-5 text-lime-400" />
                  : <EyeOff className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className="font-black text-gray-900">
                  {form.is_public ? '커뮤니티 공개' : '비공개'}
                </p>
                <p className="text-xs text-gray-500">
                  {form.is_public ? '다른 팀이 프로필을 볼 수 있어요' : '신청 시 기본 정보만 공개돼요'}
                </p>
              </div>
            </div>
            <button
              onClick={() => set('is_public', !form.is_public)}
              className={`relative w-12 h-7 rounded-full transition-colors ${form.is_public ? 'bg-[#0f2d0f]' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Emoji */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">팀 이모지</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => set('emoji', e)}
                className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition ${
                  form.emoji === e
                    ? 'bg-[#0f2d0f] ring-2 ring-lime-400'
                    : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">팀 소개</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="창단년도, 주요 활동 지역, 팀 분위기를 소개해주세요"
            rows={3}
            maxLength={200}
            className="w-full text-sm text-gray-800 placeholder-gray-300 outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end">
            <span className="text-[11px] text-gray-400">{form.bio.length}/200</span>
          </div>
        </div>

        {/* Region */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">주 활동 지역</label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button key={r} onClick={() => set('region', form.region === r ? '' : r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  form.region === r
                    ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                    : 'bg-gray-50 border-gray-100 text-gray-500'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Format & Level */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-50">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">선호 경기 방식</label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => set('preferred_format', form.preferred_format === f ? '' : f)}
                  className={`px-3 py-2 rounded-xl text-xs font-black flex-1 transition border ${
                    form.preferred_format === f
                      ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">팀 수준</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => set('level', form.level === l ? '' : l)}
                  className={`px-4 py-2 rounded-xl text-xs font-black flex-1 transition border ${
                    form.level === l
                      ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
