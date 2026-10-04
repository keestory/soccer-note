import { Bell, Home, Trophy, UsersRound } from 'lucide-react'
import { HomeFocus } from '@/components/home/HomeFocus'

export default function HomeScreenshotPage() {
  return (
    <div className="light min-h-screen w-[390px] max-w-full bg-[color:var(--bg)] pb-nav">
      <header className="w-[390px] max-w-full bg-[color:var(--nav)] px-6 pb-5 pt-10">
        <div className="flex items-center justify-between">
          <h1 className="text-[28px] font-black tracking-[-0.05em]">FC 행구⌄</h1>
          <div className="flex items-center gap-3">
            <span aria-label="알림" className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[color:var(--text3)] text-[color:var(--text3)]"><Bell aria-hidden="true" size={22} /></span>
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[color:var(--navy)] font-black text-[color:var(--accent)]">김</span>
          </div>
        </div>
      </header>
      <main className="w-[390px] max-w-full px-5 pb-10">
        <HomeFocus seasonLine="이번 시즌 27경기 · 승률 48%" latestLabel="가장 최근 경기" opponentLabel="상대" match={{ id: 'preview', opponent: '김수빈 FC', score: '3-2', date: '2026년 9월 11일 (금)', location: '살곶이 축구장', result: 'WIN', quarters: [{ label: '1Q', home: 0, away: 0 }, { label: '2Q', home: 1, away: 0 }, { label: '3Q', home: 1, away: 0 }, { label: '4Q', home: 1, away: 0 }] }} canCreateMatch newMatchLabel="새 경기 기록하기" allMatchesLabel="전체 경기 보기" allMatchesDescription="지금까지의 모든 경기를 확인하세요." teamOperationsLabel="팀 운영 보기" teamOperationsDescription="우리 팀의 다음 경기를 준비하세요." noMatchesLabel="아직 경기 기록이 없습니다" />
      </main>
      <nav aria-label="미리보기 기본 탐색" className="fixed bottom-0 left-0 z-20 w-[390px] max-w-full border-t border-[color:var(--line)] bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around px-2 pb-3 pt-2">
          <PreviewTab icon={Home} label="홈" active />
          <PreviewTab icon={Trophy} label="경기" />
          <PreviewTab icon={UsersRound} label="팀" />
        </div>
      </nav>
    </div>
  )
}

function PreviewTab({ icon: Icon, label, active = false }: { icon: typeof Home; label: string; active?: boolean }) {
  return <span className="flex min-w-[72px] flex-col items-center gap-1 py-1" style={{ color: active ? 'var(--navy)' : 'var(--text3)' }}><Icon aria-hidden="true" size={21} strokeWidth={active ? 2.8 : 2} /><span className="text-[14px]" style={{ fontWeight: active ? 900 : 600 }}>{label}</span>{active && <span className="h-1 w-7 rounded-full bg-[color:var(--accent)]" />}</span>
}
