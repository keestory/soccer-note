'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Users, Copy, Check, Shield, UserCog, Trash2, Crown, Loader2, Clock, CheckCircle, XCircle, LogOut, AlertTriangle } from 'lucide-react'
import type { Team, TeamMember, Profile, MemberStatus } from '@/types/database'
import toast from 'react-hot-toast'

interface MemberWithProfile extends TeamMember {
  profile: Profile | undefined
}

function TeamMembersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamIdParam = searchParams.get('team')

  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [pendingMembers, setPendingMembers] = useState<MemberWithProfile[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [copied, setCopied] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)
  const [showDisbandModal, setShowDisbandModal] = useState(false)
  const [disbandStep, setDisbandStep] = useState<'initial' | 'select-coach' | 'confirm-delete'>('initial')
  const [selectedNewCoach, setSelectedNewCoach] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [teamIdParam])

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    // Get team
    let teamId = teamIdParam

    if (!teamId) {
      // First check localStorage
      const savedTeamId = localStorage.getItem('selectedTeamId')
      if (savedTeamId) {
        // Verify user owns or is member of this team
        const { data: ownedTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('id', savedTeamId)
          .eq('user_id', user.id)
          .single()

        if (ownedTeam) {
          teamId = savedTeamId
        }
      }
    }

    if (!teamId) {
      // Find any team user OWNS
      const { data: ownedTeams } = await supabase
        .from('teams')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)

      if (ownedTeams && ownedTeams.length > 0) {
        teamId = ownedTeams[0].id
      }
    }

    if (!teamId) {
      // Last resort: check team_members
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .limit(1)
        .single()

      if (membership) {
        teamId = membership.team_id
      }
    }

    if (!teamId) {
      router.push('/dashboard')
      return
    }

    // Get team details
    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (!teamData) {
      toast.error('팀을 찾을 수 없습니다')
      router.push('/dashboard')
      return
    }

    setTeam(teamData)
    setCurrentUserId(user.id)

    // Check if user is team owner
    const ownerCheck = teamData.user_id === user.id
    setIsOwner(ownerCheck)

    // If owner, set as coach immediately
    if (ownerCheck) {
      setCurrentUserRole('coach')
    } else {
      // Try to get user's membership role
      const { data: userMembership } = await supabase
        .from('team_members')
        .select('role, status')
        .eq('team_id', teamId)
        .eq('user_id', user.id)
        .single()

      setCurrentUserRole(userMembership?.role || null)
    }

    // Get all members (without profile join - we'll fetch profiles separately)
    const { data: membersData, error: membersError } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .or('is_removed.is.null,is_removed.eq.false')
      .order('joined_at')

    console.log('Members query error:', membersError)
    console.log('Members data:', membersData)

    if (membersData && membersData.length > 0) {
      // Get unique user IDs
      const userIds = membersData.map(m => m.user_id)

      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds)

      console.log('Profiles data:', profilesData)

      // Map profiles to members
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || [])

      const allMembers: MemberWithProfile[] = membersData.map(m => ({
        ...m,
        profile: profileMap.get(m.user_id)
      }))

      const pending = allMembers.filter(m => m.status === 'pending')
      const approved = allMembers.filter(m => m.status === 'approved' || !m.status)

      console.log('All members:', allMembers.map(m => ({ id: m.id, status: m.status, email: m.profile?.email })))
      console.log('Pending members:', pending.length)
      console.log('Approved members:', approved.length)

      setPendingMembers(pending)
      setMembers(approved)
    }

    setLoading(false)
  }

  const copyInviteLink = () => {
    if (!team?.invite_code) return

    const link = `${window.location.origin}/team/join?code=${team.invite_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success('초대 링크가 복사되었습니다')
    setTimeout(() => setCopied(false), 2000)
  }

  const approveMember = async (member: MemberWithProfile) => {
    const { error } = await supabase
      .from('team_members')
      .update({ status: 'approved' })
      .eq('id', member.id)

    if (error) {
      toast.error('승인에 실패했습니다')
      return
    }

    // Move from pending to approved
    setPendingMembers(prev => prev.filter(m => m.id !== member.id))
    setMembers(prev => [...prev, { ...member, status: 'approved' }])
    toast.success(`${member.profile?.display_name || member.profile?.email || '새 멤버'}님의 가입을 승인했습니다`)
  }

  const rejectMember = async (member: MemberWithProfile) => {
    if (!confirm(`${member.profile?.display_name || member.profile?.email || '이 사용자'}님의 가입 요청을 거절하시겠습니까?`)) return

    const { error } = await supabase
      .from('team_members')
      .update({ status: 'rejected' })
      .eq('id', member.id)

    if (error) {
      toast.error('거절에 실패했습니다')
      return
    }

    setPendingMembers(prev => prev.filter(m => m.id !== member.id))
    toast.success('가입 요청을 거절했습니다')
  }

  const updateMemberPermissions = async (memberId: string, updates: Partial<TeamMember>) => {
    const { error } = await supabase
      .from('team_members')
      .update(updates)
      .eq('id', memberId)

    if (error) {
      toast.error('권한 변경에 실패했습니다')
      return
    }

    setMembers(prev =>
      prev.map(m => (m.id === memberId ? { ...m, ...updates } : m))
    )
    toast.success('권한이 변경되었습니다')
    setEditingMember(null)
  }

  const removeMember = async (member: MemberWithProfile) => {
    if (!confirm(`${member.profile?.display_name || member.profile?.email || '이 멤버'}님을 팀에서 제외하시겠습니까?`)) return

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', member.id)

    if (error) {
      toast.error('멤버 제거에 실패했습니다')
      return
    }

    setMembers(prev => prev.filter(m => m.id !== member.id))
    toast.success('멤버가 제거되었습니다')
  }

  const leaveTeam = async () => {
    if (!team || !currentUserId) return

    if (isOwner) {
      toast.error('감독은 탈퇴할 수 없습니다. 팀 해체를 이용해주세요.')
      return
    }

    if (!confirm(`정말 "${team.name}" 팀에서 탈퇴하시겠습니까?`)) return

    // Soft delete - mark as removed instead of actual delete
    const { error } = await supabase
      .from('team_members')
      .update({ is_removed: true })
      .eq('team_id', team.id)
      .eq('user_id', currentUserId)

    if (error) {
      toast.error('팀 탈퇴에 실패했습니다')
      return
    }

    // Clear localStorage
    localStorage.removeItem('selectedTeamId')
    toast.success('팀에서 탈퇴했습니다')
    router.push('/dashboard')
  }

  const openDisbandModal = () => {
    setShowDisbandModal(true)
    setDisbandStep('initial')
    setSelectedNewCoach(null)
  }

  const closeDisbandModal = () => {
    setShowDisbandModal(false)
    setDisbandStep('initial')
    setSelectedNewCoach(null)
  }

  const transferOwnership = async () => {
    if (!team || !selectedNewCoach) return

    // 1. Update team owner
    const { error: teamError } = await supabase
      .from('teams')
      .update({ user_id: selectedNewCoach })
      .eq('id', team.id)

    if (teamError) {
      toast.error('감독 위임에 실패했습니다')
      return
    }

    // 2. Update new coach's role to coach
    await supabase
      .from('team_members')
      .update({ role: 'coach' })
      .eq('team_id', team.id)
      .eq('user_id', selectedNewCoach)

    // 3. Soft delete current user's membership (leaving team)
    if (currentUserId) {
      await supabase
        .from('team_members')
        .update({ is_removed: true })
        .eq('team_id', team.id)
        .eq('user_id', currentUserId)
    }

    // Clear localStorage
    localStorage.removeItem('selectedTeamId')
    toast.success('새 감독에게 팀을 인계했습니다')
    router.push('/dashboard')
  }

  const disbandTeam = async () => {
    if (!team || !isOwner) return

    // Soft delete - mark team and all related data as removed
    // 1. Mark all team_members as removed
    await supabase
      .from('team_members')
      .update({ is_removed: true })
      .eq('team_id', team.id)

    // 2. Mark team as removed
    const { error } = await supabase
      .from('teams')
      .update({ is_removed: true })
      .eq('id', team.id)

    if (error) {
      toast.error('팀 해체에 실패했습니다')
      return
    }

    // Clear localStorage
    localStorage.removeItem('selectedTeamId')
    toast.success('팀이 해체되었습니다')
    router.push('/dashboard')
  }

  const isCoach = currentUserRole === 'coach'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">팀 멤버 관리</h1>
              <p className="text-sm text-gray-500">{team?.name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Invite Section */}
        {isCoach && team?.invite_code && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-semibold flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-emerald-600" />
              팀 초대
            </h2>
            <div className="flex gap-2">
              <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-center text-lg tracking-widest">
                {team.invite_code}
              </div>
              <button
                onClick={copyInviteLink}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                {copied ? '복사됨' : '링크 복사'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              이 코드를 공유하여 다른 사람을 팀에 초대하세요
            </p>
          </section>
        )}

        {/* Pending Requests Section */}
        {isCoach && pendingMembers.length > 0 && (
          <section>
            <h2 className="font-semibold mb-3 flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              가입 요청 ({pendingMembers.length}명)
            </h2>
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl divide-y divide-amber-200">
              {pendingMembers.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.profile?.display_name || member.profile?.email || '이름 없음'}
                        </p>
                        {isCoach && (
                          <p className="text-sm text-gray-500">
                            {member.profile?.email || member.user_id.slice(0, 8) + '...'}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => approveMember(member)}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-1 text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        승인
                      </button>
                      <button
                        onClick={() => rejectMember(member)}
                        className="px-3 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 flex items-center gap-1 text-sm font-medium"
                      >
                        <XCircle className="w-4 h-4" />
                        거절
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Members List */}
        <section>
          <h2 className="font-semibold mb-3">멤버 목록 ({members.length}명)</h2>
          <div className="bg-white rounded-xl divide-y shadow-sm">
            {members.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                아직 승인된 멤버가 없습니다
              </div>
            ) : (
              members.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        member.role === 'coach' ? 'bg-amber-100' : 'bg-gray-100'
                      }`}>
                        {member.role === 'coach' ? (
                          <Crown className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Users className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">
                          {member.profile?.display_name || member.profile?.email || '이름 없음'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.role === 'coach' ? '감독' : '팀원'}
                          {isCoach && member.profile?.email ? ` · ${member.profile.email}` : ''}
                        </p>
                      </div>
                    </div>

                    {isCoach && member.role !== 'coach' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMember(editingMember === member.id ? null : member.id)}
                          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <UserCog className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => removeMember(member)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Permission Editor */}
                  {editingMember === member.id && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <p className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Shield className="w-4 h-4" />
                        권한 설정
                      </p>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={member.can_edit_players}
                            onChange={(e) =>
                              updateMemberPermissions(member.id, { can_edit_players: e.target.checked })
                            }
                            className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm">선수 관리 (추가/수정/삭제)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={member.can_edit_matches}
                            onChange={(e) =>
                              updateMemberPermissions(member.id, { can_edit_matches: e.target.checked })
                            }
                            className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm">경기 관리 (추가/수정/삭제)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={member.can_edit_quarters}
                            onChange={(e) =>
                              updateMemberPermissions(member.id, { can_edit_quarters: e.target.checked })
                            }
                            className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-sm">쿼터 기록 편집</span>
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Team Management Section */}
        <section className="mt-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2 text-gray-600">
            <AlertTriangle className="w-5 h-5" />
            팀 관리
          </h2>
          <div className="bg-white rounded-xl shadow-sm divide-y">
            {/* Leave Team - for non-owners */}
            {!isOwner && (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">팀 탈퇴</p>
                    <p className="text-sm text-gray-500">이 팀에서 나갑니다</p>
                  </div>
                  <button
                    onClick={leaveTeam}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm font-medium"
                  >
                    <LogOut className="w-4 h-4" />
                    팀 탈퇴
                  </button>
                </div>
              </div>
            )}

            {/* Disband Team - only for owner */}
            {isOwner && (
              <div className="p-4 bg-red-50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-700">팀 해체</p>
                    <p className="text-sm text-red-600">
                      다른 멤버에게 감독을 위임하거나 팀을 해체합니다
                    </p>
                  </div>
                  <button
                    onClick={openDisbandModal}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2 text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    팀 해체
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Disband Modal */}
      {showDisbandModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            {disbandStep === 'initial' && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4">팀 해체</h3>
                <p className="text-gray-600 mb-6">
                  팀원 중 새로운 감독을 선택하시겠습니까?
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => setDisbandStep('select-coach')}
                    disabled={members.filter(m => m.user_id !== currentUserId).length === 0}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    예, 새 감독 선택하기
                  </button>
                  <button
                    onClick={() => setDisbandStep('confirm-delete')}
                    className="w-full py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200"
                  >
                    아니오, 팀 해체하기
                  </button>
                  <button
                    onClick={closeDisbandModal}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    취소
                  </button>
                </div>
                {members.filter(m => m.user_id !== currentUserId).length === 0 && (
                  <p className="text-sm text-amber-600 mt-3">
                    ⚠️ 팀에 다른 멤버가 없어 감독 위임이 불가능합니다
                  </p>
                )}
              </>
            )}

            {disbandStep === 'select-coach' && (
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-4">새 감독 선택</h3>
                <p className="text-gray-600 mb-4">
                  감독 권한을 넘겨받을 팀원을 선택해주세요
                </p>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {members
                    .filter(m => m.user_id !== currentUserId)
                    .map((member) => (
                      <button
                        key={member.id}
                        onClick={() => setSelectedNewCoach(member.user_id)}
                        className={`w-full p-3 rounded-lg text-left flex items-center gap-3 transition ${
                          selectedNewCoach === member.user_id
                            ? 'bg-emerald-100 border-2 border-emerald-500'
                            : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {member.profile?.display_name || member.profile?.email || '이름 없음'}
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
                <div className="space-y-3">
                  <button
                    onClick={transferOwnership}
                    disabled={!selectedNewCoach}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    감독 위임하기
                  </button>
                  <button
                    onClick={() => setDisbandStep('initial')}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    뒤로
                  </button>
                </div>
              </>
            )}

            {disbandStep === 'confirm-delete' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">팀 해체 확인</h3>
                  <p className="text-gray-600">
                    정말로 &ldquo;{team?.name}&rdquo; 팀을 해체하시겠습니까?
                  </p>
                  <p className="text-red-600 text-sm mt-2">
                    ⚠️ 모든 경기 기록과 데이터가 삭제됩니다
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={disbandTeam}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                  >
                    네, 팀 해체하기
                  </button>
                  <button
                    onClick={() => setDisbandStep('initial')}
                    className="w-full py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200"
                  >
                    아니오, 돌아가기
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function TeamMembersPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    }>
      <TeamMembersContent />
    </Suspense>
  )
}
