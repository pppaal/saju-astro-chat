/**
 * @file DestinyCalendar constants
 * Extracted from DestinyCalendar.tsx for modularity
 */

import type { EventCategory } from './types'

export const CATEGORY_EMOJI: Record<EventCategory, string> = {
  wealth: 'W',
  career: 'C',
  love: 'L',
  health: 'H',
  travel: 'T',
  study: 'S',
  general: 'G',
}

export const WEEKDAYS_KO = ['일', '월', '화', '수', '목', '금', '토']
export const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// 이모지 상수 (hydration 불일치 방지)
export const ICONS = {
  calendar: 'CAL',
  clock: 'TIME',
  globe: 'WORLD',
  gender: 'GEN',
  star: 'TOP',
  crystal: 'GUIDE',
  sparkle: '*',
} as const

// Grade markers
export const GRADE_EMOJI: Record<number, string> = {
  0: 'A', // 최고의 날
  1: 'B', // 좋은 날
  2: 'C', // 보통 날
  3: 'D', // 안좋은 날
  4: 'E', // 최악의 날
}

// Category labels
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
