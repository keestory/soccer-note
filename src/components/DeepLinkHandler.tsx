'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { refreshData } from '@/lib/dataStore'
import toast from 'react-hot-toast'

/**
 * Handles soccernote:// deep links on iOS (Capacitor).
 * Google OAuth (implicit flow) redirects to
 *   soccernote://auth/callback#access_token=...&refresh_token=...
 * We parse the tokens from the URL fragment and set the session directly,
 * avoiding the PKCE code_verifier storage handoff that breaks in WKWebView.
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

        // Close the in-app browser
        try { await Browser.close() } catch {}

        const supabase = createClient()

        // Tokens may be in the fragment (#) for implicit flow, or query (?) for errors
        const hash = event.url.includes('#') ? event.url.split('#')[1] : ''
        const query = event.url.includes('?') ? event.url.split('?')[1].split('#')[0] : ''
        const frag = new URLSearchParams(hash)
        const qs = new URLSearchParams(query)

        const errDesc = frag.get('error_description') || qs.get('error_description')
        if (errDesc) {
          toast.error(`로그인 실패: ${errDesc}`)
          router.push('/login')
          return
        }

        const access_token = frag.get('access_token')
        const refresh_token = frag.get('refresh_token')

        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (error) {
            toast.error(`로그인 실패: ${error.message}`)
            router.push('/login')
            return
          }
        } else {
          // Fallback: maybe a PKCE code (?code=) — try exchanging it
          const code = qs.get('code')
          if (code) {
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) {
              toast.error(`로그인 실패: ${error.message}`)
              router.push('/login')
              return
            }
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
