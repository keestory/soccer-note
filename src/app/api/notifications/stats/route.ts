import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 코치 권한 확인
async function isCoach(userId: string, teamId: string): Promise<boolean> {
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('user_id')
    .eq('id', teamId)
    .single()

  if (team?.user_id === userId) return true

  const { data: member } = await supabaseAdmin
    .from('team_members')
    .select('role')
    .eq('team_id', teamId)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .single()

  return member?.role === 'coach'
}

// 알림 확인 통계 조회
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const notificationId = searchParams.get('notificationId')

  if (!notificationId) {
    return NextResponse.json({ error: 'notificationId가 필요합니다' }, { status: 400 })
  }

  // 알림의 팀 ID 조회
  const { data: notification } = await supabaseAdmin
    .from('notifications')
    .select('team_id')
    .eq('id', notificationId)
    .single()

  if (!notification) {
    return NextResponse.json({ error: '알림을 찾을 수 없습니다' }, { status: 404 })
  }

  // 코치 권한 확인
  const hasPermission = await isCoach(user.id, notification.team_id)
  if (!hasPermission) {
    return NextResponse.json({ error: '조회 권한이 없습니다' }, { status: 403 })
  }

  // 확인 통계 조회
  const { data: stats, error } = await supabaseAdmin
    .rpc('get_notification_confirmation_stats', { p_notification_id: notificationId })

  if (error) {
    console.error('확인 통계 조회 실패:', error)
    return NextResponse.json({ error: '통계 조회에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ stats: stats?.[0] || null })
}
