/**
 * Matrix Analyzer - Main Integration
 * Destiny Fusion Matrix™ 통합 분석
 */

import type { SajuData, AstroData } from '../../types'
import type {
  MatrixAnalysisResult,
  FullMatrixAnalysisResult,
  LoveMatrixResult,
  CareerMatrixResult,
  TimingOverlayResult,
  RelationAspectResult,
  AdvancedAnalysisResult,
  ExtraPointResult,
} from './types'

// Layer modules
import { analyzeElementFusion, getElementFusionDescription } from './elementFusion'
import { analyzeSibsinPlanetFusion, getSibsinPlanetDescription } from './sibsinPlanetFusion'
import { analyzeTimingOverlay } from './timingOverlay'
import { analyzeRelationAspect } from './relationAspect'
import { analyzeLifeCycle, getLifeCycleDescription } from './lifeCycle'
import { analyzeAdvanced } from './advancedAnalysis'
import { analyzeExtraPoint } from './extraPoint'
import { analyzeSibsinHouseFusion } from './sibsinHouseFusion'
import { analyzeAsteroidHouse } from './asteroidHouse'

// Specialized analyzers
import { calculateSynergy, getFusionSummary } from './synergy'
import { analyzeLoveMatrix } from './loveAnalyzer'
import { analyzeCareerMatrix } from './careerAnalyzer'

/**
 * Main Matrix Analysis Function
 * Analyzes Layers 1, 2, and 6 with synergy calculation
 */
export function getMatrixAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): MatrixAnalysisResult | null {
  if (!saju && !astro) {
    return null
  }

  // Layer 1: 오행-서양원소 융합
  const elementFusions = analyzeElementFusion(saju, astro)

  // Layer 2: 십신-행성 융합
  const sibsinPlanetFusions = analyzeSibsinPlanetFusion(saju)

  // Layer 6: 12운성-하우스 생명력
  const lifeCycles = analyzeLifeCycle(saju, astro, lang)

  // 시너지 종합
  const allFusions = [
    ...elementFusions.map((f) => f.fusion),
    ...sibsinPlanetFusions.map((f) => f.fusion),
    ...lifeCycles.map((f) => f.fusion),
  ]

  const synergy = calculateSynergy(allFusions, lang)
  const fusionSummary = getFusionSummary(allFusions)

  return {
    elementFusions,
    sibsinPlanetFusions,
    lifeCycles,
    synergy,
    fusionSummary,
  }
}

/**
 * Full Matrix Analysis Function
 * Includes all 10 layers plus specialized analyses
 */
export function getFullMatrixAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): FullMatrixAnalysisResult | null {
  // Get base analysis
  const baseResult = getMatrixAnalysis(saju, astro, lang)
  if (!baseResult) {
    return null
  }

  // Layer 4: 타이밍 오버레이
  const timingOverlays = analyzeTimingOverlay(saju, lang)

  // Layer 5: 관계-애스펙트
  const relationAspects = analyzeRelationAspect(saju, astro, lang)

  // Layer 7: 고급분석 (격국 × 프로그레션)
  const advancedAnalysis = analyzeAdvanced(saju, astro, lang)

  // Layer 10: 엑스트라포인트
  const extraPoints = analyzeExtraPoint(saju, astro, lang)
  const sibsinHouseFusions = analyzeSibsinHouseFusion(saju)
  const asteroidHouseFusions = analyzeAsteroidHouse(astro, undefined, lang)

  return {
    ...baseResult,
    timingOverlays,
    relationAspects,
    advancedAnalysis,
    extraPoints,
    sibsinHouseFusions,
    asteroidHouseFusions,
  }
}

/**
 * Love Matrix Analysis
 */
export function getLoveMatrixAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): LoveMatrixResult | null {
  return analyzeLoveMatrix(saju, astro, lang)
}

/**
 * Career Matrix Analysis
 */
export function getCareerMatrixAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): CareerMatrixResult | null {
  return analyzeCareerMatrix(saju, astro, lang)
}

/**
 * Timing Overlay Analysis
 */
export function getTimingOverlayAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): TimingOverlayResult[] {
  return analyzeTimingOverlay(saju, lang)
}

/**
 * Relation-Aspect Analysis
 */
export function getRelationAspectAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): RelationAspectResult[] {
  return analyzeRelationAspect(saju, astro, lang)
}

/**
 * Advanced Analysis
 */
export function getAdvancedAnalysisResult(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): AdvancedAnalysisResult[] {
  return analyzeAdvanced(saju, astro, lang)
}

/**
 * Extra Point Analysis
 */
export function getExtraPointAnalysis(
  saju: SajuData | undefined,
  astro: AstroData | undefined,
  lang: string
): ExtraPointResult[] {
  return analyzeExtraPoint(saju, astro, lang)
}

// Re-export types
export * from './types'

// Re-export description functions
export { getElementFusionDescription, getSibsinPlanetDescription, getLifeCycleDescription }
