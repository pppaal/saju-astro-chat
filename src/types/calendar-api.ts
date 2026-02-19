/**
 * Calendar API Types
 * Type definitions for the /api/calendar endpoint
 */

import type {
  EventCategory,
  ImportanceGrade,
  ImportantDate,
} from '@/lib/destiny-map/destinyCalendar'

// ============ Request Types ============

export interface CalendarApiRequest {
  birthDate: string // YYYY-MM-DD
  birthTime: string // HH:mm
  gender: 'male' | 'female'
  calendarType: 'solar' | 'lunar'
  timezone: string // e.g., "Asia/Seoul"
  isLeapMonth?: boolean
  year?: number // Target year for calendar
  locale?: string // "ko" | "en"
}

// ============ Response Types ============

export interface CalendarApiResponse {
  success: boolean
  data: {
    year: number
    dates: ImportantDate[]
    summary: CalendarSummary
  }
  meta: {
    birthDate: string
    birthTime: string
    timezone: string
    calculatedAt: string
  }
}

export interface CalendarSummary {
  totalDates: number
  byCategory: Record<EventCategory, number>
  byGrade: Record<ImportanceGrade, number>
  highlights: ImportantDate[]
}

// ============ Internal Types ============

export interface TranslationData {
  [key: string]: string | TranslationData
}

export interface SajuFactorTranslation {
  ko: string
  en: string
}

export interface AstroFactorTranslation {
  ko: string
  en: string
}

// Saju analysis factors
export type SajuFactorKey =
  | 'stemBijeon'
  | 'stemInseong'
  | 'stemJaeseong'
  | 'stemSiksang'
  | 'stemGwansal'
  | 'branchSamhap'
  | 'branchSamhapNegative'
  | 'branchYukhap'
  | 'branchChung'
  | 'branchXing'
  | 'branchHai'
  | 'cheoneulGwiin'
  | 'hiddenStemSupport'
  | 'hiddenStemConflict'
  | 'sonEomneunDay'
  | 'geonrokDay'
  | 'samjaeYear'
  | 'yeokmaDay'
  | 'dohwaDay'

// Astro analysis factors
export type AstroFactorKey =
  | 'sameElement'
  | 'supportElement'
  | 'givingElement'
  | 'controlElement'
  | 'controlledElement'
  | 'moonPhaseNew'
  | 'moonPhaseFull'
  | 'sunSign'
  | 'moonSign'

// Combined factor types
export interface CalendarFactors {
  saju: SajuFactorKey[]
  astro: AstroFactorKey[]
  combined: string[]
}

// Date score calculation
export interface DateScore {
  overall: number // 0-100
  love: number
  career: number
  wealth: number
  health: number
  grade: ImportanceGrade
}

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
  }
  confidence: number
  source: CalendarEvidenceSource
}

// Cached calculation result
export interface CachedCalendarResult {
  dates: ImportantDate[]
  calculatedAt: number
  expiresAt: number
}
