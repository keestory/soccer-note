'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Users, Copy, Check, Shield, UserCog, Trash2, Crown, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import type { Team, TeamMember, Profile, MemberStatus } from '@/types/database'
import toast from 'react-hot-toast'

interface MemberWithProfile extends TeamMember {
  profile: Profile | null
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
  const [copied, setCopied] = useState(false)
  const [editingMember, setEditingMember] = useState<string | null>(null)

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

    // Check if user is team owner
    const isOwner = teamData.user_id === user.id

    // If owner, set as coach immediately
    if (isOwner) {
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
        profile: profileMap.get(m.user_id) || null
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
    toast.success(`${member.profile?.display_name || member.profile?.email}님의 가입을 승인했습니다`)
  }

  const rejectMember = async (member: MemberWithProfile) => {
    if (!confirm(`${member.profile?.display_name || member.profile?.email}님의 가입 요청을 거절하시겠습니까?`)) return

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
    if (!confirm(`${member.profile?.display_name || member.profile?.email}님을 팀에서 제외하시겠습니까?`)) return

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
                          {member.profile?.display_name || member.profile?.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.profile?.email}
                        </p>
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
                          {member.profile?.display_name || member.profile?.email}
                        </p>
                        <p className="text-sm text-gray-500">
                          {member.role === 'coach' ? '감독' : '팀원'}
                          {member.profile?.email && ` · ${member.profile.email}`}
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
      </main>
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
