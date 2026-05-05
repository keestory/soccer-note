'use client'

// Individual capture page for Screenshot 3: Player Stats & Rankings
const POSITION_COLORS: Record<string, string> = {
  GK: '#f59e0b',
  DF: '#3b82f6',
  MF: '#64748b',
  FW: '#ef4444',
}

export default function Screenshot3Page() {
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
    <div className="w-screen h-screen bg-gradient-to-b from-purple-600 to-indigo-800 flex flex-col items-center overflow-hidden">
      {/* Title */}
      <div className="pt-[8%] pb-[4%] text-center px-[10%]">
        <h2 className="text-[clamp(2rem,5vw,4rem)] font-extrabold text-white leading-tight">
          선수 통계 &<br />랭킹
        </h2>
        <p className="text-purple-200 text-[clamp(1rem,2.5vw,1.5rem)] mt-3">골, 어시스트, 평점 한눈에</p>
      </div>

      {/* Phone Frame */}
      <div className="flex-1 w-[75%] max-w-[380px] bg-black rounded-[2.5rem] p-3 shadow-2xl mb-[4%]">
        <div className="bg-gray-50 rounded-[2rem] h-full overflow-hidden flex flex-col">
          {/* Status Bar */}
          <div className="bg-white px-6 pt-4 pb-2 flex justify-between items-center text-xs text-gray-500">
            <span className="font-semibold">9:41</span>
            <div className="w-4 h-2.5 bg-gray-800 rounded-sm" />
          </div>

          {/* Header */}
          <div className="bg-white px-5 pb-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <h1 className="text-base font-bold">선수 관리</h1>
            </div>
            <span className="text-xs text-blue-600 font-semibold">15명</span>
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
                  tab.active ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'
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
                <span className="font-bold text-blue-600 text-base">{r.value}</span>
              </div>
            ))}
          </div>

          {/* Player Detail Card */}
          <div className="mx-4 mb-3 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-3.5 shadow-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-sm font-bold">
                7
              </div>
              <div>
                <p className="font-bold text-white text-sm">박지훈</p>
                <p className="text-blue-200 text-[10px]">FW | 최다 골 | 12경기</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { val: '12', label: '골' },
                { val: '5', label: '어시스트' },
                { val: '8.5', label: '평균 평점' },
                { val: '95%', label: '출석률' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-lg font-bold text-white">{s.val}</p>
                  <p className="text-[9px] text-blue-200">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="h-2" />
        </div>
      </div>
    </div>
  )
}
