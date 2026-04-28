'use client'

import React from 'react'
import CrossAugmentCard from './CrossAugmentCard'
import { useAugmentFetch, type AugmentScope } from './useAugmentFetch'
import styles from './CrossAugmentCard.module.css'
import type { BirthInfo } from './types'

interface AugmentSectionProps {
  birthInfo: BirthInfo
  scope: AugmentScope
  year?: number
  month?: number // 1-12
  queryDate?: string // ISO
  weekStart?: string // ISO
  scopeLabel?: string
  /** 'compact' = smaller variant for daily card under SelectedDatePanel */
  variant?: 'default' | 'compact'
  /** Hide entirely on idle (no birthInfo lat/lng) */
  hideOnIdle?: boolean
}

/**
 * Skeleton + error + ready 상태를 모두 처리하는 wrapper.
 * 캘린더 페이지에서 월/일 augment 모두 이 컴포넌트로 통일.
 */
export default function AugmentSection({
  birthInfo,
  scope,
  year,
  month,
  queryDate,
  weekStart,
  scopeLabel,
  variant = 'default',
  hideOnIdle = true,
}: AugmentSectionProps) {
  const state = useAugmentFetch({ birth: birthInfo, scope, year, month, queryDate, weekStart })

  if (state.phase === 'idle') {
    return hideOnIdle ? null : null
  }

  if (state.phase === 'loading') {
    return (
      <div className={`${styles.skeleton} ${variant === 'compact' ? styles.compact : ''}`} aria-busy="true" aria-label="운세 데이터 불러오는 중">
        <div className={`${styles.skelLine} ${styles.skelTitle}`} />
        <div className={`${styles.skelLine} ${styles.skelTheme}`} />
        <div className={styles.skelGrid}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className={styles.skelCard} />)}
        </div>
      </div>
    )
  }

  if (state.phase === 'error') {
    return (
      <div className={styles.errorCard} role="alert">
        <span className={styles.errorIcon}>!</span>
        <span className={styles.errorBody}>
          큰 흐름 데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.
        </span>
      </div>
    )
  }

  return (
    <div className={variant === 'compact' ? styles.compact : ''}>
      <CrossAugmentCard
        augment={state.data}
        scope={scope === 'monthly' ? 'monthly' : scope === 'weekly' ? 'weekly' : 'daily'}
        scopeLabel={scopeLabel}
      />
    </div>
  )
}
