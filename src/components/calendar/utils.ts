/**
 * @file DestinyCalendar utility functions
 * Extracted from DestinyCalendar.tsx for modularity
 */

import styles from './DestinyCalendar.module.css'
import type { EventCategory, ImportantDate } from './types'
import { GRADE_EMOJI, CATEGORY_LABELS_KO, CATEGORY_LABELS_EN } from './constants'
import { DISPLAY_SCORE_LABEL_THRESHOLDS } from '@/lib/destiny-map/calendar/scoring-config'

/**
 * Extract city part from input string
 */
export function extractCityPart(input: string): string {
  const s = String(input || '').trim()
  const idx = s.indexOf(',')
  return (idx >= 0 ? s.slice(0, idx) : s).trim()
}

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

/**
 * Get day CSS class name
 */
export function getDayClassName(
  date: Date | null,
  selectedDay: Date | null,
  dateInfo: ImportantDate | null
): string {
  if (!date) {
    return styles.emptyDay
  }

  const today = new Date()
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()

  const isSelected =
    selectedDay &&
    date.getDate() === selectedDay.getDate() &&
    date.getMonth() === selectedDay.getMonth() &&
    date.getFullYear() === selectedDay.getFullYear()

  let className = styles.day
  if (isToday) {
    className += ` ${styles.today}`
  }
  if (isSelected) {
    className += ` ${styles.selected}`
  }
  if (dateInfo) {
    className += ` ${styles[`dayGrade${dateInfo.grade}`]}`
  }
  if (date.getDay() === 0) {
    className += ` ${styles.sunday}`
  }
  if (date.getDay() === 6) {
    className += ` ${styles.saturday}`
  }

  return className
}

/**
 * Generate month days array for calendar grid
 */
export function generateMonthDays(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const daysInMonth = lastDay.getDate()
  const startWeekday = firstDay.getDay()

  const days: (Date | null)[] = []

  // 이전 달 빈 칸
  for (let i = 0; i < startWeekday; i++) {
    days.push(null)
  }

  // 현재 달 일자
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(new Date(year, month, day))
  }

  return days
}
