'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

interface NotificationBadgeProps {
  className?: string
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
  const { t } = useI18n()
  const [unreadCount, setUnreadCount] = useState(0)

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch('/api/notifications/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      // 조용히 실패
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()

    // 30초마다 폴링
    const interval = setInterval(fetchUnreadCount, 30000)

    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  return <NotificationBadgeShell label={t.notifications} unreadCount={unreadCount} className={className} />
}

export function NotificationBadgeShell({ label, unreadCount = 0, className = '' }: { label: string; unreadCount?: number; className?: string }) {
  return (
    <Link
      href="/inbox"
      aria-label={label}
      className={`focus-ring relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-[color:var(--card)] transition ${className}`}
    >
      <Bell aria-hidden="true" size={20} strokeWidth={1.7} className="text-[color:var(--text)]" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
