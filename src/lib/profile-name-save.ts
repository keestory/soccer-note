import type { SupabaseClient } from '@supabase/supabase-js'

export type NameStage = 'unstarted' | 'confirmed' | 'rejected' | 'unknown'
export interface NameAttempt {
  version: 1
  accountId: string
  name: string
  auth: NameStage
  profile: NameStage
}
export interface NameAccount { id: string; email: string; token: string }
export interface NameGateway {
  account(): Promise<NameAccount | null>
  readAuth(account: NameAccount): Promise<string | null>
  readProfile(account: NameAccount): Promise<string | null>
  writeAuth(account: NameAccount, name: string): Promise<NameStage>
  writeProfile(account: NameAccount, name: string): Promise<NameStage>
}
export interface NameJournal {
  read(accountId: string): NameAttempt | null
  write(attempt: NameAttempt): void
  clear(accountId: string): void
}
export type NameOutcome = 'saved' | 'incomplete' | 'unverified' | 'storage-blocked' | 'stale'
export interface NameResult { attempt: NameAttempt; outcome: NameOutcome }

const prefix = 'soccernote-profile-name-v1:'
const stages: NameStage[] = ['unstarted', 'confirmed', 'rejected', 'unknown']
class NameJournalError extends Error {}

/** Same-tab recovery only. Never store a token or email in the write-ahead journal. */
export function createNameJournal(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): NameJournal {
  return {
    read(accountId) {
      const raw = storage.getItem(prefix + accountId)
      if (!raw) return null
      const value = JSON.parse(raw) as NameAttempt
      if (value.version !== 1 || value.accountId !== accountId || typeof value.name !== 'string' || !value.name.trim()
          || !stages.includes(value.auth) || !stages.includes(value.profile)) throw new Error('Invalid name save journal')
      return { version: 1, accountId, name: value.name, auth: value.auth, profile: value.profile }
    },
    write(attempt) {
      const value = JSON.stringify(attempt)
      storage.setItem(prefix + attempt.accountId, value)
      if (storage.getItem(prefix + attempt.accountId) !== value) throw new Error('Name save journal unavailable')
    },
    clear(accountId) { storage.removeItem(prefix + accountId) },
  }
}

export function newNameAttempt(accountId: string, name: string): NameAttempt {
  return { version: 1, accountId, name, auth: 'unstarted', profile: 'unstarted' }
}
export function nameAttemptComplete(attempt: NameAttempt) {
  return attempt.auth === 'confirmed' && attempt.profile === 'confirmed'
}
export function nameAttemptUnknown(attempt: NameAttempt) {
  return attempt.auth === 'unknown' || attempt.profile === 'unknown'
}

/** Only explicit, structured client-error rejections permit a later checked retry. */
function responseStage(status: number, error: unknown): NameStage {
  const structured = typeof error === 'object' && error !== null && ('code' in error || 'error_code' in error)
  return structured && [400, 401, 403, 409, 422].includes(status) ? 'rejected' : 'unknown'
}

/** Abort stops waiting, not a claim that the server undid an in-flight write. */
function bounded<T>(parent: AbortSignal, request: (signal: AbortSignal) => PromiseLike<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController()
    const abort = () => { controller.abort(); reject(new Error('Profile request interrupted')) }
    const timer = setTimeout(abort, 20_000)
    const cleanup = () => { clearTimeout(timer); parent.removeEventListener('abort', abort) }
    parent.addEventListener('abort', abort, { once: true })
    if (parent.aborted) { abort(); cleanup(); return }
    Promise.resolve().then(() => request(controller.signal)).then(resolve, reject).finally(cleanup)
    // Remove listeners even when a non-fetch implementation ignores abort.
    controller.signal.addEventListener('abort', cleanup, { once: true })
  })
}

export function createNameGateway(client: SupabaseClient, signal: AbortSignal): NameGateway {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const authRequest = (account: NameAccount, method: 'GET' | 'PUT', name?: string) => bounded(signal, async requestSignal => {
    const response = await fetch(`${url}/auth/v1/user`, {
      method, signal: requestSignal, cache: 'no-store', credentials: 'omit',
      headers: { apikey: anonKey, Authorization: `Bearer ${account.token}`, 'Content-Type': 'application/json' },
      ...(method === 'PUT' ? { body: JSON.stringify({ data: { display_name: name } }) } : {}),
    })
    return { ok: response.ok, status: response.status, body: await response.json() }
  })
  return {
    async account() {
      const { data: { session }, error } = await bounded(signal, () => client.auth.getSession())
      if (error) throw error
      return session ? { id: session.user.id, email: session.user.email || '', token: session.access_token } : null
    },
    async readAuth(account) {
      // auth-js updateUser saves its captured session before resolving. A scoped
      // request avoids restoring an old account after a late response. This GET
      // also avoids mutating the SDK session on a stale auth error.
      const response = await authRequest(account, 'GET')
      const body = response.body
      const user = body?.user ?? body
      if (!response.ok || user?.id !== account.id) throw new Error('Auth name read not confirmed')
      return typeof user.user_metadata?.display_name === 'string' ? user.user_metadata.display_name : null
    },
    async readProfile(account) {
      const { data, error } = await bounded(signal, requestSignal => client.from('profiles').select('id, display_name').eq('id', account.id)
        .abortSignal(requestSignal).maybeSingle().setHeader('Authorization', `Bearer ${account.token}`))
      if (error || (data && data.id !== account.id)) throw new Error('Profile name read not confirmed')
      return typeof data?.display_name === 'string' ? data.display_name : null
    },
    async writeAuth(account, name) {
      try {
        const response = await authRequest(account, 'PUT', name)
        const body = response.body
        if (!response.ok) return responseStage(response.status, body)
        const user = body?.user ?? body
        return user?.id === account.id && user.user_metadata?.display_name === name ? 'confirmed' : 'unknown'
      } catch { return 'unknown' }
    },
    async writeProfile(account, name) {
      try {
        const { data, error, status } = await bounded(signal, requestSignal => client.from('profiles').upsert({
          id: account.id, display_name: name, email: account.email, updated_at: new Date().toISOString(),
        }).select('id, display_name').abortSignal(requestSignal).single().setHeader('Authorization', `Bearer ${account.token}`))
        if (error) return responseStage(status, error)
        return data?.id === account.id && data.display_name === name ? 'confirmed' : 'unknown'
      } catch { return 'unknown' }
    },
  }
}

/** No retry is automatic. A mismatched read cannot disprove a late uncertain write. */
export async function runNameAttempt(
  initial: NameAttempt, action: 'save' | 'retry' | 'check', gateway: NameGateway,
  journal: NameJournal, isCurrent: () => boolean, publish: (attempt: NameAttempt) => void,
): Promise<NameResult> {
  const attempt = { ...initial }
  const result = (outcome: NameOutcome): NameResult => ({ attempt, outcome })
  const checkpoint = () => {
    try { journal.write(attempt) } catch { throw new NameJournalError() }
    if (isCurrent()) publish({ ...attempt })
  }
  const clearCompleted = () => {
    try { journal.clear(attempt.accountId) } catch { throw new NameJournalError() }
  }
  const currentAccount = async () => {
    if (!isCurrent()) return null
    const account = await gateway.account()
    return isCurrent() && account?.id === attempt.accountId ? account : null
  }
  try {
    let account = await currentAccount()
    if (!account) return result('stale')
    if (action !== 'save') {
      // Verify both values before a retry, including previously acknowledged
      // steps. Another client's changed value is not permission to resend it.
      const authName = await gateway.readAuth(account)
      if (!isCurrent()) return result('stale')
      const profileName = await gateway.readProfile(account)
      if (!isCurrent()) return result('stale')
      for (const [stage, value] of [['auth', authName], ['profile', profileName]] as const) {
        if (value === attempt.name) attempt[stage] = 'confirmed'
        else if (attempt[stage] === 'confirmed') attempt[stage] = 'unknown'
      }
      checkpoint()
      if (action === 'check' || nameAttemptUnknown(attempt)) {
        if (nameAttemptComplete(attempt)) clearCompleted()
        return result(nameAttemptComplete(attempt) ? 'saved' : 'incomplete')
      }
    }
    for (const stage of ['auth', 'profile'] as const) {
      if (attempt[stage] === 'confirmed') continue
      if (attempt[stage] === 'unknown') return result('incomplete')
      account = await currentAccount()
      if (!account) return result('stale')
      // Persist uncertainty BEFORE sending. A closed tab, abort, or lost reply
      // must not turn the operation into a fresh request on the next mount.
      const previous = attempt[stage]
      attempt[stage] = 'unknown'
      try { checkpoint() } catch {
        // No request was dispatched. Do not turn a local storage failure into
        // an ambiguous server write. Best-effort repair of the unsent marker.
        attempt[stage] = previous
        try { journal.write(attempt) } catch { /* Keep saving blocked. */ }
        return result('storage-blocked')
      }
      const outcome = await (stage === 'auth' ? gateway.writeAuth(account, attempt.name) : gateway.writeProfile(account, attempt.name))
      // A new mount may already be reconciling the journal. Leave the old
      // write-ahead marker intact instead of letting this response overwrite it.
      if (!isCurrent()) return result('stale')
      attempt[stage] = outcome
      checkpoint()
      if (outcome !== 'confirmed') return result('incomplete')
    }
    clearCompleted()
    return result('saved')
  } catch (error) {
    // A read error is not a missing value. Existing stage evidence survives.
    if (!isCurrent()) return result('stale')
    if (error instanceof NameJournalError) return result('storage-blocked')
    return result('unverified')
  }
}
