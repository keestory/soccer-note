'use client'

const POSITION_COLORS: Record<string, string> = {
  GK: '#f59e0b', DF: '#3b82f6', MF: '#64748b', FW: '#ef4444',
}

export default function IPadScreenshot3() {
  const rankings = [
    { rank: 1, name: '박지훈', num: 7, pos: 'FW', value: '12골', medal: 'gold' },
    { rank: 2, name: '오시윤', num: 9, pos: 'FW', value: '8골', medal: 'silver' },
    { rank: 3, name: '김민수', num: 8, pos: 'MF', value: '6골', medal: 'bronze' },
    { rank: 4, name: '장현우', num: 11, pos: 'FW', value: '5골', medal: '' },
    { rank: 5, name: '한승우', num: 10, pos: 'MF', value: '3골', medal: '' },
    { rank: 6, name: '이도현', num: 6, pos: 'MF', value: '2골', medal: '' },
  ]

  const medalColors: Record<string, string> = {
    gold: '#FFD700', silver: '#C0C0C0', bronze: '#CD7F32',
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-purple-600 to-indigo-800 flex flex-col items-center overflow-hidden">
      <div className="pt-[5%] pb-[3%] text-center">
        <h2 className="text-5xl font-extrabold text-white leading-tight">선수 통계 & 랭킹</h2>
        <p className="text-purple-200 text-xl mt-3">골, 어시스트, 평점 한눈에</p>
      </div>

      <div className="flex-1 w-[60%] max-w-[600px] bg-black rounded-[2rem] p-3 shadow-2xl mb-[3%]">
        <div className="bg-gray-50 rounded-[1.5rem] h-full overflow-hidden flex flex-col">
          <div className="bg-white px-8 pt-5 pb-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
              <h1 className="text-lg font-bold">선수 관리</h1>
            </div>
            <span className="text-sm text-primary-600 font-semibold">15명</span>
          </div>

          <div className="px-5 pt-4 flex gap-2">
            {[
              { label: '골', active: true },
              { label: '어시스트', active: false },
              { label: '평점', active: false },
              { label: '출석', active: false },
              { label: '클린시트', active: false },
            ].map(tab => (
              <span key={tab.label} className={`px-4 py-2 rounded-lg text-sm font-medium ${
                tab.active ? 'bg-primary-600 text-white' : 'bg-white text-gray-600'
              }`}>{tab.label}</span>
            ))}
          </div>

          <div className="px-5 mt-4 space-y-2.5 flex-1 overflow-hidden">
            {rankings.map(r => (
              <div key={r.rank} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-4">
                <div className="w-9 h-9 flex items-center justify-center">
                  {r.medal ? (
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow" style={{ backgroundColor: medalColors[r.medal] }}>{r.rank}</div>
                  ) : (
                    <span className="text-gray-400 font-bold text-xl">{r.rank}</span>
                  )}
                </div>
                <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: POSITION_COLORS[r.pos] }}>{r.num}</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{r.name}</p>
                  <span className="text-xs font-medium px-2 py-0.5 rounded" style={{ backgroundColor: `${POSITION_COLORS[r.pos]}15`, color: POSITION_COLORS[r.pos] }}>{r.pos}</span>
                </div>
                <span className="font-bold text-primary-600 text-lg">{r.value}</span>
              </div>
            ))}
          </div>

          <div className="mx-5 mb-4 bg-gradient-to-r from-primary-500 to-primary-600 rounded-xl p-4 shadow-lg">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-white font-bold">7</div>
              <div>
                <p className="font-bold text-white">박지훈</p>
                <p className="text-primary-200 text-xs">FW | 최다 골 | 12경기</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { val: '12', label: '골' },
                { val: '5', label: '어시스트' },
                { val: '8.5', label: '평균 평점' },
                { val: '95%', label: '출석률' },
              ].map(s => (
                <div key={s.label}>
                  <p className="text-xl font-bold text-white">{s.val}</p>
                  <p className="text-[10px] text-primary-200">{s.label}</p>
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
