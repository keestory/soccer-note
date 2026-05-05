import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { sendFCMToTokens, FCMMessage } from '@/lib/firebase-admin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 코치 권한 확인
async function isCoach(userId: string, teamId: string): Promise<boolean> {
  // 팀 소유자인지 확인
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('user_id')
    .eq('id', teamId)
    .single()

  if (team?.user_id === userId) return true

  // 코치 역할인지 확인
  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .single()

  return member?.role === 'coach'
}

// 팀 멤버들의 푸시 토큰 조회
async function getTeamPushTokens(teamId: string): Promise<{ userId: string; token: string; platform: string }[]> {
  const { data, error } = await supabaseAdmin
    .rpc('get_team_push_tokens', { p_team_id: teamId })

  if (error) {
    console.error('팀 푸시 토큰 조회 실패:', error)
    return []
  }

  return data || []
}

// 알림 발송
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { teamId, title, body, data, notificationType = 'manual', selectedUserIds, includeSelf = false } = await request.json()

  if (!teamId || !title || !body) {
    return NextResponse.json({ error: '팀 ID, 제목, 내용이 필요합니다' }, { status: 400 })
  }

  // 코치 권한 확인
  const hasPermission = await isCoach(user.id, teamId)
  if (!hasPermission) {
    return NextResponse.json({ error: '알림 발송 권한이 없습니다' }, { status: 403 })
  }

  // 팀 멤버들의 푸시 토큰 조회
  const tokenData = await getTeamPushTokens(teamId)

  // 선택된 멤버만 필터링 (selectedUserIds가 있는 경우)
  let recipientTokens = tokenData
  if (selectedUserIds && selectedUserIds.length > 0) {
    // 선택된 멤버만 필터링
    recipientTokens = tokenData.filter(t => selectedUserIds.includes(t.userId))

    // includeSelf가 true이면 본인 토큰도 추가 (이미 선택되어 있지 않은 경우)
    if (includeSelf && !selectedUserIds.includes(user.id)) {
      const selfTokens = tokenData.filter(t => t.userId === user.id)
      recipientTokens = [...recipientTokens, ...selfTokens]
    }
  } else {
    // 전체 발송 모드
    if (!includeSelf) {
      // 본인 제외
      recipientTokens = recipientTokens.filter(t => t.userId !== user.id)
    }
  }

  // 선택된 멤버가 없고 본인에게만 보내는 경우
  if (selectedUserIds && selectedUserIds.length === 0 && includeSelf) {
    recipientTokens = tokenData.filter(t => t.userId === user.id)
  }

  const tokens = recipientTokens.map(t => t.token)

  // FCM 메시지 구성
  const fcmMessage: FCMMessage = {
    title,
    body,
    data: {
      teamId,
      notificationType,
      ...(data || {}),
    },
  }

  // FCM 발송
  const result = await sendFCMToTokens(tokens, fcmMessage)

  // 알림 내역 저장
  const { data: notification, error: saveError } = await supabaseAdmin
    .from('notifications')
    .insert({
      team_id: teamId,
      sender_id: user.id,
      title,
      body,
      data: data || {},
      notification_type: notificationType,
      recipients_count: tokens.length,
      success_count: result.successCount,
      failure_count: result.failureCount,
    })
    .select()
    .single()

  if (saveError) {
    console.error('알림 내역 저장 실패:', saveError)
  }

  // 알림 수신 기록 생성 (알림함에 표시하기 위해)
  if (notification) {
    const uniqueUserIds = Array.from(new Set(recipientTokens.map(t => t.userId)))
    const receipts = uniqueUserIds.map(userId => ({
      notification_id: notification.id,
      user_id: userId,
      status: 'sent',
      sent_at: new Date().toISOString()
    }))

    if (receipts.length > 0) {
      const { error: receiptError } = await supabaseAdmin
        .from('notification_receipts')
        .insert(receipts)

      if (receiptError) {
        console.error('알림 수신 기록 저장 실패:', receiptError)
      }
    }
  }

  // 실패한 토큰 비활성화
  if (result.failedTokens.length > 0) {
    await supabaseAdmin
      .from('push_tokens')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('token', result.failedTokens)
  }

  return NextResponse.json({
    success: true,
    notificationId: notification?.id,
    recipientsCount: tokens.length,
    successCount: result.successCount,
    failureCount: result.failureCount,
  })
}

// 알림 내역 조회
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')

  if (!teamId) {
    return NextResponse.json({ error: '팀 ID가 필요합니다' }, { status: 400 })
  }

  // 코치 권한 확인
  const hasPermission = await isCoach(user.id, teamId)
  if (!hasPermission) {
    return NextResponse.json({ error: '조회 권한이 없습니다' }, { status: 403 })
  }

  const { data, error } = await supabaseAdmin
    .from('notifications')
    .select('*')
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ notifications: data })
}
