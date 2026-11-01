import { describe, expect, it } from 'vitest'
import { authEntryPath, consumeAuthReturn, isNativeAuthCallback, rememberAuthReturn, safeAuthReturn } from '@/lib/auth-return'

function memoryStorage() {
  const values = new Map<string, string>()
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value) }, removeItem: (key: string) => { values.delete(key) } }
}

describe('entry return destinations', () => {
  it('round-trips the existing eight-character team invite through both auth pages', () => {
    const destination = safeAuthReturn('/team/join?code=abcd2345')
    expect(destination).toBe('/team/join?code=ABCD2345')
    for (const page of ['login', 'signup'] as const) {
      const url = new URL(authEntryPath(page, destination), 'https://example.test')
      expect(url.pathname).toBe(`/${page}`)
      expect(safeAuthReturn(url.searchParams.get('redirect'))).toBe(destination)
    }
    expect(safeAuthReturn('/team/join')).toBe('/team/join')
    expect(authEntryPath('login', '/dashboard')).toBe('/login')
  })

  it.each([
    null, undefined, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/team/../dashboard',
    '/team/join?code=ABCD2345&redirect=https://evil.test', '/team/join?code=ABCD2345#access_token=secret',
    '/team/join?code=12345678', '/team/join?code=ABCDEFG', '/team/join?code=ABCDEFGHJ',
    '/team/join?code=ABCD%0A23', '/team/join?code=ABCD2345\n', '/team/join?code=ABCD2345&code=ABCD2345',
    '/dashboard?next=//evil.test', '/%2f%2fevil.test', '/team%2fjoin?code=ABCD2345', '/team/join?code=%', '/admin',
  ])('rejects unsafe or out-of-scope return values: %s', value => {
    expect(safeAuthReturn(value)).toBe('/dashboard')
  })

  it('consumes a pending OAuth return once and rejects expired or tampered storage', () => {
    const storage = memoryStorage()
    rememberAuthReturn('/team/join?code=ABCD2345', storage, 1000)
    expect(consumeAuthReturn(storage, 2000)).toBe('/team/join?code=ABCD2345')
    expect(consumeAuthReturn(storage, 2000)).toBe('/dashboard')
    rememberAuthReturn('/team/join', storage, 1000)
    expect(consumeAuthReturn(storage, 1000 + 30 * 60 * 1000)).toBe('/dashboard')
    storage.setItem('soccernote-auth-return', JSON.stringify({ destination: '//evil.test', expires: 3000 }))
    expect(consumeAuthReturn(storage, 2000)).toBe('/dashboard')
    storage.setItem('soccernote-auth-return', 'invalid-json')
    expect(consumeAuthReturn(storage, 2000)).toBe('/dashboard')
  })

  it('keeps authentication usable when session storage is unavailable', () => {
    const unavailable = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } }
    expect(() => rememberAuthReturn('/team/join', unavailable)).not.toThrow()
    expect(consumeAuthReturn(unavailable)).toBe('/dashboard')
  })
})

describe('native auth callback boundary', () => {
  it('accepts the existing PKCE and legacy implicit callback shapes', () => {
    expect(isNativeAuthCallback('soccernote://auth/callback?code=example')).toBe(true)
    expect(isNativeAuthCallback('soccernote://auth/callback#access_token=example&refresh_token=example')).toBe(true)
  })
  it.each(['soccernote://auth/callbackevil?code=x', 'soccernote://auth/callback/extra', 'soccernote://auth.evil/callback', 'https://auth/callback', 'soccernote://user@auth/callback', 'soccernote://auth:99/callback', 'not-a-url'])(
    'rejects a callback outside the registered endpoint: %s', value => expect(isNativeAuthCallback(value)).toBe(false),
  )
})
