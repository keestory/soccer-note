import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuarterRecord } from '@/types/database'
import { QuarterSaveError, saveQuarterRecords, type QuarterRecordInput } from '@/lib/quarter-save'

const input = (playerId: string, overrides: Partial<QuarterRecordInput> = {}): QuarterRecordInput => ({
  quarter_id: 'q1', player_id: playerId, position_type: 'MF', position_x: 50, position_y: 50,
  goals: 1, assists: 0, rating: 7, clean_sheet: true, contribution: 2.5,
  praise_text: 'Good pass', improvement_text: null, highlight_text: null, media_urls: null, ...overrides,
})
const row = (id: string, playerId: string, overrides: Partial<QuarterRecordInput> = {}): QuarterRecord => ({
  ...input(playerId, overrides), id, created_at: '2026-11-01', updated_at: '2026-11-01',
})

function database(initial: QuarterRecord[]) {
  const rows = new Map(initial.map(record => [record.id, { ...record }]))
  const calls: { kind: string; scope?: string; ids?: string[] }[] = []
  const failure = { upsert: '', remove: '', incompleteUpsert: false, deniedDelete: false }
  let generatedId = 0
  const client = {
    from(table: string) {
      expect(table).toBe('quarter_records')
      return {
        upsert(records: QuarterRecordInput[], options: { onConflict: string }) {
          expect(options.onConflict).toBe('quarter_id,player_id')
          return { select: async () => {
            calls.push({ kind: 'upsert' })
            if (failure.upsert === 'before') return { data: null, error: new Error('offline') }
            const saved = records.map(record => {
              const existing = [...rows.values()].find(item => item.quarter_id === record.quarter_id && item.player_id === record.player_id)
              const savedRow = { ...row(existing?.id ?? `generated-${++generatedId}`, record.player_id), ...record }
              rows.set(savedRow.id, savedRow)
              return savedRow
            })
            if (failure.upsert === 'after') throw new Error('response lost')
            return { data: failure.incompleteUpsert ? [] : saved, error: null }
          } }
        },
        delete() {
          let scope = ''
          let ids: string[] = []
          const query = {
            eq: (column: string, value: string) => { expect(column).toBe('quarter_id'); scope = value; return query },
            in: (column: string, values: string[]) => { expect(column).toBe('id'); ids = values; return query },
            select: async () => {
              calls.push({ kind: 'delete', scope, ids })
              if (failure.remove === 'before') return { data: null, error: new Error('delete failed') }
              const removed = failure.deniedDelete ? [] : [...rows.values()].filter(record => record.quarter_id === scope && ids.includes(record.id))
              removed.forEach(record => rows.delete(record.id))
              if (failure.remove === 'after') throw new Error('delete response lost')
              return { data: removed, error: null }
            },
          }
          return query
        },
      }
    },
  } as unknown as SupabaseClient
  return { client, rows, calls, failure }
}

describe('quarter persistence acknowledgement and recovery', () => {
  it('stops the delete stage if the account or editor context changes after upsert', async () => {
    const baseline = [row('r1', 'p1'), row('r2', 'p2')]
    const db = database(baseline)
    let checks = 0
    await expect(saveQuarterRecords(db.client, 'q1', [input('p1')], baseline, () => ++checks === 1)).rejects.toBeInstanceOf(QuarterSaveError)
    expect(db.calls).toEqual([{ kind: 'upsert' }])
    expect(db.rows.has('r2')).toBe(true)
  })

  it('never removes old records if upsert fails', async () => {
    const initial = [row('r1', 'p1'), row('r2', 'p2')]
    const db = database(initial)
    db.failure.upsert = 'before'
    await expect(saveQuarterRecords(db.client, 'q1', [input('p1', { goals: 4 })], initial)).rejects.toThrow()
    expect(db.calls.map(call => call.kind)).toEqual(['upsert'])
    expect([...db.rows.values()]).toEqual(initial)
  })

  it('fails closed on incomplete upsert acknowledgement before any delete', async () => {
    const initial = [row('r1', 'p1'), row('r2', 'p2')]
    const db = database(initial)
    db.failure.incompleteUpsert = true
    await expect(saveQuarterRecords(db.client, 'q1', [input('p1')], initial)).rejects.toThrow('not acknowledged')
    expect(db.calls).toEqual([{ kind: 'upsert' }])
    expect(db.rows.has('r2')).toBe(true)
  })

  it('upserts retained records before deleting explicit removed IDs, preserving unrelated rows', async () => {
    const baseline = [row('r1', 'p1'), row('r2', 'p2')]
    const db = database([...baseline, row('concurrent', 'p3'), row('other-quarter', 'p2', { quarter_id: 'q2' })])
    const saved = await saveQuarterRecords(db.client, 'q1', [input('p1', { goals: 5 })], baseline)
    expect(saved[0]).toMatchObject({ id: 'r1', goals: 5, contribution: 2.5 })
    expect(db.calls).toEqual([{ kind: 'upsert' }, { kind: 'delete', scope: 'q1', ids: ['r2'] }])
    expect([...db.rows.keys()]).toEqual(['r1', 'concurrent', 'other-quarter'])
  })

  it('retries a lost upsert response without duplicating a new player or changing IDs', async () => {
    const initial = [row('r1', 'p1')]
    const db = database(initial)
    const draft = [input('p1'), input('new-player')]
    db.failure.upsert = 'after'
    await expect(saveQuarterRecords(db.client, 'q1', draft, initial)).rejects.toThrow('response lost')
    const committedIds = [...db.rows.keys()]
    db.failure.upsert = ''
    const saved = await saveQuarterRecords(db.client, 'q1', draft, initial)
    expect(saved.map(record => record.id)).toEqual(committedIds)
    expect(db.rows.size).toBe(2)
  })

  it('returns acknowledged writes on delete failure without modifying the draft, then permits retry', async () => {
    const baseline = [row('r1', 'p1'), row('r2', 'p2')]
    const draft = [input('p1', { goals: 4 }), input('p3')]
    const draftBefore = structuredClone(draft)
    const db = database(baseline)
    db.failure.remove = 'before'
    const failure = await saveQuarterRecords(db.client, 'q1', draft, baseline).catch(error => error)
    expect(failure).toBeInstanceOf(QuarterSaveError)
    expect(failure.acknowledgedRecords.map((record: QuarterRecord) => record.player_id)).toEqual(['p1', 'p3'])
    expect(failure.acknowledgedRemovedIds).toEqual([])
    expect(draft).toEqual(draftBefore)
    expect(db.rows.has('r2')).toBe(true)
    db.failure.remove = ''
    await saveQuarterRecords(db.client, 'q1', draft, baseline)
    expect([...db.rows.values()].map(record => record.player_id)).toEqual(['p1', 'p3'])
  })

  it('does not claim success for an RLS-filtered zero-row deletion', async () => {
    const baseline = [row('r1', 'p1')]
    const db = database(baseline)
    db.failure.deniedDelete = true
    await expect(saveQuarterRecords(db.client, 'q1', [], baseline)).rejects.toBeInstanceOf(QuarterSaveError)
    expect(db.rows.has('r1')).toBe(true)
  })

  it('keeps a lost deletion response uncertain even if a retry returns no rows', async () => {
    const baseline = [row('r1', 'p1')]
    const db = database(baseline)
    db.failure.remove = 'after'
    await expect(saveQuarterRecords(db.client, 'q1', [], baseline)).rejects.toBeInstanceOf(QuarterSaveError)
    db.failure.remove = ''
    await expect(saveQuarterRecords(db.client, 'q1', [], baseline)).rejects.toBeInstanceOf(QuarterSaveError)
    expect(db.rows.size).toBe(0)
  })

  it('allows intentionally empty lineups without sweeping unknown rows', async () => {
    const baseline = [row('r1', 'p1')]
    const db = database([...baseline, row('concurrent', 'p2')])
    await expect(saveQuarterRecords(db.client, 'q1', [], baseline)).resolves.toEqual([])
    expect(db.calls).toEqual([{ kind: 'delete', scope: 'q1', ids: ['r1'] }])
    expect([...db.rows.keys()]).toEqual(['concurrent'])
  })

  it('does not issue a delete for an empty new lineup', async () => {
    const db = database([])
    await expect(saveQuarterRecords(db.client, 'q1', [], [])).resolves.toEqual([])
    expect(db.calls).toEqual([])
  })

  it('rejects duplicated players and cross-quarter inputs without a request', async () => {
    const db = database([])
    await expect(saveQuarterRecords(db.client, 'q1', [input('p1'), input('p1')], [])).rejects.toThrow('scope')
    await expect(saveQuarterRecords(db.client, 'q1', [input('p1', { quarter_id: 'q2' })], [])).rejects.toThrow('scope')
    await expect(saveQuarterRecords(db.client, 'q1', [], [row('r1', 'p1', { quarter_id: 'q2' })])).rejects.toThrow('scope')
    expect(db.calls).toEqual([])
  })
})
