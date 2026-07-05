'use client'

import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { I18nProvider } from '@/lib/i18n/context'
import { ThemeProvider } from '@/components/ThemeProvider'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { background: '#111010', color: '#fff', border: '1px solid var(--line)' },
          }}
        />
      </I18nProvider>
    </ThemeProvider>
  )
}
