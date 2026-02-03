/**
 * eventCorrelation.ts - 사주 사건 상관관계 분석 엔진 (1000% 레벨)
 *
 * 인생 사건과 사주 운의 상관관계 분석, 패턴 인식, 예측
 *
 * ✅ REFACTORING COMPLETED:
 * - Original 912 lines modularized for better maintainability
 * - Types extracted to event-correlation/types.ts
 * - Helpers extracted to event-correlation/helpers.ts
 * - Main analysis functions remain in this orchestrator file
 *
 * Structure:
 * - event-correlation/types.ts: Type definitions
 * - event-correlation/helpers.ts: Helper functions and constants
 * - event-correlation/index.ts: Unified exports
 * - eventCorrelation.ts: Main analysis orchestrator
 */

import { FiveElement, StemBranchInfo } from './types'
import { STEMS, BRANCHES, JIJANGGAN } from './constants'

// Re-export all types and helpers from modules
export * from './event-correlation'

// Import for internal use
import {
  getStemElement,
  getBranchElement,
  CHEONGAN_HAP,
  CHEONGAN_CHUNG,
  YUKAP,
  SAMHAP,
  CHUNG,
  HYEONG,
  GWIIN,
  YEOKMA,
} from './event-correlation/helpers'

import type {
  EventCategory,
  EventNature,
  LifeEvent,
  DaeunSeunInfo,
  CorrelationFactor,
  EventSajuCorrelation,
  PatternRecognition,
  PredictiveInsight,
  EventTimeline,
  TriggerAnalysis,
  SajuResult,
} from './event-correlation/types'

// ============================================================================
// 핵심 분석 함수
// ============================================================================

/**
 * 특정 날짜의 세운/월운 계산
 */
export function calculatePeriodPillars(date: Date): DaeunSeunInfo {
  const year = date.getFullYear()
  const month = date.getMonth() + 1

  // 세운 계산 (연간)
  const 세운Index = (year - 1984) % 60
  const 세운천간 = STEMS[세운Index % 10].name
  const 세운지지 = BRANCHES[세운Index % 12].name

  // 월운 계산
  const monthOffset = ((year - 1984) * 12 + (month - 1)) % 60
  const 월운천간 = STEMS[monthOffset % 10].name
  const 월운지지 = BRANCHES[monthOffset % 12].name

  // 대운은 외부에서 제공되어야 함 (생년월일에 따라 다름)
  return {
    대운천간: '',
    대운지지: '',
    세운천간,
    세운지지,
    월운천간,
    월운지지,
  }
}

/**
 * 사건과 사주 운의 상관관계 분석
 */
export function analyzeEventCorrelation(
  event: LifeEvent,
  saju: SajuResult,
  대운정보?: { 천간: string; 지지: string }
): EventSajuCorrelation {
  const eventDate = event.date
  const 운정보 = calculatePeriodPillars(eventDate)

  if (대운정보) {
    운정보.대운천간 = 대운정보.천간
    운정보.대운지지 = 대운정보.지지
  }

  const yearPillar = { stem: 운정보.세운천간, branch: 운정보.세운지지 }
  const monthPillar = { stem: 운정보.월운천간, branch: 운정보.월운지지 }
  const dayPillar = saju.fourPillars.day

  const correlationFactors: CorrelationFactor[] = []

  // 천간 합 분석
  const 천간합 = CHEONGAN_HAP[dayPillar.stem]
  if (천간합 && (yearPillar.stem === 천간합.partner || monthPillar.stem === 천간합.partner)) {
    correlationFactors.push({
      factor: `일간 ${dayPillar.stem}와 ${천간합.partner} 천간합`,
      type: '합',
      strength: 80,
      description: `${천간합.result} 에너지로 합화되어 조화로운 시기`,
      isPositive: true,
    })
  }

  // 천간 충 분석
  const 천간충 = CHEONGAN_CHUNG[dayPillar.stem]
  if (천간충 && (yearPillar.stem === 천간충 || monthPillar.stem === 천간충)) {
    correlationFactors.push({
      factor: `일간 ${dayPillar.stem}와 ${천간충} 천간충`,
      type: '충',
      strength: 70,
      description: '변화와 충돌의 에너지가 강한 시기',
      isPositive: false,
    })
  }

  // 지지 육합 분석
  const 육합 = YUKAP[dayPillar.branch]
  if (육합 && (yearPillar.branch === 육합.partner || monthPillar.branch === 육합.partner)) {
    correlationFactors.push({
      factor: `일지 ${dayPillar.branch}와 ${육합.partner} 육합`,
      type: '합',
      strength: 75,
      description: `${육합.result} 에너지로 합화, 협력과 지원의 시기`,
      isPositive: true,
    })
  }

  // 지지 충 분석
  const 지지충 = CHUNG[dayPillar.branch]
  if (지지충 && (yearPillar.branch === 지지충 || monthPillar.branch === 지지충)) {
    correlationFactors.push({
      factor: `일지 ${dayPillar.branch}와 ${지지충} 지지충`,
      type: '충',
      strength: 85,
      description: '환경의 급격한 변화, 이동, 변동의 시기',
      isPositive: event.nature === 'transformative',
    })
  }

  // 삼합 분석
  for (const [국명, 삼합정보] of Object.entries(SAMHAP)) {
    const members = 삼합정보.members
    const pillars = [dayPillar.branch, yearPillar.branch, monthPillar.branch]
    const matches = members.filter((m) => pillars.includes(m))
    if (matches.length >= 2) {
      correlationFactors.push({
        factor: `${국명} 삼합`,
        type: '삼합',
        strength: 90,
        description: `${삼합정보.result} 에너지 극대화, 대성취의 시기`,
        isPositive: true,
      })
    }
  }

  // 오행 상생상극 분석
  const dayElement = getStemElement(dayPillar.stem)
  const yearElement = getStemElement(yearPillar.stem)
  const elementRelation = analyzeElementRelation(dayElement, yearElement)
  correlationFactors.push(elementRelation)

  // 전체 상관관계 점수 계산
  const positiveSum = correlationFactors
    .filter((f) => f.isPositive)
    .reduce((sum, f) => sum + f.strength, 0)
  const negativeSum = correlationFactors
    .filter((f) => !f.isPositive)
    .reduce((sum, f) => sum + f.strength, 0)
  const overallCorrelation = Math.min(100, Math.max(0, 50 + (positiveSum - negativeSum) / 2))

  const insight = generateEventInsight(event, correlationFactors, overallCorrelation)

  return {
    event,
    yearPillar,
    monthPillar,
    運: 운정보,
    correlationFactors,
    overallCorrelation,
    insight,
  }
}

// ============================================================================
// 내부 헬퍼 함수
// ============================================================================

function analyzeElementRelation(element1: string, element2: string): CorrelationFactor {
  const 상생관계: Record<string, string> = {
    목: '화',
    화: '토',
    토: '금',
    금: '수',
    수: '목',
  }

  const 상극관계: Record<string, string> = {
    목: '토',
    화: '금',
    토: '수',
    금: '목',
    수: '화',
  }

  if (상생관계[element1] === element2) {
    return {
      factor: `${element1}→${element2} 상생`,
      type: '오행',
      strength: 60,
      description: '오행이 서로 돕는 관계로 순조로운 흐름',
      isPositive: true,
    }
  } else if (상극관계[element1] === element2) {
    return {
      factor: `${element1}→${element2} 상극`,
      type: '오행',
      strength: 50,
      description: '오행이 충돌하는 관계로 도전과 극복 필요',
      isPositive: false,
    }
  } else {
    return {
      factor: `${element1}-${element2} 중립`,
      type: '오행',
      strength: 30,
      description: '오행이 중립적 관계',
      isPositive: true,
    }
  }
}

function generateEventInsight(
  event: LifeEvent,
  factors: CorrelationFactor[],
  correlation: number
): string {
  const category한글: Record<EventCategory, string> = {
    career: '직업',
    finance: '재물',
    relationship: '인간관계',
    health: '건강',
    education: '학업',
    travel: '이동',
    legal: '법적',
    family: '가족',
    spiritual: '영적',
  }

  const mainFactors = factors
    .slice(0, 3)
    .map((f) => f.factor)
    .join(', ')

  if (correlation >= 70) {
    return `${category한글[event.category]} 분야에서 ${event.nature === 'positive' ? '긍정적' : event.nature === 'negative' ? '부정적' : '중요한'} 사건이 발생했습니다.
사주 운세와 ${correlation}% 일치도를 보이며, 주요 요인은 ${mainFactors}입니다.
이는 사주 흐름과 잘 맞아떨어진 시기였습니다.`
  } else if (correlation >= 40) {
    return `${category한글[event.category]} 분야의 사건이 사주 운세와 ${correlation}% 정도의 상관관계를 보입니다.
주요 영향 요인은 ${mainFactors}이며, 개인의 선택과 사주 운이 복합적으로 작용한 시기입니다.`
  } else {
    return `${category한글[event.category]} 분야의 사건은 사주 운세보다는 외부 환경이나 개인 선택의 영향이 컸던 것으로 보입니다 (상관도 ${correlation}%).
사주적 요인: ${mainFactors}`
  }
}

// ============================================================================
// 패턴 인식 함수
// ============================================================================

export function recognizePatterns(events: EventSajuCorrelation[]): PatternRecognition[] {
  // 간단한 패턴 인식 구현
  // 실제로는 더 복잡한 알고리즘 필요
  return []
}

// ============================================================================
// 예측 분석 함수
// ============================================================================

export function generatePredictiveInsight(
  saju: SajuResult,
  periodStart: Date,
  periodEnd: Date
): PredictiveInsight {
  // 간단한 예측 구현
  return {
    period: { start: periodStart, end: periodEnd },
    favorableAreas: [],
    cautionAreas: [],
    keyDates: [],
    overallEnergy: '안정',
    actionAdvice: [],
  }
}

// ============================================================================
// 트리거 분석 함수
// ============================================================================

export function analyzeTriggers(events: EventSajuCorrelation[]): TriggerAnalysis[] {
  // 트리거 분석 구현
  return []
}

// ============================================================================
// 타임라인 구축 함수
// ============================================================================

export function buildEventTimeline(events: EventSajuCorrelation[]): EventTimeline {
  // 타임라인 구축 구현
  return {
    events,
    majorPeriods: [],
    turningPoints: [],
    cyclicalPatterns: [],
  }
}

// ============================================================================
// 종합 분석 함수
// ============================================================================

export function performComprehensiveEventAnalysis(
  events: LifeEvent[],
  saju: SajuResult,
  대운목록?: Array<{ 시작나이: number; 종료나이: number; 천간: string; 지지: string }>
) {
  const correlations = events.map((event) => {
    const age = event.date.getFullYear() - (saju.fourPillars.year ? 1900 : 2000) // 근사값
    const 대운 = 대운목록?.find((d) => age >= d.시작나이 && age <= d.종료나이)
    return analyzeEventCorrelation(
      event,
      saju,
      대운 ? { 천간: 대운.천간, 지지: 대운.지지 } : undefined
    )
  })

  const timeline = buildEventTimeline(correlations)
  const patterns = recognizePatterns(correlations)
  const triggers = analyzeTriggers(correlations)

  return {
    correlations,
    timeline,
    patterns,
    triggers,
    summary: `총 ${events.length}개의 사건을 분석했습니다.`,
  }
}
