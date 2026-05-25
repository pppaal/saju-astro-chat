/**
 * @file Calendar API types
 * Extracted from route.ts for modularity
 */

import type { EventCategory, ImportanceGrade } from '@/lib/destiny-map/destinyCalendar'
import type { CalendarEvidence } from '@/types/calendar-api'
// monthlyInterpretation 모양의 단일 정의(SSOT) — 엔진이 정본, API/UI 가 재사용.
import type { Interpretation as CalendarInterpretation } from '@/lib/calendar-engine/interpretation/types'

/** 캘린더 분야(라이프 영역) 키 — 사주×점성 교차 도메인. (구 destiny-matrix/types에서 이전) */
export type DomainKey = 'career' | 'love' | 'money' | 'health' | 'move'

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
  displayGrade?: ImportanceGrade
  score: number
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
  /** 그 달 narrative 해석 (룰 DB 기반, LLM 0번) — 엔진 Interpretation 단일 정의 재사용 */
  monthlyInterpretation?: CalendarInterpretation
  /**
   * 해당 날의 60갑자(일진) 한 줄 narrative — `getGanjiTransitNarrative` 출처.
   * "오늘은 [archetype] 의 에너지가 흐르는 하루예요." 형식. 매일 다른 ganji 라
   * 5/6 월 동일 텍스트 같은 문제는 layer='daily' 에서도 자연스럽게 분기.
   */
  dailyGanjiNarrative?: string
  /** 일진 scope 룰 결과 — "오늘 한 줄" 액션 (최대 4) */
  dailyActions?: string[]
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
