'use client'

import { useState, useRef, useEffect } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { LOCALES } from '@/lib/i18n'
import { Globe } from 'lucide-react'

export default function LanguageSelector() {
  const { locale, setLocale, t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const current = LOCALES.find(l => l.code === locale)

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
        title={t.language}
      >
        <Globe className="w-4 h-4" />
        <span>{current?.flag}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 rounded-xl py-1 z-50 min-w-[180px]"
          style={{ background: 'var(--card2)', border: '1px solid var(--line)' }}>
          {LOCALES.map((l) => (
            <button
              key={l.code}
              onClick={() => { setLocale(l.code); setOpen(false) }}
              className="w-full px-4 py-2.5 text-left flex items-center gap-3 transition"
              style={locale === l.code
                ? { background: 'var(--chip)', color: 'var(--accent)' }
                : { color: 'rgba(255,255,255,0.7)' }}>
              <span className="text-lg">{l.flag}</span>
              <span className="text-sm font-medium">{l.label}</span>
              {locale === l.code && (
                <span className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
