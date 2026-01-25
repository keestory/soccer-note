'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Users, Copy, Check, Shield, UserCog, Trash2, Crown, Loader2 } from 'lucide-react'
import type { Team, TeamMember, Profile } from '@/types/database'
import toast from 'react-hot-toast'

interface MemberWithProfile extends TeamMember {
  profile: Profile
}

function TeamMembersContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const teamIdParam = searchParams.get('team')

  const [loading, setLoading] = useState(true)
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
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
      // Get first team where user is a member
      const { data: membership } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
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

    // Get current user's role
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    // If owner of team but not in team_members, treat as coach
    if (!userMembership && teamData.user_id === user.id) {
      setCurrentUserRole('coach')
    } else {
      setCurrentUserRole(userMembership?.role || null)
    }

    // Get all members with profiles
    const { data: membersData } = await supabase
      .from('team_members')
      .select(`
        *,
        profile:profiles(*)
      `)
      .eq('team_id', teamId)
      .order('joined_at')

    if (membersData) {
      setMembers(membersData as MemberWithProfile[])
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
    if (!confirm(`${member.profile.display_name || member.profile.email}님을 팀에서 제외하시겠습니까?`)) return

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

        {/* Members List */}
        <section>
          <h2 className="font-semibold mb-3">멤버 목록 ({members.length}명)</h2>
          <div className="bg-white rounded-xl divide-y shadow-sm">
            {members.map((member) => (
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
            ))}
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
