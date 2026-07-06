'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { refreshData } from '@/lib/dataStore'

/**
 * Handles soccernote:// deep links on iOS (Capacitor).
 * When Google OAuth completes, /auth/callback redirects to
 * soccernote://auth/callback, which triggers appUrlOpen here.
 * We close the in-app browser, refresh the session, and navigate to dashboard.
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
        const url = event.url
        if (!url.startsWith('soccernote://auth/callback')) return

        // Close the SFSafariViewController
        await Browser.close()

        // The session was already exchanged on the /auth/callback page.
        // Refresh the store and navigate home.
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          await refreshData()
          router.push('/dashboard')
        } else {
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
