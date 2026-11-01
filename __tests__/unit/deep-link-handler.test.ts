import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { webcrypto } from 'node:crypto'
import { DeepLinkHandler } from '@/components/DeepLinkHandler'
import { rememberAuthReturn } from '@/lib/auth-return'

type Callback = (event: { url: string }) => Promise<void>
const mocks = vi.hoisted(() => ({
  effect: vi.fn(), ref: { current: undefined as unknown },
  addListener: vi.fn(), remove: vi.fn(), close: vi.fn(),
  exchange: vi.fn(), setSession: vi.fn(), getSession: vi.fn(), refresh: vi.fn(),
  push: vi.fn(), error: vi.fn(),
}))
vi.mock('react', () => ({
  useEffect: mocks.effect,
  useRef: (initial: unknown) => {
    if (mocks.ref.current === undefined) mocks.ref.current = initial
    return mocks.ref
  },
}))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('@/lib/i18n/context', () => ({ useI18n: () => ({ t: { loginError: 'Login failed' } }) }))
vi.mock('@/lib/supabase', () => ({ createClient: () => ({ auth: { exchangeCodeForSession: mocks.exchange, setSession: mocks.setSession, getSession: mocks.getSession } }) }))
vi.mock('@/lib/dataStore', () => ({ refreshDataAfterAuth: mocks.refresh }))
vi.mock('@capacitor/app', () => ({ App: { addListener: mocks.addListener } }))
vi.mock('@capacitor/browser', () => ({ Browser: { close: mocks.close } }))
vi.mock('react-hot-toast', () => ({ default: { error: mocks.error } }))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

async function mountEffect() {
  const previous = mocks.addListener.mock.calls.length
  DeepLinkHandler()
  const effect = mocks.effect.mock.calls.at(-1)![0] as () => () => void
  const cleanup = effect()
  await vi.waitFor(() => expect(mocks.addListener).toHaveBeenCalledTimes(previous + 1))
  // Resolve the async listener registration before asking it to receive events.
  await Promise.resolve()
  return { cleanup, receive: mocks.addListener.mock.calls.at(-1)![1] as Callback }
}

describe('actual native DeepLinkHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.ref.current = undefined
    mocks.addListener.mockReset().mockResolvedValue({ remove: mocks.remove })
    mocks.remove.mockResolvedValue(undefined)
    mocks.close.mockResolvedValue(undefined)
    mocks.exchange.mockReset().mockResolvedValue({ error: null })
    mocks.setSession.mockReset().mockResolvedValue({ error: null })
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'test-user' } } } })
    mocks.refresh.mockResolvedValue(undefined)
    const values = new Map<string, string>()
    vi.stubGlobal('crypto', webcrypto)
    vi.stubGlobal('window', {
      Capacitor: { isNativePlatform: () => true },
      sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('does not exchange a one-use code again or move off the invite after a sequential duplicate', async () => {
    const { receive, cleanup } = await mountEffect()
    rememberAuthReturn('/team/join?code=ABCD2345')
    const event = { url: 'soccernote://auth/callback?code=one-use-code' }
    await receive(event)
    await receive(event)
    expect(mocks.exchange).toHaveBeenCalledExactlyOnceWith('one-use-code')
    expect(mocks.push).toHaveBeenCalledExactlyOnceWith('/team/join?code=ABCD2345')
    expect(mocks.error).not.toHaveBeenCalled()
    cleanup()
  })

  it('ignores a concurrent duplicate while its exchange is pending', async () => {
    const exchange = deferred<{ error: null }>()
    mocks.exchange.mockReturnValueOnce(exchange.promise)
    const { receive, cleanup } = await mountEffect()
    const event = { url: 'soccernote://auth/callback?code=concurrent-code' }
    const first = receive(event)
    await vi.waitFor(() => expect(mocks.exchange).toHaveBeenCalledTimes(1))
    await receive(event)
    exchange.resolve({ error: null })
    await first
    expect(mocks.exchange).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledTimes(1)
    cleanup()
  })

  it('allows a distinct callback for a later sign-in', async () => {
    const { receive, cleanup } = await mountEffect()
    await receive({ url: 'soccernote://auth/callback?code=first-code' })
    rememberAuthReturn('/team/join')
    await receive({ url: 'soccernote://auth/callback?code=second-code' })
    expect(mocks.exchange.mock.calls).toEqual([['first-code'], ['second-code']])
    expect(mocks.push.mock.calls).toEqual([['/dashboard'], ['/team/join']])
    cleanup()
  })

  it('keeps duplicate protection across an effect rerun', async () => {
    const first = await mountEffect()
    const event = { url: 'soccernote://auth/callback?code=rerender-code' }
    await first.receive(event)
    first.cleanup()
    const second = await mountEffect()
    await second.receive(event)
    expect(mocks.exchange).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    second.cleanup()
  })

  it('finishes a pending callback once when the effect reruns during exchange', async () => {
    const exchange = deferred<{ error: null }>()
    mocks.exchange.mockReturnValueOnce(exchange.promise)
    const first = await mountEffect()
    const event = { url: 'soccernote://auth/callback?code=pending-rerender' }
    const pending = first.receive(event)
    await vi.waitFor(() => expect(mocks.exchange).toHaveBeenCalledTimes(1))
    first.cleanup()
    const second = await mountEffect()
    await second.receive(event)
    exchange.resolve({ error: null })
    await pending
    expect(mocks.exchange).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledTimes(1)
    second.cleanup()
  })

  it('deduplicates the legacy token callback without retaining raw credentials', async () => {
    const { receive, cleanup } = await mountEffect()
    const event = { url: 'soccernote://auth/callback#access_token=example-access&refresh_token=example-refresh' }
    await receive(event)
    await receive(event)
    expect(mocks.setSession).toHaveBeenCalledExactlyOnceWith({ access_token: 'example-access', refresh_token: 'example-refresh' })
    expect(mocks.exchange).not.toHaveBeenCalled()
    const state = mocks.ref.current as { handled: Set<string> }
    expect([...state.handled]).toHaveLength(1)
    expect([...state.handled][0]).toMatch(/^[a-f0-9]{64}$/)
    cleanup()
  })

  it('bounds the in-memory fingerprint history', async () => {
    const { receive, cleanup } = await mountEffect()
    for (let i = 0; i < 34; i++) await receive({ url: `soccernote://auth/callback?code=unique-${i}` })
    const state = mocks.ref.current as { handled: Set<string> }
    expect(state.handled.size).toBe(32)
    expect(mocks.exchange).toHaveBeenCalledTimes(34)
    cleanup()
  })

  it('does not navigate after unmount during exchange', async () => {
    const exchange = deferred<{ error: null }>()
    mocks.exchange.mockReturnValueOnce(exchange.promise)
    const { receive, cleanup } = await mountEffect()
    const pending = receive({ url: 'soccernote://auth/callback?code=unmounted-code' })
    await vi.waitFor(() => expect(mocks.exchange).toHaveBeenCalledTimes(1))
    cleanup()
    exchange.resolve({ error: null })
    await pending
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('removes a native listener that resolves after effect cleanup', async () => {
    const registration = deferred<{ remove: typeof mocks.remove }>()
    mocks.addListener.mockReturnValueOnce(registration.promise)
    const { cleanup } = await mountEffect()
    cleanup()
    registration.resolve({ remove: mocks.remove })
    await vi.waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1))
  })

  it('rejects a lookalike callback endpoint without exchanging or navigating', async () => {
    const { receive, cleanup } = await mountEffect()
    await receive({ url: 'soccernote://auth/callbackevil?code=lookalike' })
    expect(mocks.exchange).not.toHaveBeenCalled()
    expect(mocks.push).not.toHaveBeenCalled()
    cleanup()
  })
})
