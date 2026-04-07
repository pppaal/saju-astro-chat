import { recordCounter } from '@/lib/metrics'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import type { SectionEvidenceRefs } from './evidenceRefs'
import type { TopMatchedPattern } from './types'
import type { AIPremiumReport, AIUserPlan } from './reportTypes'
import {
  buildReportQualityMetrics as buildReportQualityMetricsCore,
  recordReportQualityMetrics as recordReportQualityMetricsCore,
  type ReportQualityContext,
  type ReportQualityMetrics,
} from './reportQuality'
import { validateEvidenceBinding } from './rewriteGuards'
import {
  hasEvidenceSupport,
  MIN_EVIDENCE_REFS_PER_SECTION as MIN_EVIDENCE_REFS_PER_SECTION_EXTERNAL,
} from './reportEvidenceSupport'
import { buildReportStyleMetrics } from './reportBrandVoice'
import { getMaxRepairPassesByPlan } from './repairPrompts'
import { getReportDomainLabel, localizeReportNarrativeText } from './reportTextHelpers'

const RECHECK_REGEX = /verify|recheck|double-check|checklist|review|confirm/i
const ABSOLUTE_RISK_REGEX = /100%|always|never|guaranteed|certainly|inevitable/i
const IRREVERSIBLE_ACTION_REGEX =
  /sign|finalize|commit now|book|wedding|invitation|big decision|launch|submit payment/i
const CAUTION_INDICATOR_REGEX = /caution|risk|warning|recheck|conflict|overreach|fragile/i
const IMMEDIATE_FORCE_REGEX = /today\s*finalize|sign now|commit now|immediately|rush|right away/i
const MITIGATION_REGEX = /avoid|before|recheck|verify|defer|hold|slow down|stage/i
const RECOMMENDATION_TONE_REGEX = /recommended|recommend|should|must|do this|proceed|best move/i

function isCostOptimizedAiPath(): boolean {
  const explicit = process.env.AI_BACKEND_COST_OPTIMIZED?.trim().toLowerCase()
  if (explicit) return explicit === 'true' || explicit === '1' || explicit === 'yes'
  const provider = process.env.AI_BACKEND_PROVIDER?.trim().toLowerCase()
  return provider === 'claude' || provider === 'anthropic'
}

function getAiQualityTier(stage: 'base' | 'repair'): 'fast' | 'quality' {
  if (!isCostOptimizedAiPath()) return 'quality'
  return stage === 'base' ? 'fast' : 'quality'
}

function getEffectiveMaxRepairPasses(plan?: AIUserPlan): number {
  const base = getMaxRepairPassesByPlan(plan)
  if (!isCostOptimizedAiPath()) return base
  return 0
}

function getCostOptimizedComprehensiveLiveSectionKeys(): Array<keyof AIPremiumReport['sections']> {
  return [
    'introduction',
    'careerPath',
    'relationshipDynamics',
    'timingAdvice',
    'actionPlan',
    'conclusion',
  ]
}

function recordRewriteModeMetric(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  tokensUsed: number | undefined
) {
  const fallback = modelUsed.includes('rewrite-fallback') ? 'true' : 'false'
  recordCounter('destiny.ai_report.rewrite.mode', 1, {
    report_type: reportType,
    model_used: modelUsed,
    fallback,
  })
  if (typeof tokensUsed === 'number') {
    recordCounter('destiny.ai_report.rewrite.tokens', tokensUsed, {
      report_type: reportType,
      model_used: modelUsed,
    })
  }
}

function buildDirectToneOverride(lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    return [
      '## ?? ?? ??',
      '- ??? ??? ?? ??? ??? ??? ?????.',
      '- ? ?? ? ??? ????? ?????.',
      '- ????? ?? ?? ??? ?? ??? ?????.',
      '- ??(??/??) -> ?? -> ?? ??? ?????.',
      '- ??? ??? ????? ????, ??? ?? ???? ???.',
    ].join('\n')
  }
  return [
    '## Tone Override',
    '- Use a professional consultant tone, not friendly consolation.',
    '- Start each paragraph with a conclusion sentence.',
    '- Prefer clear judgments over vague hedging.',
    '- Keep the flow: evidence (Saju/Astrology) -> interpretation -> action.',
    '- Keep short, assertive paragraph sentences.',
  ].join('\n')
}

export function countSectionChars(sections: Record<string, unknown>): number {
  const values = Object.values(sections || {}) as unknown[]
  return values.reduce<number>((acc, value) => {
    if (typeof value === 'string') {
      return acc + value.length
    }
    if (Array.isArray(value)) {
      return acc + value.join(' ').length
    }
    if (value && typeof value === 'object') {
      return acc + countSectionChars(value as Record<string, unknown>)
    }
    return acc
  }, 0)
}

export function buildTopMatchedPatterns(
  patterns: PatternResult[] | undefined,
  limit = 10
): TopMatchedPattern[] {
  if (!Array.isArray(patterns) || patterns.length === 0) return []
  return patterns.slice(0, limit).map((pattern) => ({
    id: pattern.id,
    label: pattern.label,
    score: pattern.score,
    confidence: pattern.confidence,
    domains: [...(pattern.domains || [])],
    activationReason: pattern.activationReason,
    matchedSignalIds: [...(pattern.matchedSignalIds || [])].slice(0, 8),
    matchedKeywords: [...(pattern.matchedKeywords || [])].slice(0, 8),
  }))
}

function buildReportQualityMetrics(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  context: ReportQualityContext = {}
): ReportQualityMetrics {
  const forbiddenAdditionsPass = !validateEvidenceBinding(
    sections,
    sectionPaths,
    evidenceRefs
  ).violations.some((violation) => violation.unsupportedTokens.length > 0)

  return {
    ...buildReportQualityMetricsCore({
      sections,
      sectionPaths,
      evidenceRefs,
      context,
      minEvidenceRefsPerSection: MIN_EVIDENCE_REFS_PER_SECTION_EXTERNAL,
      regex: {
        recheck: RECHECK_REGEX,
        absoluteRisk: ABSOLUTE_RISK_REGEX,
        irreversibleAction: IRREVERSIBLE_ACTION_REGEX,
        cautionIndicator: CAUTION_INDICATOR_REGEX,
        immediateForce: IMMEDIATE_FORCE_REGEX,
        mitigation: MITIGATION_REGEX,
        recommendationTone: RECOMMENDATION_TONE_REGEX,
      },
      hasEvidenceSupport,
      forbiddenAdditionsPass,
    }),
    ...buildReportStyleMetrics(sections, sectionPaths, 'ko'),
  }
}

function recordReportQualityMetrics(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  quality: ReportQualityMetrics
) {
  recordReportQualityMetricsCore(reportType, modelUsed, quality)
}

export {
  buildDirectToneOverride,
  buildReportQualityMetrics,
  getAiQualityTier,
  getCostOptimizedComprehensiveLiveSectionKeys,
  getEffectiveMaxRepairPasses,
  isCostOptimizedAiPath,
  recordReportQualityMetrics,
  recordRewriteModeMetric,
}
