'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

export function SwipeBlocker() {
  const router = useRouter()
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return

      // 터치 시작 위치 저장
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.touches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)

      // 왼쪽 가장자리(50px 이내)에서 시작한 오른쪽 스와이프는 허용 (뒤로가기용)
      if (touchStartRef.current.x < 50 && deltaX > 0) {
        return // 스와이프 뒤로가기 허용
      }

      // 그 외 가로 스와이프는 차단 (iOS 기본 제스처 방지)
      if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
        e.preventDefault()
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      if (!touch) return

      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y)
      const deltaTime = Date.now() - touchStartRef.current.time

      // 왼쪽 가장자리(50px 이내)에서 시작한 스와이프 감지
      // 조건: 오른쪽으로 100px 이상, 세로 움직임보다 가로가 큼, 500ms 이내
      if (
        touchStartRef.current.x < 50 &&
        deltaX > 100 &&
        deltaX > deltaY * 2 &&
        deltaTime < 500
      ) {
        // 뒤로가기 실행
        router.back()
      }

      touchStartRef.current = null
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [router])

  return null
}
