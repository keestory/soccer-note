'use client'

const POSITION_COLORS: Record<string, string> = {
  GK: '#f59e0b', DF: '#3b82f6', MF: '#64748b', FW: '#ef4444',
}

export default function IPadScreenshot2() {
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
    <div className="w-screen h-screen bg-gradient-to-b from-green-700 to-green-900 flex flex-col items-center overflow-hidden">
      <div className="pt-[5%] pb-[3%] text-center">
        <h2 className="text-5xl font-extrabold text-white leading-tight">실시간 포메이션 기록</h2>
        <p className="text-green-200 text-xl mt-3">드래그 앤 드롭으로 간편하게</p>
      </div>

      <div className="flex-1 w-[60%] max-w-[600px] bg-black rounded-[2rem] p-3 shadow-2xl mb-[3%]">
        <div className="bg-gray-50 rounded-[1.5rem] h-full overflow-hidden flex flex-col">
          <div className="bg-white px-8 pt-5 pb-3 border-b flex items-center gap-4">
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            <div>
              <h1 className="text-lg font-bold">1쿼터 기록</h1>
              <p className="text-xs text-gray-500">vs FC 라이온즈</p>
            </div>
          </div>

          <div className="px-5 pt-4 flex gap-2">
            {['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3'].map((f, i) => (
              <span key={f} className={`px-4 py-2 rounded-lg text-sm font-medium ${
                i === 0 ? 'bg-green-600 text-white' : 'bg-white text-gray-600'
              }`}>{f}</span>
            ))}
          </div>

          <div className="mx-5 mt-4 rounded-xl overflow-hidden flex-1 relative" style={{ backgroundColor: '#2D5A27' }}>
            <div className="absolute inset-0">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 border border-white/20 rounded-full" />
              <div className="absolute left-0 top-[20%] bottom-[20%] w-[14%] border border-white/20 border-l-0" />
              <div className="absolute right-0 top-[20%] bottom-[20%] w-[14%] border border-white/20 border-r-0" />
              <div className="absolute left-0 top-[35%] bottom-[35%] w-[6%] border border-white/20 border-l-0" />
              <div className="absolute right-0 top-[35%] bottom-[35%] w-[6%] border border-white/20 border-r-0" />
            </div>

            {players.map((p) => (
              <div key={p.num} className="absolute flex flex-col items-center" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg border-2 border-white/30" style={{ backgroundColor: POSITION_COLORS[p.pos] }}>
                  {p.num}
                </div>
                <span className="text-[9px] text-white font-medium mt-0.5 bg-black/30 px-1.5 rounded">{p.name}</span>
              </div>
            ))}
          </div>

          <div className="px-5 py-4 bg-white border-t flex items-center justify-center gap-12">
            <div className="text-center">
              <p className="text-xs text-gray-500">우리팀</p>
              <p className="text-3xl font-bold text-primary-600">3</p>
            </div>
            <div className="text-gray-400 text-2xl font-bold">:</div>
            <div className="text-center">
              <p className="text-xs text-gray-500">상대팀</p>
              <p className="text-3xl font-bold text-gray-600">1</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
