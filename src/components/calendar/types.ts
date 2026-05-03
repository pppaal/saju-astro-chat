/**
 * @file DestinyCalendar types and interfaces
 * Extracted from DestinyCalendar.tsx for modularity
 */

import type { CounselorEvidencePacket } from '@/lib/destiny-matrix/counselorEvidence'
import type { CalendarCoreAdapterResult } from '@/lib/destiny-matrix/core/adapters'

export type EventCategory = 'wealth' | 'career' | 'love' | 'health' | 'travel' | 'study' | 'general'
export type ImportanceGrade = 0 | 1 | 2 | 3 | 4
export type CityHit = { name: string; country: string; lat: number; lon: number; timezone?: string }
export type CalendarEvidenceSource = 'rule' | 'rag' | 'hybrid'

export interface CalendarEvidence {
  matrix: {
    domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
    finalScoreAdjusted: number
    overlapStrength: number
    peakLevel: 'peak' | 'high' | 'normal'
    monthKey: string
  }
  cross: {
    sajuEvidence: string
    astroEvidence: string
    sajuDetails?: string[]
    astroDetails?: string[]
    bridges?: string[]
  }
  confidence: number
  crossAgreementPercent?: number
  source: CalendarEvidenceSource
  matrixVerdict?: {
    focusDomain: string
    verdict: string
    guardrail: string
    topClaim?: string
    topAnchorSummary?: string
    phase?: string
    attackPercent?: number
    defensePercent?: number
  }
}

export type MatrixEvidencePacketMap = Record<string, CounselorEvidencePacket>

export interface ImportantDate {
  date: string
  grade: ImportanceGrade
  originalGrade?: ImportanceGrade
  displayGrade?: ImportanceGrade
  score: number
  rawScore?: number
  adjustedScore?: number
  displayScore?: number
  categories: EventCategory[]
  title: string
  description: string
  summary?: string
  actionSummary?: string
  timingSignals?: string[]
  bestTimes?: string[]
  sajuFactors: string[]
  astroFactors: string[]
  recommendations: string[]
  warnings: string[]
  evidence?: CalendarEvidence
  // 신규 분석 데이터 (확장)
  ganzhi?: string // 일주 간지
  transitSunSign?: string // 트랜짓 태양 별자리
  crossVerified?: boolean // 사주+점성술 교차 검증
  /** 본문에 등장한 사주·점성 용어 → 한 줄 풀이 */
  glossary?: Record<string, string>
  /** 사주 ↔ 점성 교차 확인 */
  crossCheck?: { line: string; agreementPercent: number }
  /** 본명 사주 (date-detail 통해 주입). 행동플래너 시간 십신 계산용 */
  natalSaju?: {
    dayStem: string
    dayBranch: string
    yearBranch: string
    monthStem: string
    monthBranch: string
  }
  /** 그 날의 공망 지지 — 시지가 여기 들어가면 공망 시간 */
  gongmangBranches?: string[]
  /** 활성 신살 (역마/도화/화개 등) */
  shinsalActive?: { name: string; type: string; affectedArea: string }[]
  /** 그 날 카테고리별 활동 점수 (0-100) */
  activityScores?: {
    marriage?: number
    career?: number
    investment?: number
    moving?: number
    surgery?: number
    study?: number
  }
  /** 대운/세운/월운/일운 — 본명 일간 기준 십신까지 박은 풀 흐름 컨텍스트 */
  longCycleContext?: {
    daeun?: { ganji: string; ageStart: number; ageEnd: number; sibsinStem?: string }
    sewoon?: { ganji: string; year: number; sibsinStem?: string }
    wolwoon?: { ganji: string; sibsinStem?: string }
    iljin?: { ganji: string; sibsinStem?: string; sibsinBranch?: string }
  }
  /** 대운/세운/월운/일운/본명 끼리 충/합/형 */
  cycleInteractions?: Array<{
    pair: string
    kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지해' | '지지파' | '자형'
    blurb: string
  }>
  /** 트랜짓 점성 — 선택일 기준 행성 위치 + 본명 차트와의 aspect */
  transit?: {
    aspects: Array<{
      transitPlanet: string
      natalPoint: string
      aspect: string
      orb: number
      isApplying: boolean
    }>
    summary?: string
  }
}

export interface CalendarData {
  success: boolean
  year: number
  matrixStrictMode?: boolean
  matrixInputMode?: 'full-chart' | 'lite'
  degradedMode?: {
    active: boolean
    level: 'full-engine' | 'engine-degraded' | 'fallback-lite'
    reasons: string[]
    labels: string[]
  }
  canonicalCore?: CalendarCoreAdapterResult
  matrixContract?: {
    coreHash?: string
    overallPhase?: string
    overallPhaseLabel?: string
    topClaimId?: string
    topClaim?: string
    focusDomain?: string
  }
  summary?: {
    total: number
    grade0: number // 최고의 날 (~5%)
    grade1: number // 좋은 날 (~15%)
    grade2: number // 보통 날 (~50%)
    grade3: number // 안좋은 날 (~25%)
    grade4: number // 최악의 날 (~5%)
  }
  topDates?: ImportantDate[]
  goodDates?: ImportantDate[]
  cautionDates?: ImportantDate[]
  allDates?: ImportantDate[]
  calendarDailyView?: {
    date: string
    grade: number
    label: string
    frontDomain: string
    frontDomainLabel: string
    watchDomain?: string
    watchDomainLabel?: string
    oneLineSummary: string
    doNow: string
    watchOut: string
    bestTimes: string[]
    reliability: string
    confidence?: number
    reasonShort?: string
  }
  calendarWeekView?: {
    rangeStart: string
    rangeEnd: string
    frontDomain: string
    frontDomainLabel: string
    oneLineSummary: string
    operatingRule: string
    brightWindow?: string
    cautiousWindow?: string
  }
  calendarMonthView?: {
    month: string
    frontDomain: string
    frontDomainLabel: string
    oneLineSummary: string
    operatingRule: string
    strongestWindow?: string
    cautionWindow?: string
  }
  daySummary?: {
    date: string
    summary: string
    focusDomain: string
    reliability: string
  }
  weekSummary?: {
    rangeStart: string
    rangeEnd: string
    summary: string
  }
  monthSummary?: {
    month: string
    summary: string
  }
  surfaceCards?: Array<{
    key: 'action' | 'risk' | 'window' | 'agreement' | 'branch'
    label: string
    summary: string
    tag?: string
    details?: string[]
    visual?:
      | {
          kind: 'agreement'
          agreementPercent: number
          contradictionPercent: number
          leadLagState: 'structure-ahead' | 'trigger-ahead' | 'balanced'
        }
      | {
          kind: 'branch'
          rows: Array<{ label: string; text: string }>
        }
  }>
  topDomains?: Array<{
    domain: 'career' | 'love' | 'money' | 'health' | 'move' | 'general'
    label: string
    score: number
  }>
  timingSignals?: string[]
  cautions?: string[]
  recommendedActions?: string[]
  relationshipWeather?: {
    grade: 'strong' | 'good' | 'neutral' | 'caution'
    summary: string
  }
  workMoneyWeather?: {
    grade: 'strong' | 'good' | 'neutral' | 'caution'
    summary: string
  }
  matrixEvidencePackets?: MatrixEvidencePacketMap
  error?: string
}

export interface BirthInfo {
  birthDate: string
  birthTime: string
  birthPlace: string
  gender: 'Male' | 'Female'
  latitude?: number
  longitude?: number
  timezone?: string
}

export interface CachedCalendarData {
  version: string
  timestamp: number
  birthInfo: BirthInfo
  year: number
  category: string
  data: CalendarData
}
