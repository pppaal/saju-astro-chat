// src/app/api/saju/services/utilities.ts
// Saju API utility functions

import { STEMS } from '@/lib/saju/constants'
import { TWELVE_STAGE_INTERPRETATIONS, type TwelveStageType } from '@/lib/saju/interpretations'
import type { FiveElement, YinYang } from '@/lib/saju/types'

// Five Element conversion
const FIVE_ELEMENT_KEYS: FiveElement[] = ['목', '화', '토', '금', '수']

export const isFiveElement = (value: string): value is FiveElement =>
  FIVE_ELEMENT_KEYS.includes(value as FiveElement)

export const isTwelveStageType = (value: string): value is TwelveStageType =>
  Object.prototype.hasOwnProperty.call(TWELVE_STAGE_INTERPRETATIONS, value)

export const asFiveElement = (e: string): FiveElement => {
  switch (e) {
    case '목':
    case 'wood':
    case '木':
      return '목'
    case '화':
    case 'fire':
    case '火':
      return '화'
    case '토':
    case 'earth':
    case '土':
      return '토'
    case '금':
    case 'metal':
    case '金':
      return '금'
    case '수':
    case 'water':
    case '水':
      return '수'
    default:
      return '토'
  }
}

export const withYY = (src: { name: string; element: string; sibsin?: string }) => {
  const stem = STEMS.find((s) => s.name === src.name)
  const yy = (stem ? stem.yin_yang : '양') as YinYang
  return {
    name: src.name,
    element: asFiveElement(src.element),
    yin_yang: yy,
    sibsin: src.sibsin ?? '',
  }
}

export const toBranch = (src: { name: string; element: string; sibsin?: string }) => ({
  name: src.name,
  element: asFiveElement(src.element),
  yin_yang: '양' as YinYang,
  sibsin: src.sibsin ?? '',
})

// Lucky shinsal helpers
const LUCKY_ORDER = [
  '도화',
  '화개',
  '현침',
  '귀문관',
  '천을귀인',
  '태극귀인',
  '역마',
  '금여성',
  '천문성',
  '문창',
  '문곡',
]
const LUCKY_SET = new Set(LUCKY_ORDER)

const sortLucky = (names: string[]) =>
  names.sort((a, b) => LUCKY_ORDER.indexOf(a) - LUCKY_ORDER.indexOf(b))

export const pickLucky = (
  items: { kind: string; pillars: string[] }[],
  pillar: 'time' | 'day' | 'month' | 'year'
) =>
  sortLucky(
    Array.from(
      new Set(
        items
          .filter((h) => h.pillars.includes(pillar))
          .map((h) => h.kind)
          .filter((k) => LUCKY_SET.has(k))
      )
    )
  )
