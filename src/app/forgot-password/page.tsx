'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useI18n } from '@/lib/i18n/context'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) { toast.error(error.message); return }
      setSent(true)
      toast.success(t.resetLinkSent)
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
        <p className="text-[13px]" style={{ color: 'var(--muted2)' }}>{t.resetPasswordDesc}</p>
      </div>

      {sent ? (
        <div
          className="text-[14px] leading-relaxed mb-6"
          style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '18px 16px', color: 'var(--text2)' }}
        >
          {t.resetLinkSent}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
            placeholder={t.email}
            className="w-full outline-none text-base text-[color:var(--text)] placeholder-[#98a2b3] transition"
            style={{ background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 13, padding: '15px 16px' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full font-black text-[16px] disabled:opacity-50 active:scale-[0.98] transition"
            style={{ background: 'var(--navy)', color: 'var(--text)', borderRadius: 13, padding: '15px' }}
          >
            {loading ? t.loading : t.sendResetLink}
          </button>
        </form>
      )}

      <p className="text-center mt-6 text-[14px]">
        <Link href="/login" className="font-bold" style={{ color: 'var(--text)' }}>{t.backToLogin}</Link>
      </p>
    </div>
  )
}
