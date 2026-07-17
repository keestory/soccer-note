import type { Locale, Translations } from './types'
import { translations as ko } from './locales/ko'
import { translations as en_US } from './locales/en_US'
import { translations as en_GB } from './locales/en_GB'
import { translations as ja } from './locales/ja'
import { translations as fr } from './locales/fr'
import { translations as de } from './locales/de'
import { translations as it } from './locales/it'
import { translations as es } from './locales/es'

const allTranslations: Partial<Record<Locale, Translations>> = {
  ko,
  en_US,
  en_GB,
  ja,
  fr,
  de,
  it,
  es
}

export function getTranslations(locale: Locale): Translations {
  return allTranslations[locale] || allTranslations.ko || ko
}

export { LOCALES } from './types'
export type { Locale, Translations, LocaleInfo } from './types'
