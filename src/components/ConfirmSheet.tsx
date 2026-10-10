'use client'

import { Sheet } from './design/Sheet'
import { AlertTriangle } from 'lucide-react'

interface ConfirmSheetProps {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSheet({
  open,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmSheetProps) {
  if (!open) return null
  return <Sheet title={title} closeLabel={cancelLabel} onClose={onCancel}>
    {danger && <AlertTriangle aria-hidden size={24} className="mb-3 text-[color:var(--danger)]" />}
    {description && <p className="mb-5 text-sm leading-relaxed text-[color:var(--text3)]">{description}</p>}
    <div className="flex flex-col gap-2">
      <button onClick={onConfirm} className="sn-button w-full" data-primary={!danger} style={danger ? { background: 'var(--danger)', color: 'white', borderColor: 'var(--danger)' } : undefined}>{confirmLabel}</button>
      <button onClick={onCancel} className="sn-button w-full">{cancelLabel}</button>
    </div>
  </Sheet>
}
