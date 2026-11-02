import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuarterRecord } from '@/types/database'

export type QuarterRecordInput = Omit<QuarterRecord, 'id' | 'created_at' | 'updated_at' | 'player'>
export type SavedRecordIdentity = Pick<QuarterRecord, 'id' | 'quarter_id' | 'player_id'>

export class QuarterSaveError extends Error {
  constructor(public readonly acknowledgedRecords: QuarterRecord[], public readonly acknowledgedRemovedIds: string[], options?: ErrorOptions) {
    super('Quarter save could not be confirmed', options)
    this.name = 'QuarterSaveError'
  }
}

/** Not a transaction: a failed response can follow a committed write. The caller
 * must keep its draft and baseline so the same request can safely be retried. */
export async function saveQuarterRecords(
  client: SupabaseClient,
  quarterId: string,
  draft: QuarterRecordInput[],
  baseline: SavedRecordIdentity[],
  isCurrent: () => boolean = () => true,
): Promise<QuarterRecord[]> {
  if (!isCurrent()) throw new Error('Quarter save context changed')
  const playerIds = new Set(draft.map(record => record.player_id))
  if (playerIds.size !== draft.length || draft.some(record => record.quarter_id !== quarterId) || baseline.some(record => record.quarter_id !== quarterId)) {
    throw new Error('Invalid quarter save scope')
  }

  let saved: QuarterRecord[] = []
  if (draft.length > 0) {
    // The existing unique constraint updates retained rows without replacing IDs.
    const { data, error } = await client.from('quarter_records')
      .upsert(draft, { onConflict: 'quarter_id,player_id' }).select('*')
    if (error) throw error
    if (!Array.isArray(data) || data.length !== draft.length ||
      new Set(data.map(record => record.player_id)).size !== draft.length ||
      data.some(record => !record.id || record.quarter_id !== quarterId || !playerIds.has(record.player_id))) {
      throw new Error('Quarter save was not acknowledged')
    }
    saved = data as QuarterRecord[]
  }

  // Only remove records this editor loaded and the user explicitly removed.
  // Records added by another editor after loading are never swept away.
  const removedIds = [...new Set(baseline.filter(record => !playerIds.has(record.player_id)).map(record => record.id))]
  if (removedIds.length > 0) {
    let acknowledgedRemovedIds: string[] = []
    try {
      if (!isCurrent()) throw new Error('Quarter save context changed')
      const { data, error } = await client.from('quarter_records').delete()
        .eq('quarter_id', quarterId).in('id', removedIds).select('id, quarter_id')
      if (error) throw error
      if (!Array.isArray(data) || data.some(record => record.quarter_id !== quarterId || !removedIds.includes(record.id))) {
        throw new Error('Quarter removal was not acknowledged')
      }
      acknowledgedRemovedIds = [...new Set(data.map(record => record.id))]
      // An empty response is also possible after permissions were revoked. Do not
      // infer success from absence or an RLS-filtered follow-up SELECT. A lost
      // delete acknowledgement may require reopening the editor to reconcile.
      if (acknowledgedRemovedIds.length !== removedIds.length) {
        throw new Error('Quarter removal could not be confirmed')
      }
    } catch (error) {
      throw new QuarterSaveError(saved, acknowledgedRemovedIds, { cause: error })
    }
  }
  return saved
}
