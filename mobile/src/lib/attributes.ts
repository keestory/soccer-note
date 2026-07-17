import type { PlayerAttributes } from '@/types/database'
import { ATTRIBUTE_KEYS } from '@/types/database'

export function overallRating(a: PlayerAttributes): number {
  const vals = ATTRIBUTE_KEYS.map((k) => a[k] || 0)
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length)
}
