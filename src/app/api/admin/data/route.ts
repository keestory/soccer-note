import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL?.replace(/"/g, '').trim()

export async function GET(request: NextRequest) {
  // Verify the requesting user is the admin
  const cookieStore = await cookies()
  const authClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const { data: { user } } = await authClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Use service role client to bypass RLS
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all users from auth.users via admin API
  const { data: { users: authUsers } } = await adminClient.auth.admin.listUsers()

  // Get all profiles
  const { data: profiles } = await adminClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  // Get all teams with member counts
  const { data: teams } = await adminClient
    .from('teams')
    .select('*, team_members(count)')
    .order('created_at', { ascending: false })

  // Get team member counts separately for accuracy
  const { data: memberCounts } = await adminClient
    .from('team_members')
    .select('team_id')
    .eq('status', 'approved')

  const memberCountMap: Record<string, number> = {}
  memberCounts?.forEach((m) => {
    memberCountMap[m.team_id] = (memberCountMap[m.team_id] || 0) + 1
  })

  // Get total match count
  const { count: matchCount } = await adminClient
    .from('matches')
    .select('*', { count: 'exact', head: true })

  // Combine user data with profiles
  const usersWithProfiles = authUsers?.map((authUser) => {
    const profile = profiles?.find((p) => p.id === authUser.id)
    return {
      id: authUser.id,
      email: authUser.email,
      display_name: profile?.display_name || null,
      created_at: authUser.created_at,
      last_sign_in_at: authUser.last_sign_in_at,
    }
  }) || []

  const teamsWithCounts = teams?.map((team) => ({
    ...team,
    member_count: memberCountMap[team.id] || 0,
  })) || []

  return NextResponse.json({
    users: usersWithProfiles,
    teams: teamsWithCounts,
    stats: {
      totalUsers: authUsers?.length || 0,
      totalTeams: teams?.length || 0,
      totalMatches: matchCount || 0,
    },
  })
}
