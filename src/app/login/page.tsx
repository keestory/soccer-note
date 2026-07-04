'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

/* KV SVG — same visual language as onboarding */
function LoginKV() {
  return (
    <svg
      viewBox="0 0 390 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      {/* Speed streaks */}
      <line x1="420" y1="60"  x2="190" y2="-10" stroke="rgba(163,230,53,0.45)" strokeWidth="2"   strokeLinecap="round"/>
      <line x1="420" y1="100" x2="220" y2="5"   stroke="rgba(163,230,53,0.28)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="420" y1="140" x2="250" y2="20"  stroke="rgba(163,230,53,0.16)" strokeWidth="1"   strokeLinecap="round"/>
      <line x1="420" y1="30"  x2="200" y2="-30" stroke="rgba(255,255,255,0.07)" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="400" y1="190" x2="160" y2="55"  stroke="rgba(163,230,53,0.12)" strokeWidth="2.5" strokeLinecap="round"/>

      {/* Stadium circle — right side */}
      <circle cx="360" cy="130" r="160" stroke="rgba(255,255,255,0.04)" strokeWidth="1.5" fill="none"/>
      <circle cx="360" cy="130" r="95"  stroke="rgba(255,255,255,0.03)" strokeWidth="1"   fill="none"/>

      {/* Motion trail */}
      <ellipse cx="90"  cy="220" rx="55"  ry="14" fill="rgba(163,230,53,0.10)" transform="rotate(-18 90 220)"/>
      <ellipse cx="130" cy="208" rx="38"  ry="9"  fill="rgba(163,230,53,0.06)" transform="rotate(-18 130 208)"/>

      {/* Soccer ball */}
      <circle cx="48" cy="228" r="42" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5"/>
      <polygon points="48,193 65,206 60,226 36,226 31,206"          fill="rgba(0,0,0,0.2)"  stroke="rgba(255,255,255,0.22)" strokeWidth="0.75"/>
      <polygon points="48,193 31,206 18,195 23,176 48,174"          fill="rgba(0,0,0,0.14)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75"/>
      <polygon points="65,206 79,196 81,176 60,173 48,193"          fill="rgba(0,0,0,0.14)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75"/>
      <polygon points="79,196 83,214 68,225 60,226 65,206"          fill="rgba(0,0,0,0.14)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75"/>
      <polygon points="36,226 60,226 68,225 62,240 28,240"          fill="rgba(0,0,0,0.14)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75"/>
      <polygon points="31,206 36,226 28,240 13,233 10,212"          fill="rgba(0,0,0,0.14)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.75"/>

      {/* Bokeh */}
      <circle cx="300" cy="45"  r="3"   fill="rgba(163,230,53,0.5)"/>
      <circle cx="260" cy="75"  r="2"   fill="rgba(163,230,53,0.3)"/>
      <circle cx="330" cy="95"  r="4"   fill="rgba(255,255,255,0.06)"/>
      <circle cx="280" cy="25"  r="2"   fill="rgba(163,230,53,0.35)"/>
      <circle cx="350" cy="165" r="2.5" fill="rgba(255,255,255,0.05)"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
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
    <div className="min-h-screen flex flex-col bg-[#f0f4f0] safe-top">

      {/* KV Hero */}
      <div
        className="relative overflow-hidden flex-shrink-0"
        style={{ background: 'linear-gradient(135deg, #0a1f0a 0%, #1a3f1a 55%, #2D5A27 100%)', minHeight: '260px' }}
      >
        <div className="field-pattern absolute inset-0" />
        <LoginKV />

        <div className="relative z-10 px-6 pt-12 pb-10">
          {/* App name */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-lime-400/20 border border-lime-400/30 flex items-center justify-center">
              <span className="text-lg">⚽</span>
            </div>
            <span className="text-white font-black text-lg tracking-tight">SoccerNote</span>
          </div>

          {/* Headline */}
          <h1 className="font-display text-4xl font-black text-white leading-[1.1] mb-2">
            같이 뛰면<br />더 즐겁잖아요
          </h1>
          <p className="text-white/50 text-sm">팀의 모든 순간을 기록해요</p>
        </div>
      </div>

      {/* Form card — floats over hero with negative margin */}
      <div className="flex-1 -mt-5 bg-white rounded-t-3xl px-6 pt-7 pb-10 shadow-xl">

        <h2 className="text-xl font-black text-gray-900 mb-5">로그인</h2>

        {/* Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white border-2 border-gray-100 rounded-2xl font-semibold text-gray-700 hover:border-gray-200 active:bg-gray-50 disabled:opacity-50 transition shadow-sm mb-5"
        >
          <GoogleIcon />
          {googleLoading ? '연결 중…' : 'Google로 계속하기'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">또는 이메일</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        <form onSubmit={handleLogin} className="space-y-3.5">
          <div>
            <label htmlFor="email" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-[#0f2d0f] focus:bg-white outline-none transition text-base font-medium"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:border-[#0f2d0f] focus:bg-white outline-none transition text-base font-medium"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-50 active:scale-[0.98] transition mt-1"
            style={{ background: '#0f2d0f', color: '#a3e635' }}
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-sm">
          계정이 없으신가요?{' '}
          <Link href="/signup" className="font-black text-[#0f2d0f]">회원가입</Link>
        </p>
      </div>
    </div>
  )
}
