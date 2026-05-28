'use client'

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '@/i18n/I18nProvider'
import styles from './CreditDepletedModal.module.css'

interface RewardItem {
  id: string
  amount: number
  source: 'referral' | 'promotion' | 'gift' | string
  createdAt: string
}

interface CreditRewardModalProps {
  isOpen: boolean
  rewards: RewardItem[]
  onClose: () => void
}

/**
 * "+N 크레딧 받았어요" 알림 모달. CreditDepletedModal 의 라이트 디자인 토큰을
 * 재사용 (white card + gold accent + ink text). 추천 보상 등 자동 지급된
 * 보너스를 사용자가 처음 봤을 때 한 번만 노출. 닫으면 acknowledge POST.
 */
export default function CreditRewardModal({ isOpen, rewards, onClose }: CreditRewardModalProps) {
  const { t, locale } = useI18n()
  const [isAnimating, setIsAnimating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen && rewards.length > 0) {
      setIsVisible(true)
      requestAnimationFrame(() => setIsAnimating(true))
    } else {
      setIsAnimating(false)
      const timer = setTimeout(() => setIsVisible(false), 220)
      return () => clearTimeout(timer)
    }
  }, [isOpen, rewards.length])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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

  if (!isVisible || rewards.length === 0) return null

  const isKo = locale === 'ko'
  const totalCredits = rewards.reduce((s, r) => s + r.amount, 0)

  // Source 별 라벨 (다국어).
  const sourceLabel = (source: string) => {
    if (source === 'referral') return isKo ? '친구 추천 보상' : 'Referral bonus'
    if (source === 'promotion') return isKo ? '프로모션' : 'Promotion'
    if (source === 'gift') return isKo ? '선물' : 'Gift'
    return isKo ? '보너스' : 'Bonus'
  }

  const title = isKo
    ? rewards.length === 1
      ? '크레딧을 받았어요!'
      : '크레딧들을 받았어요!'
    : rewards.length === 1
      ? 'You received credits!'
      : 'You received credit rewards!'

  const desc = isKo
    ? '내가 없는 동안 도착한 보너스 크레딧이에요. 바로 사용할 수 있어요.'
    : 'Bonus credits that arrived while you were away. Available right now.'

  return (
    <div
      className={`${styles.overlay} ${isAnimating ? styles.overlayVisible : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-reward-modal-title"
    >
      <div
        className={`${styles.modal} ${isAnimating ? styles.modalVisible : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.iconContainer} aria-hidden="true">
          ✦
        </div>

        <h2 id="credit-reward-modal-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{desc}</p>

        <div className={styles.creditDisplay}>
          <div className={styles.creditIcon} aria-hidden="true">
            ✦
          </div>
          <div className={styles.creditInfo}>
            <span className={styles.creditLabel}>{isKo ? '총 받은 크레딧' : 'Total received'}</span>
            <span className={styles.creditValue}>
              +{totalCredits}
              <span className={styles.creditUnit}>{t('credits.unit', '개')}</span>
            </span>
          </div>
        </div>

        {/* 내역 — 2개 이상일 때만 별도로 나열. 1개면 위 요약으로 충분. */}
        {rewards.length > 1 && (
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: '0 0 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              textAlign: 'left',
            }}
          >
            {rewards.map((r) => (
              <li
                key={r.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: 13,
                  color: '#57534e',
                  padding: '6px 12px',
                  background: '#fafaf9',
                  border: '1px solid #ece4d4',
                  borderRadius: 10,
                }}
              >
                <span>{sourceLabel(r.source)}</span>
                <span style={{ color: '#a07a3c', fontWeight: 600 }}>+{r.amount}</span>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.buttons}>
          <button className={styles.purchaseButton} onClick={onClose} autoFocus>
            {isKo ? '확인' : 'Got it'}
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
