import admin from 'firebase-admin'

// Firebase Admin SDK 초기화 (싱글톤 패턴)
const getFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin.app()
  }

  // 환경변수에서 Firebase 설정 로드
  const projectId = process.env.FIREBASE_PROJECT_ID
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('Firebase Admin SDK 환경변수가 설정되지 않았습니다.')
    return null
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  })
}

// 앱 초기화
const firebaseAdmin = getFirebaseAdmin()

// FCM 메시지 전송 함수
export interface FCMMessage {
  title: string
  body: string
  data?: Record<string, string>
  imageUrl?: string
}

export interface FCMResult {
  success: boolean
  successCount: number
  failureCount: number
  failedTokens: string[]
}

/**
 * 여러 토큰에 FCM 메시지 전송
 */
export async function sendFCMToTokens(
  tokens: string[],
  message: FCMMessage
): Promise<FCMResult> {
  if (!firebaseAdmin) {
    console.error('Firebase Admin SDK가 초기화되지 않았습니다.')
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      failedTokens: tokens,
    }
  }

  if (tokens.length === 0) {
    return {
      success: true,
      successCount: 0,
      failureCount: 0,
      failedTokens: [],
    }
  }

  try {
    const messaging = admin.messaging()

    // 멀티캐스트 메시지 구성
    const multicastMessage: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: message.title,
        body: message.body,
        imageUrl: message.imageUrl,
      },
      data: message.data,
      // iOS 설정
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      // Android 설정
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    }

    const response = await messaging.sendEachForMulticast(multicastMessage)

    // 실패한 토큰 수집
    const failedTokens: string[] = []
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        failedTokens.push(tokens[idx])
        console.error(`FCM 전송 실패 (${tokens[idx]}):`, resp.error?.message)
      }
    })

    return {
      success: response.successCount > 0,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    }
  } catch (error) {
    console.error('FCM 전송 오류:', error)
    return {
      success: false,
      successCount: 0,
      failureCount: tokens.length,
      failedTokens: tokens,
    }
  }
}

/**
 * 단일 토큰에 FCM 메시지 전송
 */
export async function sendFCMToToken(
  token: string,
  message: FCMMessage
): Promise<boolean> {
  const result = await sendFCMToTokens([token], message)
  return result.success
}

export { firebaseAdmin }
