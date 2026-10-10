'use client'
import { useId } from 'react'
import type { PositionType } from '@/types/database'
export interface PlayerFieldsProps {
  name: string; number: string; position: PositionType
  onName: (value: string) => void; onNumber: (value: string) => void; onPosition: (value: PositionType) => void
  labels: { name: string; number: string; position: string }; autoFocus?: boolean
}
export function PlayerFields({ name, number, position, onName, onNumber, onPosition, labels, autoFocus }: PlayerFieldsProps) {
  const id = useId()
  return <div className="space-y-5">
    <div className="grid grid-cols-[minmax(0,1fr)_90px] gap-3">
      <label className="sn-field" htmlFor={`${id}-name`}>{labels.name}<input id={`${id}-name`} autoFocus={autoFocus} value={name} onChange={e => onName(e.target.value)} required maxLength={80} autoComplete="off" /></label>
      <label className="sn-field" htmlFor={`${id}-number`}>{labels.number}<input id={`${id}-number`} value={number} onChange={e => onNumber(e.target.value)} type="number" inputMode="numeric" min={1} max={99} placeholder="—" /></label>
    </div>
    <fieldset><legend className="mb-2 text-[13px] font-medium">{labels.position}</legend><div className="grid grid-cols-4 gap-2">{(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map(pos => <button key={pos} type="button" className="sn-button !px-2" aria-pressed={position === pos} onClick={() => onPosition(pos)} style={position === pos ? { color: 'var(--brand)', borderColor: 'var(--brand)', background: 'var(--chip)' } : undefined}>{pos}</button>)}</div></fieldset>
  </div>
}
