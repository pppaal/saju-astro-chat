'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { isOwnChromeRoute } from '@/lib/routing/chromeRoutes'
import { useConsent } from '@/contexts/ConsentContext'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './consentBanner.module.css'

export function ConsentBanner() {
  const { status, grant, deny } = useConsent()
  const { status: authStatus } = useSession()
  const { t } = useI18n()
  // v9 paper 화면(홈 · 인생 흐름 · 캘린더)에선 종이 판(.paper) — 남색·금색 옛 테마가 카드 위에
  // 뜨지 않게(QA VH-5). 경로 판정은 전역 chrome 과 같은 목록(chromeRoutes).
  const paper = isOwnChromeRoute(usePathname())
  const [visible, setVisible] = useState(false)
  const [legalNeedsConsent, setLegalNeedsConsent] = useState<boolean | null>(null)

  // 로그인 직후 LegalConsentModal 이 강제로 떠 있을 가능성 — 그 위에 쿠키
  // 배너까지 겹치면 사용자가 두 개 모달을 동시에 처리해야 함.
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
    setVisible(status === 'pending' && legalNeedsConsent === false)
  }, [status, legalNeedsConsent])

  if (!visible) {
    return null
  }

  return (
    <div
      className={[styles.banner, paper ? styles.paper : ''].filter(Boolean).join(' ')}
      data-consent-theme={paper ? 'paper' : 'dark'}
      role="dialog"
      aria-live="polite"
      aria-labelledby="consent-banner-title"
      aria-describedby="consent-banner-desc"
    >
      <div className={styles.text}>
        <strong id="consent-banner-title" className={styles.title}>
          {t('consent.title', 'Cookie preferences')}
        </strong>
        <p id="consent-banner-desc" className={styles.description}>
          {t(
            'consent.description',
            'We use cookies to analyze traffic and improve your experience. You can change this anytime.'
          )}{' '}
          <Link
            href="/policy/privacy"
            className={styles.policyLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('consent.policyLink', 'Privacy Policy')}
          </Link>
        </p>
      </div>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.secondary}
          onClick={() => {
            deny()
            setVisible(false)
          }}
        >
          {t('consent.reject', 'Reject')}
        </button>
        <button
          type="button"
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
