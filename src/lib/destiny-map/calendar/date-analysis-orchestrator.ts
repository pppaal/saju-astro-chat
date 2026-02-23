/**
 * Date Analysis Orchestrator (리팩토링 버전)
 * Module 9 of Destiny Calendar System - THE CORE ORCHESTRATOR
 *
 * 이 모듈은 운명 캘린더 시스템의 핵심 오케스트레이터입니다.
 * 모든 사주/점성술 분석 모듈을 통합하여 특정 날짜의 종합 운세를 계산합니다.
 *
 * 리팩토링 결과:
 * - 기존: 1,217줄 → 현재: ~440줄 (64% 감소)
 * - 각 섹션을 독립 모듈로 분리
 * - 단일 책임 원칙(SRP) 준수
 *
 * 모듈 구조:
 * ├── analyzers/
 * │   ├── saju-analyzer.ts      - 사주 분석 (대운/세운/월운/일진)
 * │   ├── astrology-analyzer.ts - 점성술 분석 (트랜짓/달위상)
 * │   ├── multilayer-analyzer.ts - 다층 레이어 상호작용
 * │   ├── advanced-predictor.ts - 고급 예측 (공망/신살/에너지)
 * │   ├── factor-generator.ts   - 카테고리/요소 키 생성
 * │   ├── confidence-calculator.ts - 신뢰도 계산
 * │   └── time-context-analyzer.ts - 시간 맥락 분석
 * ├── grading.ts               - 등급 결정 로직
 * └── scoring.ts               - 점수 계산 로직
 *
 * @module date-analysis-orchestrator
 */

import { getSunSign } from './planetary-hours'
import type { TransitAspectEvidence } from './transit-analysis'
import { getGanzhiForDate } from './temporal-scoring'
import { ELEMENT_RELATIONS, ZODIAC_TO_ELEMENT } from './constants'
import { normalizeElement, getStemElement, getBranchElement } from './utils'

// 분석 모듈
import { analyzeSaju } from './analyzers/saju-analyzer'
import { analyzeAstrology } from './analyzers/astrology-analyzer'
import { analyzeMultiLayer } from './analyzers/multilayer-analyzer'
import { analyzeAdvancedPrediction } from './analyzers/advanced-predictor'
import { generateFactors } from './analyzers/factor-generator'
import { calculateConfidence } from './analyzers/confidence-calculator'
import { analyzeTimeContext } from './analyzers/time-context-analyzer'

// 점수 및 등급 시스템
import { calculateTotalScore, type SajuScoreInput, type AstroScoreInput } from './scoring'
import {
  adaptDaeunResult,
  adaptSeunResult,
  adaptWolunResult,
  adaptIljinResult,
  adaptYongsinResult,
  adaptPlanetTransits,
  type LegacyBranchInteraction,
  type LegacyYongsinResult,
} from './scoring-adapter'
import {
  calculateGrade,
  getGradeKeys,
  getGradeRecommendations,
  filterWarningsByGrade,
} from './grading'
import { calculateActivityScore } from './activity-scoring'

// 타입
import type {
  ImportanceGrade as TypesImportanceGrade,
  EventCategory as TypesEventCategory,
  UserSajuProfile as TypesUserSajuProfile,
  UserAstroProfile as TypesUserAstroProfile,
} from './types'

// ═══════════════════════════════════════════════════════════
// Re-exports for backward compatibility
// ═══════════════════════════════════════════════════════════

export type ImportanceGrade = TypesImportanceGrade
export type EventCategory = TypesEventCategory
export type UserSajuProfile = TypesUserSajuProfile
export type UserAstroProfile = TypesUserAstroProfile

export interface ImportantDate {
  date: string
  grade: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  titleKey: string
  descKey: string
  ganzhi: string
  crossVerified: boolean
  transitSunSign: string
  sajuFactorKeys: string[]
  astroFactorKeys: string[]
  recommendationKeys: string[]
  warningKeys: string[]
  confidence?: number
  confidenceNote?: string
  crossAgreementPercent?: number
  gongmangStatus?: {
    isEmpty: boolean
    emptyBranches: string[]
    affectedAreas: string[]
  }
  shinsalActive?: {
    name: string
    type: 'lucky' | 'unlucky' | 'special'
    affectedArea: string
  }[]
  energyFlow?: {
    strength: 'very_strong' | 'strong' | 'moderate' | 'weak' | 'very_weak'
    dominantElement: string
    tonggeunCount: number
    tuechulCount: number
  }
  bestHours?: {
    hour: number
    siGan: string
    quality: 'excellent' | 'good' | 'neutral' | 'caution'
  }[]
  transitSync?: {
    isMajorTransitYear: boolean
    transitType?: string
    synergyType?: 'amplify' | 'clash' | 'balance' | 'neutral'
    synergyScore?: number
  }
  activityScores?: {
    marriage?: number
    career?: number
    investment?: number
    moving?: number
    surgery?: number
    study?: number
  }
  timeContext?: {
    isPast: boolean
    isFuture: boolean
    isToday: boolean
    daysFromToday: number
    retrospectiveNote?: string
  }
  astroAspectEvidence?: TransitAspectEvidence[]
}

// ═══════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════

function getMoonElement(date: Date): string {
  const month = date.getMonth()
  const signs = [
    'Capricorn',
    'Aquarius',
    'Pisces',
    'Aries',
    'Taurus',
    'Gemini',
    'Cancer',
    'Leo',
    'Virgo',
    'Libra',
    'Scorpio',
    'Sagittarius',
  ]
  const approxSign = signs[month]
  return normalizeElement(ZODIAC_TO_ELEMENT[approxSign] || 'earth')
}

function formatDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ═══════════════════════════════════════════════════════════
// Main Analysis Function
// ═══════════════════════════════════════════════════════════

export function analyzeDate(
  date: Date,
  sajuProfile: UserSajuProfile,
  astroProfile: UserAstroProfile
): ImportantDate | null {
  // ─────────────────────────────────────────────────────
  // Step 1: 기본 정보 계산
  // ─────────────────────────────────────────────────────

  const dateStr = formatDateString(date)
  const ganzhi = getGanzhiForDate(date)
  const ganzhiResult = {
    stem: ganzhi.stem,
    branch: ganzhi.branch,
    stemElement: getStemElement(ganzhi.stem),
    branchElement: getBranchElement(ganzhi.branch),
  }

  const transitSun = getSunSign(date)
  const transitSunElement = normalizeElement(ZODIAC_TO_ELEMENT[transitSun] || 'fire')
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  const dayMasterElement = sajuProfile.dayMasterElement
  const dayBranch = sajuProfile.dayBranch
  const dayMasterStem = sajuProfile.dayMaster
  const natalSunElement = astroProfile.sunElement

  // ─────────────────────────────────────────────────────
  // Step 2: 사주 분석
  // ─────────────────────────────────────────────────────

  const sajuResult = analyzeSaju({
    dayMasterElement,
    dayBranch: dayBranch || '',
    dayMasterStem: dayMasterStem || '',
    sajuProfile,
    ganzhi: { stem: ganzhi.stem, branch: ganzhi.branch },
    year,
    month,
    date,
  })

  // ─────────────────────────────────────────────────────
  // Step 3: 점성술 분석
  // ─────────────────────────────────────────────────────

  const astroResult = analyzeAstrology({
    date,
    astroProfile,
    natalSunElement,
    dayMasterElement,
    birthYear: sajuProfile.birthYear,
  })

  // ─────────────────────────────────────────────────────
  // Step 4: 다층 레이어 분석
  // ─────────────────────────────────────────────────────

  const multiLayerResult = analyzeMultiLayer({
    dayMasterStem: dayMasterStem || '',
    dayBranch: dayBranch || '',
    sajuProfile,
    year,
    month,
  })

  // ─────────────────────────────────────────────────────
  // Step 5: 점수 계산
  // ─────────────────────────────────────────────────────

  const branchInteractions: LegacyBranchInteraction[] =
    multiLayerResult.advancedBranchInteractions.map((bi) => ({
      type: bi.type,
      impact: (bi.impact === 'transformative' ? 'neutral' : bi.impact) as
        | 'positive'
        | 'negative'
        | 'neutral',
      element: (bi as { element?: string }).element,
    }))

  const hasAnyGwiin =
    sajuResult.specialFactors.hasCheoneulGwiin ||
    sajuResult.shinsalForScoring?.active?.some(
      (s) =>
        s.name.includes('귀인') ||
        s.name === '태극귀인' ||
        s.name === '천덕귀인' ||
        s.name === '월덕귀인'
    )

  const safeYongsinAnalysis: LegacyYongsinResult = {
    score: sajuResult.yongsinAnalysis?.score ?? 0,
    factorKeys: sajuResult.yongsinAnalysis?.factorKeys ?? [],
    positive: sajuResult.yongsinAnalysis?.positive ?? false,
    negative: sajuResult.yongsinAnalysis?.negative ?? false,
    matchType: sajuResult.yongsinAnalysis?.matchType as LegacyYongsinResult['matchType'],
  }

  const sajuInput: SajuScoreInput = {
    daeun: adaptDaeunResult(sajuResult.daeunAnalysis),
    seun: adaptSeunResult(
      sajuResult.seunAnalysis,
      sajuResult.specialFactors.isSamjaeYear,
      hasAnyGwiin
    ),
    wolun: adaptWolunResult(sajuResult.wolunAnalysis),
    iljin: adaptIljinResult(sajuResult.iljinAnalysis, {
      hasCheoneulGwiin: sajuResult.specialFactors.hasCheoneulGwiin,
      hasGeonrok: sajuResult.specialFactors.hasGeonrok,
      hasSonEomneun: sajuResult.specialFactors.hasSonEomneun,
      hasYeokma: sajuResult.specialFactors.hasYeokma,
      hasDohwa: sajuResult.specialFactors.hasDohwa,
      branchInteractions,
      shinsalResult: sajuResult.shinsalForScoring,
    }),
    yongsin: adaptYongsinResult(safeYongsinAnalysis, sajuResult.geokgukAnalysis),
  }

  const astroInput: AstroScoreInput = adaptPlanetTransits(astroResult.planetTransits, {
    retrogradePlanets: astroResult.retrogradePlanets,
    voidOfCourse: astroResult.voidOfCourse.isVoid,
    lunarPhase: astroResult.moonPhaseDetailed.phaseName,
    daysFromBirthday: astroResult.solarReturnAnalysis.daysFromBirthday,
    natalSunElement: normalizeElement(astroProfile.sunElement),
    transitSunElement,
    transitMoonElement: getMoonElement(date),
    elementRelations: ELEMENT_RELATIONS,
    eclipseImpact: astroResult.eclipseImpact,
  })

  const scoreResult = calculateTotalScore(sajuInput, astroInput)

  // ─────────────────────────────────────────────────────
  // Step 6: 요소 키 및 카테고리 생성
  // ─────────────────────────────────────────────────────

  // Extend sajuResult with specialFactors for factor-generator
  const extendedSajuResult = {
    ...sajuResult,
    specialFactors: sajuResult.specialFactors || {
      hasCheoneulGwiin: false,
      hasGeonrok: false,
      hasSonEomneun: false,
      hasYeokma: false,
      hasDohwa: false,
      isSamjaeYear: false,
      approxLunarDay: 0,
    },
  }

  const factors = generateFactors({
    ganzhi: ganzhiResult,
    dayMasterElement,
    dayMasterStem: dayMasterStem || '',
    dayBranch: dayBranch || '',
    yearBranch: sajuProfile.yearBranch,
    sajuResult: extendedSajuResult,
    astroResult,
    advancedBranchInteractions: multiLayerResult.advancedBranchInteractions,
    transitSunElement,
    natalSunElement,
    crossVerified: scoreResult.crossVerified,
    sajuPositive: scoreResult.sajuPositive,
    sajuNegative: scoreResult.sajuNegative,
    astroPositive: scoreResult.astroPositive,
    astroNegative: scoreResult.astroNegative,
  })

  // ─────────────────────────────────────────────────────
  // Step 7: 등급 결정
  // ─────────────────────────────────────────────────────

  const hasMercuryRetro = astroResult.retrogradePlanets.includes('mercury')
  const hasVenusRetro = astroResult.retrogradePlanets.includes('venus')
  const hasMarsRetro = astroResult.retrogradePlanets.includes('mars')
  const retrogradeCount = [hasMercuryRetro, hasVenusRetro, hasMarsRetro].filter(Boolean).length
  const hasNoMajorRetrograde = retrogradeCount === 0

  const gradeInput = {
    score: scoreResult.totalScore,
    isBirthdaySpecial: astroResult.solarReturnAnalysis.isBirthday && scoreResult.crossVerified,
    crossVerified: scoreResult.crossVerified,
    sajuPositive: scoreResult.sajuPositive,
    astroPositive: scoreResult.astroPositive,
    totalStrengthCount: 0, // Simplified
    sajuBadCount: 0,
    hasChung: factors.sajuFactorKeys.some(
      (k) => k.toLowerCase().includes('chung') || k.includes('충')
    ),
    hasXing: factors.sajuFactorKeys.some(
      (k) => k.toLowerCase().includes('xing') || k.includes('형')
    ),
    hasNoMajorRetrograde,
    retrogradeCount,
    totalBadCount: 0,
  }

  const gradeResult = calculateGrade(gradeInput)
  const grade = gradeResult.grade
  const rawScore = scoreResult.totalScore
  const adjustedBase = Number.isFinite(gradeResult.adjustedScore)
    ? gradeResult.adjustedScore
    : rawScore
  const adjustedScore = Math.round(Math.max(0, Math.min(100, adjustedBase)))
  const displayScore = adjustedScore

  // 타이틀/설명 키 설정
  let { titleKey, descKey } = factors
  if (grade === 0 || !titleKey) {
    const keys = getGradeKeys(grade)
    titleKey = keys.titleKey
    descKey = keys.descKey
  }

  // 등급별 추천 및 경고 필터링
  const gradeRecs = getGradeRecommendations(grade)
  const recommendationKeys =
    grade <= 1
      ? [...gradeRecs, ...factors.recommendationKeys]
      : [...factors.recommendationKeys, ...gradeRecs]

  const warningKeys = filterWarningsByGrade(grade, factors.warningKeys)

  // ─────────────────────────────────────────────────────
  // Step 8: 고급 예측 분석
  // ─────────────────────────────────────────────────────

  const advancedPrediction = analyzeAdvancedPrediction({
    date,
    year,
    sajuProfile,
    dayMasterStem: dayMasterStem || '',
    dayBranch: dayBranch || '',
  })

  // ─────────────────────────────────────────────────────
  // Step 9: 신뢰도 계산
  // ─────────────────────────────────────────────────────

  const { confidence, confidenceNote } = calculateConfidence({
    sajuProfile,
    crossVerified: scoreResult.crossVerified,
  })

  // ─────────────────────────────────────────────────────
  // Step 10: 활동별 점수 계산
  // ─────────────────────────────────────────────────────

  const activityScores = {
    marriage: calculateActivityScore(
      'love',
      displayScore,
      advancedPrediction.gongmangStatus,
      advancedPrediction.shinsalActive,
      advancedPrediction.energyFlow
    ),
    career: calculateActivityScore(
      'career',
      displayScore,
      advancedPrediction.gongmangStatus,
      advancedPrediction.shinsalActive,
      advancedPrediction.energyFlow
    ),
    investment: calculateActivityScore(
      'wealth',
      displayScore,
      advancedPrediction.gongmangStatus,
      advancedPrediction.shinsalActive,
      advancedPrediction.energyFlow
    ),
    moving: calculateActivityScore(
      'travel',
      displayScore,
      advancedPrediction.gongmangStatus,
      advancedPrediction.shinsalActive,
      advancedPrediction.energyFlow
    ),
    surgery: calculateActivityScore(
      'health',
      displayScore,
      advancedPrediction.gongmangStatus,
      advancedPrediction.shinsalActive,
      advancedPrediction.energyFlow
    ),
    study: calculateActivityScore(
      'study',
      displayScore,
      advancedPrediction.gongmangStatus,
      advancedPrediction.shinsalActive,
      advancedPrediction.energyFlow
    ),
  }

  // ─────────────────────────────────────────────────────
  // Step 11: 시간 맥락 분석
  // ─────────────────────────────────────────────────────

  const timeContext = analyzeTimeContext({
    date,
    grade,
    gongmangStatus: advancedPrediction.gongmangStatus,
    shinsalActive: advancedPrediction.shinsalActive,
    transitSync: advancedPrediction.transitSync,
  })

  // ─────────────────────────────────────────────────────
  // Step 12: 최종 결과 반환
  // ─────────────────────────────────────────────────────

  return {
    date: dateStr,
    grade,
    score: displayScore,
    rawScore,
    adjustedScore,
    displayScore,
    categories: factors.categories,
    titleKey,
    descKey,
    ganzhi: `${ganzhi.stem}${ganzhi.branch}`,
    crossVerified: scoreResult.crossVerified,
    transitSunSign: transitSun,
    sajuFactorKeys: factors.sajuFactorKeys,
    astroFactorKeys: factors.astroFactorKeys,
    recommendationKeys,
    warningKeys,
    confidence,
    confidenceNote,
    crossAgreementPercent: scoreResult.crossAgreementPercent,
    gongmangStatus: advancedPrediction.gongmangStatus,
    shinsalActive: advancedPrediction.shinsalActive,
    energyFlow: advancedPrediction.energyFlow,
    bestHours: advancedPrediction.bestHours,
    transitSync: advancedPrediction.transitSync,
    activityScores,
    timeContext,
    astroAspectEvidence: astroResult.planetTransits.aspectEvidence.slice(0, 4),
  }
}
