'use client'
import { useRef } from 'react'
export interface PitchPlayer { id: string; name: string; number: number | null; x: number; y: number; substitution?: string; substitutedOut?: boolean }
export function LinePitch({ players, selectedId, onSelect, onMove, onMoveStart, label, moveLabel }: {
  players: PitchPlayer[]; selectedId?: string | null; onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void; label: string; moveLabel: string
  onMoveStart?: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; moved: boolean } | null>(null)
  const justDragged = useRef(false)
  const move = (id: string, clientX: number, clientY: number) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    // Keep the persisted horizontal coordinates; display the pitch in portrait.
    onMove(id, Math.max(8, Math.min(92, 100 - (clientY - rect.top) / rect.height * 100)), Math.max(10, Math.min(90, (clientX - rect.left) / rect.width * 100)))
  }
  return <div ref={ref} className="sn-pitch" role="group" aria-label={label}>
    <button type="button" className="absolute inset-0 h-full w-full" aria-label={moveLabel} disabled={!selectedId} tabIndex={-1} onClick={e => { if (selectedId) move(selectedId, e.clientX, e.clientY) }} />
    <svg viewBox="0 0 300 400" fill="none" stroke="var(--pitch-line)" strokeWidth="1" aria-hidden="true">
      <path d="M12 12H288V388H12Z M12 200H288 M75 12V72H225V12 M110 12V36H190V12 M75 388V328H225V388 M110 388V364H190V388" />
      <circle cx="150" cy="200" r="37" /><circle cx="150" cy="200" r="2" fill="var(--pitch-line)" />
      <path d="M120 72 Q150 108 180 72 M120 328 Q150 292 180 328" />
    </svg>
    {players.map(player => <button key={player.id} type="button" className="sn-pitch-player" aria-label={`${player.name}, ${player.number ?? '—'}${player.substitution ? ', ' + player.substitution : ''}`} aria-pressed={selectedId === player.id} title={player.name} data-substituted-out={player.substitutedOut || undefined} style={{ left: `${player.y}%`, top: `${100 - player.x}%`, touchAction: 'none' }}
      onPointerDown={e => { onMoveStart?.(); drag.current = { id: player.id, startX: e.clientX, startY: e.clientY, moved: false }; justDragged.current = false; e.currentTarget.setPointerCapture(e.pointerId) }}
      onPointerMove={e => { const d = drag.current; if (!d || d.id !== player.id) return; if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) > 6) d.moved = true; if (d.moved) move(d.id, e.clientX, e.clientY) }}
      onPointerUp={() => { justDragged.current = !!drag.current?.moved; drag.current = null }}
      onPointerCancel={() => { drag.current = null; justDragged.current = false }}
      onClick={() => { if (!justDragged.current) onSelect(player.id); justDragged.current = false }}
      onKeyDown={e => { const delta: Record<string, [number, number]> = { ArrowUp: [3, 0], ArrowDown: [-3, 0], ArrowLeft: [0, -3], ArrowRight: [0, 3] }; if (delta[e.key]) { e.preventDefault(); onMoveStart?.(); const [x, y] = delta[e.key]; onMove(player.id, Math.max(8, Math.min(92, player.x + x)), Math.max(10, Math.min(90, player.y + y))) } }}
    ><strong>{player.number ?? '—'}</strong><span>{player.name}</span>{player.substitution && <small className="rounded bg-white px-1 text-[9px] leading-3 text-[color:var(--text)]">{player.substitution}</small>}</button>)}
  </div>
}
