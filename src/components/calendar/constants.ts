/**
 * @file DestinyCalendar constants
 * Extracted from DestinyCalendar.tsx for modularity
 */

import type { EventCategory } from './types'

export const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: '\u{1F4B0}',
  career: '\u{1F4BC}',
  love: '\u{1F495}',
  health: '\u{1F4AA}',
  travel: '\u2708\uFE0F',
  study: '\u{1F4DA}',
  general: '\u2B50',
}

export const WEEKDAYS_KO = ['\uC77C', '\uC6D4', '\uD654', '\uC218', '\uBAA9', '\uAE08', '\uD1A0']
export const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const ICONS = {
  calendar: '\u{1F4C5}',
  clock: '\u{1F550}',
  globe: '\u{1F30D}',
  gender: '\u26A7',
  star: '\u{1F31F}',
  crystal: '\u{1F52E}',
  sparkle: '\u2726',
} as const

// Calendar 5-tier grade scale (0=best, 4=most cautious)
//   0: \uD83C\uDF1F peak        \u2014 highest fortune day
//   1: \u2728 excellent    \u2014 very favorable
//   2: \uD83C\uDF3F normal       \u2014 neutral / average
//   3: \u26A0\uFE0F caution      \u2014 be careful
//   4: \uD83D\uDEE1\uFE0F hold steady  \u2014 protective / restraint
// Never use alarming symbols (\u2620\uFE0F/\uD83D\uDC80) for fortune content.
export const GRADE_EMOJI: Record<number, string> = {
  0: '\u{1F31F}',
  1: '\u2728',
  2: '\u{1F33F}',
  3: '\u26A0\uFE0F',
  4: '\u{1F6E1}\uFE0F',
}

// Single source of truth for grade labels \u2014 used by DayCell, MonthHighlights,
// CalendarMainView. Add a new entry here whenever you add a tier; do NOT
// hardcode labels at call sites or they will drift apart.
export type CalendarLocale = 'ko' | 'en'

export interface GradeLabel {
  emoji: string  // emoji-only (for badge icon slot)
  short: string  // 2-3 chars (for badge label slot)
  full: string   // 'emoji + phrase' (for tooltips, day cards, headings)
}

const GRADE_LABELS: Record<CalendarLocale, Record<0 | 1 | 2 | 3 | 4, GradeLabel>> = {
  ko: {
    0: { emoji: '\uD83C\uDF1F', short: '\uCD5C\uACE0', full: '\uD83C\uDF1F \uCD5C\uACE0\uC758 \uB0A0' },
    1: { emoji: '\u2728', short: '\uC544\uC8FC \uC88B\uC74C', full: '\u2728 \uC544\uC8FC \uC88B\uC740 \uB0A0' },
    2: { emoji: '\uD83C\uDF3F', short: '\uD3C9\uBC94', full: '\uD83C\uDF3F \uD3C9\uBC94\uD55C \uB0A0' },
    3: { emoji: '\u26A0\uFE0F', short: '\uC870\uC2EC', full: '\u26A0 \uC870\uC2EC\uD558\uB294 \uB0A0' },
    4: { emoji: '\uD83D\uDEE1', short: '\uC9C0\uD0A4\uAE30', full: '\uD83D\uDEE1 \uC2E0\uC911\uD558\uAC8C \uC9C0\uD0A4\uB294 \uB0A0' },
  },
  en: {
    0: { emoji: '\uD83C\uDF1F', short: 'Peak', full: '\uD83C\uDF1F Peak day' },
    1: { emoji: '\u2728', short: 'Excellent', full: '\u2728 Excellent day' },
    2: { emoji: '\uD83C\uDF3F', short: 'Normal', full: '\uD83C\uDF3F Normal day' },
    3: { emoji: '\u26A0\uFE0F', short: 'Caution', full: '\u26A0 Caution' },
    4: { emoji: '\uD83D\uDEE1', short: 'Hold', full: '\uD83D\uDEE1 Hold steady' },
  },
}

function getGradeLabel(grade: number, locale: CalendarLocale): GradeLabel {
  const clamped = Math.min(Math.max(grade, 0), 4) as 0 | 1 | 2 | 3 | 4
  return GRADE_LABELS[locale][clamped]
}

export const CATEGORY_LABELS_KO: Record<EventCategory, string> = {
  wealth: '재물',
  career: '직장',
  love: '연애',
  health: '건강',
  travel: '여행',
  study: '학업',
  general: '전체',
}

export const CATEGORY_LABELS_EN: Record<EventCategory, string> = {
  wealth: 'Wealth',
  career: 'Career',
  love: 'Love',
  health: 'Health',
  travel: 'Travel',
  study: 'Study',
  general: 'General',
}
