'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { refreshDataAfterAuth } from '@/lib/dataStore'
import { authEntryPath, consumeAuthReturn, isNativeAuthCallback } from '@/lib/auth-return'
import { useI18n } from '@/lib/i18n/context'
import toast from 'react-hot-toast'

/** Native PKCE returns to the WebView holding its verifier. Legacy token callbacks remain supported. */
export function DeepLinkHandler() {
  const router = useRouter()
  const { t } = useI18n()
  // Survives locale-driven effect reruns. Store only bounded, one-way hashes;
  // the callback URL, authorization code and tokens never enter this cache.
  const callbacks = useRef({ handled: new Set<string>(), processing: false, active: false })

  useEffect(() => {
    const native = !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
    if (!native) return
    const state = callbacks.current
    state.active = true
    let disposed = false
    let cleanup: (() => void) | undefined

    const setup = async () => {
      const { App } = await import('@capacitor/app')
      const { Browser } = await import('@capacitor/browser')
      const listener = await App.addListener('appUrlOpen', async (event) => {
        if (disposed || state.processing || !isNativeAuthCallback(event.url)) return
        state.processing = true
        let destination = '/dashboard'
        try {
          const url = new URL(event.url)
          const frag = new URLSearchParams(url.hash.slice(1))
          const qs = url.searchParams
          const access_token = frag.get('access_token')
          const refresh_token = frag.get('refresh_token')
          const code = qs.get('code')
          const credential = access_token && refresh_token ? `implicit:${access_token}:${refresh_token}` : code ? `pkce:${code}` : null
          if (credential) {
            const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(credential))
            const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
            if (state.handled.has(fingerprint)) return
            state.handled.add(fingerprint)
            if (state.handled.size > 32) state.handled.delete(state.handled.values().next().value!)
          }
          destination = consumeAuthReturn()
          try { await Browser.close() } catch {}
          const supabase = createClient()
          const errDesc = frag.get('error_description') || qs.get('error_description')
          if (errDesc) throw new Error(errDesc)

          if (access_token && refresh_token) {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token })
            if (error) throw error
          } else {
            if (!code) throw new Error(t.loginError)
            const { error } = await supabase.auth.exchangeCodeForSession(code)
            if (error) throw error
          }
          const { data: { session } } = await supabase.auth.getSession()
          if (!session) throw new Error(t.loginError)
          await refreshDataAfterAuth(session.user.id)
          if (state.active) router.push(destination)
        } catch (error) {
          if (state.active) {
            toast.error(error instanceof Error ? error.message : t.loginError)
            router.push(authEntryPath('login', destination))
          }
        } finally { state.processing = false }
      })
      if (disposed) { await listener.remove(); return }
      cleanup = () => { void listener.remove() }
    }
    void setup().catch(() => { /* Web entry remains available if the native listener is unavailable. */ })
    return () => { disposed = true; state.active = false; cleanup?.() }
  }, [router, t.loginError])

  return null
}
