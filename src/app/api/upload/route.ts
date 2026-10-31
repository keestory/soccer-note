import { createClient } from '@supabase/supabase-js'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  // Native/WebView sessions live in localStorage. Validate their token on the
  // server; only requests without an Authorization header use cookie auth.
  const authorization = request.headers.get('authorization')
  let user = null
  if (authorization !== null) {
    const token = /^Bearer\s+(\S+)$/i.exec(authorization)?.[1]
    if (token) {
      const { data, error } = await supabaseAdmin.auth.getUser(token)
      if (!error) user = data.user
    }
  } else {
    const supabase = await createServerSupabaseClient()
    const { data, error } = await supabase.auth.getUser()
    if (!error) user = data.user
  }

  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const filePath = formData.get('filePath') as string | null

  if (!file || !filePath) {
    return NextResponse.json({ error: '파일과 경로가 필요합니다' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { data, error } = await supabaseAdmin.storage
    .from('player-media')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: urlData } = supabaseAdmin.storage
    .from('player-media')
    .getPublicUrl(data.path)

  return NextResponse.json({ url: urlData.publicUrl })
}
