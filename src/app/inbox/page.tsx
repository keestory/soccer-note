'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Bell, Check, CheckCheck, Loader2, Inbox, Calendar, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
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
  confirmed_at: string | null
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
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
      const user = await getSessionUser(supabase)
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

    // 확장/축소 토글
    setExpandedId(expandedId === notification.receipt_id ? null : notification.receipt_id)
  }

  const confirmNotification = async (receiptId: string) => {
    try {
      const response = await fetch('/api/notifications/inbox', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptId })
      })

      if (response.ok) {
        // UI 업데이트
        setNotifications(prev =>
          prev.map(n =>
            n.receipt_id === receiptId
              ? { ...n, confirmed_at: new Date().toISOString() }
              : n
          )
        )
        toast.success('확인 완료!')
      }
    } catch (error) {
      console.error('확인 처리 실패:', error)
      toast.error('처리에 실패했습니다')
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
        return <Calendar className="w-5 h-5" style={{ color: 'var(--text)' }} />
      case 'match_update':
        return <Calendar className="w-5 h-5 text-amber-400" />
      default:
        return <Bell className="w-5 h-5 text-[color:var(--text)]/40" />
    }
  }

  if (loading) {
    return (
      <div className="light min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text)' }} />
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 flex items-center gap-2">
            <h1 className="text-base font-black text-[color:var(--text)]">알림함</h1>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-red-500 text-[color:var(--text)] text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-xl transition disabled:opacity-50"
              style={{ color: 'var(--muted2)' }}
            >
              {markingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              전체 읽음
            </button>
          )}
        </div>
      </header>

      {/* Filter Tabs */}
      <div style={{ borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 flex gap-4">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="py-3 px-1 border-b-2 text-sm font-medium transition-colors"
              style={{
                borderColor: filter === f ? 'var(--navy)' : 'transparent',
                color: filter === f ? 'var(--navy)' : 'var(--muted2)',
              }}
            >
              {f === 'all' ? '전체' : `안읽음${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
            </button>
          ))}
        </div>
      </div>

      {/* Notification List */}
      <main className="max-w-4xl mx-auto">
        {notifications.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--muted2)' }}>
            <Inbox className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="font-medium text-[color:var(--text)]">
              {filter === 'unread' ? '읽지 않은 알림이 없습니다' : '알림이 없습니다'}
            </p>
            <p className="text-sm mt-1">새로운 알림이 오면 여기에 표시됩니다</p>
          </div>
        ) : (
          <div style={{ borderBottom: '1px solid var(--line)' }}>
            {notifications.map((notification) => {
              const isExpanded = expandedId === notification.receipt_id
              const isUnread = !notification.read_at
              return (
                <div
                  key={notification.receipt_id}
                  className="border-l-[3px] transition-colors"
                  style={{
                    borderLeftColor: isUnread ? 'var(--navy)' : 'transparent',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="w-full px-4 py-4 flex items-start gap-3 text-left"
                    style={{ background: isUnread ? 'rgba(204,255,0,0.03)' : 'transparent' }}
                  >
                    <div className="flex-shrink-0 mt-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: isUnread ? 'var(--navy)' : 'transparent' }} />
                    </div>

                    <div className="flex-shrink-0 mt-0.5">
                      {getNotificationIcon(notification.notification_type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded" style={{ background: 'var(--chip)', color: 'var(--chipText)' }}>
                          {notification.team_name}
                        </span>
                        <span className="text-[11px]" style={{ color: 'var(--muted2)' }}>
                          {formatDate(notification.sent_at)}
                        </span>
                      </div>
                      <h3 className={`font-medium text-[14px] ${isExpanded ? '' : 'truncate'} ${isUnread ? 'text-[color:var(--text)]' : 'text-[color:var(--text)]/60'}`}>
                        {notification.title}
                      </h3>
                      <p className={`text-[13px] mt-0.5 ${isExpanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`} style={{ color: 'var(--muted2)' }}>
                        {notification.body}
                      </p>
                    </div>

                    <div className="flex-shrink-0" style={{ color: 'var(--muted2)' }}>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 pl-14">
                      {notification.confirmed_at ? (
                        <div className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg" style={{ background: 'var(--chip)', color: 'var(--text)' }}>
                          <CheckCircle2 className="w-4 h-4" />
                          확인 완료됨
                        </div>
                      ) : (
                        <button
                          onClick={() => confirmNotification(notification.receipt_id)}
                          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg font-bold transition"
                          style={{ background: 'var(--navy)', color: 'var(--text)' }}
                        >
                          <Check className="w-4 h-4" />
                          확인 완료!
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
