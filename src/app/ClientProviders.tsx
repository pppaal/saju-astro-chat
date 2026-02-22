'use client'

import { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { CreditModalProvider } from '@/contexts/CreditModalContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import ServiceWorkerStabilityGuard from '@/components/pwa/ServiceWorkerStabilityGuard'

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <I18nProvider>
      <ServiceWorkerStabilityGuard />
      <ToastProvider>
        <CreditModalProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </CreditModalProvider>
      </ToastProvider>
    </I18nProvider>
  )
}
