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
}

export interface CalendarData {
  success: boolean
  year: number
  matrixStrictMode?: boolean
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
