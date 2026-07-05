'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Edit2, X } from 'lucide-react'
import type { Player, PositionType } from '@/types/database'
import { POSITION_LABELS } from '@/types/database'
import toast from 'react-hot-toast'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'
import { useAppData } from '@/hooks/useAppData'

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
}

export default function PlayersPage() {
  const router = useRouter()
  const data = useAppData()
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [search, setSearch] = useState('')
  const [localPlayers, setLocalPlayers] = useState<Player[] | null>(null)

  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam])

  const canEdit = data.selectedTeam?.role === 'coach' ||
    data.selectedTeam?.membership?.can_edit_players || false

  // Compute player stats from cached matches (no extra DB queries)
  const playersWithStats = useMemo<PlayerWithStats[]>(() => {
    const basePlayers = localPlayers ?? data.players
    return basePlayers.map(player => {
      const allRecords = data.matches.flatMap((m: any) =>
        (m.quarters ?? []).flatMap((q: any) => q.quarter_records ?? [])
      ).filter((r: any) => r.player_id === player.id)

      const attendance = data.matches.filter((m: any) =>
        (m.match_attendees ?? []).some((a: any) => a.player_id === player.id)
      ).length

      const rated = allRecords.filter((r: any) => r.rating !== null)
      return {
        ...player,
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
  }, [localPlayers, data.players, data.matches])

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.selectedTeamId || !name.trim()) return
    const supabase = createClient()
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({ team_id: data.selectedTeamId, name: name.trim(), number: number ? parseInt(number) : null, default_position: position })
      .select().single()
    if (error) { toast.error('선수 추가에 실패했습니다'); return }
    toast.success('선수가 추가되었습니다')
    setLocalPlayers([...(localPlayers ?? data.players), newPlayer])
    resetForm()
  }

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer || !name.trim()) return
    const supabase = createClient()
    const { error } = await supabase
      .from('players')
      .update({ name: name.trim(), number: number ? parseInt(number) : null, default_position: position })
      .eq('id', editingPlayer.id)
    if (error) { toast.error('수정에 실패했습니다'); return }
    toast.success('선수 정보가 수정되었습니다')
    const updated = (localPlayers ?? data.players).map(p =>
      p.id === editingPlayer.id ? { ...p, name: name.trim(), number: number ? parseInt(number) : null, default_position: position } : p
    )
    setLocalPlayers(updated)
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
    setShowAddForm(false)
  }

  const resetForm = () => {
    setName(''); setNumber(''); setPosition('MF')
    setShowAddForm(false); setEditingPlayer(null)
  }

  if (data.loading) return <PlayersListSkeleton />

  const teamName = data.selectedTeam?.name || ''
  const filtered = search.trim()
    ? playersWithStats.filter(p => p.name.includes(search.trim()))
    : playersWithStats

  return (
    <div className="min-h-screen pb-24" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-3.5 flex justify-between items-center">
          <div>
            <h1 className="font-black text-[20px] text-white">선수</h1>
            <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>{teamName} · {playersWithStats.length}명</p>
          </div>
          {canEdit && (
            <button onClick={() => { resetForm(); setShowAddForm(true) }}
              className="w-9 h-9 flex items-center justify-center rounded-[11px] font-black active:scale-95 transition"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}>
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 py-4 space-y-4">

        {/* Search */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="선수 검색…"
          className="w-full outline-none text-white placeholder-[#555] text-[14px]"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px' }}
        />

        {/* Add/Edit form */}
        {canEdit && (showAddForm || editingPlayer) && (
          <form onSubmit={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
            className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-white">{editingPlayer ? '선수 수정' : '새 선수 추가'}</h3>
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
              {editingPlayer ? '수정 완료' : '추가하기'}
            </button>
          </form>
        )}

        {/* Players list */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <p className="text-[14px]" style={{ color: '#555' }}>
              {search ? '검색 결과가 없습니다' : '등록된 선수가 없습니다'}
            </p>
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
                  <p className="font-bold text-[14px] text-white">
                    {player.name} <span style={{ color: '#555' }}>#{player.number || '–'}</span>
                  </p>
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

      <ConfirmSheet
        open={!!deleteTarget}
        title="선수를 삭제하시겠습니까?"
        description="삭제된 선수 정보는 복구할 수 없습니다."
        confirmLabel="삭제"
        danger
        onConfirm={() => { const id = deleteTarget!; setDeleteTarget(null); handleDeletePlayer(id) }}
        onCancel={() => setDeleteTarget(null)}
      />
      <BottomNav />
    </div>
  )
}
