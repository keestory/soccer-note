'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UsersRound, Trophy } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

export const PRIMARY_NAV_ITEMS = [
  { href: '/dashboard', key: 'home', labelKey: 'homeLabel', icon: Home, match: (path: string) => path === '/dashboard' },
  { href: '/matches', key: 'matches', labelKey: 'matchesLabel', icon: Trophy, match: (path: string) => path === '/matches' || path.startsWith('/match/') },
  { href: '/team', key: 'team', labelKey: 'teamLabel', icon: UsersRound, match: (path: string) => path === '/team' || path.startsWith('/team/') || path.startsWith('/training') || path.startsWith('/community') },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 safe-bottom"
      style={{ background: 'var(--nav)', borderTop: '1px solid var(--line)' }}
    >
      <div className="flex justify-around" style={{ padding: '10px 8px 16px' }}>
        {PRIMARY_NAV_ITEMS.map(tab => {
          const active = tab.match(pathname)
          const Icon = tab.icon
          const label = t[tab.labelKey]
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-w-[72px] flex-col items-center gap-1 rounded-xl py-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              style={{ color: active ? 'var(--nav-active)' : 'var(--text3)' }}
              aria-current={active ? 'page' : undefined}
            >
              <Icon aria-hidden="true" size={21} strokeWidth={active ? 2.8 : 2} />
              <span
                className="text-[14px] transition-colors"
                style={{
                  color: active ? 'var(--nav-active)' : 'var(--text3)',
                  fontWeight: active ? 900 : 600,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
