import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIMARY_NAV_ITEMS } from '@/components/BottomNav'

describe('simplified primary navigation', () => {
  it('keeps exactly home, matches, and team on web', () => {
    expect(PRIMARY_NAV_ITEMS.map(({ href, key, labelKey }) => ({ href, key, labelKey }))).toEqual([
      { href: '/dashboard', key: 'home', labelKey: 'homeLabel' },
      { href: '/matches', key: 'matches', labelKey: 'matchesLabel' },
      { href: '/team', key: 'team', labelKey: 'teamLabel' },
    ])
    expect(PRIMARY_NAV_ITEMS.find(item => item.key === 'matches')?.match('/match/fixture-1')).toBe(true)
    expect(PRIMARY_NAV_ITEMS.find(item => item.key === 'team')?.match('/training/new')).toBe(true)
  })

  it('hides legacy native feature routes without deleting them', () => {
    const layout = readFileSync(resolve(process.cwd(), 'mobile/app/(tabs)/_layout.tsx'), 'utf8')
    expect(layout.match(/<Tabs\.Screen/g)).toHaveLength(6)
    for (const route of ['players', 'training', 'community']) {
      expect(layout).toContain(`name="${route}" options={{ href: null }}`)
    }
  })
})
