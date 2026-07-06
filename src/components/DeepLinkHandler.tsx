'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { refreshData } from '@/lib/dataStore'
import toast from 'react-hot-toast'

/**
 * Handles soccernote:// deep links on iOS (Capacitor).
 * Google OAuth redirects to soccernote://auth/callback?code=... —
 * the PKCE code must be exchanged HERE (inside the app WebView) because
 * the code_verifier lives in this WebView's localStorage, not Safari's.
 */
export function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.()
    if (!isCapacitor) return

    let cleanup: (() => void) | undefined

    const setup = async () => {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')

      const listener = await App.addListener('appUrlOpen', async (event) => {
        if (!event.url.startsWith('soccernote://auth/callback')) return

        // Close the SFSafariViewController
        try { await Browser.close() } catch {}

        const supabase = createClient()
        // Parse code from soccernote://auth/callback?code=...
        const query = event.url.split('?')[1] ?? ''
        const code = new URLSearchParams(query).get('code')

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            toast.error(`로그인 실패: ${error.message}`)
            router.push('/login')
            return
          }
        }

        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await refreshData()
          router.push('/dashboard')
        } else {
          toast.error('세션을 가져오지 못했습니다')
          router.push('/login')
        }
      })

      cleanup = () => { listener.remove() }
    }

    setup()
    return () => { cleanup?.() }
  }, [])

  return null
}
