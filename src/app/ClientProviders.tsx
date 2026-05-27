'use client'

import { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { CreditModalProvider } from '@/contexts/CreditModalContext'
import { NotificationProvider } from '@/contexts/NotificationContext'
import ServiceWorkerStabilityGuard from '@/components/pwa/ServiceWorkerStabilityGuard'
import ReferralLinker from '@/components/referral/ReferralLinker'
import LegalConsentModal from '@/components/legal/LegalConsentModal'

export function ClientProviders({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: 'en' | 'ko'
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <ServiceWorkerStabilityGuard />
      <ReferralLinker />
      <ToastProvider>
        <CreditModalProvider>
          <NotificationProvider>{children}</NotificationProvider>
        </CreditModalProvider>
      </ToastProvider>
      {/* 첫 로그인 후 약관·개인정보·14세+ 동의 모달. 동의 안 받으면 backdrop
          으로 화면을 잠근다 (PIPA 22조의2 + 전상법 §13 ②항 방어). */}
      <LegalConsentModal />
    </I18nProvider>
  )
}
