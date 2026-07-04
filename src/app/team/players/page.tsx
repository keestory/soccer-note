'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, Plus, Trash2, Edit2, X, Users, Trophy } from 'lucide-react'
import type { Player, PositionType } from '@/types/database'
import { POSITION_COLORS, POSITION_LABELS } from '@/types/database'
import toast from 'react-hot-toast'
import { PlayersListSkeleton } from '@/components/Skeleton'

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

type RankStatKey = 'goals' | 'assists' | 'avgRating' | 'attendance' | 'cleanSheets'

const STAT_TABS: { key: RankStatKey; label: string; color: string; suffix: string }[] = [
  { key: 'goals', label: '골', color: 'text-primary-600', suffix: '골' },
  { key: 'assists', label: '도움', color: 'text-primary-600', suffix: '도움' },
  { key: 'avgRating', label: '평점', color: 'text-amber-600', suffix: '' },
  { key: 'attendance', label: '출석', color: 'text-green-600', suffix: '회' },
  { key: 'cleanSheets', label: '클린시트', color: 'text-purple-600', suffix: '' },
]

// Rank badge colors for top 3
const RANK_BADGE = ['bg-amber-400 text-white', 'bg-gray-300 text-white', 'bg-amber-700 text-white']

function formatStat(v: number | null, key: RankStatKey, suffix: string): string {
  if (v === null) return '-'
  if (key === 'avgRating') return v.toFixed(1)
  return `${v}${suffix}`
}

export default function PlayersPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [players, setPlayers] = useState<PlayerWithStats[]>([])
  const [teamId, setTeamId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)
  const [canEdit, setCanEdit] = useState(false)
  const [view, setView] = useState<'roster' | 'ranking'>('roster')
  const [rankStat, setRankStat] = useState<RankStatKey>('goals')

  // Form state
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [position, setPosition] = useState<PositionType>('MF')

  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    const user = await getSessionUser(supabase)
    if (!user) {
      router.push('/login')
      return
    }

    // Resolve the active team (cached across tabs — skips repeat queries)
    const team = await resolveTeam(supabase, user.id)
    if (!team) {
      router.push('/dashboard')
      return
    }

    setTeamId(team.teamId)
    setCanEdit(team.canEditPlayers)
    if (!localStorage.getItem('selectedTeamId')) {
      localStorage.setItem('selectedTeamId', team.teamId)
    }
    await loadPlayers(team.teamId)
    setLoading(false)
  }

  const loadPlayers = async (teamId: string) => {
    // Get players
    const { data: playersData } = await supabase
      .from('players')
      .select('*')
      .eq('team_id', teamId)
      .order('number')

    if (!playersData) return

    // Fetch stats and attendance in parallel
    const playerIds = playersData.map(p => p.id)
    const [{ data: records }, { data: attendanceData }] = await Promise.all([
      supabase
        .from('quarter_records')
        .select('player_id, goals, assists, clean_sheet, rating')
        .in('player_id', playerIds),
      supabase
        .from('match_attendees')
        .select('player_id')
        .in('player_id', playerIds),
    ])

    // Calculate stats for each player
    const playersWithStats: PlayerWithStats[] = playersData.map(player => {
      const playerRecords = records?.filter(r => r.player_id === player.id) || []
      const ratingsWithValue = playerRecords.filter(r => r.rating !== null)
      const attendanceCount = attendanceData?.filter(a => a.player_id === player.id).length || 0

      const stats: PlayerStats = {
        attendance: attendanceCount,
        games: playerRecords.length,
        goals: playerRecords.reduce((sum, r) => sum + (r.goals || 0), 0),
        assists: playerRecords.reduce((sum, r) => sum + (r.assists || 0), 0),
        cleanSheets: playerRecords.filter(r => r.clean_sheet).length,
        avgRating: ratingsWithValue.length > 0
          ? ratingsWithValue.reduce((sum, r) => sum + (r.rating || 0), 0) / ratingsWithValue.length
          : null
      }

      return { ...player, stats }
    })

    setPlayers(playersWithStats)
  }

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId || !name.trim()) return

    const { data, error } = await supabase
      .from('players')
      .insert({
        team_id: teamId,
        name: name.trim(),
        number: number ? parseInt(number) : null,
        default_position: position,
      })
      .select()
      .single()

    if (error) {
      toast.error('선수 추가에 실패했습니다')
      return
    }

    toast.success('선수가 추가되었습니다')
    const newPlayerWithStats: PlayerWithStats = {
      ...data,
      stats: { attendance: 0, games: 0, goals: 0, assists: 0, cleanSheets: 0, avgRating: null }
    }
    setPlayers([...players, newPlayerWithStats])
    resetForm()
  }

  const handleUpdatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlayer || !name.trim()) return

    const { error } = await supabase
      .from('players')
      .update({
        name: name.trim(),
        number: number ? parseInt(number) : null,
        default_position: position,
      })
      .eq('id', editingPlayer.id)

    if (error) {
      toast.error('수정에 실패했습니다')
      return
    }

    toast.success('선수 정보가 수정되었습니다')
    setPlayers(players.map(p =>
      p.id === editingPlayer.id
        ? { ...p, name: name.trim(), number: number ? parseInt(number) : null, default_position: position, stats: p.stats }
        : p
    ))
    resetForm()
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (error) {
      toast.error('삭제에 실패했습니다')
      return
    }

    toast.success('선수가 삭제되었습니다')
    setPlayers(players.filter(p => p.id !== playerId))
  }

  const startEditing = (player: Player) => {
    setEditingPlayer(player)
    setName(player.name)
    setNumber(player.number?.toString() || '')
    setPosition(player.default_position)
    setShowAddForm(false)
  }

  const resetForm = () => {
    setName('')
    setNumber('')
    setPosition('MF')
    setShowAddForm(false)
    setEditingPlayer(null)
  }

  if (loading) {
    return <PlayersListSkeleton />
  }

  const currentTab = STAT_TABS.find((t) => t.key === rankStat)!
  const rankedPlayers = [...players].sort((a, b) => {
    const av = a.stats[rankStat]
    const bv = b.stats[rankStat]
    if (av === null && bv === null) return 0
    if (av === null) return 1
    if (bv === null) return -1
    return bv - av
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-6 h-6" />
            </Link>
            <h1 className="text-xl font-bold">선수 관리</h1>
          </div>
          {canEdit && (
            <button
              onClick={() => {
                resetForm()
                setShowAddForm(true)
              }}
              className="flex items-center gap-1 px-3 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              선수 추가
            </button>
          )}
        </div>
      </header>

      {/* View Toggle: Roster / Ranking */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="flex gap-2 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setView('roster')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
              view === 'roster' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Users className="w-4 h-4" />
            명단
          </button>
          <button
            onClick={() => setView('ranking')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition ${
              view === 'ranking' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Trophy className="w-4 h-4" />
            랭킹
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {canEdit && view === 'roster' && (showAddForm || editingPlayer) && (
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form
            onSubmit={editingPlayer ? handleUpdatePlayer : handleAddPlayer}
            className="bg-white rounded-xl p-4 shadow-sm"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">
                {editingPlayer ? '선수 수정' : '새 선수 추가'}
              </h3>
              <button type="button" onClick={resetForm} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="선수 이름"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">등번호</label>
                <input
                  type="number"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  min={1}
                  max={99}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="#"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">기본 포지션</label>
              <div className="grid grid-cols-4 gap-2">
                {(['GK', 'DF', 'MF', 'FW'] as PositionType[]).map((pos) => (
                  <button
                    key={pos}
                    type="button"
                    onClick={() => setPosition(pos)}
                    className={`py-2 rounded-lg text-sm font-medium transition ${
                      position === pos
                        ? 'text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: position === pos ? POSITION_COLORS[pos] : undefined,
                    }}
                  >
                    {POSITION_LABELS[pos]}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              {editingPlayer ? '수정 완료' : '추가하기'}
            </button>
          </form>
        </div>
      )}

      {/* Players List (Roster) */}
      {view === 'roster' && (
      <main className="max-w-4xl mx-auto px-4 py-4">
        {players.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <p className="text-gray-500">등록된 선수가 없습니다</p>
            <p className="text-gray-400 text-sm">선수를 추가해주세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player) => (
              <div
                key={player.id}
                className="bg-white rounded-xl p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: POSITION_COLORS[player.default_position] }}
                    >
                      {player.number || '-'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{player.name}</p>
                      <p className="text-sm text-gray-500">{POSITION_LABELS[player.default_position]}</p>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEditing(player)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePlayer(player.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Player Stats — 3×2 grid for comfortable mobile reading */}
                <div className="grid grid-cols-3 gap-x-2 gap-y-3 pt-3 border-t">
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">출석</p>
                    <p className="font-bold text-gray-900">{player.stats.attendance}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">출전</p>
                    <p className="font-bold text-gray-900">{player.stats.games}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">평점</p>
                    <p className="font-bold text-amber-500">
                      {player.stats.avgRating !== null ? player.stats.avgRating.toFixed(1) : '−'}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">골</p>
                    <p className="font-bold text-primary-600">{player.stats.goals}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">도움</p>
                    <p className="font-bold text-primary-600">{player.stats.assists}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-gray-400 mb-0.5">클린시트</p>
                    <p className="font-bold text-purple-600">{player.stats.cleanSheets}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-gray-400 text-sm mt-6">
          총 {players.length}명의 선수
        </p>
      </main>
      )}

      {/* Ranking */}
      {view === 'ranking' && (
        <main className="max-w-4xl mx-auto px-4 py-4">
          {/* Stat tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {STAT_TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setRankStat(tab.key)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap flex-shrink-0 transition ${
                  rankStat === tab.key
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {players.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center mt-3">
              <p className="text-gray-500">등록된 선수가 없습니다</p>
            </div>
          ) : (
            <div className="space-y-2 mt-3">
              {rankedPlayers.map((player, i) => (
                <div
                  key={player.id}
                  className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      i < 3 ? RANK_BADGE[i] : 'text-gray-400'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: POSITION_COLORS[player.default_position] }}
                  >
                    {player.number || '-'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{player.name}</p>
                    <p className="text-xs text-gray-500">{POSITION_LABELS[player.default_position]}</p>
                  </div>
                  <p className={`text-lg font-bold flex-shrink-0 ${currentTab.color}`}>
                    {formatStat(player.stats[rankStat], rankStat, currentTab.suffix)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </main>
      )}
    </div>
  )
}
