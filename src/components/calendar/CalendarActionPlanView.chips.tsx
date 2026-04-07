'use client'

import React from 'react'

import styles from './DestinyCalendar.module.css'
import type { CalendarActionPlanChipsProps } from './CalendarActionPlanView.sectionTypes'

export function CalendarActionPlanChips(props: CalendarActionPlanChipsProps) {
  const { isKo, bestDayChips, cautionDayChips } = props

  return (
    <div className={styles.actionPlanChips}>
      {bestDayChips.length > 0 && (
        <div className={styles.actionPlanChipGroup}>
          <span className={styles.actionPlanChipLabel}>
            {isKo ? '실행/활용일' : 'Execute/Leverage days'}
          </span>
          {bestDayChips.map((chip) => (
            <span
              key={chip.label}
              className={`${styles.actionPlanChip} ${styles.actionPlanChipGood}`}
            >
              {chip.emoji} {chip.label}
            </span>
          ))}
        </div>
      )}
      {cautionDayChips.length > 0 && (
        <div className={styles.actionPlanChipGroup}>
          <span className={styles.actionPlanChipLabel}>
            {isKo ? '검토/조정일' : 'Review/Adjust days'}
          </span>
          {cautionDayChips.map((chip) => (
            <span
              key={chip.label}
              className={`${styles.actionPlanChip} ${styles.actionPlanChipBad}`}
            >
              {chip.emoji} {chip.label}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
