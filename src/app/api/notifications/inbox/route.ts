import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 사용자 알림 목록 조회
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = parseInt(searchParams.get('offset') || '0')
  const unreadOnly = searchParams.get('unreadOnly') === 'true'

  // 알림 목록 조회
  const { data: notifications, error: notifError } = await supabaseAdmin
    .rpc('get_user_notifications', {
      p_user_id: user.id,
      p_limit: limit,
      p_offset: offset,
      p_unread_only: unreadOnly
    })

  if (notifError) {
    console.error('알림 조회 실패:', notifError)
    return NextResponse.json({ error: '알림 조회에 실패했습니다' }, { status: 500 })
  }

  // 읽지 않은 알림 개수 조회
  const { data: unreadCount, error: countError } = await supabaseAdmin
    .rpc('get_unread_notification_count', { p_user_id: user.id })

  return NextResponse.json({
    notifications: notifications || [],
    unreadCount: unreadCount || 0
  })
}

// 알림 읽음 처리
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { receiptIds, markAll } = await request.json()

  if (markAll) {
    // 전체 읽음 처리
    const { data: count } = await supabaseAdmin
      .rpc('mark_notifications_read', { p_user_id: user.id })

    return NextResponse.json({ success: true, updatedCount: count })
  }

  if (!receiptIds || !Array.isArray(receiptIds)) {
    return NextResponse.json({ error: 'receiptIds가 필요합니다' }, { status: 400 })
  }

  // 선택된 알림 읽음 처리
  const { data: count } = await supabaseAdmin
    .rpc('mark_notifications_read', {
      p_user_id: user.id,
      p_receipt_ids: receiptIds
    })

  return NextResponse.json({ success: true, updatedCount: count })
}

// 알림 확인 완료 처리
export async function PUT(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { receiptId } = await request.json()

  if (!receiptId) {
    return NextResponse.json({ error: 'receiptId가 필요합니다' }, { status: 400 })
  }

  // 확인 완료 처리
  const { data: success, error } = await supabaseAdmin
    .rpc('confirm_notification', {
      p_user_id: user.id,
      p_receipt_id: receiptId
    })

  if (error) {
    console.error('확인 처리 실패:', error)
    return NextResponse.json({ error: '확인 처리에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success })
}
