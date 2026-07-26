'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, Save, Plus, X, Check, Camera, ImageIcon, Loader2 as Spinner, Trash2, ArrowRightLeft } from 'lucide-react'
import type { Player, Quarter, QuarterRecord, QuarterSubstitution, PositionType } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { QuarterEditSkeleton } from '@/components/Skeleton'

// Formation presets: positions as [x%, y%] for each role
// Field is horizontal: left = our goal, right = opponent goal
const FORMATIONS: Record<string, { label: string; positions: Record<string, [number, number][]> }> = {
  '4-4-2': {
    label: '4-4-2',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 15], [22, 38], [22, 62], [22, 85]],
      MF: [[45, 15], [45, 38], [45, 62], [45, 85]],
      FW: [[72, 35], [72, 65]],
    },
  },
  '4-3-3': {
    label: '4-3-3',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 15], [22, 38], [22, 62], [22, 85]],
      MF: [[45, 25], [45, 50], [45, 75]],
      FW: [[72, 20], [72, 50], [72, 80]],
    },
  },
  '4-2-3-1': {
    label: '4-2-3-1',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 15], [22, 38], [22, 62], [22, 85]],
      MF: [[38, 35], [38, 65], [55, 20], [55, 50], [55, 80]],
      FW: [[75, 50]],
    },
  },
  '3-5-2': {
    label: '3-5-2',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 25], [22, 50], [22, 75]],
      MF: [[42, 10], [42, 30], [42, 50], [42, 70], [42, 90]],
      FW: [[72, 35], [72, 65]],
    },
  },
  '3-4-3': {
    label: '3-4-3',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 25], [22, 50], [22, 75]],
      MF: [[45, 15], [45, 38], [45, 62], [45, 85]],
      FW: [[72, 20], [72, 50], [72, 80]],
    },
  },
  '4-4-1-1': {
    label: '4-4-1-1',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 15], [22, 38], [22, 62], [22, 85]],
      MF: [[42, 15], [42, 38], [42, 62], [42, 85]],
      FW: [[58, 50], [75, 50]],
    },
  },
  '4-5-1': {
    label: '4-5-1',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 15], [22, 38], [22, 62], [22, 85]],
      MF: [[42, 10], [42, 30], [42, 50], [42, 70], [42, 90]],
      FW: [[72, 50]],
    },
  },
  '5-3-2': {
    label: '5-3-2',
    positions: {
      GK: [[8, 50]],
      DF: [[22, 10], [22, 30], [22, 50], [22, 70], [22, 90]],
      MF: [[45, 25], [45, 50], [45, 75]],
      FW: [[72, 35], [72, 65]],
    },
  },
}

interface FieldPlayer {
  id: string
  playerId: string
  player: Player
  positionType: PositionType
  positionX: number
  positionY: number
  rating: number | null
  goals: number
  assists: number
  cleanSheet: boolean
  contribution: number
  praiseText: string
  improvementText: string
  highlightText: string
  mediaUrls: string[]
}

function getRatingStyle(rating: number | null): { textClass: string; accentClass: string } {
  if (rating === null) return { textClass: 'text-gray-400', accentClass: 'accent-gray-400' }
  if (rating <= 3) return { textClass: 'text-red-500', accentClass: 'accent-red-500' }
  if (rating <= 6) return { textClass: 'text-amber-500', accentClass: 'accent-amber-500' }
  return { textClass: 'text-primary-600', accentClass: 'accent-primary-600' }
}

export default function QuarterEditPage() {
  const { t } = useI18n()
  const router = useRouter()
  const params = useParams()
  const matchId = params.id as string
  const quarterNumber = parseInt(params.q as string)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [quarter, setQuarter] = useState<Quarter | null>(null)
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([])
  const [fieldPlayers, setFieldPlayers] = useState<FieldPlayer[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<FieldPlayer | null>(null)
  const [showPlayerPicker, setShowPlayerPicker] = useState(false)
  const [selectedPickerPlayers, setSelectedPickerPlayers] = useState<Set<string>>(new Set())
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [savingPlayer, setSavingPlayer] = useState(false)
  const [substitutions, setSubstitutions] = useState<QuarterSubstitution[]>([])
  const [showSubModal, setShowSubModal] = useState(false)
  const [subMinute, setSubMinute] = useState(0)
  const [subOutId, setSubOutId] = useState('')
  const [subInId, setSubInId] = useState('')
  const [allTeamPlayers, setAllTeamPlayers] = useState<Player[]>([])
  const [savingSub, setSavingSub] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [subPickerMode, setSubPickerMode] = useState<'out' | 'in' | null>(null)

  const fieldRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [matchId, quarterNumber])

  const loadData = async () => {
    // Check permissions first
    const user = await getSessionUser(supabase)
    if (!user) {
      router.push('/login')
      return
    }

    // Load quarter
    const { data: matchData } = await supabase
      .from('matches')
      .select(`
        team_id,
        quarters (
          *,
          quarter_records (
            *,
            player:players (*)
          )
        )
      `)
      .eq('id', matchId)
      .single()

    if (!matchData) {
      toast.error(t.matchLoadFailed)
      router.push('/dashboard')
      return
    }

    // Check if user has quarter edit permission
    const { data: team } = await supabase
      .from('teams')
      .select('user_id')
      .eq('id', matchData.team_id)
      .single()

    let hasPermission = team?.user_id === user.id

    if (!hasPermission) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role, can_edit_quarters')
        .eq('team_id', matchData.team_id)
        .eq('user_id', user.id)
        .single()

      hasPermission = membership?.role === 'coach' || membership?.can_edit_quarters === true
    }

    if (!hasPermission) {
      toast.error(t.noQuarterPermission)
      router.push(`/match/${matchId}`)
      return
    }

    const currentQuarter = matchData.quarters?.find((q: Quarter) => q.quarter_number === quarterNumber)
    if (!currentQuarter) {
      toast.error(t.quarterNotFound)
      router.push(`/match/${matchId}`)
      return
    }

    setQuarter(currentQuarter)

    // Convert existing records to field players
    const existingPlayers: FieldPlayer[] = currentQuarter.quarter_records?.map((r: QuarterRecord) => ({
      id: r.id,
      playerId: r.player_id,
      player: r.player!,
      positionType: r.position_type,
      positionX: parseFloat(r.position_x.toString()),
      positionY: parseFloat(r.position_y.toString()),
      rating: r.rating,
      goals: r.goals,
      assists: r.assists,
      cleanSheet: r.clean_sheet,
      contribution: r.contribution,
      praiseText: r.praise_text || '',
      improvementText: r.improvement_text || '',
      highlightText: r.highlight_text || '',
      mediaUrls: r.media_urls || [],
    })) || []

    setFieldPlayers(existingPlayers)

    // Load substitutions for this quarter
    const { data: subsData } = await supabase
      .from('quarter_substitutions')
      .select('*, player_out:players!player_out_id(*), player_in:players!player_in_id(*)')
      .eq('quarter_id', currentQuarter.id)
      .order('minute')

    if (subsData) {
      setSubstitutions(subsData)
    }

    // Load all team players (for substitution IN picker)
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', matchData.team_id)
      .order('number')

    if (teamPlayers) {
      setAllTeamPlayers(teamPlayers)
    }

    // Load attendees for this match (prioritize attendees over all players)
    const { data: attendeesData } = await supabase
      .from('match_attendees')
      .select('player_id, player:players(*)')
      .eq('match_id', matchId)

    const usedPlayerIds = new Set(existingPlayers.map(fp => fp.playerId))

    if (attendeesData && attendeesData.length > 0) {
      // Use attendees as the available player pool
      const attendeePlayers = attendeesData
        .map(a => a.player as unknown as Player)
        .filter(p => p && !usedPlayerIds.has(p.id))
        .sort((a, b) => (a.number || 99) - (b.number || 99))
      setAvailablePlayers(attendeePlayers)
    } else {
      // Fallback: if no attendees registered, show all team players
      const { data: players } = await supabase
        .from('players')
        .select('*')
        .eq('team_id', matchData.team_id)
        .order('number')

      if (players) {
        setAvailablePlayers(players.filter(p => !usedPlayerIds.has(p.id)))
      }
    }

    setLoading(false)
  }

  const handleFieldClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!showPlayerPicker) return

    const rect = fieldRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    // Show player picker at this position
    setShowPlayerPicker(false)
  }

  const togglePickerPlayer = (playerId: string) => {
    setSelectedPickerPlayers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(playerId)) {
        newSet.delete(playerId)
      } else {
        newSet.add(playerId)
      }
      return newSet
    })
  }

  const addSelectedPlayersToField = () => {
    const playersToAdd = availablePlayers.filter(p => selectedPickerPlayers.has(p.id))

    // Group players by position to calculate per-group index
    const positionCounters: Record<string, number> = { GK: 0, DF: 0, MF: 0, FW: 0 }
    const positionTotals: Record<string, number> = { GK: 0, DF: 0, MF: 0, FW: 0 }
    playersToAdd.forEach(p => { positionTotals[p.default_position]++ })

    const newFieldPlayers: FieldPlayer[] = playersToAdd.map((player, index) => {
      const posIndex = positionCounters[player.default_position]++
      const posTotal = positionTotals[player.default_position]

      let baseX = 50
      let baseY = 50

      if (player.default_position === 'GK') {
        baseX = 8
        baseY = 50
      } else if (player.default_position === 'DF') {
        baseX = 25
        // Evenly distribute defenders vertically
        const spacing = 60 / Math.max(posTotal - 1, 1)
        baseY = posTotal === 1 ? 50 : 20 + posIndex * spacing
      } else if (player.default_position === 'MF') {
        baseX = 50
        const spacing = 60 / Math.max(posTotal - 1, 1)
        baseY = posTotal === 1 ? 50 : 20 + posIndex * spacing
      } else if (player.default_position === 'FW') {
        baseX = 75
        const spacing = 40 / Math.max(posTotal - 1, 1)
        baseY = posTotal === 1 ? 50 : 30 + posIndex * spacing
      }

      return {
        id: `new-${Date.now()}-${index}`,
        playerId: player.id,
        player,
        positionType: player.default_position,
        positionX: baseX,
        positionY: baseY,
        rating: null,
        goals: 0,
        assists: 0,
        cleanSheet: false,
        contribution: 0,
        praiseText: '',
        improvementText: '',
        highlightText: '',
        mediaUrls: [],
      }
    })

    setFieldPlayers([...fieldPlayers, ...newFieldPlayers])
    setAvailablePlayers(availablePlayers.filter(p => !selectedPickerPlayers.has(p.id)))
    setSelectedPickerPlayers(new Set())
    setShowPlayerPicker(false)
  }

  const addPlayerToField = (player: Player, x: number = 50, y: number = 50) => {
    const newFieldPlayer: FieldPlayer = {
      id: `new-${Date.now()}`,
      playerId: player.id,
      player,
      positionType: player.default_position,
      positionX: x,
      positionY: y,
      rating: null,
      goals: 0,
      assists: 0,
      cleanSheet: false,
      contribution: 0,
      praiseText: '',
      improvementText: '',
      highlightText: '',
      mediaUrls: [],
    }

    setFieldPlayers([...fieldPlayers, newFieldPlayer])
    setAvailablePlayers(availablePlayers.filter(p => p.id !== player.id))
    setShowPlayerPicker(false)
  }

  const applyFormation = (formationKey: string) => {
    if (fieldPlayers.length === 0) {
      toast.error(t.addPlayersFirst)
      return
    }

    const formation = FORMATIONS[formationKey]
    if (!formation) return

    // Group field players by position type
    const grouped: Record<string, FieldPlayer[]> = { GK: [], DF: [], MF: [], FW: [] }
    fieldPlayers.forEach(fp => {
      grouped[fp.positionType].push(fp)
    })

    const updated = fieldPlayers.map(fp => {
      const posGroup = grouped[fp.positionType]
      const indexInGroup = posGroup.indexOf(fp)
      const formationSlots = formation.positions[fp.positionType] || []

      if (indexInGroup < formationSlots.length) {
        return {
          ...fp,
          positionX: formationSlots[indexInGroup][0],
          positionY: formationSlots[indexInGroup][1],
        }
      }

      // If more players than slots, spread them evenly
      const totalSlots = formationSlots.length
      if (totalSlots > 0) {
        const lastSlot = formationSlots[totalSlots - 1]
        const offset = (indexInGroup - totalSlots + 1) * 8
        return {
          ...fp,
          positionX: Math.min(90, lastSlot[0] + offset),
          positionY: Math.min(90, lastSlot[1] + offset),
        }
      }

      return fp
    })

    setFieldPlayers(updated)
    if (selectedPlayer) {
      const updatedSelected = updated.find(fp => fp.id === selectedPlayer.id)
      if (updatedSelected) setSelectedPlayer(updatedSelected)
    }
    toast.success(`${formation.label} — ${t.formationApplied}`)
  }

  const openSubModal = () => {
    setSubMinute(0)
    setSubOutId('')
    setSubInId('')
    setSubPickerMode(null)
    setShowSubModal(true)
  }

  const getSubInCandidates = () => {
    // Players on the field (already placed)
    const fieldPlayerIds = new Set(fieldPlayers.map(fp => fp.playerId))
    // Players already subbed IN this quarter
    const subbedInIds = new Set(substitutions.map(s => s.player_in_id))
    // Return team players not on field and not already subbed in
    return allTeamPlayers.filter(p => !fieldPlayerIds.has(p.id) || subbedInIds.has(p.id))
  }

  const handleAddSubstitution = async () => {
    if (!quarter || !subOutId || !subInId) return
    if (subOutId === subInId) {
      toast.error(t.samePlayerSubError)
      return
    }

    setSavingSub(true)
    const { data, error } = await supabase
      .from('quarter_substitutions')
      .insert({
        quarter_id: quarter.id,
        player_out_id: subOutId,
        player_in_id: subInId,
        minute: subMinute,
      })
      .select('*, player_out:players!player_out_id(*), player_in:players!player_in_id(*)')
      .single()

    if (error) {
      toast.error(t.substitutionAddFailed)
      setSavingSub(false)
      return
    }

    setSubstitutions([...substitutions, data].sort((a, b) => a.minute - b.minute))
    setShowSubModal(false)
    setSavingSub(false)

    // Auto-add the IN player to the field for recording stats
    const inPlayer = allTeamPlayers.find(p => p.id === subInId)
    const outFieldPlayer = fieldPlayers.find(fp => fp.playerId === subOutId)
    if (inPlayer && !fieldPlayers.some(fp => fp.playerId === subInId)) {
      const newFieldPlayer: FieldPlayer = {
        id: `new-${Date.now()}`,
        playerId: inPlayer.id,
        player: inPlayer,
        positionType: outFieldPlayer?.positionType || inPlayer.default_position,
        positionX: outFieldPlayer ? Math.min(90, outFieldPlayer.positionX + 3) : 50,
        positionY: outFieldPlayer ? Math.min(90, outFieldPlayer.positionY + 3) : 50,
        rating: null,
        goals: 0,
        assists: 0,
        cleanSheet: false,
        contribution: 0,
        praiseText: '',
        improvementText: '',
        highlightText: '',
        mediaUrls: [],
      }
      setFieldPlayers(prev => [...prev, newFieldPlayer])
      setAvailablePlayers(prev => prev.filter(p => p.id !== inPlayer.id))
    }

    toast.success(t.substitutionAdded)
  }

  const handleDeleteSubstitution = async (subId: string) => {
    const { error } = await supabase
      .from('quarter_substitutions')
      .delete()
      .eq('id', subId)

    if (error) {
      toast.error(t.substitutionDeleteFailed)
      return
    }

    setSubstitutions(substitutions.filter(s => s.id !== subId))
    toast.success(t.substitutionDeleted)
  }

  const removePlayerFromField = (fieldPlayer: FieldPlayer) => {
    setFieldPlayers(fieldPlayers.filter(fp => fp.id !== fieldPlayer.id))
    setAvailablePlayers([...availablePlayers, fieldPlayer.player])
    setSelectedPlayer(null)
  }

  const handlePlayerDrag = (fieldPlayerId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const rect = fieldRef.current?.getBoundingClientRect()
    if (!rect) return

    setDraggingId(fieldPlayerId)

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number

      if ('touches' in moveEvent) {
        moveEvent.preventDefault()
        clientX = moveEvent.touches[0].clientX
        clientY = moveEvent.touches[0].clientY
      } else {
        clientX = moveEvent.clientX
        clientY = moveEvent.clientY
      }

      const x = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100))
      const y = Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100))

      setFieldPlayers(prev =>
        prev.map(fp =>
          fp.id === fieldPlayerId ? { ...fp, positionX: x, positionY: y } : fp
        )
      )
    }

    const handleEnd = () => {
      setDraggingId(null)
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove, { passive: false })
    document.addEventListener('touchend', handleEnd)
  }

  const updateFieldPlayer = (id: string, updates: Partial<FieldPlayer>) => {
    setFieldPlayers(prev =>
      prev.map(fp => (fp.id === id ? { ...fp, ...updates } : fp))
    )
    if (selectedPlayer?.id === id) {
      setSelectedPlayer(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedPlayer) return

    setUploadingMedia(true)
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      const fileExt = file.name.split('.').pop()
      const filePath = `${matchId}/${quarter?.id}/${selectedPlayer.playerId}/${Date.now()}.${fileExt}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('filePath', filePath)

      try {
        const res = await fetch('/api/upload', { method: 'POST', body: formData })
        const result = await res.json()

        if (!res.ok) {
          console.error('Upload error:', result.error)
          toast.error(`${t.uploadFailed}: ${file.name} - ${result.error}`)
          continue
        }

        newUrls.push(result.url)
      } catch (err) {
        console.error('Upload error:', err)
        toast.error(`${t.uploadFailed}: ${file.name}`)
      }
    }

    if (newUrls.length > 0) {
      const updated = [...selectedPlayer.mediaUrls, ...newUrls]
      updateFieldPlayer(selectedPlayer.id, { mediaUrls: updated })
      toast.success(`${newUrls.length}${t.filesUploaded}`)
    }

    setUploadingMedia(false)
  }

  const removeMedia = (url: string) => {
    if (!selectedPlayer) return
    const updated = selectedPlayer.mediaUrls.filter(u => u !== url)
    updateFieldPlayer(selectedPlayer.id, { mediaUrls: updated })
  }

  const handleSave = async () => {
    if (!quarter) return

    setSaving(true)

    try {
      // Delete existing records
      await supabase
        .from('quarter_records')
        .delete()
        .eq('quarter_id', quarter.id)

      // Insert new records
      if (fieldPlayers.length > 0) {
        const records = fieldPlayers.map(fp => ({
          quarter_id: quarter.id,
          player_id: fp.playerId,
          position_type: fp.positionType,
          position_x: fp.positionX,
          position_y: fp.positionY,
          rating: fp.rating,
          goals: fp.goals,
          assists: fp.assists,
          clean_sheet: fp.cleanSheet,
          contribution: fp.contribution,
          praise_text: fp.praiseText || null,
          improvement_text: fp.improvementText || null,
          highlight_text: fp.highlightText || null,
          media_urls: fp.mediaUrls.length > 0 ? fp.mediaUrls : null,
        }))

        const { error } = await supabase
          .from('quarter_records')
          .insert(records)

        if (error) throw error
      }

      // Reload data to get server-generated IDs
      await loadData()
      toast.success(t.quarterAllSaved)
    } catch (error) {
      toast.error(t.saveFailed)
    } finally {
      setSaving(false)
    }
  }

  const handleSavePlayer = async (fp: FieldPlayer) => {
    if (!quarter) return

    setSavingPlayer(true)

    try {
      const record = {
        quarter_id: quarter.id,
        player_id: fp.playerId,
        position_type: fp.positionType,
        position_x: fp.positionX,
        position_y: fp.positionY,
        rating: fp.rating,
        goals: fp.goals,
        assists: fp.assists,
        clean_sheet: fp.cleanSheet,
        contribution: fp.contribution,
        praise_text: fp.praiseText || null,
        improvement_text: fp.improvementText || null,
        highlight_text: fp.highlightText || null,
        media_urls: fp.mediaUrls.length > 0 ? fp.mediaUrls : null,
      }

      const isNew = fp.id.startsWith('new-')

      if (isNew) {
        const { data, error } = await supabase
          .from('quarter_records')
          .insert(record)
          .select()
          .single()

        if (error) throw error

        // Update local state with real ID
        setFieldPlayers(prev =>
          prev.map(p => p.id === fp.id ? { ...p, id: data.id } : p)
        )
        setSelectedPlayer(prev => prev?.id === fp.id ? { ...prev, id: data.id } : prev)
      } else {
        const { error } = await supabase
          .from('quarter_records')
          .update(record)
          .eq('id', fp.id)

        if (error) throw error
      }

      toast.success(`${fp.player.name} — ${t.savedShort}`)
    } catch (error) {
      toast.error(t.playerSaveFailed)
    } finally {
      setSavingPlayer(false)
    }
  }

  if (loading) {
    return <QuarterEditSkeleton />
  }

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 12 }
  const textareaStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 10 }

  return (
    <div className="light min-h-screen pb-32" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href={`/match/${matchId}`} className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-base font-black text-[color:var(--text)]">{quarterNumber}{t.quarterEditTitle.replace('{n}', String(quarterNumber))}</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-black active:scale-95 transition disabled:opacity-50"
            style={{ background: 'var(--navy)', color: 'var(--accent)' }}
          >
            <Save className="w-4 h-4" />
            {saving ? t.saving : t.save}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Soccer Field */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-[color:var(--text)] text-sm">{t.formationPlacement}</h2>
            <div className="flex items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    applyFormation(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
                className="px-2 py-1.5 rounded-lg text-sm outline-none"
                style={{ background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)' }}
              >
                <option value="" disabled>{t.formation}</option>
                {Object.entries(FORMATIONS).map(([key, f]) => (
                  <option key={key} value={key}>{f.label}</option>
                ))}
              </select>
              {availablePlayers.length > 0 && (
                <button
                  onClick={() => setShowPlayerPicker(!showPlayerPicker)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
                  style={{ background: 'var(--chip)', color: 'var(--text)' }}
                >
                  <Plus className="w-4 h-4" />
                  {t.addPlayer}
                </button>
              )}
            </div>
          </div>

          {/* Player Picker */}
          {showPlayerPicker && (
            <div className="mb-4 p-4 rounded-xl" style={cardStyle}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-[color:var(--text)]/60">
                  {t.selectPlayersToAdd}
                  {selectedPickerPlayers.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--chip)', color: 'var(--text)' }}>
                      {t.selectedCount.replace('{n}', String(selectedPickerPlayers.size))}
                    </span>
                  )}
                </p>
                <button onClick={() => { setShowPlayerPicker(false); setSelectedPickerPlayers(new Set()); }} className="p-1">
                  <X className="w-5 h-5 text-[color:var(--text)]/40" />
                </button>
              </div>
              <div className="space-y-3 mb-3">
                {(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map(posType => {
                  const posPlayers = availablePlayers.filter(p => p.default_position === posType)
                  if (posPlayers.length === 0) return null
                  return (
                    <div key={posType}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: POSITION_COLORS[posType] }} />
                        <span className="text-xs font-semibold" style={{ color: 'var(--muted2)' }}>{POSITION_LABELS[posType]}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {posPlayers.map(player => {
                          const isSelected = selectedPickerPlayers.has(player.id)
                          return (
                            <button
                              key={player.id}
                              onClick={() => togglePickerPlayer(player.id)}
                              className="flex items-center gap-2 p-2 rounded-lg text-left transition-all"
                              style={{
                                background: isSelected ? 'var(--chip)' : 'var(--card2)',
                                border: isSelected ? '1px solid var(--accent)' : '1px solid var(--line)',
                              }}
                            >
                              <div className="relative">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-[color:var(--text)] text-xs font-bold"
                                  style={{ backgroundColor: POSITION_COLORS[player.default_position] }}
                                >
                                  {player.number || '-'}
                                </div>
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'var(--navy)' }}>
                                    <Check className="w-3 h-3" style={{ color: 'var(--text)' }} />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[color:var(--text)] truncate">{player.name}</p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
              {selectedPickerPlayers.size > 0 && (
                <button
                  onClick={addSelectedPlayersToField}
                  className="w-full py-2.5 rounded-lg font-medium transition-colors"
                  style={{ background: 'var(--navy)', color: 'var(--accent)' }}
                >
                  {t.addNPlayers.replace('{n}', String(selectedPickerPlayers.size))}
                </button>
              )}
            </div>
          )}

          {/* Field */}
          <div
            ref={fieldRef}
            className="relative w-full aspect-[3/2] rounded-xl overflow-hidden touch-none select-none"
            style={{ background: 'linear-gradient(180deg,#0e2018,#0a1a13)', border: '1px solid #143325' }}
          >
            {/* Grass stripe pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.015) 20px, rgba(255,255,255,0.015) 40px)',
            }} />

            {/* Field outline */}
            <div className="absolute inset-3 border border-white/20 rounded" />
            {/* Center line */}
            <div className="absolute left-1/2 top-3 bottom-3 w-px bg-white/20" />
            {/* Center circle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-white/20" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/20" />
            {/* Left penalty area */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border border-white/20 border-l-0" />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[6%] h-[30%] border border-white/20 border-l-0" />
            <div className="absolute left-[14%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[18%] border border-white/20 border-l-0 rounded-r" style={{ background: 'rgba(255,255,255,0.04)' }} />
            {/* Right penalty area */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border border-white/20 border-r-0" />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[6%] h-[30%] border border-white/20 border-r-0" />
            <div className="absolute right-[14%] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-white/20" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-[18%] border border-white/20 border-r-0 rounded-l" style={{ background: 'rgba(255,255,255,0.04)' }} />
            {/* Corner arcs */}
            <div className="absolute left-3 top-3 w-6 h-6 border-b border-r border-white/20 rounded-br-full" />
            <div className="absolute right-3 top-3 w-6 h-6 border-b border-l border-white/20 rounded-bl-full" />
            <div className="absolute left-3 bottom-3 w-6 h-6 border-t border-r border-white/20 rounded-tr-full" />
            <div className="absolute right-3 bottom-3 w-6 h-6 border-t border-l border-white/20 rounded-tl-full" />

            {/* Players */}
            {fieldPlayers.map(fp => {
              const subOut = substitutions.find(s => s.player_out_id === fp.playerId)
              const subIn = substitutions.find(s => s.player_in_id === fp.playerId)
              return (
                <div
                  key={fp.id}
                  className={`absolute flex flex-col items-center cursor-grab active:cursor-grabbing touch-none transition-transform ${draggingId === fp.id ? 'z-20' : ''}`}
                  style={{
                    left: `${fp.positionX}%`,
                    top: `${fp.positionY}%`,
                    transform: draggingId === fp.id
                      ? 'translate(-50%, calc(-50% - 28px)) scale(1.15)'
                      : 'translate(-50%, -50%)',
                  }}
                  onMouseDown={(e) => handlePlayerDrag(fp.id, e)}
                  onTouchStart={(e) => handlePlayerDrag(fp.id, e)}
                  onClick={() => setSelectedPlayer(fp)}
                >
                  {subIn && (
                    <span className="absolute -top-1.5 -left-2 px-1 py-0.5 text-[7px] font-bold text-black rounded shadow z-10" style={{ background: 'var(--accent)' }}>
                      IN {subIn.minute}&apos;
                    </span>
                  )}
                  {subOut && (
                    <span className="absolute -top-1.5 -right-2 px-1 py-0.5 bg-red-500 text-[7px] font-bold text-white rounded shadow z-10">
                      OUT {subOut.minute}&apos;
                    </span>
                  )}
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-transform ${
                      draggingId === fp.id ? 'shadow-2xl' : ''
                    } ${subOut ? 'opacity-60' : ''}`}
                    style={{
                      backgroundColor: POSITION_COLORS[fp.positionType],
                      outline: draggingId === fp.id ? '3px solid rgba(255,255,255,0.8)' : selectedPlayer?.id === fp.id ? '3px solid var(--accent)' : 'none',
                      transform: selectedPlayer?.id === fp.id ? 'scale(1.1)' : 'scale(1)',
                    }}
                  >
                    {fp.player.number || '?'}
                  </div>
                  <span className={`mt-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded font-medium whitespace-nowrap ${subOut ? 'line-through opacity-70' : ''}`}>
                    {fp.player.name}
                  </span>
                </div>
              )
            })}

            {fieldPlayers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="px-4 py-2 rounded-lg text-sm" style={{ background: 'rgba(0,0,0,0.5)', color: 'var(--muted2)' }}>{t.dragToPlace}</p>
              </div>
            )}
          </div>
          <p className="text-center text-sm mt-2" style={{ color: 'var(--muted2)' }}>
            {t.dragToAdjust}
          </p>
        </section>

        {/* Substitutions Section */}
        <section style={cardStyle} className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-[color:var(--text)] text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-[color:var(--text)]/40" />
              {t.substitutionRecords} ({substitutions.length})
            </h2>
            <button
              onClick={openSubModal}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: '#fef0c7', color: '#b54708' }}
            >
              <Plus className="w-4 h-4" />
              {t.addSubstitution}
            </button>
          </div>

          {substitutions.length > 0 ? (
            <div className="space-y-2">
              {substitutions.map(sub => (
                <div key={sub.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--card2)' }}>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-0.5 rounded text-xs font-bold text-[color:var(--text)]/60" style={{ background: 'var(--line)' }}>
                      {sub.minute}&apos;
                    </span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[color:var(--text)] text-[9px] font-bold"
                        style={{ backgroundColor: POSITION_COLORS[sub.player_out?.default_position || 'MF'] }}
                      >
                        {sub.player_out?.number || '?'}
                      </div>
                      <span className="text-red-400 font-medium">{sub.player_out?.name}</span>
                    </div>
                    <span className="text-[color:var(--text)]/20">→</span>
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[color:var(--text)] text-[9px] font-bold"
                        style={{ backgroundColor: POSITION_COLORS[sub.player_in?.default_position || 'MF'] }}
                      >
                        {sub.player_in?.number || '?'}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text)' }}>{sub.player_in?.name}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSubstitution(sub.id)}
                    className="p-1 text-[color:var(--text)]/20 hover:text-red-400 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--muted2)' }}>{t.noSubstitutions}</p>
          )}
        </section>

        {/* Substitution Modal */}
        {showSubModal && (
          <div className="fixed inset-0 z-50 flex items-end" onClick={() => { setShowSubModal(false); setSubPickerMode(null) }}>
            <div className="absolute inset-0 bg-black/70" />
            <div
              className="relative w-full rounded-t-3xl px-5 pt-4 pb-8 safe-bottom max-h-[90vh] flex flex-col"
              style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: 'var(--line)' }} />
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-[color:var(--text)] text-lg">{t.addSubstitution}</h3>
                <button onClick={() => { setShowSubModal(false); setSubPickerMode(null) }} className="p-1 text-[color:var(--text)]/40 hover:text-[color:var(--text)] rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {subPickerMode ? (
                <div className="flex flex-col flex-1 min-h-0">
                  <p className="text-sm font-medium mb-3 flex items-center gap-2 text-[color:var(--text)]/70">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold`} style={subPickerMode === 'out' ? { background: '#2a0a0a', color: '#ef4444' } : { background: 'var(--chip)', color: 'var(--text)' }}>
                      {subPickerMode === 'out' ? 'OUT' : 'IN'}
                    </span>
                    {t.selectPlayer}
                  </p>
                  <div className="overflow-y-auto flex-1 space-y-1.5 mb-4">
                    {(subPickerMode === 'out'
                      ? fieldPlayers.map(fp => ({ id: fp.playerId, player: fp.player, positionType: fp.positionType }))
                      : getSubInCandidates().map(p => ({ id: p.id, player: p, positionType: p.default_position as PositionType }))
                    ).map((fp) => {
                      const id = fp.id
                      const isSelected = subPickerMode === 'out' ? subOutId === id : subInId === id
                      return (
                        <button
                          key={id}
                          onClick={() => {
                            if (subPickerMode === 'out') setSubOutId(id)
                            else setSubInId(id)
                            setSubPickerMode(null)
                          }}
                          className="w-full flex items-center gap-3 p-3 rounded-xl transition"
                          style={{
                            border: isSelected ? '2px solid var(--accent)' : '2px solid var(--line)',
                            background: isSelected ? 'var(--chip)' : 'var(--card2)',
                          }}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-[color:var(--text)] font-bold flex-shrink-0"
                            style={{ backgroundColor: POSITION_COLORS[fp.positionType] }}
                          >
                            {fp.player.number || '?'}
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-[color:var(--text)]">{fp.player.name}</p>
                            <p className="text-xs" style={{ color: 'var(--muted2)' }}>{POSITION_LABELS[fp.positionType]}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.substitutionTime}</label>
                    <input
                      type="number"
                      min={0}
                      value={subMinute}
                      onChange={(e) => setSubMinute(parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-3 outline-none text-base"
                      style={inputStyle}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 text-red-400">OUT</label>
                    <button
                      onClick={() => setSubPickerMode('out')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition"
                      style={{
                        border: subOutId ? '2px solid #ef4444' : '2px solid var(--line)',
                        background: subOutId ? '#2a0a0a' : 'var(--card2)',
                      }}
                    >
                      {subOutId ? (() => {
                        const fp = fieldPlayers.find(p => p.playerId === subOutId)
                        return fp ? (
                          <>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[color:var(--text)] text-xs font-bold flex-shrink-0" style={{ backgroundColor: POSITION_COLORS[fp.positionType] }}>
                              {fp.player.number || '?'}
                            </div>
                            <span className="font-medium text-[color:var(--text)]">{fp.player.name}</span>
                          </>
                        ) : <span style={{ color: 'var(--muted2)' }}>{t.selectPlayer}</span>
                      })() : <span style={{ color: 'var(--muted2)' }}>{t.selectPlayer}</span>}
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text)' }}>IN</label>
                    <button
                      onClick={() => setSubPickerMode('in')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition"
                      style={{
                        border: subInId ? '2px solid var(--accent)' : '2px solid var(--line)',
                        background: subInId ? 'var(--chip)' : 'var(--card2)',
                      }}
                    >
                      {subInId ? (() => {
                        const p = getSubInCandidates().find(p => p.id === subInId)
                        return p ? (
                          <>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-[color:var(--text)] text-xs font-bold flex-shrink-0" style={{ backgroundColor: POSITION_COLORS[p.default_position] }}>
                              {p.number || '?'}
                            </div>
                            <span className="font-medium text-[color:var(--text)]">{p.name}</span>
                          </>
                        ) : <span style={{ color: 'var(--muted2)' }}>{t.selectPlayer}</span>
                      })() : <span style={{ color: 'var(--muted2)' }}>{t.selectPlayer}</span>}
                    </button>
                  </div>

                  <button
                    onClick={handleAddSubstitution}
                    disabled={!subOutId || !subInId || savingSub}
                    className="w-full py-4 rounded-2xl font-bold disabled:opacity-40 text-base"
                    style={{ background: 'var(--navy)', color: 'var(--accent)' }}
                  >
                    {savingSub ? t.saving : t.addSubstitution}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Selected Player Stats */}
        {selectedPlayer && (
          <section style={cardStyle} className="p-4">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-[color:var(--text)] font-bold"
                  style={{ backgroundColor: POSITION_COLORS[selectedPlayer.positionType] }}
                >
                  {selectedPlayer.player.number || '?'}
                </div>
                <div>
                  <p className="font-bold text-[color:var(--text)]">{selectedPlayer.player.name}</p>
                  <select
                    value={selectedPlayer.positionType}
                    onChange={(e) =>
                      updateFieldPlayer(selectedPlayer.id, {
                        positionType: e.target.value as PositionType,
                      })
                    }
                    className="text-sm outline-none p-0"
                    style={{ background: 'transparent', color: 'var(--muted2)', border: 'none' }}
                  >
                    {(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map(pos => (
                      <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => removePlayerFromField(selectedPlayer)}
                className="p-2 text-red-400 hover:text-red-300 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rating Slider */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted2)' }}>{t.rating}</label>
                <span className="font-display text-3xl tabular-nums" style={{ color: 'var(--text)' }}>
                  {selectedPlayer.rating !== null ? selectedPlayer.rating.toFixed(1) : '−'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={selectedPlayer.rating ?? 0}
                onChange={(e) =>
                  updateFieldPlayer(selectedPlayer.id, {
                    rating: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: 'var(--text)', background: 'var(--line)' }}
              />
              <div className="flex justify-between text-xs mt-1.5">
                <span className="text-red-400">0</span>
                <span className="text-amber-400">5</span>
                <span style={{ color: 'var(--text)' }}>10</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.goals}</label>
                <div className="flex items-center rounded-xl overflow-hidden h-12" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
                  <button
                    onClick={() => updateFieldPlayer(selectedPlayer.id, { goals: Math.max(0, selectedPlayer.goals - 1) })}
                    className="w-12 h-full flex items-center justify-center text-xl font-bold text-[color:var(--text)]/40 active:bg-white/5 flex-shrink-0"
                  >−</button>
                  <span className="flex-1 text-center text-xl font-bold text-[color:var(--text)]">{selectedPlayer.goals}</span>
                  <button
                    onClick={() => updateFieldPlayer(selectedPlayer.id, { goals: selectedPlayer.goals + 1 })}
                    className="w-12 h-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                    style={{ color: 'var(--text)' }}
                  >+</button>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.assistsLabel}</label>
                <div className="flex items-center rounded-xl overflow-hidden h-12" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
                  <button
                    onClick={() => updateFieldPlayer(selectedPlayer.id, { assists: Math.max(0, selectedPlayer.assists - 1) })}
                    className="w-12 h-full flex items-center justify-center text-xl font-bold text-[color:var(--text)]/40 active:bg-white/5 flex-shrink-0"
                  >−</button>
                  <span className="flex-1 text-center text-xl font-bold text-[color:var(--text)]">{selectedPlayer.assists}</span>
                  <button
                    onClick={() => updateFieldPlayer(selectedPlayer.id, { assists: selectedPlayer.assists + 1 })}
                    className="w-12 h-full flex items-center justify-center text-xl font-bold flex-shrink-0"
                    style={{ color: 'var(--text)' }}
                  >+</button>
                </div>
              </div>
            </div>

            {/* 클린시트 / 기여도 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => updateFieldPlayer(selectedPlayer.id, { cleanSheet: !selectedPlayer.cleanSheet })}
                className="h-12 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition"
                style={{
                  background: selectedPlayer.cleanSheet ? 'var(--chip)' : 'var(--card2)',
                  border: selectedPlayer.cleanSheet ? '1px solid var(--accent)' : '1px solid var(--line)',
                  color: selectedPlayer.cleanSheet ? 'var(--navy)' : 'var(--text-faint)',
                }}
              >
                <Check className="w-4 h-4" />
                {t.cleanSheet}
              </button>
              <button
                onClick={() => updateFieldPlayer(selectedPlayer.id, { contribution: selectedPlayer.contribution > 0 ? 0 : 1 })}
                className="h-12 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition"
                style={{
                  background: selectedPlayer.contribution > 0 ? '#1a1200' : 'var(--card2)',
                  border: selectedPlayer.contribution > 0 ? '1px solid #f59e0b' : '1px solid var(--line)',
                  color: selectedPlayer.contribution > 0 ? '#f59e0b' : 'var(--text-faint)',
                }}
              >
                <Check className="w-4 h-4" />
                {t.contribution}
              </button>
            </div>

            {/* Review Section */}
            <div className="mt-5 pt-5" style={{ borderTop: '1px solid var(--line)' }}>
              <h3 className="font-bold text-[color:var(--text)] mb-3">{t.playerReview}</h3>

              {/* Media Upload */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-2" style={{ color: 'var(--muted2)' }}>{t.photoVideo}</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: 'var(--card2)', color: 'var(--text2)' }}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {t.gallery}
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ background: 'var(--card2)', color: 'var(--text2)' }}
                  >
                    <Camera className="w-4 h-4" />
                    {t.takePhoto}
                  </button>
                  {uploadingMedia && <Spinner className="w-5 h-5 animate-spin self-center" style={{ color: 'var(--text)' }} />}
                </div>
                <input ref={mediaInputRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => handleMediaUpload(e.target.files)} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleMediaUpload(e.target.files)} />
                {selectedPlayer.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedPlayer.mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square" style={{ background: 'var(--card2)' }}>
                        {url.match(/\.(mp4|mov|webm)/i) ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={() => removeMedia(url)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-[color:var(--text)] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mb-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text)' }}>{t.praiseLabel}</label>
                <textarea
                  value={selectedPlayer.praiseText}
                  onChange={(e) => updateFieldPlayer(selectedPlayer.id, { praiseText: e.target.value })}
                  placeholder={t.praisePlaceholder}
                  rows={2}
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  style={textareaStyle}
                />
              </div>

              <div className="mb-3">
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5 text-amber-400">{t.improvementLabel}</label>
                <textarea
                  value={selectedPlayer.improvementText}
                  onChange={(e) => updateFieldPlayer(selectedPlayer.id, { improvementText: e.target.value })}
                  placeholder={t.improvementPlaceholder}
                  rows={2}
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  style={textareaStyle}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text)' }}>{t.highlightLabel}</label>
                <textarea
                  value={selectedPlayer.highlightText}
                  onChange={(e) => updateFieldPlayer(selectedPlayer.id, { highlightText: e.target.value })}
                  placeholder={t.highlightPlaceholder}
                  rows={2}
                  className="w-full px-3 py-2 text-sm outline-none resize-none"
                  style={textareaStyle}
                />
              </div>

              <p className="text-xs mt-4 text-center" style={{ color: 'var(--muted2)' }}>{t.saveAllNote}</p>
            </div>
          </section>
        )}

        {/* All Players List */}
        {fieldPlayers.length > 0 && (
          <section>
            <h2 className="font-bold text-[color:var(--text)] text-sm mb-3">{t.placedPlayers} ({fieldPlayers.length})</h2>
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {fieldPlayers.map((fp, i) => (
                <button
                  key={fp.id}
                  onClick={() => setSelectedPlayer(fp)}
                  className="w-full p-4 flex items-center justify-between text-left transition"
                  style={{
                    borderBottom: i < fieldPlayers.length - 1 ? '1px solid var(--line)' : 'none',
                    background: selectedPlayer?.id === fp.id ? 'var(--chip)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[color:var(--text)] text-sm font-bold"
                      style={{ backgroundColor: POSITION_COLORS[fp.positionType] }}
                    >
                      {fp.player.number || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-[color:var(--text)]">{fp.player.name}</p>
                      <p className="text-sm" style={{ color: 'var(--muted2)' }}>
                        {POSITION_LABELS[fp.positionType]}
                        {fp.goals > 0 && ` | ${t.goalsCount.replace('{n}', String(fp.goals))}`}
                        {fp.assists > 0 && ` ${fp.assists}${t.assistShort}`}
                      </p>
                    </div>
                  </div>
                  <div className="font-display text-xl tabular-nums" style={{ color: 'var(--text)' }}>
                    {fp.rating?.toFixed(1) || '-'}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
