import { Capacitor } from '@capacitor/core'

// Custom URL scheme registered in the native apps (iOS Info.plist / Android manifest)
export const NATIVE_AUTH_SCHEME = 'soccernote://auth/callback'

/**
 * Builds the redirect URL used for Supabase email links (signup confirmation,
 * password recovery). On native platforms we return a custom scheme so the OS
 * can re-open the app; on web we use the current origin's /auth/callback route.
 *
 * `next` is where the callback should send the user after exchanging the code
 * (e.g. '/auth/reset-password' for password recovery).
 */
export function getAuthRedirectUrl(next?: string): string {
  const base = Capacitor.isNativePlatform()
    ? NATIVE_AUTH_SCHEME
    : `${window.location.origin}/auth/callback`

  return next ? `${base}?next=${encodeURIComponent(next)}` : base
}
