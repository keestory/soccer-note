'use client'

const STAR_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
const USERS_PATH = "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"

export default function IPadScreenshot1() {
  const matches = [
    { opponent: 'FC 라이온즈', date: '2026.03.15', home: 3, away: 1, result: '승', mvp: '김민수', mvpRating: '8.5', attendance: 11 },
    { opponent: '한양 FC', date: '2026.03.08', home: 2, away: 0, result: '승', mvp: '박지훈', mvpRating: '9.0', attendance: 13 },
    { opponent: '성남 유나이티드', date: '2026.03.01', home: 1, away: 1, result: '무', mvp: '이도현', mvpRating: '7.5', attendance: 10 },
    { opponent: '강남 FC', date: '2026.02.22', home: 4, away: 2, result: '승', mvp: '오시윤', mvpRating: '8.0', attendance: 14 },
  ]

  return (
    <div className="w-screen h-screen bg-gradient-to-b from-blue-600 to-blue-800 flex flex-col items-center overflow-hidden">
      <div className="pt-[5%] pb-[3%] text-center">
        <h2 className="text-5xl font-extrabold text-white leading-tight">경기 기록을 한눈에 관리</h2>
        <p className="text-blue-200 text-xl mt-3">팀 전적, MVP, 출석까지</p>
      </div>

      <div className="flex-1 w-[60%] max-w-[600px] bg-black rounded-[2rem] p-3 shadow-2xl mb-[3%]">
        <div className="bg-gray-50 rounded-[1.5rem] h-full overflow-hidden flex flex-col">
          <div className="bg-white px-8 pt-5 pb-3 border-b flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-bold text-blue-600">SoccerNote</h1>
              <p className="text-sm text-gray-500">FC 드림즈 ▾</p>
            </div>
            <span className="text-xs text-gray-400">9:41</span>
          </div>

          <div className="bg-white mx-5 mt-5 rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base font-semibold text-gray-500">팀 전적</span>
              <span className="text-base font-bold text-blue-600">승률 67%</span>
            </div>
            <div className="grid grid-cols-4 gap-3 text-center">
              {[
                { val: '12', label: '경기', color: 'text-gray-900' },
                { val: '8', label: '승', color: 'text-blue-600' },
                { val: '2', label: '패', color: 'text-red-500' },
                { val: '2', label: '무', color: 'text-gray-400' },
              ].map(s => (
                <div key={s.label}>
                  <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                  <p className="text-xs text-gray-500">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mx-5 mt-4">
            <span className="flex-1 py-2 bg-blue-600 text-white text-center text-sm font-medium rounded-lg">전체</span>
            <span className="flex-1 py-2 bg-white text-gray-600 text-center text-sm font-medium rounded-lg">예정</span>
            <span className="flex-1 py-2 bg-white text-gray-600 text-center text-sm font-medium rounded-lg">완료</span>
          </div>

          <div className="px-5 mt-4 space-y-3 flex-1 overflow-hidden">
            {matches.map((m) => (
              <div key={m.date} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-gray-900">vs {m.opponent}</p>
                    <p className="text-xs text-gray-500">{m.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">
                      <span className="text-blue-600">{m.home}</span>
                      <span className="text-gray-400 mx-1">:</span>
                      <span className="text-gray-600">{m.away}</span>
                    </p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      m.result === '승' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                    }`}>{m.result}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-xs text-amber-600">
                    <svg className="w-3.5 h-3.5" fill="#fbbf24" viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                    MVP: {m.mvp} ({m.mvpRating}점)
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={USERS_PATH}/></svg>
                    출석 {m.attendance}명
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white border-t px-8 py-3 flex justify-around">
            <div className="flex flex-col items-center text-blue-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/></svg>
              <span className="text-[10px] mt-0.5">경기</span>
            </div>
            <div className="flex flex-col items-center text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={USERS_PATH}/></svg>
              <span className="text-[10px] mt-0.5">선수</span>
            </div>
            <div className="flex flex-col items-center text-gray-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <span className="text-[10px] mt-0.5">설정</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
