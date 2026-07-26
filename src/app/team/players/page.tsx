'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Plus, Trash2, Edit2, X, UserCheck, UserPlus, Users } from 'lucide-react'
import type { Player, PositionType, PlayerAttributes } from '@/types/database'
import { POSITION_LABELS, ATTRIBUTE_KEYS } from '@/types/database'
import type { MemberWithProfile } from '@/lib/dataStore'
import toast from 'react-hot-toast'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { PullToRefresh } from '@/components/PullToRefresh'

const POS_COLOR: Record<PositionType, string> = {
  GK: '#f5a623', DF: '#3b82f6', MF: '#2dd4bf', FW: '#ef4444',
}
const POS_TEXT: Record<PositionType, string> = {
  GK: '#3a2600', DF: '#fff', MF: '#06231d', FW: '#fff',
}
const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"

interface PlayerStats {
  attendance: number
  games: number
  goals: number
  assists: number
  cleanSheets: number
  contribution: number
  avgRating: number | null
}

interface PlayerWithStats extends Player {
  stats: PlayerStats
  linkedMember?: MemberWithProfile
}

type RankStatKey = 'goals' | 'assists' | 'contribution' | 'avgRating' | 'attendance' | 'cleanSheets'

export default function PlayersPage() {
  const router = useRouter()
  const data = useAppData()
  const { t } = useI18n()
  const supabase = createClient()

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<'ALL' | PositionType>('ALL')
  const [view, setView] = useState<'roster' | 'ranking'>('roster')
  const [rankStat, setRankStat] = useState<RankStatKey>('goals')
  const [rankStart, setRankStart] = useState('')
  const [rankEnd, setRankEnd] = useState('')
  const [localPlayers, setLocalPlayers] = useState<Player[] | null>(null)
  const [localMemberLinks, setLocalMemberLinks] = useState<Record<string, string>>({}) // memberId → playerId

  // Add form state
  const [addMode, setAddMode] = useState<'member' | 'manual'>('member')
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')
  const [bio, setBio] = useState('')
  const [preferredPositions, setPreferredPositions] = useState('')
  const [preferredNumbers, setPreferredNumbers] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [attrs, setAttrs] = useState<PlayerAttributes>({ pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 })
  const [strengthTags, setStrengthTags] = useState('')
  const [saving, setSaving] = useState(false)

  const handlePhotoUpload = async (file: File) => {
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `players/${crypto.randomUUID()}.${ext}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('filePath', filePath)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPhotoUrl(json.url)
    } catch {
      toast.error(t.uploadFailed)
    } finally {
      setUploading(false)
    }
  }

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
          contribution: allRecords.reduce((s: number, r: any) => s + (r.contribution || 0), 0),
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
      toast.success(`${name.trim()} — ${t.playerAdded}`)
      resetForm()
    } catch {
      toast.error(t.saveFailed)
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
      toast.success(t.playerAdded)
      resetForm()
    } catch {
      toast.error(t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer || !name.trim()) return
    const posArr = preferredPositions.split(',').map(s => s.trim()).filter(Boolean)
    const patch = {
      name: name.trim(),
      number: number ? parseInt(number) : null,
      default_position: position,
      bio: bio.trim() || null,
      preferred_positions: posArr.length ? posArr : null,
      preferred_numbers: preferredNumbers.trim() || null,
      photo_url: photoUrl,
      attributes: attrs,
      strength_tags: strengthTags.split(',').map(s => s.trim()).filter(Boolean),
    }
    const { error } = await supabase.from('players').update(patch).eq('id', editingPlayer.id)
    if (error) { toast.error(t.saveFailed); return }
    toast.success(t.playerUpdated)
    setLocalPlayers((localPlayers ?? data.players).map(p =>
      p.id === editingPlayer.id ? { ...p, ...patch } : p
    ))
    resetForm()
  }

  const handleDeletePlayer = async (playerId: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('players').delete().eq('id', playerId)
    if (error) { toast.error(t.deleteFailed); return }
    toast.success(t.playerDeleted)
    setLocalPlayers((localPlayers ?? data.players).filter(p => p.id !== playerId))
  }

  const startEditing = (player: Player) => {
    setEditingPlayer(player)
    setName(player.name)
    setNumber(player.number?.toString() || '')
    setPosition(player.default_position)
    setBio(player.bio || '')
    setPreferredPositions((player.preferred_positions || []).join(', '))
    setPreferredNumbers(player.preferred_numbers || '')
    setPhotoUrl(player.photo_url || null)
    setAttrs(player.attributes ?? { pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 })
    setStrengthTags((player.strength_tags || []).join(', '))
    setShowAddSheet(false)
  }

  const resetForm = () => {
    setName(''); setNumber(''); setPosition('MF')
    setBio(''); setPreferredPositions(''); setPreferredNumbers(''); setPhotoUrl(null)
    setAttrs({ pace: 50, shooting: 50, passing: 50, dribbling: 50, defending: 50, physical: 50 }); setStrengthTags('')
    setShowAddSheet(false); setEditingPlayer(null)
    setSelectedMember(null); setAddMode('member')
  }

  const selectMember = (member: MemberWithProfile) => {
    setSelectedMember(member)
    setName(member.profile?.display_name || '')
  }

  // Stats recomputed over the selected date range (empty range = all time).
  // Must stay above the early `return` below so hook order is stable.
  const rangeStats = useMemo(() => {
    const inRange = (d?: string) => !!d && (!rankStart || d >= rankStart) && (!rankEnd || d <= rankEnd)
    const rangeMatches = (rankStart || rankEnd)
      ? data.matches.filter((mt: any) => inRange(mt.match_date))
      : data.matches
    const map = new Map<string, PlayerStats>()
    for (const p of playersWithStats) {
      const recs = rangeMatches
        .flatMap((mt: any) => (mt.quarters ?? []).flatMap((q: any) => q.quarter_records ?? []))
        .filter((r: any) => r.player_id === p.id)
      const rated = recs.filter((r: any) => r.rating !== null)
      map.set(p.id, {
        attendance: rangeMatches.filter((mt: any) => (mt.match_attendees ?? []).some((a: any) => a.player_id === p.id)).length,
        games: recs.length,
        goals: recs.reduce((s: number, r: any) => s + (r.goals || 0), 0),
        assists: recs.reduce((s: number, r: any) => s + (r.assists || 0), 0),
        cleanSheets: recs.filter((r: any) => r.clean_sheet).length,
        contribution: recs.reduce((s: number, r: any) => s + (r.contribution || 0), 0),
        avgRating: rated.length ? rated.reduce((s: number, r: any) => s + (r.rating || 0), 0) / rated.length : null,
      })
    }
    return map
  }, [playersWithStats, data.matches, rankStart, rankEnd])

  if (data.loading) return <PlayersListSkeleton />

  const teamName = data.selectedTeam?.name || ''
  const filtered = playersWithStats
    .filter(p => posFilter === 'ALL' || p.default_position === posFilter)
    .filter(p => !search.trim() || p.name.includes(search.trim()))

  // Roster / ranking view
  const statTabs: { key: RankStatKey; label: string; suffix: string }[] = [
    { key: 'goals', label: t.goals, suffix: t.goals },
    { key: 'assists', label: t.assistsLabel, suffix: t.assistsLabel },
    { key: 'contribution', label: t.contribution, suffix: '' },
    { key: 'avgRating', label: t.rating, suffix: '' },
    { key: 'attendance', label: t.attendance, suffix: '' },
    { key: 'cleanSheets', label: t.cleanSheet, suffix: '' },
  ]

  const statOf = (p: PlayerWithStats) => rangeStats.get(p.id) ?? p.stats
  const rankValue = (p: PlayerWithStats) => {
    const v = statOf(p)[rankStat]
    return v === null ? -1 : v
  }
  const rankedPlayers = [...playersWithStats].sort((a, b) => rankValue(b) - rankValue(a))
  const formatRank = (p: PlayerWithStats) => {
    const v = statOf(p)[rankStat]
    if (rankStat === 'avgRating') return v === null ? '–' : (v as number).toFixed(1)
    return String(v ?? 0)
  }
  const RANK_MEDAL = ['#f5b301', '#c7ccd1', '#cd7f32'] // gold / silver / bronze

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-md mx-auto flex justify-between items-center" style={{ padding: '10px 22px 14px' }}>
          <div style={{ fontSize: 21, fontWeight: 700, color: '#101828' }}>
            {t.playersLabel} <span style={{ fontSize: 14, color: '#98a2b3', fontWeight: 500 }}>{t.playersN.replace('{n}', String(playersWithStats.length))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/team/intro"
              className="flex items-center justify-center active:scale-95 transition"
              style={{ width: 36, height: 36, borderRadius: 11, background: '#fff', border: '1px solid #eaecf0', color: '#475467' }}>
              <Users className="w-4 h-4" />
            </Link>
            {canEdit && (
              <button onClick={() => { resetForm(); setShowAddSheet(true) }}
                className="flex items-center justify-center active:scale-95 transition"
                style={{ width: 36, height: 36, borderRadius: 11, background: '#101828', color: '#c8f542', fontSize: 20 }}>
                +
              </button>
            )}
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={async () => { setLocalPlayers(null); setLocalMemberLinks({}); await data.refresh() }}>
      <div className="max-w-md mx-auto px-5 py-4 space-y-4">

        {/* Roster / Ranking toggle */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--card2)' }}>
          {(['roster', 'ranking'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className="flex-1 py-2 rounded-lg text-[13px] font-bold transition"
              style={view === v
                ? { background: 'var(--card)', color: 'var(--text)' }
                : { background: 'transparent', color: 'var(--muted2)' }}>
              {v === 'roster' ? t.rosterTab : t.rankingTab}
            </button>
          ))}
        </div>

        {/* Search + position filter (roster only) */}
        {view === 'roster' && (
        <>
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.searchPlayer}
          className="w-full outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-[13px]"
          style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 14, padding: '12px 16px' }}
        />
        <div className="flex" style={{ gap: 7 }}>
          {(['ALL', 'FW', 'MF', 'DF', 'GK'] as const).map(pos => {
            const active = posFilter === pos
            return (
              <button key={pos} onClick={() => setPosFilter(pos)}
                style={{
                  fontSize: 12, fontWeight: active ? 600 : 500, padding: '7px 14px', borderRadius: 20,
                  background: active ? '#101828' : '#fff', color: active ? '#c8f542' : '#475467',
                  border: active ? 'none' : '1px solid #eaecf0',
                }}>
                {pos === 'ALL' ? t.allLabel : pos}
              </button>
            )
          })}
        </div>
        </>
        )}

        {/* Ranking view */}
        {view === 'ranking' && (
          <div className="space-y-3">
            {/* Date range filter */}
            <div className="rounded-xl p-3" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>{t.startDate}</p>
                  <input type="date" value={rankStart} max={rankEnd || undefined} onChange={e => setRankStart(e.target.value)}
                    className="w-full outline-none text-[color:var(--text)] text-[13px]"
                    style={{ colorScheme: 'dark', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }} />
                </div>
                <span className="pt-4" style={{ color: 'var(--muted2)' }}>~</span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>{t.endDate}</p>
                  <input type="date" value={rankEnd} min={rankStart || undefined} onChange={e => setRankEnd(e.target.value)}
                    className="w-full outline-none text-[color:var(--text)] text-[13px]"
                    style={{ colorScheme: 'dark', background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 9, padding: '9px 11px' }} />
                </div>
              </div>
              {(rankStart || rankEnd) && (
                <button onClick={() => { setRankStart(''); setRankEnd('') }}
                  className="mt-2 text-[12px] font-bold" style={{ color: 'var(--text)' }}>
                  {t.allPeriod}
                </button>
              )}
            </div>
            {/* Stat tabs */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {statTabs.map(tab => (
                <button key={tab.key} onClick={() => setRankStat(tab.key)}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-bold transition"
                  style={rankStat === tab.key
                    ? { background: 'var(--navy)', color: 'var(--accent)' }
                    : { background: 'var(--card)', color: 'var(--muted1)', border: '1px solid var(--line)' }}>
                  {tab.label}
                </button>
              ))}
            </div>
            {/* Ranked list */}
            {rankedPlayers.length === 0 ? (
              <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                <p className="text-[14px]" style={{ color: 'var(--muted2)' }}>{t.noPlayers}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {rankedPlayers.map((player, i) => (
                  <Link key={player.id} href={`/team/players/${player.id}`}
                    className="flex items-center gap-3 p-4 rounded-[14px] active:opacity-80 transition"
                    style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-[13px] flex-shrink-0"
                      style={i < 3
                        ? { background: RANK_MEDAL[i], color: 'var(--text)' }
                        : { color: 'var(--muted2)' }}>
                      {i + 1}
                    </div>
                    <div className="w-[34px] h-[34px] rounded-[9px] overflow-hidden flex items-center justify-center flex-shrink-0 font-black text-[10px]"
                      style={{ background: POS_COLOR[player.default_position], color: POS_TEXT[player.default_position] }}>
                      {player.photo_url
                        ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                        : player.default_position}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[14px] text-[color:var(--text)] truncate">
                        {player.name} <span style={{ color: 'var(--muted2)' }}>#{player.number || '–'}</span>
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0 flex items-baseline gap-1">
                      <p className="font-display text-[22px] leading-none" style={{ color: 'var(--text)' }}>{formatRank(player)}</p>
                      {statTabs.find(tb => tb.key === rankStat)?.suffix
                        ? <span className="text-[11px]" style={{ color: 'var(--muted2)' }}>{statTabs.find(tb => tb.key === rankStat)!.suffix}</span>
                        : null}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Edit form (inline, only for editing existing players) */}
        {canEdit && editingPlayer && (
          <form onSubmit={handleUpdatePlayer}
            className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[color:var(--text)]">{t.editPlayerTitle}</h3>
              <button type="button" onClick={resetForm} className="p-1 rounded" style={{ color: 'var(--muted2)' }}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex justify-center mb-4">
              <label className="relative cursor-pointer">
                <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
                  {photoUrl
                    ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    : <Users className="w-7 h-7" style={{ color: 'var(--muted2)' }} />}
                </div>
                <span className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                  {uploading ? <span className="text-[10px] font-bold">…</span> : <Plus className="w-4 h-4" />}
                </span>
                <input type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f) }} />
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder={t.playerName}
                className="col-span-2 outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} placeholder="#"
                className="outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
            </div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {(['GK','DF','MF','FW'] as PositionType[]).map(pos => (
                <button key={pos} type="button" onClick={() => setPosition(pos)}
                  className="py-2 rounded-[9px] text-sm font-bold transition"
                  style={{ background: position === pos ? POS_COLOR[pos] : 'var(--card2)', color: position === pos ? POS_TEXT[pos] : 'var(--muted2)' }}>
                  {pos}
                </button>
              ))}
            </div>
            <div className="space-y-2 mb-4">
              <input type="text" value={preferredPositions} onChange={e => setPreferredPositions(e.target.value)}
                placeholder={t.preferredPositionsPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <input type="text" value={preferredNumbers} onChange={e => setPreferredNumbers(e.target.value)}
                placeholder={t.preferredNumbersPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder={t.selfIntroPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm resize-none"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <input type="text" value={strengthTags} onChange={e => setStrengthTags(e.target.value)}
                placeholder={t.strengthsPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
            </div>

            {/* 능력치 슬라이더 (자가 평가) */}
            <div className="rounded-xl p-3 mb-4 space-y-2.5" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>{t.rateYourself}</p>
              {ATTRIBUTE_KEYS.map(k => {
                const label = { pace: t.attrPace, shooting: t.attrShooting, passing: t.attrPassing, dribbling: t.attrDribbling, defending: t.attrDefending, physical: t.attrPhysical }[k]
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className="text-[12px] font-bold w-14 flex-shrink-0" style={{ color: 'var(--text2)' }}>{label}</span>
                    <input type="range" min={1} max={99} value={attrs[k]}
                      onChange={e => setAttrs(a => ({ ...a, [k]: parseInt(e.target.value) }))}
                      className="flex-1" style={{ accentColor: 'var(--accent)' }} />
                    <span className="font-display text-[15px] w-7 text-right flex-shrink-0" style={{ color: 'var(--text)' }}>{attrs[k]}</span>
                  </div>
                )
              })}
            </div>
            <button type="submit" className="w-full py-3 rounded-xl font-black text-sm active:scale-[0.98] transition"
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
              {t.editDone}
            </button>
          </form>
        )}

        {/* Players list (roster only) */}
        {view === 'roster' && (filtered.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <p className="text-[14px]" style={{ color: 'var(--muted2)' }}>
              {t.noPlayers}
            </p>
            {!search && canEdit && (
              <p className="text-[12px] mt-1" style={{ color: 'var(--text-faint)' }}>
                {t.noAvailableMembersDesc}
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col" style={{ gap: 9 }}>
            {(() => {
              const topScorerId = filtered.reduce<{ id: string | null; g: number }>((best, p) =>
                p.stats.goals > best.g ? { id: p.id, g: p.stats.goals } : best, { id: null, g: 0 }).id
              return filtered.map(player => {
                const isTop = player.id === topScorerId
                const isKeeperLine = player.default_position === 'GK' || player.default_position === 'DF'
                return (
                  <Link key={player.id} href={`/team/players/${player.id}`}
                    className="flex items-center active:opacity-80 transition"
                    style={{ background: '#fff', border: '1px solid #eaecf0', borderRadius: 16, padding: '14px 18px', gap: 13 }}>
                    <span className="overflow-hidden flex items-center justify-center flex-shrink-0"
                      style={{ fontFamily: BEBAS, fontSize: 22, width: 40, height: 40, borderRadius: 10,
                        background: isTop ? '#c8f542' : '#f2f4f7', color: isTop ? '#101828' : '#475467' }}>
                      {player.photo_url
                        ? <img src={player.photo_url} alt={player.name} className="w-full h-full object-cover" />
                        : (player.number ?? '-')}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold truncate" style={{ fontSize: 14, color: '#101828' }}>{player.name}</span>
                        {player.linkedMember && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: '#eef7d6', color: '#5a7a12' }}>
                            {t.appLinked}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#98a2b3', marginTop: 2 }}>{player.default_position}</div>
                    </div>
                    <span style={{ fontFamily: BEBAS, fontSize: 19, color: '#101828' }}>
                      {isKeeperLine
                        ? <>{player.stats.cleanSheets}<span style={{ fontSize: 13, color: '#98a2b3' }}>CS</span></>
                        : <>{player.stats.goals}<span style={{ fontSize: 13, color: '#98a2b3' }}>G</span> {player.stats.assists}<span style={{ fontSize: 13, color: '#98a2b3' }}>A</span></>}
                    </span>
                    {canEdit && (
                      <div className="flex gap-1 ml-1" onClick={e => e.preventDefault()}>
                        <button onClick={e => { e.preventDefault(); startEditing(player) }}
                          className="p-2 rounded-lg" style={{ color: '#98a2b3' }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.preventDefault(); setDeleteTarget(player.id) }}
                          className="p-2 rounded-lg" style={{ color: '#98a2b3' }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </Link>
                )
              })
            })()}
          </div>
        ))}
      </div>
      </PullToRefresh>

      {/* Add Player bottom sheet */}
      {showAddSheet && (
        <div className="fixed inset-0 z-50" onClick={resetForm}>
          <div className="absolute inset-0 bg-black/60" />
          <div
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl safe-bottom"
            style={{ background: 'var(--card)', border: '1px solid var(--line)', maxHeight: '85dvh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Sheet handle */}
            <div className="flex-shrink-0 pt-3 pb-1 px-5 flex items-center justify-between">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--line2)' }} />
            </div>

            <div className="flex-shrink-0 px-5 pb-3 flex items-center justify-between">
              <h2 className="font-black text-[color:var(--text)] text-lg">{t.addPlayer}</h2>
              <button onClick={resetForm} className="p-1 rounded" style={{ color: 'var(--muted2)' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode tabs */}
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--card2)' }}>
                <button
                  onClick={() => { setAddMode('member'); setSelectedMember(null); setName('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition"
                  style={{ background: addMode === 'member' ? 'var(--card)' : 'transparent', color: addMode === 'member' ? 'var(--text)' : 'var(--muted2)' }}>
                  <UserCheck className="w-3.5 h-3.5" /> {t.membersFromTeam}
                </button>
                <button
                  onClick={() => { setAddMode('manual'); setSelectedMember(null); setName('') }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition"
                  style={{ background: addMode === 'manual' ? 'var(--card)' : 'transparent', color: addMode === 'manual' ? 'var(--text)' : 'var(--muted2)' }}>
                  <UserPlus className="w-3.5 h-3.5" /> {t.addManually}
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
                      <p className="text-[14px] font-bold text-[color:var(--text)] mb-1">{t.noAvailableMembers}</p>
                      <p className="text-[12px]" style={{ color: 'var(--muted2)' }}>
                        {t.noAvailableMembersDesc}
                      </p>
                    </div>
                  ) : !selectedMember ? (
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--muted2)' }}>
                        {t.selectMemberPrompt.replace('{n}', String(availableMembers.length))}
                      </p>
                      <div className="space-y-2">
                        {availableMembers.map(member => {
                          const displayName = member.profile?.display_name || t.noName
                          const initial = displayName.charAt(0).toUpperCase()
                          return (
                            <button
                              key={member.id}
                              onClick={() => selectMember(member)}
                              className="w-full flex items-center gap-3 p-3.5 rounded-[13px] active:opacity-70 transition"
                              style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
                              <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-[14px] flex-shrink-0"
                                style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                                {initial}
                              </div>
                              <div className="flex-1 text-left">
                                <p className="font-bold text-[14px] text-[color:var(--text)]">{displayName}</p>
                                <p className="text-[11px]" style={{ color: 'var(--muted2)' }}>{member.role === 'coach' ? t.coach : t.member}</p>
                              </div>
                              <span className="text-[12px] font-bold" style={{ color: 'var(--text)' }}>{t.selectArrow}</span>
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
                          style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                          {(selectedMember.profile?.display_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <p className="flex-1 font-bold text-[14px]" style={{ color: '#a3e635' }}>
                          {selectedMember.profile?.display_name || t.noName}
                        </p>
                        <button type="button" onClick={() => { setSelectedMember(null); setName('') }}
                          className="p-1 rounded" style={{ color: 'var(--muted2)' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-3">
                        <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder={t.playerName}
                          className="col-span-2 outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                          style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                        <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} placeholder="#"
                          className="outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                          style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                      </div>
                      <div className="grid grid-cols-4 gap-2 mb-4">
                        {(['GK','DF','MF','FW'] as PositionType[]).map(pos => (
                          <button key={pos} type="button" onClick={() => setPosition(pos)}
                            className="py-2 rounded-[9px] text-sm font-bold transition"
                            style={{ background: position === pos ? POS_COLOR[pos] : 'var(--card2)', color: position === pos ? POS_TEXT[pos] : 'var(--muted2)' }}>
                            {pos}
                          </button>
                        ))}
                      </div>
                      <button type="submit" disabled={saving} className="w-full py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition disabled:opacity-40"
                        style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                        {saving ? t.registering : t.registerAsPlayer}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {addMode === 'manual' && (
                <form onSubmit={handleAddManual}>
                  <p className="text-[12px] mb-4 p-3 rounded-xl" style={{ background: 'var(--card2)', color: 'var(--muted2)' }}>
                    {t.manualAddHint}
                  </p>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder={t.playerName}
                      className="col-span-2 outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                      style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                    <input type="number" value={number} onChange={e => setNumber(e.target.value)} min={1} max={99} placeholder="#"
                      className="outline-none text-[color:var(--text)] placeholder-[#98a2b3] text-sm"
                      style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {(['GK','DF','MF','FW'] as PositionType[]).map(pos => (
                      <button key={pos} type="button" onClick={() => setPosition(pos)}
                        className="py-2 rounded-[9px] text-sm font-bold transition"
                        style={{ background: position === pos ? POS_COLOR[pos] : 'var(--card2)', color: position === pos ? POS_TEXT[pos] : 'var(--muted2)' }}>
                        {pos}
                      </button>
                    ))}
                  </div>
                  <button type="submit" disabled={saving} className="w-full py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition disabled:opacity-40"
                    style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                    {saving ? t.adding : t.manualAddButton}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmSheet
        open={!!deleteTarget}
        title={t.deletePlayerTitle}
        description={t.deletePlayerDesc}
        confirmLabel={t.delete}
        danger
        onConfirm={() => { const id = deleteTarget!; setDeleteTarget(null); handleDeletePlayer(id) }}
        onCancel={() => setDeleteTarget(null)}
      />
      <BottomNav />
    </div>
  )
}
