/**
 * @file Calendar API types
 * Extracted from route.ts for modularity
 */

import type { EventCategory, ImportanceGrade } from '@/lib/destiny-map/destinyCalendar'
import type { CalendarEvidence } from '@/types/calendar-api'

// Helper type for accessing pillar data with various formats
export interface SajuPillarAccessor {
  heavenlyStem?: { name?: string } | string
  earthlyBranch?: { name?: string } | string
  stem?: { name?: string } | string
  branch?: { name?: string } | string
}

// Formatted response shape
export interface FormattedDate {
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
  summary: string
  /** @internal — engine-side, not emitted in API response */
  timingSignals?: string[]
  /** @internal — engine-side, not emitted in API response */
  bestTimes?: string[]
  sajuFactors: string[]
  astroFactors: string[]
  recommendations: string[]
  warnings: string[]
  evidence?: CalendarEvidence
  /** 본문에 등장한 사주·점성 용어 → 한 줄 풀이 (프런트 툴팁용) */
  glossary?: Record<string, string>
  /** 대운/세운/월운/일운 — 본명 일간 기준 십신까지 박은 풀 흐름 컨텍스트 */
  longCycleContext?: {
    daeun?: { ganji: string; ageStart: number; ageEnd: number; sibsinStem?: string }
    sewoon?: { ganji: string; year: number; sibsinStem?: string }
    wolwoon?: { ganji: string; sibsinStem?: string }
    iljin?: { ganji: string; sibsinStem?: string; sibsinBranch?: string }
  }
  /** 운끼리의 충/합/형 */
  cycleInteractions?: Array<{
    pair: string
    kind: '천간합' | '천간충' | '지지합' | '지지충' | '지지형' | '지지해' | '지지파' | '자형'
    blurb: string
  }>
  /** 운 충합 narrative summary */
  cycleNarrative?: string
  /** 행성시 (요일 룰러) */
  dayRuler?: {
    planet: string
    planetKo: string
    themeKo: string
    themeEn: string
  }
  /**
   * 점수 = (사주축 + 점성축) / 2 — v3 signal-based 분해.
   * axisAgreement: 두 시스템이 같은 방향을 가리키는지 (점수 외 부가 표시).
   */
  scoreBreakdown?: {
    sajuAxis: number
    astroAxis: number
    axisAgreement: 'aligned' | 'mixed' | 'opposed'
    finalScore: number
  }
  /** ── calendar-engine v2 augmentation (optional, non-breaking) ── */
  matchedPatterns?: Array<{
    id: string
    name: string
    themes: string[]
    strength: number
    description?: string
    headline?: string
    action?: string
  }>
  engineSignals?: Array<{
    id: string
    source: 'saju' | 'astro'
    kind: string
    name: string
    korean?: string
    themes: string[]
    polarity: number
    layer: 'decadal' | 'yearly' | 'monthly' | 'daily' | 'hourly' | 'instant'
    weight: number
  }>
  themeScores?: Partial<Record<string, number>>
  /** 그 달 narrative 해석 (룰 DB 기반, LLM 0번) */
  monthlyInterpretation?: {
    narrative: string
    matchedRuleIds: string[]
    sections: Array<{ section: string; title: string; text: string }>
  }
}

export interface CalendarDailyView {
  date: string
  grade: ImportanceGrade
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

export interface CalendarWeekView {
  rangeStart: string
  rangeEnd: string
  frontDomain: string
  frontDomainLabel: string
  oneLineSummary: string
  operatingRule: string
  brightWindow?: string
  cautiousWindow?: string
}

export interface CalendarMonthView {
  month: string
  frontDomain: string
  frontDomainLabel: string
  oneLineSummary: string
  operatingRule: string
  strongestWindow?: string
  cautionWindow?: string
}

// Location coordinates type
export interface LocationCoord {
  lat: number
  lng: number
  tz: string
}
