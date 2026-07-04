'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Calendar, MapPin, Users, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const REGIONS = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '강원', '충청', '전라', '경상', '제주']
const FORMATS = ['5vs5', '6vs6', '7vs7', '8vs8', '11vs11']
const LEVELS = ['입문', '초급', '중급', '고급']
const TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00']

export default function NewPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    match_date: '',
    match_time: '',
    location: '',
    region: '',
    format: '7vs7',
    level: '초급',
    description: '',
  })
  const supabase = createClient()

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('제목을 입력해주세요'); return }
    if (!form.match_date) { toast.error('경기 날짜를 선택해주세요'); return }
    if (!form.location.trim()) { toast.error('경기 장소를 입력해주세요'); return }
    if (!form.region) { toast.error('지역을 선택해주세요'); return }

    setSaving(true)
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }

    const resolved = await resolveTeam(supabase, user.id)
    if (!resolved) { toast.error('팀 정보를 찾을 수 없어요'); setSaving(false); return }

    const { data, error } = await supabase
      .from('match_posts')
      .insert({
        team_id: resolved.teamId,
        title: form.title.trim(),
        match_date: form.match_date,
        match_time: form.match_time || null,
        location: form.location.trim(),
        region: form.region,
        format: form.format,
        level: form.level,
        description: form.description.trim() || null,
      })
      .select('id')
      .single()

    if (error) {
      toast.error('게시글 등록에 실패했어요')
      setSaving(false)
      return
    }

    toast.success('매칭 요청을 올렸어요! 🎉')
    router.push(`/community/${data.id}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b safe-top">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-gray-500 hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900 flex-1">매칭 요청 올리기</h1>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition">
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-4">
        {/* Title */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-2">제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="예) 주말 오전 7vs7 상대팀 구합니다"
            maxLength={60}
            className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none"
          />
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> 경기 날짜 *
            </label>
            <input
              type="date"
              value={form.match_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => set('match_date', e.target.value)}
              className="w-full text-sm text-gray-900 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 경기 시간 (선택)
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {TIMES.map(t => (
                <button key={t} onClick={() => set('match_time', form.match_time === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition ${
                    form.match_time === t ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" /> 경기 장소 *
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="예) 상암 월드컵 구장"
              className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">지역 *</label>
            <div className="flex flex-wrap gap-2">
              {REGIONS.map(r => (
                <button key={r} onClick={() => set('region', r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    form.region === r ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Format & Level */}
        <div className="bg-white rounded-2xl p-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 경기 방식
            </label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => set('format', f)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex-1 transition ${
                    form.format === f ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">수준</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => set('level', l)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold flex-1 transition ${
                    form.level === l ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl p-4">
          <label className="block text-xs font-semibold text-gray-500 mb-2">추가 설명 (선택)</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="팀 소개, 요청 사항, 구장 정보 등을 자유롭게 적어주세요"
            rows={4}
            maxLength={500}
            className="w-full text-sm text-gray-900 placeholder-gray-400 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{form.description.length}/500</p>
        </div>
      </main>
    </div>
  )
}
