'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser, authHeader } from '@/lib/supabase'
import { ArrowLeft, Bell, Send, Loader2, MessageSquare, Users, CheckCircle, XCircle, Search, Check, UserCheck, ChevronDown, ChevronUp, Eye, CheckCircle2 } from 'lucide-react'
import { NotificationsPageSkeleton } from '@/components/Skeleton'
import { getStore, MemberWithProfile } from '@/lib/dataStore'
import type { Team } from '@/types/database'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { BottomNav } from '@/components/BottomNav'

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
      fetch(`/api/team-members-profiles?teamId=${teamData.id}`, { headers: await authHeader(supabase) })
    ])

    // Check permissions
    const isCoachRole = memberResult.data?.role === 'coach'
    if (!isOwner && !isCoachRole) {
      toast.error(t.noPermission)
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
      toast.error(t.enterTitleBody)
      return
    }

    // 선택된 멤버가 없고 본인에게도 보내지 않는 경우
    if (selectedUserIds.length === 0 && !includeSelf) {
      toast.error(t.selectRecipients)
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

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: '#fff', borderRadius: 10 }

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-black text-[color:var(--text)]">{t.notifications}</h1>
            {team && <p className="text-xs" style={{ color: 'var(--muted2)' }}>{team.name}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Send Notification Form */}
        <section className="p-5 space-y-4" style={cardStyle}>
          <h2 className="font-bold text-[color:var(--text)] flex items-center gap-2">
            <Send className="w-4 h-4" style={{ color: 'var(--text)' }} />
            {t.sendNotification}
          </h2>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.notificationTitle}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.notificationTitlePlaceholder}
              className="w-full px-4 py-2.5 outline-none text-sm"
              style={inputStyle}
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.notificationBody}</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t.notificationBodyPlaceholder}
              className="w-full px-4 py-2.5 outline-none resize-none text-sm"
              style={inputStyle}
              rows={4}
              maxLength={500}
            />
          </div>

          {/* 발송 대상 선택 */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted2)' }}>{t.recipients}</label>

            {/* 검색창 */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--text)]/30" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t.searchByName}
                className="w-full pl-10 pr-4 py-2 outline-none text-sm"
                style={inputStyle}
              />
            </div>

            {/* 전체 선택 & 나에게도 보내기 */}
            <div className="flex items-center justify-between mb-2 pb-2" style={{ borderBottom: '1px solid var(--line)' }}>
              <button type="button" onClick={toggleSelectAll} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text)' }}>
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{
                  background: selectedUserIds.length === members.length && members.length > 0 ? 'var(--navy)' : 'transparent',
                  border: `2px solid ${selectedUserIds.length === members.length && members.length > 0 ? 'var(--navy)' : '#3a3a3a'}`,
                }}>
                  {selectedUserIds.length === members.length && members.length > 0 && (
                    <Check className="w-3 h-3" style={{ color: 'var(--text)' }} />
                  )}
                </div>
                {t.selectAll} ({selectedUserIds.length}/{members.length})
              </button>

              <label className="flex items-center gap-2 cursor-pointer">
                <div className="w-5 h-5 rounded flex items-center justify-center" style={{
                  background: includeSelf ? '#2dd4bf' : 'transparent',
                  border: `2px solid ${includeSelf ? '#2dd4bf' : '#3a3a3a'}`,
                }}>
                  {includeSelf && <Check className="w-3 h-3 text-black" />}
                </div>
                <span className="text-sm text-[color:var(--text)]/60">{t.sendToMeToo}</span>
                <input type="checkbox" checked={includeSelf} onChange={(e) => setIncludeSelf(e.target.checked)} className="sr-only" />
              </label>
            </div>

            {/* 멤버 목록 */}
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg p-2" style={{ background: 'var(--card2)' }}>
              {filteredMembers.length === 0 ? (
                <p className="text-center text-sm py-4" style={{ color: 'var(--muted2)' }}>
                  {searchQuery ? t.noPlayers : t.noMembers}
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
                      className="w-full flex items-center gap-3 p-2 rounded-lg transition-colors"
                      style={{ background: isSelected ? 'var(--chip)' : 'transparent' }}
                    >
                      <div className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0" style={{
                        background: isSelected ? 'var(--navy)' : 'transparent',
                        border: `2px solid ${isSelected ? 'var(--navy)' : '#3a3a3a'}`,
                      }}>
                        {isSelected && <Check className="w-3 h-3" style={{ color: 'var(--text)' }} />}
                      </div>
                      <div className="flex-1 text-left">
                        <span className="text-sm font-medium text-[color:var(--text)]">
                          {member.profile?.display_name || t.noName}
                        </span>
                        {isSelf && (
                          <span className="ml-2 text-xs" style={{ color: 'var(--text)' }}>({t.meLabel})</span>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: member.role === 'coach' ? 'var(--chip)' : member.role === 'parent' ? '#002a1a' : 'var(--line)',
                        color: member.role === 'coach' ? 'var(--navy)' : member.role === 'parent' ? '#2dd4bf' : 'var(--muted2)',
                      }}>
                        {member.role === 'coach' ? t.coach : member.role === 'parent' ? t.parentLabel : t.member}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            <p className="text-xs mt-2" style={{ color: 'var(--muted2)' }}>
              {selectedUserIds.length > 0 || includeSelf ? (
                <>
                  <UserCheck className="w-3 h-3 inline mr-1" />
                  {t.nSelected.replace('{n}', String(selectedUserIds.length))}
                  {includeSelf && selectedUserIds.length > 0 ? ` + ${t.meLabel}` : includeSelf ? t.sendToMeOnly : ''}
                </>
              ) : (
                t.selectRecipients
              )}
            </p>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full py-3 rounded-xl font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'var(--navy)', color: 'var(--accent)' }}
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
        </section>

        {/* Notification History */}
        <section className="p-5" style={cardStyle}>
          <h2 className="font-bold text-[color:var(--text)] mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--text)' }} />
            {t.notificationHistory}
          </h2>

          {notifications.length === 0 ? (
            <div className="text-center py-12" style={{ color: 'var(--muted2)' }}>
              <Bell className="w-12 h-12 mx-auto mb-3 text-[color:var(--text)]/10" />
              <p className="font-medium">{t.noNotifications}</p>
              <p className="text-sm mt-1">{t.noNotificationsDescription}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const isExpanded = expandedNotificationId === notification.id
                const stats = notificationStats[notification.id]
                const isLoadingStats = loadingStatsId === notification.id

                return (
                  <div key={notification.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
                    <button
                      onClick={() => toggleNotificationExpand(notification.id)}
                      className="w-full p-4 text-left"
                      style={{ background: 'var(--card2)' }}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--line)', color: 'var(--muted2)' }}>
                              {getNotificationTypeLabel(notification.notification_type)}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--muted2)' }}>
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                          <h3 className="font-medium text-[color:var(--text)] truncate">{notification.title}</h3>
                          <p className="text-sm mt-1 line-clamp-2" style={{ color: 'var(--muted2)' }}>{notification.body}</p>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex flex-col items-end gap-1 text-sm">
                            <div className="flex items-center gap-1 text-[color:var(--text)]/40">
                              <Users className="w-4 h-4" />
                              <span>{notification.recipients_count}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-0.5 text-teal-400">
                                <CheckCircle className="w-3 h-3" />
                                {notification.success_count}
                              </span>
                              {notification.failure_count > 0 && (
                                <span className="flex items-center gap-0.5 text-red-400">
                                  <XCircle className="w-3 h-3" />
                                  {notification.failure_count}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-[color:var(--text)]/30">
                            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                          </div>
                        </div>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="p-4" style={{ borderTop: '1px solid var(--line)', background: 'var(--card2)' }}>
                        {isLoadingStats ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text)' }} />
                          </div>
                        ) : stats ? (
                          <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: 'var(--chip)', color: 'var(--text)' }}>
                                <Eye className="w-4 h-4" />
                                <span>{t.readCount} {stats.read_count}/{stats.total_sent}</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: '#002a1a', color: '#2dd4bf' }}>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{t.confirmedCount} {stats.confirmed_count}/{stats.total_sent}</span>
                              </div>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-[color:var(--text)]/60 mb-2">{t.recipientStatus}</h4>
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {stats.recipients.map((recipient) => (
                                  <div key={recipient.user_id} className="flex items-center justify-between rounded-lg p-2 text-sm" style={{ background: 'var(--card2)' }}>
                                    <span className="font-medium text-[color:var(--text)]">{recipient.display_name || t.noName}</span>
                                    <div className="flex items-center gap-2">
                                      {recipient.confirmed_at ? (
                                        <span className="flex items-center gap-1 text-teal-400">
                                          <CheckCircle2 className="w-4 h-4" />
                                          <span className="text-xs">{formatShortDate(recipient.confirmed_at)}</span>
                                        </span>
                                      ) : recipient.read_at ? (
                                        <span className="flex items-center gap-1" style={{ color: 'var(--text)' }}>
                                          <Eye className="w-4 h-4" />
                                          <span className="text-xs">{formatShortDate(recipient.read_at)}</span>
                                        </span>
                                      ) : (
                                        <span className="text-xs text-[color:var(--text)]/30">{t.unconfirmed}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-center py-4" style={{ color: 'var(--muted2)' }}>{t.statsLoadFailed}</p>
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
      <BottomNav />
    </div>
  )
}

export default function NotificationsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--text)' }} />
      </div>
    }>
      <NotificationsContent />
    </Suspense>
  )
}
