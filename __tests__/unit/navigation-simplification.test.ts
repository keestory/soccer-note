import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { PRIMARY_NAV_ITEMS } from '@/components/BottomNav'

describe('simplified primary navigation', () => {
  it('exposes team player rankings as a separate primary destination', () => {
    expect(PRIMARY_NAV_ITEMS.map(({ href, key, labelKey }) => ({ href, key, labelKey }))).toEqual([
      { href: '/dashboard', key: 'home', labelKey: 'homeLabel' },
      { href: '/matches', key: 'matches', labelKey: 'matchesLabel' },
      { href: '/ranking', key: 'ranking', labelKey: 'rankingTab' },
      { href: '/team', key: 'team', labelKey: 'teamLabel' },
    ])
    expect(PRIMARY_NAV_ITEMS.find(item => item.key === 'matches')?.match('/match/fixture-1')).toBe(true)
    expect(PRIMARY_NAV_ITEMS.find(item => item.key === 'team')?.match('/training/new')).toBe(true)
    for (const path of ['/ranking', '/ranking/player-1']) {
      expect(PRIMARY_NAV_ITEMS.filter(item => item.match(path)).map(item => item.key)).toEqual(['ranking'])
    }
    expect(PRIMARY_NAV_ITEMS.find(item => item.key === 'team')?.match('/team/players/player-1')).toBe(true)
  })

  it('hides legacy native feature routes without deleting them', () => {
    const layout = readFileSync(resolve(process.cwd(), 'mobile/app/(tabs)/_layout.tsx'), 'utf8')
    expect(layout.match(/<Tabs\.Screen/g)).toHaveLength(6)
    for (const route of ['players', 'training', 'community']) {
      expect(layout).toContain(`name="${route}" options={{ href: null }}`)
    }
  })
})
