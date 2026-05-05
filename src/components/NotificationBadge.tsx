'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'

interface NotificationBadgeProps {
  className?: string
}

export function NotificationBadge({ className = '' }: NotificationBadgeProps) {
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

  return (
    <Link
      href="/inbox"
      className={`relative p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
    >
      <Bell className="w-6 h-6 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
