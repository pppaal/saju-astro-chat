'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useConsent } from '@/contexts/ConsentContext'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './consentBanner.module.css'

export function ConsentBanner() {
  const { status, grant, deny } = useConsent()
  const { status: authStatus } = useSession()
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)
  const [legalNeedsConsent, setLegalNeedsConsent] = useState<boolean | null>(null)

  // 로그인 직후 LegalConsentModal 이 강제로 떠 있을 가능성 — 그 위에 쿠키
  // 배너까지 겹치면 사용자가 두 개 모달을 동시에 처리해야 함. 로그인된 사
  // 용자는 /api/me/legal-consent 결과를 먼저 보고, needsConsent=true 면
  // LegalConsentModal 가 닫힐 때까지 쿠키 배너 보류.
  useEffect(() => {
    if (authStatus !== 'authenticated') {
      setLegalNeedsConsent(false)
      return
    }
    let cancelled = false
    fetch('/api/me/legal-consent')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return
        const data = (json?.data ?? json) as { needsConsent?: boolean } | null
        setLegalNeedsConsent(!!data?.needsConsent)
      })
      .catch(() => {
        if (!cancelled) setLegalNeedsConsent(false)
      })
    return () => {
      cancelled = true
    }
  }, [authStatus])

  useEffect(() => {
    // pending 일 때만 + Legal 모달이 안 떠 있을 때만 표시.
    // legalNeedsConsent === null = 아직 조회 중 → 안전하게 보류.
    setVisible(status === 'pending' && legalNeedsConsent === false)
  }, [status, legalNeedsConsent])

  if (!visible) {
    return null
  }

  return (
    <div
      className={styles.banner}
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-banner-title"
    >
      <div className={styles.text}>
        <strong id="consent-banner-title">{t('consent.title', 'Privacy choices')}</strong>
        <p>{t('consent.description', 'We use cookies and similar tech for analytics and ads.')}</p>
      </div>
      <div className={styles.actions}>
        <button
          className={styles.secondary}
          onClick={() => {
            deny()
            setVisible(false)
          }}
        >
          {t('consent.reject', 'Reject')}
        </button>
        <button
          className={styles.primary}
          onClick={() => {
            grant()
            setVisible(false)
          }}
        >
          {t('consent.accept', 'Accept')}
        </button>
      </div>
    </div>
  )
}
