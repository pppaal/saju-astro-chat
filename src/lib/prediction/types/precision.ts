/**
 * Precision Engine Types
 * Extracted from precisionEngine.ts for better organization
 */

import type { FiveElement } from '../timingScore'

/** 절기 (24절기) */
export interface SolarTerm {
  name: string
  nameKo: string
  date: Date
  longitude: number // 태양 황경
  month: number // 절기월 (1-12)
  element: FiveElement
  energy: 'yang' | 'yin'
  seasonPhase: 'early' | 'mid' | 'late'
}

/** 음력 정보 */
export interface LunarInfo {
  year: number
  month: number
  day: number
  isLeapMonth: boolean
  lunarPhase: LunarPhase
  mansion: LunarMansion // 28수
}

/** 달 위상 (8단계) */
export type LunarPhase =
  | 'new_moon' // 삭
  | 'waxing_crescent' // 초승
  | 'first_quarter' // 상현
  | 'waxing_gibbous' // 상현망
  | 'full_moon' // 망
  | 'waning_gibbous' // 하현망
  | 'last_quarter' // 하현
  | 'waning_crescent' // 그믐

/** 28수 (Lunar Mansions) */
export interface LunarMansion {
  index: number // 1-28
  name: string // 角, 亢, 氐, ...
  nameKo: string
  element: FiveElement
  animal: string // 교룡, 용, 담비, ...
  isAuspicious: boolean
  goodFor: string[]
  badFor: string[]
}

/** 행성시 (Planetary Hours) */
export interface PlanetaryHour {
  hour: number // 0-23
  startTime: Date
  endTime: Date
  planet: 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn'
  element: FiveElement
  isDay: boolean
  quality: 'excellent' | 'good' | 'neutral' | 'caution' | 'avoid'
  goodFor: string[]
}

/** 진행법 결과 */
export interface ProgressionResult {
  secondaryProgression: {
    sun: { sign: string; degree: number; house: number }
    moon: { sign: string; degree: number; house: number; phase: string }
    mercury: { sign: string; degree: number }
    venus: { sign: string; degree: number }
    mars: { sign: string; degree: number }
  }
  solarArc: {
    arcDegree: number
    progressedAsc: { sign: string; degree: number }
    progressedMc: { sign: string; degree: number }
  }
  profection: {
    year: number
    house: number
    ruler: string
    theme: string
  }
  interpretation: string
}

/** 과거 분석 상세 */
export interface PastAnalysisDetailed {
  date: Date

  // 기본 분석
  dailyPillar: { stem: string; branch: string }
  monthlyPillar: { stem: string; branch: string }
  yearlyPillar: { stem: string; branch: string }

  // 고급 분석
  solarTerm: SolarTerm
  lunarInfo: LunarInfo
  twelveStage: { stage: string; score: number; energy: string }
  sibsin: string

  // 사건 유형별 분석
  eventAnalysis: {
    career: { score: number; factors: string[]; whyHappened: string[] }
    finance: { score: number; factors: string[]; whyHappened: string[] }
    relationship: { score: number; factors: string[]; whyHappened: string[] }
    health: { score: number; factors: string[]; whyHappened: string[] }
    travel: { score: number; factors: string[]; whyHappened: string[] }
    education: { score: number; factors: string[]; whyHappened: string[] }
  }

  // 왜 그랬는지 분석
  causalFactors: CausalFactor[]

  // 대운/세운 영향
  daeunInfluence: {
    daeun: { stem: string; branch: string; age: number }
    interaction: string
    impact: number
  }

  // 점성술 상태 (당시)
  astrologyState?: {
    retrogrades: string[]
    eclipseProximity: boolean
    majorTransits: string[]
  }

  overallScore: number
  confidence: number
}

/** 인과 요인 */
export interface CausalFactor {
  type:
    | 'stem_clash'
    | 'branch_clash'
    | 'branch_harmony'
    | 'gongmang'
    | 'shinsal'
    | 'daeun_transition'
    | 'eclipse'
    | 'retrograde'
    | 'yongsin_activation'
    | 'kisin_activation'
    | 'twelve_stage'
    | 'sibsin_influence'
    | 'lunar_mansion'
    | 'solar_term_change'
  factor: string
  description: string
  impact: 'major_positive' | 'positive' | 'neutral' | 'negative' | 'major_negative'
  score: number
  affectedAreas: string[]
}

/** 미래 예측 상세 */
export interface FuturePredictionDetailed {
  date: Date
  periodType: 'day' | 'week' | 'month' | 'year'

  // 기본 정보
  pillar: { stem: string; branch: string }
  solarTerm?: SolarTerm
  lunarInfo?: LunarInfo

  // 점수
  scores: {
    overall: number
    career: number
    finance: number
    relationship: number
    health: number
    creativity: number
    spirituality: number
  }

  // 사주 기반 분석
  sajuAnalysis: {
    twelveStage: { stage: string; score: number; energy: string }
    sibsin: string
    branchInteractions: Array<{ type: string; score: number; description: string }>
    gongmangStatus: { isAffected: boolean; areas: string[] }
    shinsalActive: Array<{ name: string; type: 'lucky' | 'unlucky'; effect: string }>
    tonggeunStrength: number
    tuechulStatus: { revealed: string[]; strength: number }
  }

  // 점성술 기반 분석
  astrologyAnalysis?: {
    progression: ProgressionResult
    transits: Array<{ planet: string; aspect: string; natal: string; effect: string }>
    retrogrades: string[]
    moonPhase: LunarPhase
    lunarMansion: LunarMansion
    planetaryHours: PlanetaryHour[]
  }

  // 대운-트랜짓 동기화
  syncAnalysis: {
    daeun: { stem: string; branch: string; age: number; element: FiveElement }
    transitAlignment: number // 0-100
    synergyType: 'amplify' | 'clash' | 'balance' | 'neutral'
    themes: string[]
  }

  // 최적 시간대 (일별 분석 시)
  optimalHours?: {
    best: { hour: number; activity: string; score: number }[]
    avoid: { hour: number; reason: string }[]
  }

  // 구체적 조언
  advice: {
    dos: string[]
    donts: string[]
    focus: string[]
    opportunities: string[]
    warnings: string[]
  }

  // 신뢰도
  confidence: number
  dataQuality: 'high' | 'medium' | 'low'
}

export interface ConfidenceFactors {
  dataCompleteness: number
  astroMatch: number
  historicalAccuracy: number
  elementBalance: number
  daeunStability: number
}

export interface EventCategoryScores {
  career: number
  finance: number
  relationship: number
  health: number
  travel: number
  education: number
  family: number
  spirituality: number
}

export type ConfidenceGrade = 'A+' | 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D' | 'F'

export interface UnifiedConfidenceResult {
  overall: number
  grade: ConfidenceGrade
  factors: {
    dataCompleteness: number
    astroMatch: number
    historicalAccuracy: number
    elementBalance: number
    daeunStability: number
  }
  interpretation: string
  reliabilityLevel: 'very_high' | 'high' | 'medium' | 'low' | 'very_low'
  caveats: string[]
}
