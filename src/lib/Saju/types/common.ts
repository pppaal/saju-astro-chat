/**
 * Shared Saju Type Definitions
 * Centralized types to prevent duplication across Saju modules
 *
 * This file consolidates type definitions that were previously duplicated
 * across familyLineage.ts, sajuCache.ts, compatibilityEngine.ts, and other modules.
 */

/**
 * Simple pillar representation with stem and branch
 */
export interface SimplePillar {
  stem: string
  branch: string
}

/**
 * Complete four pillars (year, month, day, hour)
 */
export interface SimpleFourPillars {
  year: SimplePillar
  month: SimplePillar
  day: SimplePillar
  hour: SimplePillar
}

/**
 * Five elements count in Korean
 */
export interface FiveElementsCountKo {
  목: number
  화: number
  토: number
  금: number
  수: number
}

/**
 * Basic Saju analysis result
 */
export interface SajuResult {
  fourPillars: SimpleFourPillars
  dayMaster?: string
  fiveElements?: FiveElementsCountKo
  daeun?: DaeunCycle[]
  shinsal?: string[]
}

/**
 * Heavenly Stem (천간) type
 */
export type HeavenlyStem = '갑' | '을' | '병' | '정' | '무' | '기' | '경' | '신' | '임' | '계'

/**
 * Earthly Branch (지지) type
 */
export type EarthlyBranch =
  | '자'
  | '축'
  | '인'
  | '묘'
  | '진'
  | '사'
  | '오'
  | '미'
  | '신'
  | '유'
  | '술'
  | '해'

/**
 * Five Elements (오행)
 */
export type Element = '목' | '화' | '토' | '금' | '수'

/**
 * Yin-Yang (음양)
 */
export type YinYang = '음' | '양'

/**
 * Fortune level for cycles
 */
export type FortuneLevel = 'excellent' | 'good' | 'neutral' | 'challenging' | 'difficult'

/**
 * Hidden stem info within a branch
 */
export interface HiddenStemInfo {
  stem: HeavenlyStem
  percentage: number
}

/**
 * Pillar with detailed information
 */
export interface DetailedPillar {
  heavenlyStem: HeavenlyStem
  earthlyBranch: EarthlyBranch
  element: Element
  yinYang: YinYang
  hidden?: HiddenStemInfo[]
}

/**
 * Element count summary (legacy - use FiveElementsCountKo)
 */
export interface ElementCount {
  목: number
  화: number
  토: number
  금: number
  수: number
}

/**
 * Compatibility score result
 */
export interface CompatibilityScore {
  overall: number
  harmony: number
  balance: number
  energy: number
  details?: string
}

/**
 * 대운 (10-year cycle) information
 */
export interface DaeunCycle {
  startAge: number
  endAge: number
  heavenlyStem: HeavenlyStem
  earthlyBranch: EarthlyBranch
  element: Element
  fortuneLevel: FortuneLevel
}

/**
 * 세운 (yearly cycle) information
 */
export interface YearlyCycle {
  year: number
  heavenlyStem: HeavenlyStem
  earthlyBranch: EarthlyBranch
  element: Element
  fortuneLevel: FortuneLevel
}
