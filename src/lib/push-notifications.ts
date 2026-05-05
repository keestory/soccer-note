import { Capacitor } from '@capacitor/core'
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications'

export interface PushNotificationData {
  teamId?: string
  matchId?: string
  notificationType?: string
  [key: string]: string | undefined
}

// 플랫폼 확인
export function isPushNotificationsAvailable(): boolean {
  return Capacitor.isNativePlatform()
}

// 푸시 알림 권한 요청
export async function requestPushPermission(): Promise<boolean> {
  if (!isPushNotificationsAvailable()) {
    console.log('푸시 알림은 네이티브 플랫폼에서만 사용 가능합니다.')
    return false
  }

  try {
    const result = await PushNotifications.requestPermissions()
    return result.receive === 'granted'
  } catch (error) {
    console.error('푸시 알림 권한 요청 실패:', error)
    return false
  }
}

// 푸시 알림 권한 상태 확인
export async function checkPushPermission(): Promise<boolean> {
  if (!isPushNotificationsAvailable()) {
    return false
  }

  try {
    const result = await PushNotifications.checkPermissions()
    return result.receive === 'granted'
  } catch (error) {
    console.error('푸시 알림 권한 확인 실패:', error)
    return false
  }
}

// 푸시 알림 등록
export async function registerPushNotifications(): Promise<void> {
  if (!isPushNotificationsAvailable()) {
    return
  }

  try {
    await PushNotifications.register()
  } catch (error) {
    console.error('푸시 알림 등록 실패:', error)
    throw error
  }
}

// 푸시 토큰을 서버에 저장
export async function savePushToken(token: string): Promise<boolean> {
  try {
    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web'

    const response = await fetch('/api/push-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token,
        platform,
      }),
    })

    if (!response.ok) {
      throw new Error('토큰 저장 실패')
    }

    return true
  } catch (error) {
    console.error('푸시 토큰 저장 실패:', error)
    return false
  }
}

// 푸시 토큰 삭제 (로그아웃 시)
export async function removePushToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('/api/push-token', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    })

    if (!response.ok) {
      throw new Error('토큰 삭제 실패')
    }

    return true
  } catch (error) {
    console.error('푸시 토큰 삭제 실패:', error)
    return false
  }
}

// 이벤트 리스너 설정
export interface PushEventListeners {
  onRegistration?: (token: Token) => void
  onRegistrationError?: (error: { error: string }) => void
  onNotificationReceived?: (notification: PushNotificationSchema) => void
  onNotificationActionPerformed?: (action: ActionPerformed) => void
}

export function addPushListeners(listeners: PushEventListeners): () => void {
  if (!isPushNotificationsAvailable()) {
    return () => {}
  }

  const unsubscribeFns: (() => void)[] = []

  if (listeners.onRegistration) {
    PushNotifications.addListener('registration', listeners.onRegistration)
      .then(handle => unsubscribeFns.push(() => handle.remove()))
  }

  if (listeners.onRegistrationError) {
    PushNotifications.addListener('registrationError', listeners.onRegistrationError)
      .then(handle => unsubscribeFns.push(() => handle.remove()))
  }

  if (listeners.onNotificationReceived) {
    PushNotifications.addListener('pushNotificationReceived', listeners.onNotificationReceived)
      .then(handle => unsubscribeFns.push(() => handle.remove()))
  }

  if (listeners.onNotificationActionPerformed) {
    PushNotifications.addListener('pushNotificationActionPerformed', listeners.onNotificationActionPerformed)
      .then(handle => unsubscribeFns.push(() => handle.remove()))
  }

  return () => {
    unsubscribeFns.forEach(fn => fn())
  }
}

// 모든 리스너 제거
export async function removeAllPushListeners(): Promise<void> {
  if (!isPushNotificationsAvailable()) {
    return
  }

  await PushNotifications.removeAllListeners()
}
