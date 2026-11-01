'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { refreshDataAfterAuth } from '@/lib/dataStore'
import { useI18n } from '@/lib/i18n/context'
import { getEntryCopy } from '@/lib/entry-copy'
import { EntryBrand, EntryPlayerPreview, EntryRecordsPreview, EntryTeamPreview } from '@/components/entry/Entry'
import styles from '@/components/entry/entry.module.css'

export default function Onboarding() {
  const router = useRouter()
  const { locale, t } = useI18n()
  const copy = getEntryCopy(locale)
  const [step, setStep] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  const stepChanged = useRef(false)

  useEffect(() => {
    let active = true
    createClient().auth.getSession().then(async ({ data: { session } }) => {
      if (active && session) {
        await refreshDataAfterAuth(session.user.id)
        if (active) router.replace('/dashboard')
      }
    }).catch(() => { /* Keep the introduction available when offline. */ })
    return () => { active = false }
  }, [router])

  useEffect(() => {
    if (stepChanged.current) heading.current?.focus({ preventScroll: true })
  }, [step])

  const changeStep = (next: number) => { stepChanged.current = true; setStep(next) }

  return <main className={styles.page}>
    <div className={styles.container}>
      <header className={styles.header}><EntryBrand /><Link href="/signup" className={styles.textLink}>{copy.skip}</Link></header>
      <div className={styles.intro}>
        <section className={styles.heading}>
          <p className={styles.eyebrow}>SOCCER NOTE</p>
          <h1 ref={heading} tabIndex={-1} className={styles.title}>{copy.titles[step]}</h1>
          <p className={styles.description}>{copy.descriptions[step]}</p>
        </section>
        <div className={styles.visual} key={step}>{step === 0 ? <EntryPlayerPreview /> : step === 1 ? <EntryRecordsPreview /> : <EntryTeamPreview />}</div>
        <footer className={styles.footer}>
          <div className={styles.progress} role="group" aria-label={copy.progress.replace('{n}', String(step + 1))}>
            <div className={styles.progressBars} aria-hidden="true">{[0, 1, 2].map(index => <i key={index} data-current={index === step} />)}</div>
            <span aria-hidden="true"><strong>0{step + 1}</strong> / 03</span>
          </div>
          <div className={styles.actions}>
            {step > 0 && <button type="button" className={styles.secondary} onClick={() => changeStep(step - 1)}><ArrowLeft size={18} aria-hidden="true" />{copy.previous}</button>}
            {step < 2 ? <button type="button" className={styles.primary} onClick={() => changeStep(step + 1)}>{copy.next}<ArrowRight size={18} aria-hidden="true" /></button> : <Link href="/signup" className={styles.primary}>{copy.createAccount}<ArrowRight size={18} aria-hidden="true" /></Link>}
          </div>
          <p className={styles.loginPrompt}>{t.hasAccount}<Link href="/login">{t.login}</Link></p>
        </footer>
      </div>
    </div>
  </main>
}
