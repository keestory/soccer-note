import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkTheme, lightTheme, type Theme } from './theme'

export type ThemeMode = 'system' | 'light' | 'dark'
const STORAGE_KEY = 'themeMode'

interface Ctx {
  theme: Theme
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  isDark: boolean
}

const ThemeContext = createContext<Ctx>({
  theme: darkTheme, mode: 'dark', setMode: () => {}, isDark: true,
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme() // 'light' | 'dark' | null
  const [mode, setModeState] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'system' || v === 'light' || v === 'dark') setModeState(v)
    })
  }, [])

  const setMode = (m: ThemeMode) => {
    setModeState(m)
    AsyncStorage.setItem(STORAGE_KEY, m)
  }

  const resolved = mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode
  const isDark = resolved === 'dark'
  const theme = isDark ? darkTheme : lightTheme

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme
}

export function useThemeMode() {
  const { mode, setMode, isDark } = useContext(ThemeContext)
  return { mode, setMode, isDark }
}
