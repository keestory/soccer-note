'use client'

import { useEffect } from 'react'
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
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative w-full rounded-t-3xl px-5 pt-5 pb-8 safe-bottom"
        style={{ background: 'var(--card)', border: '1px solid var(--line)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#333' }} />
        <div className="flex items-start gap-3 mb-5">
          {danger && (
            <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(192,90,77,.14)' }}>
              <AlertTriangle className="w-5 h-5" style={{ color: '#e07a6d' }} />
            </div>
          )}
          <div>
            <p className="font-bold text-white text-[15px]">{title}</p>
            {description && <p className="text-[13px] mt-1" style={{ color: 'var(--muted2)' }}>{description}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <button
            onClick={onConfirm}
            className="w-full py-4 rounded-2xl font-black text-base transition active:scale-[0.98]"
            style={{ background: danger ? '#c05a4d' : 'var(--accent)', color: danger ? '#fff' : '#0a0a0a' }}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full py-4 rounded-2xl font-bold text-base transition active:scale-[0.98]"
            style={{ background: '#1a1a1a', color: '#888' }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
