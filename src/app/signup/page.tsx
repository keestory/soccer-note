'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { toast.error('이름/닉네임을 입력해주세요'); return }
    if (password !== confirmPassword) { toast.error('비밀번호가 일치하지 않습니다'); return }
    if (password.length < 6) { toast.error('비밀번호는 6자 이상이어야 합니다'); return }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName.trim() } },
      })
      if (error) { toast.error(error.message); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email,
          display_name: displayName.trim(),
        })
      }
      toast.success('회원가입 성공! 이메일을 확인해주세요.')
      router.push('/login')
    } catch {
      toast.error('회원가입 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 safe-top">
      {/* Branded header */}
      <div className="bg-gradient-to-b from-[#1a3f1a] to-[#2D5A27] px-6 pt-14 pb-10 text-center field-pattern flex-shrink-0">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 mb-3">
          <span className="text-2xl">⚽</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">SoccerNote</h1>
        <p className="text-white/70 mt-1 text-sm">새 계정을 만들어 시작하세요</p>
      </div>

      {/* Form card */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl -mt-4 px-6 pt-8 pb-8 overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-6">회원가입</h2>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-600 mb-1.5">이름 / 닉네임</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-base"
              placeholder="팀원들에게 보여질 이름"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-600 mb-1.5">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-base"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-600 mb-1.5">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-base"
              placeholder="6자 이상 입력"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-600 mb-1.5">비밀번호 확인</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={`w-full px-4 py-3.5 rounded-xl border bg-white focus:ring-2 focus:ring-primary-500 outline-none transition text-base ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-400 focus:border-red-400 focus:ring-red-400'
                  : 'border-gray-200 focus:border-primary-500'
              }`}
              placeholder="비밀번호 재입력"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1">비밀번호가 일치하지 않습니다</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition mt-2"
          >
            {loading ? '가입 중…' : '회원가입'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-primary-600 font-semibold">로그인</Link>
        </p>
      </div>
    </div>
  )
}
