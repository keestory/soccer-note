'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { ArrowLeft, LogOut, Trash2, ChevronRight, Globe } from 'lucide-react'
import { useI18n } from '@/lib/i18n/context'
import { LOCALES } from '@/lib/i18n'
import toast from 'react-hot-toast'
import { Skeleton } from '@/components/Skeleton'
import { BottomNav } from '@/components/BottomNav'
import { ConfirmSheet } from '@/components/ConfirmSheet'
import { Sheet } from '@/components/design/Sheet'
import { createNameGateway, createNameJournal, nameAttemptComplete, nameAttemptUnknown, newNameAttempt, runNameAttempt, type NameAttempt, type NameOutcome } from '@/lib/profile-name-save'
import { getProfileNameCopy } from '@/lib/profile-name-copy'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [checking, setChecking] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [attempt, setAttempt] = useState<NameAttempt | null>(null)
  const [outcome, setOutcome] = useState<NameOutcome | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const attemptRef = useRef<NameAttempt | null>(null)
  const ownerRef = useRef<string | null>(null)
  const generationRef = useRef(0)
  const busyRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [showLanguageSheet, setShowLanguageSheet] = useState(false)
  const { locale, setLocale, t } = useI18n()
  const currentLocale = LOCALES.find(l => l.code === locale)
  const supabase = createClient()

  const nameCopy = getProfileNameCopy(locale)

  useEffect(() => {
    const generation = ++generationRef.current
    let active = true
    const loadController = new AbortController()
    const gateway = createNameGateway(supabase, loadController.signal)
    let knowsAccount = false
    let observedOwner: string | null | undefined
    let reloadTimer: ReturnType<typeof setTimeout> | undefined
    const current = () => active && generationRef.current === generation
    const invalidate = () => { ++generationRef.current }
    setLoading(true)
    setLoadFailed(false)
    setAttempt(null)
    attemptRef.current = null
    setOutcome(null)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      observedOwner = session?.user.id ?? null
      if (!current() || !knowsAccount || observedOwner === ownerRef.current) return
      invalidate()
      controllerRef.current?.abort()
      loadController.abort()
      ownerRef.current = null
      attemptRef.current = null
      busyRef.current = false
      setSaving(false)
      setChecking(false)
      setAttempt(null)
      setOutcome(null)
      setDisplayName('')
      setEmail('')
      setShowDeleteConfirm(false)
      setShowLogoutConfirm(false)
      setShowLanguageSheet(false)
      setLoading(true)
      // Never await a Supabase method inside its auth callback.
      reloadTimer = setTimeout(() => setReload(value => value + 1), 0)
    })
    void (async () => {
      try {
        const user = await gateway.account()
        if (!current()) return
        if (observedOwner !== undefined && observedOwner !== (user?.id ?? null)) {
          setReload(value => value + 1)
          return
        }
        ownerRef.current = user?.id ?? null
        knowsAccount = true
        if (!user) { router.push('/login'); return }
        const profileName = await gateway.readProfile(user)
        if (!current()) return
        // Missing is distinct from a failed read. Never fall back to stale SDK metadata.
        const name = profileName ?? await gateway.readAuth(user)
        if (!current()) return
        const confirmedUser = await gateway.account()
        if (!current()) return
        if (confirmedUser?.id !== user.id || (observedOwner !== undefined && observedOwner !== user.id)) {
          setReload(value => value + 1)
          return
        }
        setEmail(user.email || '')
        let pending: NameAttempt | null = null
        let journalBlocked = false
        try {
          const journal = createNameJournal(sessionStorage)
          pending = journal.read(user.id)
          if (pending && nameAttemptComplete(pending)) { journal.clear(user.id); pending = null }
        } catch { journalBlocked = true }
        attemptRef.current = pending
        setAttempt(pending)
        if (journalBlocked) setOutcome('storage-blocked')
        else if (pending) setOutcome('incomplete')
        setDisplayName(pending?.name ?? name ?? '')
        setLoading(false)
      } catch {
        if (current()) { setLoadFailed(true); setLoading(false) }
      }
    })()
    return () => {
      active = false
      invalidate()
      subscription.unsubscribe()
      clearTimeout(reloadTimer)
      loadController.abort()
      controllerRef.current?.abort()
      busyRef.current = false
    }
  }, [supabase, router, reload])

  const runSave = async (action: 'save' | 'retry' | 'check') => {
    if (busyRef.current || !ownerRef.current) return
    const name = displayName.trim()
    if (action === 'save' && !name) { toast.error(t.nameRequired); return }
    if (action === 'save' && attemptRef.current && !nameAttemptComplete(attemptRef.current)) return
    if (action === 'save' && attemptRef.current && nameAttemptComplete(attemptRef.current) && attemptRef.current.name === name) return
    const owner = ownerRef.current
    const generation = generationRef.current
    const current = () => generationRef.current === generation && ownerRef.current === owner
    busyRef.current = true
    setSaving(true)
    setChecking(action === 'check')
    const controller = new AbortController()
    controllerRef.current = controller
    try {
      const journal = createNameJournal(sessionStorage)
      // A previous screen's unresolved request cannot be discarded by a new form.
      let pending = journal.read(owner)
      if (pending && nameAttemptComplete(pending)) {
        // A previous successful save may have been unable to clear its marker.
        // Never substitute that old name for the user's new save request.
        journal.clear(owner)
        pending = null
      }
      const next = action === 'save' ? (pending ?? newNameAttempt(owner, name)) : attemptRef.current
      if (!next) return
      attemptRef.current = next
      setAttempt(next)
      if (action === 'save' && pending && !nameAttemptComplete(pending)) {
        setOutcome('incomplete')
        return
      }
      const result = await runNameAttempt(next, action, createNameGateway(supabase, controller.signal), journal, current, value => {
        attemptRef.current = value
        setAttempt(value)
      })
      if (!current()) return
      attemptRef.current = result.attempt
      setAttempt(result.attempt)
      setOutcome(result.outcome)
    } catch {
      if (current()) setOutcome('storage-blocked')
    } finally {
      if (current()) {
        busyRef.current = false
        setSaving(false)
        setChecking(false)
        controllerRef.current = null
      }
    }
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    void runSave('save')
  }
  const unresolved = attempt !== null && !nameAttemptComplete(attempt)
  const statusText = saving ? (checking ? nameCopy.checking : nameCopy.saving)
    : outcome === 'storage-blocked' ? nameCopy.storage
    : outcome === 'unverified' ? nameCopy.unverified
    : attempt && nameAttemptComplete(attempt) ? nameCopy.saved
    : attempt && nameAttemptUnknown(attempt) ? nameCopy.unknown : nameCopy.incomplete
  const stageText = (stage: NameAttempt['auth']) => stage === 'unknown' ? nameCopy.uncertain : nameCopy[stage]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const avatarInitial = displayName.trim().charAt(0).toUpperCase() || '?'

  const cardStyle = { background: 'var(--card2)', border: '1px solid var(--line)', borderRadius: 16 }
  const inputStyle = { background: 'var(--card2)', border: '1px solid var(--line)', color: 'var(--text)', borderRadius: 12 }

  if (loadFailed) {
    return <main className="min-h-screen safe-top p-6">
      <p role="alert">{nameCopy.loadFailed}</p>
      <button type="button" className="focus-ring mt-4 min-h-12 px-4" onClick={() => setReload(value => value + 1)}>{nameCopy.reload}</button>
    </main>
  }

  if (loading) {
    return (
      <div className="light min-h-screen safe-top pb-20" style={{ background: 'var(--bg)' }}>
        <header className="safe-top" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
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
      <header className="flex-shrink-0 sticky top-0 z-10" style={{ background: 'var(--nav)', borderBottom: '1px solid var(--line)' }}>
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
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold mb-3" style={{ background: 'var(--navy)', color: 'var(--accent)' }}>
            {avatarInitial}
          </div>
          <p className="font-bold text-[color:var(--text)] text-lg">{displayName || t.noName}</p>
          <p className="text-[13px] mt-0.5" style={{ color: 'var(--muted2)' }}>{email}</p>
        </div>

        {/* Edit form */}
        <form onSubmit={handleSave} style={cardStyle} className="overflow-hidden">
          <div className="px-5 pt-5 pb-4 space-y-4">
            <div>
              <label htmlFor="profile-display-name" className="block text-[11px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--muted2)' }}>{t.nameLabel}</label>
              <input
                id="profile-display-name"
                type="text"
                aria-describedby={attempt || outcome === 'storage-blocked' ? 'profile-name-status' : undefined}
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
            {(attempt || outcome === 'storage-blocked') && (
              <div id="profile-name-status" role="status" aria-live="polite" aria-atomic="true" className="mb-4 space-y-2 text-sm break-words" style={{ color: 'var(--text)' }}>
                {attempt && <p className="font-bold">{nameCopy.target.replace('{name}', attempt.name)}</p>}
                <p>{statusText}</p>
                {attempt && <ul className="space-y-1">
                  <li>{nameCopy.auth}: {stageText(attempt.auth)}</li>
                  <li>{nameCopy.profile}: {stageText(attempt.profile)}</li>
                </ul>}
                {attempt && displayName.trim() !== attempt.name && <p>{nameCopy.different}</p>}
              </div>
            )}
            {attempt && (unresolved || outcome === 'storage-blocked' || outcome === 'unverified') && <div className="mb-3 flex flex-col gap-2">
              <button id="profile-name-check" type="button" disabled={saving} className="focus-ring min-h-12 rounded-xl px-4 py-3 font-bold disabled:opacity-50" style={{ background: 'var(--chip)', color: 'var(--text)' }} onClick={() => void runSave('check')}>{nameCopy.check}</button>
              {unresolved && !nameAttemptUnknown(attempt) && <button id="profile-name-retry" type="button" disabled={saving} className="focus-ring min-h-12 rounded-xl px-4 py-3 font-bold disabled:opacity-50" style={{ background: 'var(--navy)', color: 'var(--accent)' }} onClick={() => void runSave('retry')}>{nameCopy.retry}</button>}
            </div>}
            <button
              type="submit"
              disabled={saving || unresolved}
              className="w-full py-3.5 rounded-xl font-bold text-[15px] disabled:opacity-50 transition active:scale-[0.98]"
              style={{ background: 'var(--navy)', color: 'var(--accent)' }}
            >
              {saving ? (checking ? nameCopy.checking : t.saving) : t.save}
            </button>
          </div>
        </form>

        {/* Settings list */}
        <div style={cardStyle} className="overflow-hidden">
          <button
            onClick={event => { if (event.detail < 2) setShowLanguageSheet(true) }}
            aria-haspopup="dialog"
            aria-expanded={showLanguageSheet}
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
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'var(--result-loss-bg)' }}>
                <Trash2 className="w-4 h-4" style={{ color: 'var(--result-loss)' }} />
              </div>
              <span className="font-medium" style={{ color: 'var(--result-loss)' }}>{t.deleteAccount}</span>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: '#fda29b' }} />
          </button>
        </div>
      </main>

      {/* Language picker bottom sheet */}
      {showLanguageSheet && (
        <Sheet title={t.selectLanguage} closeLabel={t.close} onClose={() => setShowLanguageSheet(false)}>
          <div className="space-y-1.5">
            {LOCALES.map(l => (
              <button
                key={l.code}
                type="button"
                aria-pressed={locale === l.code}
                onClick={event => {
                  // The sheet can cover its opener before the second click of a double-click.
                  if (event.detail > 1) return
                  setLocale(l.code)
                  setShowLanguageSheet(false)
                }}
                className="focus-ring w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition active:opacity-70"
                style={locale === l.code
                  ? { background: 'var(--chip)', border: '1px solid var(--accent)' }
                  : { background: 'var(--card2)', border: '1px solid transparent' }}
              >
                <span aria-hidden="true" className="text-xl">{l.flag}</span>
                <span className="font-medium text-[15px]" style={{ color: locale === l.code ? 'var(--brand)' : 'var(--text)' }}>
                  {l.label}
                </span>
                {locale === l.code && (
                  <span aria-hidden="true" className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--brand)' }} />
                )}
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* Delete confirm bottom sheet */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="w-full rounded-t-3xl p-6 safe-bottom" style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-6" style={{ background: 'var(--line)' }} />
            <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--result-loss-bg)' }}>
              <Trash2 className="w-7 h-7" style={{ color: 'var(--result-loss)' }} />
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
                className="w-full py-3.5 rounded-xl font-bold text-white transition" style={{ background: '#d92d20' }}
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
