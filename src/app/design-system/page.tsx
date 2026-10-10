'use client'
import { useState } from 'react'
import { ArrowUpRight, Check, ChevronDown, CircleDot, Home, LayoutGrid, Plus, Search, Trophy, UsersRound } from 'lucide-react'
import { HomeFocus } from '@/components/home/HomeFocus'
import { LinePitch, type PitchPlayer } from '@/components/design/LinePitch'
import { PlayerFields } from '@/components/design/PlayerFields'
import { Sheet } from '@/components/design/Sheet'
import type { PositionType } from '@/types/database'
import { getTranslations } from '@/lib/i18n'

type DemoPlayer = PitchPlayer & { position: PositionType; goals: number; assists: number }
const initialPlayers: DemoPlayer[] = [
  ['1', '김민준', 1, 'GK', 9, 50, 0, 0], ['2', '이도윤', 3, 'DF', 27, 16, 0, 1],
  ['3', '박서준', 4, 'DF', 27, 39, 1, 0], ['4', '최지호', 5, 'DF', 27, 62, 0, 0],
  ['5', '정하준', 2, 'DF', 27, 85, 0, 2], ['6', '김현우', 6, 'MF', 51, 22, 2, 4],
  ['7', '이준서', 8, 'MF', 48, 50, 3, 6], ['8', '박시우', 14, 'MF', 51, 78, 2, 3],
  ['9', '최도현', 7, 'FW', 76, 20, 8, 4], ['10', '김지훈', 9, 'FW', 82, 50, 12, 3],
  ['11', '정우진', 11, 'FW', 76, 80, 7, 5],
].map(([id, name, number, position, x, y, goals, assists]) => ({ id: String(id), name: String(name), number: Number(number), position: position as PositionType, x: Number(x), y: Number(y), goals: Number(goals), assists: Number(assists) }))
type Page = 'home' | 'players' | 'formation' | 'record'
export default function DesignSystemPage() {
  const [page, setPage] = useState<Page>('home')
  const [players, setPlayers] = useState(initialPlayers)
  const [selected, setSelected] = useState<string | null>(null)
  const [formation, setFormation] = useState('4-3-3')
  const [history, setHistory] = useState<DemoPlayer[] | null>(null)
  const [search, setSearch] = useState('')
  const [ranking, setRanking] = useState(false)
  const [metric, setMetric] = useState<'goals' | 'assists'>('goals')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')
  const [quarter, setQuarter] = useState(0)
  const [scores, setScores] = useState([[1, 0], [0, 1], [2, 0], [0, 1]])
  const [notice, setNotice] = useState('')
  const t = getTranslations('ko')
  const total = [scores.reduce((s, q) => s + q[0], 0), scores.reduce((s, q) => s + q[1], 0)]
  const title = { home: '우리 팀의 다음 한 걸음.', players: '함께 뛰는 우리 팀.', formation: '경기는 여기서 시작.', record: '한 경기, 모든 순간.' }[page]
  const switchPage = (next: Page) => { setPage(next); setNotice('') }
  const sorted = [...players].filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || String(p.number ?? '').includes(search)).sort((a, b) => ranking ? b[metric] - a[metric] : 0)
  return <div className="light min-h-screen">
    <div className="sn-preview-layout">
      <aside className="sn-preview-intro">
        <div className="mb-20 flex items-center gap-2 text-lg font-semibold tracking-tight"><CircleDot size={20} strokeWidth={1.7} /> soccer note<span className="text-[color:var(--brand)]">.</span></div>
        <p className="sn-kicker sn-kicker--latin">A little less admin. A lot more football.</p>
        <h2 className="mt-5 text-[64px] font-medium leading-[1.1] tracking-[-0.065em]">우리 팀의 축구를,<br /><span className="text-[color:var(--brand)]">더 간결하게.</span></h2>
        <p className="mt-7 max-w-[360px] text-[15px] leading-7 text-[color:var(--text3)]">선수부터 포메이션, 경기 기록까지.<br />터치 몇 번으로 정리하는 우리 팀의 한 시즌.</p>
        <div className="mt-12 border-t border-[color:var(--line)] pt-6">
          <p className="sn-kicker sn-kicker--latin mb-5">01 / Line Matchday — Design system</p>
          <div className="flex gap-3">{[['#172c23', 'Ink'], ['#176b52', 'Forest'], ['#d8ece2', 'Sage'], ['#f8faf8', 'Canvas']].map(([color, label]) => <div key={label}><div className="h-12 w-16 rounded-lg border border-black/10" style={{ background: color }} /><p className="mt-2 text-xs leading-[18px] text-[color:var(--text3)]">{label}</p></div>)}</div>
          <div className="mt-6 grid grid-cols-3 border-y border-[color:var(--line)] py-5 text-xs"><div><strong className="block text-xl font-medium">1 px</strong><span className="text-[color:var(--text3)]">섬세한 구분선</span></div><div><strong className="block text-xl font-medium">48 px</strong><span className="text-[color:var(--text3)]">편안한 터치</span></div><div><strong className="block text-xl font-medium">8 pt</strong><span className="text-[color:var(--text3)]">일관된 간격</span></div></div>
          <p className="mt-6 max-w-sm text-xs leading-6 text-[color:var(--text3)]">오른쪽 화면에서 선수 추가, 포메이션 배치와 쿼터 기록을 직접 체험하세요. 가상 팀을 사용하는 디자인 미리보기이며 변경은 이 화면에서만 유지됩니다.</p>
        </div>
      </aside>
      <div className="sn-preview-phone">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b border-[color:var(--line)] px-5 py-3 text-xs leading-[18px] text-[color:var(--text3)]"><span className="flex items-center gap-1.5"><CircleDot size={16} strokeWidth={1.7} aria-hidden /> SOCCER NOTE</span><span>디자인 미리보기 · 가상 데이터</span></div>
        <main>
          <header className="mb-5">
            <div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-[15px] font-semibold">FC 노트 <ChevronDown size={14} /></p><span className="grid h-10 w-10 place-items-center rounded-full border border-[color:var(--line)] text-xs">FC</span></div>
            <h1 className="sn-page-title mt-6">{title}</h1>
          </header>
          {page === 'home' && <div onClick={e => { const link = (e.target as HTMLElement).closest('a'); if (!link) return; e.preventDefault(); switchPage(link.getAttribute('href') === '/team' ? 'players' : 'record') }}>
            <HomeFocus seasonLine="2026 시즌 · 12경기 · 8승 2무 2패" latestLabel="지난 경기" opponentLabel="상대" upcomingLabel="다음 경기"
              upcoming={{ id: 'demo-next', opponent: '서울 유나이티드', date: '10월 18일 (일) · 09:00', location: '서울숲 축구장' }}
              match={{ id: 'demo', opponent: '마포 FC', score: total.join('-'), date: '10월 4일 (일)', location: '살곶이 축구장', result: total[0] > total[1] ? 'WIN' : total[0] < total[1] ? 'LOSS' : 'DRAW', resultLabel: total[0] > total[1] ? t.win : total[0] < total[1] ? t.loss : t.draw, quarters: scores.map((q, i) => ({ label: `${i + 1}Q`, home: q[0], away: q[1] })) }}
              canCreateMatch newMatchLabel="경기 기록하기" allMatchesLabel={t.viewAll} teamOperationsLabel="우리 팀 관리" teamOperationsDescription={`선수 ${players.length}명 · 선수 명단과 개인 순위`} noMatchesLabel="첫 경기를 기록해 보세요." />
          </div>}
          {page === 'players' && <>
            <div className="sn-tabs mb-5"><button aria-pressed={!ranking} onClick={() => setRanking(false)}>선수 {players.length}</button><button aria-pressed={ranking} onClick={() => setRanking(true)}>시즌 랭킹</button></div>
            <label className="mb-5 flex items-center gap-2 rounded-xl border border-[color:var(--line)] bg-white px-3"><Search size={20} strokeWidth={1.7} aria-hidden className="text-[color:var(--text3)]" /><input className="min-w-0 flex-1 bg-transparent py-3 outline-none" aria-label="이름 또는 등번호 검색" placeholder="이름 또는 등번호 검색" value={search} onChange={e => setSearch(e.target.value)} /></label>
            {ranking && <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-[color:var(--text3)]">2026 시즌 · 우리 팀</span><div className="flex gap-2">{(['goals', 'assists'] as const).map(m => <button key={m} className="sn-button !px-3 !py-1" aria-pressed={metric === m} style={metric === m ? { background: 'var(--chip)', color: 'var(--brand)' } : undefined} onClick={() => setMetric(m)}>{m === 'goals' ? '득점' : '도움'}</button>)}</div></div>}
            <div className="surface divide-y divide-[color:var(--line)] overflow-hidden">{sorted.map(p => <div key={p.id} className="flex items-center gap-3 px-4 py-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[color:var(--card2)] text-sm tabular-nums">{ranking ? sorted.findIndex(x => x[metric] === p[metric]) + 1 : p.number ?? '—'}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{p.name}</p><p className="mt-1 text-xs leading-[18px] text-[color:var(--text3)]">{p.position} · #{p.number ?? '—'}</p></div><p className="text-sm tabular-nums">{ranking ? p[metric] : `${p.goals} G · ${p.assists} A`}</p></div>)}</div>
            {sorted.length === 0 && <p className="py-8 text-center text-sm text-[color:var(--text3)]">검색 결과가 없습니다.</p>}
            <button className="sn-button mt-5 w-full" data-primary="true" onClick={() => setAdding(true)}><Plus size={20} strokeWidth={1.7} aria-hidden />선수 추가</button>
          </>}
          {page === 'formation' && <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[color:var(--text3)]">1쿼터 · 선발 11명</p><select aria-label="포메이션" className="sn-button !py-2" value={formation} onChange={e => { setFormation(e.target.value); setHistory(players); const positions = e.target.value === '4-4-2' ? [[9,50],[27,16],[27,39],[27,62],[27,85],[52,16],[52,39],[52,62],[52,85],[79,32],[79,68]] : initialPlayers.map(p => [p.x,p.y]); setPlayers(players.map((p,i) => i < 11 ? { ...p, x: positions[i][0], y: positions[i][1] } : p)) }}><option>4-3-3</option><option>4-4-2</option></select></div>
            <LinePitch players={players.slice(0,11)} selectedId={selected} label="포메이션 피치" moveLabel="선택한 선수 위치 이동" onSelect={id => { setHistory(players); setSelected(id) }} onMoveStart={() => setHistory(players)} onMove={(id,x,y) => setPlayers(prev => prev.map(p => p.id === id ? { ...p,x,y } : p))} />
            <p className="mt-3 text-xs leading-[18px] text-[color:var(--text3)]">선수 선택 → 원하는 위치 탭. 드래그와 방향키로도 움직일 수 있어요.</p>
            <div className="mt-4 flex gap-2"><button className="sn-button flex-1" disabled={!history} onClick={() => { if (history) setPlayers(history); setHistory(null) }}>되돌리기</button><button className="sn-button flex-[2]" data-primary="true" onClick={() => setNotice('포메이션이 미리보기에 반영되었습니다.')}><Check size={20} strokeWidth={1.7} aria-hidden />배치 완료</button></div>
          </>}
          {page === 'record' && <>
            <div className="surface overflow-hidden"><div className="grid grid-cols-2 gap-4 px-5 py-6 text-center"><span className="text-sm font-medium leading-[21px] [overflow-wrap:anywhere]">FC 노트</span><span className="text-sm font-medium leading-[21px] [overflow-wrap:anywhere]">마포 FC</span><strong className="score-display col-span-2 text-5xl leading-none">{total[0]} : {total[1]}</strong></div><div className="grid grid-cols-4 border-t border-[color:var(--line)]">{scores.map((s,i) => <button key={i} className="flex flex-col items-center gap-2 border-r border-[color:var(--line)] py-3 last:border-0" aria-pressed={quarter === i} style={quarter === i ? { background: 'var(--chip)', color: 'var(--brand)' } : undefined} onClick={() => setQuarter(i)}><span className="text-xs leading-[18px]">{i+1}Q</span><strong className="text-sm font-medium">{s[0]} : {s[1]}</strong></button>)}</div></div>
            <h2 className="mb-4 mt-7 text-base font-semibold">{quarter + 1}쿼터 결과</h2>
            <div className="surface divide-y divide-[color:var(--line)]">{['FC 노트', '마포 FC'].map((team, i) => <div key={team} className="flex items-center justify-between px-4 py-3"><span className="text-sm">{team}</span><div className="flex items-center gap-4"><button aria-label={`${team} 득점 줄이기`} className="sn-button !min-h-11 !px-4" disabled={scores[quarter][i] === 0} onClick={() => setScores(prev => prev.map((s,q) => q === quarter ? s.map((v,j) => j === i ? Math.max(0,v-1) : v) : s))}>−</button><strong className="min-w-5 text-center text-xl tabular-nums">{scores[quarter][i]}</strong><button aria-label={`${team} 득점 늘리기`} className="sn-button !min-h-11 !px-4" onClick={() => setScores(prev => prev.map((s,q) => q === quarter ? s.map((v,j) => j === i ? v+1 : v) : s))}>+</button></div></div>)}</div>
            <div className="mt-6 space-y-3"><button className="sn-button w-full" onClick={() => switchPage('formation')}><LayoutGrid size={20} strokeWidth={1.7} aria-hidden />이 쿼터 포메이션 보기<ArrowUpRight size={20} strokeWidth={1.7} aria-hidden /></button><button className="sn-button w-full" data-primary="true" onClick={() => setNotice('쿼터 결과가 미리보기에 반영되었습니다.')}><Check size={17} />기록 완료</button></div>
            <p className="mt-4 text-xs leading-[18px] text-[color:var(--text3)]">쿼터 점수는 경기 결과에 자동 합산됩니다. 실제 경기의 득점·도움은 선수 기록에서 관리합니다.</p>
          </>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-[color:var(--chip)] p-3 text-xs text-[color:var(--brand)]">{notice}</p>}
        </main>
        <nav className="sn-preview-nav" aria-label="디자인 화면">{([{key:'home',label:'홈',icon:Home},{key:'players',label:'선수·랭킹',icon:UsersRound},{key:'formation',label:'포메이션',icon:LayoutGrid},{key:'record',label:'경기 기록',icon:Trophy}] as const).map(({key,label,icon:Icon}) => <button key={key} aria-pressed={page === key} onClick={() => switchPage(key)}><Icon size={20} strokeWidth={1.7} aria-hidden/>{label}</button>)}</nav>
      </div>
    </div>
    {adding && <Sheet title="함께 뛸 선수 추가" closeLabel="닫기" onClose={() => setAdding(false)}><form onSubmit={e => { e.preventDefault(); if (!name.trim()) return; setPlayers(prev => [...prev,{id:crypto.randomUUID(),name:name.trim(),number:number ? Number(number) : null,position,x:50,y:50,goals:0,assists:0}]); setAdding(false); setName(''); setNumber(''); setSearch(''); setNotice('선수가 미리보기에 추가되었습니다.') }}><p className="mb-5 text-sm text-[color:var(--text3)]">이름만으로 시작하세요. 등번호는 나중에 넣어도 돼요.</p><PlayerFields name={name} number={number} position={position} onName={setName} onNumber={setNumber} onPosition={setPosition} labels={{name:'선수 이름',number:'등번호',position:'포지션'}} autoFocus /><button className="sn-button mt-6 w-full" data-primary="true" type="submit" disabled={!name.trim()}><Plus size={20} strokeWidth={1.7} aria-hidden />선수 추가</button></form></Sheet>}
  </div>
}
