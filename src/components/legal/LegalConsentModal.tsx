'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { logger } from '@/lib/logger'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import styles from './LegalConsentModal.module.css'

// 첫 로그인 후 (또는 LEGAL_VERSION bump 후) 모달을 띄워서
// 약관·개인정보 동의 + 만 14세 이상 self-attest 를 강제로 받는다.
// - PIPA 22조의2 (14세 미만 처리 제한) 방어
// - 전상법 §13 ②항 (이용 계약 전 약관 명시 동의 입증 책임) 방어
//
// 모달이 떠 있는 동안 backdrop click·ESC 로 닫히지 않는다 (강제 동의).
// 동의해야만 사라지고, 그 결과는 UserSettings 에 timestamp 로 남는다.
//
// 비로그인 사용자에게는 안 띄운다 (로그인이 가입 시점이므로).
export default function LegalConsentModal() {
  const { status } = useSession()
  const { locale } = useI18n()
  const isKo = locale === 'ko'

  const [needsConsent, setNeedsConsent] = useState(false)
  const [checked, setChecked] = useState({ terms: false, privacy: false, age: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const trapRef = useFocusTrap(needsConsent)

  // 로그인 직후 동의 상태를 조회. 게이트하기 전까지 모달은 안 보인다 (깜빡임 방지).
  useEffect(() => {
    if (status !== 'authenticated') {
      setNeedsConsent(false)
      return
    }
    let cancelled = false
    fetch('/api/me/legal-consent')
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return
        const data = (json?.data ?? json) as { needsConsent?: boolean } | null
        if (data?.needsConsent) setNeedsConsent(true)
      })
      .catch((err) => {
        if (!cancelled) logger.warn('[legal-consent] status fetch failed', err)
      })
    return () => {
      cancelled = true
    }
  }, [status])

  const allChecked = checked.terms && checked.privacy && checked.age

  const handleSubmit = useCallback(async () => {
    if (!allChecked || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/me/legal-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptedTerms: true,
          acceptedPrivacy: true,
          ageConfirmed: true,
        }),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      setNeedsConsent(false)
    } catch (err) {
      logger.warn('[legal-consent] submit failed', err)
      setError(
        isKo
          ? '동의 처리에 실패했어요. 잠시 후 다시 시도해 주세요.'
          : 'Failed to record consent. Please try again in a moment.'
      )
    } finally {
      setSubmitting(false)
    }
  }, [allChecked, submitting, isKo])

  if (!needsConsent) return null

  return (
    <div
      ref={trapRef}
      className={styles.backdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-consent-title"
    >
      <div className={styles.modal}>
        <h2 id="legal-consent-title" className={styles.title}>
          {isKo ? '이용 전 동의가 필요해요' : 'Before you continue'}
        </h2>
        <p className={styles.subtitle}>
          {isKo
            ? 'DestinyPal 을 이용하시려면 아래 사항에 동의해 주세요.'
            : 'Please confirm the items below to continue using DestinyPal.'}
        </p>

        <label className={styles.row}>
          <input
            type="checkbox"
            checked={checked.terms}
            onChange={(e) => setChecked((c) => ({ ...c, terms: e.target.checked }))}
            disabled={submitting}
          />
          <span>
            {isKo ? '(필수) ' : '(Required) '}
            <Link
              href="/policy/terms"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {isKo ? '이용약관' : 'Terms of Service'}
            </Link>
            {isKo ? '에 동의합니다.' : ' — I agree.'}
          </span>
        </label>

        <label className={styles.row}>
          <input
            type="checkbox"
            checked={checked.privacy}
            onChange={(e) => setChecked((c) => ({ ...c, privacy: e.target.checked }))}
            disabled={submitting}
          />
          <span>
            {isKo ? '(필수) ' : '(Required) '}
            <Link
              href="/policy/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
            >
              {isKo ? '개인정보처리방침' : 'Privacy Policy'}
            </Link>
            {isKo ? '에 동의합니다.' : ' — I agree.'}
          </span>
        </label>

        <label className={styles.row}>
          <input
            type="checkbox"
            checked={checked.age}
            onChange={(e) => setChecked((c) => ({ ...c, age: e.target.checked }))}
            disabled={submitting}
          />
          <span>
            {isKo ? '(필수) 만 14세 이상입니다.' : '(Required) I am 14 years of age or older.'}
          </span>
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          className={styles.submit}
          onClick={() => void handleSubmit()}
          disabled={!allChecked || submitting}
        >
          {submitting
            ? isKo
              ? '처리 중…'
              : 'Submitting…'
            : isKo
              ? '동의하고 계속하기'
              : 'Agree and continue'}
        </button>
      </div>
    </div>
  )
}
