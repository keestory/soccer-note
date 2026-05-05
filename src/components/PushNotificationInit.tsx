'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import toast from 'react-hot-toast'

export function PushNotificationInit() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // 인증 상태 확인
  useEffect(() => {
    const supabase = createClient()

    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }

    checkAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 인증된 사용자만 푸시 알림 초기화
  usePushNotifications({
    onNotificationReceived: (notification) => {
      // 앱이 포그라운드일 때 알림 수신 시 토스트 표시
      if (notification.title) {
        toast(notification.body || '', {
          icon: '🔔',
          duration: 5000,
        })
      }
    },
  })

  // 컴포넌트는 UI를 렌더링하지 않음
  return null
}
