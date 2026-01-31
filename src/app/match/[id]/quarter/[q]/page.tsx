'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, Save, Plus, X, Check, Camera, ImageIcon, Loader2 as Spinner, Trash2 } from 'lucide-react'
import type { Player, Quarter, QuarterRecord, PositionType } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import toast from 'react-hot-toast'

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

export default function QuarterEditPage() {
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

  const fieldRef = useRef<HTMLDivElement>(null)
  const mediaInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [matchId, quarterNumber])

  const loadData = async () => {
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
      toast.error('경기를 찾을 수 없습니다')
      router.push('/dashboard')
      return
    }

    const currentQuarter = matchData.quarters?.find((q: Quarter) => q.quarter_number === quarterNumber)
    if (!currentQuarter) {
      toast.error('쿼터를 찾을 수 없습니다')
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

    // Load available players (not already on field)
    const { data: players } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', matchData.team_id)
      .order('number')

    if (players) {
      const usedPlayerIds = new Set(existingPlayers.map(fp => fp.playerId))
      setAvailablePlayers(players.filter(p => !usedPlayerIds.has(p.id)))
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

  const removePlayerFromField = (fieldPlayer: FieldPlayer) => {
    setFieldPlayers(fieldPlayers.filter(fp => fp.id !== fieldPlayer.id))
    setAvailablePlayers([...availablePlayers, fieldPlayer.player])
    setSelectedPlayer(null)
  }

  const handlePlayerDrag = (fieldPlayerId: string, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault()
    const rect = fieldRef.current?.getBoundingClientRect()
    if (!rect) return

    const handleMove = (moveEvent: MouseEvent | TouchEvent) => {
      let clientX: number, clientY: number

      if ('touches' in moveEvent) {
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
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.removeEventListener('touchmove', handleMove)
      document.removeEventListener('touchend', handleEnd)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.addEventListener('touchmove', handleMove)
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
          toast.error(`업로드 실패: ${file.name} - ${result.error}`)
          continue
        }

        newUrls.push(result.url)
      } catch (err) {
        console.error('Upload error:', err)
        toast.error(`업로드 실패: ${file.name}`)
      }
    }

    if (newUrls.length > 0) {
      const updated = [...selectedPlayer.mediaUrls, ...newUrls]
      updateFieldPlayer(selectedPlayer.id, { mediaUrls: updated })
      toast.success(`${newUrls.length}개 파일 업로드 완료`)
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

      toast.success('저장되었습니다')
      router.push(`/match/${matchId}`)
    } catch (error) {
      toast.error('저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href={`/match/${matchId}`} className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">{quarterNumber}쿼터 편집</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Soccer Field */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold">포메이션 배치</h2>
            {availablePlayers.length > 0 && (
              <button
                onClick={() => setShowPlayerPicker(!showPlayerPicker)}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium"
              >
                <Plus className="w-4 h-4" />
                선수 추가
              </button>
            )}
          </div>

          {/* Player Picker */}
          {showPlayerPicker && (
            <div className="bg-white rounded-xl p-4 mb-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm text-gray-600">
                  추가할 선수를 선택하세요
                  {selectedPickerPlayers.size > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                      {selectedPickerPlayers.size}명 선택
                    </span>
                  )}
                </p>
                <button onClick={() => { setShowPlayerPicker(false); setSelectedPickerPlayers(new Set()); }} className="p-1">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="space-y-3 mb-3">
                {(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map(posType => {
                  const posPlayers = availablePlayers.filter(p => p.default_position === posType)
                  if (posPlayers.length === 0) return null
                  return (
                    <div key={posType}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: POSITION_COLORS[posType] }}
                        />
                        <span className="text-xs font-semibold text-gray-500">{POSITION_LABELS[posType]}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {posPlayers.map(player => {
                          const isSelected = selectedPickerPlayers.has(player.id)
                          return (
                            <button
                              key={player.id}
                              onClick={() => togglePickerPlayer(player.id)}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="relative">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: POSITION_COLORS[player.default_position] }}
                                >
                                  {player.number || '-'}
                                </div>
                                {isSelected && (
                                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{player.name}</p>
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
                  className="w-full py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
                >
                  {selectedPickerPlayers.size}명 추가하기
                </button>
              )}
            </div>
          )}

          {/* Field */}
          <div
            ref={fieldRef}
            className="relative w-full aspect-[3/2] bg-gradient-to-b from-green-700 via-green-600 to-green-700 rounded-xl overflow-hidden touch-none select-none shadow-lg"
          >
            {/* Grass pattern */}
            <div className="absolute inset-0" style={{
              backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 20px, rgba(255,255,255,0.03) 20px, rgba(255,255,255,0.03) 40px)',
            }} />

            {/* Field outline */}
            <div className="absolute inset-3 border-2 border-white/70 rounded" />

            {/* Center line */}
            <div className="absolute left-1/2 top-3 bottom-3 w-0.5 bg-white/70" />

            {/* Center circle */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border-2 border-white/70" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white/70" />

            {/* Left penalty area */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border-2 border-white/70 border-l-0" />
            {/* Left goal area */}
            <div className="absolute left-3 top-1/2 -translate-y-1/2 w-[6%] h-[30%] border-2 border-white/70 border-l-0" />
            {/* Left penalty spot */}
            <div className="absolute left-[14%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/70" />
            {/* Left goal */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-[18%] bg-white/30 border-2 border-white/70 border-l-0 rounded-r" />

            {/* Right penalty area */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[15%] h-[55%] border-2 border-white/70 border-r-0" />
            {/* Right goal area */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-[6%] h-[30%] border-2 border-white/70 border-r-0" />
            {/* Right penalty spot */}
            <div className="absolute right-[14%] top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/70" />
            {/* Right goal */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-[18%] bg-white/30 border-2 border-white/70 border-r-0 rounded-l" />

            {/* Corner arcs */}
            <div className="absolute left-3 top-3 w-6 h-6 border-b-2 border-r-2 border-white/70 rounded-br-full" />
            <div className="absolute right-3 top-3 w-6 h-6 border-b-2 border-l-2 border-white/70 rounded-bl-full" />
            <div className="absolute left-3 bottom-3 w-6 h-6 border-t-2 border-r-2 border-white/70 rounded-tr-full" />
            <div className="absolute right-3 bottom-3 w-6 h-6 border-t-2 border-l-2 border-white/70 rounded-tl-full" />

            {/* Players */}
            {fieldPlayers.map(fp => (
              <div
                key={fp.id}
                className="absolute flex flex-col items-center cursor-grab active:cursor-grabbing"
                style={{
                  left: `${fp.positionX}%`,
                  top: `${fp.positionY}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => handlePlayerDrag(fp.id, e)}
                onTouchStart={(e) => handlePlayerDrag(fp.id, e)}
                onClick={() => setSelectedPlayer(fp)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg transition-transform ${
                    selectedPlayer?.id === fp.id ? 'ring-4 ring-yellow-400 scale-110' : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: POSITION_COLORS[fp.positionType] }}
                >
                  {fp.player.number || '?'}
                </div>
                <span className="mt-1 px-1.5 py-0.5 bg-black/60 text-white text-xs rounded font-medium whitespace-nowrap">
                  {fp.player.name}
                </span>
              </div>
            ))}

            {fieldPlayers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60">
                <p className="bg-black/30 px-4 py-2 rounded-lg">선수를 추가하고 드래그하여 배치하세요</p>
              </div>
            )}
          </div>
          <p className="text-center text-gray-400 text-sm mt-2">
            선수를 드래그하여 위치를 조정하세요
          </p>
        </section>

        {/* Selected Player Stats */}
        {selectedPlayer && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: POSITION_COLORS[selectedPlayer.positionType] }}
                >
                  {selectedPlayer.player.number || '?'}
                </div>
                <div>
                  <p className="font-semibold">{selectedPlayer.player.name}</p>
                  <select
                    value={selectedPlayer.positionType}
                    onChange={(e) =>
                      updateFieldPlayer(selectedPlayer.id, {
                        positionType: e.target.value as PositionType,
                      })
                    }
                    className="text-sm text-gray-500 border-none p-0 focus:ring-0"
                  >
                    {(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map(pos => (
                      <option key={pos} value={pos}>{POSITION_LABELS[pos]}</option>
                    ))}
                  </select>
                </div>
              </div>
              <button
                onClick={() => removePlayerFromField(selectedPlayer)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Rating Slider */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium text-gray-700">평점:</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={selectedPlayer.rating ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Math.min(10, Math.max(0, parseFloat(e.target.value)))
                    updateFieldPlayer(selectedPlayer.id, { rating: val })
                  }}
                  placeholder="-"
                  className="w-20 px-2 py-1 text-2xl font-bold font-mono text-center border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={selectedPlayer.rating || 0}
                onChange={(e) =>
                  updateFieldPlayer(selectedPlayer.id, {
                    rating: parseFloat(e.target.value),
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">골</label>
                <input
                  type="number"
                  min={0}
                  value={selectedPlayer.goals}
                  onChange={(e) =>
                    updateFieldPlayer(selectedPlayer.id, {
                      goals: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">어시스트</label>
                <input
                  type="number"
                  min={0}
                  value={selectedPlayer.assists}
                  onChange={(e) =>
                    updateFieldPlayer(selectedPlayer.id, {
                      assists: parseInt(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-center"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">클린시트</label>
                <button
                  onClick={() =>
                    updateFieldPlayer(selectedPlayer.id, {
                      cleanSheet: !selectedPlayer.cleanSheet,
                    })
                  }
                  className={`w-full py-2 border rounded-lg flex items-center justify-center ${
                    selectedPlayer.cleanSheet
                      ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                      : 'bg-gray-50 text-gray-400'
                  }`}
                >
                  <Check className="w-5 h-5" />
                </button>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">기여도</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.1}
                  value={selectedPlayer.contribution}
                  onChange={(e) =>
                    updateFieldPlayer(selectedPlayer.id, {
                      contribution: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg text-center"
                />
              </div>
            </div>

            {/* Review Section */}
            <div className="mt-5 pt-5 border-t">
              <h3 className="font-semibold text-gray-900 mb-3">선수 총평</h3>

              {/* Media Upload */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">사진/동영상</label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => mediaInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
                  >
                    <ImageIcon className="w-4 h-4" />
                    갤러리
                  </button>
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={uploadingMedia}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                    촬영하기
                  </button>
                  {uploadingMedia && <Spinner className="w-5 h-5 text-emerald-600 animate-spin self-center" />}
                </div>
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e.target.files)}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleMediaUpload(e.target.files)}
                />
                {/* Media Preview */}
                {selectedPlayer.mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {selectedPlayer.mediaUrls.map((url, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square bg-gray-100">
                        {url.match(/\.(mp4|mov|webm)/i) ? (
                          <video src={url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        )}
                        <button
                          onClick={() => removeMedia(url)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Praise Text */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-emerald-700 mb-1">
                  참 잘했어요
                </label>
                <textarea
                  value={selectedPlayer.praiseText}
                  onChange={(e) => updateFieldPlayer(selectedPlayer.id, { praiseText: e.target.value })}
                  placeholder="잘한 점을 적어주세요"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              {/* Improvement Text */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-amber-700 mb-1">
                  조금 더 연습해볼까요?
                </label>
                <textarea
                  value={selectedPlayer.improvementText}
                  onChange={(e) => updateFieldPlayer(selectedPlayer.id, { improvementText: e.target.value })}
                  placeholder="개선할 점을 적어주세요"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                />
              </div>

              {/* Highlight Text */}
              <div>
                <label className="block text-sm font-medium text-blue-700 mb-1">
                  이 부분을 칭찬해주세요!
                </label>
                <textarea
                  value={selectedPlayer.highlightText}
                  onChange={(e) => updateFieldPlayer(selectedPlayer.id, { highlightText: e.target.value })}
                  placeholder="특별히 칭찬할 부분을 적어주세요"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
            </div>
          </section>
        )}

        {/* All Players List */}
        {fieldPlayers.length > 0 && (
          <section>
            <h2 className="font-semibold mb-3">배치된 선수 ({fieldPlayers.length}명)</h2>
            <div className="bg-white rounded-xl divide-y">
              {fieldPlayers.map(fp => (
                <button
                  key={fp.id}
                  onClick={() => setSelectedPlayer(fp)}
                  className={`w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 ${
                    selectedPlayer?.id === fp.id ? 'bg-emerald-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: POSITION_COLORS[fp.positionType] }}
                    >
                      {fp.player.number || '?'}
                    </div>
                    <div>
                      <p className="font-medium">{fp.player.name}</p>
                      <p className="text-sm text-gray-500">
                        {POSITION_LABELS[fp.positionType]}
                        {fp.goals > 0 && ` | ${fp.goals}골`}
                        {fp.assists > 0 && ` ${fp.assists}어시`}
                      </p>
                    </div>
                  </div>
                  <div className="text-xl font-bold font-mono text-emerald-600">
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
