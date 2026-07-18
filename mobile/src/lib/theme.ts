// Dual-theme token system.
//  - dark  = "GOLDLINE" (near-black surfaces, volt accent as primary fill)
//  - light = "Navy Board" (light neutral UI, navy #101828 as the single dark
//            surface; the volt accent appears ONLY on navy, never on light bg)
//
// Screens read tokens through useTheme() (see theme-context.tsx). Where the two
// themes diverge structurally — e.g. the primary button is accent-filled in
// dark but navy-filled in light — a semantic token carries both the fill and
// its text colour so screen code stays theme-agnostic.

export interface Theme {
  isDark: boolean
  // surfaces
  bg: string
  card: string
  card2: string      // inset tile / secondary card
  nav: string        // bottom nav / header bar
  line: string
  line2: string
  // text on bg/card
  text: string       // primary
  text2: string      // secondary
  text3: string      // tertiary / body muted
  textMute: string   // labels / placeholder
  textFaint: string  // faintest / disabled
  white: string      // legacy alias for primary text
  muted1: string     // legacy
  muted2: string     // legacy
  // accent (meaningful on navy/hero surfaces)
  accent: string
  onAccent: string   // text on an accent fill
  // primary CTA button (diverges between themes)
  btnBg: string
  btnText: string
  // chips
  chip: string
  chipText: string
  // hero / scoreboard navy surface (navy in both themes)
  hero: string
  hero2: string      // inset tile on hero
  heroText: string
  heroMute: string
  heroDim: string
  heroDash: string   // score dash/colon on hero
  dash: string       // legacy
  // inputs
  inputBg: string
  inputLine: string
  // semantic
  danger: string
  dangerText: string
  dangerSoft: string
  // pitch
  pitch1: string
  pitch2: string
  pitchLine: string
}

export const darkTheme: Theme = {
  isDark: true,
  bg: '#0a0a0a',
  card: '#111010',
  card2: '#1a1a1a',
  nav: '#050505',
  line: '#1b2400',
  line2: '#1b2400',
  text: '#ffffff',
  text2: '#9aa0a6',
  text3: '#748f00',
  textMute: '#556',
  textFaint: '#333',
  white: '#ffffff',
  muted1: '#748f00',
  muted2: '#445200',
  accent: '#ccff00',
  onAccent: '#0a0a0a',
  btnBg: '#ccff00',
  btnText: '#0a0a0a',
  chip: '#131a00',
  chipText: '#a8d400',
  hero: '#101828',
  hero2: '#1a2437',
  heroText: '#ffffff',
  heroMute: '#98a2b3',
  heroDim: '#667085',
  heroDash: '#344054',
  dash: '#0f1900',
  inputBg: '#1a1a1a',
  inputLine: '#2a2a2a',
  danger: '#c05a4d',
  dangerText: '#e07a6d',
  dangerSoft: 'rgba(192,90,77,0.14)',
  pitch1: '#12724a',
  pitch2: '#0e5e3d',
  pitchLine: 'rgba(255,255,255,0.28)',
}

export const lightTheme: Theme = {
  isDark: false,
  bg: '#f5f6f8',
  card: '#ffffff',
  card2: '#f2f4f7',
  nav: '#ffffff',
  line: '#eaecf0',
  line2: '#e4e7ec',
  text: '#101828',
  text2: '#475467',
  text3: '#667085',
  textMute: '#98a2b3',
  textFaint: '#d0d5dd',
  white: '#101828',
  muted1: '#667085',
  muted2: '#98a2b3',
  accent: '#c8f542',
  onAccent: '#101828',
  btnBg: '#101828',
  btnText: '#c8f542',
  chip: '#f2f4f7',
  chipText: '#101828',
  hero: '#101828',
  hero2: '#1a2437',
  heroText: '#ffffff',
  heroMute: '#98a2b3',
  heroDim: '#667085',
  heroDash: '#344054',
  dash: '#344054',
  inputBg: '#ffffff',
  inputLine: '#eaecf0',
  danger: '#f04438',
  dangerText: '#b42318',
  dangerSoft: '#fef3f2',
  pitch1: '#12724a',
  pitch2: '#0e5e3d',
  pitchLine: 'rgba(255,255,255,0.28)',
}

// Static default so any not-yet-migrated module keeps compiling with dark values.
export const theme = darkTheme

// Position colours are theme-independent.
export const POS_COLOR: Record<string, string> = {
  GK: '#f5a623', DF: '#3b82f6', MF: '#2dd4bf', FW: '#ef4444',
}
export const POS_TEXT: Record<string, string> = {
  GK: '#3a2600', DF: '#fff', MF: '#06231d', FW: '#fff',
}
