'use client'

import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
    />
  )
}

// 카드 형태의 스켈레톤
export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-toss p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}

// 리스트 아이템 스켈레톤
export function ListItemSkeleton() {
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

// 멤버 관리 페이지 스켈레톤
export function MembersPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 초대 섹션 */}
        <div className="bg-white rounded-xl p-4 shadow-toss space-y-3">
          <Skeleton className="h-5 w-24" />
          <div className="flex gap-2">
            <Skeleton className="flex-1 h-12 rounded-lg" />
            <Skeleton className="w-12 h-12 rounded-lg" />
            <Skeleton className="w-24 h-12 rounded-lg" />
          </div>
        </div>

        {/* 멤버 리스트 */}
        <div>
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="bg-white rounded-xl shadow-toss divide-y">
            {[1, 2, 3, 4].map((i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// 알림 페이지 스켈레톤
export function NotificationsPageSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-toss sticky top-0 z-10 safe-top">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 알림 보내기 폼 */}
        <div className="bg-white rounded-xl shadow-toss p-6 space-y-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>

        {/* 알림 내역 */}
        <div className="bg-white rounded-xl shadow-toss p-6 space-y-4">
          <Skeleton className="h-5 w-28" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="border rounded-lg p-4 space-y-2">
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
