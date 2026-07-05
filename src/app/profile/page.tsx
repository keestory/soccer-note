'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, LogOut, Trash2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/Skeleton'
import { BottomNav } from '@/components/BottomNav'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const supabase = createClient()

  useEffect(() => { loadProfile() }, [])

  const loadProfile = async () => {
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    setEmail(user.email || '')
    const { data: profile } = await supabase.from('profiles').select('display_name').eq('id', user.id).single()
    if (profile?.display_name) setDisplayName(profile.display_name)
    else if (user.user_metadata?.display_name) setDisplayName(user.user_metadata.display_name)
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!displayName.trim()) { toast.error('이름을 입력해주세요'); return }
    setSaving(true)
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const trimmedName = displayName.trim()
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmedName } })
    if (error) { toast.error('이름 변경에 실패했습니다'); setSaving(false); return }
    await supabase.from('profiles').upsert({ id: user.id, display_name: trimmedName, email: user.email || '', updated_at: new Date().toISOString() })
    toast.success('이름이 변경되었습니다')
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?'

  const cardStyle = { background: '#111010', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#fff', borderRadius: 12 }

  if (loading) {
    return (
      <div className="min-h-screen safe-top pb-20" style={{ background: '#0a0a0a' }}>
        <header className="safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
          <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-xl" />
            <Skeleton className="h-5 w-20" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
          <div className="flex flex-col items-center gap-3 py-6">
            <Skeleton className="w-20 h-20 rounded-full" />
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen safe-top pb-20" style={{ background: '#0a0a0a' }}>
      <header className="sticky top-0 z-10 safe-top" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-white/50 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-white">내 프로필</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Avatar hero */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-[#0a0a0a] text-3xl font-bold mb-3" style={{ background: 'var(--accent)' }}>
            {avatarInitial}
          </div>
          <p className="font-bold text-white text-lg">{displayName || '이름 없음'}</p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted2)' }}>{email}</p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} style={cardStyle} className="overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>이름 / 닉네임</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3.5 outline-none transition text-[15px]"
                style={inputStyle}
                placeholder="팀원들에게 보여질 이름"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>이메일</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3.5 text-[15px] opacity-40"
                style={inputStyle}
              />
            </div>
          </div>
          <div className="px-5 pb-5">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] disabled:opacity-50 transition active:scale-[0.98]"
              style={{ background: 'var(--accent)', color: '#0a0a0a' }}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>

        {/* Settings list */}
        <div style={cardStyle} className="overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-5 py-4 transition"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#1a1a1a' }}>
                <LogOut className="w-4 h-4 text-white/60" />
              </div>
              <span className="font-medium text-white">로그아웃</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#2a1010' }}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <span className="font-medium text-red-400">계정 삭제</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-900" />
          </button>
        </div>
      </main>

      {/* Delete confirm bottom sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full rounded-t-3xl p-6 safe-bottom" style={{ background: '#111010', border: '1px solid var(--line)' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: '#2a2a2a' }} />
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#2a1010' }}>
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center text-white mb-2">계정을 삭제할까요?</h3>
            <p className="text-[13px] text-center mb-6" style={{ color: 'var(--muted2)' }}>모든 데이터가 영구 삭제되며 복구할 수 없습니다.</p>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/delete-account', { method: 'POST' })
                    await supabase.auth.signOut()
                    router.push('/')
                  } catch {
                    toast.error('계정 삭제에 실패했습니다')
                    setShowDeleteConfirm(false)
                  }
                }}
                className="w-full py-3.5 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition"
              >
                삭제하기
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3.5 rounded-xl font-bold text-white transition"
                style={{ background: '#1a1a1a' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
      <BottomNav />
    </div>
  )
}
