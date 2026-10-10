import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'

// Singleton to avoid multiple GoTrueClient instances
let _client: SupabaseClient | null = null

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
        getAll() {
          if (typeof window === 'undefined') return []
          try {
            return Object.keys(localStorage).map(name => ({
              name,
              value: localStorage.getItem(name) ?? '',
            }))
          } catch {
            return []
          }
        },
        setAll(cookiesToSet) {
          if (typeof window === 'undefined') return
          try {
            cookiesToSet.forEach(({ name, value }) => {
              if (value) localStorage.setItem(name, value)
              else localStorage.removeItem(name)
            })
          } catch {}
        },
      },
      // PKCE (the default) issues a refresh token, so autoRefreshToken can keep
      // the session alive indefinitely — implicit-flow sessions were expiring
      // and logging users out. The session is persisted in localStorage (see the
      // cookie adapter above), which survives WKWebView app restarts.
      // Capacitor Google OAuth returns ?code= to the soccernote:// deep link and
      // DeepLinkHandler completes it via exchangeCodeForSession (the verifier
      // lives in this client's localStorage).
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
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

/**
 * Authorization header carrying the current access token, for calling our own
 * API routes. With implicit-flow / WKWebView the session lives in browser
 * storage rather than a server-readable cookie, so server routes must accept
 * this Bearer token instead of relying on the auth cookie.
 */
export async function authHeader(supabase: SupabaseClient): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
}
