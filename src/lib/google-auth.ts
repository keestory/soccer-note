'use client'

import { createClient } from '@/lib/supabase'
import { consumeAuthReturn, rememberAuthReturn } from '@/lib/auth-return'

/** Login and signup share the existing web / Capacitor PKCE handoff. */
export async function startGoogleAuth(destination: string): Promise<void> {
  const supabase = createClient()
  const native = !!(window as Window & { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.()
  rememberAuthReturn(destination)
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: native
        ? { redirectTo: 'soccernote://auth/callback', skipBrowserRedirect: true }
        : { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
    if (native && data.url) {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url: data.url, presentationStyle: 'popover' })
    }
  } catch (error) {
    consumeAuthReturn()
    throw error
  }
}
