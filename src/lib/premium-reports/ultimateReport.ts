// src/lib/premium-reports/ultimateReport.ts
//
// UltimateReport — the data shape that drives the premium result page.
//
// Three layers:
//   1. core      : LLM-authored narrative (theme / summary / insights / keyDates / dosAndDonts / radar)
//   2. computed  : deterministic, engine-derived values (saju pillars, astro placements, five elements)
//   3. narrative : LLM-authored gloss that references computed values (crossMatrix details, volatility chart)
//
// Result pages render this shape. Both the LLM pipeline (PR-C) and a fallback
// adapter from the legacy AIPremiumReport (PR-A) produce it, so the page does
// not need to know which generator filled which field.

export type UltimatePeriod = 'monthly' | 'yearly' | 'comprehensive'

export interface UltimateReportMeta {
  reportId: string
  period: UltimatePeriod
  targetDate?: string
  generatedAt: string
  lang: 'ko' | 'en'
  modelUsed?: string
  reportVersion: string
}

export interface UltimateInsight {
  id: string
  title: string
  iconKey:
    | 'sparkles'
    | 'flame'
    | 'message'
    | 'heart'
    | 'compass'
    | 'star'
    | 'shield'
    | 'target'
  content: string[]
  highlight: string
}

export interface UltimateKeyDate {
  date: string
  title: string
  desc: string
}

export interface UltimateDosAndDonts {
  dos: string[]
  donts: string[]
}

export interface UltimateRadarAxis {
  subject: string
  value: number
  fullMark: number
}

export interface UltimateBoostItems {
  gift?: string
  dateMood?: string
  place?: string
  color?: string
}

export interface UltimateCore {
  theme: string
  subTheme: string
  summary: string[]
  insights: UltimateInsight[]
  keyDates: UltimateKeyDate[]
  dosAndDonts: UltimateDosAndDonts
  radar: UltimateRadarAxis[]
  boostItems?: UltimateBoostItems
}

export interface UltimateSajuPillar {
  label: 'year' | 'month' | 'day' | 'time'
  labelKo: string
  stem: string
  branch: string
  stemElement: string
  branchElement: string
  sibsin?: string
  phase?: string
}

export interface UltimateAstroPlacement {
  body: string
  bodyKo?: string
  sign: string
  signKo?: string
  house?: number
  degree?: number
  retrograde?: boolean
}

export interface UltimateComputed {
  dayMaster: {
    stem: string
    element: string
    yinYang: string
  }
  sajuPillars: UltimateSajuPillar[]
  astroPlacements: UltimateAstroPlacement[]
  fiveElements: {
    wood: number
    fire: number
    earth: number
    metal: number
    water: number
  }
}

export interface UltimateCrossMatrixItem {
  module: string
  sajuVariable: string
  astroVariable: string
  result: string
  score: number
  accuracy?: string
  iconKey?: UltimateInsight['iconKey']
  detail: string
}

export interface UltimateVolatilityPoint {
  axis: string
  primary: number
  secondary: number
}

export interface UltimateNarrative {
  crossMatrix: UltimateCrossMatrixItem[]
  volatility: {
    primaryLabel: string
    secondaryLabel: string
    points: UltimateVolatilityPoint[]
  }
  caption?: string
}

export interface UltimateReport {
  meta: UltimateReportMeta
  core: UltimateCore
  computed: UltimateComputed
  narrative: UltimateNarrative
  /**
   * Original legacy report. Kept around so the result page can still surface
   * deep-data panels (qualityAudit, personModel, etc.) until PR-C fully
   * supplies them through `core` and `narrative`.
   */
  legacy?: {
    sourceType: 'comprehensive' | 'timing' | 'themed'
    overallScore?: number
    grade?: string
  }
}

export const ULTIMATE_REPORT_VERSION = '1.0.0'
