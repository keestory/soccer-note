'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { resolveTeam } from '@/lib/team-resolver'
import { ArrowLeft, MapPin, Calendar, Swords } from 'lucide-react'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'

const BEBAS = "'Bebas Neue', var(--font-display), sans-serif"

export default function NewMatchPage() {
  const router = useRouter()
  const { t } = useI18n()
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
      toast.error(t.noCreateMatchPermission)
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
      toast.success(t.matchCreated)
      router.push(`/match/${data.id}?attendees=1`)
    } catch {
      toast.error(t.saveFailed)
    } finally {
      setLoading(false)
    }
  }

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }

  return (
    <div className="light flex flex-col safe-top" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <header className="flex-shrink-0 sticky top-0 z-10" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-[color:var(--text)]">{t.newMatch}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 py-6 space-y-4 safe-bottom">
        {/* VS visual (navy) */}
        <div className="flex items-center" style={{ background: '#101828', borderRadius: 18, padding: 18, gap: 12 }}>
          <div style={{ flex: 1, background: '#1a2437', borderRadius: 13, padding: '14px 10px', textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>{t.homeTeam}</div>
            <div className="truncate" style={{ fontSize: 15, fontWeight: 700, color: '#c8f542' }}>{teamName || '…'}</div>
          </div>
          <div style={{ fontFamily: BEBAS, fontSize: 20, color: '#667085', flexShrink: 0 }}>VS</div>
          <div style={{ flex: 1, background: '#1a2437', borderRadius: 13, padding: '14px 10px', textAlign: 'center', minWidth: 0 }}>
            <div style={{ fontSize: 11, color: '#667085', marginBottom: 4 }}>{t.opponent}</div>
            <div className="truncate" style={{ fontSize: 15, fontWeight: 700, color: opponent ? '#fff' : '#667085' }}>{opponent || '?'}</div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={cardStyle} className="overflow-hidden">
          {[
            { icon: <Swords className="w-4 h-4 text-[color:var(--text)]/40" />, label: t.opponentNameRequired, type: 'text', value: opponent, onChange: setOpponent, placeholder: t.opponentPlaceholder, required: true, autoFocus: false },
            { icon: <Calendar className="w-4 h-4 text-[color:var(--text)]/40" />, label: t.matchDateRequired, type: 'date', value: matchDate, onChange: setMatchDate, placeholder: '', required: true, autoFocus: false },
            { icon: <MapPin className="w-4 h-4 text-[color:var(--text)]/40" />, label: t.location, type: 'text', value: location, onChange: setLocation, placeholder: t.locationPlaceholder, required: false, autoFocus: false },
          ].map((field, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: i < 2 ? '1px solid var(--line)' : 'none' }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--card2)' }}>
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
                  className="w-full text-[15px] font-medium text-[color:var(--text)] outline-none bg-transparent placeholder:text-[color:var(--text)]/20"
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
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}
            >
              {loading ? t.creating : t.createMatch}
            </button>
            <p className="text-center text-[11px] mt-3" style={{ color: 'var(--muted2)' }}>
              {t.createMatchDescription}
            </p>
          </div>
        </form>
      </main>
    </div>
  )
}
