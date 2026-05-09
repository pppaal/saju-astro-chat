'use client'

import { useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import type { UserProfile } from '../types'
import { MatchOracleView } from './MatchOracleView'

type CSSStyles = { readonly [key: string]: string }

interface MatchCelebrationModalProps {
  partner: UserProfile
  connectionId: string
  styles: CSSStyles
  onClose: () => void
}

export function MatchCelebrationModal({
  partner,
  connectionId,
  styles,
  onClose,
}: MatchCelebrationModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div
      className={styles.modal}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-celebration-title"
    >
      <motion.div
        className={`${styles.modalContent} ${styles.celebrationContent}`}
        onClick={(e) => e.stopPropagation()}
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <button
          className={styles.modalClose}
          onClick={onClose}
          aria-label="닫기"
          type="button"
        >
          ✕
        </button>

        <motion.header
          className={styles.celebrationHeader}
          initial={{ y: -12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.35 }}
        >
          <h2 className={styles.celebrationTitle} id="match-celebration-title">
            💕 매치 성사!
          </h2>
          <p className={styles.celebrationSubtitle}>
            {partner.name}님과 인연이 닿았습니다.
          </p>
        </motion.header>

        <MatchOracleView
          connectionId={connectionId}
          styles={styles}
          autoReveal={true}
        />

        <div className={styles.celebrationActions}>
          <Link
            href={`/destiny-match/chat/${connectionId}`}
            className={`${styles.modalButton} ${styles.modalLikeButton}`}
            style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}
          >
            💬 메시지 시작하기
          </Link>
          <button type="button" onClick={onClose} className={styles.modalButton}>
            계속 둘러보기
          </button>
        </div>
      </motion.div>
    </div>
  )
}
