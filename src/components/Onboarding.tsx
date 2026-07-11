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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX)
    setTouchEnd(0)
  }
  const handleTouchMove  = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX)
  const handleTouchEnd   = () => {
    if (touchEnd === 0) return
    const diff = touchStart - touchEnd
    if (diff > 75) handleNext()
    else if (diff < -75) handlePrev()
    setTouchEnd(0)
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
            {t.onboardingSkip}
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
            {t.kvTitle1}<br />{t.kvTitle2}
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            {t.kvSubtitle}
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
            {t.onboardingStart} <ChevronRight className="w-5 h-5" />
          </button>
          <Link
            href="/login"
            className="block text-center text-white/40 text-sm py-2 hover:text-white/60 transition"
          >
            {t.haveAccountLink}
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
      className="min-h-screen flex flex-col safe-top safe-bottom"
      style={{ background: '#0a0a0a' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top row: badge + skip */}
      <div className="flex justify-between items-center p-4">
        <div>
          {slide.forCoach  && <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>{t.coach}</span>}
          {slide.forParent && <span className="px-3 py-1 text-xs font-semibold rounded-full" style={{ background: '#002a1a', color: '#2dd4bf' }}>{t.parentBadge}</span>}
        </div>
        <button onClick={handleSkip} className="text-sm font-medium px-4 py-2 transition" style={{ color: 'rgba(255,255,255,0.4)' }}>
          건너뛰기
        </button>
      </div>

      {/* Title + description */}
      <div className="px-6 pt-2 pb-4">
        <h2 className="text-2xl font-bold text-white mb-2">{slide.title}</h2>
        <p className="text-base leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>{slide.description}</p>
      </div>

      {/* Mock UI */}
      <div className="flex-1 px-4 overflow-hidden">
        <div className="rounded-2xl overflow-hidden h-full max-h-[55vh]" style={{ background: '#111010', border: '1px solid var(--line)' }}>
          {slide.mockUI}
        </div>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-2 py-6">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentSlide(i)}
            className="h-2 rounded-full transition-all"
            style={{ width: i === currentSlide ? 24 : 8, background: i === currentSlide ? 'var(--accent)' : 'rgba(255,255,255,0.2)' }}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="px-6 pb-6 flex gap-3">
        <button
          onClick={handlePrev}
          className="flex-1 py-4 rounded-xl font-medium flex items-center justify-center gap-2 transition"
          style={{ background: '#1a1a1a', color: 'rgba(255,255,255,0.6)' }}
        >
          <ChevronLeft className="w-5 h-5" /> {t.onboardingPrev}
        </button>
        <button
          onClick={handleNext}
          className="flex-1 py-4 rounded-xl font-black flex items-center justify-center gap-2 transition active:scale-[0.98]"
          style={{ background: 'var(--accent)', color: '#0a0a0a' }}
        >
          {isLastSlide ? t.onboardingStart : t.onboardingNext} <ChevronRight className="w-5 h-5" />
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
    <div className="p-4 h-full overflow-y-auto" style={{ background: '#111010' }}>
      <div className="rounded-xl p-4 mb-4" style={{ background: '#1a1a1a', border: '1px solid var(--line)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>팀 전적</span>
          <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>승률 67%</span>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          <div><p className="text-2xl font-bold text-white">12</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>총 경기</p></div>
          <div><p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>8</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>승</p></div>
          <div><p className="text-2xl font-bold text-red-400">2</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>패</p></div>
          <div><p className="text-2xl font-bold" style={{ color: 'rgba(255,255,255,0.3)' }}>2</p><p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>무</p></div>
        </div>
      </div>
      <p className="text-sm font-semibold text-white mb-3">최근 경기</p>
      <div className="space-y-3">
        {matches.map((m, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#1a1a1a', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold text-white">vs {m.opponent}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{m.date}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  <span style={{ color: 'var(--accent)' }}>{m.home}</span>
                  <span className="mx-1" style={{ color: 'rgba(255,255,255,0.3)' }}>:</span>
                  <span style={{ color: 'rgba(255,255,255,0.6)' }}>{m.away}</span>
                </p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={m.home > m.away ? { background: 'var(--chip)', color: 'var(--accent)' } :
                         m.home < m.away ? { background: '#2d0f0f', color: '#f87171' } :
                         { background: '#2a2a2a', color: 'rgba(255,255,255,0.4)' }}>
                  {m.home > m.away ? '승' : m.home < m.away ? '패' : '무'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-sm" style={{ color: '#fbbf24' }}>
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
  const POS_COLORS: Record<string, string> = { FW: '#ef4444', MF: '#2dd4bf', DF: '#3b82f6', GK: '#f59e0b' }
  return (
    <div className="p-4 h-full overflow-y-auto" style={{ background: '#111010' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="font-semibold text-white">1쿼터 선수 평가</p>
        <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>우리팀 <span className="font-bold" style={{ color: 'var(--accent)' }}>3</span> : <span className="font-bold text-white">1</span></span>
      </div>
      <div className="space-y-3">
        {records.map((r, i) => (
          <div key={i} className="rounded-xl p-4" style={{ background: '#1a1a1a' }}>
            <div className="flex items-center gap-3 mb-2">
              <span className="w-10 h-10 rounded-full text-white text-xs font-bold flex items-center justify-center" style={{ backgroundColor: POS_COLORS[r.pos] }}>{r.pos}</span>
              <div className="flex-1">
                <p className="font-medium text-white">{r.name}</p>
                <div className="flex items-center gap-2 text-sm">
                  {r.goals > 0   && <span className="font-bold" style={{ color: 'var(--accent)' }}>{r.goals}골</span>}
                  {r.assists > 0 && <span className="font-bold" style={{ color: 'var(--accent)' }}>{r.assists}도움</span>}
                </div>
              </div>
              <span className="text-lg font-bold px-3 py-1 rounded-lg"
                style={r.rating >= 8 ? { background: 'var(--chip)', color: 'var(--accent)' } : { background: '#2a2a2a', color: 'rgba(255,255,255,0.5)' }}>
                {r.rating}.0
              </span>
            </div>
            <div className="rounded-lg p-2 text-sm" style={{ background: '#1a1000', color: '#fbbf24' }}>
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
    <div className="p-4 h-full overflow-y-auto" style={{ background: '#111010' }}>
      <p className="font-semibold text-white mb-4">선수 교체 기록</p>
      <div className="space-y-3 mb-4">
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: '#1a1a1a' }}>
          <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: '#2d1b69', color: '#a78bfa' }}>15분</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-red-400">임준서</span>
            <ArrowLeftRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="font-medium" style={{ color: 'var(--accent)' }}>신동현</span>
          </div>
          <span className="text-xs px-2 py-1 rounded" style={{ background: '#2a2a2a', color: 'rgba(255,255,255,0.4)' }}>FW → FW</span>
        </div>
        <div className="flex items-center gap-3 rounded-xl p-4" style={{ background: '#1a1a1a' }}>
          <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: '#2d1b69', color: '#a78bfa' }}>22분</span>
          <div className="flex items-center gap-2 flex-1">
            <span className="font-medium text-red-400">강현우</span>
            <ArrowLeftRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <span className="font-medium" style={{ color: 'var(--accent)' }}>오재원</span>
          </div>
          <span className="text-xs px-2 py-1 rounded" style={{ background: '#2a2a2a', color: 'rgba(255,255,255,0.4)' }}>MF → MF</span>
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
    <div className="p-4 h-full overflow-y-auto" style={{ background: '#111010' }}>
      <div className="text-center mb-4">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: 'var(--chip)' }}>
          <span className="text-3xl">⚽</span>
        </div>
        <h3 className="font-bold text-lg text-white">우리 아이: 배승호</h3>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>포지션: FW</p>
      </div>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--chip)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>12</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>총 골</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: 'var(--chip)' }}>
          <p className="text-2xl font-bold" style={{ color: 'var(--accent)' }}>8</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>어시스트</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: '#1a1000' }}>
          <p className="text-2xl font-bold" style={{ color: '#fbbf24' }}>5</p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>MVP</p>
        </div>
      </div>
      <div className="rounded-xl p-4" style={{ background: '#1a1a1a' }}>
        <p className="font-semibold text-white mb-3">최근 경기 활약</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>vs FC 레드스타</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>2골</span>
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>vs 블루윙즈 FC</span>
            <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>1도움</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>vs 드래곤 시티</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>1골</span>
              <span className="font-bold text-sm" style={{ color: 'var(--accent)' }}>1도움</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function MockFeedback() {
  return (
    <div className="p-4 h-full overflow-y-auto" style={{ background: '#111010' }}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: 'var(--chip)' }}>
          <span className="text-xl">⚽</span>
        </div>
        <div>
          <h3 className="font-bold text-white">배승호</h3>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>vs FC 레드스타 (01.25)</p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-xl p-4 border-l-4" style={{ background: '#001a0d', borderColor: '#22c55e' }}>
          <p className="font-semibold mb-2" style={{ color: '#4ade80' }}>👍 잘한 점</p>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>적극적인 슈팅 시도가 좋았어요. 골 결정력이 많이 늘었습니다!</p>
        </div>
        <div className="rounded-xl p-4 border-l-4" style={{ background: '#001220', borderColor: '#3b82f6' }}>
          <p className="font-semibold mb-2" style={{ color: '#60a5fa' }}>📈 개선할 점</p>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>수비 가담을 조금 더 적극적으로 해주면 좋겠어요.</p>
        </div>
        <div className="rounded-xl p-4 border-l-4" style={{ background: '#1a1000', borderColor: '#f59e0b' }}>
          <p className="font-semibold mb-2" style={{ color: '#fbbf24' }}>⭐ 칭찬해주세요</p>
          <p style={{ color: 'rgba(255,255,255,0.7)' }}>오늘 2골로 팀 승리에 큰 기여를 했어요. 많이 칭찬해주세요!</p>
        </div>
      </div>
    </div>
  )
}
