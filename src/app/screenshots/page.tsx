'use client'

import { useState } from 'react'

// App Store Screenshot Generator
// iPhone 6.7" display: 1290 x 2796px
// Each screenshot card renders at a fixed aspect ratio matching App Store requirements

const POSITION_COLORS: Record<string, string> = {
  GK: '#f59e0b',
  DF: '#3b82f6',
  MF: '#64748b',
  FW: '#ef4444',
}

// ==========================================
// Screenshot 1: Dashboard & Match History
// ==========================================
function Screenshot1() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-primary-600 to-primary-800 flex flex-col items-center">
      {/* Title Area */}
      <div className="pt-16 pb-8 text-center px-8">
        <h2 className="text-4xl font-extrabold text-white leading-tight">
          경기 기록을<br />한눈에 관리
        </h2>
        <p className="text-primary-200 text-lg mt-3">팀 전적, MVP, 출석까지</p>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 w-[85%] max-w-[340px] bg-black rounded-[2.5rem] p-3 shadow-2xl mb-8">
        <div className="bg-gray-50 rounded-[2rem] h-full overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-4 pb-2 flex justify-between items-center text-xs text-gray-500">
            <span className="font-semibold">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2.5 bg-gray-800 rounded-sm" />
            </div>
          </div>

          {/* Header */}
          <div className="bg-white px-5 pb-3 border-b">
            <h1 className="text-xl font-bold text-primary-600">SoccerNote</h1>
            <p className="text-xs text-gray-500">FC 드림즈 ▾</p>
          </div>

          {/* Team Stats */}
          <div className="bg-white mx-4 mt-4 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-500">팀 전적</span>
              <span className="text-sm font-bold text-primary-600">승률 67%</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900">12</p>
                <p className="text-[10px] text-gray-500">경기</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary-600">8</p>
                <p className="text-[10px] text-gray-500">승</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-500">2</p>
                <p className="text-[10px] text-gray-500">패</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-400">2</p>
                <p className="text-[10px] text-gray-500">무</p>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mx-4 mt-4">
            <span className="flex-1 py-1.5 bg-primary-600 text-white text-center text-xs font-medium rounded-lg">전체</span>
            <span className="flex-1 py-1.5 bg-white text-gray-600 text-center text-xs font-medium rounded-lg">예정</span>
            <span className="flex-1 py-1.5 bg-white text-gray-600 text-center text-xs font-medium rounded-lg">완료</span>
          </div>

          {/* Match List */}
          <div className="px-4 mt-3 space-y-2.5 flex-1 overflow-hidden">
            {/* Match 1 */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">vs FC 라이온즈</p>
                  <p className="text-[10px] text-gray-500">2026.03.15</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    <span className="text-primary-600">3</span>
                    <span className="text-gray-400 mx-0.5">:</span>
                    <span className="text-gray-600">1</span>
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">승</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] text-amber-600">
                  <svg className="w-3 h-3" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  MVP: 김민수 (8.5점)
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                  출석 11명
                </div>
              </div>
            </div>

            {/* Match 2 */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex justify-between items-start mb-1.5">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">vs 한양 FC</p>
                  <p className="text-[10px] text-gray-500">2026.03.08</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    <span className="text-primary-600">2</span>
                    <span className="text-gray-400 mx-0.5">:</span>
                    <span className="text-gray-600">0</span>
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">승</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-[10px] text-amber-600">
                  <svg className="w-3 h-3" fill="#fbbf24" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  MVP: 박지훈 (9.0점)
                </div>
                <div className="flex items-center gap-1 text-[10px] text-gray-500">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
                  출석 13명
                </div>
              </div>
            </div>

            {/* Match 3 */}
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">vs 성남 유나이티드</p>
                  <p className="text-[10px] text-gray-500">2026.03.01</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold">
                    <span className="text-primary-600">1</span>
                    <span className="text-gray-400 mx-0.5">:</span>
                    <span className="text-gray-600">1</span>
                  </p>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">무</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Nav */}
          <div className="bg-white border-t px-6 py-2.5 flex justify-around">
            <div className="flex flex-col items-center text-primary-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>
              <span className="text-[9px] mt-0.5">경기</span>
            </div>
            <div className="flex flex-col items-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
              <span className="text-[9px] mt-0.5">선수</span>
            </div>
            <div className="flex flex-col items-center text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              <span className="text-[9px] mt-0.5">설정</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Screenshot 2: Formation & Tactics
// ==========================================
function Screenshot2() {
  const players = [
    { name: '이준서', num: 1, pos: 'GK', x: 8, y: 50 },
    { name: '김태현', num: 4, pos: 'DF', x: 22, y: 15 },
    { name: '박서진', num: 5, pos: 'DF', x: 22, y: 38 },
    { name: '최우진', num: 3, pos: 'DF', x: 22, y: 62 },
    { name: '정하준', num: 2, pos: 'DF', x: 22, y: 85 },
    { name: '김민수', num: 8, pos: 'MF', x: 45, y: 25 },
    { name: '이도현', num: 6, pos: 'MF', x: 45, y: 50 },
    { name: '한승우', num: 10, pos: 'MF', x: 45, y: 75 },
    { name: '박지훈', num: 7, pos: 'FW', x: 72, y: 20 },
    { name: '오시윤', num: 9, pos: 'FW', x: 72, y: 50 },
    { name: '장현우', num: 11, pos: 'FW', x: 72, y: 80 },
  ]

  return (
    <div className="w-full h-full bg-gradient-to-b from-green-700 to-green-900 flex flex-col items-center">
      {/* Title */}
      <div className="pt-16 pb-8 text-center px-8">
        <h2 className="text-4xl font-extrabold text-white leading-tight">
          실시간 포메이션<br />기록
        </h2>
        <p className="text-green-200 text-lg mt-3">드래그 앤 드롭으로 간편하게</p>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 w-[85%] max-w-[340px] bg-black rounded-[2.5rem] p-3 shadow-2xl mb-8">
        <div className="bg-gray-50 rounded-[2rem] h-full overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-4 pb-2 flex justify-between items-center text-xs text-gray-500">
            <span className="font-semibold">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2.5 bg-gray-800 rounded-sm" />
            </div>
          </div>

          {/* Header */}
          <div className="bg-white px-5 pb-3 border-b flex items-center gap-3">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <div>
              <h1 className="text-base font-bold">1쿼터 기록</h1>
              <p className="text-[10px] text-gray-500">vs FC 라이온즈</p>
            </div>
          </div>

          {/* Formation Selector */}
          <div className="px-4 pt-3 flex gap-1.5 overflow-x-auto">
            {['4-3-3', '4-4-2', '4-2-3-1', '3-5-2'].map((f, i) => (
              <span
                key={f}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  i === 0 ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {f}
              </span>
            ))}
          </div>

          {/* Soccer Field */}
          <div className="mx-4 mt-3 rounded-xl overflow-hidden flex-1 relative" style={{ backgroundColor: '#2D5A27' }}>
            {/* Field markings */}
            <div className="absolute inset-0">
              {/* Center line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
              {/* Center circle */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 border border-white/20 rounded-full" />
              {/* Left penalty area */}
              <div className="absolute left-0 top-1/4 bottom-1/4 w-[15%] border border-white/20 border-l-0" />
              {/* Right penalty area */}
              <div className="absolute right-0 top-1/4 bottom-1/4 w-[15%] border border-white/20 border-r-0" />
            </div>

            {/* Players */}
            {players.map((p) => (
              <div
                key={p.num}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-lg border-2 border-white/30"
                  style={{ backgroundColor: POSITION_COLORS[p.pos] }}
                >
                  {p.num}
                </div>
                <span className="text-[8px] text-white font-medium mt-0.5 bg-black/30 px-1 rounded">
                  {p.name}
                </span>
              </div>
            ))}
          </div>

          {/* Score Section */}
          <div className="px-4 py-3 bg-white border-t flex items-center justify-between">
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500">우리팀</p>
              <p className="text-2xl font-bold text-primary-600">3</p>
            </div>
            <div className="text-gray-400 text-lg font-bold">:</div>
            <div className="text-center flex-1">
              <p className="text-[10px] text-gray-500">상대팀</p>
              <p className="text-2xl font-bold text-gray-600">1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Screenshot 3: Player Stats & Rankings
// ==========================================
function Screenshot3() {
  const rankings = [
    { rank: 1, name: '박지훈', num: 7, pos: 'FW', value: '12골', medal: 'gold' },
    { rank: 2, name: '오시윤', num: 9, pos: 'FW', value: '8골', medal: 'silver' },
    { rank: 3, name: '김민수', num: 8, pos: 'MF', value: '6골', medal: 'bronze' },
    { rank: 4, name: '장현우', num: 11, pos: 'FW', value: '5골', medal: '' },
    { rank: 5, name: '한승우', num: 10, pos: 'MF', value: '3골', medal: '' },
  ]

  const medalColors: Record<string, string> = {
    gold: '#FFD700',
    silver: '#C0C0C0',
    bronze: '#CD7F32',
  }

  return (
    <div className="w-full h-full bg-gradient-to-b from-purple-600 to-indigo-800 flex flex-col items-center">
      {/* Title */}
      <div className="pt-16 pb-8 text-center px-8">
        <h2 className="text-4xl font-extrabold text-white leading-tight">
          선수 통계 &<br />랭킹
        </h2>
        <p className="text-purple-200 text-lg mt-3">골, 어시스트, 평점 한눈에</p>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 w-[85%] max-w-[340px] bg-black rounded-[2.5rem] p-3 shadow-2xl mb-8">
        <div className="bg-gray-50 rounded-[2rem] h-full overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-4 pb-2 flex justify-between items-center text-xs text-gray-500">
            <span className="font-semibold">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2.5 bg-gray-800 rounded-sm" />
            </div>
          </div>

          {/* Header */}
          <div className="bg-white px-5 pb-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <h1 className="text-base font-bold">선수 관리</h1>
            </div>
            <span className="text-xs text-primary-600 font-semibold">15명</span>
          </div>

          {/* Ranking Tabs */}
          <div className="px-3 pt-3 flex gap-1 overflow-x-auto">
            {[
              { label: '골', active: true },
              { label: '어시스트', active: false },
              { label: '평점', active: false },
              { label: '출석', active: false },
              { label: '클린시트', active: false },
            ].map((tab) => (
              <span
                key={tab.label}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                  tab.active ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'
                }`}
              >
                {tab.label}
              </span>
            ))}
          </div>

          {/* Rankings */}
          <div className="px-4 mt-3 space-y-2 flex-1 overflow-hidden">
            {rankings.map((r) => (
              <div key={r.rank} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                <div className="w-8 h-8 flex items-center justify-center">
                  {r.medal ? (
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold shadow"
                      style={{ backgroundColor: medalColors[r.medal] }}
                    >
                      {r.rank}
                    </div>
                  ) : (
                    <span className="text-gray-400 font-bold text-lg">{r.rank}</span>
                  )}
                </div>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: POSITION_COLORS[r.pos] }}
                >
                  {r.num}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">{r.name}</p>
                  <span
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: `${POSITION_COLORS[r.pos]}15`,
                      color: POSITION_COLORS[r.pos],
                    }}
                  >
                    {r.pos}
                  </span>
                </div>
                <span className="font-bold text-primary-600 text-base">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Player Detail Card Preview */}
          <div className="mx-4 mb-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-3.5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">
                7
              </div>
              <div>
                <p className="font-bold text-white text-sm">박지훈</p>
                <p className="text-primary-200 text-[10px]">FW | 최다 골 | 12경기</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-white">12</p>
                <p className="text-[9px] text-primary-200">골</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">5</p>
                <p className="text-[9px] text-primary-200">어시스트</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">8.5</p>
                <p className="text-[9px] text-primary-200">평균 평점</p>
              </div>
              <div>
                <p className="text-lg font-bold text-white">95%</p>
                <p className="text-[9px] text-primary-200">출석률</p>
              </div>
            </div>
          </div>

          {/* Bottom padding */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Screenshot 4: Player Rating & Feedback
// ==========================================
function Screenshot4() {
  return (
    <div className="w-full h-full bg-gradient-to-b from-amber-500 to-orange-600 flex flex-col items-center">
      {/* Title */}
      <div className="pt-16 pb-8 text-center px-8">
        <h2 className="text-4xl font-extrabold text-white leading-tight">
          선수별 평가 &<br />피드백
        </h2>
        <p className="text-amber-100 text-lg mt-3">경기별 상세 평가 기록</p>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 w-[85%] max-w-[340px] bg-black rounded-[2.5rem] p-3 shadow-2xl mb-8">
        <div className="bg-gray-50 rounded-[2rem] h-full overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-4 pb-2 flex justify-between items-center text-xs text-gray-500">
            <span className="font-semibold">9:41</span>
            <div className="flex gap-1">
              <div className="w-4 h-2.5 bg-gray-800 rounded-sm" />
            </div>
          </div>

          {/* Header */}
          <div className="bg-white px-5 pb-3 border-b">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <div>
                <h1 className="text-base font-bold">선수 평가</h1>
                <p className="text-[10px] text-gray-500">1쿼터 · vs FC 라이온즈</p>
              </div>
            </div>
          </div>

          {/* Player Card 1 - Detailed */}
          <div className="px-4 mt-3">
            <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-amber-400">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                  7
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">박지훈</p>
                  <span className="text-[10px] text-red-500 font-medium">FW</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-4 h-4" fill={i <= 4 ? '#fbbf24' : '#e5e7eb'} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                  <span className="text-amber-600 font-bold text-sm ml-1">8.5</span>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex gap-3 mb-3">
                <div className="flex items-center gap-1.5 bg-primary-50 px-2.5 py-1 rounded-lg">
                  <span className="text-primary-600 text-xs font-bold">2</span>
                  <span className="text-[10px] text-primary-600">골</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-lg">
                  <span className="text-green-600 text-xs font-bold">1</span>
                  <span className="text-[10px] text-green-600">어시스트</span>
                </div>
              </div>

              {/* Feedback */}
              <div className="space-y-2">
                <div className="bg-green-50 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-green-700 mb-1">칭찬</p>
                  <p className="text-xs text-green-800">적극적인 프레싱과 정확한 슈팅이 돋보였습니다</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-2.5">
                  <p className="text-[10px] font-semibold text-amber-700 mb-1">개선점</p>
                  <p className="text-xs text-amber-800">수비 가담 시 포지션 복귀가 느려요</p>
                </div>
              </div>
            </div>
          </div>

          {/* Player Card 2 - Compact */}
          <div className="px-4 mt-2.5">
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xs">
                  8
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">김민수</p>
                  <span className="text-[10px] text-slate-500 font-medium">MF</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4].map(i => (
                    <svg key={i} className="w-3.5 h-3.5" fill="#fbbf24" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                  <svg className="w-3.5 h-3.5" fill="#e5e7eb" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                  </svg>
                  <span className="text-amber-600 font-bold text-xs ml-1">7.5</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-medium">1골</span>
                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-medium">2어시스트</span>
              </div>
            </div>
          </div>

          {/* Player Card 3 - Compact */}
          <div className="px-4 mt-2.5">
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">이준서</p>
                  <span className="text-[10px] text-amber-600 font-medium">GK</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-3.5 h-3.5" fill={i <= 4 ? '#fbbf24' : '#e5e7eb'} viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                  <span className="text-amber-600 font-bold text-xs ml-1">8.0</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-medium">클린시트</span>
              </div>
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Save Button */}
          <div className="px-4 pb-4">
            <div className="w-full py-3 bg-primary-600 text-white rounded-xl text-center text-sm font-semibold">
              저장하기
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ==========================================
// Main Screenshots Page
// ==========================================
export default function ScreenshotsPage() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const screenshots = [
    { id: 1, component: <Screenshot1 />, label: '경기 기록 관리' },
    { id: 2, component: <Screenshot2 />, label: '포메이션 기록' },
    { id: 3, component: <Screenshot3 />, label: '선수 통계 & 랭킹' },
    { id: 4, component: <Screenshot4 />, label: '선수 평가 & 피드백' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">App Store Screenshots</h1>
          <p className="text-gray-400">
            각 스크린샷을 클릭하면 개별 페이지에서 캡처할 수 있습니다.
            <br />
            iPhone 6.7&quot; 비율 (1290 x 2796px)에 최적화되어 있습니다.
          </p>
          <p className="text-yellow-400 text-sm mt-2">
            Tip: 브라우저에서 각 카드를 우클릭 → &quot;요소 스크린샷 캡처&quot; 또는 개별 페이지에서 캡처하세요
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-2 mb-8">
          {screenshots.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setCurrentIndex(i)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                currentIndex === i
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {s.id}. {s.label}
            </button>
          ))}
        </div>

        {/* Screenshot Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {screenshots.map((s, i) => (
            <div key={s.id} className="flex flex-col items-center">
              <p className="text-white text-sm font-medium mb-3">
                {s.id}. {s.label}
              </p>
              <div
                className={`w-full rounded-2xl overflow-hidden shadow-2xl cursor-pointer transition-transform hover:scale-[1.02] ${
                  currentIndex === i ? 'ring-4 ring-primary-500' : ''
                }`}
                style={{ aspectRatio: '1290 / 2796' }}
                onClick={() => setCurrentIndex(i)}
              >
                {s.component}
              </div>
            </div>
          ))}
        </div>

        {/* Individual Screenshot Links */}
        <div className="mt-8 text-center space-y-2">
          <p className="text-gray-400 text-sm">개별 캡처용 페이지:</p>
          <div className="flex justify-center gap-3">
            {screenshots.map((s) => (
              <a
                key={s.id}
                href={`/screenshots/${s.id}`}
                target="_blank"
                className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600 transition"
              >
                {s.label} →
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
