'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Suspense } from 'react'

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient()
      const code = searchParams.get('code')

      if (code) {
        // Exchange PKCE code for session
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Auth callback error:', error)
          router.push('/login')
          return
        }
      }

      // If running inside Capacitor (soccernote:// scheme available),
      // signal the app to close the browser and refresh session.
      // We detect Capacitor by checking if the app can open custom schemes.
      const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()

      if (isCapacitor) {
        // Close SFSafariViewController by redirecting to custom scheme.
        // The app's AppUrlOpen listener will catch this and refresh the session.
        window.location.href = 'soccernote://auth/callback?status=ok'
      } else {
        router.push('/dashboard')
      }
    }

    handleCallback()
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
