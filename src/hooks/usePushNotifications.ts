'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  isPushNotificationsAvailable,
  requestPushPermission,
  checkPushPermission,
  registerPushNotifications,
  savePushToken,
  addPushListeners,
  PushNotificationData,
} from '@/lib/push-notifications'

interface UsePushNotificationsOptions {
  onNotificationReceived?: (notification: { title?: string; body?: string; data?: PushNotificationData }) => void
}

export function usePushNotifications(options: UsePushNotificationsOptions = {}) {
  const router = useRouter()
  const [isAvailable] = useState(isPushNotificationsAvailable())
  const [isPermissionGranted, setIsPermissionGranted] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const initRef = useRef(false)

  // 알림 클릭 시 네비게이션 처리
  const handleNotificationClick = useCallback((data?: PushNotificationData) => {
    if (!data) return

    // 경기 상세 페이지로 이동
    if (data.matchId) {
      router.push(`/match/${data.matchId}`)
      return
    }

    // 팀 페이지로 이동
    if (data.teamId) {
      router.push(`/dashboard?team=${data.teamId}`)
      return
    }
  }, [router])

  // 초기화
  const initialize = useCallback(async () => {
    if (!isAvailable || initRef.current) return
    initRef.current = true

    try {
      // 권한 확인
      let hasPermission = await checkPushPermission()

      // 권한이 없으면 요청
      if (!hasPermission) {
        hasPermission = await requestPushPermission()
      }

      setIsPermissionGranted(hasPermission)

      if (!hasPermission) {
        console.log('푸시 알림 권한이 거부되었습니다.')
        setIsInitialized(true)
        return
      }

      // 리스너 설정
      const cleanup = addPushListeners({
        onRegistration: async (tokenInfo) => {
          console.log('푸시 토큰 수신:', tokenInfo.value)
          setToken(tokenInfo.value)

          // 서버에 토큰 저장
          const saved = await savePushToken(tokenInfo.value)
          if (saved) {
            console.log('푸시 토큰 저장 성공')
          }
        },
        onRegistrationError: (error) => {
          console.error('푸시 등록 오류:', error)
        },
        onNotificationReceived: (notification) => {
          console.log('푸시 알림 수신:', notification)
          options.onNotificationReceived?.({
            title: notification.title,
            body: notification.body,
            data: notification.data as PushNotificationData,
          })
        },
        onNotificationActionPerformed: (action) => {
          console.log('푸시 알림 클릭:', action)
          handleNotificationClick(action.notification.data as PushNotificationData)
        },
      })

      // 푸시 알림 등록
      await registerPushNotifications()

      setIsInitialized(true)

      return cleanup
    } catch (error) {
      console.error('푸시 알림 초기화 실패:', error)
      setIsInitialized(true)
    }
  }, [isAvailable, options.onNotificationReceived, handleNotificationClick])

  useEffect(() => {
    let cleanup: (() => void) | undefined

    initialize().then(cleanupFn => {
      cleanup = cleanupFn
    })

    return () => {
      cleanup?.()
    }
  }, [initialize])

  return {
    isAvailable,
    isPermissionGranted,
    token,
    isInitialized,
    requestPermission: requestPushPermission,
  }
}
