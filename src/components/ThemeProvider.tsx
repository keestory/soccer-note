'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export const ACCENT_PRESETS = [
  { name: '골드',    hex: '#e8b341' },
  { name: '볼트',    hex: '#ccff00' },
  { name: '시안',    hex: '#22d3ee' },
  { name: '마젠타', hex: '#f0398b' },
  { name: '오렌지', hex: '#ff6b35' },
  { name: '민트',   hex: '#34e2b0' },
]

const DEFAULT_ACCENT = '#e8b341'

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
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--muted1', mixHex(accent, '#141414', 0.55))
  root.style.setProperty('--muted2', mixHex(accent, '#0f0f0f', 0.66))
  root.style.setProperty('--chip',   mixHex(accent, '#0a0a0a', 0.90))
  root.style.setProperty('--chipText', mixHex(accent, '#1c1c1c', 0.32))
  root.style.setProperty('--line',   mixHex(accent, '#0a0a0a', 0.86))
  root.style.setProperty('--dash',   mixHex(accent, '#000000', 0.76))
}

interface ThemeCtx {
  accent: string
  setAccent: (hex: string) => void
}

const ThemeContext = createContext<ThemeCtx>({ accent: DEFAULT_ACCENT, setAccent: () => {} })

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState(DEFAULT_ACCENT)

  useEffect(() => {
    const saved = localStorage.getItem('sn-accent') || DEFAULT_ACCENT
    setAccentState(saved)
    applyAccent(saved)
  }, [])

  const setAccent = (hex: string) => {
    setAccentState(hex)
    localStorage.setItem('sn-accent', hex)
    applyAccent(hex)
  }

  return <ThemeContext.Provider value={{ accent, setAccent }}>{children}</ThemeContext.Provider>
}

export const useTheme = () => useContext(ThemeContext)
