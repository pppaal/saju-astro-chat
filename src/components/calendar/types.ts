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
  /** 운 충합 흐름을 한 줄로 종합한 narrative */
  cycleNarrative?: string
  /** 그날의 행성 지배 (요일 기반) */
  dayRuler?: {
    planet: string
    planetKo: string
    themeKo: string
    themeEn: string
  }
  /** 점수 산출 7축 분해 + 2축 분리 */
  scoreBreakdown?: {
    engine: number
    matrix: number
    cycle: number
    cross: number
    yongsin: number
    transit?: number
    lunarRetro?: number
    dailyShift: number
    weakPenalty: number
    peakBoost: number
    finalScore: number
    sajuAxis?: number
    astroAxis?: number
    axisAgreement?: 'aligned' | 'mixed' | 'opposed'
  }
  /** 트랜짓 점성 — 선택일 기준 행성 위치 + 본명 차트와의 aspect */
  transit?: {
    aspects: Array<{
      transitPlanet: string
      natalPoint: string
      aspect: string
      orb: number
      isApplying: boolean
    }>
    /** 그날 역행 중인 행성 ('Mercury', 'Venus', 'Mars', …) */
    retrogrades?: string[]
    summary?: string
  }
  /** 시간대별 행성시 + 점수 */
  hourlyTimeSlots?: {
    best: Array<{ hour: number; score: number; reason: string }>
    worst: Array<{ hour: number; score: number; reason: string }>
  }
  /** 본명 사주 강약·격국·용신 컨텍스트 */
  natalContext?: {
    strength: string
    geokguk: string
    yongsin: { primary: string; secondary?: string; type: string; kibsin?: string }
    summary: string
  }
  /** 향후 60일 용신 활성 일자 top 5 */
  yongsinActivations?: {
    yongsin: string
    top: Array<{
      date: string
      score: number
      level: string
      sources: string[]
      advice: string
    }>
  }
  /** 28수 (Lunar Mansion) — 그날의 달 자리 */
  lunarMansion?: {
    name: string
    nameKo: string
    element: string
    animal: string
    isAuspicious: boolean
    goodFor: string[]
    badFor: string[]
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
