import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import type { Locale, Translations } from './types'
import { getTranslations } from './index'

const STORAGE_KEY = 'soccernote-locale'

interface I18nContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: Translations
}

const I18nContext = createContext<I18nContextValue | null>(null)

const LOCALE_MAP: Record<string, Locale> = {
  ko: 'ko', en: 'en_US', ja: 'ja', fr: 'fr', de: 'de', it: 'it', es: 'es',
}

function detectLocale(): Locale {
  try {
    const tag = getLocales()[0]?.languageTag ?? 'ko'
    const lang = tag.toLowerCase()
    if (lang.startsWith('en-gb')) return 'en_GB'
    return LOCALE_MAP[lang.split('-')[0]] ?? 'ko'
  } catch {
    return 'ko'
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ko')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setLocaleState(saved as Locale)
      else setLocaleState(detectLocale())
    })
  }, [])

  const setLocale = (l: Locale) => {
    setLocaleState(l)
    AsyncStorage.setItem(STORAGE_KEY, l)
  }

  const t = getTranslations(locale)

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  )
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}
