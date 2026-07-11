'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'

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
  const { t } = useI18n()
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
      toast.error(t.loginError)
    } finally {
      setGoogleLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { toast.error(t.nameRequired); return }
    if (password !== confirmPassword) { toast.error(t.passwordsNoMatch); return }
    if (password.length < 6) { toast.error(t.passwordMinLength); return }

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
      toast.success(t.signupSuccessMessage)
      router.push('/login')
    } catch {
      toast.error(t.signupError)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    color: '#ffffff',
    borderRadius: 12,
  }

  return (
    <div className="min-h-screen flex flex-col safe-top safe-bottom" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="px-6 pt-6 pb-2">
        <p className="font-display text-[11px] tracking-[0.18em] uppercase" style={{ color: 'var(--accent)' }}>SOCCERNOTE</p>
        <h1 className="font-display text-[28px] text-white leading-tight mt-1"> {t.newAccountTitle}</h1>
        <p className="text-[13px] mt-1" style={{ color: 'var(--muted2)' }}>{t.newAccountSubtitle}</p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-6 pt-5 pb-10">
        {/* Google */}
        <button
          onClick={handleGoogleSignup}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-[12px] font-semibold text-[14px] disabled:opacity-50 transition active:scale-[0.98] mb-4"
          style={{ background: '#ffffff', color: '#111' }}
        >
          <GoogleIcon />
          {googleLoading ? t.connecting : t.continueWithGoogle}
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
          <span className="text-[11px] font-medium" style={{ color: 'var(--muted2)' }}>{t.orEmail}</span>
          <div className="flex-1 h-px" style={{ background: 'var(--line)' }} />
        </div>

        <form onSubmit={handleSignup} className="space-y-3.5">
          {[
            { id: 'displayName', label: t.nameLabel, type: 'text', value: displayName, onChange: setDisplayName, placeholder: t.namePlaceholder, autoComplete: 'name' },
            { id: 'email', label: t.email, type: 'email', value: email, onChange: setEmail, placeholder: 'email@example.com', autoComplete: 'email' },
            { id: 'password', label: t.password, type: 'password', value: password, onChange: setPassword, placeholder: t.passwordMin6, autoComplete: 'new-password' },
          ].map(field => (
            <div key={field.id}>
              <label htmlFor={field.id} className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{field.label}</label>
              <input
                id={field.id}
                type={field.type}
                value={field.value}
                onChange={e => field.onChange(e.target.value)}
                required
                autoComplete={field.autoComplete}
                className="w-full px-4 py-3.5 outline-none transition text-[15px] font-medium"
                style={inputStyle}
                placeholder={field.placeholder}
              />
            </div>
          ))}

          <div>
            <label htmlFor="confirmPassword" className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.passwordConfirm}</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-3.5 outline-none transition text-[15px] font-medium"
              style={{
                ...inputStyle,
                ...(confirmPassword && password !== confirmPassword ? { border: '1px solid #ef4444' } : {}),
              }}
              placeholder={t.passwordReenter}
            />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-[12px] text-red-400 mt-1 font-medium">{t.passwordsNoMatch}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-[14px] font-black text-[16px] disabled:opacity-50 active:scale-[0.98] transition"
            style={{ background: 'var(--accent)', color: '#0a0a0a' }}
          >
            {loading ? t.loading : t.getStarted}
          </button>

          <p className="text-center text-[13px]" style={{ color: 'var(--muted2)' }}>
            {t.hasAccount}{' '}
            <Link href="/login" className="font-black text-white">{t.login}</Link>
          </p>
        </form>
      </div>
    </div>
  )
}

