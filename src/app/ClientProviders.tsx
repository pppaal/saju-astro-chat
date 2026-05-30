'use client'

import { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/I18nProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { CreditModalProvider } from '@/contexts/CreditModalContext'
import ServiceWorkerStabilityGuard from '@/components/pwa/ServiceWorkerStabilityGuard'
import ReferralLinker from '@/components/referral/ReferralLinker'
import LegalConsentModal from '@/components/legal/LegalConsentModal'
import CreditRewardChecker from '@/components/ui/CreditRewardChecker'
import { InAppBrowserNotice } from '@/components/ui/InAppBrowserNotice'
import { useKeyboardInset } from '@/hooks/useKeyboardInset'

/**
 * 단일 마운트 포인트로 VisualViewport API 를 구독해 --kb-inset 을 root 에
 * 노출. fixed/sticky 요소가 iOS 키보드 위로 안 밀려나도록 CSS 에서 참조.
 */
function KeyboardInsetWatcher() {
  useKeyboardInset()
  return null
}

export function ClientProviders({
  children,
  initialLocale,
}: {
  children: ReactNode
  initialLocale?: 'en' | 'ko'
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <KeyboardInsetWatcher />
      <ServiceWorkerStabilityGuard />
      <ReferralLinker />
      {/* 카톡·페북·인스타 등 in-app webview 감지 시 sticky 배너 — Google
          OAuth disallowed_useragent 차단을 우회하도록 Chrome / Safari 안내.
          감지 안 되면 즉시 null 반환이라 일반 브라우저에는 영향 없다. */}
      <InAppBrowserNotice />
      <ToastProvider>
        <CreditModalProvider>
          {children}
        </CreditModalProvider>
      </ToastProvider>
      {/* 첫 로그인 후 약관·개인정보·14세+ 동의 모달. 동의 안 받으면 backdrop
          으로 화면을 잠근다 (PIPA 22조의2 + 전상법 §13 ②항 방어). */}
      <LegalConsentModal />
      {/* 추천 보상 등 자동 지급 보너스를 사용자가 못 본 게 있으면 모달로
          1 회 노출. 로그아웃 중 받은 보상은 다음 로그인 시 노출. */}
      <CreditRewardChecker />
    </I18nProvider>
  )
}
