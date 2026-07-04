'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Eye, EyeOff, Globe } from 'lucide-react'
import type { TeamPublicProfile } from '@/types/database'
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
    emoji: '⚽',
    bio: '',
    region: '',
    preferred_format: '',
    level: '',
    is_public: false,
  })
  const supabase = createClient()

  useEffect(() => {
    init()
  }, [])

  const init = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }

    const resolved = await resolveTeam(supabase, user.id)
    if (!resolved || (!resolved.isOwner && resolved.role !== 'coach')) {
      toast.error('감독/코치만 수정할 수 있어요')
      router.back()
      return
    }

    setTeamId(resolved.teamId)

    const { data: team } = await supabase
      .from('teams')
      .select('name')
      .eq('id', resolved.teamId)
      .single()
    if (team) setTeamName(team.name)

    const { data: profile } = await supabase
      .from('team_public_profiles')
      .select('*')
      .eq('team_id', resolved.teamId)
      .maybeSingle()

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
      .upsert({
        team_id: teamId,
        ...form,
        updated_at: new Date().toISOString(),
      })

    if (error) toast.error('저장에 실패했어요')
    else toast.success('팀 프로필을 저장했어요')

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <header className="sticky top-0 z-40 bg-white border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1">팀 공개 프로필</h1>
          <button onClick={handleSave} disabled={saving}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Visibility toggle */}
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${form.is_public ? 'bg-primary-50' : 'bg-gray-100'}`}>
                {form.is_public ? <Globe className="w-5 h-5 text-primary-600" /> : <EyeOff className="w-5 h-5 text-gray-400" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {form.is_public ? '커뮤니티에 공개됨' : '비공개'}
                </p>
                <p className="text-xs text-gray-500">
                  {form.is_public ? '다른 팀이 우리팀 프로필을 볼 수 있어요' : '매칭 신청 시 기본 정보만 공개돼요'}
                </p>
              </div>
            </div>
            <button
              onClick={() => set('is_public', !form.is_public)}
              className={`relative w-12 h-7 rounded-full transition-colors ${form.is_public ? 'bg-primary-600' : 'bg-gray-200'}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        {/* Emoji picker */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-3">팀 이모지</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => set('emoji', e)}
                className={`w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition ${
                  form.emoji === e ? 'bg-primary-50 ring-2 ring-primary-400' : 'bg-gray-50 hover:bg-gray-100'
                }`}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Team name (read-only) */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-2">팀 이름</label>
          <p className="text-sm font-semibold text-gray-700">{teamName}</p>
        </div>

        {/* Bio */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-2">팀 소개</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="우리 팀을 소개해주세요. 창단년도, 주요 활동 지역, 팀 분위기 등..."
            rows={3}
            maxLength={200}
            className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{form.bio.length}/200</p>
        </div>

        {/* Region */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-2">주 활동 지역</label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button key={r} onClick={() => set('region', form.region === r ? '' : r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                  form.region === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                }`}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Format & Level */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">선호 경기 방식</label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => set('preferred_format', form.preferred_format === f ? '' : f)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex-1 transition ${
                    form.preferred_format === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">팀 수준</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => set('level', form.level === l ? '' : l)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex-1 transition ${
                    form.level === l ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
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
