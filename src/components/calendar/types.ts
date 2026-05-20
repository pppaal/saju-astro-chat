/**
 * @file DestinyCalendar types and interfaces
 * Extracted from DestinyCalendar.tsx for modularity
 */

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

export interface ImportantDate {
  date: string
  grade: ImportanceGrade
  displayGrade?: ImportanceGrade
  score: number
  displayScore?: number
  categories: EventCategory[]
  title: string
  description: string
  summary?: string
  sajuFactors: string[]
  astroFactors: string[]
  recommendations: string[]
  warnings: string[]
  evidence?: CalendarEvidence
  /** 본명 사주 (date-detail 통해 주입). 행동플래너 시간 십신 계산용 */
  natalSaju?: {
    dayStem: string
    dayBranch: string
    yearBranch: string
    monthStem: string
    monthBranch: string
  }
  /** 활성 신살 (역마/도화/화개 등) */
  shinsalActive?: { name: string; type: string; affectedArea: string }[]
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
  /**
   * v3 점수 = (사주축 + 점성축) / 2 — WeeklyTimingChart의 사주/점성 라인이
   * 그대로 finalScore를 만든다 (그래프 ≡ 점수).
   * axisAgreement: 두 시스템 합치도 (점수 외 부가 표시).
   */
  scoreBreakdown?: {
    sajuAxis: number
    astroAxis: number
    axisAgreement: 'aligned' | 'mixed' | 'opposed'
    finalScore: number
  }
  /** 본명 사주 강약·격국·용신 컨텍스트 */
  natalContext?: {
    strength: string
    geokguk: string
    yongsin: { primary: string; secondary?: string; type: string; kibsin?: string }
    summary: string
  }
  /** ── calendar-engine v2 augmentation (optional, non-breaking) ── */
  /** 매칭된 명명 패턴 — "재물 황금주간" 등 */
  matchedPatterns?: Array<{
    id: string
    name: string
    themes: string[]
    strength: number
    description?: string
    headline?: string
    action?: string
  }>
  /** 활성 신호 다발 — 사주·점성 모든 추출기 결과 */
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
  /** 테마별 점수 (0~100) */
  themeScores?: Partial<Record<string, number>>
  /** 그 달 narrative 해석 (룰 DB 기반) */
  monthlyInterpretation?: {
    narrative: string
    matchedRuleIds: string[]
    sections: Array<{ section: string; title: string; text: string }>
    themeScores?: Partial<Record<'love' | 'money' | 'career' | 'health' | 'growth', number>>
    themeBreakdown?: Partial<
      Record<
        'love' | 'money' | 'career' | 'health' | 'growth',
        Array<{ label: string; delta: number; dir: 'up' | 'down' }>
      >
    >
  }
  /** 그 날 60갑자(일진) + 본명 일간 십신 개인화 한 줄 (API 가 일별 부착) */
  dailyGanjiNarrative?: string
}

export interface CalendarData {
  success: boolean
  year: number
  matrixContract?: {
    coreHash?: string
    overallPhase?: string
    overallPhaseLabel?: string
    topClaimId?: string
    topClaim?: string
    focusDomain?: string
  }
  allDates?: ImportantDate[]
  /**
   * 본명 점성 정체성 — 헤더 뱃지 / 프로필 카드용.
   * sunSign은 항상 있음. ascendant/moon은 풀 차트 입력 시에만.
   */
  astroIdentity?: {
    sunSign: string
    ascendantSign?: string
    moonSign?: string
  }
  /**
   * 오늘 하루의 시간대별 best/worst (24시간 정밀 분석).
   * 다른 날짜의 시간 분석은 /api/calendar/date-detail 엔드포인트에서 별도 계산.
   */
  todayHourlyTimeSlots?: {
    best: Array<{ hour: number; score: number; reason: string }>
    worst: Array<{ hour: number; score: number; reason: string }>
  }
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
  calendarMonthView?: {
    month: string
    frontDomain: string
    frontDomainLabel: string
    oneLineSummary: string
    operatingRule: string
    strongestWindow?: string
    cautionWindow?: string
  }
  monthSummary?: {
    month: string
    summary: string
  }
  relationshipWeather?: {
    grade: 'strong' | 'good' | 'neutral' | 'caution'
    summary: string
  }
  workMoneyWeather?: {
    grade: 'strong' | 'good' | 'neutral' | 'caution'
    summary: string
  }
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
