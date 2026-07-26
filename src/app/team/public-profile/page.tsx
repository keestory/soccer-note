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

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }

  if (loading) {
    return (
      <div className="light min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--text)', borderTopColor: 'transparent' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-12" style={{ background: 'var(--bg)' }}>

      {/* Hero header */}
      <div className="relative overflow-hidden safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="absolute inset-0 field-pattern opacity-20" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 110" preserveAspectRatio="xMidYMid slice">
          <line x1="340" y1="-10" x2="200" y2="120" stroke="rgba(204,255,0,0.08)" strokeWidth="1.5" />
          <line x1="375" y1="-10" x2="235" y2="120" stroke="rgba(204,255,0,0.04)" strokeWidth="1" />
          <circle cx="50" cy="80" r="45" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        </svg>

        <div className="relative px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl" style={{ color: 'var(--text2)' }}>
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.3)' }}>매칭 커뮤니티</p>
            <h1 className="text-base font-black text-[color:var(--text)]">팀 프로필 설정</h1>
          </div>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95 transition"
            style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        {/* Preview card in hero */}
        <div className="relative px-4 pb-6">
          <div className="rounded-2xl p-3.5 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
              {form.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-[color:var(--text)] truncate">{teamName}</p>
              <p className="text-xs truncate" style={{ color: 'var(--muted2)' }}>
                {[form.level, form.region, form.preferred_format].filter(Boolean).join(' · ') || '프로필을 완성해주세요'}
              </p>
            </div>
            <div className="w-2 h-2 rounded-full" style={{ background: form.is_public ? 'var(--navy)' : 'rgba(255,255,255,0.2)' }} />
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-3">

        {/* Visibility */}
        <div style={cardStyle} className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition"
                style={{ background: form.is_public ? 'var(--chip)' : 'var(--card2)' }}>
                {form.is_public
                  ? <Globe className="w-5 h-5" style={{ color: 'var(--text)' }} />
                  : <EyeOff className="w-5 h-5" style={{ color: 'rgba(255,255,255,0.3)' }} />}
              </div>
              <div>
                <p className="font-black text-[color:var(--text)]">
                  {form.is_public ? '커뮤니티 공개' : '비공개'}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted2)' }}>
                  {form.is_public ? '다른 팀이 프로필을 볼 수 있어요' : '신청 시 기본 정보만 공개돼요'}
                </p>
              </div>
            </div>
            <button
              onClick={() => set('is_public', !form.is_public)}
              className="relative w-12 h-7 rounded-full transition-colors"
              style={{ background: form.is_public ? 'var(--navy)' : 'var(--line)' }}>
              <div className={`absolute top-1 w-5 h-5 rounded-full shadow transition-transform ${form.is_public ? 'translate-x-6' : 'translate-x-1'}`}
                style={{ background: form.is_public ? 'var(--accent)' : 'var(--muted2)' }} />
            </button>
          </div>
        </div>

        {/* Emoji */}
        <div style={cardStyle} className="p-4">
          <label className="block text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>팀 이모지</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => set('emoji', e)}
                className="w-12 h-12 rounded-2xl text-2xl flex items-center justify-center transition"
                style={form.emoji === e
                  ? { background: 'var(--chip)', outline: '2px solid var(--accent)' }
                  : { background: 'var(--card2)' }}>
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* Bio */}
        <div style={cardStyle} className="p-4">
          <label className="block text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>팀 소개</label>
          <textarea
            value={form.bio}
            onChange={e => set('bio', e.target.value)}
            placeholder="창단년도, 주요 활동 지역, 팀 분위기를 소개해주세요"
            rows={3}
            maxLength={200}
            className="w-full text-sm outline-none resize-none leading-relaxed"
            style={{ background: 'transparent', color: 'rgba(255,255,255,0.8)', caretColor: 'var(--text)' }}
          />
          <div className="flex justify-end">
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{form.bio.length}/200</span>
          </div>
        </div>

        {/* Region */}
        <div style={cardStyle} className="p-4">
          <label className="block text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.3)' }}>주 활동 지역</label>
          <div className="flex flex-wrap gap-2">
            {REGIONS.map(r => (
              <button key={r} onClick={() => set('region', form.region === r ? '' : r)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold transition"
                style={form.region === r
                  ? { background: 'var(--chip)', border: '1px solid var(--accent)', color: 'var(--text)' }
                  : { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--muted2)' }}>
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Format & Level */}
        <div style={{ ...cardStyle, overflow: 'hidden', padding: 0 }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid var(--line)' }}>
            <label className="block text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>선호 경기 방식</label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => set('preferred_format', form.preferred_format === f ? '' : f)}
                  className="px-3 py-2 rounded-xl text-xs font-black flex-1 transition"
                  style={form.preferred_format === f
                    ? { background: 'var(--chip)', border: '1px solid var(--accent)', color: 'var(--text)' }
                    : { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--muted2)' }}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <label className="block text-[11px] font-black uppercase tracking-widest mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>팀 수준</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => set('level', form.level === l ? '' : l)}
                  className="px-4 py-2 rounded-xl text-xs font-black flex-1 transition"
                  style={form.level === l
                    ? { background: 'var(--chip)', border: '1px solid var(--accent)', color: 'var(--text)' }
                    : { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--muted2)' }}>
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
