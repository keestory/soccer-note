'use client'

import { useEffect, useState, useRef, useSyncExternalStore } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient, getSessionUser, authHeader } from '@/lib/supabase'
import { ArrowLeft, Save, Plus, X, Check, Camera, ImageIcon, Loader2 as Spinner, Trash2, ArrowRightLeft } from 'lucide-react'
import type { Player, Quarter, QuarterRecord, QuarterSubstitution, PositionType } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'
import { LinePitch } from '@/components/design/LinePitch'
import { getDesignCopy } from '@/lib/design-copy'
import { QuarterEditSkeleton } from '@/components/Skeleton'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { saveQuarterRecords, QuarterSaveError, type QuarterRecordInput, type SavedRecordIdentity } from '@/lib/quarter-save'
import { getQuarterSaveCopy } from '@/lib/quarter-save-copy'
import { applySavedQuarterRecords, beginTeamWrite, getDataContext, getServerSnapshot, getStore, isDataContextCurrent, observeDataAuth, subscribe, type DataContext } from '@/lib/dataStore'

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

function toRecord(quarterId: string, fp: FieldPlayer): QuarterRecordInput {
  return {
    quarter_id: quarterId, player_id: fp.playerId,
    position_type: fp.positionType, position_x: fp.positionX, position_y: fp.positionY,
    rating: fp.rating, goals: fp.goals, assists: fp.assists,
    clean_sheet: fp.cleanSheet, contribution: fp.contribution,
    praise_text: fp.praiseText || null, improvement_text: fp.improvementText || null,
    highlight_text: fp.highlightText || null, media_urls: fp.mediaUrls.length ? fp.mediaUrls : null,
  }
}

function draftKey(players: FieldPlayer[]) {
  return JSON.stringify(players.map(player => toRecord('', player)).sort((a, b) => a.player_id.localeCompare(b.player_id)))
}

export default function QuarterEditPage() {
  const { t, locale } = useI18n()
  const copy = getDesignCopy(locale)
  const saveCopy = getQuarterSaveCopy(locale)
  const store = useSyncExternalStore(subscribe, getStore, getServerSnapshot)
  const editorContext = useRef<DataContext>(getDataContext())
  const [positionPlayerId, setPositionPlayerId] = useState<string | null>(null)
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
  const [savedDraft, setSavedDraft] = useState<string | null>(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [substitutions, setSubstitutions] = useState<QuarterSubstitution[]>([])
  const [showSubModal, setShowSubModal] = useState(false)
  const [subMinute, setSubMinute] = useState(0)
  const [subOutId, setSubOutId] = useState('')
  const [subInId, setSubInId] = useState('')
  const [allTeamPlayers, setAllTeamPlayers] = useState<Player[]>([])
  const [savingSub, setSavingSub] = useState(false)
  const [subPickerMode, setSubPickerMode] = useState<'out' | 'in' | null>(null)

  const mediaInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const recordRef = useRef<HTMLElement>(null)
  const baselineRef = useRef<SavedRecordIdentity[]>([])
  const teamIdRef = useRef<string | null>(null)
  const generationRef = useRef(0)
  const operationRef = useRef<{ kind: 'save' | 'upload' | 'substitution'; generation: number } | null>(null)
  const activeWriteRef = useRef<ReturnType<typeof beginTeamWrite> | null>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const failedSaveRef = useRef(false)
  const supabase = createClient()
  const busy = saving || uploadingMedia || savingSub
  const dirty = savedDraft !== null && draftKey(fieldPlayers) !== savedDraft
  useEffect(() => { observeDataAuth() }, [])

  useEffect(() => {
    if (!dirty && !busy && !saveFailed) return
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [dirty, busy, saveFailed])

  useEffect(() => {
    if (selectedPlayer) {
      recordRef.current?.scrollIntoView({ block: 'start' })
      recordRef.current?.focus({ preventScroll: true })
    }
  }, [selectedPlayer?.id])

  useEffect(() => {
    const generation = ++generationRef.current
    editorContext.current = getDataContext()
    operationRef.current = null
    setLoading(true)
    setSaving(false)
    setUploadingMedia(false)
    setSavingSub(false)
    setSavedDraft(null)
    setSaveFailed(false)
    failedSaveRef.current = false
    setSelectedPlayer(null)
    setShowLeaveConfirm(false)
    setShowPlayerPicker(false)
    setShowSubModal(false)
    baselineRef.current = []
    teamIdRef.current = null
    loadData(generation)
    return () => {
      generationRef.current = generation + 1
      uploadAbortRef.current?.abort()
      activeWriteRef.current?.finish()
      activeWriteRef.current = null
      operationRef.current = null
    }
  }, [matchId, quarterNumber, store.contextVersion])

  const loadData = async (generation: number) => {
    const context = editorContext.current
    const isCurrent = () => generationRef.current === generation && isDataContextCurrent(context)
    setPositionPlayerId(null)
    // Check permissions first
    const user = await getSessionUser(supabase)
    if (!isCurrent()) return
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

    if (!isCurrent()) return

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

    if (!isCurrent()) return

    let hasPermission = team?.user_id === user.id

    if (!hasPermission) {
      const { data: membership } = await supabase
        .from('team_members')
        .select('role, can_edit_quarters')
        .eq('team_id', matchData.team_id)
        .eq('user_id', user.id)
        .single()

      if (!isCurrent()) return

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
    teamIdRef.current = matchData.team_id
    baselineRef.current = (currentQuarter.quarter_records ?? []).map((record: QuarterRecord) => ({ id: record.id, quarter_id: record.quarter_id, player_id: record.player_id }))

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
    setSavedDraft(draftKey(existingPlayers))

    // Load substitutions for this quarter
    const { data: subsData } = await supabase
      .from('quarter_substitutions')
      .select('*, player_out:players!player_out_id(*), player_in:players!player_in_id(*)')
      .eq('quarter_id', currentQuarter.id)
      .order('minute')

    if (!isCurrent()) return

    if (subsData) {
      setSubstitutions(subsData)
    }

    // Load all team players (for substitution IN picker)
    const { data: teamPlayers } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', matchData.team_id)
      .order('number')

    if (!isCurrent()) return

    if (teamPlayers) {
      setAllTeamPlayers(teamPlayers)
    }

    // Load attendees for this match (prioritize attendees over all players)
    const { data: attendeesData } = await supabase
      .from('match_attendees')
      .select('player_id, player:players(*)')
      .eq('match_id', matchId)

    if (!isCurrent()) return

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

      if (!isCurrent()) return

      if (players) {
        setAvailablePlayers(players.filter(p => !usedPlayerIds.has(p.id)))
      }
    }

    setLoading(false)
  }

  const togglePickerPlayer = (playerId: string) => {
    if (operationRef.current || failedSaveRef.current) return
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
    if (operationRef.current || failedSaveRef.current) return
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
    if (operationRef.current || failedSaveRef.current) return
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
    if (operationRef.current || failedSaveRef.current) return
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
    if (!quarter || !subOutId || !subInId || operationRef.current || failedSaveRef.current || !isDataContextCurrent(editorContext.current)) return
    if (subOutId === subInId) {
      toast.error(t.samePlayerSubError)
      return
    }

    const operation = { kind: 'substitution' as const, generation: generationRef.current }
    operationRef.current = operation
    const context = editorContext.current
    const isCurrent = () => operationRef.current === operation && generationRef.current === operation.generation && isDataContextCurrent(context)
    setSavingSub(true)
    try {
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

      if (!isCurrent()) return
      if (error) throw error

      setSubstitutions([...substitutions, data].sort((a, b) => a.minute - b.minute))
      setShowSubModal(false)

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
    } catch {
      if (isCurrent()) toast.error(t.substitutionAddFailed)
    } finally {
      if (isCurrent()) {
        operationRef.current = null
        setSavingSub(false)
      }
    }
  }

  const handleDeleteSubstitution = async (subId: string) => {
    if (operationRef.current || failedSaveRef.current || !quarter || !isDataContextCurrent(editorContext.current)) return
    const operation = { kind: 'substitution' as const, generation: generationRef.current }
    operationRef.current = operation
    const context = editorContext.current
    const isCurrent = () => operationRef.current === operation && generationRef.current === operation.generation && isDataContextCurrent(context)
    setSavingSub(true)
    try {
      const { error } = await supabase
        .from('quarter_substitutions')
        .delete()
        .eq('id', subId)
        .eq('quarter_id', quarter.id)

      if (!isCurrent()) return
      if (error) throw error

      setSubstitutions(substitutions.filter(s => s.id !== subId))
      toast.success(t.substitutionDeleted)
    } catch {
      if (isCurrent()) toast.error(t.substitutionDeleteFailed)
    } finally {
      if (isCurrent()) {
        operationRef.current = null
        setSavingSub(false)
      }
    }
  }

  const removePlayerFromField = (fieldPlayer: FieldPlayer) => {
    if (operationRef.current || failedSaveRef.current) return
    setPositionPlayerId(null)
    setFieldPlayers(fieldPlayers.filter(fp => fp.id !== fieldPlayer.id))
    setAvailablePlayers([...availablePlayers, fieldPlayer.player])
    setSelectedPlayer(null)
  }

  const updateFieldPlayer = (id: string, updates: Partial<FieldPlayer>) => {
    if (operationRef.current || failedSaveRef.current) return
    setFieldPlayers(prev =>
      prev.map(fp => (fp.id === id ? { ...fp, ...updates } : fp))
    )
    if (selectedPlayer?.id === id) {
      setSelectedPlayer(prev => prev ? { ...prev, ...updates } : null)
    }
  }

  const handleMediaUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !selectedPlayer || operationRef.current || failedSaveRef.current || !isDataContextCurrent(editorContext.current)) return

    const operation = { kind: 'upload' as const, generation: generationRef.current }
    operationRef.current = operation
    const controller = new AbortController()
    uploadAbortRef.current = controller
    const player = selectedPlayer
    const context = editorContext.current
    const isCurrent = () => operationRef.current === operation && generationRef.current === operation.generation && isDataContextCurrent(context)
    setUploadingMedia(true)
    const newUrls: string[] = []

    for (const file of Array.from(files)) {
      if (!isCurrent()) break
      const fileExt = file.name.split('.').pop()
      const filePath = `${matchId}/${quarter?.id}/${player.playerId}/${Date.now()}.${fileExt}`

      const formData = new FormData()
      formData.append('file', file)
      formData.append('filePath', filePath)

      try {
        const res = await fetch('/api/upload', { method: 'POST', headers: await authHeader(supabase), body: formData, signal: controller.signal })
        const result = await res.json()
        if (!isCurrent()) break

        if (!res.ok) {
          toast.error(`${t.uploadFailed}: ${file.name} - ${result.error}`)
          continue
        }

        newUrls.push(result.url)
      } catch {
        if (!isCurrent() || controller.signal.aborted) break
        toast.error(`${t.uploadFailed}: ${file.name}`)
      }
    }

    if (!isCurrent()) return
    if (newUrls.length > 0) {
      const updated = [...player.mediaUrls, ...newUrls]
      setFieldPlayers(previous => previous.map(item => item.playerId === player.playerId ? { ...item, mediaUrls: updated } : item))
      setSelectedPlayer(previous => previous?.playerId === player.playerId ? { ...previous, mediaUrls: updated } : previous)
      toast.success(`${newUrls.length}${t.filesUploaded}`)
    }

    operationRef.current = null
    uploadAbortRef.current = null
    if (mediaInputRef.current) mediaInputRef.current.value = ''
    if (cameraInputRef.current) cameraInputRef.current.value = ''
    setUploadingMedia(false)
  }

  const removeMedia = (url: string) => {
    if (!selectedPlayer) return
    const updated = selectedPlayer.mediaUrls.filter(u => u !== url)
    updateFieldPlayer(selectedPlayer.id, { mediaUrls: updated })
  }

  const handleSave = async () => {
    if (!quarter || operationRef.current || loading || !isDataContextCurrent(editorContext.current)) return
    const write = beginTeamWrite()
    activeWriteRef.current = write
    const operation = { kind: 'save' as const, generation: generationRef.current }
    operationRef.current = operation
    const isCurrent = () => operationRef.current === operation && generationRef.current === operation.generation && isDataContextCurrent(write.context)
    const snapshot = fieldPlayers
    const baseline = baselineRef.current
    const teamId = teamIdRef.current
    setSaving(true)
    setSaveFailed(false)

    try {
      const records = await saveQuarterRecords(supabase, quarter.id, snapshot.map(player => toRecord(quarter.id, player)), baseline, isCurrent)
      if (!isCurrent()) return
      const byPlayer = new Map(records.map(record => [record.player_id, record]))
      const reconciled = snapshot.map(player => ({ ...player, id: byPlayer.get(player.playerId)!.id }))
      setFieldPlayers(reconciled)
      setSelectedPlayer(previous => previous ? reconciled.find(player => player.playerId === previous.playerId) ?? null : null)
      setPositionPlayerId(previous => {
        const player = snapshot.find(item => item.id === previous)
        return player ? byPlayer.get(player.playerId)?.id ?? null : null
      })
      baselineRef.current = records.map(record => ({ id: record.id, quarter_id: record.quarter_id, player_id: record.player_id }))
      setSavedDraft(draftKey(reconciled))
      failedSaveRef.current = false
      if (teamId) applySavedQuarterRecords(teamId, matchId, quarter.id, records, baseline.filter(record => !byPlayer.has(record.player_id)).map(record => record.id), write.context)
      toast.success(t.quarterAllSaved)
    } catch (error) {
      if (isCurrent()) {
        if (error instanceof QuarterSaveError) {
          // Keep the draft/removal intent, but remember acknowledged new IDs so
          // a later retry or removal never treats them as an unknown record.
          const acknowledged = new Map(error.acknowledgedRecords.map(record => [record.player_id, record]))
          const removed = new Set(error.acknowledgedRemovedIds)
          baselineRef.current = [
            ...baseline.filter(record => !removed.has(record.id) && !acknowledged.has(record.player_id)),
            ...error.acknowledgedRecords.map(record => ({ id: record.id, quarter_id: record.quarter_id, player_id: record.player_id })),
          ]
          const reconcileId = (player: FieldPlayer) => ({ ...player, id: acknowledged.get(player.playerId)?.id ?? player.id })
          setFieldPlayers(previous => previous.map(reconcileId))
          setSelectedPlayer(previous => previous ? reconcileId(previous) : null)
          setPositionPlayerId(previous => {
            const player = snapshot.find(item => item.id === previous)
            return player ? acknowledged.get(player.playerId)?.id ?? previous : previous
          })
          if (teamId) applySavedQuarterRecords(teamId, matchId, quarter.id, error.acknowledgedRecords, error.acknowledgedRemovedIds, write.context)
        }
        failedSaveRef.current = true
        setSaveFailed(true)
      }
    } finally {
      write.finish()
      if (activeWriteRef.current === write) activeWriteRef.current = null
      if (isCurrent()) {
        operationRef.current = null
        setSaving(false)
      }
    }
  }

  const handleBack = () => {
    if (operationRef.current) return
    if (dirty || saveFailed) setShowLeaveConfirm(true)
    else router.push(`/match/${matchId}`)
  }

  if (loading || !isDataContextCurrent(editorContext.current)) {
    return <QuarterEditSkeleton />
  }

  const cardStyle = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 12 }
  const textareaStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 10 }

  return (
    <div className="light min-h-screen pb-32" style={{ background: 'var(--bg)' }}>
      {/* Header */}
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex justify-between items-center gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={handleBack} disabled={busy} aria-label={saveCopy.back} className="min-w-11 min-h-11 p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)] disabled:opacity-40">
              <ArrowLeft aria-hidden className="w-5 h-5" />
            </button>
            <h1 className="text-base font-black text-[color:var(--text)]">{t.quarterEditTitle.replace('{n}', String(quarterNumber))}</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={busy || loading || (!dirty && !saveFailed)}
            aria-describedby="quarter-save-status"
            className="flex min-h-11 max-w-[55%] items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-black active:scale-95 transition disabled:opacity-50"
            style={{ background: 'var(--navy)', color: 'var(--accent)' }}
          >
            <Save aria-hidden className="w-4 h-4 flex-shrink-0" />
            {saving ? t.saving : saveFailed ? saveCopy.retry : saveCopy.saveAll}
          </button>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <p id="quarter-save-status" role={saveFailed ? 'alert' : 'status'} aria-live={saveFailed ? 'assertive' : 'polite'} aria-atomic="true" className="rounded-xl border px-4 py-3 text-sm leading-relaxed" style={{ background: 'var(--card)', borderColor: saveFailed ? 'var(--danger)' : 'var(--line)', color: 'var(--text)' }}>
          {saving ? saveCopy.saving : busy ? saveCopy.waiting : saveFailed ? saveCopy.failed : dirty ? saveCopy.dirty : saveCopy.ready}
        </p>
        <fieldset disabled={busy || saveFailed} aria-busy={busy} className="min-w-0 space-y-6 border-0 p-0 m-0">
        {/* Soccer Field */}
        <section>
          <div className="flex flex-wrap justify-between items-center gap-3 mb-3">
            <h2 className="font-bold text-[color:var(--text)] text-sm">{t.formationPlacement}</h2>
            <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    applyFormation(e.target.value)
                    e.target.value = ''
                  }
                }}
                defaultValue=""
                aria-label={t.formation}
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
                  className="flex min-h-11 max-w-full items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
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
                      <div className="grid grid-cols-2 gap-2">
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

          <LinePitch
            players={fieldPlayers.map(fp => {
              const outgoing = substitutions.find(sub => sub.player_out_id === fp.playerId)
              const incoming = substitutions.find(sub => sub.player_in_id === fp.playerId)
              return { id: fp.id, name: fp.player.name, number: fp.player.number, x: fp.positionX, y: fp.positionY, substitutedOut: !!outgoing, substitution: [incoming ? `IN ${incoming.minute}′` : '', outgoing ? `OUT ${outgoing.minute}′` : ''].filter(Boolean).join(' · ') }
            })}
            selectedId={positionPlayerId}
            onSelect={id => { if (!operationRef.current && !failedSaveRef.current) setPositionPlayerId(id) }}
            onMove={(id, x, y) => updateFieldPlayer(id, { positionX: x, positionY: y })}
            label={t.formationPlacement} moveLabel={copy.moveTarget}
          />
          <p className="mt-3 text-xs leading-relaxed text-[color:var(--text3)]">{copy.move}</p>
          {fieldPlayers.some(fp => fp.id === positionPlayerId) && <button className="sn-button mt-3 w-full" onClick={() => setSelectedPlayer(fieldPlayers.find(fp => fp.id === positionPlayerId) ?? null)}>{fieldPlayers.find(fp => fp.id === positionPlayerId)?.player.name} · {copy.record}</button>}
        </section>

        {/* Substitutions Section */}
        <section style={cardStyle} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="min-w-0 font-bold text-[color:var(--text)] text-sm flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 flex-shrink-0 text-[color:var(--text)]/40" />
              {t.substitutionRecords} ({substitutions.length})
            </h2>
            <button
              onClick={openSubModal}
              className="flex min-h-11 max-w-full items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{ background: 'var(--warning-bg)', color: 'var(--warning-text)' }}
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold`} style={subPickerMode === 'out' ? { background: 'var(--result-loss-bg)', color: 'var(--result-loss)' } : { background: 'var(--chip)', color: 'var(--text)' }}>
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
          <section ref={recordRef} tabIndex={-1} aria-label={copy.record} style={cardStyle} className="scroll-mt-24 p-4">
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
                aria-label={t.deletePlayerTitle}
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
                aria-label={t.rating}
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
                    aria-label={`${t.goals} −`}
                    disabled={selectedPlayer.goals === 0}
                    onClick={() => updateFieldPlayer(selectedPlayer.id, { goals: Math.max(0, selectedPlayer.goals - 1) })}
                    className="w-12 h-full flex items-center justify-center text-xl font-bold text-[color:var(--text)]/40 active:bg-white/5 flex-shrink-0"
                  >−</button>
                  <span className="flex-1 text-center text-xl font-bold text-[color:var(--text)]">{selectedPlayer.goals}</span>
                  <button
                    aria-label={`${t.goals} +`}
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
                    aria-label={`${t.assistsLabel} −`}
                    disabled={selectedPlayer.assists === 0}
                    onClick={() => updateFieldPlayer(selectedPlayer.id, { assists: Math.max(0, selectedPlayer.assists - 1) })}
                    className="w-12 h-full flex items-center justify-center text-xl font-bold text-[color:var(--text)]/40 active:bg-white/5 flex-shrink-0"
                  >−</button>
                  <span className="flex-1 text-center text-xl font-bold text-[color:var(--text)]">{selectedPlayer.assists}</span>
                  <button
                    aria-label={`${t.assistsLabel} +`}
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
                  color: selectedPlayer.cleanSheet ? 'var(--brand)' : 'var(--text-faint)',
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
        </fieldset>
      </main>
      <ConfirmSheet open={showLeaveConfirm} title={saveCopy.leaveTitle} description={saveCopy.leaveDescription} confirmLabel={saveCopy.leave} cancelLabel={saveCopy.stay} onCancel={() => setShowLeaveConfirm(false)} onConfirm={() => { if (!operationRef.current) router.push(`/match/${matchId}`) }} />
    </div>
  )
}
