'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MailCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { getAuthRedirectUrl } from '@/lib/auth-redirect'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: getAuthRedirectUrl('/auth/reset-password'),
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setSent(true)
    } catch {
      toast.error('요청 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-3xl font-bold text-blue-600">
            SoccerNote
          </Link>
          <p className="text-gray-600 mt-2">비밀번호를 재설정하세요</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <MailCheck className="w-7 h-7 text-blue-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">메일을 확인해주세요</h2>
            <p className="text-gray-500 text-sm">
              <span className="font-medium text-gray-700">{email}</span> 로 비밀번호 재설정 링크를
              보냈습니다. 메일의 링크를 눌러 새 비밀번호를 설정하세요.
            </p>
            <Link
              href="/login"
              className="inline-block mt-6 text-blue-600 font-medium hover:underline"
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  가입한 이메일
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
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {loading ? '전송 중...' : '재설정 링크 보내기'}
              </button>
            </form>
            <p className="text-center mt-6 text-gray-600">
              <Link href="/login" className="text-blue-600 font-medium hover:underline">
                로그인으로 돌아가기
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
