'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { Users, Trophy, ArrowLeft, RefreshCw, Shield, Clock, LogIn, Eye, EyeOff } from 'lucide-react'

interface AdminUser {
  id: string
  email: string | undefined
  display_name: string | null
  created_at: string
  last_sign_in_at: string | null
}

interface AdminTeam {
  id: string
  name: string
  user_id: string
  description: string | null
  invite_code: string | null
  is_removed: boolean | null
  created_at: string
  member_count: number
}

interface AdminStats {
  totalUsers: number
  totalTeams: number
  totalMatches: number
}

type AuthState = 'checking' | 'not-logged-in' | 'logged-in' | 'forbidden'

export default function AdminPage() {
  const [authState, setAuthState] = useState<AuthState>('checking')
  const [dataLoading, setDataLoading] = useState(false)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [teams, setTeams] = useState<AdminTeam[]>([])
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users')

  // Login form state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    const user = await getSessionUser(supabase)
    if (!user) {
      setAuthState('not-logged-in')
      return
    }
    await fetchData()
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoginLoading(true)
    setLoginError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setLoginError('이메일 또는 비밀번호가 올바르지 않습니다.')
      setLoginLoading(false)
      return
    }

    setLoginLoading(false)
    await fetchData()
  }

  const fetchData = async () => {
    setDataLoading(true)
    try {
      const res = await fetch('/api/admin/data')
      if (res.status === 401) {
        setAuthState('not-logged-in')
        setDataLoading(false)
        return
      }
      if (res.status === 403) {
        setAuthState('forbidden')
        setDataLoading(false)
        return
      }
      if (!res.ok) throw new Error()
      const data = await res.json()
      setUsers(data.users)
      setTeams(data.teams)
      setStats(data.stats)
      setAuthState('logged-in')
    } catch {
      setLoginError('데이터 로드 중 오류가 발생했습니다.')
    }
    setDataLoading(false)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getOwnerEmail = (userId: string) => {
    const owner = users.find((u) => u.id === userId)
    return owner?.email || owner?.display_name || userId.slice(0, 8) + '...'
  }

  const cardStyle = { background: '#111010', border: '1px solid var(--line)', borderRadius: 16 }

  // Checking auth
  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="animate-spin rounded-full h-8 w-8" style={{ borderBottom: '2px solid var(--accent)' }} />
      </div>
    )
  }

  // Not logged in → show inline login form
  if (authState === 'not-logged-in') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: '#0a0a0a' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-4" style={{ background: 'var(--chip)' }}>
              <Shield className="w-7 h-7" style={{ color: 'var(--accent)' }} />
            </div>
            <h1 className="text-2xl font-bold text-white">어드민 로그인</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--muted2)' }}>관리자 계정으로 로그인하세요</p>
          </div>

          <form onSubmit={handleLogin} className="p-6 space-y-4 rounded-2xl" style={cardStyle}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl outline-none text-sm text-white"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl outline-none text-sm text-white pr-10"
                  style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-sm text-red-400 rounded-lg px-3 py-2" style={{ background: '#2a0a0a' }}>{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 rounded-xl font-bold disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              로그인
            </button>
          </form>
        </div>
      </div>
    )
  }

  // Forbidden
  if (authState === 'forbidden') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4" style={{ background: '#0a0a0a' }}>
        <Shield className="w-16 h-16 text-red-400" />
        <p className="text-xl font-bold text-white">접근 권한이 없습니다.</p>
        <Link href="/dashboard" className="flex items-center gap-1" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
        </Link>
      </div>
    )
  }

  // Admin dashboard
  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-lg text-white/50 hover:text-white transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h1 className="text-xl font-bold text-white">어드민</h1>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={dataLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition disabled:opacity-50"
            style={{ color: 'var(--muted2)', background: '#1a1a1a' }}
          >
            <RefreshCw className={`w-4 h-4 ${dataLoading ? 'animate-spin' : ''}`} />
            새로고침
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl p-5" style={cardStyle}>
              <p className="text-sm mb-1" style={{ color: 'var(--muted2)' }}>총 사용자</p>
              <p className="font-display text-3xl" style={{ color: 'var(--accent)' }}>{stats.totalUsers}</p>
            </div>
            <div className="rounded-xl p-5" style={cardStyle}>
              <p className="text-sm mb-1" style={{ color: 'var(--muted2)' }}>총 팀</p>
              <p className="font-display text-3xl text-teal-400">{stats.totalTeams}</p>
            </div>
            <div className="rounded-xl p-5" style={cardStyle}>
              <p className="text-sm mb-1" style={{ color: 'var(--muted2)' }}>총 경기</p>
              <p className="font-display text-3xl text-purple-400">{stats.totalMatches}</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition"
            style={{
              background: activeTab === 'users' ? 'var(--accent)' : '#1a1a1a',
              color: activeTab === 'users' ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Users className="w-4 h-4" />
            사용자 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition"
            style={{
              background: activeTab === 'teams' ? 'var(--accent)' : '#1a1a1a',
              color: activeTab === 'teams' ? '#0a0a0a' : 'rgba(255,255,255,0.5)',
            }}
          >
            <Trophy className="w-4 h-4" />
            팀 ({teams.length})
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: '#1a1a1a', borderBottom: '1px solid var(--line)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>#</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>이메일</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>이름</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>가입일</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>마지막 로그인</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, idx) => (
                    <tr key={user.id} className="transition" style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-4 py-3 text-white/30">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-white">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-white/60">{user.display_name || '-'}</td>
                      <td className="px-4 py-3 text-white/40">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/30">{formatDate(user.last_sign_in_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-white/30">사용자가 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* Teams Table */}
        {activeTab === 'teams' && (
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ background: '#1a1a1a', borderBottom: '1px solid var(--line)' }}>
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>#</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>팀명</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>오너</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>멤버 수</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>초대코드</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>상태</th>
                    <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--muted2)' }}>생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {teams.map((team, idx) => (
                    <tr key={team.id} className={`transition ${team.is_removed ? 'opacity-40' : ''}`} style={{ borderBottom: '1px solid var(--line)' }}>
                      <td className="px-4 py-3 text-white/30">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">{team.name}</span>
                        {team.description && (
                          <p className="text-xs mt-0.5 text-white/30">{team.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/40 text-xs">{getOwnerEmail(team.user_id)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>
                          <Users className="w-3 h-3" />
                          {team.member_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/40 font-mono text-xs">{team.invite_code || '-'}</td>
                      <td className="px-4 py-3">
                        {team.is_removed ? (
                          <span className="text-xs bg-red-900/40 text-red-400 px-2 py-0.5 rounded-full">삭제됨</span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--chip)', color: 'var(--accent)' }}>활성</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs">{formatDate(team.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {teams.length === 0 && (
                <div className="text-center py-12 text-white/30">팀이 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
