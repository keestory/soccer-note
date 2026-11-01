const DEFAULT_RETURN = '/dashboard'
const PENDING_KEY = 'soccernote-auth-return'
const PENDING_TTL = 30 * 60 * 1000

/** Only destinations owned by the entry flow are accepted. Never return arbitrary URLs. */
export function safeAuthReturn(value: string | null | undefined): string {
  if (!value || /[\\\u0000-\u0020\u007f]/.test(value)) return DEFAULT_RETURN
  if (value === DEFAULT_RETURN || value === '/team/join') return value
  // Invite codes are eight characters from the existing database generator.
  const match = /^\/team\/join\?code=([A-HJ-NP-Z2-9]{8})$/i.exec(value)
  return match ? `/team/join?code=${match[1].toUpperCase()}` : DEFAULT_RETURN
}

export function authEntryPath(page: 'login' | 'signup', destination: string): string {
  const safe = safeAuthReturn(destination)
  return `/${page}${safe === DEFAULT_RETURN ? '' : `?redirect=${encodeURIComponent(safe)}`}`
}

export function isNativeAuthCallback(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'soccernote:' && url.hostname === 'auth' && url.pathname === '/callback' && !url.username && !url.password && !url.port
  } catch { return false }
}

type ReturnStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function browserStorage(): ReturnStorage | undefined {
  try { return typeof window === 'undefined' ? undefined : window.sessionStorage } catch { return undefined }
}

export function rememberAuthReturn(destination: string, storage = browserStorage(), now = Date.now()): void {
  try { storage?.setItem(PENDING_KEY, JSON.stringify({ destination: safeAuthReturn(destination), expires: now + PENDING_TTL })) } catch { /* Authentication still works without optional return storage. */ }
}

export function consumeAuthReturn(storage = browserStorage(), now = Date.now()): string {
  try {
    const raw = storage?.getItem(PENDING_KEY)
    storage?.removeItem(PENDING_KEY)
    if (!raw) return DEFAULT_RETURN
    const pending = JSON.parse(raw) as { destination?: unknown; expires?: unknown }
    if (typeof pending.expires !== 'number' || pending.expires <= now || pending.expires > now + PENDING_TTL || typeof pending.destination !== 'string') return DEFAULT_RETURN
    return safeAuthReturn(pending.destination)
  } catch { return DEFAULT_RETURN }
}
