'use client'

import { ReactNode } from 'react'
import { Toaster } from 'react-hot-toast'
import { I18nProvider } from '@/lib/i18n/context'
import { DeepLinkHandler } from '@/components/DeepLinkHandler'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <DeepLinkHandler />
      {children}
      <Toaster position="bottom-center" />
    </I18nProvider>
  )
}
