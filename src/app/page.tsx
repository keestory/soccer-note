'use client'

import Link from 'next/link'
import {
  Star, ArrowRight, BarChart3,
  Layout, ClipboardList, ArrowLeftRight, Shield, ChevronDown,
  Users, Trophy
} from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-emerald-600">SoccerNote</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 text-emerald-700 font-medium hover:bg-emerald-50 rounded-lg transition"
            >
              로그인
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition"
            >
              시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-900 to-emerald-700">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, rgba(255,255,255,0.1) 40px, rgba(255,255,255,0.1) 80px)',
          }} />
        </div>
        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-24 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            축구팀 경기 기록의<br />모든 것
          </h2>
          <p className="text-lg md:text-xl text-emerald-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            쿼터별 선수 평가, 포메이션 배치, 자동 MVP 선정까지
            <br />
            감독님의 팀 관리를 도와드립니다
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
          <div className="mt-12 flex justify-center">
            <ChevronDown className="w-8 h-8 text-emerald-300 animate-bounce" />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-4">주요 기능</h3>
          <p className="text-gray-500 text-lg">팀 관리에 필요한 모든 기능을 제공합니다</p>
        </div>

        <div className="space-y-24">
          {/* 1. 팀 전적 대시보드 */}
          <FeatureRow
            icon={<BarChart3 className="w-6 h-6" />}
            color="from-emerald-500 to-emerald-600"
            title="팀 전적 대시보드"
            description="총 경기 수, 승/패/무, 승률을 한눈에 확인하세요. 최근 경기 결과와 MVP까지 대시보드에서 바로 볼 수 있습니다."
            reverse={false}
            mockUI={<MockDashboard />}
          />

          {/* 2. 포메이션 배치 */}
          <FeatureRow
            icon={<Layout className="w-6 h-6" />}
            color="from-blue-500 to-blue-600"
            title="포메이션 배치"
            description="축구장 위에 선수를 드래그하여 쿼터별 포메이션을 시각적으로 구성하세요. 4-3-3, 4-4-2 등 프리셋도 지원합니다."
            reverse={true}
            mockUI={<MockFormation />}
          />

          {/* 3. 쿼터별 기록 & 평가 */}
          <FeatureRow
            icon={<ClipboardList className="w-6 h-6" />}
            color="from-amber-500 to-amber-600"
            title="쿼터별 기록 & 평가"
            description="각 쿼터마다 선수별 점수(1~10), 골, 어시스트, 클린시트를 기록하세요. 필드 위에서 바로 스탯을 확인할 수 있습니다."
            reverse={false}
            mockUI={<MockQuarterRecord />}
          />

          {/* 4. 선수 교체 기록 */}
          <FeatureRow
            icon={<ArrowLeftRight className="w-6 h-6" />}
            color="from-purple-500 to-purple-600"
            title="선수 교체 기록"
            description="쿼터 내 교체 시점과 IN/OUT 선수를 기록하세요. 필드 위에 교체 마커가 표시되어 한눈에 파악할 수 있습니다."
            reverse={true}
            mockUI={<MockSubstitution />}
          />

          {/* 5. 자동 MVP 선정 */}
          <FeatureRow
            icon={<Star className="w-6 h-6" />}
            color="from-yellow-500 to-yellow-600"
            title="자동 MVP 선정"
            description="전 쿼터 평균 점수를 기반으로 객관적인 MVP를 자동 선정합니다. 경기 목록에서 각 경기의 MVP를 바로 확인하세요."
            reverse={false}
            mockUI={<MockMVP />}
          />

          {/* 6. 팀원 권한 관리 */}
          <FeatureRow
            icon={<Shield className="w-6 h-6" />}
            color="from-rose-500 to-rose-600"
            title="팀원 권한 관리"
            description="초대 코드로 팀원을 초대하고, 경기 편집/선수 편집/쿼터 편집 권한을 개별 부여하세요. 감독과 팀원의 역할을 분리합니다."
            reverse={true}
            mockUI={<MockMembers />}
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-emerald-900 py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h3>
          <p className="text-emerald-200 text-lg mb-8">
            무료로 팀을 만들고 첫 경기를 기록해보세요
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-emerald-700 rounded-xl font-bold text-lg hover:bg-gray-100 transition shadow-lg"
          >
            무료로 시작하기
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 text-center text-sm">
        <p>&copy; 2026 SoccerNote. All rights reserved.</p>
      </footer>
    </div>
  )
}

/* FeatureRow: 설명 + 모의 UI 좌우 교대 배치 */
function FeatureRow({
  icon, color, title, description, reverse, mockUI,
}: {
  icon: React.ReactNode; color: string; title: string; description: string; reverse: boolean; mockUI: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col ${reverse ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}>
      <div className="flex-1 max-w-lg">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${color} text-white mb-4`}>
          {icon}
        </div>
        <h4 className="text-2xl font-bold text-gray-900 mb-3">{title}</h4>
        <p className="text-gray-600 leading-relaxed text-lg">{description}</p>
      </div>
      <div className="flex-1 max-w-sm w-full">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-gray-50">
          {mockUI}
        </div>
      </div>
    </div>
  )
}

/* ===== Mock UI Components ===== */

function MockDashboard() {
  const matches = [
    { opponent: 'FC 레드스타', date: '2026.01.25', home: 3, away: 1, mvp: '이정민', rating: 8.5 },
    { opponent: '블루윙즈 FC', date: '2026.01.18', home: 1, away: 1, mvp: '박준혁', rating: 7.8 },
    { opponent: '드래곤 시티', date: '2026.01.11', home: 2, away: 0, mvp: '최서윤', rating: 9.0 },
  ]
  return (
    <div className="bg-gray-50 p-4 text-sm">
      {/* Stats */}
      <div className="bg-white rounded-xl p-3 shadow-sm mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500">팀 전적</span>
          <span className="text-xs font-bold text-emerald-600">승률 67%</span>
        </div>
        <div className="grid grid-cols-4 gap-1 text-center">
          <div><p className="text-lg font-bold text-gray-900">12</p><p className="text-[10px] text-gray-500">총 경기</p></div>
          <div><p className="text-lg font-bold text-emerald-600">8</p><p className="text-[10px] text-gray-500">승</p></div>
          <div><p className="text-lg font-bold text-red-500">2</p><p className="text-[10px] text-gray-500">패</p></div>
          <div><p className="text-lg font-bold text-gray-400">2</p><p className="text-[10px] text-gray-500">무</p></div>
        </div>
      </div>
      {/* Match List */}
      <p className="text-xs font-semibold text-gray-900 mb-2">최근 경기</p>
      <div className="space-y-2">
        {matches.map((m, i) => (
          <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
            <div className="flex justify-between items-start mb-1">
              <div>
                <p className="font-semibold text-gray-900 text-xs">vs {m.opponent}</p>
                <p className="text-[10px] text-gray-500">{m.date}</p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold">
                  <span className="text-emerald-600">{m.home}</span>
                  <span className="text-gray-400 mx-0.5">:</span>
                  <span className="text-gray-600">{m.away}</span>
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  m.home > m.away ? 'bg-emerald-100 text-emerald-700' : m.home < m.away ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {m.home > m.away ? '승' : m.home < m.away ? '패' : '무'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-amber-600">
              <Star className="w-3 h-3 fill-amber-400" />
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
    { name: '김태현', pos: 'GK', x: 50, y: 90, color: '#f59e0b' },
    { name: '이도윤', pos: 'DF', x: 20, y: 70, color: '#3b82f6' },
    { name: '박서준', pos: 'DF', x: 40, y: 72, color: '#3b82f6' },
    { name: '최우진', pos: 'DF', x: 60, y: 72, color: '#3b82f6' },
    { name: '정하윤', pos: 'DF', x: 80, y: 70, color: '#3b82f6' },
    { name: '한지훈', pos: 'MF', x: 30, y: 48, color: '#22c55e' },
    { name: '윤성민', pos: 'MF', x: 50, y: 45, color: '#22c55e' },
    { name: '강현우', pos: 'MF', x: 70, y: 48, color: '#22c55e' },
    { name: '조민재', pos: 'FW', x: 25, y: 22, color: '#ef4444' },
    { name: '배승호', pos: 'FW', x: 50, y: 18, color: '#ef4444' },
    { name: '임준서', pos: 'FW', x: 75, y: 22, color: '#ef4444' },
  ]
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-700">1쿼터 포메이션</p>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">4-3-3</span>
      </div>
      <div className="relative w-full aspect-[3/2] bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-lg overflow-hidden">
        {/* Field lines */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[30%] h-[40%] border border-white/20 rounded-full" />
        </div>
        <div className="absolute top-0 left-[25%] right-[25%] h-[18%] border-b border-l border-r border-white/20" />
        <div className="absolute bottom-0 left-[25%] right-[25%] h-[18%] border-t border-l border-r border-white/20" />
        <div className="absolute left-0 right-0 top-1/2 border-t border-white/20" />
        {/* Players */}
        {players.map((p, i) => (
          <div key={i} className="absolute flex flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow" style={{ backgroundColor: p.color }}>
              {p.pos}
            </div>
            <span className="text-[8px] text-white/90 mt-0.5 font-medium drop-shadow">{p.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockQuarterRecord() {
  const records = [
    { name: '배승호', pos: 'FW', rating: 9, goals: 2, assists: 0 },
    { name: '조민재', pos: 'FW', rating: 8, goals: 1, assists: 1 },
    { name: '윤성민', pos: 'MF', rating: 8, goals: 0, assists: 2 },
    { name: '한지훈', pos: 'MF', rating: 7, goals: 0, assists: 0 },
    { name: '박서준', pos: 'DF', rating: 7, goals: 0, assists: 0 },
  ]
  const POS_COLORS: Record<string, string> = { FW: '#ef4444', MF: '#22c55e', DF: '#3b82f6', GK: '#f59e0b' }
  return (
    <div className="p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-900 text-xs">1쿼터 선수 평가</p>
        <span className="text-[10px] text-gray-500">우리팀 <span className="text-emerald-600 font-bold">3</span> : <span className="font-bold">1</span> FC 레드스타</span>
      </div>
      <div className="space-y-2">
        {records.map((r, i) => (
          <div key={i} className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
            <span className="w-6 h-6 rounded-full text-white text-[8px] font-bold flex items-center justify-center" style={{ backgroundColor: POS_COLORS[r.pos] }}>{r.pos}</span>
            <span className="text-xs font-medium text-gray-900 flex-1">{r.name}</span>
            <div className="flex items-center gap-2 text-[10px]">
              {r.goals > 0 && <span className="text-emerald-600 font-bold">{r.goals}골</span>}
              {r.assists > 0 && <span className="text-blue-600 font-bold">{r.assists}도움</span>}
              <span className={`font-bold px-1.5 py-0.5 rounded ${r.rating >= 8 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{r.rating}.0</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockSubstitution() {
  return (
    <div className="p-4 text-sm">
      <p className="font-semibold text-gray-900 text-xs mb-3">선수 교체 기록</p>
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm">
          <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">15분</span>
          <div className="flex items-center gap-1 flex-1 text-xs">
            <span className="text-red-500 font-medium">임준서</span>
            <ArrowLeftRight className="w-3 h-3 text-gray-400" />
            <span className="text-emerald-600 font-medium">신동현</span>
          </div>
          <span className="text-[10px] text-gray-400">FW → FW</span>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg p-2.5 shadow-sm">
          <span className="text-[10px] font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">22분</span>
          <div className="flex items-center gap-1 flex-1 text-xs">
            <span className="text-red-500 font-medium">강현우</span>
            <ArrowLeftRight className="w-3 h-3 text-gray-400" />
            <span className="text-emerald-600 font-medium">오재원</span>
          </div>
          <span className="text-[10px] text-gray-400">MF → MF</span>
        </div>
      </div>
      {/* Mini field with sub markers */}
      <div className="relative w-full aspect-[3/2] bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-lg overflow-hidden mt-3">
        <div className="absolute left-0 right-0 top-1/2 border-t border-white/20" />
        <div className="absolute flex flex-col items-center" style={{ left: '75%', top: '22%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-yellow-400">FW</div>
          <span className="text-[7px] text-white/90 mt-0.5">신동현</span>
          <span className="text-[6px] bg-yellow-400 text-yellow-900 px-1 rounded font-bold">IN 15&apos;</span>
        </div>
        <div className="absolute flex flex-col items-center" style={{ left: '70%', top: '48%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-[8px] font-bold ring-2 ring-yellow-400">MF</div>
          <span className="text-[7px] text-white/90 mt-0.5">오재원</span>
          <span className="text-[6px] bg-yellow-400 text-yellow-900 px-1 rounded font-bold">IN 22&apos;</span>
        </div>
        <div className="absolute flex flex-col items-center" style={{ left: '50%', top: '90%', transform: 'translate(-50%, -50%)' }}>
          <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center text-white text-[8px] font-bold">GK</div>
          <span className="text-[7px] text-white/90 mt-0.5">김태현</span>
        </div>
      </div>
    </div>
  )
}

function MockMVP() {
  const mvpData = [
    { opponent: 'FC 레드스타', date: '01.25', home: 3, away: 1, mvp: '배승호', rating: 8.5 },
    { opponent: '블루윙즈 FC', date: '01.18', home: 1, away: 1, mvp: '윤성민', rating: 7.8 },
    { opponent: '드래곤 시티', date: '01.11', home: 2, away: 0, mvp: '조민재', rating: 9.0 },
    { opponent: '선라이즈 FC', date: '01.04', home: 0, away: 2, mvp: '박서준', rating: 7.2 },
  ]
  return (
    <div className="p-4 text-sm">
      <p className="font-semibold text-gray-900 text-xs mb-3">경기별 MVP</p>
      <div className="space-y-2">
        {mvpData.map((m, i) => (
          <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-900">vs {m.opponent}</p>
              <p className="text-[10px] text-gray-400">{m.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="flex items-center gap-1 text-[10px] text-amber-600">
                  <Star className="w-3 h-3 fill-amber-400" />
                  <span className="font-bold">{m.mvp}</span>
                </div>
                <p className="text-[10px] text-gray-500">평균 {m.rating}점</p>
              </div>
              <span className="text-xs font-bold">
                <span className="text-emerald-600">{m.home}</span>
                <span className="text-gray-400">:</span>
                <span className="text-gray-600">{m.away}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MockMembers() {
  const members = [
    { name: '이정민', email: 'jm.lee@email.com', role: '감독', permissions: ['경기', '선수', '쿼터'] },
    { name: '박준혁', email: 'jh.park@email.com', role: '팀원', permissions: ['경기', '쿼터'] },
    { name: '최서윤', email: 'sy.choi@email.com', role: '팀원', permissions: ['쿼터'] },
    { name: '김도현', email: 'dh.kim@email.com', role: '팀원', permissions: [] },
  ]
  return (
    <div className="p-4 text-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="font-semibold text-gray-900 text-xs flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-gray-500" />
          팀원 관리 (4명)
        </p>
        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-medium">초대 코드: AB3F7K</span>
      </div>
      <div className="space-y-2">
        {members.map((m, i) => (
          <div key={i} className="bg-white rounded-lg p-2.5 shadow-sm">
            <div className="flex items-center justify-between mb-1.5">
              <div>
                <span className="text-xs font-medium text-gray-900">{m.name}</span>
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                  m.role === '감독' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                }`}>{m.role}</span>
              </div>
              <span className="text-[10px] text-gray-400">{m.email}</span>
            </div>
            {m.role !== '감독' && (
              <div className="flex gap-1">
                {['경기', '선수', '쿼터'].map(p => (
                  <span key={p} className={`text-[9px] px-1.5 py-0.5 rounded ${
                    m.permissions.includes(p) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {p} {m.permissions.includes(p) ? '✓' : '✕'}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
