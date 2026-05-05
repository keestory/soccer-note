'use client'

import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { I18nProvider } from '@/lib/i18n/context'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      {children}
      <Toaster position="bottom-center" />
    </I18nProvider>
  )
}
