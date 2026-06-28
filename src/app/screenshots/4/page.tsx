'use client'

// Individual capture page for Screenshot 4: Player Rating & Feedback
const STAR_PATH = "M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"

export default function Screenshot4Page() {
  return (
    <div className="w-screen h-screen bg-gradient-to-b from-amber-500 to-orange-600 flex flex-col items-center overflow-hidden">
      {/* Title */}
      <div className="pt-[8%] pb-[4%] text-center px-[10%]">
        <h2 className="text-[clamp(2rem,5vw,4rem)] font-extrabold text-white leading-tight">
          선수별 평가 &<br />피드백
        </h2>
        <p className="text-amber-100 text-[clamp(1rem,2.5vw,1.5rem)] mt-3">경기별 상세 평가 기록</p>
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
                <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">7</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">박지훈</p>
                  <span className="text-[10px] text-red-500 font-medium">FW</span>
                </div>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-4 h-4" fill={i <= 4 ? '#fbbf24' : '#e5e7eb'} viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                  ))}
                  <span className="text-amber-600 font-bold text-sm ml-1">8.5</span>
                </div>
              </div>

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

          {/* Player Card 2 */}
          <div className="px-4 mt-2.5">
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xs">8</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">김민수</p>
                  <span className="text-[10px] text-slate-500 font-medium">MF</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4].map(i => (
                    <svg key={i} className="w-3.5 h-3.5" fill="#fbbf24" viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                  ))}
                  <svg className="w-3.5 h-3.5" fill="#e5e7eb" viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                  <span className="text-amber-600 font-bold text-xs ml-1">7.5</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-primary-50 text-primary-600 px-2 py-0.5 rounded font-medium">1골</span>
                <span className="text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded font-medium">2어시스트</span>
              </div>
            </div>
          </div>

          {/* Player Card 3 */}
          <div className="px-4 mt-2.5">
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-xs">1</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">이준서</p>
                  <span className="text-[10px] text-amber-600 font-medium">GK</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} className="w-3.5 h-3.5" fill={i <= 4 ? '#fbbf24' : '#e5e7eb'} viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                  ))}
                  <span className="text-amber-600 font-bold text-xs ml-1">8.0</span>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded font-medium">클린시트</span>
              </div>
            </div>
          </div>

          {/* Player Card 4 */}
          <div className="px-4 mt-2.5">
            <div className="bg-white rounded-xl p-3.5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-xs">5</div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 text-sm">박서진</p>
                  <span className="text-[10px] text-primary-500 font-medium">DF</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1,2,3].map(i => (
                    <svg key={i} className="w-3.5 h-3.5" fill="#fbbf24" viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                  ))}
                  {[4,5].map(i => (
                    <svg key={i} className="w-3.5 h-3.5" fill="#e5e7eb" viewBox="0 0 20 20"><path d={STAR_PATH}/></svg>
                  ))}
                  <span className="text-amber-600 font-bold text-xs ml-1">6.5</span>
                </div>
              </div>
            </div>
          </div>

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
