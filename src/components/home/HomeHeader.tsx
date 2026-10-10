'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'

interface HomeHeaderProps {
  teamName: string
  displayName: string
  teamPickerLabel: string
  profileLabel: string
  notification: ReactNode
  onSelectTeam?: () => void
}

/** Shared by the real dashboard and deterministic screenshot fixtures. */
export function HomeHeader({ teamName, displayName, teamPickerLabel, profileLabel, notification, onSelectTeam }: HomeHeaderProps) {
  const title = <><span className="min-w-0 [overflow-wrap:anywhere]">{teamName}</span><ChevronDown aria-hidden size={20} strokeWidth={1.7} className="mt-2 shrink-0 text-[color:var(--text3)]" /></>
  const titleClass = 'flex min-h-11 min-w-0 items-start gap-2 rounded-xl text-left'
  return <header className="safe-top sticky top-0 z-10 bg-[color:var(--bg)]/95 backdrop-blur-xl">
    <div className="mx-auto grid max-w-md grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-5 pb-3 pt-4">
      <h1 className="sn-page-title min-w-0 py-1">
        {onSelectTeam
          ? <button type="button" onClick={onSelectTeam} aria-label={`${teamPickerLabel}: ${teamName}`} className={`focus-ring ${titleClass}`}>{title}</button>
          : <span className={titleClass}>{title}</span>}
      </h1>
      <div className="flex shrink-0 items-center gap-2">
        {notification}
        <Link href="/profile" aria-label={profileLabel} className="focus-ring flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-white text-sm font-semibold text-[color:var(--text)]">{(displayName || '?').charAt(0).toUpperCase()}</Link>
      </div>
    </div>
  </header>
}
