'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, MapPin, Calendar, Swords } from 'lucide-react'
import toast from 'react-hot-toast'

export default function NewMatchPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [teamId, setTeamId] = useState<string | null>(null)
  const [teamName, setTeamName] = useState('')

  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')

  const supabase = createClient()

  useEffect(() => { loadTeam() }, [])

  const loadTeam = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const team = await resolveTeam(supabase, user.id)
    if (team && team.canEditMatches) {
      setTeamId(team.teamId)
      if (!localStorage.getItem('selectedTeamId')) localStorage.setItem('selectedTeamId', team.teamId)
      // Fetch team name for the "vs" display
      const { data } = await supabase.from('teams').select('name').eq('id', team.teamId).single()
      if (data) setTeamName(data.name)
    } else {
      toast.error('경기를 생성할 권한이 없습니다')
      router.push('/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamId || !opponent.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert({ team_id: teamId, opponent: opponent.trim(), match_date: matchDate, location: location.trim() || null })
        .select().single()
      if (error) throw error
      toast.success('경기가 생성되었습니다')
      router.push(`/match/${data.id}?attendees=1`)
    } catch {
      toast.error('경기 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = { background: '#111010', border: '1px solid var(--line)', borderRadius: 16 }

  return (
    <div className="flex flex-col safe-top" style={{ background: '#0a0a0a', minHeight: '100dvh' }}>
      <header className="flex-shrink-0 sticky top-0 z-10" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-white">새 경기</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-6 space-y-4 safe-bottom">
        {/* VS visual */}
        <div style={cardStyle} className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ background: 'var(--chip)' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>우리 팀</p>
              <p className="font-bold text-[15px] truncate" style={{ color: 'var(--accent)' }}>{teamName || '…'}</p>
            </div>
            <div className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
              <Swords className="w-4 h-4 text-white/30" />
            </div>
            <div className="flex-1 rounded-xl px-4 py-3 text-center" style={{ background: '#1a1a1a' }}>
              <p className="text-[11px] font-bold uppercase tracking-widest mb-1" style={{ color: 'var(--muted2)' }}>상대 팀</p>
              <p className="font-bold text-[15px] text-white/60 truncate">{opponent || '?'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={cardStyle} className="overflow-hidden">
          {[
            { icon: <Swords className="w-4 h-4 text-white/40" />, label: '상대팀 이름 *', type: 'text', value: opponent, onChange: setOpponent, placeholder: '예: FC 서울', required: true, autoFocus: false },
            { icon: <Calendar className="w-4 h-4 text-white/40" />, label: '경기 날짜 *', type: 'date', value: matchDate, onChange: setMatchDate, placeholder: '', required: true, autoFocus: false },
            { icon: <MapPin className="w-4 h-4 text-white/40" />, label: '장소 (선택)', type: 'text', value: location, onChange: setLocation, placeholder: '예: 잠실 운동장', required: false, autoFocus: false },
          ].map((field, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#1a1a1a' }}>
                {field.icon}
              </div>
              <div className="flex-1">
                <label className="block text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'var(--muted2)' }}>{field.label}</label>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  required={field.required}
                  autoFocus={field.autoFocus}
                  className="w-full text-[15px] font-medium text-white outline-none bg-transparent placeholder:text-white/20"
                  placeholder={field.placeholder}
                />
              </div>
            </div>
          ))}

          <div className="px-5 py-4">
            <button
              type="submit"
              disabled={loading || !opponent.trim()}
              className="w-full py-4 rounded-xl font-black text-[15px] active:scale-[0.99] disabled:opacity-40 transition"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}
            >
              {loading ? '생성 중…' : '경기 생성하기'}
            </button>
            <p className="text-center text-[11px] mt-3" style={{ color: 'var(--muted2)' }}>
              생성하면 4쿼터가 자동으로 만들어집니다
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
