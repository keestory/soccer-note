'use client'

import { Suspense, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { refreshDataAfterAuth } from '@/lib/dataStore'
import { safeAuthReturn, authEntryPath, consumeAuthReturn } from '@/lib/auth-return'
import { startGoogleAuth } from '@/lib/google-auth'
import { getEntryCopy } from '@/lib/entry-copy'
import { useI18n } from '@/lib/i18n/context'
import { EntryBrand, EntryPlayerPreview, GoogleIcon } from './Entry'
import styles from './entry.module.css'

function AuthForm({ signup }: { signup: boolean }) {
  const { locale, t } = useI18n()
  const copy = getEntryCopy(locale)
  const router = useRouter()
  const search = useSearchParams()
  const destination = safeAuthReturn(search.get('redirect'))
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState(false)
  const [profileRetry, setProfileRetry] = useState<string | null>(null)
  const pending = useRef(false)
  const status = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    createClient().auth.getSession().then(async ({ data: { session } }) => {
      if (!session || !active) return
      await refreshDataAfterAuth(session.user.id)
      if (active) router.replace(destination)
    }).catch(() => { /* The form remains usable when the session check fails. */ })
    return () => { active = false }
  }, [router, destination])

  useEffect(() => { if (confirmation || error) status.current?.focus({ preventScroll: true }) }, [confirmation, error])

  const handleGoogle = async () => {
    if (pending.current) return
    pending.current = true
    setGoogleLoading(true)
    setError('')
    try { await startGoogleAuth(destination) }
    catch (cause) { setError(cause instanceof Error ? cause.message : t.loginError) }
    finally { pending.current = false; setGoogleLoading(false) }
  }

  const saveProfileAndContinue = async (id: string) => {
    const { error: profileError } = await createClient().from('profiles').upsert({ id, email: email.trim(), display_name: displayName.trim() })
    if (profileError) {
      setProfileRetry(id)
      setError(t.profileUpdateFailed)
      return
    }
    setProfileRetry(null)
    consumeAuthReturn()
    await refreshDataAfterAuth(id)
    router.replace(destination)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (pending.current) return
    setError('')
    if (signup) {
      if (!displayName.trim()) { setError(t.nameRequired); return }
      if (password !== confirmPassword) { setError(t.passwordsNoMatch); return }
      if (password.length < 6) { setError(t.passwordMinLength); return }
    }
    pending.current = true
    setLoading(true)
    try {
      const supabase = createClient()
      if (signup) {
        if (profileRetry) { await saveProfileAndContinue(profileRetry); return }
        const { data, error: signupError } = await supabase.auth.signUp({
          email: email.trim(), password, options: { data: { display_name: displayName.trim() } },
        })
        if (signupError) {
          setError(/should contain|complex|weak|character of each/i.test(signupError.message) ? t.passwordPolicyHint : signupError.message)
          return
        }
        if (data.session) {
          await saveProfileAndContinue(data.session.user.id)
        } else {
          // A returned user is not an authenticated session. RLS-protected writes
          // wait until authenticated; the requested name remains in auth metadata.
          setConfirmation(true)
        }
      } else {
        const { data, error: loginError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (loginError) { setError(loginError.message); return }
        consumeAuthReturn()
        await refreshDataAfterAuth(data.user.id)
        router.replace(destination)
      }
    } catch { setError(signup ? t.signupError : t.loginError) }
    finally { pending.current = false; setLoading(false) }
  }

  const busy = loading || googleLoading
  const passwordControl = (confirm: boolean) => {
    const visible = confirm ? showConfirm : showPassword
    const id = confirm ? 'confirm-password' : 'password'
    const mismatch = confirm && !!confirmPassword && password !== confirmPassword
    return <div className={styles.field}>
      <label htmlFor={id}>{confirm ? t.passwordConfirm : t.password}</label>
      <div className={styles.password}>
        <input id={id} type={visible ? 'text' : 'password'} value={confirm ? confirmPassword : password} onChange={event => (confirm ? setConfirmPassword : setPassword)(event.target.value)} required minLength={signup ? 6 : undefined} autoComplete={signup ? 'new-password' : 'current-password'} placeholder={signup ? t.passwordMin6 : undefined} aria-invalid={mismatch || undefined} aria-describedby={mismatch ? 'password-mismatch' : undefined} />
        <button type="button" onClick={() => confirm ? setShowConfirm(!visible) : setShowPassword(!visible)} aria-label={visible ? copy.hidePassword : copy.showPassword} aria-pressed={visible} aria-controls={id}>{visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}</button>
      </div>
      {mismatch && <p id="password-mismatch" className={`${styles.hint} ${styles.invalid}`}>{t.passwordsNoMatch}</p>}
    </div>
  }

  return <main className={styles.page}>
    <div className={styles.container}>
      <header className={styles.header}><EntryBrand /><Link href={authEntryPath(signup ? 'login' : 'signup', destination)} className={styles.textLink}>{signup ? t.login : t.signup}</Link></header>
      <div className={styles.authGrid}>
        <section className={styles.authIntro}><div className={styles.heading}><p className={styles.eyebrow}>SOCCER NOTE</p><h1 className={styles.title}>{signup ? copy.signupTitle : copy.loginTitle}</h1><p className={styles.description}>{signup ? copy.signupDescription : copy.loginDescription}</p></div><div className={styles.authArt}><EntryPlayerPreview /></div></section>
        <section className={styles.authForm} aria-label={signup ? t.signup : t.login}>
          {confirmation ? <div ref={status} tabIndex={-1} role="status" className={styles.teamForm}>
            <CheckCircle size={32} aria-hidden="true" style={{ color: 'var(--brand)' }} /><h2>{t.emailConfirmMessage}</h2><p className={styles.hint}>{email}</p><p className={styles.hint} style={{ marginTop: 12 }}>{t.signupSuccessMessage}</p><Link className={styles.primary} href={authEntryPath('login', destination)}>{t.login}<ArrowRight size={18} aria-hidden="true" /></Link>
          </div> : <>
            <button type="button" className={styles.google} onClick={handleGoogle} disabled={busy || !!profileRetry}><GoogleIcon />{googleLoading ? t.connecting : t.continueWithGoogle}</button>
            <div className={styles.divider}>{t.orEmail}</div>
            {error && <div ref={status} role="alert" tabIndex={-1} className={styles.error}>{error}</div>}
            <form onSubmit={handleSubmit} className={styles.form} aria-busy={busy}>
              {signup && <div className={styles.field}><label htmlFor="display-name">{t.nameLabel}</label><input id="display-name" autoComplete="name" value={displayName} onChange={event => setDisplayName(event.target.value)} required placeholder={t.namePlaceholder} /></div>}
              <div className={styles.field}><label htmlFor="email">{t.email}</label><input id="email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required placeholder="email@example.com" disabled={!!profileRetry} /></div>
              {passwordControl(false)}
              {signup ? passwordControl(true) : <div className={styles.forgot}><Link href="/forgot-password">{t.forgotPassword}</Link></div>}
              <button type="submit" className={styles.primary} disabled={busy}>{loading ? t.loading : profileRetry ? t.save : signup ? copy.createAccount : t.loginButton}<ArrowRight size={18} aria-hidden="true" /></button>
            </form>
            <p className={styles.loginPrompt}>{signup ? t.hasAccount : t.noAccount}<Link href={authEntryPath(signup ? 'login' : 'signup', destination)}>{signup ? t.login : t.signup}</Link></p>
          </>}
          <div className={styles.authLinks}><Link href="/?intro=1" className={styles.textLink}>{copy.intro}</Link></div>
        </section>
      </div>
    </div>
  </main>
}

export function AuthScreen({ signup = false }: { signup?: boolean }) {
  return <Suspense fallback={<main className={styles.page}><div className={styles.container}><EntryBrand /></div></main>}><AuthForm signup={signup} /></Suspense>
}
