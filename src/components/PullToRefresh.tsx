'use client'

import { useRef, useState, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

const THRESHOLD = 70 // px pulled down before a release triggers refresh

/**
 * Touch-based pull-to-refresh. We disabled native overscroll bounce
 * (overscroll-behavior: none) for the app feel, so this restores the
 * refresh gesture. Wrap the page's scrollable content with it.
 */
export function PullToRefresh({ onRefresh, children }: {
  onRefresh: () => Promise<void>
  children: ReactNode
}) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pulling = useRef(false)

  const onTouchStart = (e: React.TouchEvent) => {
    // Only start a pull when the page is scrolled to the very top
    if (window.scrollY <= 0 && !refreshing) {
      startY.current = e.touches[0].clientY
      pulling.current = true
    }
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!pulling.current) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 0 && window.scrollY <= 0) {
      // Rubber-band resistance
      setPull(Math.min(dy * 0.45, 110))
    } else {
      setPull(0)
    }
  }

  const onTouchEnd = async () => {
    if (!pulling.current) return
    pulling.current = false
    if (pull >= THRESHOLD) {
      setRefreshing(true)
      setPull(52)
      try { await onRefresh() } finally {
        setRefreshing(false)
        setPull(0)
      }
    } else {
      setPull(0)
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      <div
        className="flex items-center justify-center overflow-hidden"
        style={{
          height: pull,
          transition: pulling.current ? 'none' : 'height 0.25s ease',
        }}
      >
        <Loader2
          className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
          style={{
            color: 'var(--accent)',
            opacity: Math.min(pull / THRESHOLD, 1),
            transform: refreshing ? undefined : `rotate(${pull * 3}deg)`,
          }}
        />
      </div>
      {children}
    </div>
  )
}
