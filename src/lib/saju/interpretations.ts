// src/lib/Saju/interpretations.ts
// 12운성, 신살, 십성 해석 데이터 및 종합 해석 리포트 생성
// 데이터는 JSON에서 로드하고, 타입 정의와 헬퍼 함수만 유지

import type { FiveElement, SibsinKind } from './types'
import interpretationsData from './data/interpretations.json'

// ============ 12운성 타입 정의 ============

export type TwelveStageType =
  | '장생'
  | '목욕'
  | '관대'
  | '건록'
  | '제왕'
  | '쇠'
  | '병'
  | '사'
  | '묘'
  | '절'
  | '태'
  | '양'

export interface TwelveStageInterpretation {
  name: TwelveStageType
  name_en: string
  hanja: string
  meaning: string
  meaning_en: string
  fortune: '길' | '흉' | '중립'
  fortune_en: 'auspicious' | 'challenging' | 'neutral'
  personality: string
  personality_en: string
  career: string
  career_en: string
  relationship: string
  relationship_en: string
  health: string
  health_en: string
  advice: string
  advice_en: string
}

// ============ 십성 타입 정의 ============

export interface SibsinInterpretation {
  name: SibsinKind
  name_en: string
  hanja: string
  element: string
  element_en: string
  meaning: string
  meaning_en: string
  positive: string
  positive_en: string
  negative: string
  negative_en: string
  career: string
  career_en: string
  relationship: string
  relationship_en: string
}

// ============ 신살 타입 정의 ============

export interface ShinsalInterpretation {
  name: string
  name_en: string
  hanja: string
  category: '길신' | '흉신' | '중립'
  category_en: 'auspicious star' | 'challenging star' | 'neutral star'
  meaning: string
  meaning_en: string
  effect: string
  effect_en: string
  advice: string
  advice_en: string
}

// ============ 오행 타입 정의 ============

export interface ElementInterpretation {
  element: FiveElement
  element_en: string
  hanja: string
  nature: string
  nature_en: string
  personality: string
  personality_en: string
  excess: string
  excess_en: string
  deficiency: string
  deficiency_en: string
  health: string
  health_en: string
  career: string
  career_en: string
}

// ============ JSON에서 데이터 로드 ============

export const TWELVE_STAGE_INTERPRETATIONS = interpretationsData.twelveStages as Record<
  TwelveStageType,
  TwelveStageInterpretation
>
export const SIBSIN_INTERPRETATIONS = interpretationsData.sibsin as Record<
  SibsinKind,
  SibsinInterpretation
>
const SHINSAL_INTERPRETATIONS = interpretationsData.shinsal as Record<
  string,
  ShinsalInterpretation
>
export const ELEMENT_INTERPRETATIONS = interpretationsData.fiveElements as Record<
  FiveElement,
  ElementInterpretation
>

// ============ 종합 해석 헬퍼 함수 ============

/**
 * 12운성 해석 조회
 */
export function getTwelveStageInterpretation(
  stage: TwelveStageType
): TwelveStageInterpretation | null {
  return TWELVE_STAGE_INTERPRETATIONS[stage] || null
}

/**
 * 십성 해석 조회
 */
export function getSibsinInterpretation(sibsin: SibsinKind): SibsinInterpretation | null {
  return SIBSIN_INTERPRETATIONS[sibsin] || null
}

/**
 * 신살 해석 조회
 */
export function getShinsalInterpretation(shinsal: string): ShinsalInterpretation | null {
  return SHINSAL_INTERPRETATIONS[shinsal] || null
}

// 미성년(만 14세 미만) 안전 모드 — 이성·배우자·매력 등 연애성 신살의 풀이를
// 발달 단계에 맞는 표현으로 치환(아동 부적합 방지). meaning+effect 전체를 대체한다.
const MINOR_SAFE_SHINSAL: Record<string, { ko: string; en: string }> = {
  도화: {
    ko: '사람들에게 인기 있는 기질이에요. 예술·표현 분야에 재능이 빛나요.',
    en: 'A likable, popular nature with shining talent in the arts and self-expression.',
  },
  홍염: {
    ko: '밝고 사람을 끄는 에너지가 있어요. 인기가 많은 만큼 가끔 말이 따라올 수 있어요.',
    en: 'Bright, magnetic energy — well-liked, though a little chatter can tag along.',
  },
  홍염살: {
    ko: '밝고 사람을 끄는 에너지가 있어요. 인기가 많은 만큼 가끔 말이 따라올 수 있어요.',
    en: 'Bright, magnetic energy — well-liked, though a little chatter can tag along.',
  },
  금여: {
    ko: '풍요와 좋은 복이 따르는 기운이에요.',
    en: 'A sign of abundance and good fortune.',
  },
  금여성: {
    ko: '편안하고 복이 따르는 기운이에요. 단정한 기품이 있어요.',
    en: 'Ease and good fortune, with a tidy, graceful bearing.',
  },
}

/**
 * 신살 칩·디테일에 노출할 풀이 텍스트. 미성년이면 연애성 신살을 연령 맞춤 문구로
 * 치환하고, 그 외엔 meaning+effect 를 잇는다. (ko/en 짝)
 */
export function shinsalDisplayText(
  interp: ShinsalInterpretation,
  name: string,
  lang: 'ko' | 'en',
  isMinor: boolean
): string {
  if (isMinor && MINOR_SAFE_SHINSAL[name]) return MINOR_SAFE_SHINSAL[name][lang]
  return lang === 'en'
    ? `${interp.meaning_en} ${interp.effect_en}`
    : `${interp.meaning} ${interp.effect}`
}

/**
 * 오행 해석 조회
 */
export function getElementInterpretation(element: FiveElement): ElementInterpretation | null {
  return ELEMENT_INTERPRETATIONS[element] || null
}

/**
 * 12운성 기둥별 요약 생성
 */
export function summarizeTwelveStages(
  stages: { pillar: string; stage: TwelveStageType }[]
): string {
  const summaries = stages.map(({ pillar, stage }) => {
    const interp = TWELVE_STAGE_INTERPRETATIONS[stage]
    const fortune = interp?.fortune === '길' ? '(吉)' : interp?.fortune === '흉' ? '(凶)' : ''
    return `${pillar}: ${stage}${fortune}`
  })
  return summaries.join(' | ')
}

/**
 * 오행 균형 분석
 */
export function analyzeElementBalance(counts: Record<FiveElement, number>): {
  dominant: FiveElement | null
  deficient: FiveElement | null
  balance: '균형' | '편중' | '결핍'
  balance_en: 'balanced' | 'imbalanced' | 'deficient'
  interpretation: string
  interpretation_en: string
} {
  const elements: FiveElement[] = ['목', '화', '토', '금', '수']
  const values = elements.map((e) => counts[e] || 0)
  const max = Math.max(...values)
  const min = Math.min(...values)

  const dominant = max >= 3 ? elements[values.indexOf(max)] : null
  const deficient = min === 0 ? elements[values.indexOf(min)] : null

  let balance: '균형' | '편중' | '결핍'
  let balance_en: 'balanced' | 'imbalanced' | 'deficient'
  let interpretation: string
  let interpretation_en: string

  if (max - min <= 1 && min >= 1) {
    balance = '균형'
    balance_en = 'balanced'
    interpretation = '오행이 고루 분포하여 안정적인 구조입니다.'
    interpretation_en =
      'The five elements are spread evenly — a stable, well-balanced structure.'
  } else if (min === 0) {
    balance = '결핍'
    balance_en = 'deficient'
    const defEl = elements[values.indexOf(min)]
    const defInterp = ELEMENT_INTERPRETATIONS[defEl]
    interpretation = `${defEl}(${defInterp.hanja})이 없어 ${defInterp.deficiency} 경향이 있을 수 있습니다.`
    interpretation_en = `Without ${defInterp.element_en}, you may notice tendencies of ${defInterp.deficiency_en.toLowerCase()}`
  } else {
    balance = '편중'
    balance_en = 'imbalanced'
    const domEl = elements[values.indexOf(max)]
    const domInterp = ELEMENT_INTERPRETATIONS[domEl]
    interpretation = `${domEl}(${domInterp.hanja})이 강하여 ${domInterp.excess} 경향이 있을 수 있습니다.`
    interpretation_en = `With a strong concentration of ${domInterp.element_en}, you may notice tendencies of ${domInterp.excess_en.toLowerCase()}`
  }

  return { dominant, deficient, balance, balance_en, interpretation, interpretation_en }
}
