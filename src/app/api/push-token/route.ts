import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// 푸시 토큰 등록
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { token, platform, deviceId } = await request.json()

  if (!token || !platform) {
    return NextResponse.json({ error: '토큰과 플랫폼이 필요합니다' }, { status: 400 })
  }

  if (!['ios', 'android', 'web'].includes(platform)) {
    return NextResponse.json({ error: '유효하지 않은 플랫폼입니다' }, { status: 400 })
  }

  // 토큰 저장 (upsert)
  const { error } = await supabaseAdmin
    .from('push_tokens')
    .upsert({
      user_id: user.id,
      token,
      platform,
      device_id: deviceId || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,token',
    })

  if (error) {
    console.error('푸시 토큰 저장 실패:', error)
    return NextResponse.json({ error: '토큰 저장에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

// 푸시 토큰 삭제 (로그아웃 시)
export async function DELETE(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const { token } = await request.json()

  if (!token) {
    return NextResponse.json({ error: '토큰이 필요합니다' }, { status: 400 })
  }

  // 토큰 비활성화 (실제 삭제 대신)
  const { error } = await supabaseAdmin
    .from('push_tokens')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('token', token)

  if (error) {
    console.error('푸시 토큰 삭제 실패:', error)
    return NextResponse.json({ error: '토큰 삭제에 실패했습니다' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
