/**
 * @file DestinyCalendar constants
 * Extracted from DestinyCalendar.tsx for modularity
 */

import type { EventCategory } from './types'

export const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: '💰',
  career: '💼',
  love: '💕',
  health: '💪',
  travel: '✈️',
  study: '📚',
  general: '⭐',
}

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
export const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Icon constants (avoid hydration mismatch)
export const ICONS = {
  calendar: '📅',
  clock: '🕐',
  globe: '🌍',
  gender: '⚧',
  star: '🌟',
  crystal: '🔮',
  sparkle: '✦',
} as const

export const GRADE_EMOJI: Record<number, string> = {
  0: '🌟',
  1: '✨',
  2: '⭐',
  3: '⚠️',
  4: '☠️',
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
