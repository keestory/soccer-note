import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Exchanges a Supabase auth `code` (PKCE) for a session and makes sure the
 * user's profile row exists. Shared by the web /auth/callback page and the
 * native deep-link handler.
 */
export async function exchangeAndEnsureProfile(supabase: SupabaseClient, code: string) {
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) return { error }

  const user = data.user
  if (user) {
    try {
      await supabase.from('profiles').upsert({
        id: user.id,
        email: user.email,
        display_name: (user.user_metadata?.display_name as string) || user.email,
      })
    } catch {
      // Non-fatal: profile may be created elsewhere or already exist
    }
  }

  return { user }
}
