import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient, User } from '@supabase/supabase-js'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Returns the current user from the locally stored session without a network
 * round-trip (unlike auth.getUser(), which calls the auth server every time).
 * Server-side RLS still validates the JWT on every query, so this is safe for
 * client-side page guards and per-user data loading.
 */
export async function getSessionUser(supabase: SupabaseClient): Promise<User | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
