'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, Users, Dumbbell, Settings } from 'lucide-react'

const TABS = [
  { href: '/dashboard', icon: Trophy, label: '경기', match: (p: string) => p === '/dashboard' || p.startsWith('/match') },
  { href: '/team/players', icon: Users, label: '선수', match: (p: string) => p.startsWith('/team/players') },
  { href: '/training/new', icon: Dumbbell, label: '훈련', match: (p: string) => p.startsWith('/training') },
  { href: '/community', icon: null, label: '매칭', match: (p: string) => p.startsWith('/community') },
  { href: '/team/members', icon: Settings, label: '팀 관리', match: (p: string) => p.startsWith('/team/members') || p.startsWith('/team/notifications') || p.startsWith('/team/public-profile') },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t safe-bottom z-20">
      <div className="max-w-4xl mx-auto px-2">
        <div className="flex justify-around py-1">
          {TABS.map(tab => {
            const active = tab.match(pathname)
            const base = 'flex flex-col items-center gap-1 min-w-[56px] py-2.5 rounded-xl transition'
            if (tab.icon === null) {
              return (
                <Link key={tab.href} href={tab.href}
                  className={`${base} ${active ? 'bg-[#0f2d0f] text-lime-400' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                  <span className="text-xl leading-6">⚽</span>
                  <span className="text-[11px] font-black">{tab.label}</span>
                </Link>
              )
            }
            const Icon = tab.icon
            return (
              <Link key={tab.href} href={tab.href}
                className={`${base} ${active ? 'bg-primary-50 text-primary-600' : 'text-gray-400 hover:bg-gray-50 hover:text-gray-600'}`}>
                <Icon className="w-6 h-6" />
                <span className="text-[11px] font-bold">{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
