'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient, getSessionUser } from '@/lib/supabase'
import { ArrowLeft, LogOut, Trash2, ChevronRight, Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { LOCALES } from '@/lib/i18n'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/Skeleton'
import { BottomNav } from '@/components/BottomNav'
import { ConfirmSheet } from '@/components/ConfirmSheet'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLanguageSheet, setShowLanguageSheet] = useState(false)
  const { locale, setLocale, t } = useI18n()
  const currentLocale = LOCALES.find(l => l.code === locale)
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
    if (!displayName.trim()) { toast.error(t.nameRequired); return }
    setSaving(true)
    const user = await getSessionUser(supabase)
    if (!user) { router.push('/login'); return }
    const trimmedName = displayName.trim()
    const { error } = await supabase.auth.updateUser({ data: { display_name: trimmedName } })
    if (error) { toast.error(t.nameChangeFailed); setSaving(false); return }
    await supabase.from('profiles').upsert({ id: user.id, display_name: trimmedName, email: user.email || '', updated_at: new Date().toISOString() })
    toast.success(t.nameChangeSuccess)
    setSaving(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?'

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: '#fff', borderRadius: 12 }

  if (loading) {
    return (
      <div className="light min-h-screen safe-top pb-20" style={{ background: 'var(--bg)' }}>
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
    <div className="light flex flex-col safe-top" style={{ background: 'var(--bg)', minHeight: '100dvh' }}>
      <header className="flex-shrink-0 sticky top-0 z-10" style={{ background: '#050505', borderBottom: '1px solid var(--line)' }}>
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="p-2 -ml-2 rounded-xl text-[color:var(--text)]/50 hover:text-[color:var(--text)]">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-[color:var(--text)]">{t.myProfile}</h1>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto max-w-lg mx-auto w-full px-4 py-6 space-y-5 safe-bottom">
        {/* Avatar hero */}
        <div className="flex flex-col items-center pt-2 pb-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-[#0a0a0a] text-3xl font-bold mb-3" style={{ background: 'var(--navy)' }}>
            {avatarInitial}
          </div>
          <p className="font-bold text-[color:var(--text)] text-lg">{displayName || t.noName}</p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted2)' }}>{email}</p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} style={cardStyle} className="overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.nameLabel}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-3.5 outline-none transition text-[15px]"
                style={inputStyle}
                placeholder={t.namePlaceholder}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.email}</label>
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
              style={{ background: 'var(--navy)', color: 'var(--text)' }}
            >
              {saving ? t.saving : t.save}
            </button>
          </div>
        </form>

        {/* Settings list */}
        <div style={cardStyle} className="overflow-hidden">
          <button
            onClick={() => setShowLanguageSheet(true)}
            className="w-full flex items-center justify-between px-5 py-4 transition"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--card2)' }}>
                <Globe className="w-4 h-4 text-[color:var(--text)]/60" />
              </div>
              <span className="font-medium text-[color:var(--text)]">{t.language}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[13px]" style={{ color: 'var(--muted2)' }}>
                {currentLocale?.flag} {currentLocale?.label}
              </span>
              <ChevronRight className="w-4 h-4 text-[color:var(--text)]/20" />
            </div>
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 transition"
            style={{ borderBottom: '1px solid var(--line)' }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--card2)' }}>
                <LogOut className="w-4 h-4 text-[color:var(--text)]/60" />
              </div>
              <span className="font-medium text-[color:var(--text)]">{t.logout}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[color:var(--text)]/20" />
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full flex items-center justify-between px-5 py-4 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: '#2a1010' }}>
                <Trash2 className="w-4 h-4 text-red-400" />
              </div>
              <span className="font-medium text-red-400">{t.deleteAccount}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-900" />
          </button>
        </div>
      </main>

      {/* Language picker bottom sheet */}
      {showLanguageSheet && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end" onClick={() => setShowLanguageSheet(false)}>
          <div
            className="w-full rounded-t-3xl safe-bottom"
            style={{ background: 'var(--card2)', border: '1px solid var(--line)', maxHeight: '75dvh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex-shrink-0 pt-3 pb-2">
              <div className="w-10 h-1 rounded-full mx-auto" style={{ background: 'var(--line)' }} />
            </div>
            <h3 className="flex-shrink-0 text-lg font-bold text-center text-[color:var(--text)] pb-3">{t.selectLanguage}</h3>
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1.5">
              {LOCALES.map(l => (
                <button
                  key={l.code}
                  onClick={() => { setLocale(l.code); setShowLanguageSheet(false) }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition active:opacity-70"
                  style={locale === l.code
                    ? { background: 'var(--chip)', border: '1px solid var(--accent)' }
                    : { background: 'var(--card2)', border: '1px solid transparent' }}
                >
                  <span className="text-xl">{l.flag}</span>
                  <span className="font-medium text-[15px]" style={{ color: locale === l.code ? 'var(--navy)' : '#ccc' }}>
                    {l.label}
                  </span>
                  {locale === l.code && (
                    <span className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--navy)' }} />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm bottom sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full rounded-t-3xl p-6 safe-bottom" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--line)' }} />
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#2a1010' }}>
              <Trash2 className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-center text-[color:var(--text)] mb-2">{t.deleteAccountConfirm}</h3>
            <p className="text-[13px] text-center mb-6" style={{ color: 'var(--muted2)' }}>{t.deleteAccountDescription}</p>
            <div className="space-y-3">
              <button
                onClick={async () => {
                  try {
                    await fetch('/api/delete-account', { method: 'POST' })
                    await supabase.auth.signOut()
                    router.push('/')
                  } catch {
                    toast.error(t.deleteAccountFailed)
                    setShowDeleteConfirm(false)
                  }
                }}
                className="w-full py-3.5 bg-red-500 text-[color:var(--text)] rounded-xl font-bold hover:bg-red-600 transition"
              >
                {t.delete}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-3.5 rounded-xl font-bold text-[color:var(--text)] transition"
                style={{ background: 'var(--card2)' }}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmSheet
        open={showLogoutConfirm}
        title={t.logoutConfirmTitle}
        description={t.logoutConfirmDesc}
        confirmLabel={t.logout}
        onConfirm={() => { setShowLogoutConfirm(false); handleLogout() }}
        onCancel={() => setShowLogoutConfirm(false)}
      />
      <BottomNav />
    </div>
  )
}
