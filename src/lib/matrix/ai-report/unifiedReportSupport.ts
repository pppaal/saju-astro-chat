import type { ReportPeriod, UnifiedReportScope, UnifiedTimeWindow } from './types'

interface MappingCountryFit {
  country: string
  fitScore: number
  tradeOff: string
}

interface MappingIncomeBand {
  label: string
  conditionsUpper: string
  risksLower: string
  confidence: number
}

interface MappingRulebook {
  partnerArchetype: {
    primaryTraits: string[]
    supportTraits: string[]
    vibe: string[]
    style: string[]
    meetChannels: string[]
    recognitionClues: string[]
  }
  careerClusters: {
    roleArchetypes: string[]
    industryClusters: string[]
  }
  countryFit: MappingCountryFit[]
  incomeBands: MappingIncomeBand[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeConfidence(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0.5
  if (value >= 0 && value <= 1) return round2(clamp(value, 0, 1))
  if (value > 1 && value <= 100) return round2(clamp(value / 100, 0, 1))
  return 0.5
}

function normalizeScore100(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  if (value >= 0 && value <= 10) return Math.round(clamp(value * 10, 0, 100))
  return Math.round(clamp(value, 0, 100))
}

function blendDisplayDomainScore(params: {
  overall: number
  summaryScore?: number | null
  analysisScore?: number | null
  signalScore?: number | null
}): number {
  const sourceScores = [params.summaryScore, params.analysisScore, params.signalScore].filter(
    (value): value is number => typeof value === 'number' && Number.isFinite(value)
  )
  if (sourceScores.length === 0) return params.overall

  const summaryWeight = typeof params.summaryScore === 'number' ? 0.35 : 0
  const analysisWeight = typeof params.analysisScore === 'number' ? 0.2 : 0
  const signalWeight = typeof params.signalScore === 'number' ? 0.25 : 0
  const overallWeight = Math.max(0.2, 1 - summaryWeight - analysisWeight - signalWeight)
  const blended = Math.round(
    params.overall * overallWeight +
      (params.summaryScore || 0) * summaryWeight +
      (params.analysisScore || 0) * analysisWeight +
      (params.signalScore || 0) * signalWeight
  )
  let upperBound = params.overall + 22
  if (typeof params.analysisScore === 'number' && Number.isFinite(params.analysisScore)) {
    upperBound = Math.min(upperBound, params.analysisScore + 14)
  }
  if (typeof params.signalScore === 'number' && Number.isFinite(params.signalScore)) {
    upperBound = Math.max(upperBound, Math.min(96, params.signalScore + 10))
  }
  return Math.round(clamp(blended, Math.max(24, params.overall - 18), Math.min(96, upperBound)))
}

function blendDisplayDomainConfidence(params: {
  overallConfidence: number
  displayScore: number
  overallScore: number
  summaryConfidence?: number | null
  hasAnalysisScore: boolean
  hasSignalScore: boolean
}): number {
  const sourceConfidence =
    typeof params.summaryConfidence === 'number' && Number.isFinite(params.summaryConfidence)
      ? params.summaryConfidence
      : params.hasAnalysisScore
        ? 0.72
        : params.hasSignalScore
          ? 0.76
        : params.overallConfidence
  const gapPenalty = Math.max(0, params.displayScore - params.overallScore - 12) * 0.008
  return round2(
    clamp(sourceConfidence * 0.75 + params.overallConfidence * 0.25 - gapPenalty, 0.45, 0.92)
  )
}

function parseIsoDateParts(date: string): { year: number; month: number; day: number } | null {
  if (!date) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim())
  if (!m) return null
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) }
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function pickTopStrings(values: Array<string | undefined>, limit: number): string[] {
  return unique(
    values.map((value) => (value || '').trim()).filter((value) => value.length > 0)
  ).slice(0, limit)
}

function extractMustKeepTokens(...sources: Array<string | undefined>): string[] {
  const years = sources
    .flatMap((source) => (source || '').match(/\b20\d{2}\b/g) || [])
    .map((year) => year.trim())
  const words = sources
    .flatMap((source) => (source || '').split(/[^\p{L}\p{N}]+/gu))
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .filter(
      (token) =>
        !['그리고', '하지만', 'the', 'and', 'with', 'this', 'that', 'signal', 'signals'].includes(
          token.toLowerCase()
        )
    )
  return unique([...years, ...words]).slice(0, 10)
}

function sectionToDomain(sectionPath: string): string {
  if (sectionPath.includes('career')) return 'career'
  if (sectionPath.includes('relationship') || sectionPath.includes('love')) return 'relationship'
  if (sectionPath.includes('wealth') || sectionPath.includes('money')) return 'wealth'
  if (sectionPath.includes('health')) return 'health'
  if (
    sectionPath.includes('timing') ||
    sectionPath.includes('opportun') ||
    sectionPath.includes('caution')
  ) {
    return 'timing'
  }
  if (sectionPath.includes('move') || sectionPath.includes('relocat')) return 'move'
  return 'personality'
}

function mapPeriodToScope(period: ReportPeriod): UnifiedReportScope {
  if (period === 'daily') return 'DAY'
  if (period === 'monthly') return 'MONTH'
  if (period === 'yearly') return 'YEAR'
  return 'LIFE'
}

function buildUnifiedTimeWindow(params: {
  mode: 'comprehensive' | 'timing' | 'themed'
  period?: ReportPeriod
  targetDate?: string
}): UnifiedTimeWindow {
  if (params.mode === 'timing' && params.period) {
    const scope = mapPeriodToScope(params.period)
    const targetDate = params.targetDate || new Date().toISOString().slice(0, 10)
    const parts = parseIsoDateParts(targetDate)
    if (scope === 'DAY') {
      return { scope, start: targetDate, end: targetDate, date: targetDate }
    }
    if (scope === 'MONTH') {
      if (parts) {
        const start = `${parts.year}-${String(parts.month).padStart(2, '0')}-01`
        return { scope, start, end: null, year: parts.year, month: parts.month }
      }
      return { scope, start: null, end: null }
    }
    if (scope === 'YEAR') {
      if (parts) {
        return {
          scope,
          start: `${parts.year}-01-01`,
          end: `${parts.year}-12-31`,
          year: parts.year,
        }
      }
      return { scope, start: null, end: null }
    }
    return { scope: 'LIFE', start: null, end: null }
  }
  return { scope: 'LIFE', start: null, end: null }
}


export {
  buildUnifiedTimeWindow,
  blendDisplayDomainConfidence,
  blendDisplayDomainScore,
  clamp,
  extractMustKeepTokens,
  mapPeriodToScope,
  normalizeConfidence,
  normalizeScore100,
  parseIsoDateParts,
  pickTopStrings,
  round2,
  sectionToDomain,
  unique,
}
export type { MappingCountryFit, MappingIncomeBand, MappingRulebook }
