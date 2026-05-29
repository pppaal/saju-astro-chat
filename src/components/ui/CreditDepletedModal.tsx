'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useI18n } from '@/i18n/I18nProvider'
import { useModalDismiss, useModalTransition } from '@/hooks/useModalA11y'
import styles from './CreditDepletedModal.module.css'

interface CreditDepletedModalProps {
  isOpen: boolean
  onClose: () => void
  remainingCredits?: number
  // 'guest' — 비로그인 사용자가 무료 체험 한도에 도달. 구매 대신 로그인을 유도.
  type?: 'depleted' | 'low' | 'guest'
}

export default function CreditDepletedModal({
  isOpen,
  onClose,
  remainingCredits = 0,
  type = 'depleted',
}: CreditDepletedModalProps) {
  const router = useRouter()
  const { t } = useI18n()
  const { isVisible, isAnimating } = useModalTransition(isOpen)

  const handlePurchase = useCallback(() => {
    // 결제 후 돌아올 URL 저장 — 경로뿐 아니라 쿼리(질문·생년월일 등)까지
    // 보존해야 결제 후 "그 자리"(보던 상담 화면)로 정확히 복귀한다.
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      if (currentPath !== '/pricing' && currentPath !== '/success') {
        localStorage.setItem('checkout_return_url', currentPath + window.location.search)
      }
    }
    onClose()
    router.push('/pricing')
  }, [onClose, router])

  // 게스트 한도 → 로그인. 로그인 후 보던 페이지로 그대로 돌아오게 callbackUrl 지정.
  const handleLogin = useCallback(() => {
    onClose()
    const callbackUrl = typeof window !== 'undefined' ? window.location.href : '/'
    void signIn(undefined, { callbackUrl })
  }, [onClose])

  // Esc 닫기 + body 스크롤 잠금 (공용 훅).
  useModalDismiss(isOpen, onClose)

  if (!isVisible) {
    return null
  }

  const isDepleted = type === 'depleted'
  const isGuest = type === 'guest'

  const getTitle = () => {
    if (isGuest) return t('credits.guest.title', '무료 체험을 모두 사용했어요')
    return isDepleted
      ? t('credits.depleted.title', '크레딧이 소진되었습니다')
      : t('credits.low.title', '크레딧이 부족합니다')
  }

  const getDescription = () => (
    <p className={styles.mainDesc}>
      {isGuest
        ? t(
            'credits.guest.description',
            '로그인하면 가입 보너스 5 크레딧으로 상담을 계속 이용할 수 있어요.'
          )
        : isDepleted
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

  return (
    <div
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

        {/* 잔여 크레딧 표시는 크레딧 기반(로그인) 상태에서만 의미 있음 —
            게스트 한도 안내에서는 숨긴다. */}
        {!isGuest && (
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
        )}

        <div className={styles.buttons}>
          {isGuest ? (
            <button className={styles.purchaseButton} onClick={handleLogin} autoFocus>
              <span className={styles.buttonIcon} aria-hidden="true">
                ✦
              </span>
              {t('credits.guest.cta', '로그인하고 계속하기')}
            </button>
          ) : (
            <button className={styles.purchaseButton} onClick={handlePurchase} autoFocus>
              <span className={styles.buttonIcon} aria-hidden="true">
                ✦
              </span>
              {t('credits.purchase', '크레딧 구매하기')}
            </button>
          )}
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
    </div>
  )
}
