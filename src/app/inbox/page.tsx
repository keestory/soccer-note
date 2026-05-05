'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Bell, Check, CheckCheck, Loader2, Inbox, Calendar, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'

interface UserNotification {
  receipt_id: string
  notification_id: string
  team_id: string
  team_name: string
  title: string
  body: string
  data: Record<string, string>
  notification_type: string
  status: string
  read_at: string | null
  clicked_at: string | null
  sent_at: string
  created_at: string
}

export default function InboxPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [markingAll, setMarkingAll] = useState(false)

  const supabase = createClient()
  const { t } = useI18n()

  const loadNotifications = useCallback(async () => {
    try {
      const response = await fetch(`/api/notifications/inbox?unreadOnly=${filter === 'unread'}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch (error) {
      console.error('알림 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      loadNotifications()
    }
    checkAuth()
  }, [filter])

  const markAsRead = async (receiptId: string) => {
    try {
      await fetch('/api/notifications/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptIds: [receiptId] })
      })

      // UI 업데이트
      setNotifications(prev =>
        prev.map(n =>
          n.receipt_id === receiptId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('읽음 처리 실패:', error)
    }
  }

  const markAllAsRead = async () => {
    setMarkingAll(true)
    try {
      await fetch('/api/notifications/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true })
      })

      // UI 업데이트
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
      setUnreadCount(0)
      toast.success('모든 알림을 읽음 처리했습니다')
    } catch (error) {
      console.error('전체 읽음 처리 실패:', error)
      toast.error('처리에 실패했습니다')
    } finally {
      setMarkingAll(false)
    }
  }

  const handleNotificationClick = (notification: UserNotification) => {
    // 읽음 처리
    if (!notification.read_at) {
      markAsRead(notification.receipt_id)
    }

    // 관련 페이지로 이동
    if (notification.data?.matchId) {
      router.push(`/match/${notification.data.matchId}`)
    } else if (notification.team_id) {
      router.push(`/dashboard?team=${notification.team_id}`)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '방금 전'
    if (diffMins < 60) return `${diffMins}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`

    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_match':
        return <Calendar className="w-5 h-5 text-blue-500" />
      case 'match_update':
        return <Calendar className="w-5 h-5 text-orange-500" />
      default:
        return <Bell className="w-5 h-5 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-toss sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Inbox className="w-5 h-5 text-blue-600" />
              알림함
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
            >
              {markingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              전체 읽음
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            안읽음 {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </div>

      {/* Notification List */}
      <main className="max-w-4xl mx-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <Inbox className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="font-medium">
              {filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
            </p>
            <p className="text-sm mt-1">새로운 알림이 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <button
                key={notification.receipt_id}
                onClick={() => handleNotificationClick(notification)}
                className={`w-full px-4 py-4 flex items-start gap-3 text-left transition-colors ${
                  notification.read_at
                    ? 'bg-white hover:bg-gray-50'
                    : 'bg-blue-50 hover:bg-blue-100'
                }`}
              >
                {/* 읽음 상태 표시 */}
                <div className="flex-shrink-0 mt-1">
                  {notification.read_at ? (
                    <div className="w-2 h-2 rounded-full bg-transparent" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </div>

                {/* 아이콘 */}
                <div className="flex-shrink-0 mt-0.5">
                  {getNotificationIcon(notification.notification_type)}
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {notification.team_name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatDate(notification.sent_at)}
                    </span>
                  </div>
                  <h3 className={`font-medium truncate ${
                    notification.read_at ? 'text-gray-700' : 'text-gray-900'
                  }`}>
                    {notification.title}
                  </h3>
                  <p className={`text-sm mt-0.5 line-clamp-2 ${
                    notification.read_at ? 'text-gray-500' : 'text-gray-600'
                  }`}>
                    {notification.body}
                  </p>
                </div>

                {/* 화살표 */}
                {(notification.data?.matchId || notification.team_id) && (
                  <div className="flex-shrink-0 text-gray-400">
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
