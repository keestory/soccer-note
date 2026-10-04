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
  return <div className="light min-h-screen pb-nav bg-[color:var(--bg)]"><header className="safe-top bg-[color:var(--nav)]"><div className="mx-auto max-w-md px-5 pb-5 pt-4"><p className="text-xs font-bold text-[color:var(--text3)]">{t.teamManagement}</p><h1 className="mt-1 text-[28px] font-black tracking-[-0.05em]">{data.selectedTeam?.name}</h1><p className="mt-2 text-sm text-[color:var(--text3)]">{t.teamIntro}</p></div></header><main className="mx-auto max-w-md px-5 pb-8"><div className="overflow-hidden rounded-[20px] border border-[color:var(--line)] bg-white">{items.map(({ href, label, detail, icon: Icon }, index) => <Link key={href} href={href} className={`flex min-h-[78px] items-center gap-4 px-4 ${index ? 'border-t border-[color:var(--line)]' : ''}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color:var(--navy)] text-[color:var(--accent)]"><Icon aria-hidden="true" size={21} /></span><span className="min-w-0 flex-1"><strong className="block text-[16px]">{label}</strong><span className="mt-1 block truncate text-xs text-[color:var(--text3)]">{detail}</span></span><ChevronRight aria-hidden="true" size={20} className="text-[color:var(--text3)]" /></Link>)}</div></main><BottomNav /></div>
}
