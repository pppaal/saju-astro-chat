'use client'

import React from 'react'
import styles from './DestinyCalendar.module.css'
import { CATEGORY_EMOJI } from './constants'
import { getPeakLabel } from './peakUtils'
import type { CalendarActionPlanHeaderProps } from './CalendarActionPlanView.sectionTypes'

export function CalendarActionPlanHeader(props: CalendarActionPlanHeaderProps) {
  const {
    isKo,
    formatDateLabel,
    baseDate,
    baseInfo,
    resolvedPeakLevel,
    categoryLabel,
    commitDate,
    inputDateValue,
    rangeDays,
    setRangeDays,
    handleShare,
    handlePrint,
    shareMessage,
  } = props

  return (
    <div className={styles.actionPlanHeader}>
      <div>
        <p className={styles.actionPlanTitle}>{isKo ? '행동 플랜' : 'Action Plan'}</p>
        <p className={styles.actionPlanSubtitle}>
          {isKo ? '기준 날짜' : 'Base date'}: {formatDateLabel(baseDate)}
        </p>
      </div>
      {baseInfo?.categories?.length ? (
        <div className={styles.actionPlanMeta}>
          {resolvedPeakLevel && (
            <span className={styles.actionPlanMetaItem}>
              {isKo ? getPeakLabel(resolvedPeakLevel, 'ko') : getPeakLabel(resolvedPeakLevel, 'en')}
            </span>
          )}
          {baseInfo.categories.slice(0, 2).map((cat) => (
            <span key={cat} className={styles.actionPlanMetaItem}>
              {CATEGORY_EMOJI[cat]} {categoryLabel(cat)}
            </span>
          ))}
        </div>
      ) : (
        <span className={styles.actionPlanMetaItem}>
          {isKo ? '선택된 날짜 정보 없음' : 'No date info selected'}
        </span>
      )}
      <div className={styles.actionPlanControls}>
        <div className={styles.actionPlanDateControls}>
          <button
            type="button"
            className={styles.actionPlanNavBtn}
            onClick={() => {
              const nextDate = new Date(baseDate)
              nextDate.setDate(nextDate.getDate() - 1)
              commitDate(nextDate)
            }}
            aria-label={isKo ? '이전 날' : 'Previous day'}
          >
            ‹
          </button>
          <input
            type="date"
            className={styles.actionPlanDateInput}
            value={inputDateValue}
            onChange={(event) => {
              const value = event.target.value
              if (!value) return
              const [y, m, d] = value.split('-').map((part) => Number(part))
              if (!y || !m || !d) return
              const nextDate = new Date(y, m - 1, d)
              if (Number.isNaN(nextDate.getTime())) return
              commitDate(nextDate)
            }}
          />
          <button
            type="button"
            className={styles.actionPlanNavBtn}
            onClick={() => {
              const nextDate = new Date(baseDate)
              nextDate.setDate(nextDate.getDate() + 1)
              commitDate(nextDate)
            }}
            aria-label={isKo ? '다음 날' : 'Next day'}
          >
            ›
          </button>
          <button
            type="button"
            className={styles.actionPlanTodayBtn}
            onClick={() => commitDate(new Date())}
          >
            {isKo ? '오늘' : 'Today'}
          </button>
        </div>
        <div className={styles.actionPlanActions}>
          <div className={styles.actionPlanRange}>
            <button
              type="button"
              className={`${styles.actionPlanRangeBtn} ${rangeDays === 7 ? styles.actionPlanRangeBtnActive : ''}`}
              aria-pressed={rangeDays === 7}
              onClick={() => setRangeDays(7)}
            >
              {isKo ? '7일' : '7 days'}
            </button>
            <button
              type="button"
              className={`${styles.actionPlanRangeBtn} ${rangeDays === 14 ? styles.actionPlanRangeBtnActive : ''}`}
              aria-pressed={rangeDays === 14}
              onClick={() => setRangeDays(14)}
            >
              {isKo ? '14일' : '14 days'}
            </button>
          </div>
          <button
            type="button"
            className={styles.actionPlanShareBtn}
            onClick={handleShare}
            aria-label={isKo ? '행동 플랜 공유' : 'Copy action plan'}
          >
            {isKo ? '공유' : 'Share'}
          </button>
          <button
            type="button"
            className={styles.actionPlanPrintBtn}
            onClick={handlePrint}
            aria-label={isKo ? 'PDF 저장' : 'Save as PDF'}
          >
            PDF
          </button>
          {shareMessage && (
            <span className={styles.actionPlanStatus} role="status" aria-live="polite">
              {shareMessage}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
