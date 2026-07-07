'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'

function GoogleIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()

      if (isCapacitor) {
        // In Capacitor: open OAuth in SFSafariViewController so it stays in-app.
        // The callback must come back to the app itself (soccernote://) because
        // the PKCE code_verifier lives in the app WebView's localStorage —
        // exchanging the code inside Safari would fail.
        const { Browser } = await import('@capacitor/browser')
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'soccernote://auth/callback',
            skipBrowserRedirect: true,
          },
        })
        if (error) { toast.error(error.message); return }
        if (data.url) await Browser.open({ url: data.url, presentationStyle: 'popover' })
      } else {
        // Web: standard redirect flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) toast.error(error.message)
      }
    } catch (err) {
      toast.error(`Google 로그인 오류: ${err instanceof Error ? err.message : String(err)}`)
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
      router.push('/dashboard')
    } catch {
      toast.error('로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col justify-center safe-top" style={{ background: 'var(--bg)', padding: '0 30px' }}>

      {/* Logo + app name */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-16 h-16 flex items-center justify-center mb-4"
          style={{ background: 'var(--accent)', borderRadius: 20 }}
        >
          <span className="font-display text-4xl leading-none" style={{ color: '#0a0a0a', letterSpacing: '0.05em' }}>S</span>
        </div>
        <span className="font-display text-[34px] leading-none text-white mb-2" style={{ letterSpacing: '0.08em' }}>SOCCERNOTE</span>
        <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>우리 팀 경기의 모든 기록</p>
      </div>

      {/* Google button */}
      <button
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-2.5 mb-5 disabled:opacity-50 active:scale-[0.98] transition"
        style={{
          background: '#fff',
          color: '#1a1a1a',
          fontWeight: 700,
          fontSize: 15,
          borderRadius: 13,
          padding: '15px',
        }}
      >
        <GoogleIcon />
        {googleLoading ? '연결 중…' : 'Google로 계속하기'}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px" style={{ background: '#1c1c1c' }} />
        <span className="text-[11px]" style={{ color: '#555' }}>또는 이메일</span>
        <div className="flex-1 h-px" style={{ background: '#1c1c1c' }} />
      </div>

      {/* Email / Password form */}
      <form onSubmit={handleLogin} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          autoComplete="email"
          placeholder="이메일"
          className="w-full outline-none text-base text-white placeholder-[#555] transition"
          style={{
            background: 'var(--card)',
            border: '1px solid var(--line)',
            borderRadius: 13,
            padding: '15px 16px',
          }}
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="비밀번호"
            className="w-full outline-none text-base text-white placeholder-[#555] transition"
            style={{
              background: 'var(--card)',
              border: '1px solid var(--line)',
              borderRadius: 13,
              padding: '15px 48px 15px 16px',
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px]"
            style={{ color: 'var(--muted2)' }}
          >
            {showPassword ? '숨기기' : '보기'}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full font-black text-[16px] disabled:opacity-50 active:scale-[0.98] transition"
          style={{
            background: 'var(--accent)',
            color: '#0a0a0a',
            borderRadius: 13,
            padding: '15px',
          }}
        >
          {loading ? '로그인 중…' : '로그인'}
        </button>
      </form>

      <p className="text-center mt-6 text-[14px]" style={{ color: '#888' }}>
        계정이 없으신가요?{' '}
        <Link href="/signup" className="font-bold" style={{ color: 'var(--accent)' }}>회원가입</Link>
      </p>
    </div>
  )
}
