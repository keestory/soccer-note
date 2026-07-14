'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()

  useEffect(() => {
    // Web implicit flow: createBrowserClient (detectSessionInUrl) auto-parses
    // the #access_token fragment and fires SIGNED_IN. We just wait for it.
    const supabase = createClient()
    let done = false
    const finish = (path: string) => { if (!done) { done = true; router.replace(path) } }

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) finish('/dashboard')
    })

    // In case the session was already established before we subscribed
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) finish('/dashboard')
    })

    // Fallback if nothing arrives
    const timer = setTimeout(() => finish('/login'), 6000)

    return () => { sub.subscription.unsubscribe(); clearTimeout(timer) }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 rounded-full animate-spin mx-auto mb-3"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm" style={{ color: '#555' }}>로그인 처리 중…</p>
      </div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  )
}
