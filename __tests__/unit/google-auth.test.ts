import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { consumeAuthReturn } from '@/lib/auth-return'
import { startGoogleAuth } from '@/lib/google-auth'

const mocks = vi.hoisted(() => ({ oauth: vi.fn(), open: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ createClient: () => ({ auth: { signInWithOAuth: mocks.oauth } }) }))
vi.mock('@capacitor/browser', () => ({ Browser: { open: mocks.open } }))

describe('shared Google auth handoff', () => {
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('window', {
      location: { origin: 'https://soccer.example' },
      sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    })
    mocks.oauth.mockReset().mockResolvedValue({ data: { url: 'https://provider.example/oauth' }, error: null })
    mocks.open.mockReset().mockResolvedValue(undefined)
  })
  afterEach(() => vi.unstubAllGlobals())

  it('uses the established web callback and retains the safe invitation', async () => {
    await startGoogleAuth('/team/join?code=ABCD2345')
    expect(mocks.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'https://soccer.example/auth/callback' } })
    expect(mocks.open).not.toHaveBeenCalled()
    expect(consumeAuthReturn()).toBe('/team/join?code=ABCD2345')
  })

  it('uses the native callback and in-app browser for either entry screen', async () => {
    Object.assign(window, { Capacitor: { isNativePlatform: () => true } })
    await startGoogleAuth('/team/join')
    expect(mocks.oauth).toHaveBeenCalledWith({ provider: 'google', options: { redirectTo: 'soccernote://auth/callback', skipBrowserRedirect: true } })
    expect(mocks.open).toHaveBeenCalledWith({ url: 'https://provider.example/oauth', presentationStyle: 'popover' })
    expect(consumeAuthReturn()).toBe('/team/join')
  })

  it('clears the pending return when the provider fails', async () => {
    mocks.oauth.mockResolvedValue({ data: {}, error: new Error('Provider unavailable') })
    await expect(startGoogleAuth('/team/join')).rejects.toThrow('Provider unavailable')
    expect(consumeAuthReturn()).toBe('/dashboard')
    expect(mocks.open).not.toHaveBeenCalled()
  })
})
