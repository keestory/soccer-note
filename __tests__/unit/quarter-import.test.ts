import { describe, expect, it } from 'vitest'
import type { Player, Quarter, QuarterRecord } from '@/types/database'
import { buildImportCandidates, collidingImportIds, createImportedPlayers } from '@/lib/quarter-import'
import { getQuarterImportCopy } from '@/lib/quarter-import-copy'

const players = [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] as Player[]
const record = (playerId = 'a', overrides: Partial<QuarterRecord> = {}) => ({
  id: `source-${playerId}`, quarter_id: 'q1', player_id: playerId, position_type: 'MF', position_x: 40, position_y: 50,
  rating: 9, goals: 3, assists: 2, clean_sheet: true, contribution: 4,
  praise_text: 'Do not copy', improvement_text: 'Old feedback', highlight_text: 'Old highlight', media_urls: ['old-media'],
  ...overrides,
}) as QuarterRecord
const source = (rows = [record()], extra = {}) => ({ id: 'q1', quarter_number: 1, quarter_records: rows, ...extra }) as Quarter
const candidates = (quarter = source(), eligible = new Set(['a', 'b'])) => buildImportCandidates(quarter, players, eligible)

describe('previous-quarter placement import', () => {
  it('copies only selected placement into an unsaved, clean draft and leaves source unchanged', () => {
    const quarter = source([record(), record('b', { position_x: 60 })])
    const before = structuredClone(quarter)
    const draft = createImportedPlayers(candidates(quarter), new Set(['a']))
    expect(draft).toEqual([{ playerId: 'a', player: players[0], positionType: 'MF', positionX: 40, positionY: 50,
      rating: null, goals: 0, assists: 0, cleanSheet: false, contribution: 0, praiseText: '', improvementText: '', highlightText: '', mediaUrls: [] }])
    expect(quarter).toEqual(before)
    expect(draft[0]).not.toHaveProperty('id')
    expect(draft[0]).not.toHaveProperty('quarter_id')
  })
  it('refuses duplicate and conflicting source records instead of choosing one', () => {
    for (const [rows, issue] of [[[record(), record()], 'duplicate'], [[record(), record('a', { position_x: 60 })], 'conflicting']] as const) {
      const items = candidates(source([...rows]))
      expect(items).toHaveLength(1)
      expect(items[0].issues).toContain(issue)
      expect(() => createImportedPlayers(items, new Set(['a']))).toThrow()
    }
  })
  it('requires current roster, eligible player and source-quarter scope', () => {
    expect(candidates(source([record('missing')]))[0].issues).toContain('unavailable')
    expect(candidates(source(), new Set())[0].issues).toContain('unavailable')
    expect(candidates(source([record('a', { quarter_id: 'other' })]))[0].issues).toContain('scope')
  })
  it('accepts strict database numeric strings without rounding or clamping', () => {
    const row = record('a', { position_x: '40.25', position_y: '50' } as unknown as Partial<QuarterRecord>)
    expect(candidates(source([row]))[0].position).toEqual({ type: 'MF', x: 40.25, y: 50 })
  })
  it.each([null, '', ' ', true, [], {}, '40px', NaN, Infinity, -1, 101])('blocks invalid coordinate %j', value => {
    const row = record('a', { position_x: value } as unknown as Partial<QuarterRecord>)
    const items = candidates(source([row]))
    expect(items[0].issues).toContain('invalidPosition')
    expect(() => createImportedPlayers(items, new Set(['a']))).toThrow()
  })
  it('refuses unsafe edge positions visibly without moving the original', () => {
    for (const x of [0, 1, 100]) {
      const items = candidates(source([record('a', { position_x: x })]))
      expect(items[0].position?.x).toBe(x)
      expect(items[0].issues).toContain('edge')
    }
  })
  it('preserves the exact accepted editable pitch boundaries', () => {
    for (const x of [8, 92]) for (const y of [10, 90]) {
      const items = candidates(source([record('a', { position_x: x, position_y: y })]))
      expect(items[0].issues).toEqual([])
      expect(createImportedPlayers(items, new Set(['a']))[0]).toMatchObject({ positionX: x, positionY: y })
    }
  })
  it('blocks only a colliding selection and allows either player alone', () => {
    const items = candidates(source([record(), record('b')]))
    expect(collidingImportIds(items, new Set(['a', 'b']))).toEqual(new Set(['a', 'b']))
    expect(() => createImportedPlayers(items, new Set(['a', 'b']))).toThrow()
    expect(createImportedPlayers(items, new Set(['b']))).toHaveLength(1)
  })
  it('reports recorded IN/OUT events without inferring final players', () => {
    const items = candidates(source(undefined, { quarter_substitutions: [
      { quarter_id: 'q1', player_in_id: 'b', player_out_id: 'a', minute: 10 },
      { quarter_id: 'q1', player_in_id: 'a', player_out_id: 'b', minute: 18 },
      { quarter_id: 'elsewhere', player_in_id: 'a', minute: 1 },
    ] }))
    expect(items[0].events).toEqual([{ direction: 'OUT', minute: 10 }, { direction: 'IN', minute: 18 }])
    expect(items[0].issues).toEqual([])
    expect(createImportedPlayers(items, new Set(['a']))).toHaveLength(1)
  })
  it('does not accept empty, stale or invalid-position selection', () => {
    expect(() => createImportedPlayers(candidates(), new Set())).toThrow()
    expect(() => createImportedPlayers(candidates(), new Set(['unknown']))).toThrow()
    const items = candidates(source([record('a', { position_type: 'INVALID' } as unknown as Partial<QuarterRecord>)]))
    expect(items[0].issues).toContain('invalidPosition')
  })
  it('has complete localized instructions and an English fallback', () => {
    const english = getQuarterImportCopy('en_US')
    for (const locale of ['ko', 'en_US', 'en_GB', 'ja', 'fr', 'de', 'it', 'es']) {
      const copy = getQuarterImportCopy(locale)
      expect(Object.keys(copy)).toEqual(Object.keys(english))
      expect(Object.values(copy).every(text => typeof text === 'string' && text.length > 0)).toBe(true)
      expect(copy.apply).toContain('{n}')
    }
    expect(getQuarterImportCopy('unknown-locale')).toEqual(english)
  })
})
