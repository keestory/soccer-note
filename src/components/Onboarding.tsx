'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronRight,
  ChevronLeft,
  Star,
  ArrowLeftRight,
} from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

function KVBackground() {
  return (
    <svg
      viewBox="0 0 390 760"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Speed streaks — diagonal, lime accent */}
      <line x1="420" y1="80"  x2="190" y2="-20" stroke="rgba(163,230,53,0.5)"  strokeWidth="2"   strokeLinecap="round"/>
      <line x1="420" y1="130" x2="230" y2="5"   stroke="rgba(163,230,53,0.32)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="420" y1="180" x2="260" y2="20"  stroke="rgba(163,230,53,0.2)"  strokeWidth="1"   strokeLinecap="round"/>
      <line x1="420" y1="220" x2="210" y2="40"  stroke="rgba(255,255,255,0.1)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="400" y1="270" x2="170" y2="70"  stroke="rgba(163,230,53,0.18)" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="420" y1="40"  x2="210" y2="-40" stroke="rgba(255,255,255,0.06)" strokeWidth="1"  strokeLinecap="round"/>
      <line x1="380" y1="310" x2="140" y2="90"  stroke="rgba(163,230,53,0.1)"  strokeWidth="3"   strokeLinecap="round"/>

      {/* Stadium circle hints — right quadrant */}
      <circle cx="350" cy="420" r="190" stroke="rgba(255,255,255,0.05)" strokeWidth="1.5" fill="none"/>
      <circle cx="350" cy="420" r="115" stroke="rgba(255,255,255,0.04)" strokeWidth="1"   fill="none"/>

      {/* Motion trail behind ball */}
      <ellipse cx="165" cy="620" rx="80"  ry="20" fill="rgba(163,230,53,0.09)" transform="rotate(-22 165 620)"/>
      <ellipse cx="215" cy="604" rx="55"  ry="13" fill="rgba(163,230,53,0.06)" transform="rotate(-22 215 604)"/>
      <ellipse cx="255" cy="591" rx="32"  ry="8"  fill="rgba(163,230,53,0.03)" transform="rotate(-22 255 591)"/>

      {/* Soccer ball */}
      <circle cx="100" cy="645" r="60" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.32)" strokeWidth="1.5"/>
      <polygon points="100,598 120,613 114,637 86,637 80,613"          fill="rgba(0,0,0,0.22)" stroke="rgba(255,255,255,0.24)" strokeWidth="0.75"/>
      <polygon points="100,598 80,613 65,600 70,578 100,576"           fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.75"/>
      <polygon points="120,613 136,602 139,580 114,576 100,598"        fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.75"/>
      <polygon points="136,602 141,624 124,638 114,637 120,613"        fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.75"/>
      <polygon points="86,637 114,637 124,638 117,656 76,656"          fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.75"/>
      <polygon points="80,613 86,637 76,656 58,648 55,625"             fill="rgba(0,0,0,0.16)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.75"/>

      {/* Bokeh dots */}
      <circle cx="310" cy="75"  r="3"   fill="rgba(163,230,53,0.45)"/>
      <circle cx="270" cy="110" r="2"   fill="rgba(163,230,53,0.28)"/>
      <circle cx="340" cy="140" r="4.5" fill="rgba(255,255,255,0.07)"/>
      <circle cx="290" cy="48"  r="2"   fill="rgba(163,230,53,0.32)"/>
      <circle cx="360" cy="210" r="3"   fill="rgba(255,255,255,0.06)"/>
      <circle cx="52"  cy="160" r="2.5" fill="rgba(163,230,53,0.2)"/>
      <circle cx="30"  cy="230" r="3"   fill="rgba(255,255,255,0.05)"/>
      <circle cx="180" cy="350" r="2"   fill="rgba(163,230,53,0.15)"/>
      <circle cx="320" cy="500" r="2.5" fill="rgba(255,255,255,0.05)"/>
    </svg>
  )
}

interface OnboardingSlide {
  title: string
  description: string
  forCoach?: boolean
  forParent?: boolean
  mockUI: React.ReactNode
}

export default function Onboarding() {
  const router = useRouter()
  const { t } = useI18n()
  const [currentSlide, setCurrentSlide] = useState(0)
  const [touchStart, setTouchStart] = useState(0)
  const [touchEnd, setTouchEnd] = useState(0)

  const featureSlides: OnboardingSlide[] = [
    { title: t.onboardingSlide1Title, description: t.onboardingSlide1Desc, forCoach: true,  mockUI: <MockDashboard /> },
    { title: t.onboardingSlide2Title, description: t.onboardingSlide2Desc, forCoach: true,  mockUI: <MockFormation /> },
    { title: t.onboardingSlide3Title, description: t.onboardingSlide3Desc, forCoach: true,  mockUI: <MockPlayerRecord /> },
    { title: t.onboardingSlide4Title, description: t.onboardingSlide4Desc, forCoach: true,  mockUI: <MockSubstitution /> },
    { title: t.onboardingSlide5Title, description: t.onboardingSlide5Desc, forParent: true, mockUI: <MockChildStats /> },
    { title: t.onboardingSlide6Title, description: t.onboardingSlide6Desc, forParent: true, mockUI: <MockFeedback /> },
  ]

  const totalSlides = 1 + featureSlides.length // KV + feature slides

  const handleNext = () => {
    if (currentSlide < totalSlides - 1) setCurrentSlide(currentSlide + 1)
    else router.push('/login')
  }
  const handlePrev = () => { if (currentSlide > 0) setCurrentSlide(currentSlide - 1) }
  const handleSkip  = () => router.push('/login')

  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX)
  const handleTouchMove  = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)
  const handleTouchEnd   = () => {
    if (touchStart - touchEnd > 75) handleNext()
    if (touchEnd - touchStart > 75) handlePrev()
  }

  /* ── KV Slide (index 0) ─────────────────────────────────────── */
  if (currentSlide === 0) {
    return (
      <div
        className="min-h-screen relative flex flex-col safe-top safe-bottom overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0a1f0a 0%, #1a3f1a 50%, #2D5A27 100%)' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="field-pattern absolute inset-0 z-0" />
        <KVBackground />

        {/* Skip */}
        <div className="relative z-10 flex justify-end p-4">
          <button onClick={handleSkip} className="text-white/40 text-sm px-3 py-1.5 hover:text-white/70 transition">
            건너뛰기
          </button>
        </div>

        {/* Center content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center -mt-8">
          {/* Ball with glow */}
          <div className="relative w-24 h-24 mb-10">
            <div className="absolute inset-0 bg-lime-400/25 rounded-full blur-2xl scale-150" />
            <div className="relative w-24 h-24 bg-white/10 rounded-full flex items-center justify-center border border-white/20 shadow-2xl">
              <span className="text-5xl select-none">⚽</span>
            </div>
          </div>

          <h1 className="font-display text-5xl font-black text-white leading-[1.15] mb-4">
            같이 뛰면<br />더 즐겁잖아요
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            우리 팀의 경기, 함께 기록해요
          </p>
        </div>

        {/* Bottom CTA */}
        <div className="relative z-10 px-6 pb-8 space-y-3">
          {/* Slide dots */}
          <div className="flex justify-center gap-2 mb-6">
            {Array.from({ length: totalSlides }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={`h-2 rounded-full transition-all ${i === 0 ? 'w-6 bg-lime-400' : 'w-2 bg-white/25'}`}
              />
            ))}
          </div>
          <button
            onClick={handleNext}
            className="w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition"
            style={{ background: '#a3e635', color: '#0a1f0a' }}
          >
            시작하기 <ChevronRight className="w-5 h-5" />
          </button>
          <Link
            href="/login"
            className="block text-center text-white/40 text-sm py-2 hover:text-white/60 transition"
          >
            이미 계정이 있어요
          </Link>
        </div>
      </div>
    )
  }

  /* ── Feature Slides (index 1–6) ─────────────────────────────── */
  const featureIndex = currentSlide - 1
  const slide = featureSlides[featureIndex]
  const isLastSlide = currentSlide === totalSlides - 1

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex flex-col safe-top safe-bottom"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top row: badge + skip */}
      <div className="flex justify-between items-center p-4">
        <div>
          {slide.forCoach  && <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">감독</span>}
          {slide.forParent && <span className="px-3 py-1 bg-primary-100 text-primary-700 text-xs font-semibold rounded-full">학부모</span>}
        </div>
        <button onClick={handleSkip} className="text-gray-500 text-sm font-medium px-4 py-2 hover:text-gray-700">
          건너뛰기
        </button>
      </div>

      {/* Title + description */}
      <div className="px-6 pt-2 pb-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{slide.title}</h2>
        <p className="text-gray-600 text-base leading-relaxed">{slide.description}</p>
      </div>

      {/* Mock UI */}
      <div className="flex-1 px-4 overflow-hidden">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden h-full max-h-[55vh]">
          {slide.mockUI}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-6">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className={`h-2 rounded-full transition-all ${i === currentSlide ? 'w-6 bg-lime-500' : 'w-2 bg-gray-300'}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={handlePrev}
          className="flex-1 py-4 bg-gray-100 text-gray-700 rounded-xl font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" /> 이전
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 bg-primary-600 text-white rounded-xl font-medium flex items-center justify-center gap-2"
        >
          {isLastSlide ? '시작하기' : '다음'} <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}

/* ===== Mock UI Components ===== */

function MockDashboard() {
  const matches = [
    { opponent: 'FC 레드스타',  date: '2026.01.25', home: 3, away: 1, mvp: '이정민', rating: 8.5 },
    { opponent: '블루윙즈 FC', date: '2026.01.18', home: 1, away: 1, mvp: '박준혁', rating: 7.8 },
    { opponent: '드래곤 시티', date: '2026.01.11', home: 2, away: 0, mvp: '최서윤', rating: 9.0 },
  ]
  return (
    <div className="bg-gray-50 p-4 h-full overflow-y-auto">
      <div className="bg-white rounded-xl p-4 shadow-toss mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-500">팀 전적</span>
          <span className="text-sm font-bold text-primary-600">승률 67%</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-2xl font-bold text-gray-900">12</p><p className="text-xs text-gray-500">총 경기</p></div>
          <div><p className="text-2xl font-bold text-primary-600">8</p><p className="text-xs text-gray-500">승</p></div>
          <div><p className="text-2xl font-bold text-red-500">2</p><p className="text-xs text-gray-500">패</p></div>
          <div><p className="text-2xl font-bold text-gray-400">2</p><p className="text-xs text-gray-500">무</p></div>
        </div>
      </div>
      <p className="text-sm font-semibold text-gray-900 mb-3">최근 경기</p>
      <div className="space-y-3">
        {matches.map((m, i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-toss">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-gray-900">vs {m.opponent}</p>
                <p className="text-xs text-gray-500">{m.date}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  <span className="text-primary-600">{m.home}</span>
                  <span className="text-gray-400 mx-1">:</span>
                  <span className="text-gray-600">{m.away}</span>
                </p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.home > m.away ? 'bg-primary-100 text-primary-700' : m.home < m.away ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                  {m.home > m.away ? '승' : m.home < m.away ? '패' : '무'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm text-amber-600">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>MVP: {m.mvp} ({m.rating}점)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockFormation() {
  const players = [
    { name: '김태현', pos: 'GK', x: 50, y: 88, color: '#f59e0b' },
    { name: '이도윤', pos: 'DF', x: 20, y: 68, color: '#3b82f6' },
    { name: '박서준', pos: 'DF', x: 40, y: 70, color: '#3b82f6' },
    { name: '최우진', pos: 'DF', x: 60, y: 70, color: '#3b82f6' },
    { name: '정하윤', pos: 'DF', x: 80, y: 68, color: '#3b82f6' },
    { name: '한지훈', pos: 'MF', x: 30, y: 45, color: '#64748b' },
    { name: '윤성민', pos: 'MF', x: 50, y: 42, color: '#64748b' },
    { name: '강현우', pos: 'MF', x: 70, y: 45, color: '#64748b' },
    { name: '조민재', pos: 'FW', x: 25, y: 20, color: '#ef4444' },
    { name: '배승호', pos: 'FW', x: 50, y: 16, color: '#ef4444' },
    { name: '임준서', pos: 'FW', x: 75, y: 20, color: '#ef4444' },
  ]
  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-900">1쿼터 포메이션</p>
        <span className="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full font-medium">4-3-3</span>
      </div>
      <div className="flex-1 relative bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-xl overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[35%] h-[30%] border-2 border-white/30 rounded-full" />
        </div>
        <div className="absolute top-0 left-[20%] right-[20%] h-[15%] border-b-2 border-l-2 border-r-2 border-white/30" />
        <div className="absolute bottom-0 left-[20%] right-[20%] h-[15%] border-t-2 border-l-2 border-r-2 border-white/30" />
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/30" />
        {players.map((p, i) => (
          <div key={i} className="absolute flex flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white/50" style={{ backgroundColor: p.color }}>
              {p.pos}
            </div>
            <span className="text-[10px] text-white mt-1 font-medium drop-shadow-lg bg-black/30 px-1 rounded">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockPlayerRecord() {
  const records = [
    { name: '배승호', pos: 'FW', rating: 9, goals: 2, assists: 0, praise: '적극적인 슈팅' },
    { name: '조민재', pos: 'FW', rating: 8, goals: 1, assists: 1, praise: '좋은 패스' },
    { name: '윤성민', pos: 'MF', rating: 8, goals: 0, assists: 2, praise: '경기 운영' },
    { name: '한지훈', pos: 'MF', rating: 7, goals: 0, assists: 0, praise: '수비 가담' },
  ]
  const POS_COLORS: Record<string, string> = { FW: '#ef4444', MF: '#64748b', DF: '#3b82f6', GK: '#f59e0b' }
  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-gray-900">1쿼터 선수 평가</p>
        <span className="text-sm text-gray-500">우리팀 <span className="text-primary-600 font-bold">3</span> : <span className="font-bold">1</span></span>
      </div>
      <div className="space-y-3">
        {records.map((r, i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: POS_COLORS[r.pos] }}>{r.pos}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{r.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  {r.goals > 0   && <span className="text-primary-600 font-bold">{r.goals}골</span>}
                  {r.assists > 0 && <span className="text-primary-600 font-bold">{r.assists}도움</span>}
                </div>
              </div>
              <span className={`text-lg font-bold px-3 py-1 rounded-lg ${r.rating >= 8 ? 'bg-primary-100 text-primary-700' : 'bg-gray-100 text-gray-600'}`}>{r.rating}.0</span>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-sm text-amber-700">
              <span className="font-medium">칭찬:</span> {r.praise}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockSubstitution() {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <p className="font-semibold text-gray-900 mb-4">선수 교체 기록</p>
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
          <span className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">15분</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-red-500 font-medium">임준서</span>
            <ArrowLeftRight className="w-4 h-4 text-gray-400" />
            <span className="text-primary-600 font-medium">신동현</span>
          </div>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">FW → FW</span>
        </div>
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-4">
          <span className="text-sm font-bold text-purple-600 bg-purple-100 px-3 py-1 rounded-full">22분</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-red-500 font-medium">강현우</span>
            <ArrowLeftRight className="w-4 h-4 text-gray-400" />
            <span className="text-primary-600 font-medium">오재원</span>
          </div>
          <span className="text-xs text-gray-400 bg-gray-200 px-2 py-1 rounded">MF → MF</span>
        </div>
      </div>
      <div className="relative w-full aspect-[4/3] bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-xl overflow-hidden">
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-white/30" />
        <div className="absolute flex flex-col items-center" style={{ left: '75%', top: '25%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold ring-4 ring-yellow-400">FW</div>
          <span className="text-[10px] text-white mt-1 bg-black/30 px-1 rounded">신동현</span>
          <span className="text-[9px] bg-yellow-400 text-yellow-900 px-2 rounded font-bold mt-0.5">IN 15&apos;</span>
        </div>
        <div className="absolute flex flex-col items-center" style={{ left: '70%', top: '50%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold ring-4 ring-yellow-400">MF</div>
          <span className="text-[10px] text-white mt-1 bg-black/30 px-1 rounded">오재원</span>
          <span className="text-[9px] bg-yellow-400 text-yellow-900 px-2 rounded font-bold mt-0.5">IN 22&apos;</span>
        </div>
      </div>
    </div>
  )
}

function MockChildStats() {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="text-center mb-4">
        <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-3xl">⚽</span>
        </div>
        <h3 className="font-bold text-lg text-gray-900">우리 아이: 배승호</h3>
        <p className="text-sm text-gray-500">포지션: FW</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-primary-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary-600">12</p>
          <p className="text-xs text-gray-500">총 골</p>
        </div>
        <div className="bg-primary-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-primary-600">8</p>
          <p className="text-xs text-gray-500">어시스트</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-amber-600">5</p>
          <p className="text-xs text-gray-500">MVP</p>
        </div>
      </div>
      <div className="bg-gray-50 rounded-xl p-4">
        <p className="font-semibold text-gray-900 mb-3">최근 경기 활약</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">vs FC 레드스타</span>
            <div className="flex items-center gap-2">
              <span className="text-primary-600 font-bold text-sm">2골</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">vs 블루윙즈 FC</span>
            <span className="text-primary-600 font-bold text-sm">1도움</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">vs 드래곤 시티</span>
            <div className="flex items-center gap-2">
              <span className="text-primary-600 font-bold text-sm">1골</span>
              <span className="text-primary-600 font-bold text-sm">1도움</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockFeedback() {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-xl">⚽</span>
        </div>
        <div>
          <h3 className="font-bold text-gray-900">배승호</h3>
          <p className="text-sm text-gray-500">vs FC 레드스타 (01.25)</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="bg-primary-50 rounded-xl p-4 border-l-4 border-primary-500">
          <p className="font-semibold text-primary-700 mb-2">👍 잘한 점</p>
          <p className="text-gray-700">적극적인 슈팅 시도가 좋았어요. 골 결정력이 많이 늘었습니다!</p>
        </div>
        <div className="bg-primary-50 rounded-xl p-4 border-l-4 border-primary-500">
          <p className="font-semibold text-primary-700 mb-2">📈 개선할 점</p>
          <p className="text-gray-700">수비 가담을 조금 더 적극적으로 해주면 좋겠어요.</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border-l-4 border-amber-500">
          <p className="font-semibold text-amber-700 mb-2">⭐ 칭찬해주세요</p>
          <p className="text-gray-700">오늘 2골로 팀 승리에 큰 기여를 했어요. 많이 칭찬해주세요!</p>
        </div>
      </div>
    </div>
  )
}
