'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, authHeader } from '@/lib/supabase'
import { Sheet } from '@/components/design/Sheet'
import { PlayerFields } from '@/components/design/PlayerFields'
import { getDesignCopy } from '@/lib/design-copy'
import { Trash2, Edit2, X, UserCheck, UserPlus, Users } from 'lucide-react'
import type { Player, PositionType } from '@/types/database'
import { applyPlayerWrite, beginTeamWrite, getDataContext, isDataContextCurrent, type MemberWithProfile } from '@/lib/dataStore'
import { getMemberLinkErrorCopy, getTeamSelectionCopy } from '@/lib/team-selection-copy'
import { MemberPlayerLinkError, saveMemberPlayer } from '@/lib/member-player-save'
import toast from 'react-hot-toast'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { BottomNav } from '@/components/BottomNav'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'
import { PullToRefresh } from '@/components/PullToRefresh'
import { PlayerPhotoField } from '@/components/players/PlayerPhotoField'
import { PlayerCard } from '@/components/players/PlayerCard'
import { getPlayerCardStats, getPlayerAge, parsePlayerAge, withPlayerAge } from '@/lib/player-card'
import { getPlayerCardCopy } from '@/lib/player-card-copy'

export default function PlayersPage() {
  const router = useRouter()
  const data = useAppData()
  const { t, locale } = useI18n()
  const copy = getDesignCopy(locale)
  const cardCopy = getPlayerCardCopy(locale)
  const selectionCopy = getTeamSelectionCopy(locale)
  const supabase = createClient()

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [showAddSheet, setShowAddSheet] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [search, setSearch] = useState('')
  const [posFilter, setPosFilter] = useState<'ALL' | PositionType>('ALL')

  // Add form state
  const [addMode, setAddMode] = useState<'member' | 'manual'>('manual')
  const [selectedMember, setSelectedMember] = useState<MemberWithProfile | null>(null)
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [age, setAge] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')
  const [bio, setBio] = useState('')
  const [preferredPositions, setPreferredPositions] = useState('')
  const [preferredNumbers, setPreferredNumbers] = useState('')
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [strengthTags, setStrengthTags] = useState('')
  const [saving, setSaving] = useState(false)
  const photoUpload = useRef<AbortController | null>(null)
  const mutation = useRef<ReturnType<typeof beginTeamWrite> | null>(null)
  const pendingMemberPlayers = useRef(new Map<string, Player>())
  const [memberLinkFailed, setMemberLinkFailed] = useState(false)
  const mounted = useRef(true)

  const startMutation = () => {
    if (mutation.current || uploading || !canEdit || !isDataContextCurrent({ userId: data.userId, teamId: data.selectedTeamId, version: data.contextVersion })) return null
    const operation = beginTeamWrite()
    mutation.current = operation
    setSaving(true)
    return operation
  }
  const currentMutation = (operation: ReturnType<typeof beginTeamWrite>) => mounted.current && mutation.current === operation && isDataContextCurrent(operation.context)
  const finishMutation = (operation: ReturnType<typeof beginTeamWrite>) => {
    operation.finish()
    if (mutation.current === operation) {
      mutation.current = null
      if (mounted.current) setSaving(false)
    }
  }

  const cancelPhotoUpload = () => {
    photoUpload.current?.abort()
    photoUpload.current = null
    setUploading(false)
  }

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false; photoUpload.current?.abort(); photoUpload.current = null; mutation.current?.finish(); mutation.current = null }
  }, [])
  useEffect(() => {
    mutation.current?.finish()
    mutation.current = null
    setSaving(false)
    pendingMemberPlayers.current.clear()
    resetForm()
    setDeleteTarget(null)
    setSearch('')
    setPosFilter('ALL')
  // Refreshing the same team must preserve the draft and pending save.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.contextVersion])

  const handlePhotoUpload = async (file: File) => {
    if (mutation.current) return
    const context = getDataContext()
    if (!file.type.startsWith('image/')) { toast.error(t.uploadFailed); return }
    const request = new AbortController()
    photoUpload.current?.abort()
    photoUpload.current = request
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const filePath = `players/${crypto.randomUUID()}.${ext}`
      const fd = new FormData()
      fd.append('file', file)
      fd.append('filePath', filePath)
      const res = await fetch('/api/upload', { method: 'POST', headers: await authHeader(supabase), body: fd, signal: request.signal })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      if (photoUpload.current === request && isDataContextCurrent(context)) setPhotoUrl(json.url)
    } catch {
      if (!request.signal.aborted && photoUpload.current === request && isDataContextCurrent(context)) toast.error(t.uploadFailed)
    } finally {
      if (photoUpload.current === request) { photoUpload.current = null; setUploading(false) }
    }
  }

  useEffect(() => {
    if (data.isLoaded && !data.userId) router.push('/login')
    if (data.isLoaded && !data.selectedTeam) router.push('/dashboard')
  }, [data.isLoaded, data.userId, data.selectedTeam, router])

  const canEdit = data.selectedTeam?.role === 'coach' ||
    data.selectedTeam?.membership?.can_edit_players || false

  // Approved members who haven't been converted to players yet
  const availableMembers = useMemo<MemberWithProfile[]>(() => {
    const linkedIds = new Set([
      ...data.members.filter(m => m.linked_player_id).map(m => m.id),
    ])
    return data.members.filter(m =>
      m.status === 'approved' &&
      !m.is_removed &&
      !linkedIds.has(m.id)
    )
  }, [data.members])

  const players = data.players

  const handleAddFromMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.selectedTeamId || !selectedMember || !name.trim()) return
    const operation = startMutation()
    if (!operation) return
    try {
      const parsedAge = parsePlayerAge(age)
      const newPlayer = await saveMemberPlayer(supabase, operation.context.teamId!, selectedMember.id,
        { name: name.trim(), number: number ? parseInt(number) : null, default_position: position, attributes: withPlayerAge(null, parsedAge), photo_url: photoUrl },
        pendingMemberPlayers.current.get(selectedMember.id) ?? null,
        inserted => { pendingMemberPlayers.current.set(selectedMember.id, inserted); applyPlayerWrite(operation.context, inserted) },
        () => currentMutation(operation))
      if (!newPlayer || !currentMutation(operation)) return

      applyPlayerWrite(operation.context, newPlayer, undefined, selectedMember.id)
      pendingMemberPlayers.current.delete(selectedMember.id)
      toast.success(`${name.trim()} — ${t.playerAdded}`)
      resetForm(true)
    } catch (error) {
      if (currentMutation(operation)) {
        if (error instanceof MemberPlayerLinkError) setMemberLinkFailed(true)
        else toast.error(error instanceof Error && error.message === 'invalid_age' ? cardCopy.invalidAge : t.saveFailed)
      }
    } finally {
      finishMutation(operation)
    }
  }

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data.selectedTeamId || !name.trim()) return
    const operation = startMutation()
    if (!operation) return
    try {
      const parsedAge = parsePlayerAge(age)
      const { data: newPlayer, error } = await supabase
        .from('players')
        .insert({ team_id: operation.context.teamId, name: name.trim(), number: number ? parseInt(number) : null, default_position: position, attributes: withPlayerAge(null, parsedAge), photo_url: photoUrl })
        .select().single()
      if (!currentMutation(operation)) return
      if (error) throw error
      applyPlayerWrite(operation.context, newPlayer)
      toast.success(t.playerAdded)
      resetForm(true)
    } catch (error) {
      if (currentMutation(operation)) toast.error(error instanceof Error && error.message === 'invalid_age' ? cardCopy.invalidAge : t.saveFailed)
    } finally {
      finishMutation(operation)
    }
  }

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer || !name.trim()) return
    let parsedAge: number | null
    try { parsedAge = parsePlayerAge(age) } catch { toast.error(cardCopy.invalidAge); return }
    const operation = startMutation()
    if (!operation) return
    const posArr = preferredPositions.split(',').map(s => s.trim()).filter(Boolean)
    const patch = {
      name: name.trim(),
      number: number ? parseInt(number) : null,
      default_position: position,
      bio: bio.trim() || null,
      preferred_positions: posArr.length ? posArr : null,
      preferred_numbers: preferredNumbers.trim() || null,
      photo_url: photoUrl,
      ...(parsedAge !== getPlayerAge(editingPlayer) ? { attributes: withPlayerAge(editingPlayer.attributes, parsedAge) } : {}),
      strength_tags: strengthTags.split(',').map(s => s.trim()).filter(Boolean),
    }
    try {
      const { data: savedPlayer, error } = await supabase.from('players').update(patch).eq('id', editingPlayer.id).eq('team_id', operation.context.teamId!).select().single()
      if (!currentMutation(operation)) return
      if (error || !savedPlayer) throw error
      applyPlayerWrite(operation.context, savedPlayer)
      toast.success(t.playerUpdated)
      resetForm(true)
    } catch { if (currentMutation(operation)) toast.error(t.saveFailed) } finally { finishMutation(operation) }
  }

  const handleDeletePlayer = async (playerId: string) => {
    const operation = startMutation()
    if (!operation) return
    try {
      const { error } = await supabase.from('players').delete().eq('id', playerId).eq('team_id', operation.context.teamId!)
      if (!currentMutation(operation)) return
      if (error) throw error
      toast.success(t.playerDeleted)
      applyPlayerWrite(operation.context, null, playerId)
    } catch { if (currentMutation(operation)) toast.error(t.deleteFailed) }
    finally { finishMutation(operation) }
  }

  const startEditing = (player: Player) => {
    if (mutation.current) return
    cancelPhotoUpload()
    setEditingPlayer(player)
    setName(player.name)
    setNumber(player.number?.toString() || '')
    setAge(getPlayerAge(player)?.toString() ?? '')
    setPosition(player.default_position)
    setBio(player.bio || '')
    setPreferredPositions((player.preferred_positions || []).join(', '))
    setPreferredNumbers(player.preferred_numbers || '')
    setPhotoUrl(player.photo_url || null)
    setStrengthTags((player.strength_tags || []).join(', '))
    setShowAddSheet(false)
  }

  const clearDraft = () => {
    cancelPhotoUpload()
    setName(''); setNumber(''); setAge(''); setPosition('MF')
    setBio(''); setPreferredPositions(''); setPreferredNumbers(''); setPhotoUrl(null)
    setStrengthTags('')
  }

  const resetForm = (afterSave = false) => {
    if (mutation.current && !afterSave) return
    clearDraft()
    setMemberLinkFailed(false)
    setShowAddSheet(false); setEditingPlayer(null)
    setSelectedMember(null); setAddMode('manual')
  }

  const selectMember = (member: MemberWithProfile) => {
    clearDraft()
    setSelectedMember(member)
    const acknowledged = pendingMemberPlayers.current.get(member.id)
    setMemberLinkFailed(!!acknowledged)
    setName(acknowledged?.name || member.profile?.display_name || '')
    if (acknowledged) {
      setNumber(acknowledged.number?.toString() ?? '')
      setAge(getPlayerAge(acknowledged)?.toString() ?? '')
      setPosition(acknowledged.default_position)
      setPhotoUrl(acknowledged.photo_url ?? null)
    }
  }

  if (data.loading) return <PlayersListSkeleton />

  const filtered = players
    .filter(p => posFilter === 'ALL' || p.default_position === posFilter)
    .filter(p => !search.trim() || p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) || String(p.number ?? '').includes(search.trim()))

  return (
    <div className="light min-h-screen pb-nav" style={{ background: 'var(--bg)' }}>

      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-md mx-auto flex justify-between items-center" style={{ padding: '10px 22px 14px' }}>
          <div style={{ fontSize: 21, fontWeight: 700, color: 'var(--text)' }}>
            {t.playersLabel} <span style={{ fontSize: 14, color: 'var(--text3)', fontWeight: 500 }}>{t.playersN.replace('{n}', String(players.length))}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/team/intro" aria-label={t.teamIntro}
              className="flex items-center justify-center active:scale-95 transition"
              style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--card)', border: '1px solid var(--line)', color: 'var(--text2)' }}>
              <Users className="w-4 h-4" />
            </Link>
            {canEdit && (
              <button aria-label={t.addPlayer} disabled={saving} onClick={() => { resetForm(); setShowAddSheet(true) }}
                className="flex items-center justify-center active:scale-95 transition"
                style={{ width: 44, height: 44, borderRadius: 11, background: 'var(--navy)', color: 'var(--accent)', fontSize: 20 }}>
                +
              </button>
            )}
          </div>
        </div>
      </header>

      <PullToRefresh onRefresh={data.refresh}>
      <div className="max-w-md mx-auto px-4 py-4 space-y-4">
        {saving && <p role="status" className="text-sm text-[color:var(--text)]">{selectionCopy.saving}</p>}

        {/* Search and position filter */}
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={t.searchPlayer} aria-label={t.searchPlayer}
          className="w-full outline-none text-[color:var(--text)] placeholder-[color:var(--text3)] text-[13px]"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '12px 16px' }}
        />
        <div className="flex" style={{ gap: 7 }}>
          {(['ALL', 'FW', 'MF', 'DF', 'GK'] as const).map(pos => {
            const active = posFilter === pos
            return (
              <button key={pos} onClick={() => setPosFilter(pos)}
                style={{
                  fontSize: 12, fontWeight: active ? 600 : 500, padding: '7px 14px', borderRadius: 20,
                  background: active ? 'var(--navy)' : 'var(--card)', color: active ? 'var(--accent)' : 'var(--text2)',
                  border: active ? 'none' : '1px solid var(--line)',
                }}>
                {pos === 'ALL' ? t.allLabel : pos}
              </button>
            )
          })}
        </div>
        {/* Edit form (inline, only for editing existing players) */}
        {canEdit && editingPlayer && (
          <form onSubmit={handleUpdatePlayer}
            className="rounded-2xl p-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
            <fieldset disabled={saving} className="min-w-0 border-0 p-0 m-0">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-[color:var(--text)]">{t.editPlayerTitle}</h3>
              <button type="button" aria-label={t.close} onClick={() => resetForm()} className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded" style={{ color: 'var(--muted2)' }}><X className="w-5 h-5" /></button>
            </div>
            <PlayerPhotoField url={photoUrl} uploading={uploading} onUpload={handlePhotoUpload} onRemove={() => setPhotoUrl(null)} />
            <div className="mb-4"><PlayerFields name={name} number={number} age={age} position={position} onName={setName} onNumber={setNumber} onAge={setAge} onPosition={setPosition} labels={{ name: t.playerName, number: copy.number, position: cardCopy.position }} ageLabel={cardCopy.age} ageHint={cardCopy.ageHint} /></div>
            <div className="space-y-2 mb-4">
              <input type="text" value={preferredPositions} onChange={e => setPreferredPositions(e.target.value)}
                placeholder={t.preferredPositionsPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[color:var(--text3)] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <input type="text" value={preferredNumbers} onChange={e => setPreferredNumbers(e.target.value)}
                placeholder={t.preferredNumbersPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[color:var(--text3)] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3}
                placeholder={t.selfIntroPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[color:var(--text3)] text-sm resize-none"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
              <input type="text" value={strengthTags} onChange={e => setStrengthTags(e.target.value)}
                placeholder={t.strengthsPlaceholder}
                className="w-full outline-none text-[color:var(--text)] placeholder-[color:var(--text3)] text-sm"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px' }} />
            </div>

            <button type="submit" disabled={saving || uploading} className="w-full py-3 rounded-xl font-black text-sm active:scale-[0.98] transition"
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
              {saving ? t.loading : t.editDone}
            </button>
            </fieldset>
          </form>
        )}

        {/* Players list */}
        {filtered.length === 0 ? (
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
          <div className="grid grid-cols-2 gap-x-3 gap-y-5">
            {filtered.map(player => <div key={player.id} className="min-w-0">
              <Link href={`/team/players/${player.id}`} className="focus-ring block rounded-xl active:opacity-80">
                <PlayerCard player={player} stats={getPlayerCardStats(player.id, data.matches)} />
              </Link>
              {canEdit && <div className="mt-1 flex justify-center gap-2">
                <button type="button" aria-label={`${t.editPlayerTitle}: ${player.name}`} onClick={() => startEditing(player)} className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[color:var(--text3)]"><Edit2 size={16} /></button>
                <button type="button" aria-label={`${t.delete}: ${player.name}`} onClick={() => setDeleteTarget(player.id)} className="focus-ring flex min-h-11 min-w-11 items-center justify-center rounded-xl text-[color:var(--text3)]"><Trash2 size={16} /></button>
              </div>}
            </div>)}
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* Add Player bottom sheet */}
      {showAddSheet && (
        <Sheet title={t.addPlayer} closeLabel={t.close} onClose={() => resetForm()} closeDisabled={saving}>
          {saving && <p role="status" className="mb-3 text-sm text-[color:var(--text)]">{selectionCopy.saving}</p>}
          <fieldset disabled={saving} className="min-w-0 border-0 p-0 m-0">
            {/* Mode tabs */}
            <div className="flex-shrink-0 px-5 pb-3">
              <div className="flex gap-2 p-1 rounded-xl" style={{ background: 'var(--card2)' }}>
                <button
                  onClick={() => { clearDraft(); setAddMode('member'); setSelectedMember(null) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-bold transition"
                  style={{ background: addMode === 'member' ? 'var(--card)' : 'transparent', color: addMode === 'member' ? 'var(--text)' : 'var(--muted2)' }}>
                  <UserCheck className="w-3.5 h-3.5" /> {t.membersFromTeam}
                </button>
                <button
                  onClick={() => { clearDraft(); setAddMode('manual'); setSelectedMember(null) }}
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
                      {memberLinkFailed && <p role="alert" className="mb-3 text-sm [overflow-wrap:anywhere]">{getMemberLinkErrorCopy(locale)}</p>}
                      <fieldset disabled={memberLinkFailed} className="min-w-0 border-0 p-0 m-0">
                      <PlayerPhotoField url={photoUrl} uploading={uploading} onUpload={handlePhotoUpload} onRemove={() => setPhotoUrl(null)} />
                      {/* Selected member chip */}
                      <div className="flex items-center gap-3 p-3 rounded-xl mb-4" style={{ background: 'rgba(163,230,53,0.1)', border: '1px solid rgba(163,230,53,0.2)' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-[13px]"
                          style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                          {(selectedMember.profile?.display_name || '?').charAt(0).toUpperCase()}
                        </div>
                        <p className="flex-1 font-bold text-[14px]" style={{ color: '#a3e635' }}>
                          {selectedMember.profile?.display_name || t.noName}
                        </p>
                        <button type="button" aria-label={t.close} onClick={() => { clearDraft(); setSelectedMember(null) }}
                          className="p-1 rounded" style={{ color: 'var(--muted2)' }}>
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mb-4"><PlayerFields name={name} number={number} age={age} position={position} onName={setName} onNumber={setNumber} onAge={setAge} onPosition={setPosition} labels={{ name: t.playerName, number: copy.number, position: cardCopy.position }} ageLabel={cardCopy.age} ageHint={cardCopy.ageHint} /></div>
                      </fieldset>
                      <button type="submit" disabled={saving || uploading} className="w-full py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition disabled:opacity-40"
                        style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                        {saving ? t.registering : memberLinkFailed ? selectionCopy.retry : t.registerAsPlayer}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* Manual mode */}
              {addMode === 'manual' && (
                <form onSubmit={handleAddManual}>
                  <PlayerPhotoField url={photoUrl} uploading={uploading} onUpload={handlePhotoUpload} onRemove={() => setPhotoUrl(null)} />
                  <p className="text-[12px] mb-4 p-3 rounded-xl" style={{ background: 'var(--card2)', color: 'var(--muted2)' }}>
                    {t.manualAddHint}
                  </p>
                  <PlayerFields name={name} number={number} age={age} position={position} onName={setName} onNumber={setNumber} onAge={setAge} onPosition={setPosition} labels={{ name: t.playerName, number: copy.number, position: cardCopy.position }} ageLabel={cardCopy.age} ageHint={cardCopy.ageHint} />
                  <div className="h-5" />
                  <button type="submit" disabled={saving || uploading} className="w-full py-3.5 rounded-xl font-black text-sm active:scale-[0.98] transition disabled:opacity-40"
                    style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
                    {saving ? t.adding : t.manualAddButton}
                  </button>
                </form>
              )}
            </div>
          </fieldset>
        </Sheet>
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
