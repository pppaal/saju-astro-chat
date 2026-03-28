import type { AIPremiumReport } from '@/lib/destiny-matrix/ai-report/reportTypes'
import {
  REPORT_CREDIT_COSTS,
  type ReportPeriod,
  type ReportTheme,
  type TimingAIPremiumReport,
  type ThemedAIPremiumReport,
} from '@/lib/destiny-matrix/ai-report/types'
import type { ReportTier } from './routeReportPersistence'

export type GeneratedReportMode = 'themed' | 'timing' | 'comprehensive'
export type PersistedReportType = GeneratedReportMode | 'free'

export type StrictPatternThresholds = {
  crossConsistencyMin: number
  coreQualityMin: number
  graphAnchorMin: number
  patternCountMin: number
}

export type PatternQualityGateResult = {
  passed: boolean
  blockers: string[]
  metrics: {
    crossConsistencyScore: number
    coreQualityScore: number | null
    graphAnchorCount: number
    patternCount: number
    inputReadinessScore: number
  }
  thresholds: StrictPatternThresholds
}

export function calculateCreditCost(period?: ReportPeriod, theme?: ReportTheme): number {
  if (theme) return REPORT_CREDIT_COSTS.themed
  if (period && period !== 'comprehensive') {
    return REPORT_CREDIT_COSTS[period]
  }
  return REPORT_CREDIT_COSTS.comprehensive
}

export function resolveGeneratedReportMode(
  period?: ReportPeriod,
  theme?: ReportTheme
): GeneratedReportMode {
  if (theme) return 'themed'
  if (period && period !== 'comprehensive') return 'timing'
  return 'comprehensive'
}

export function resolvePersistedReportType(
  reportTier: ReportTier,
  period?: ReportPeriod,
  theme?: ReportTheme
): PersistedReportType {
  if (reportTier === 'free') return 'free'
  return resolveGeneratedReportMode(period, theme)
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

function parseThreshold(raw: string | undefined, fallback: number, min: number, max: number): number {
  if (!raw) return fallback
  const parsed = Number(raw)
  if (!Number.isFinite(parsed)) return fallback
  return clampNumber(parsed, min, max)
}

function isEnvFlagEnabled(name: string): boolean {
  const raw = process.env[name]?.trim().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
}

export function isHardBlockModeEnabled(): boolean {
  if (process.env.NODE_ENV === 'test') return true
  return isEnvFlagEnabled('AI_REPORT_ALLOW_HARD_BLOCKS')
}

export function isStrictGateEnabled(name: string): boolean {
  return isHardBlockModeEnabled() && isEnvFlagEnabled(name)
}

export function isStrictPatternGuardEnabled(): boolean {
  return isStrictGateEnabled('AI_REPORT_STRICT_PATTERN_GUARD')
}

export function getStrictPatternThresholds(): StrictPatternThresholds {
  return {
    crossConsistencyMin: parseThreshold(process.env.AI_REPORT_PATTERN_CROSS_MIN, 74, 0, 100),
    coreQualityMin: parseThreshold(process.env.AI_REPORT_PATTERN_CORE_QUALITY_MIN, 68, 0, 100),
    graphAnchorMin: parseThreshold(process.env.AI_REPORT_PATTERN_GRAPH_ANCHOR_MIN, 1, 0, 200),
    patternCountMin: parseThreshold(process.env.AI_REPORT_PATTERN_COUNT_MIN, 1, 0, 200),
  }
}

export function evaluatePatternQualityGate(input: {
  report: AIPremiumReport | TimingAIPremiumReport | ThemedAIPremiumReport
  crossConsistencyScore: number
  inputReadinessScore: number
  thresholds: StrictPatternThresholds
}): PatternQualityGateResult {
  const crossConsistencyScore = clampNumber(input.crossConsistencyScore, 0, 100)
  const inputReadinessScore = clampNumber(input.inputReadinessScore, 0, 100)
  const coreQualityRaw = input.report?.meta?.qualityMetrics?.coreQualityScore
  const coreQualityScore =
    typeof coreQualityRaw === 'number' && Number.isFinite(coreQualityRaw)
      ? clampNumber(coreQualityRaw, 0, 100)
      : null
  const graphAnchorCount = Array.isArray(input.report?.graphRagEvidence?.anchors)
    ? input.report.graphRagEvidence.anchors.length
    : 0
  const patternCount = Array.isArray(input.report?.patterns) ? input.report.patterns.length : 0
  const blockers: string[] = []

  if (crossConsistencyScore < input.thresholds.crossConsistencyMin) {
    blockers.push(`crossConsistency ${crossConsistencyScore.toFixed(1)} < ${input.thresholds.crossConsistencyMin}`)
  }
  if (graphAnchorCount < input.thresholds.graphAnchorMin) {
    blockers.push(`graphAnchors ${graphAnchorCount} < ${input.thresholds.graphAnchorMin}`)
  }
  if (patternCount < input.thresholds.patternCountMin) {
    blockers.push(`patterns ${patternCount} < ${input.thresholds.patternCountMin}`)
  }
  if (coreQualityScore !== null && coreQualityScore < input.thresholds.coreQualityMin) {
    blockers.push(`coreQuality ${coreQualityScore.toFixed(1)} < ${input.thresholds.coreQualityMin}`)
  }

  return {
    passed: blockers.length === 0,
    blockers,
    metrics: {
      crossConsistencyScore,
      coreQualityScore,
      graphAnchorCount,
      patternCount,
      inputReadinessScore,
    },
    thresholds: input.thresholds,
  }
}

export function normalizeAIUserPlan(plan: unknown): 'free' | 'starter' | 'pro' | 'premium' {
  if (plan === 'starter' || plan === 'pro' || plan === 'premium') return plan
  return 'free'
}
