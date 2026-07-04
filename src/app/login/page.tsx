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
      {/* Branded hero — KV with speed lines */}
      <div className="relative overflow-hidden px-6 pt-16 pb-12 text-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0a1f0a 0%, #1a3f1a 55%, #2D5A27 100%)' }}>
        <div className="field-pattern absolute inset-0" />
        {/* KV SVG layer */}
        <svg viewBox="0 0 390 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice">
          {/* Speed streaks */}
          <line x1="390" y1="42"  x2="200" y2="-16" stroke="rgba(163,230,53,0.5)"  strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="390" y1="72"  x2="225" y2="4"   stroke="rgba(163,230,53,0.32)" strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="390" y1="102" x2="245" y2="16"  stroke="rgba(163,230,53,0.2)"  strokeWidth="0.9" strokeLinecap="round"/>
          <line x1="390" y1="135" x2="215" y2="32"  stroke="rgba(255,255,255,0.09)" strokeWidth="1.3" strokeLinecap="round"/>
          <line x1="378" y1="162" x2="178" y2="58"  stroke="rgba(163,230,53,0.15)" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="390" y1="22"  x2="218" y2="-26" stroke="rgba(255,255,255,0.06)" strokeWidth="0.9" strokeLinecap="round"/>
          {/* Stadium circle hint */}
          <circle cx="335" cy="185" r="135" stroke="rgba(255,255,255,0.05)" strokeWidth="1.2" fill="none"/>
          {/* Ball motion trail */}
          <ellipse cx="122" cy="186" rx="58" ry="15" fill="rgba(163,230,53,0.07)" transform="rotate(-20 122 186)"/>
          <ellipse cx="162" cy="175" rx="38" ry="10" fill="rgba(163,230,53,0.04)" transform="rotate(-20 162 175)"/>
          {/* Ball */}
          <circle cx="74" cy="195" r="42" fill="rgba(255,255,255,0.09)" stroke="rgba(255,255,255,0.28)" strokeWidth="1.3"/>
          <polygon points="74,166 89,177 84,195 64,195 59,177" fill="rgba(0,0,0,0.2)"  stroke="rgba(255,255,255,0.22)" strokeWidth="0.7"/>
          <polygon points="74,166 59,177 48,167 52,149 74,148" fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7"/>
          <polygon points="89,177 101,169 103,151 78,148 74,166" fill="rgba(0,0,0,0.15)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.7"/>
          {/* Bokeh dots */}
          <circle cx="298" cy="30"  r="2.5" fill="rgba(163,230,53,0.45)"/>
          <circle cx="263" cy="58"  r="1.8" fill="rgba(163,230,53,0.28)"/>
          <circle cx="325" cy="68"  r="3.5" fill="rgba(255,255,255,0.06)"/>
          <circle cx="283" cy="16"  r="1.8" fill="rgba(163,230,53,0.32)"/>
          <circle cx="348" cy="108" r="2.2" fill="rgba(255,255,255,0.05)"/>
          <circle cx="48"  cy="60"  r="2"   fill="rgba(163,230,53,0.2)"/>
        </svg>
        {/* Text */}
        <div className="relative z-10">
          <h1 className="font-display text-3xl font-black text-white tracking-tight">SoccerNote</h1>
          <p className="text-white/60 mt-2 text-sm font-medium">같이 뛰면 더 즐겁잖아요 ⚡</p>
        </div>
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
