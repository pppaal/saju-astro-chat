'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './CreditDepletedModal.module.css'

type CreditLimitType = 'reading' | 'compatibility' | 'followUp'

interface CreditDepletedModalProps {
  isOpen: boolean
  onClose: () => void
  remainingCredits?: number
  type?: 'depleted' | 'low'
  creditType?: CreditLimitType
  limitInfo?: {
    used: number
    limit: number
    planName?: string
  }
}

export default function CreditDepletedModal({
  isOpen,
  onClose,
  remainingCredits = 0,
  type = 'depleted',
  creditType = 'reading',
  limitInfo,
}: CreditDepletedModalProps) {
  const router = useRouter()
  const { t } = useI18n()
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      requestAnimationFrame(() => {
        setIsAnimating(true)
      })
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  const handlePurchase = useCallback(() => {
    // 결제 후 돌아올 URL 저장
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname
      if (currentPath !== '/pricing' && currentPath !== '/success') {
        localStorage.setItem('checkout_return_url', currentPath)
      }
    }
    onClose()
    router.push('/pricing')
  }, [onClose, router])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    },
    [onClose]
  )

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, handleKeyDown])

  if (!isVisible) {
    return null
  }

  const isDepleted = type === 'depleted'
  const isLimitError = creditType === 'compatibility' || creditType === 'followUp'

  // Get appropriate title based on credit type
  const getTitle = () => {
    if (isLimitError && limitInfo) {
      const typeLabels = {
        compatibility: '궁합 분석 한도 초과',
        followUp: '후속질문 한도 초과',
        reading: '크레딧 소진',
      }
      return typeLabels[creditType]
    }
    return isDepleted
      ? t('credits.depleted.title', '크레딧이 소진되었습니다')
      : t('credits.low.title', '크레딧이 부족합니다')
  }

  // Get detailed description based on credit type
  const getDescription = () => {
    if (isLimitError && limitInfo) {
      const typeLabels = {
        compatibility: '궁합 분석',
        followUp: '후속질문',
        reading: '일반 리딩',
      }
      const serviceLabel = typeLabels[creditType]

      return (
        <>
          <p className={styles.mainDesc}>
            이번 달 {serviceLabel} 횟수를 모두 사용했어요 ({limitInfo.used}/{limitInfo.limit}회)
          </p>
          <div className={styles.explainer}>
            <div className={styles.explainerIcon}>💡</div>
            <div className={styles.explainerContent}>
              <strong>월간 한도 제한이란?</strong>
              <p>{serviceLabel}은 플랜별로 월 이용 횟수가 제한되어 있습니다.</p>
              <p className={styles.noteText}>
                일반 크레딧과는 별도로 관리되며, 매월 1일에 초기화됩니다.
              </p>
            </div>
          </div>
        </>
      )
    }

    return (
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
  }

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
        {/* Animated Icon */}
        <div className={styles.iconContainer}>
          <div className={`${styles.iconRing} ${styles.ring1}`} />
          <div className={`${styles.iconRing} ${styles.ring2}`} />
          <div className={`${styles.iconRing} ${styles.ring3}`} />
          <div className={styles.iconInner}>
            {isDepleted ? (
              <span className={styles.emptyIcon}>✦</span>
            ) : (
              <span className={styles.warningIcon}>⚠</span>
            )}
          </div>
        </div>

        {/* Title */}
        <h2 id="credit-modal-title" className={styles.title}>
          {getTitle()}
        </h2>

        {/* Description */}
        <div className={styles.description}>{getDescription()}</div>

        {/* Credit Display */}
        {isLimitError && limitInfo ? (
          <div className={styles.limitDisplay}>
            <div className={styles.limitBar}>
              <div className={styles.limitBarFill} style={{ width: '100%' }} />
            </div>
            <div className={styles.limitText}>
              <span className={styles.limitLabel}>이번 달 사용량</span>
              <span className={styles.limitValue}>
                {limitInfo.used}/{limitInfo.limit}회
              </span>
            </div>
            {limitInfo.planName && (
              <p className={styles.planInfo}>
                현재 플랜: <strong>{limitInfo.planName}</strong>
              </p>
            )}
          </div>
        ) : (
          <div className={styles.creditDisplay}>
            <div className={styles.creditIcon}>✦</div>
            <div className={styles.creditInfo}>
              <span className={styles.creditLabel}>{t('credits.remaining', '잔여 크레딧')}</span>
              <span className={`${styles.creditValue} ${isDepleted ? styles.empty : styles.low}`}>
                {remainingCredits}
                <span className={styles.creditUnit}>{t('credits.unit', '개')}</span>
              </span>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className={styles.buttons}>
          <button className={styles.purchaseButton} onClick={handlePurchase} autoFocus>
            <span className={styles.buttonIcon}>{isLimitError ? '⬆️' : '✦'}</span>
            {isLimitError ? '플랜 업그레이드' : t('credits.purchase', '크레딧 구매하기')}
          </button>
          <button className={styles.laterButton} onClick={onClose}>
            {isLimitError ? '다음 달까지 기다리기' : t('common.later', '나중에')}
          </button>
        </div>

        {/* Close Button */}
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

