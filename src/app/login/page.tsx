'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { toast.error(error.message); return }
      toast.success('로그인 성공!')
      router.push('/dashboard')
    } catch {
      toast.error('로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 safe-top">
      {/* Branded header — soccer-green gradient */}
      <div className="bg-gradient-to-b from-[#1a3f1a] to-[#2D5A27] px-6 pt-16 pb-12 text-center field-pattern flex-shrink-0">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
          <span className="text-3xl">⚽</span>
        </div>
        <h1 className="text-3xl font-bold text-white tracking-tight">SoccerNote</h1>
        <p className="text-white/70 mt-1.5 text-sm">축구팀 경기 기록의 모든 것</p>
      </div>

      {/* Form card — slides up over the background */}
      <div className="flex-1 bg-gray-50 rounded-t-3xl -mt-4 px-6 pt-8 pb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-6">로그인</h2>

        <form onSubmit={handleLogin} className="space-y-4">
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
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-base"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition mt-2"
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-primary-600 font-semibold">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
