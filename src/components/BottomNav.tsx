'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, UsersRound, Trophy } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'

type NavKey = 'home' | 'matches' | 'team'

export const PRIMARY_NAV_ITEMS = [
  { href: '/dashboard', key: 'home', labelKey: 'homeLabel', icon: Home, match: (path: string) => path === '/dashboard' },
  { href: '/matches', key: 'matches', labelKey: 'matchesLabel', icon: Trophy, match: (path: string) => path === '/matches' || path.startsWith('/match/') },
  { href: '/team', key: 'team', labelKey: 'teamLabel', icon: UsersRound, match: (path: string) => path === '/team' || path.startsWith('/team/') || path.startsWith('/training') || path.startsWith('/community') },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { t } = useI18n()

  const activeKey = PRIMARY_NAV_ITEMS.find(tab => tab.match(pathname))?.key

  return <BottomNavShell activeKey={activeKey} labels={{ home: t.homeLabel, matches: t.matchesLabel, team: t.teamLabel }} />
}

export function BottomNavShell({ activeKey, labels, preview = false }: { activeKey?: NavKey; labels: Record<NavKey, string>; preview?: boolean }) {
  return (
    <nav className={`${preview ? 'absolute' : 'fixed'} bottom-0 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4 pb-[calc(10px+env(safe-area-inset-bottom))]`}>
      <div className="floating-nav grid grid-cols-3 gap-1 p-1">
        {PRIMARY_NAV_ITEMS.map(tab => {
          const active = tab.key === activeKey
          const Icon = tab.icon
          const content = (
            <>
              <Icon aria-hidden="true" size={20} strokeWidth={1.7} />
              <span className="text-xs font-semibold leading-[18px]">{labels[tab.key]}</span>
            </>
          )
          const className = `focus-ring flex min-h-14 flex-col items-center justify-center gap-1 rounded-[12px] px-2 transition-colors ${active ? 'bg-[color:var(--chip)] text-[color:var(--brand)]' : 'text-[color:var(--text3)] hover:text-[color:var(--text)]'}`

          return preview ? (
            <span key={tab.href} className={className} aria-current={active ? 'page' : undefined}>{content}</span>
          ) : (
            <Link key={tab.href} href={tab.href} className={className} aria-current={active ? 'page' : undefined}>{content}</Link>
          )
        })}
      </div>
    </nav>
  )
}
