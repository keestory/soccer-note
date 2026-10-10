'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, ChevronRight, Dumbbell, ShieldCheck, Swords, UsersRound } from 'lucide-react'
import { BottomNav } from '@/components/BottomNav'
import { PlayersListSkeleton } from '@/components/Skeleton'
import { useAppData } from '@/hooks/useAppData'
import { useI18n } from '@/lib/i18n/context'

export default function TeamHubPage() {
  const router = useRouter(); const data = useAppData(); const { t } = useI18n()
  useEffect(() => { if (data.isLoaded && !data.userId) router.push('/login'); if (data.isLoaded && !data.selectedTeam) router.push('/dashboard') }, [data.isLoaded, data.userId, data.selectedTeam, router])
  if (data.loading) return <PlayersListSkeleton />
  const isCoach = data.selectedTeam?.role === 'coach' || data.selectedTeam?.user_id === data.userId
  const items = [
    { href: '/team/players', label: t.playerManagement, detail: `${data.players.length}${t.persons}`, icon: UsersRound },
    { href: '/training', label: t.trainingLabel, detail: t.recentTraining, icon: Dumbbell },
    { href: '/community', label: t.navMatching, detail: t.findTeamsTagline, icon: Swords },
    { href: '/team/members', label: t.memberManagement, detail: `${data.members.length}${t.persons}`, icon: ShieldCheck },
    ...(isCoach ? [{ href: '/team/notifications', label: t.notifications, detail: t.sendNotification, icon: Bell }] : []),
  ]
  return <div className="light app-shell pb-nav">
    <header className="safe-top bg-transparent"><div className="mx-auto max-w-md px-5 pb-5 pt-4"><p className="section-label">{t.teamManagement}</p><h1 className="mt-1 sn-page-title">{data.selectedTeam?.name}</h1><p className="mt-2 max-w-[320px] text-sm font-normal leading-[21px] text-[color:var(--text3)]">{t.teamIntro}</p></div></header>
    <main className="mx-auto max-w-md px-5 pb-8">
      <section aria-label={t.teamManagement} className="surface content-enter divide-y divide-[color:var(--line)] overflow-hidden">
        {items.map(({ href, label, detail, icon: Icon }) => <Link key={href} href={href} className="interactive-row focus-ring flex min-h-[82px] items-center gap-4 px-4 py-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] border border-[color:var(--line)] bg-white text-[color:var(--navy)]"><Icon aria-hidden="true" size={20} strokeWidth={1.7} /></span>
          <span className="min-w-0 flex-1"><strong className="block text-sm font-semibold leading-[21px]">{label}</strong><span className="mt-1 block text-xs leading-[18px] text-[color:var(--text3)]">{detail}</span></span>
          <ChevronRight aria-hidden="true" size={20} strokeWidth={1.7} className="shrink-0 text-[color:var(--text3)]" />
        </Link>)}
      </section>
    </main>
    <BottomNav />
  </div>
}
