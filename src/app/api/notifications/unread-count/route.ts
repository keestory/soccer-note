import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { data: count, error } = await supabaseAdmin
    .rpc('get_unread_notification_count', { p_user_id: user.id })

  if (error) {
    console.error('읽지 않은 알림 개수 조회 실패:', error)
    return NextResponse.json({ count: 0 })
  }

  return NextResponse.json({ count: count || 0 })
}
