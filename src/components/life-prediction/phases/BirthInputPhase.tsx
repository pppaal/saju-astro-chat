/**
 * BirthInputPhase Component
 *
 * First phase: Collect birth information from user.
 */

'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { BirthInfoForm } from '@/components/life-prediction/BirthInfoForm'
import { LoginHint } from '../components/LoginHint'
import { pageTransitionVariants } from '@/components/life-prediction/animations/cardAnimations'
import styles from '../life-prediction.module.css'

interface BirthInputPhaseProps {
  /** Locale for text */
  locale: 'ko' | 'en'
  /** Session status */
  status: 'authenticated' | 'loading' | 'unauthenticated'
  /** Sign-in URL */
  signInUrl: string
  /** Submit handler */
  onSubmit: (birthInfo: {
    birthDate: string
    birthTime: string
    gender: 'M' | 'F'
    birthCity?: string
  }) => Promise<void>
}

/**
 * Birth input phase component
 *
 * @example
 * ```tsx
 * <BirthInputPhase
 *   locale="ko"
 *   status="unauthenticated"
 *   signInUrl="/auth/signin"
 *   onSubmit={handleBirthInfoSubmit}
 * />
 * ```
 */
export const BirthInputPhase = React.memo<BirthInputPhaseProps>(
  ({ locale, status, signInUrl, onSubmit }) => {
    const handleSubmit = async (birthInfo: {
      birthDate: string
      birthTime: string
      gender: 'M' | 'F' | 'Male' | 'Female'
      birthCity?: string
    }): Promise<void> => {
      // Normalize gender to short format
      const normalizedGender =
        birthInfo.gender === 'Male' ? 'M' : birthInfo.gender === 'Female' ? 'F' : birthInfo.gender
      await onSubmit({
        ...birthInfo,
        gender: normalizedGender,
      })
    }

    return (
      <motion.div
        key="birth-input"
        variants={pageTransitionVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className={styles.phaseContainer}
      >
        <div className={styles.pageHeader}>
          <h1 className={styles.pageTitle}>
            🔮 {locale === 'ko' ? '인생 예측' : 'Life Prediction'}
          </h1>
          <p className={styles.pageSubtitle}>
            {locale === 'ko'
              ? '과거와 미래의 최적 시기를 알려드립니다'
              : 'Find the optimal timing for your life events'}
          </p>
        </div>

        <BirthInfoForm onSubmit={handleSubmit} locale={locale} />

        {status === 'unauthenticated' && <LoginHint signInUrl={signInUrl} locale={locale} />}
      </motion.div>
    )
  }
)

BirthInputPhase.displayName = 'BirthInputPhase'
