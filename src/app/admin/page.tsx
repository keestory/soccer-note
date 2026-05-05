'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
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
    const { data: { user } } = await supabase.auth.getUser()
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

  // Checking auth
  if (authState === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  // Not logged in → show inline login form
  if (authState === 'not-logged-in') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
              <Shield className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">어드민 로그인</h1>
            <p className="text-gray-500 text-sm mt-1">관리자 계정으로 로그인하세요</p>
          </div>

          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-sm border p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">비밀번호</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition text-sm pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {loginError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loginError}</p>
            )}

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4">
        <Shield className="w-16 h-16 text-red-400" />
        <p className="text-xl font-semibold text-gray-800">접근 권한이 없습니다.</p>
        <Link href="/dashboard" className="text-blue-600 hover:underline flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 대시보드로 돌아가기
        </Link>
      </div>
    )
  }

  // Admin dashboard
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">어드민</h1>
            </div>
          </div>
          <button
            onClick={fetchData}
            disabled={dataLoading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition disabled:opacity-50"
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
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">총 사용자</p>
              <p className="text-3xl font-bold text-blue-600">{stats.totalUsers}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">총 팀</p>
              <p className="text-3xl font-bold text-green-600">{stats.totalTeams}</p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border">
              <p className="text-sm text-gray-500 mb-1">총 경기</p>
              <p className="text-3xl font-bold text-purple-600">{stats.totalMatches}</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === 'users'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            <Users className="w-4 h-4" />
            사용자 ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition ${
              activeTab === 'teams'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border'
            }`}
          >
            <Trophy className="w-4 h-4" />
            팀 ({teams.length})
          </button>
        </div>

        {/* Users Table */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">이메일</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">이름</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">가입일</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">마지막 로그인</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user, idx) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{user.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{user.display_name || '-'}</td>
                      <td className="px-4 py-3 text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDate(user.created_at)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{formatDate(user.last_sign_in_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-400">사용자가 없습니다.</div>
              )}
            </div>
          </div>
        )}

        {/* Teams Table */}
        {activeTab === 'teams' && (
          <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">팀명</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">오너</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">멤버 수</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">초대코드</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">상태</th>
                    <th className="text-left px-4 py-3 font-semibold text-gray-600">생성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {teams.map((team, idx) => (
                    <tr key={team.id} className={`hover:bg-gray-50 transition ${team.is_removed ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">{team.name}</span>
                        {team.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{team.description}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{getOwnerEmail(team.user_id)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" />
                          {team.member_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{team.invite_code || '-'}</td>
                      <td className="px-4 py-3">
                        {team.is_removed ? (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">삭제됨</span>
                        ) : (
                          <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">활성</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{formatDate(team.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {teams.length === 0 && (
                <div className="text-center py-12 text-gray-400">팀이 없습니다.</div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
