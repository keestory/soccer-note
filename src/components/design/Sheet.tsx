'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { X } from 'lucide-react'
export function Sheet({ title, closeLabel, onClose, children, closeDisabled = false }: { title: string; closeLabel: string; onClose: () => void; children: ReactNode; closeDisabled?: boolean }) {
  const ref = useRef<HTMLElement>(null)
  // Capture the trigger before a child's autoFocus runs during the commit.
  const [previous] = useState<HTMLElement | null>(() => typeof document === 'undefined' ? null : document.activeElement as HTMLElement | null)
  const close = useRef(onClose)
  close.current = () => { if (!closeDisabled) onClose() }
  useEffect(() => {
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const initial = ref.current?.querySelector<HTMLElement>('input:not(:disabled), select, textarea') ?? ref.current?.querySelector<HTMLElement>('button')
    initial?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close.current()
      if (e.key !== 'Tab') return
      const controls = ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]')
      if (!controls?.length) { e.preventDefault(); ref.current?.focus(); return }
      const first = controls[0], last = controls[controls.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); previous?.focus() }
  }, [previous])
  useEffect(() => { if (closeDisabled) ref.current?.focus() }, [closeDisabled])
  return <div className="sn-sheet-backdrop" onClick={() => close.current()}><section ref={ref} tabIndex={-1} className="sn-sheet" role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-xl font-semibold tracking-tight">{title}</h2><button className="sn-button !min-h-11 !p-3" aria-label={closeLabel} disabled={closeDisabled} onClick={() => close.current()}><X size={20} strokeWidth={1.7} aria-hidden /></button></div>{children}</section></div>
}
