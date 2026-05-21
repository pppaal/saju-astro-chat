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
  /** 그 달 narrative 해석 (룰 DB 기반, LLM 0번) */
  monthlyInterpretation?: {
    narrative: string
    matchedRuleIds: string[]
    sections: Array<{ section: string; title: string; text: string }>
    themeScores?: Partial<Record<'love' | 'money' | 'career' | 'health' | 'growth', number>>
    /** 테마별 점수 인과 추적 (Why-card) */
    themeBreakdown?: Partial<
      Record<
        'love' | 'money' | 'career' | 'health' | 'growth',
        Array<{ label: string; delta: number; dir: 'up' | 'down' }>
      >
    >
    /** 이번 달 키 이벤트 — 베스트 날 / 강한 구간 / 피할 날 */
    keyEvents?: {
      best?: { date: string; score: number }
      window?: { start: string; end: string; avg: number }
      avoid?: { dates: string[] }
    }
    /** 지난달 대비 — 전체 흐름/테마별 점수 변화 */
    monthComparison?: {
      overallDelta: number
      themes: Array<{
        theme: 'love' | 'money' | 'career' | 'health' | 'growth'
        delta: number
        dir: 'up' | 'down'
      }>
    }
  }
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
