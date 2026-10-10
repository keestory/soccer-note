import { Bell, ChevronDown } from 'lucide-react'
import { BottomNavShell } from '@/components/BottomNav'
import { HomeFocus } from '@/components/home/HomeFocus'

export default function HomeScreenshotPage() {
  return (
    <div className="light app-shell relative min-h-screen w-[390px] max-w-full overflow-hidden pb-nav">
      <header className="w-[390px] max-w-full px-5 pb-3 pt-10">
        <div className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-[29px] font-black tracking-[-0.055em]">FC 행구 <ChevronDown aria-hidden="true" size={19} className="text-[color:var(--text3)]" /></h1>
          <div className="flex items-center gap-2">
            <span aria-label="알림" className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-[color:var(--card)] text-[color:var(--navy)]"><Bell aria-hidden="true" size={20} /></span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--line)] bg-white font-black text-[color:var(--navy)]">김</span>
          </div>
        </div>
      </header>
      <main className="w-[390px] max-w-full px-5 pb-10 pt-1">
        <HomeFocus seasonLine="27경기 · 승률 48%" latestLabel="가장 최근 경기" opponentLabel="상대" match={{ id: 'preview', opponent: '김수빈 FC', score: '3-2', date: '2026. 09. 11', location: '살곶이 축구장', result: 'WIN', resultLabel: '승리', quarters: [{ label: '1Q', home: 0, away: 0 }, { label: '2Q', home: 1, away: 0 }, { label: '3Q', home: 1, away: 0 }, { label: '4Q', home: 1, away: 0 }] }} canCreateMatch newMatchLabel="새 경기 기록하기" allMatchesLabel="전체 경기" allMatchesDescription="시즌의 모든 경기를 한눈에 확인하세요." teamOperationsLabel="팀 운영" teamOperationsDescription="선수와 훈련, 팀 일정을 관리하세요." noMatchesLabel="아직 경기 기록이 없습니다" />
      </main>
      <BottomNavShell activeKey="home" labels={{ home: '홈', matches: '경기', team: '팀' }} preview />
    </div>
  )
}
