/**
 * @file DestinyCalendar utility functions
 * Extracted from DestinyCalendar.tsx for modularity
 */

import styles from './DestinyCalendar.module.css'
import type { EventCategory } from './types'
import { GRADE_EMOJI, CATEGORY_LABELS_KO, CATEGORY_LABELS_EN } from './constants'
import { DISPLAY_SCORE_LABEL_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'

/**
 * YYYY-MM-DD 문자열을 로컬 타임존 Date로 파싱
 * new Date("2025-12-31")은 UTC로 파싱되어 타임존에 따라 전날로 계산될 수 있음
 */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Get grade emoji
 */
export function getGradeEmoji(grade: number): string {
  return GRADE_EMOJI[grade] || '⭐'
}

/**
 * Get category label based on locale
 */
export function getCategoryLabel(cat: EventCategory, locale: string): string {
  if (locale === 'ko') {
    return CATEGORY_LABELS_KO[cat] || cat
  }
  return CATEGORY_LABELS_EN[cat] || cat
}

/**
 * Get score CSS class
 */
export function getScoreClass(score: number): string {
  if (score >= DISPLAY_SCORE_LABEL_THRESHOLDS.good) {
    return styles.high
  }
  if (score >= DISPLAY_SCORE_LABEL_THRESHOLDS.neutral) {
    return styles.medium
  }
  return styles.low
}
