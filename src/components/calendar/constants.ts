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

export const GRADE_EMOJI: Record<number, string> = {
  0: '\u{1F31F}',
  1: '\u2728',
  2: '\u2B50',
  3: '\u26A0\uFE0F',
  4: '\u2620\uFE0F',
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
