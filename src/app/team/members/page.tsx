'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser, authHeader } from '@/lib/supabase'
import { resolveTeam, clearResolvedTeam } from '@/lib/team-resolver'
import { getStore } from '@/lib/dataStore'
import { Copy, Check, UserCog, Trash2, Crown, Loader2, Clock, CheckCircle, XCircle, LogOut, AlertTriangle, Globe, Settings, Users } from 'lucide-react'
import type { Team, TeamMember, Profile } from '@/types/database'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { MembersPageSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'

interface MemberWithProfile extends TeamMember {
  profile: Profile | undefined
}

function TeamMembersContent() {
  const { t } = useI18n()
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
  const [rejectTarget, setRejectTarget] = useState<MemberWithProfile | null>(null)
  const [removeTarget, setRemoveTarget] = useState<MemberWithProfile | null>(null)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [showDisbandModal, setShowDisbandModal] = useState(false)
  const [disbandStep, setDisbandStep] = useState<'initial' | 'select-coach' | 'confirm-delete'>('initial')
  const [selectedNewCoach, setSelectedNewCoach] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => { loadData() }, [teamIdParam])

  const loadData = async () => {
    // Fast path: use cached store data when no explicit teamIdParam
    if (!teamIdParam) {
      const store = getStore()
      if (store.isLoaded && store.userId && store.selectedTeamId) {
        const cachedTeam = store.teams.find(t => t.id === store.selectedTeamId)
        if (cachedTeam) {
          setCurrentUserId(store.userId)
          setTeam(cachedTeam as unknown as Team)
          const ownerCheck = cachedTeam.user_id === store.userId
          setIsOwner(ownerCheck)
          setCurrentUserRole(ownerCheck ? 'coach' : cachedTeam.role)
          const allMembers = store.members as MemberWithProfile[]
          setPendingMembers(allMembers.filter(m => m.status === 'pending'))
          setMembers(allMembers.filter(m => m.status === 'approved' || !m.status))
          setLoading(false)
          return
        }
      }
    }

    // Fallback: fetch from DB (used when teamIdParam is set or store not ready)
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const resolved = await resolveTeam(supabase, user.id, teamIdParam)
    if (!resolved) { router.push('/dashboard'); return }
    const teamId = resolved.teamId
    setCurrentUserId(user.id)

    const [{ data: teamData }, { data: membersData }, profilesJson] = await Promise.all([
      supabase.from('teams').select('*').eq('id', teamId).single(),
      supabase.from('team_members').select('*').eq('team_id', teamId).or('is_removed.is.null,is_removed.eq.false').order('joined_at'),
      fetch(`/api/team-members-profiles?teamId=${teamId}`, { headers: await authHeader(supabase) }).then(r => r.ok ? r.json() : null).catch(() => null),
    ])

    if (!teamData) { toast.error('팀을 찾을 수 없습니다'); router.push('/dashboard'); return }
    setTeam(teamData)

    const ownerCheck = teamData.user_id === user.id
    setIsOwner(ownerCheck)
    setCurrentUserRole(ownerCheck ? 'coach' : resolved.role)

    if (membersData?.length) {
      const profilesData: Profile[] | null = profilesJson?.profiles ?? null
      const profileMap = new Map(profilesData?.map((p: Profile) => [p.id, p]) || [])
      const allMembers: MemberWithProfile[] = membersData.map(m => ({ ...m, profile: profileMap.get(m.user_id) }))
      setPendingMembers(allMembers.filter(m => m.status === 'pending'))
      setMembers(allMembers.filter(m => m.status === 'approved' || !m.status))
    }
    setLoading(false)
  }

  const copyInviteLink = async () => {
    if (!team?.invite_code) return
    const link = `${window.location.origin}/team/join?code=${team.invite_code}`
    // Native share sheet (KakaoTalk, Messages, etc.) when available
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${team.name} — ${t.teamInvite}`,
          text: t.inviteJoinMessage.replace('{team}', team.name).replace('{code}', team.invite_code ?? ''),
          url: link,
        })
        return
      } catch { /* user cancelled — fall through to copy */ }
    }
    navigator.clipboard.writeText(link)
    setCopied(true)
    toast.success(t.inviteLinkCopied)
    setTimeout(() => setCopied(false), 2000)
  }

  const approveMember = async (member: MemberWithProfile) => {
    const { error } = await supabase.from('team_members').update({ status: 'approved' }).eq('id', member.id)
    if (error) { toast.error(t.approveFailed); return }
    setPendingMembers(prev => prev.filter(m => m.id !== member.id))
    setMembers(prev => [...prev, { ...member, status: 'approved' }])
    toast.success(`${member.profile?.display_name || '새 멤버'}님 승인 완료`)
  }

  const rejectMember = async (member: MemberWithProfile) => {
    const { error } = await supabase.from('team_members').update({ status: 'rejected' }).eq('id', member.id)
    if (error) { toast.error(t.rejectFailed); return }
    setPendingMembers(prev => prev.filter(m => m.id !== member.id))
    toast.success(t.memberRejected)
  }

  const updateMemberPermissions = async (memberId: string, updates: Partial<TeamMember>) => {
    const { error } = await supabase.from('team_members').update(updates).eq('id', memberId)
    if (error) { toast.error(t.permissionChangeFailed); return }
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, ...updates } : m))
    toast.success(t.permissionChanged)
    setEditingMember(null)
  }

  const removeMember = async (member: MemberWithProfile) => {
    const { error } = await supabase.from('team_members').delete().eq('id', member.id)
    if (error) { toast.error(t.memberRemoveFailed); return }
    setMembers(prev => prev.filter(m => m.id !== member.id))
    toast.success(t.memberRemoved)
  }

  const leaveTeam = async () => {
    if (!team || !currentUserId) return
    if (isOwner) { toast.error(t.cannotLeaveAsCoach); return }
    const { error } = await supabase.from('team_members').update({ is_removed: true }).eq('team_id', team.id).eq('user_id', currentUserId)
    if (error) { toast.error(t.leaveTeamFailed); return }
    localStorage.removeItem('selectedTeamId')
    if (currentUserId) clearResolvedTeam(currentUserId)
    toast.success(t.leftTeam)
    router.push('/dashboard')
  }

  const closeDisbandModal = () => { setShowDisbandModal(false); setDisbandStep('initial'); setSelectedNewCoach(null) }

  const transferOwnership = async () => {
    if (!team || !selectedNewCoach) return
    const { error } = await supabase.from('teams').update({ user_id: selectedNewCoach }).eq('id', team.id)
    if (error) { toast.error(t.saveFailed); return }
    await supabase.from('team_members').update({ role: 'coach' }).eq('team_id', team.id).eq('user_id', selectedNewCoach)
    if (currentUserId) await supabase.from('team_members').update({ is_removed: true }).eq('team_id', team.id).eq('user_id', currentUserId)
    localStorage.removeItem('selectedTeamId')
    if (currentUserId) clearResolvedTeam(currentUserId)
    toast.success(t.coachTransferred)
    router.push('/dashboard')
  }

  const disbandTeam = async () => {
    if (!team || !isOwner) return
    await supabase.from('team_members').update({ is_removed: true }).eq('team_id', team.id)
    const { error } = await supabase.from('teams').update({ is_removed: true }).eq('id', team.id)
    if (error) { toast.error(t.disbandFailed); return }
    localStorage.removeItem('selectedTeamId')
    if (currentUserId) clearResolvedTeam(currentUserId)
    toast.success(t.disbanded)
    router.push('/dashboard')
  }

  const isCoach = currentUserRole === 'coach'

  if (loading) return <MembersPageSkeleton />

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div>
            <h1 className="font-black text-[20px] text-white">{t.teamManagement}</h1>
            {team?.name && <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{team.name}</p>}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-5 space-y-4">

        {/* Community profile link */}
        {isCoach && (
          <Link href="/team/public-profile"
            className="flex items-center justify-between p-4 rounded-[14px] active:opacity-80 transition"
            style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{ background: 'var(--chip)' }}>
                <Globe className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <p className="font-bold text-white text-[14px]">{t.publicProfileTitle}</p>
                <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{t.publicProfileDesc}</p>
              </div>
            </div>
            <span style={{ color: '#555' }}>›</span>
          </Link>
        )}

        {/* Invite code */}
        {isCoach && team?.invite_code && (
          <div className="rounded-[16px] p-5" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <p className="text-[12px] font-medium mb-2" style={{ color: 'var(--muted1)' }}>{t.inviteCode}</p>
            <div className="flex items-center gap-3">
              <span className="font-display text-[30px] flex-1" style={{ color: 'var(--accent)', letterSpacing: '0.22em' }}>
                {team.invite_code}
              </span>
              <button onClick={copyInviteLink}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-[11px] font-black text-sm transition active:scale-95"
                style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? t.copied : t.share}
              </button>
            </div>
          </div>
        )}

        {/* Pending requests */}
        {isCoach && pendingMembers.length > 0 && (
          <section>
            <h2 className="font-black text-[14px] mb-3 flex items-center gap-2" style={{ color: '#f59e0b' }}>
              <Clock className="w-4 h-4" /> {t.joinRequests} ({pendingMembers.length})
            </h2>
            <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid rgba(245,158,11,.25)', background: 'rgba(245,158,11,.06)' }}>
              {pendingMembers.map((member, i) => (
                <div key={member.id} className="p-4 flex items-center justify-between gap-3" style={{ borderTop: i > 0 ? '1px solid rgba(245,158,11,.15)' : 'none' }}>
                  <div className="min-w-0">
                    <p className="font-bold text-white truncate">{member.profile?.display_name || member.profile?.email || t.noName}</p>
                    {isCoach && <p className="text-[12px] truncate" style={{ color: 'var(--muted2)' }}>{member.profile?.email}</p>}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveMember(member)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-[9px] text-sm font-bold active:scale-95"
                      style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                      <CheckCircle className="w-4 h-4" /> {t.approve}
                    </button>
                    <button onClick={() => setRejectTarget(member)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-[9px] text-sm font-bold"
                      style={{ background: 'rgba(192,90,77,.14)', color: '#e07a6d' }}>
                      <XCircle className="w-4 h-4" /> {t.reject}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Members list */}
        <section>
          <h2 className="font-black text-[14px] mb-3" style={{ color: 'var(--muted1)' }}>{t.memberCountN.replace('{n}', String(members.length))}</h2>
          <div className="rounded-[14px] overflow-hidden" style={{ border: '1px solid var(--line)', background: 'var(--card)' }}>
            {members.length === 0 ? (
              <div className="p-8 text-center text-[14px]" style={{ color: '#555' }}>{t.noApprovedMembers}</div>
            ) : (
              members.map((member, i) => (
                <div key={member.id} style={{ borderTop: i > 0 ? '1px solid var(--line)' : 'none' }}>
                  <div className="p-4 flex items-center gap-3">
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-display text-[16px] flex-shrink-0"
                      style={{ background: member.role === 'coach' ? 'var(--accent)' : '#1e1e1e', color: member.role === 'coach' ? '#0a0a0a' : '#888' }}>
                      {member.role === 'coach' ? '♛' : (member.profile?.display_name || '?').charAt(0).toUpperCase()}
                    </div>
                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white text-[14px] truncate">{member.profile?.display_name || member.profile?.email || t.noName}</p>
                      <p className="text-[12px] truncate" style={{ color: member.role === 'coach' ? 'var(--accent)' : 'var(--muted2)' }}>
                        {member.role === 'coach' ? t.coach : t.member}
                        {isCoach && member.profile?.email ? ` · ${member.profile.email}` : ''}
                      </p>
                    </div>
                    {/* Coach actions — available for every member except the team owner */}
                    {isCoach && member.user_id !== team?.user_id && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button onClick={() => setEditingMember(editingMember === member.id ? null : member.id)}
                          className="p-2 rounded-lg" style={{ color: '#555' }}>
                          <Settings className="w-4 h-4" />
                        </button>
                        <button onClick={() => setRemoveTarget(member)}
                          className="p-2 rounded-lg" style={{ color: '#555' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {/* Permission editor */}
                  {editingMember === member.id && (
                    <div className="px-4 pb-4 pt-2 space-y-2" style={{ borderTop: '1px solid var(--line)' }}>
                      {/* Role */}
                      <p className="text-[12px] font-bold mb-2" style={{ color: 'var(--muted1)' }}>{t.memberRoleLabel}</p>
                      <div className="flex gap-2 mb-3">
                        {(['member', 'coach'] as const).map(r => (
                          <button
                            key={r}
                            onClick={() => updateMemberPermissions(member.id, { role: r })}
                            className="flex-1 py-2 rounded-lg text-[13px] font-bold transition"
                            style={member.role === r
                              ? { background: 'var(--accent)', color: '#0a0a0a' }
                              : { background: '#1e1e1e', color: '#888', border: '1px solid var(--line)' }}
                          >
                            {r === 'coach' ? t.coach : t.member}
                          </button>
                        ))}
                      </div>
                      <p className="text-[12px] font-bold mb-2" style={{ color: 'var(--muted1)' }}>{t.permissionSettings}</p>
                      {[
                        { label: t.playerManagement, key: 'can_edit_players', val: member.can_edit_players },
                        { label: t.canEditMatches, key: 'can_edit_matches', val: member.can_edit_matches },
                        { label: t.canEditQuarters, key: 'can_edit_quarters', val: member.can_edit_quarters },
                      ].map(({ label, key, val }) => (
                        <label key={key} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={!!val}
                            onChange={e => updateMemberPermissions(member.id, { [key]: e.target.checked })}
                            className="w-4 h-4 rounded" />
                          <span className="text-[13px] text-white">{label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Danger zone */}
        <section className="space-y-3">
          {!isOwner && (
            <div className="rounded-[14px] p-4 flex items-center justify-between"
              style={{ border: '1px solid rgba(192,90,77,.35)', background: 'rgba(192,90,77,.08)' }}>
              <div>
                <p className="font-black text-[14px]" style={{ color: '#e07a6d' }}>{t.leaveTeam}</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#a06058' }}>{t.leaveTeamDescription}</p>
              </div>
              <button onClick={() => setShowLeaveConfirm(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] font-bold text-sm"
                style={{ background: '#c05a4d', color: '#fff' }}>
                <LogOut className="w-4 h-4" /> {t.leaveTeam}
              </button>
            </div>
          )}
          {isOwner && (
            <div className="rounded-[14px] p-4 flex items-center justify-between"
              style={{ border: '1px solid rgba(192,90,77,.35)', background: 'rgba(192,90,77,.08)' }}>
              <div>
                <p className="font-black text-[14px]" style={{ color: '#e07a6d' }}>{t.disbandTeam}</p>
                <p className="text-[12px] mt-0.5" style={{ color: '#a06058' }}>{t.disbandDescription}</p>
              </div>
              <button onClick={() => { setShowDisbandModal(true); setDisbandStep('initial') }}
                className="px-3.5 py-2 rounded-[10px] font-bold text-sm"
                style={{ background: '#c05a4d', color: '#fff' }}>
                {t.disbandTeam}
              </button>
            </div>
          )}
        </section>
      </main>

      {/* Confirm sheets */}
      <ConfirmSheet open={!!rejectTarget} title={`${rejectTarget?.profile?.display_name || ''} — ${t.rejectConfirm}`} confirmLabel={t.reject} danger
        onConfirm={() => { const m = rejectTarget!; setRejectTarget(null); rejectMember(m) }} onCancel={() => setRejectTarget(null)} />
      <ConfirmSheet open={!!removeTarget} title={`${removeTarget?.profile?.display_name || ''} — ${t.memberExcludeConfirm}`} confirmLabel={t.excludeLabel} danger
        onConfirm={() => { const m = removeTarget!; setRemoveTarget(null); removeMember(m) }} onCancel={() => setRemoveTarget(null)} />
      <ConfirmSheet open={showLeaveConfirm} title={t.leaveTeamConfirm.replace('{teamName}', team?.name ?? '')} confirmLabel={t.leaveTeam} danger
        onConfirm={() => { setShowLeaveConfirm(false); leaveTeam() }} onCancel={() => setShowLeaveConfirm(false)} />

      {/* Disband Modal */}
      {showDisbandModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center px-5">
          <div className="w-full max-w-md rounded-2xl p-6" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            {disbandStep === 'initial' && (
              <>
                <h3 className="font-black text-[18px] text-white mb-4">{t.disbandTeam}</h3>
                <p className="text-[14px] mb-6" style={{ color: 'var(--muted2)' }}>{t.selectNewCoachQuestion}</p>
                <div className="space-y-3">
                  <button onClick={() => setDisbandStep('select-coach')} disabled={members.filter(m => m.user_id !== currentUserId).length === 0}
                    className="w-full py-3.5 rounded-xl font-black disabled:opacity-40" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                    {t.yesSelectNewCoach}
                  </button>
                  <button onClick={() => setDisbandStep('confirm-delete')}
                    className="w-full py-3.5 rounded-xl font-bold" style={{ background: 'rgba(192,90,77,.14)', color: '#e07a6d' }}>
                    {t.noDisbandTeam}
                  </button>
                  <button onClick={closeDisbandModal} className="w-full py-3.5 rounded-xl font-bold" style={{ background: '#1a1a1a', color: '#888' }}>{t.cancel}</button>
                </div>
              </>
            )}
            {disbandStep === 'select-coach' && (
              <>
                <h3 className="font-black text-[18px] text-white mb-4">{t.selectNewCoach}</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                  {members.filter(m => m.user_id !== currentUserId).map(member => (
                    <button key={member.id} onClick={() => setSelectedNewCoach(member.user_id)}
                      className="w-full p-3 rounded-xl text-left flex items-center gap-3"
                      style={{ background: selectedNewCoach === member.user_id ? 'var(--chip)' : '#1a1a1a', border: `1px solid ${selectedNewCoach === member.user_id ? 'var(--accent)' : 'transparent'}` }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#2a2a2a', color: '#888' }}>
                        {(member.profile?.display_name || '?').charAt(0).toUpperCase()}
                      </div>
                      <p className="font-bold text-white">{member.profile?.display_name || member.profile?.email || t.noName}</p>
                    </button>
                  ))}
                </div>
                <div className="space-y-3">
                  <button onClick={transferOwnership} disabled={!selectedNewCoach}
                    className="w-full py-3.5 rounded-xl font-black disabled:opacity-40" style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                    {t.transferCoach}
                  </button>
                  <button onClick={() => setDisbandStep('initial')} className="w-full py-3.5 rounded-xl font-bold" style={{ background: '#1a1a1a', color: '#888' }}>{t.back}</button>
                </div>
              </>
            )}
            {disbandStep === 'confirm-delete' && (
              <>
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'rgba(192,90,77,.14)' }}>
                    <AlertTriangle className="w-8 h-8" style={{ color: '#e07a6d' }} />
                  </div>
                  <h3 className="font-black text-[18px] text-white mb-2">{t.disbandConfirm}</h3>
                  <p className="text-[14px]" style={{ color: 'var(--muted2)' }}>{t.disbandConfirmMessage.replace('{teamName}', team?.name ?? '')}</p>
                  <p className="text-[13px] mt-2" style={{ color: '#e07a6d' }}>{t.disbandWarning}</p>
                </div>
                <div className="space-y-3">
                  <button onClick={disbandTeam} className="w-full py-3.5 rounded-xl font-black" style={{ background: '#c05a4d', color: '#fff' }}>{t.yesDisbandTeam}</button>
                  <button onClick={() => setDisbandStep('initial')} className="w-full py-3.5 rounded-xl font-bold" style={{ background: '#1a1a1a', color: '#888' }}>{t.backLabel}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}

export default function TeamMembersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}><Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} /></div>}>
      <TeamMembersContent />
    </Suspense>
  )
}
