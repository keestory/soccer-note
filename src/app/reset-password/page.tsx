'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'

export default function ResetPasswordPage() {
  const router = useRouter()
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)

  // The recovery link establishes a temporary session (implicit flow parses the
  // token from the URL). Wait for it before allowing a password change.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) { setReady(true); setChecking(false) }
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session || event === 'PASSWORD_RECOVERY') { setReady(true); setChecking(false) }
    })
    const timeout = setTimeout(() => setChecking(false), 3000)
    return () => { sub.subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) { toast.error(t.passwordMinLength); return }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        // Supabase returns the password-complexity policy error in English —
        // surface a friendly localized message instead.
        const msg = /should contain|complex|weak|character of each/i.test(error.message)
          ? t.passwordPolicyHint
          : error.message
        toast.error(msg)
        return
      }
      toast.success(t.passwordUpdatedMessage)
      await supabase.auth.signOut()
      router.replace('/login')
    } catch {
      toast.error(t.loginError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="light min-h-screen flex flex-col justify-center safe-top" style={{ background: 'var(--bg)', padding: '0 30px' }}>
      <div className="mb-8">
        <h1 className="font-display text-[28px] leading-none text-[color:var(--text)] mb-2" style={{ letterSpacing: '0.04em' }}>{t.resetPasswordTitle}</h1>
        <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{t.newPasswordLabel}</p>
      </div>

      {checking ? (
        <p className="text-center text-[14px]" style={{ color: 'var(--muted2)' }}>…</p>
      ) : ready ? (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder={t.newPasswordLabel}
              className="w-full outline-none text-base text-[color:var(--text)] placeholder-[#98a2b3] transition"
              style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '15px 48px 15px 16px' }}
            />
            <button
              type="button"
              onClick={() => setShow(v => !v)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px]"
              style={{ color: 'var(--muted2)' }}
            >
              {show ? t.hide : t.show}
            </button>
          </div>
          <p className="text-[12px] leading-relaxed px-1" style={{ color: 'var(--muted2)' }}>{t.passwordPolicyHint}</p>
          <button
            type="submit"
            disabled={loading}
            className="w-full font-black text-[16px] disabled:opacity-50 active:scale-[0.98] transition"
            style={{ background: 'var(--navy)', color: 'var(--accent)', borderRadius: 13, padding: '15px' }}
          >
            {loading ? t.loading : t.updatePasswordButton}
          </button>
        </form>
      ) : (
        <div
          className="text-[14px] leading-relaxed mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '18px 16px', color: 'var(--text2)' }}
        >
          {t.resetSessionInvalid}
        </div>
      )}

      <p className="text-center mt-6 text-[14px]">
        <Link href="/login" className="font-bold" style={{ color: 'var(--text)' }}>{t.backToLogin}</Link>
      </p>
    </div>
  )
}
