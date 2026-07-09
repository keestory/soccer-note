'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Edit2, X, UserCheck, UserPlus } from 'lucide-react'
import type { Player, PositionType } from '@/types/database'
import { POSITION_LABELS } from '@/types/database'
import type { MemberWithProfile } from '@/lib/dataStore'
import toast from 'react-hot-toast'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'
import { useAppData } from '@/hooks/useAppData'
import { PullToRefresh } from '@/components/PullToRefresh'

const POS_COLOR: Record<PositionType, string> = {
  GK: '#f5a623', DF: '#3b82f6', MF: '#2dd4bf', FW: '#ef4444',
}
const POS_TEXT: Record<PositionType, string> = {
  GK: '#3a2600', DF: '#fff', MF: '#06231d', FW: '#fff',
}

interface PlayerStats {
  attendance: number
  games: number
  goals: number
  assists: number
  cleanSheets: number
  avgRating: number | null
}

interface PlayerWithStats extends Player {
  stats: PlayerStats
  linkedMember?: MemberWithProfile
}

export default function PlayersPage() {
  const router = useRouter()
  const data = useAppData()
  const supabase = createClient()

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [search, setSearch] = useState('')
  const [localPlayers, setLocalPlayers] = useState<Player[] | null>(null)
  const [localMemberLinks, setLocalMemberLinks] = useState<Record<string, string>>({}) // memberId → playerId

  // Add form state
  const [addMode, setAddMode] = useState<'member' | 'manual'>('member')
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam])

  const canEdit = data.selectedTeam?.role === 'coach' ||
    data.selectedTeam?.membership?.can_edit_players || false

  // Approved members who haven't been converted to players yet
  const availableMembers = useMemo<MemberWithProfile[]>(() => {
    const linkedIds = new Set([
      ...data.members.filter(m => m.linked_player_id).map(m => m.id),
      ...Object.keys(localMemberLinks),
    ])
    return data.members.filter(m =>
      m.status === 'approved' &&
      !m.is_removed &&
      !linkedIds.has(m.id)
    )
  }, [data.members, localMemberLinks])

  // Compute player stats from cached matches
  const playersWithStats = useMemo<PlayerWithStats[]>(() => {
    const basePlayers = localPlayers ?? data.players
    return basePlayers.map(player => {
      const linkedMember = data.members.find(m =>
        m.linked_player_id === player.id ||
        localMemberLinks[m.id] === player.id
      )
      const allRecords = data.matches.flatMap((m: any) =>
        (m.quarters ?? []).flatMap((q: any) => q.quarter_records ?? [])
      ).filter((r: any) => r.player_id === player.id)

      const attendance = data.matches.filter((m: any) =>
        (m.match_attendees ?? []).some((a: any) => a.player_id === player.id)
      ).length

      const rated = allRecords.filter((r: any) => r.rating !== null)
      return {
        ...player,
        linkedMember,
        stats: {
          attendance,
          games: allRecords.length,
          goals: allRecords.reduce((s: number, r: any) => s + (r.goals || 0), 0),
          assists: allRecords.reduce((s: number, r: any) => s + (r.assists || 0), 0),
          cleanSheets: allRecords.filter((r: any) => r.clean_sheet).length,
          avgRating: rated.length > 0
            ? rated.reduce((s: number, r: any) => s + (r.rating || 0), 0) / rated.length
            : null,
        }
      }
    })
  }, [localPlayers, localMemberLinks, data.players, data.members, data.matches])

  const handleAddFromMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.selectedTeamId || !selectedMember || !name.trim()) return
    setSaving(true)
    try {
      const { data: newPlayer, error: pe } = await supabase
        .from('players')
        .insert({ team_id: data.selectedTeamId, name: name.trim(), number: number ? parseInt(number) : null, default_position: position })
        .select().single()
      if (pe) throw pe

      const { error: me } = await supabase
        .from('team_members')
        .update({ linked_player_id: newPlayer.id })
        .eq('id', selectedMember.id)
      if (me) throw me

      setLocalPlayers([...(localPlayers ?? data.players), newPlayer])
      setLocalMemberLinks(prev => ({ ...prev, [selectedMember.id]: newPlayer.id }))
      toast.success(`${name.trim()} 선수로 등록되었습니다`)
      resetForm()
    } catch {
      toast.error('선수 추가에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.selectedTeamId || !name.trim()) return
    setSaving(true)
    try {
      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({ team_id: data.selectedTeamId, name: name.trim(), number: number ? parseInt(number) : null, default_position: position })
        .select().single()
      if (error) throw error
      setLocalPlayers([...(localPlayers ?? data.players), newPlayer])
      toast.success('선수가 추가되었습니다')
      resetForm()
    } catch {
      toast.error('선수 추가에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer || !name.trim()) return
    const { error } = await supabase
      .from('players')
      .update({ name: name.trim(), number: number ? parseInt(number) : null, default_position: position })
      .eq('id', editingPlayer.id)
    if (error) { toast.error('수정에 실패했습니다'); return }
    toast.success('선수 정보가 수정되었습니다')
    setLocalPlayers((localPlayers ?? data.players).map(p =>
      p.id === editingPlayer.id ? { ...p, name: name.trim(), number: number ? parseInt(number) : null, default_position: position } : p
    ))
    resetForm()
  }

  const handleDeletePlayer = async (playerId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) { toast.error('삭제에 실패했습니다'); return }
    toast.success('선수가 삭제되었습니다')
    setLocalPlayers((localPlayers ?? data.players).filter(p => p.id !== playerId))
  }

  const startEditing = (player: Player) => {
    setEditingPlayer(player)
    setName(player.name)
    setNumber(player.number?.toString() || '')
    setPosition(player.default_position)
    setShowAddSheet(false)
  }

  const resetForm = () => {
    setName(''); setNumber(''); setPosition('MF')
    setShowAddSheet(false); setEditingPlayer(null)
    setSelectedMember(null); setAddMode('member')
  }

  const selectMember = (member: MemberWithProfile) => {
    setSelectedMember(member)
    setName(member.profile?.display_name || '')
  }

  if (data.loading) return <PlayersListSkeleton />

  const teamName = data.selectedTeam?.name || ''
  const filtered = search.trim()
    ? playersWithStats.filter(p => p.name.includes(search.trim()))
    : playersWithStats

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex justify-between items-center">
          <div>
            <h1 className="font-black text-[20px] text-white">선수</h1>
            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{teamName} · {playersWithStats.length}명</p>
          </div>
          {canEdit && (
            <button onClick={() => { resetForm(); setShowAddSheet(true) }}
              className="w-9 h-9 flex items-center justify-center rounded-[11px] font-black active:scale-95 transition"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { setLocalPlayers(null); setLocalMemberLinks({}); await data.refresh() }}>
      <div className="max-w-4xl mx-auto px-5 py-4 space-y-4">

        {/* Search */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="선수 검색…"
          className="w-full outline-none text-white placeholder-[#555] text-[14px]"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}
        />

        {/* Edit form (inline, only for editing existing players) */}
        {canEdit && editingPlayer && (
          <form onSubmit={handleUpdatePlayer}
            className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-white">선수 수정</h3>
              <button type="button" onClick={resetForm} className="p-1 rounded" style={{ color: '#555' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="이름"
                className="col-span-2 outline-none text-white placeholder-[#444] text-sm"
                style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} placeholder="#"
                className="outline-none text-white placeholder-[#444] text-sm"
                style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {(['GK','DF','MF','FW'] as PositionType[]).map(pos => (
                <button key={pos} type="button" onClick={() => setPosition(pos)}
                  className="py-2 rounded-[9px] text-sm font-bold transition"
                  style={{ background: position === pos ? POS_COLOR[pos] : '#1a1a1a', color: position === pos ? POS_TEXT[pos] : '#666' }}>
                  {pos}
                </button>
              ))}
            </div>
            <button type="submit" className="w-full py-3 rounded-xl font-black text-sm active:scale-[0.98] transition"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
              수정 완료
            </button>
          </form>
        )}

        {/* Players list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <p className="text-[14px]" style={{ color: '#555' }}>
              {search ? '검색 결과가 없습니다' : '등록된 선수가 없습니다'}
            </p>
            {!search && canEdit && (
              <p className="text-[12px] mt-1" style={{ color: '#444' }}>
                팀원이 가입하면 선수로 등록할 수 있습니다
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(player => (
              <Link key={player.id} href={`/team/players/${player.id}`}
                className="flex items-center gap-3 p-4 rounded-[14px] active:opacity-80 transition"
                style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <div className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0 font-black text-[10px]"
                  style={{ background: POS_COLOR[player.default_position], color: POS_TEXT[player.default_position] }}>
                  {player.default_position}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-bold text-[14px] text-white">
                      {player.name} <span style={{ color: '#555' }}>#{player.number || '–'}</span>
                    </p>
                    {player.linkedMember && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: 'rgba(163,230,53,0.15)', color: '#a3e635' }}>
                        앱 연결
                      </span>
                    )}
                  </div>
                  <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted2)' }}>
                    {player.default_position === 'GK'
                      ? `클린시트 ${player.stats.cleanSheets}`
                      : `골${player.stats.goals} 어시${player.stats.assists}`}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-display text-[22px] leading-none" style={{ color: 'var(--accent)' }}>
                    {player.stats.avgRating !== null ? player.stats.avgRating.toFixed(1) : '–'}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: '#555' }}>평균 평점</p>
                </div>
                {canEdit && (
                  <div className="flex gap-1 ml-1" onClick={e => e.preventDefault()}>
                    <button onClick={e => { e.preventDefault(); startEditing(player) }}
                      className="p-2 rounded-lg" style={{ color: '#555' }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={e => { e.preventDefault(); setDeleteTarget(player.id) }}
                      className="p-2 rounded-lg" style={{ color: '#555' }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* Add Player bottom sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50" onClick={resetForm}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl safe-bottom"
            style={{ background: '#111010', border: '1px solid #1e1e1e', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet handle */}
            <div className="flex-shrink-0 pt-3 pb-1 px-5 flex items-center justify-between">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: '#2a2a2a' }} />
            </div>

            <div className="flex-shrink-0 px-5 pb-3 flex items-center justify-between">
              <h2 className="font-black text-white text-lg">선수 추가</h2>
              <button onClick={resetForm} className="p-1 rounded" style={{ color: '#555' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: '#1a1a1a' }}>
                <button
                  onClick={() => { setAddMode('member'); setSelectedMember(null); setName('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition"
                  style={{ background: addMode === 'member' ? 'var(--card)' : 'transparent', color: addMode === 'member' ? 'var(--accent)' : '#555' }}>
                  <UserCheck className="w-3.5 h-3.5" /> 팀원에서 추가
                </button>
                <button
                  onClick={() => { setAddMode('manual'); setSelectedMember(null); setName('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition"
                  style={{ background: addMode === 'manual' ? 'var(--card)' : 'transparent', color: addMode === 'manual' ? '#888' : '#555' }}>
                  <UserPlus className="w-3.5 h-3.5" /> 직접 추가
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 pb-5">

              {/* Member mode */}
              {addMode === 'member' && (
                <div>
                  {availableMembers.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-[14px] font-bold text-white mb-1">등록 가능한 팀원이 없어요</p>
                      <p className="text-[12px]" style={{ color: '#555' }}>
                        이미 모든 팀원이 선수로 등록되었거나<br />아직 가입한 팀원이 없습니다
                      </p>
                    </div>
                  ) : !selectedMember ? (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: '#555' }}>
                        선수로 등록할 팀원 선택 · {availableMembers.length}명
                      </p>
                      <div className="space-y-2">
                        {availableMembers.map(member => {
                          const displayName = member.profile?.display_name || '이름 없음'
                          const initial = displayName.charAt(0).toUpperCase()
                          return (
                            <button
                              key={member.id}
                              onClick={() => selectMember(member)}
                              className="w-full flex items-center gap-3 p-3.5 rounded-[13px] active:opacity-70 transition"
                              style={{ background: '#1a1a1a', border: '1px solid #252525' }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-[14px] flex-shrink-0"
                                style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                                {initial}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-bold text-[14px] text-white">{displayName}</p>
                                <p className="text-[11px]" style={{ color: '#555' }}>{member.role === 'coach' ? '감독' : '팀원'}</p>
                              </div>
                              <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>선택 →</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleAddFromMember}>
                      {/* Selected member chip */}
                      <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.2)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px]"
                          style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                          {(selectedMember.profile?.display_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <p className="flex-1 font-bold text-[14px]" style={{ color: '#a3e635' }}>
                          {selectedMember.profile?.display_name || '이름 없음'}
                        </p>
                        <button type="button" onClick={() => { setSelectedMember(null); setName('') }}
                          className="p-1 rounded" style={{ color: '#555' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="선수 이름"
                          className="col-span-2 outline-none text-white placeholder-[#444] text-sm"
                          style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                        <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} placeholder="#"
                          className="outline-none text-white placeholder-[#444] text-sm"
                          style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {(['GK','DF','MF','FW'] as PositionType[]).map(pos => (
                          <button key={pos} type="button" onClick={() => setPosition(pos)}
                            className="py-2 rounded-[9px] text-sm font-bold transition"
                            style={{ background: position === pos ? POS_COLOR[pos] : '#1a1a1a', color: position === pos ? POS_TEXT[pos] : '#666' }}>
                            {pos}
                          </button>
                        ))}
                      </div>
                      <button type="submit" disabled={saving} className="w-full py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition disabled:opacity-40"
                        style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
                        {saving ? '등록 중…' : '선수로 등록하기'}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {addMode === 'manual' && (
                <form onSubmit={handleAddManual}>
                  <p className="text-[12px] mb-4 p-3 rounded-xl" style={{ background: '#1a1a1a', color: '#666' }}>
                    앱에 가입하지 않은 선수를 직접 추가합니다. 나중에 팀원과 연결할 수 있습니다.
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="이름"
                      className="col-span-2 outline-none text-white placeholder-[#444] text-sm"
                      style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                    <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} placeholder="#"
                      className="outline-none text-white placeholder-[#444] text-sm"
                      style={{ background: '#1a1a1a', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {(['GK','DF','MF','FW'] as PositionType[]).map(pos => (
                      <button key={pos} type="button" onClick={() => setPosition(pos)}
                        className="py-2 rounded-[9px] text-sm font-bold transition"
                        style={{ background: position === pos ? POS_COLOR[pos] : '#1a1a1a', color: position === pos ? POS_TEXT[pos] : '#666' }}>
                        {pos}
                      </button>
                    ))}
                  </div>
                  <button type="submit" disabled={saving} className="w-full py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition disabled:opacity-40"
                    style={{ background: '#2a2a2a', color: '#888' }}>
                    {saving ? '추가 중…' : '직접 추가하기'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={!!deleteTarget}
        title="선수를 삭제하시겠습니까?"
        description="이 선수의 경기 기록과 통계도 함께 삭제되며 복구할 수 없습니다."
        confirmLabel="삭제"
        danger
        onConfirm={() => { const id = deleteTarget!; setDeleteTarget(null); handleDeletePlayer(id) }}
        onCancel={() => setDeleteTarget(null)}
      />
      <BottomNav />
    </div>
  )
}
