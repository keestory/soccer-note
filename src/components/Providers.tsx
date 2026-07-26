'use client'

import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { I18nProvider } from '@/lib/i18n/context'
import { ThemeProvider } from '@/components/ThemeProvider'
import { DeepLinkHandler } from '@/components/DeepLinkHandler'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <DeepLinkHandler />
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--line)' },
          }}
        />
      </I18nProvider>
    </ThemeProvider>
  )
}
