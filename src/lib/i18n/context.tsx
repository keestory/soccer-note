'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import type { Locale, Translations } from './types'
import { getTranslations } from './index'

interface I18nContextType {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translations
}

const I18nContext = createContext<I18nContextType | null>(null)

const STORAGE_KEY = 'soccernote-locale'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null
    if (saved && ['ko', 'en_US', 'en_GB', 'ja', 'fr', 'de', 'it', 'es'].includes(saved)) {
      setLocaleState(saved)
    } else {
      // Auto-detect from browser language
      const browserLang = navigator.language || navigator.languages?.[0] || ''
      const langMap: Record<string, Locale> = {
        'ko': 'ko',
        'en-US': 'en_US',
        'en-GB': 'en_GB',
        'ja': 'ja',
        'fr': 'fr',
        'de': 'de',
        'it': 'it',
        'es': 'es',
      }
      const detected = langMap[browserLang]
        ?? langMap[browserLang.split('-')[0]]
        ?? 'en_US'
      setLocaleState(detected)
    }
    setMounted(true)
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    localStorage.setItem(STORAGE_KEY, newLocale)
  }

  const t = getTranslations(locale)

  if (!mounted) {
    const defaultT = getTranslations('ko')
    return (
      <I18nContext.Provider value={{ locale: 'ko', setLocale: () => {}, t: defaultT }}>
        {children}
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider')
  }
  return context
}
