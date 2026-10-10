'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export const ACCENT_PRESETS = [
  { name: '포레스트', hex: '#176b52' },
  { name: '볼트',    hex: '#ccff00' },
  { name: '골드',    hex: '#e8b341' },
  { name: '시안',    hex: '#22d3ee' },
  { name: '마젠타', hex: '#f0398b' },
  { name: '오렌지', hex: '#ff6b35' },
  { name: '민트',   hex: '#34e2b0' },
]

const DEFAULT_ACCENT = '#176b52'

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r,g,b].map(v => Math.max(0,Math.min(255,Math.round(v))).toString(16).padStart(2,'0')).join('')
}

function mixHex(a: string, b: string, tB: number): string {
  const [ar,ag,ab] = hexToRgb(a)
  const [br,bg,bb] = hexToRgb(b)
  return rgbToHex(ar*(1-tB)+br*tB, ag*(1-tB)+bg*tB, ab*(1-tB)+bb*tB)
}

function applyAccent(accent: string) {
  const root = document.documentElement
  // Custom team accents must not recolor structural dividers or body text.
  const [r, g, b] = hexToRgb(accent)
  const luminance = [r, g, b].map(v => { const n = v / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4 })
  const light = luminance[0] * .2126 + luminance[1] * .7152 + luminance[2] * .0722 > .179
  root.style.setProperty('--brand', light ? mixHex(accent, '#172c23', .7) : accent)
  root.style.setProperty('--on-brand', '#ffffff')
  root.style.setProperty('--accent', mixHex(accent, '#ffffff', .83))
}

interface ThemeCtx {
  accent: string
  setAccent: (hex: string) => void
}

const ThemeContext = createContext<ThemeCtx>({ accent: DEFAULT_ACCENT, setAccent: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT)

  useEffect(() => {
    const stored = localStorage.getItem('sn-accent')
    const saved = stored && /^#[0-9a-f]{6}$/i.test(stored) ? stored : DEFAULT_ACCENT
    setAccentState(saved)
    applyAccent(saved)
  }, [])

  const setAccent = (hex: string) => {
    if (!/^#[0-9a-f]{6}$/i.test(hex)) return
    setAccentState(hex)
    localStorage.setItem('sn-accent', hex)
    applyAccent(hex)
  }

  return <ThemeContext.Provider value={{ accent, setAccent }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
