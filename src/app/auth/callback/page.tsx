'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'
import { authEntryPath, consumeAuthReturn } from '@/lib/auth-return'
import { refreshDataAfterAuth } from '@/lib/dataStore'
import { useI18n } from '@/lib/i18n/context'

function CallbackHandler() {
  const router = useRouter()
  const { t } = useI18n()

  useEffect(() => {
    // detectSessionInUrl completes the existing web PKCE exchange. Do not
    // manually exchange the same one-use code a second time here.
    const supabase = createClient()
    let done = false
    let disposed = false
    let finishTimer: ReturnType<typeof setTimeout> | undefined
    const finish = (userId: string) => {
      if (done || disposed) return
      done = true
      // Leave the synchronous auth callback before reading the session again;
      // Supabase holds its auth lock while notifying subscribers.
      finishTimer = setTimeout(async () => {
        const destination = consumeAuthReturn()
        try {
          await refreshDataAfterAuth(userId)
          if (!disposed) router.replace(destination)
        } catch {
          if (!disposed) router.replace(authEntryPath('login', destination))
        }
      }, 0)
    }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish(session.user.id)
    })

    // In case the session was already established before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish(session.user.id)
    }).catch(() => {})

    // Fallback if nothing arrives
    const timer = setTimeout(() => {
      if (!done && !disposed) { done = true; router.replace(authEntryPath('login', consumeAuthReturn())) }
    }, 6000)

    return () => { disposed = true; sub.subscription.unsubscribe(); clearTimeout(timer); clearTimeout(finishTimer) }
  }, [router])

  return (
    <div className="light min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--text)', borderTopColor: 'transparent' }} />
        <p role="status" className="text-sm" style={{ color: 'var(--muted2)' }}>{t.connecting}</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--text)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
