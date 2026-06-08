'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { getAuthRedirectUrl } from '@/lib/auth-redirect'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)
  const [resending, setResending] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setNeedsConfirm(false)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        // Supabase returns this when the email hasn't been verified yet
        if (error.message.toLowerCase().includes('not confirmed')) {
          setNeedsConfirm(true)
          toast.error('이메일 인증이 필요합니다')
        } else {
          toast.error(error.message)
        }
        return
      }

      toast.success('로그인 성공!')
      router.push('/dashboard')
    } catch (error) {
      toast.error('로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setResending(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: getAuthRedirectUrl() },
      })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('확인 메일을 다시 보냈습니다')
    } catch {
      toast.error('재전송 중 오류가 발생했습니다')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            SoccerNote
          </Link>
          <p className="text-gray-600 mt-2">로그인하여 팀 관리를 시작하세요</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-lg p-8">
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="email@example.com"
            />
          </div>

          <div className="mb-2">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              placeholder="••••••••"
            />
          </div>

          <div className="flex justify-end mb-6">
            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              비밀번호를 잊으셨나요?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>

          {needsConfirm && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
              <p className="text-sm text-amber-700 mb-2">
                이메일 인증을 완료해야 로그인할 수 있습니다.
              </p>
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm font-medium text-blue-600 hover:underline disabled:opacity-50"
              >
                {resending ? '재전송 중...' : '확인 메일 다시 보내기'}
              </button>
            </div>
          )}
        </form>

        <p className="text-center mt-6 text-gray-600">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="text-blue-600 font-medium hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}
