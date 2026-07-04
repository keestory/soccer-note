'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export default function SignupPage() {
  const router = useRouter()
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) toast.error(error.message)
    } catch {
      toast.error('Google 로그인 중 오류가 발생했습니다')
    } finally {
      setGoogleLoading(false)
    }
  }

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
    <div className="min-h-screen flex flex-col bg-[#f0f4f0] safe-top">

      {/* KV Hero */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0a1f0a 0%, #1a3f1a 55%, #2D5A27 100%)', minHeight: '200px' }}
      >
        <div className="field-pattern absolute inset-0" />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 390 200" fill="none" preserveAspectRatio="xMidYMid slice">
          <line x1="420" y1="50"  x2="190" y2="-10" stroke="rgba(163,230,53,0.4)"  strokeWidth="2"   strokeLinecap="round"/>
          <line x1="420" y1="90"  x2="220" y2="5"   stroke="rgba(163,230,53,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="420" y1="130" x2="250" y2="20"  stroke="rgba(163,230,53,0.14)" strokeWidth="1"   strokeLinecap="round"/>
          <circle cx="360" cy="100" r="140" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" fill="none"/>
          <circle cx="30"  cy="170" r="35"  fill="rgba(255,255,255,0.06)"   stroke="rgba(255,255,255,0.2)"  strokeWidth="1"/>
          <circle cx="300" cy="35" r="3"    fill="rgba(163,230,53,0.5)"/>
          <circle cx="260" cy="60" r="2"    fill="rgba(163,230,53,0.3)"/>
        </svg>

        <div className="relative z-10 px-6 pt-10 pb-10">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-9 h-9 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center">
              <span className="text-lg">⚽</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight">SoccerNote</span>
          </div>
          <h1 className="font-display text-3xl font-black text-white leading-tight">새 계정 만들기</h1>
          <p className="text-white/50 text-sm mt-1">팀을 만들고 기록을 시작해요</p>
        </div>
      </div>

      {/* Form card */}
      <div className="flex-1 -mt-5 bg-white rounded-t-3xl px-6 pt-7 pb-10 shadow-xl overflow-y-auto">

        {/* Google */}
        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl font-semibold text-gray-700 hover:border-gray-200 active:bg-gray-50 disabled:opacity-50 transition shadow-sm mb-5"
        >
          <GoogleIcon />
          {googleLoading ? '연결 중…' : 'Google로 계속하기'}
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">또는 이메일</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleSignup} className="space-y-3.5">
          {[
            { id: 'displayName', label: '이름 / 닉네임', type: 'text', value: displayName, onChange: setDisplayName, placeholder: '팀원들에게 보여질 이름', autoComplete: 'name' },
            { id: 'email', label: '이메일', type: 'email', value: email, onChange: setEmail, placeholder: 'email@example.com', autoComplete: 'email' },
            { id: 'password', label: '비밀번호', type: 'password', value: password, onChange: setPassword, placeholder: '6자 이상 입력', autoComplete: 'new-password' },
          ].map(field => (
            <div key={field.id}>
              <label htmlFor={field.id} className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">{field.label}</label>
              <input
                id={field.id}
                type={field.type}
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                required
                autoComplete={field.autoComplete}
                className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-[#0f2d0f] focus:bg-white outline-none transition text-base font-medium"
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <div>
            <label htmlFor="confirmPassword" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">비밀번호 확인</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className={`w-full px-4 py-3.5 rounded-2xl border-2 bg-gray-50 outline-none transition text-base font-medium ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-400 bg-red-50 focus:border-red-500'
                  : 'border-gray-100 focus:border-[#0f2d0f] focus:bg-white'
              }`}
              placeholder="비밀번호 재입력"
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-red-500 mt-1 font-medium">비밀번호가 일치하지 않습니다</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50 active:scale-[0.98] transition mt-1"
            style={{ background: '#0f2d0f', color: '#a3e635' }}
          >
            {loading ? '가입 중…' : '시작하기 🎉'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="font-black text-[#0f2d0f]">로그인</Link>
        </p>
      </div>
    </div>
  )
}

