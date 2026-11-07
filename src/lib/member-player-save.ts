import type { SupabaseClient } from '@supabase/supabase-js'
import type { Player } from '@/types/database'

export class MemberPlayerLinkError extends Error {
  constructor(public readonly player: Player, options?: ErrorOptions) {
    super('Player saved, member link not confirmed', options)
  }
}

/** Acknowledged insertion is retained for a link-only retry, never reinserted. */
export async function saveMemberPlayer(
  client: SupabaseClient, teamId: string, memberId: string, draft: Partial<Player>,
  acknowledged: Player | null, onInserted: (player: Player) => void, isCurrent: () => boolean,
) {
  if (!isCurrent()) return null
  let player = acknowledged
  if (player && player.team_id !== teamId) throw new Error('Invalid member player scope')
  if (!player) {
    const result = await client.from('players').insert({ ...draft, team_id: teamId }).select().single()
    if (!isCurrent()) return null
    if (result.error || !result.data) throw result.error || new Error('Player insertion not confirmed')
    player = result.data as Player
    if (player.team_id !== teamId) throw new Error('Invalid inserted player scope')
    onInserted(player)
  }
  if (!isCurrent()) return null
  try {
    const { data, error } = await client.from('team_members').update({ linked_player_id: player.id })
      .eq('id', memberId).eq('team_id', teamId).select('id, linked_player_id').single()
    if (!isCurrent()) return null
    if (error || data?.id !== memberId || data?.linked_player_id !== player.id) throw error || new Error('Member link not acknowledged')
  } catch (error) {
    if (!isCurrent()) return null
    throw new MemberPlayerLinkError(player, { cause: error })
  }
  return player
}
