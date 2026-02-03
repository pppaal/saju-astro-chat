// src/lib/Saju/event-correlation/types.ts
// 사주 사건 상관관계 분석 타입 정의

// ============================================================================
// 기본 타입
// ============================================================================

export interface SimplePillar {
  stem: string
  branch: string
}

export interface SimpleFourPillars {
  year: SimplePillar
  month: SimplePillar
  day: SimplePillar
  hour: SimplePillar
}

export interface SajuResult {
  fourPillars: SimpleFourPillars
  dayMaster?: string
  [key: string]: unknown
}

// ============================================================================
// 이벤트 타입
// ============================================================================

export type EventCategory =
  | 'career' // 직업/사업
  | 'finance' // 재물/투자
  | 'relationship' // 인간관계/결혼
  | 'health' // 건강
  | 'education' // 학업/시험
  | 'travel' // 이동/이사
  | 'legal' // 법적/계약
  | 'family' // 가족
  | 'spiritual' // 영적/심리

export type EventNature = 'positive' | 'negative' | 'neutral' | 'transformative'

export interface LifeEvent {
  id: string
  date: Date
  category: EventCategory
  nature: EventNature
  description: string
  significance: number // 1-10
  outcome?: string
}

// ============================================================================
// 상관관계 분석 타입
// ============================================================================

export interface DaeunSeunInfo {
  대운천간: string
  대운지지: string
  세운천간: string
  세운지지: string
  월운천간: string
  월운지지: string
}

export interface CorrelationFactor {
  factor: string
  type: '합' | '충' | '형' | '파' | '해' | '원진' | '삼합' | '방합' | '귀인' | '신살' | '오행'
  strength: number // 0-100
  description: string
  isPositive: boolean
}

export interface EventSajuCorrelation {
  event: LifeEvent
  yearPillar: { stem: string; branch: string }
  monthPillar: { stem: string; branch: string }
  運: DaeunSeunInfo
  correlationFactors: CorrelationFactor[]
  overallCorrelation: number // 0-100
  insight: string
}

// ============================================================================
// 패턴 인식 타입
// ============================================================================

export interface PatternRecognition {
  pattern: string
  events: LifeEvent[]
  astronomicalTrigger: string
  frequency: string
  nextPotentialDate?: Date
  recommendation: string
}

// ============================================================================
// 예측 분석 타입
// ============================================================================

export interface PredictiveInsight {
  period: { start: Date; end: Date }
  favorableAreas: EventCategory[]
  cautionAreas: EventCategory[]
  keyDates: { date: Date; significance: string }[]
  overallEnergy: string
  actionAdvice: string[]
}

// ============================================================================
// 타임라인 타입
// ============================================================================

export interface EventTimeline {
  events: EventSajuCorrelation[]
  majorPeriods: { start: Date; end: Date; theme: string }[]
  turningPoints: Date[]
  cyclicalPatterns: PatternRecognition[]
}

// ============================================================================
// 트리거 분석 타입
// ============================================================================

export interface TriggerAnalysis {
  trigger: string
  triggerType: '천간' | '지지' | '복합'
  activatedBy: string
  resultingEnergy: string
  historicalOccurrences: Date[]
  futureOccurrences: Date[]
}
