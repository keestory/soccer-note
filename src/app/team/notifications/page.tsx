'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Bell, Send, Loader2, MessageSquare, Users, CheckCircle, XCircle, Search, Check, UserCheck, ChevronDown, ChevronUp, Eye, CheckCircle2 } from 'lucide-react'
import { NotificationsPageSkeleton } from '@/components/Skeleton'
import { getStore, MemberWithProfile } from '@/lib/dataStore'
import type { Team } from '@/types/database'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'

interface Notification {
  id: string
  team_id: string
  sender_id: string
  title: string
  body: string
  notification_type: 'manual' | 'new_match' | 'match_update' | 'system'
  recipients_count: number
  success_count: number
  failure_count: number
  created_at: string
}

interface NotificationStats {
  total_sent: number
  read_count: number
  confirmed_count: number
  recipients: {
    user_id: string
    display_name: string | null
    read_at: string | null
    confirmed_at: string | null
  }[]
}

function NotificationsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamIdParam = searchParams.get('team')

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [team, setTeam] = useState<Team | null>(null)
  const [isCoach, setIsCoach] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [includeSelf, setIncludeSelf] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [expandedNotificationId, setExpandedNotificationId] = useState<string | null>(null)
  const [loadingStatsId, setLoadingStatsId] = useState<string | null>(null)
  const [notificationStats, setNotificationStats] = useState<Record<string, NotificationStats>>({})

  const supabase = createClient()
  const { t } = useI18n()

  // 검색 필터링된 멤버 목록
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members
    const query = searchQuery.toLowerCase()
    return members.filter(m =>
      m.profile?.display_name?.toLowerCase().includes(query) ||
      m.user_id.toLowerCase().includes(query)
    )
  }, [members, searchQuery])

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedUserIds.length === members.length) {
      setSelectedUserIds([])
    } else {
      setSelectedUserIds(members.map(m => m.user_id))
    }
  }

  // 개별 선택/해제
  const toggleMember = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  useEffect(() => {
    // 캐시된 데이터 즉시 로드
    const cached = getStore()
    if (cached.isLoaded && cached.selectedTeamId && cached.userId) {
      const team = cached.teams.find(t => t.id === cached.selectedTeamId)
      if (team && (team.role === 'coach')) {
        setTeam(team)
        setIsCoach(true)
        setCurrentUserId(cached.userId)

        // 팀 소유자가 members에 없으면 추가
        let membersToSet = [...cached.members]
        const ownerInMembers = membersToSet.some(m => m.user_id === team.user_id)
        if (!ownerInMembers) {
          membersToSet.unshift({
            id: 'owner',
            team_id: team.id,
            user_id: team.user_id,
            role: 'coach',
            status: 'approved',
            joined_at: team.created_at,
            updated_at: team.updated_at,
            profile: { id: team.user_id, display_name: cached.displayName || '팀 소유자' }
          } as MemberWithProfile)
        }
        setMembers(membersToSet)

        setLoading(false)
        // 백그라운드에서 알림 내역 로드
        loadNotifications(team.id)
        return
      }
    }
    loadData()
  }, [teamIdParam])

  const loadData = async () => {
    const user = await getSessionUser(supabase)
    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    // Get team ID
    let teamId = teamIdParam
    if (!teamId) {
      const savedTeamId = localStorage.getItem('selectedTeamId')
      if (savedTeamId) teamId = savedTeamId
    }

    // Parallel fetch: team info and owned teams (fallback)
    const [teamResult, ownedTeamsResult] = await Promise.all([
      teamId
        ? supabase.from('teams').select('*').eq('id', teamId).single()
        : Promise.resolve({ data: null }),
      supabase.from('teams').select('id, user_id').eq('user_id', user.id).limit(1)
    ])

    let teamData = teamResult.data

    // Fallback to owned team if no team found
    if (!teamData && ownedTeamsResult.data && ownedTeamsResult.data.length > 0) {
      teamId = ownedTeamsResult.data[0].id
      const { data } = await supabase.from('teams').select('*').eq('id', teamId).single()
      teamData = data
    }

    if (!teamData) {
      router.push('/dashboard')
      return
    }

    setTeam(teamData)
    const isOwner = teamData.user_id === user.id

    // Parallel fetch: membership check, notifications, and members with profiles
    const [memberResult, notificationsResponse, membersResult, profilesResponse] = await Promise.all([
      !isOwner
        ? supabase.from('team_members').select('role').eq('team_id', teamData.id).eq('user_id', user.id).eq('status', 'approved').single()
        : Promise.resolve({ data: null }),
      fetch(`/api/send-notification?teamId=${teamData.id}`),
      supabase.from('team_members').select('*').eq('team_id', teamData.id).eq('status', 'approved').or('is_removed.is.null,is_removed.eq.false'),
      fetch(`/api/team-members-profiles?teamId=${teamData.id}`)
    ])

    // Check permissions
    const isCoachRole = memberResult.data?.role === 'coach'
    if (!isOwner && !isCoachRole) {
      toast.error('권한이 없습니다')
      router.push('/dashboard')
      return
    }

    setIsCoach(true)

    // Process notifications
    if (notificationsResponse.ok) {
      const data = await notificationsResponse.json()
      setNotifications(data.notifications || [])
    }

    // Process members with profiles
    let membersWithProfiles: MemberWithProfile[] = (membersResult.data || []).map(m => ({ ...m, profile: undefined }))
    try {
      if (profilesResponse.ok) {
        const profilesJson = await profilesResponse.json()
        const profileMap = new Map(profilesJson.profiles?.map((p: { id: string; display_name: string }) => [p.id, p]) || [])
        membersWithProfiles = (membersResult.data || []).map(m => ({
          ...m,
          profile: profileMap.get(m.user_id) as { id: string; display_name: string } | undefined
        }))

        // 팀 소유자가 team_members에 없으면 추가
        const ownerInMembers = membersWithProfiles.some(m => m.user_id === teamData.user_id)
        if (!ownerInMembers) {
          const ownerProfile = profileMap.get(teamData.user_id) as { id: string; display_name: string } | undefined
          membersWithProfiles.unshift({
            id: 'owner',
            team_id: teamData.id,
            user_id: teamData.user_id,
            role: 'coach',
            status: 'approved',
            joined_at: teamData.created_at,
            updated_at: teamData.updated_at,
            profile: ownerProfile
          } as MemberWithProfile)
        }
      }
    } catch (e) {
      // 프로필 로드 실패 시 무시
    }
    setMembers(membersWithProfiles)

    setLoading(false)
  }

  const loadNotifications = async (teamId: string) => {
    try {
      const response = await fetch(`/api/send-notification?teamId=${teamId}`)
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
      }
    } catch (error) {
      console.error('알림 내역 로드 실패:', error)
    }
  }

  const handleSend = async () => {
    if (!team || !title.trim() || !body.trim()) {
      toast.error('제목과 내용을 입력해주세요')
      return
    }

    // 선택된 멤버가 없고 본인에게도 보내지 않는 경우
    if (selectedUserIds.length === 0 && !includeSelf) {
      toast.error('발송 대상을 선택해주세요')
      return
    }

    setSending(true)

    try {
      const response = await fetch('/api/send-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teamId: team.id,
          title: title.trim(),
          body: body.trim(),
          notificationType: 'manual',
          selectedUserIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
          includeSelf,
        }),
      })

      if (!response.ok) {
        throw new Error('알림 전송 실패')
      }

      const result = await response.json()
      toast.success(`${t.notificationSent} (${result.successCount}/${result.recipientsCount})`)

      // Clear form
      setTitle('')
      setBody('')
      setSelectedUserIds([])
      setIncludeSelf(false)

      // Reload notifications
      await loadNotifications(team.id)
    } catch (error) {
      console.error('알림 전송 오류:', error)
      toast.error(t.notificationSendFailed)
    } finally {
      setSending(false)
    }
  }

  const loadNotificationStats = async (notificationId: string) => {
    if (notificationStats[notificationId]) return // 이미 로드됨

    setLoadingStatsId(notificationId)
    try {
      const response = await fetch(`/api/notifications/stats?notificationId=${notificationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.stats) {
          setNotificationStats(prev => ({
            ...prev,
            [notificationId]: data.stats
          }))
        }
      }
    } catch (error) {
      console.error('통계 로드 실패:', error)
    } finally {
      setLoadingStatsId(null)
    }
  }

  const toggleNotificationExpand = (notificationId: string) => {
    if (expandedNotificationId === notificationId) {
      setExpandedNotificationId(null)
    } else {
      setExpandedNotificationId(notificationId)
      loadNotificationStats(notificationId)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatShortDate = (dateString: string | null) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getNotificationTypeLabel = (type: string) => {
    switch (type) {
      case 'manual':
        return t.manualNotification
      case 'new_match':
        return t.newMatchNotification
      default:
        return type
    }
  }

  if (loading) {
    return <NotificationsPageSkeleton />
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
              <Bell className="w-5 h-5 text-blue-600" />
              {t.notifications}
            </h1>
            {team && (
              <p className="text-sm text-gray-500">{team.name}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Send Notification Form */}
        <section className="bg-white rounded-xl shadow-toss p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Send className="w-5 h-5 text-blue-600" />
            {t.sendNotification}
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.notificationTitle}
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.notificationTitlePlaceholder}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                maxLength={100}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t.notificationBody}
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={t.notificationBodyPlaceholder}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                rows={4}
                maxLength={500}
              />
            </div>

            {/* 발송 대상 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                발송 대상
              </label>

              {/* 검색창 */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="이름으로 검색..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                />
              </div>

              {/* 전체 선택 & 나에게도 보내기 */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                >
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedUserIds.length === members.length && members.length > 0
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedUserIds.length === members.length && members.length > 0 && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  전체 선택 ({selectedUserIds.length}/{members.length})
                </button>

                <label className="flex items-center gap-2 cursor-pointer">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    includeSelf ? 'bg-green-600 border-green-600' : 'border-gray-300'
                  }`}>
                    {includeSelf && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-sm text-gray-700">나에게도 보내기</span>
                  <input
                    type="checkbox"
                    checked={includeSelf}
                    onChange={(e) => setIncludeSelf(e.target.checked)}
                    className="sr-only"
                  />
                </label>
              </div>

              {/* 멤버 목록 */}
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                {filteredMembers.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">
                    {searchQuery ? '검색 결과가 없습니다' : '멤버가 없습니다'}
                  </p>
                ) : (
                  filteredMembers.map((member) => {
                    const isSelected = selectedUserIds.includes(member.user_id)
                    const isSelf = member.user_id === currentUserId
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleMember(member.user_id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                          isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-sm font-medium text-gray-900">
                            {member.profile?.display_name || '이름 없음'}
                          </span>
                          {isSelf && (
                            <span className="ml-2 text-xs text-blue-600">(나)</span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.role === 'coach' ? 'bg-blue-100 text-blue-700' :
                          member.role === 'parent' ? 'bg-green-100 text-green-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {member.role === 'coach' ? '코치' : member.role === 'parent' ? '학부모' : '멤버'}
                        </span>
                      </button>
                    )
                  })
                )}
              </div>

              {/* 선택된 멤버 수 표시 */}
              <p className="text-xs text-gray-500 mt-2">
                {selectedUserIds.length > 0 || includeSelf ? (
                  <>
                    <UserCheck className="w-3 h-3 inline mr-1" />
                    {selectedUserIds.length}명 선택됨
                    {includeSelf && selectedUserIds.length > 0 ? ' + 나' : includeSelf ? '나에게만 발송' : ''}
                  </>
                ) : (
                  '발송 대상을 선택해주세요 (선택하지 않으면 전체 발송)'
                )}
              </p>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !title.trim() || !body.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  {t.send}
                </>
              )}
            </button>
          </div>
        </section>

        {/* Notification History */}
        <section className="bg-white rounded-xl shadow-toss p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            {t.notificationHistory}
          </h2>

          {notifications.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">{t.noNotifications}</p>
              <p className="text-sm mt-1">{t.noNotificationsDescription}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => {
                const isExpanded = expandedNotificationId === notification.id
                const stats = notificationStats[notification.id]
                const isLoadingStats = loadingStatsId === notification.id

                return (
                  <div
                    key={notification.id}
                    className="border rounded-lg overflow-hidden transition-colors"
                  >
                    <button
                      onClick={() => toggleNotificationExpand(notification.id)}
                      className="w-full p-4 hover:bg-gray-50 text-left"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                              {getNotificationTypeLabel(notification.notification_type)}
                            </span>
                            <span className="text-xs text-gray-400">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          <h3 className="font-medium text-gray-900 truncate">
                            {notification.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {notification.body}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-1 text-sm">
                            <div className="flex items-center gap-1 text-gray-500">
                              <Users className="w-4 h-4" />
                              <span>{notification.recipients_count}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-0.5 text-green-600">
                                <CheckCircle className="w-3 h-3" />
                                {notification.success_count}
                              </span>
                              {notification.failure_count > 0 && (
                                <span className="flex items-center gap-0.5 text-red-500">
                                  <XCircle className="w-3 h-3" />
                                  {notification.failure_count}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-gray-400">
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5" />
                            ) : (
                              <ChevronDown className="w-5 h-5" />
                            )}
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* 확장된 통계 패널 */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4">
                        {isLoadingStats ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                          </div>
                        ) : stats ? (
                          <div className="space-y-4">
                            {/* 통계 요약 */}
                            <div className="flex items-center gap-4 text-sm">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full">
                                <Eye className="w-4 h-4" />
                                <span>읽음 {stats.read_count}/{stats.total_sent}</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 rounded-full">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>확인 {stats.confirmed_count}/{stats.total_sent}</span>
                              </div>
                            </div>

                            {/* 수신자 목록 */}
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">수신자 현황</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {stats.recipients.map((recipient) => (
                                  <div
                                    key={recipient.user_id}
                                    className="flex items-center justify-between bg-white rounded-lg p-2 text-sm"
                                  >
                                    <span className="font-medium text-gray-900">
                                      {recipient.display_name || '이름 없음'}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      {recipient.confirmed_at ? (
                                        <span className="flex items-center gap-1 text-green-600">
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span className="text-xs">{formatShortDate(recipient.confirmed_at)}</span>
                                        </span>
                                      ) : recipient.read_at ? (
                                        <span className="flex items-center gap-1 text-blue-600">
                                          <Eye className="w-4 h-4" />
                                          <span className="text-xs">{formatShortDate(recipient.read_at)}</span>
                                        </span>
                                      ) : (
                                        <span className="text-xs text-gray-400">미확인</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500 text-center py-4">
                            통계를 불러올 수 없습니다
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <NotificationsContent />
    </Suspense>
  )
}
