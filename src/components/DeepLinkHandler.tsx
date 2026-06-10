'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { createClient } from '@/lib/supabase'
import { exchangeAndEnsureProfile } from '@/lib/auth-exchange'

/**
 * On native platforms, Supabase email links (confirmation / password recovery)
 * open the system browser and then redirect back to the app via the custom
 * `soccernote://auth/callback` scheme. This component listens for that deep
 * link, exchanges the PKCE code for a session, and routes the user onward.
 *
 * No-op on web (where /auth/callback handles the redirect directly).
 */
export function DeepLinkHandler() {
  const router = useRouter()

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let remove: (() => void) | undefined

    ;(async () => {
      const { App } = await import('@capacitor/app')
      const handle = await App.addListener('appUrlOpen', async ({ url }) => {
        if (!url || !url.includes('auth/callback')) return
        try {
          // Custom-scheme URLs (soccernote://auth/callback?...) parse fine with URL
          const parsed = new URL(url)
          const code = parsed.searchParams.get('code')
          const next = parsed.searchParams.get('next') || '/dashboard'
          if (!code) return

          const supabase = createClient()
          const { error } = await exchangeAndEnsureProfile(supabase, code)
          router.replace(error ? '/login' : next)
        } catch {
          router.replace('/login')
        }
      })
      remove = () => handle.remove()
    })()

    return () => {
      remove?.()
    }
  }, [router])

  return null
}
