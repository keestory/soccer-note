'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Calendar, MapPin, Users, Clock, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const SIDO_LIST = ['서울', '경기', '인천', '부산', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

const DISTRICTS: Record<string, string[]> = {
  '서울': ['강남구','강동구','강북구','강서구','관악구','광진구','구로구','금천구','노원구','도봉구','동대문구','동작구','마포구','서대문구','서초구','성동구','성북구','송파구','양천구','영등포구','용산구','은평구','종로구','중구','중랑구'],
  '경기': ['수원시','성남시','의정부시','안양시','부천시','광명시','평택시','동두천시','안산시','고양시','과천시','구리시','남양주시','오산시','시흥시','군포시','의왕시','하남시','용인시','파주시','이천시','안성시','김포시','화성시','광주시','양주시','포천시','여주시','연천군','가평군','양평군'],
  '인천': ['중구','동구','미추홀구','연수구','남동구','부평구','계양구','서구','강화군','옹진군'],
  '부산': ['중구','서구','동구','영도구','부산진구','동래구','남구','북구','해운대구','사하구','금정구','강서구','연제구','수영구','사상구','기장군'],
  '대구': ['중구','동구','서구','남구','북구','수성구','달서구','달성군'],
  '광주': ['동구','서구','남구','북구','광산구'],
  '대전': ['동구','중구','서구','유성구','대덕구'],
  '울산': ['중구','남구','동구','북구','울주군'],
  '세종': ['세종시'],
  '강원': ['춘천시','원주시','강릉시','동해시','태백시','속초시','삼척시','홍천군','횡성군','영월군','평창군','정선군','철원군','화천군','양구군','인제군','고성군','양양군'],
  '충북': ['청주시','충주시','제천시','보은군','옥천군','영동군','증평군','진천군','괴산군','음성군','단양군'],
  '충남': ['천안시','공주시','보령시','아산시','서산시','논산시','계룡시','당진시','금산군','부여군','서천군','청양군','홍성군','예산군','태안군'],
  '전북': ['전주시','군산시','익산시','정읍시','남원시','김제시','완주군','진안군','무주군','장수군','임실군','순창군','고창군','부안군'],
  '전남': ['목포시','여수시','순천시','나주시','광양시','담양군','곡성군','구례군','고흥군','보성군','화순군','장흥군','강진군','해남군','영암군','무안군','함평군','영광군','장성군','완도군','진도군','신안군'],
  '경북': ['포항시','경주시','김천시','안동시','구미시','영주시','영천시','상주시','문경시','경산시','군위군','의성군','청송군','영양군','영덕군','청도군','고령군','성주군','칠곡군','예천군','봉화군','울진군','울릉군'],
  '경남': ['창원시','진주시','통영시','사천시','김해시','밀양시','거제시','양산시','의령군','함안군','창녕군','고성군','남해군','하동군','산청군','함양군','거창군','합천군'],
  '제주': ['제주시','서귀포시'],
}
const FORMATS = ['5vs5', '6vs6', '7vs7', '8vs8', '11vs11']
const LEVELS = ['입문', '초급', '중급', '고급']
const TIMES = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00']

const LEVEL_COLOR: Record<string, string> = {
  '입문': 'border-slate-300 bg-slate-50 text-slate-700',
  '초급': 'border-sky-300 bg-sky-50 text-sky-700',
  '중급': 'border-emerald-400 bg-emerald-50 text-emerald-700',
  '고급': 'border-amber-400 bg-amber-50 text-amber-700',
}
const LEVEL_ACTIVE: Record<string, string> = {
  '입문': 'border-slate-500 bg-slate-500 text-white',
  '초급': 'border-sky-500 bg-sky-500 text-white',
  '중급': 'border-emerald-600 bg-emerald-600 text-white',
  '고급': 'border-amber-500 bg-amber-500 text-white',
}

export default function NewPostPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', match_date: '', match_time: '',
    location: '', region: '', district: '', format: '7vs7', level: '초급', description: '',
  })
  const supabase = createClient()

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    if (!form.title.trim()) { toast.error('제목을 입력해주세요'); return }
    if (!form.match_date) { toast.error('경기 날짜를 선택해주세요'); return }
    if (!form.location.trim()) { toast.error('경기 장소를 입력해주세요'); return }
    if (!form.region || !form.district) { toast.error('지역을 선택해주세요'); return }

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
        region: `${form.region} ${form.district}`,
        format: form.format,
        level: form.level,
        description: form.description.trim() || null,
      })
      .select('id')
      .single()

    if (error) { toast.error('게시글 등록에 실패했어요'); setSaving(false); return }
    toast.success('매칭 요청을 올렸어요! 🎉')
    router.push(`/community/${data.id}`)
  }

  // Form completion % for progress indicator
  const fields = [form.title, form.match_date, form.location, form.district]
  const filled = fields.filter(Boolean).length
  const progress = Math.round((filled / fields.length) * 100)

  return (
    <div className="min-h-screen bg-[#f0f4f0] pb-12">

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0f2d0f] safe-top">
        {/* Progress bar */}
        <div className="h-0.5 bg-white/10">
          <div
            className="h-full bg-lime-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-base font-black text-white">매칭 요청 올리기</h1>
            <p className="text-[11px] text-white/40">{filled}/{fields.length} 필수 항목 완료</p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={saving || filled < fields.length}
            className="bg-lime-400 text-[#0f2d0f] px-4 py-2 rounded-xl text-sm font-black disabled:opacity-40 active:scale-95 transition shadow-lg shadow-lime-400/30">
            {saving ? '등록 중...' : '등록'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-3">

        {/* Title */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2">제목 *</label>
          <input
            type="text"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="예) 주말 오전 7vs7 상대팀 구합니다"
            maxLength={60}
            className="w-full text-base font-bold text-gray-900 placeholder-gray-300 outline-none"
          />
          {form.title && (
            <div className="flex justify-end mt-1">
              <span className="text-[11px] text-gray-400">{form.title.length}/60</span>
            </div>
          )}
        </div>

        {/* Date & Time */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-50">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              <Calendar className="w-3.5 h-3.5" /> 경기 날짜 *
            </label>
            <input
              type="date"
              value={form.match_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => set('match_date', e.target.value)}
              className="w-full text-base font-bold text-gray-900 outline-none"
            />
          </div>
          <div className="px-4 py-3">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              <Clock className="w-3.5 h-3.5" /> 경기 시간 <span className="text-gray-300 normal-case font-medium">선택</span>
            </label>
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
              {TIMES.map(t => (
                <button key={t} onClick={() => set('match_time', form.match_time === t ? '' : t)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition border ${
                    form.match_time === t
                      ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-50">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              <MapPin className="w-3.5 h-3.5" /> 경기 장소 *
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => set('location', e.target.value)}
              placeholder="예) 상암 월드컵 구장"
              className="w-full text-base font-bold text-gray-900 placeholder-gray-300 outline-none"
            />
          </div>
          <div className="px-4 py-3">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">지역 *</label>
            {/* 시/도 선택 */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
              {SIDO_LIST.map(r => (
                <button key={r} onClick={() => { set('region', r); set('district', '') }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition border ${
                    form.region === r
                      ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                  {r}
                </button>
              ))}
            </div>
            {/* 구/시 선택 */}
            {form.region && (
              <div className="mt-2">
                <p className="text-[10px] text-gray-400 font-bold mb-1.5">{form.region} · 세부 지역</p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {(DISTRICTS[form.region] || []).map(d => (
                    <button key={d} onClick={() => set('district', d)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
                        form.district === d
                          ? 'bg-lime-400 border-lime-400 text-[#0f2d0f]'
                          : 'bg-gray-50 border-gray-100 text-gray-500'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Format & Level */}
        <div className="bg-white rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-50">
            <label className="flex items-center gap-1.5 text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
              <Users className="w-3.5 h-3.5" /> 경기 방식
            </label>
            <div className="flex gap-2">
              {FORMATS.map(f => (
                <button key={f} onClick={() => set('format', f)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-black flex-1 transition border ${
                    form.format === f
                      ? 'bg-[#0f2d0f] border-[#0f2d0f] text-lime-400'
                      : 'bg-gray-50 border-gray-100 text-gray-500'
                  }`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="px-4 py-3">
            <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">수준</label>
            <div className="flex gap-2">
              {LEVELS.map(l => (
                <button key={l} onClick={() => set('level', l)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black flex-1 transition border-2 ${
                    form.level === l ? LEVEL_ACTIVE[l] : LEVEL_COLOR[l]
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl px-4 py-4">
          <label className="block text-[11px] font-black text-gray-400 uppercase tracking-widest mb-2.5">
            추가 설명 <span className="text-gray-300 normal-case font-medium">선택</span>
          </label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="팀 소개, 요청 사항, 구장 정보 등을 자유롭게 적어주세요"
            rows={4}
            maxLength={500}
            className="w-full text-sm text-gray-800 placeholder-gray-300 outline-none resize-none leading-relaxed"
          />
          <div className="flex justify-end mt-1">
            <span className="text-[11px] text-gray-400">{form.description.length}/500</span>
          </div>
        </div>
      </main>
    </div>
  )
}
