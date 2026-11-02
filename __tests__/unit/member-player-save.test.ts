import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Player } from '@/types/database'
import { MemberPlayerLinkError, saveMemberPlayer } from '@/lib/member-player-save'

function fixture() {
  const saved = { id: 'p', team_id: 'A', name: 'Player' } as Player
  const calls: string[] = []
  const failure = { link: true, missingAck: false }
  const client = { from(table: string) {
    const query: any = {
      insert: () => { calls.push('insert'); return query },
      update: (patch: any) => { expect(patch).toEqual({ linked_player_id: 'p' }); calls.push('link'); return query },
      eq: (column: string, value: string) => { expect({ id: 'm', team_id: 'A' }[column]).toBe(value); return query },
      select: () => query,
      single: async () => table === 'players' ? { data: saved, error: null } : {
        data: failure.missingAck ? null : { id: 'm', linked_player_id: 'p' }, error: failure.link ? new Error('offline') : null,
      },
    }
    return query
  } } as unknown as SupabaseClient
  return { client, calls, failure, saved }
}

describe('member player partial write retry', () => {
  it('retries only the failed link and retains the acknowledged player', async () => {
    const db = fixture()
    let acknowledged: Player | null = null
    const remember = (player: Player) => { acknowledged = player }
    await expect(saveMemberPlayer(db.client, 'A', 'm', { name: 'Player' }, null, remember, () => true)).rejects.toBeInstanceOf(MemberPlayerLinkError)
    expect(acknowledged).toEqual(db.saved)
    db.failure.link = false
    await expect(saveMemberPlayer(db.client, 'A', 'm', { name: 'Player' }, acknowledged, remember, () => true)).resolves.toEqual(db.saved)
    expect(db.calls).toEqual(['insert', 'link', 'link'])
  })
  it('does not link after a context change during insertion', async () => {
    const db = fixture()
    let checks = 0
    await expect(saveMemberPlayer(db.client, 'A', 'm', {}, null, () => { throw new Error('Must not publish stale insertion') }, () => ++checks === 1)).resolves.toBe(null)
    expect(db.calls).toEqual(['insert'])
  })
  it('does not claim a link for a zero-row acknowledgement', async () => {
    const db = fixture()
    db.failure.link = false
    db.failure.missingAck = true
    await expect(saveMemberPlayer(db.client, 'A', 'm', {}, db.saved, () => {}, () => true)).rejects.toBeInstanceOf(MemberPlayerLinkError)
    expect(db.calls).toEqual(['link'])
  })
})
