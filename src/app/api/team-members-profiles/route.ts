import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  // Verify user is authenticated
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const teamId = request.nextUrl.searchParams.get('teamId')
  if (!teamId) {
    return NextResponse.json({ error: 'teamId가 필요합니다' }, { status: 400 })
  }

  // Verify user is owner or member of this team
  const { data: team } = await supabaseAdmin
    .from('teams')
    .select('id, user_id')
    .eq('id', teamId)
    .single()

  if (!team) {
    return NextResponse.json({ error: '팀을 찾을 수 없습니다' }, { status: 404 })
  }

  const isOwner = team.user_id === user.id
  if (!isOwner) {
    const { data: membership } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .eq('status', 'approved')
      .single()

    if (!membership) {
      return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
    }
  }

  // Get all team members' user IDs
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId)
    .or('is_removed.is.null,is_removed.eq.false')

  if (!members || members.length === 0) {
    return NextResponse.json({ profiles: [] })
  }

  const userIds = members.map(m => m.user_id)

  // Fetch profiles using admin client (bypasses RLS)
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .in('id', userIds)

  return NextResponse.json({ profiles: profiles || [] })
}
