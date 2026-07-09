'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/dashboard', label: '경기',    match: (p: string) => p === '/dashboard' || p.startsWith('/match') },
  { href: '/team/players', label: '선수', match: (p: string) => p.startsWith('/team/players') },
  { href: '/training', label: '훈련', match: (p: string) => p.startsWith('/training') },
  { href: '/community',    label: '매칭', match: (p: string) => p.startsWith('/community') },
  { href: '/team/members', label: '팀 관리', match: (p: string) =>
      p.startsWith('/team/members') || p.startsWith('/team/notifications') || p.startsWith('/team/public-profile') },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-20 safe-bottom"
      style={{ background: 'var(--nav)', borderTop: '1px solid #1a1a1a' }}
    >
      <div className="flex justify-around" style={{ padding: '10px 8px 16px' }}>
        {TABS.map(tab => {
          const active = tab.match(pathname)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 min-w-[56px] transition"
            >
              <span
                className="h-[3px] w-[22px] rounded-full transition-colors"
                style={{ background: active ? 'var(--accent)' : 'transparent' }}
              />
              <span
                className="text-[14px] transition-colors"
                style={{
                  color: active ? 'var(--accent)' : '#5c5c5c',
                  fontWeight: active ? 900 : 600,
                }}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
