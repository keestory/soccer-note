import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Singleton to avoid multiple GoTrueClient instances
let _client: ReturnType<typeof createBrowserClient> | null = null

/**
 * In Capacitor (WKWebView), cookie-based session storage is unreliable across
 * app restarts. We wire the @supabase/ssr cookie adapter to localStorage so
 * the session survives app close/reopen while keeping the same typed client.
 */
export function createClient() {
  if (_client) return _client
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          if (typeof window === 'undefined') return undefined
          try { return localStorage.getItem(name) ?? undefined } catch { return undefined }
        },
        set(name: string, value: string) {
          if (typeof window === 'undefined') return
          try { localStorage.setItem(name, value) } catch {}
        },
        remove(name: string) {
          if (typeof window === 'undefined') return
          try { localStorage.removeItem(name) } catch {}
        },
      },
    }
  )
  return _client
}

/**
 * Returns the current user from the locally stored session without a network
 * round-trip. Server-side RLS still validates the JWT on every query, so this
 * is safe for client-side page guards and per-user data loading.
 */
export async function getSessionUser(supabase: SupabaseClient): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
