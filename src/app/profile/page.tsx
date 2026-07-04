'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, LogOut, Trash2, ChevronRight } from 'lucide-react'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/Skeleton'

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 safe-top">
        <header className="bg-white border-b safe-top">
          <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
            <Skeleton className="w-8 h-8 rounded-lg" />
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
    <div className="min-h-screen bg-gray-50 safe-top">
      <header className="bg-white border-b sticky top-0 z-10 safe-top">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">내 프로필</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Avatar hero */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <div className="w-20 h-20 rounded-full bg-primary-600 flex items-center justify-center text-white text-3xl font-bold shadow-md mb-3">
            {avatarInitial}
          </div>
          <p className="font-semibold text-gray-900 text-lg">{displayName || '이름 없음'}</p>
          <p className="text-sm text-gray-400 mt-0.5">{email}</p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">이름 / 닉네임</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition text-base"
                placeholder="팀원들에게 보여질 이름"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">이메일</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 text-gray-400 text-base"
              />
            </div>
          </div>
          <div className="px-5 pb-5">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 bg-primary-600 text-white rounded-xl font-semibold text-base hover:bg-primary-700 active:bg-primary-800 disabled:opacity-50 transition"
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        </form>

        {/* Settings list */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 active:bg-gray-100 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                <LogOut className="w-4 h-4 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900">로그아웃</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50 active:bg-red-100 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                <Trash2 className="w-4 h-4 text-red-500" />
              </div>
              <span className="font-medium text-red-500">계정 삭제</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-200" />
          </button>
        </div>
      </main>

      {/* Delete confirm bottom sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 safe-bottom">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-center text-gray-900 mb-2">계정을 삭제할까요?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">모든 데이터가 영구 삭제되며 복구할 수 없습니다.</p>
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
                className="w-full py-3.5 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition"
              >
                삭제하기
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
