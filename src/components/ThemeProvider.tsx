'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { DEFAULT_ACCENT, accentTokens, resolveAccent } from '@/lib/theme'

export const ACCENT_PRESETS = [
  { name: '볼트',    hex: '#ccff00' },
  { name: '골드',    hex: '#e8b341' },
  { name: '시안',    hex: '#22d3ee' },
  { name: '마젠타', hex: '#f0398b' },
  { name: '오렌지', hex: '#ff6b35' },
  { name: '민트',   hex: '#34e2b0' },
]

function applyAccent(accent: string) {
  const root = document.documentElement
  Object.entries(accentTokens(accent)).forEach(([name, value]) => root.style.setProperty(name, value))
}

interface ThemeCtx {
  accent: string
  setAccent: (hex: string) => void
}

const ThemeContext = createContext<ThemeCtx>({ accent: DEFAULT_ACCENT, setAccent: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT)

  useEffect(() => {
    let saved = DEFAULT_ACCENT
    try { saved = resolveAccent(localStorage.getItem('sn-accent')) } catch { /* Storage may be unavailable in a private WebView. */ }
    setAccentState(saved)
    applyAccent(saved)
  }, [])

  const setAccent = (hex: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return
    const accent = resolveAccent(hex)
    setAccentState(accent)
    try { localStorage.setItem('sn-accent', accent) } catch { /* The current session still receives the selected accent. */ }
    applyAccent(accent)
  }

  return <ThemeContext.Provider value={{ accent, setAccent }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
