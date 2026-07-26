'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse rounded-md', className)}
      style={{ background: '#1e1e1e' }}
    />
  )
}

function ListItemSkeleton() {
  return (
    <div className="p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-20 h-8 rounded-lg" />
    </div>
  )
}

export function MembersPageSkeleton() {
  return (
    <div className="light min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <div className="space-y-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-12 rounded-lg" />
            <Skeleton className="w-24 h-12 rounded-lg" />
          </div>
        </div>
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--line)' }}>
          {[1, 2, 3, 4].map(i => <ListItemSkeleton key={i} />)}
        </div>
      </main>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="light min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex justify-between items-center">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="w-9 h-9 rounded-full" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 pt-6 pb-28 space-y-4">
        <Skeleton className="h-48 w-full rounded-[20px]" />
        <Skeleton className="h-14 w-full rounded-[14px]" />
        <Skeleton className="h-28 w-full rounded-[20px]" />
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-[14px]" />)}
        </div>
      </main>
    </div>
  )
}

export function PlayersListSkeleton() {
  return (
    <div className="light min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <Skeleton className="h-6 w-20" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6">
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16 w-full rounded-[14px]" />)}
        </div>
      </main>
    </div>
  )
}

export function PlayerDetailSkeleton() {
  return (
    <div className="light min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <Skeleton className="h-5 w-28" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-[20px]" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-[16px]" />
      </main>
    </div>
  )
}

export function MatchDetailSkeleton() {
  return (
    <div className="light min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-3">
          <Skeleton className="h-5 w-32" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <Skeleton className="h-32 w-full rounded-[18px]" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-9 flex-1 rounded-lg" />)}
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="space-y-2">
          {[1, 2].map(i => <Skeleton key={i} className="h-16 w-full rounded-[14px]" />)}
        </div>
      </main>
    </div>
  )
}

export function QuarterEditSkeleton() {
  return (
    <div className="light min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-9 w-16 rounded-lg" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <Skeleton className="aspect-field w-full rounded-xl" />
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <Skeleton className="h-4 w-20" />
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
        </div>
      </main>
    </div>
  )
}

export function TrainingDetailSkeleton() {
  return (
    <div className="light min-h-screen pb-20" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="w-8 h-8 rounded-lg" />
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <Skeleton className="h-24 w-full rounded-[20px]" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 w-full rounded-2xl" />
      </main>
    </div>
  )
}

export function NotificationsPageSkeleton() {
  return (
    <div className="light min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid #1a1a1a' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex items-center gap-4">
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-4">
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
        <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--card)', border: '1px solid var(--line)' }}>
          <Skeleton className="h-5 w-28" />
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-lg p-4 space-y-2" style={{ border: '1px solid var(--line)' }}>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
