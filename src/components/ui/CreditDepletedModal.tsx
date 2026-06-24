'use client'

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import { useModalDismiss, useModalTransition } from '@/hooks/useModalA11y'
import { useFocusTrap } from '@/hooks/useFocusTrap'
import styles from './CreditDepletedModal.module.css'

interface CreditDepletedModalProps {
  isOpen: boolean
  onClose: () => void
  remainingCredits?: number
  type?: 'depleted' | 'low'
}

export default function CreditDepletedModal({
  isOpen,
  onClose,
  remainingCredits = 0,
  type = 'depleted',
}: CreditDepletedModalProps) {
  const router = useRouter()
  const { t, locale } = useI18n()
  const { isVisible, isAnimating } = useModalTransition(isOpen)
  const trapRef = useFocusTrap(isOpen)
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // 첫구매 한정 스타터팩 자격 — 모달이 열릴 때 1회 조회. 자격 있으면 인라인
  // 미끼 오퍼를 띄워 /pricing 평면그리드로 보내지 않고 피크 순간에 전환시킨다.
  const [starter, setStarter] = useState<{ credits: number; krw: number; usd: number } | null>(null)
  const [starterBusy, setStarterBusy] = useState(false)
  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    setStarter(null)
    fetch('/api/me/starter-eligibility', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        const pack = res?.data?.pack ?? res?.pack ?? null
        if (!cancelled && pack) setStarter(pack)
      })
      .catch(() => {
        /* 자격 조회 실패는 조용히 무시 — 일반 흐름으로 폴백 */
      })
    return () => {
      cancelled = true
    }
  }, [isOpen])

  // 결제 후 돌아올 URL 저장 — 경로뿐 아니라 쿼리(질문·생년월일 등)까지
  // 보존해야 결제 후 "그 자리"(보던 상담 화면)로 정확히 복귀한다.
  const saveReturnUrl = useCallback(() => {
    if (typeof window === 'undefined') return
    const currentPath = window.location.pathname
    if (currentPath !== '/pricing' && currentPath !== '/success') {
      localStorage.setItem('checkout_return_url', currentPath + window.location.search)
    }
  }, [])

  const handlePurchase = useCallback(() => {
    saveReturnUrl()
    onClose()
    router.push('/pricing')
  }, [onClose, router, saveReturnUrl])

  // 스타터팩 원클릭 — 평면그리드를 거치지 않고 바로 Stripe 체크아웃으로.
  const handleStarterCheckout = useCallback(async () => {
    if (starterBusy) return
    setStarterBusy(true)
    saveReturnUrl()
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ creditPack: 'starter' }),
      })
      const data = (await res.json().catch(() => null)) as Record<string, unknown> | null
      const inner = (data?.data ?? data ?? {}) as Record<string, unknown>
      const url = typeof inner.url === 'string' ? inner.url : null
      if (url) {
        window.location.href = url
        return
      }
      // 자격 만료/설정 누락 등 — 일반 결제 흐름으로 폴백.
      handlePurchase()
    } catch {
      handlePurchase()
    } finally {
      setStarterBusy(false)
    }
  }, [starterBusy, saveReturnUrl, handlePurchase])

  const formatStarterPrice = () =>
    locale === 'en' && starter ? `$${starter.usd.toFixed(2)}` : `₩${starter?.krw.toLocaleString()}`

  // Esc 닫기 + body 스크롤 잠금 (공용 훅).
  useModalDismiss(isOpen, onClose)

  if (!isVisible || !mounted) {
    return null
  }

  const isDepleted = type === 'depleted'

  const getTitle = () =>
    isDepleted
      ? t('credits.depleted.title', '크레딧이 소진되었습니다')
      : t('credits.low.title', '크레딧이 부족합니다')

  const getDescription = () => (
    <p className={styles.mainDesc}>
      {isDepleted
        ? t(
            'credits.depleted.description',
            '모든 크레딧을 사용하셨습니다. 크레딧을 충전하시면 더 많은 상담을 받아보실 수 있습니다.'
          )
        : t(
            'credits.low.description',
            `잔여 크레딧이 ${remainingCredits}개 남았습니다. 서비스 이용을 위해 충전을 권장합니다.`
          )}
    </p>
  )

  // createPortal — 부모 트리에 transform/filter 가 걸려 있으면 position:fixed
  // 의 컨테이닝 블록이 viewport 가 아니라 그 부모가 돼서 모달이 화면 밖에
  // mount 되던 회귀 (ClarifierCardModal 과 동일 회귀, 같은 fix).
  return createPortal(
    <div
      ref={trapRef}
      className={`${styles.overlay} ${isAnimating ? styles.overlayVisible : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-modal-title"
    >
      <div
        className={`${styles.modal} ${isAnimating ? styles.modalVisible : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 단일 골드 sparkle — depleted/low 둘 다 같은 아이콘, 컨테이너 톤만
            warning 일 때 옐로우 그라데이션으로 약간 강조. 옛 펄싱 링 3개
            제거 — 모달이 너무 시끄럽고 산만했음. */}
        <div
          className={`${styles.iconContainer} ${isDepleted ? '' : styles.warning}`}
          aria-hidden="true"
        >
          {isDepleted ? '✦' : '⚠'}
        </div>

        <h2 id="credit-modal-title" className={styles.title}>
          {getTitle()}
        </h2>

        <div className={styles.description}>{getDescription()}</div>

        <div className={styles.creditDisplay}>
          <div className={styles.creditIcon} aria-hidden="true">
            ✦
          </div>
          <div className={styles.creditInfo}>
            <span className={styles.creditLabel}>{t('credits.remaining', '잔여 크레딧')}</span>
            <span className={`${styles.creditValue} ${isDepleted ? styles.empty : styles.low}`}>
              {remainingCredits}
              <span className={styles.creditUnit}>{t('credits.unit', '개')}</span>
            </span>
          </div>
        </div>

        {starter && (
          <div className={styles.starterOffer}>
            <span className={styles.starterBadge}>
              {t('credits.starter.badge', '첫 구매 한정')}
            </span>
            <div className={styles.starterBody}>
              <div className={styles.starterInfo}>
                <span className={styles.starterTitle}>{t('credits.starter.title', '스타터팩')}</span>
                <span className={styles.starterMeta}>
                  {t('credits.starter.meta', `${starter.credits}크레딧 · 가장 저렴한 첫 시작`)}
                </span>
              </div>
              <button
                className={styles.starterButton}
                onClick={handleStarterCheckout}
                disabled={starterBusy}
                autoFocus
              >
                {starterBusy
                  ? t('common.loading', '잠시만요…')
                  : `${formatStarterPrice()} ${t('credits.starter.cta', '지금 시작')}`}
              </button>
            </div>
          </div>
        )}

        <div className={styles.buttons}>
          <button
            className={styles.purchaseButton}
            onClick={handlePurchase}
            autoFocus={!starter}
          >
            <span className={styles.buttonIcon} aria-hidden="true">
              ✦
            </span>
            {starter ? t('credits.seeAllPacks', '모든 팩 보기') : t('credits.purchase', '크레딧 구매하기')}
          </button>
          <button className={styles.laterButton} onClick={onClose}>
            {t('common.later', '나중에')}
          </button>
        </div>

        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t('common.close', '닫기')}
        >
          ✕
        </button>
      </div>
    </div>,
    document.body
  )
}
