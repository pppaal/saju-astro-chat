// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrix(TM) - AI Premium Report Generator
// ?? ??: AI ?? ?? ???? ??? ??

import type { FusionReport } from '../interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '../types'
import type {
  ReportPeriod,
  ReportTheme,
  TimingData,
  TimingAIPremiumReport,
  ThemedAIPremiumReport,
  TimingReportSections,
  ThemedReportSections,
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
  UnifiedTimelineEvent,
  TopMatchedPattern,
} from './types'
import { THEME_META } from './types'
import { logger } from '@/lib/logger'
import { recordCounter } from '@/lib/metrics'
import { buildTimingPrompt } from './prompts/timingPrompts'
import { buildThemedPrompt } from './prompts/themedPrompts'
import {
  buildGraphRAGEvidence,
  formatGraphRAGEvidenceForPrompt,
  summarizeGraphRAGEvidence,
} from './graphRagEvidence'
import {
  renderProjectionBlocksAsMarkdown,
  renderProjectionBlocksAsText,
  renderSectionsAsMarkdown,
  renderSectionsAsText,
} from './reportRendering'
import { buildDeterministicCore, type DeterministicSectionBlock } from './deterministicCore'
import type { DeterministicProfile } from './deterministicCoreConfig'
import { getThemedSectionKeys } from './themeSchema'
import { buildLifeCyclePromptBlock, buildThemeSchemaPromptBlock } from '../interpretationSchema'
import { buildUnifiedEnvelope, inferAgeFromBirthDate } from './unifiedReport'
import { formatPolicyCheckLabels } from '@/lib/destiny-matrix/core/actionCopy'
import {
  buildReportQualityMetrics as buildReportQualityMetricsCore,
  recordReportQualityMetrics as recordReportQualityMetricsCore,
  type ReportQualityContext,
  type ReportQualityMetrics,
} from './reportQuality'
import {
  buildEvidenceBindingRepairPrompt,
  enforceEvidenceBindingFallback,
  getPathText,
  getPathValue,
  hasRequiredSectionPaths,
  rewriteSectionsWithFallback,
  setPathText,
  validateEvidenceBinding,
} from './rewriteGuards'
import {
  findReportCoreAdvisory,
  findReportCoreManifestation,
  findReportCoreTimingWindow,
  findReportCoreVerdict,
  type ReportCoreViewModel,
  stripGenericEvidenceFooters,
} from './reportCoreHelpers'
import {
  enrichComprehensiveSectionsWithReportCore,
  enrichThemedSectionsWithReportCore,
  enrichTimingSectionsWithReportCore,
  type ReportCoreEnrichmentDeps,
} from './reportCoreEnrichment'
import {
  applyComprehensiveSectionRoleGuards,
  sanitizeComprehensiveSectionsForUser,
  type ComprehensivePostProcessDeps,
} from './reportComprehensivePostProcess'
import { repairMalformedComprehensiveSections } from './reportSectionRepair'
import {
  buildComprehensiveFallbackSections as buildComprehensiveFallbackSectionsExternal,
  buildNarrativeSupplementsBySection as buildNarrativeSupplementsBySectionExternal,
  mergeComprehensiveDraftWithBlocks as mergeComprehensiveDraftWithBlocksExternal,
  type ComprehensiveFallbackDeps,
} from './reportComprehensiveFallback'
import {
  buildThemedFallbackSections as buildThemedFallbackSectionsExternal,
  buildTimingFallbackSections as buildTimingFallbackSectionsExternal,
  type SecondaryFallbackDeps,
} from './reportSecondaryFallbacks'
import {
  sanitizeThemedSectionsForUser as sanitizeThemedSectionsForUserExternal,
  sanitizeTimingContradictions as sanitizeTimingContradictionsExternal,
  type SecondaryPostProcessDeps,
} from './reportSecondaryPostProcess'
import {
  formatNarrativeParagraphs,
  removeCrossSectionNarrativeRepetition,
  sanitizeSectionsByPaths as sanitizeSectionsByPathsExternal,
  type NarrativePathSanitizerDeps,
} from './reportNarrativeFormatting'
import {
  buildComprehensiveEvidenceRefs as buildComprehensiveEvidenceRefsExternal,
  buildThemedEvidenceRefs as buildThemedEvidenceRefsExternal,
  buildTimingEvidenceRefs as buildTimingEvidenceRefsExternal,
  enforceEvidenceRefFooters as enforceEvidenceRefFootersExternal,
  hasEvidenceSupport as hasEvidenceSupportExternal,
  MIN_EVIDENCE_REFS_PER_SECTION as MIN_EVIDENCE_REFS_PER_SECTION_EXTERNAL,
  resolveSignalDomain as resolveSignalDomainExternal,
  type ReportEvidenceSupportDeps,
} from './reportEvidenceSupport'
import {
  attachTrustNarrativeToSections as attachTrustNarrativeToSectionsExternal,
  buildReportTrustNarratives as buildReportTrustNarrativesExternal,
  renderActionPlanSection as renderActionPlanSectionExternal,
  renderCareerPathSection as renderCareerPathSectionExternal,
  renderConclusionSection as renderConclusionSectionExternal,
  renderHealthGuidanceSection as renderHealthGuidanceSectionExternal,
  renderIntroductionSection as renderIntroductionSectionExternal,
  renderLifeMissionSection as renderLifeMissionSectionExternal,
  renderPersonalityDeepSection as renderPersonalityDeepSectionExternal,
  renderRelationshipDynamicsSection as renderRelationshipDynamicsSectionExternal,
  renderTimingAdviceSection as renderTimingAdviceSectionExternal,
  renderWealthPotentialSection as renderWealthPotentialSectionExternal,
  type ReportSectionRendererDeps,
} from './reportSectionRenderers'
import {
  renderComprehensiveFutureOutlookSection as renderComprehensiveFutureOutlookSectionExternal,
  renderComprehensiveLifeStagesSection as renderComprehensiveLifeStagesSectionExternal,
  renderComprehensiveSpouseProfileSection as renderComprehensiveSpouseProfileSectionExternal,
  renderComprehensiveTurningPointsSection as renderComprehensiveTurningPointsSectionExternal,
  type ReportLifeSectionDeps,
} from './reportLifeSections'
import {
  containsBannedPhrase,
  dedupeNarrativeSentences,
  normalizeUserFacingArtifacts,
  sanitizeSectionNarrative,
  sanitizeUserFacingNarrative,
  sentenceKey,
  stripBannedPhrases,
} from './reportNarrativeSanitizer'
export { sanitizeSectionNarrative } from './reportNarrativeSanitizer'
import { applyReportBrandVoice, buildReportStyleMetrics } from './reportBrandVoice'
import {
  buildReportCoreLine,
  capitalizeFirst,
  collectCleanNarrativeLines,
  containsHangul,
  distinctNarrative,
  getElementByStemName,
  getElementLabel,
  getReportDomainLabel,
  getTimingWindowLabel,
  getWesternElementLabel,
  hasBatchim,
  localizeGeokgukLabel,
  localizePlanetName,
  localizeReportNarrativeText,
  localizeSignName,
  normalizeNarrativeCoreText,
  sanitizeEvidenceToken,
  withSubjectParticle,
} from './reportTextHelpers'
import {
  buildActionRepairInstruction,
  buildAntiRepetitionInstruction,
  buildCrossRepairInstruction,
  buildCrossCoverageRepairInstruction,
  buildDepthRepairInstruction,
  buildEvidenceRepairInstruction,
  buildNarrativeRewritePrompt,
  buildNarrativeStyleRepairInstruction,
  buildSecondPassInstruction,
  buildTimingRepairInstruction,
  getMaxRepairPassesByPlan,
} from './repairPrompts'
import {
  getCoverageRatioByPredicate,
  getCrossCoverageRatio,
  getListStylePaths,
  getMissingCrossPaths,
  getMissingPathsByPredicate,
  getRepetitivePaths,
  getShortSectionPaths,
  hasActionInText,
  hasCrossInText,
  hasEvidenceTriplet,
  hasListLikeStyle,
  hasRepetitiveSentences,
  hasTimingInText,
} from './sectionAudit'
import { evaluateSectionGate, splitSentences } from './sectionQualityGate'
import {
  buildSynthesisFactsForSection,
  type SignalSynthesisResult,
  type SignalDomain,
  getDomainsForSection,
} from './signalSynthesizer'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type { StrategyEngineResult } from './strategyEngine'
import { generateNarrativeSectionsFromSynthesis } from './narrativeGenerator'
import {
  describeDataTrustSummary,
  describeExecutionStance,
  describeIntraMonthPeakWindow,
  describeProvenanceSummary,
  describePhaseFlow,
  describeSajuAstroConflictByDomain,
  describeTimingCalibrationSummary,
  describeTimingWindowNarrative as describeHumanTimingWindowNarrative,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'

// Extracted modules
import type { AIPremiumReport, AIReportGenerationOptions, AIUserPlan } from './reportTypes'

import { buildMatrixSummary } from './promptBuilders'
import { callAIBackendGeneric } from './aiBackend'
import {
  generatePeriodLabel,
  calculatePeriodScore,
  calculateThemeScore,
  extractKeywords,
} from './scoreCalculators'
import type { GraphRAGEvidenceAnchor, GraphRAGCrossEvidenceSet } from './graphRagEvidence'
import {
  buildNormalizedMatrixInput,
  runDestinyCore,
} from '@/lib/destiny-matrix/core/runDestinyCore'
import type { DestinyCoreQuality } from '@/lib/destiny-matrix/core/runDestinyCore'
import { adaptCoreToReport } from '@/lib/destiny-matrix/core/adapters'
import type { PatternResult } from '@/lib/destiny-matrix/core/patternEngine'

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

function countSectionChars(sections: Record<string, unknown>): number {
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

function buildTopMatchedPatterns(
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

function applyFinalReportStyle<T extends Record<string, unknown>>(
  sections: T,
  sectionPaths: string[],
  lang: 'ko' | 'en',
  reportCore: ReportCoreViewModel
): T {
  return applyReportBrandVoice(sections, sectionPaths, lang, {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    riskAxisLabel: reportCore.riskAxisLabel,
  }) as T
}

function attachDeterministicArtifacts(
  deterministicCore: ReturnType<typeof buildDeterministicCore>,
  unified: ReturnType<typeof buildUnifiedEnvelope>
): ReturnType<typeof buildDeterministicCore> {
  return {
    ...deterministicCore,
    artifacts: {
      ...(deterministicCore.artifacts || {}),
      mappingRulebook: unified.mappingRulebook as unknown as Record<string, unknown>,
      blocksBySection: unified.blocksBySection,
      scenarioBundles: (unified.scenarioBundles || []).map((bundle) => ({
        id: bundle.id,
        domain: bundle.domain,
        mainTokens: bundle.main.summaryTokens || [],
        altTokens: (bundle.alt || []).map((alt) => alt.summaryTokens || []),
      })),
      evidenceLinks: (unified.evidenceLinks || []).map((link) => ({
        id: link.id,
        signalId: link.signalId,
        claimIds: link.claimIds || [],
        anchorId: link.anchorId,
        setIds: link.setIds || [],
        score: link.linkScore,
      })),
      timelinePriority: unified.timelinePriority,
    },
  }
}

function buildReportOutputCoreFields(
  reportCore: ReportCoreViewModel | null | undefined,
  lang: 'ko' | 'en' = 'ko'
) {
  if (!reportCore) return {}
  const localizeReportFreeText = (text: string | undefined | null): string => {
    const value = String(text || '').trim()
    if (!value || lang !== 'ko') return value
    return value
      .replace(/\bpersonality\b/gi, '??')
      .replace(/\bcareer\b/gi, '???')
      .replace(/\brelationship\b/gi, '??')
      .replace(/\bwealth\b/gi, '??')
      .replace(/\bhealth\b/gi, '??')
      .replace(/\bmove\b/gi, '??')
      .replace(/\bspirituality\b/gi, '??')
      .replace(/\bnow\b/gi, '??')
      .replace(/\bweek\b/gi, '?? ?')
      .replace(/\bfortnight\b/gi, '2?')
      .replace(/\bmonth\b/gi, '?? ?')
      .replace(/\bseason\b/gi, '?? ??')
      .replace(/\bverify\b/gi, '???')
      .replace(/\bprepare\b/gi, '??')
      .replace(/\bexecute\b/gi, '??')
      .replace(/\bTransit\s+saturnReturn\b/gi, '?? ?? ??')
      .replace(/\bTransit\s+jupiterReturn\b/gi, '?? ??')
      .replace(/\bTransit\s+nodeReturn\b/gi, '?? ?? ??')
      .replace(/\bTransit\s+mercuryRetrograde\b/gi, '?? ??? ??')
      .replace(/\bTransit\s+marsRetrograde\b/gi, '?? ??? ??')
      .replace(/\bTransit\s+venusRetrograde\b/gi, '?? ??? ??')
      .replace(/\bsaturnReturn\b/gi, '?? ?? ??')
      .replace(/\bjupiterReturn\b/gi, '?? ??')
      .replace(/\bnodeReturn\b/gi, '?? ?? ??')
      .replace(/\bmercuryRetrograde\b/gi, '?? ??? ??')
      .replace(/\bmarsRetrograde\b/gi, '?? ??? ??')
      .replace(/\bvenusRetrograde\b/gi, '?? ??? ??')
      .replace(/\bsolarReturn\b/gi, '?? ?? ??')
      .replace(/\blunarReturn\b/gi, '?? ?? ??')
      .replace(/\bprogressions?\b/gi, '?? ?? ??')
      .replace(/\bcaution\b/gi, '?? ??')
      .replace(/\bdowngrade pressure\b/gi, '?? ?? ??')
      .replace(/\bgeokguk strength\b/gi, '?? ???')
      .replace(/\bdebt restructure\b/gi, '?? ???')
      .replace(/\bliquidity defense\b/gi, '??? ??')
      .replace(/\bexpense spike\b/gi, '?? ?? ??')
      .replace(/\bpromotion review\b/gi, '?? ??')
      .replace(/\brecovery reset\b/gi, '?? ???')
      .replace(/\bbasecamp reset\b/gi, '?? ???')
      .replace(/\bmap full debt stack\b/gi, '?? ?? ??? ?? ????')
      .replace(/\bwealth volatility pattern\b/gi, '?? ??? ??')
      .replace(/\bcareer expansion pattern\b/gi, '??? ?? ??')
      .replace(/\brelationship tension pattern\b/gi, '?? ?? ??')
      .replace(/\bcashflow\b/gi, '????')
      .replace(/\bmoney expansion action\b/gi, '?? ??? ?? ???? ?????')
      .replace(/\brelationship caution\b/gi, '????? ???? ?? ??? ?????')
      .replace(/action pressure/gi, 'action pressure')
      .replace(/relationship caution/gi, 'relationship caution')
      .replace(/money expansion action/gi, 'money expansion action')
      .replace(/career expansion pattern/gi, 'career expansion pattern')
      .replace(/relationship tension pattern/gi, 'relationship tension pattern')
      .replace(
        /action pressure stayed narrow between ([^\s]+) and ([^\s]+)/gi,
        (_, left: string, right: string) =>
          `${getReportDomainLabel(left, 'ko')}? ${getReportDomainLabel(right, 'ko')} ??? ?? ??? ???? ?????.`
      )
      .replace(
        /\b\w+\s+stayed secondary because total support remained below the winner\b/gi,
        '?? ??? ????? ?? ???? ??????.'
      )
      .replace(/basecamp reset/gi, '?? ???')
      .replace(/promotion review/gi, '?? ??')
      .replace(/contract negotiation/gi, '?? ??')
      .replace(/specialist track/gi, '??? ??')
      .replace(/wealth volatility pattern/gi, '?? ??? ??')
      .replace(/career expansion pattern/gi, '??? ?? ??')
      .replace(/relationship tension pattern/gi, '?? ?? ??')
      .replace(/sleep disruption/gi, '?? ???')
      .replace(/burnout risk/gi, '??? ??')
      .replace(/liquidity defense/gi, '??? ??')
      .replace(/debt restructuring/gi, '?? ???')
      .replace(/route recheck/gi, '?? ???')
      .replace(/recovery reset/gi, '?? ???')
      .replace(/cashflow/gi, '????')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const polishBranchSentence = (text: string | undefined | null): string => {
    const base = localizeReportFreeText(text)
    if (!base || lang !== 'ko') return base
    return base
      .replace(
        /([\uAC00-\uD7A3]+)\s+Expansion Pattern\s+\uD328\uD134\s+\uADFC\uAC70\uAC00\s+\uC720\uC9C0\uB420\s+\uAC83/gi,
        '$1 \uD655\uC7A5 \uD750\uB984\uC774 \uC720\uC9C0\uB420 \uAC83'
      )
      .replace(
        /(.+?)\s+\uC774\uD6C4\uC5D0\uB3C4\s+([\uAC00-\uD7A3]+)\s+Expansion Pattern\s+\uADFC\uAC70\uAC00\s+\uC774\uC5B4\uC9C8\s+\uAC83/gi,
        '$1 \uC774\uD6C4\uC5D0\uB3C4 $2 \uD655\uC7A5 \uD750\uB984\uC774 \uC774\uC5B4\uC9C8 \uAC83'
      )
      .replace(/\bExpansion Pattern\b/gi, '\uD655\uC7A5 \uD750\uB984')
      .replace(
        /([\uAC00-\uD7A3]+)\s+(?:\uD655\uC7A5|\uAE34\uC7A5|\uBCC0\uB3D9\uC131)\s+\uD750\uB984\s+\uD328\uD134\s+\uADFC\uAC70\uAC00\s+\uC720\uC9C0\uB420\s+\uAC83/gi,
        '$1 \uD750\uB984\uC774 \uC720\uC9C0\uB420 \uAC83'
      )
      .replace(
        /\uC2DC\uB098\uB9AC\uC624\s+\uD655\uB960\s+[\d.]+%\uC640\s+\uC2E0\uB8B0\uB3C4\s+[\d.]+%\uAC00\s+\uC720\uC9C0\uB420\s+\uAC83/gi,
        '\uD604\uC7AC \uAC00\uB2A5\uC131\uACFC \uC2E0\uB8B0\uB3C4\uAC00 \uC720\uC9C0\uB420 \uAC83'
      )
      .replace(
        /\uD0C0\uC774\uBC0D\s+\uC801\uD569\uB3C4\s+[\d.]+%\s+\uC774\uC0C1\uC5D0\uC11C\s+(.+?)\uB97C\s+\uBC14\uB85C\s+\uC2E4\uD589\uD560\s+\uC218\s+\uC788\uC744\s+\uAC83/gi,
        '\uD0C0\uC774\uBC0D\uC774 \uCDA9\uBD84\uD788 \uB9DE\uC744 \uB54C $1\uB97C \uC2E4\uD589\uD560 \uC218 \uC788\uC744 \uAC83'
      )
      .replace(
        /(.+?)\s+\uC774\uD6C4\uC5D0\uB3C4\s+([\uAC00-\uD7A3]+)\s+\uD750\uB984\s+\uADFC\uAC70\uAC00\s+\uC774\uC5B4\uC9C8\s+\uAC83/gi,
        '$1 \uC774\uD6C4\uC5D0\uB3C4 $2 \uD750\uB984\uC774 \uC774\uC5B4\uC9C8 \uAC83'
      )
      .replace(/\s+/g, ' ')
      .trim()
  }
  const localizeProjectionList = (items: Array<string | undefined | null>) =>
    items.map((item) => polishBranchSentence(item)).filter(Boolean)
  const timingWindow = reportCore.domainTimingWindows.find(
    (item) => item.domain === reportCore.actionFocusDomain || item.domain === reportCore.focusDomain
  )
  const structureSummary =
    lang === 'ko'
      ? reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `?? ?? ???? ? ??? ${actionLabel}??, ?? ?? ??? ${focusLabel}???. ?? ?? ?? ?? ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}???.`
        : `?? ?? ?? ???? ??? ${focusLabel}??, ??? ?? ???? ? ??? ${actionLabel}???. ?? ?? ?? ?? ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}???.`
      : reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `The axis to handle directly right now is ${actionLabel}, while ${focusLabel} remains the background structural axis. The top latent drivers are ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
        : `The identity axis is ${focusLabel}, the action axis is ${actionLabel}, and the top latent drivers are ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}.`
  const timingSummary =
    lang === 'ko'
      ? `${actionLabel} ??? ?? ?? ${localizeReportFreeText(timingWindow?.window || '??')}??, ${localizeReportFreeText(timingWindow?.timingConflictNarrative || '??? ??? ?? ?? ???.')}`
      : `Timing for ${actionLabel} reads as ${timingWindow?.window || 'unknown'}, and ${timingWindow?.timingConflictNarrative || 'structure and trigger need to be read together.'}`
  const conflictSummary =
    lang === 'ko'
      ? localizeReportFreeText(reportCore.arbitrationBrief.conflictReasons[0]) ||
        `${focusLabel}? ?? ??? ?? ??, ${actionLabel}? ?? ??? ??? ? ?? ?? ???.`
      : reportCore.arbitrationBrief.conflictReasons[0] ||
        `${focusLabel} and ${actionLabel} currently separate into identity and action axes.`
  const evidenceSummary =
    lang === 'ko'
      ? `?? ?? ${reportCore.topSignalIds.slice(0, 3).length}?, ?? ?? ${reportCore.topPatternIds.slice(0, 2).length}?, ?? ?? ${reportCore.topScenarioIds.slice(0, 2).length}?? ?? ??? ??? ????.`
      : `Top signals ${reportCore.topSignalIds.slice(0, 3).join(', ')}, patterns ${reportCore.topPatternIds.slice(0, 2).join(', ')}, and scenarios ${reportCore.topScenarioIds.slice(0, 2).join(', ')} form the current spine.`
  return {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    matrixView: (reportCore.matrixView || []).slice(0, 4).map((row) => ({
      domain: row.domain,
      label: localizeReportFreeText(row.label),
      cells: (row.cells || []).slice(0, 4).map((cell) => ({
        ...cell,
        summary: localizeReportFreeText(cell.summary),
      })),
    })),
    branchSet: (reportCore.branchSet || []).slice(0, 3).map((branch) => ({
      ...branch,
      label: localizeReportFreeText(branch.label),
      summary: localizeReportFreeText(branch.summary),
      entry: localizeProjectionList(branch.entry || []),
      abort: localizeProjectionList(branch.abort || []),
      sustain: localizeProjectionList(branch.sustain || []),
      reversalRisk: polishBranchSentence(branch.reversalRisk || ''),
      wrongMoveCost: polishBranchSentence(branch.wrongMoveCost || ''),
    })),
    singleUserModel: reportCore.singleUserModel
      ? {
          subject: localizeReportFreeText(reportCore.singleUserModel.subject),
          facets: reportCore.singleUserModel.facets.map((facet) => ({
            ...facet,
            label: localizeReportFreeText(facet.label),
            summary: localizeReportFreeText(facet.summary),
            details: localizeProjectionList(facet.details || []),
          })),
        }
      : undefined,
    singleSubjectView: reportCore.singleSubjectView
      ? {
          directAnswer: localizeReportFreeText(reportCore.singleSubjectView.directAnswer),
          structureAxis: {
            ...reportCore.singleSubjectView.structureAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.structureAxis.label),
            thesis: localizeReportFreeText(reportCore.singleSubjectView.structureAxis.thesis),
            topAxes: localizeProjectionList(
              reportCore.singleSubjectView.structureAxis.topAxes || []
            ),
          },
          actionAxis: {
            ...reportCore.singleSubjectView.actionAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.actionAxis.label),
            nowAction: localizeReportFreeText(reportCore.singleSubjectView.actionAxis.nowAction),
            whyThisFirst: localizeReportFreeText(
              reportCore.singleSubjectView.actionAxis.whyThisFirst
            ),
          },
          riskAxis: {
            ...reportCore.singleSubjectView.riskAxis,
            label: localizeReportFreeText(reportCore.singleSubjectView.riskAxis.label),
            warning: localizeReportFreeText(reportCore.singleSubjectView.riskAxis.warning),
            hardStops: localizeProjectionList(
              reportCore.singleSubjectView.riskAxis.hardStops || []
            ),
          },
          timingState: {
            ...reportCore.singleSubjectView.timingState,
            bestWindow: localizeReportFreeText(reportCore.singleSubjectView.timingState.bestWindow),
            whyNow: localizeReportFreeText(reportCore.singleSubjectView.timingState.whyNow),
            whyNotYet: localizeReportFreeText(reportCore.singleSubjectView.timingState.whyNotYet),
            windows: reportCore.singleSubjectView.timingState.windows.map((window) => ({
              ...window,
              summary: localizeReportFreeText(window.summary),
            })),
          },
          competingPressures: reportCore.singleSubjectView.competingPressures.map((pressure) => ({
            ...pressure,
            label: localizeReportFreeText(pressure.label),
            nextWindow: localizeReportFreeText(pressure.nextWindow),
            summary: localizeReportFreeText(pressure.summary),
          })),
          branches: reportCore.singleSubjectView.branches.map((branch) => ({
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            entryConditions: localizeProjectionList(branch.entryConditions || []),
            abortConditions: localizeProjectionList(branch.abortConditions || []),
            nextMove: localizeReportFreeText(branch.nextMove),
          })),
          entryConditions: localizeProjectionList(
            reportCore.singleSubjectView.entryConditions || []
          ),
          abortConditions: localizeProjectionList(
            reportCore.singleSubjectView.abortConditions || []
          ),
          nextMove: localizeReportFreeText(reportCore.singleSubjectView.nextMove),
          confidence: reportCore.singleSubjectView.confidence,
          reliability: reportCore.singleSubjectView.reliability
            ? {
                crossAgreement: reportCore.singleSubjectView.reliability.crossAgreement,
                contradictionFlags: localizeProjectionList(
                  reportCore.singleSubjectView.reliability.contradictionFlags || []
                ),
                notes: localizeProjectionList(reportCore.singleSubjectView.reliability.notes || []),
              }
            : undefined,
        }
      : undefined,
    personModel: reportCore.personModel
      ? {
          subject: localizeReportFreeText(reportCore.personModel.subject),
          overview: localizeReportFreeText(reportCore.personModel.overview),
          structuralCore: {
            ...reportCore.personModel.structuralCore,
            overview: localizeReportFreeText(reportCore.personModel.structuralCore.overview),
            latentAxes: localizeProjectionList(
              reportCore.personModel.structuralCore.latentAxes || []
            ),
          },
          formationProfile: {
            ...reportCore.personModel.formationProfile,
            summary: localizeReportFreeText(reportCore.personModel.formationProfile.summary),
            repeatedPatternFamilies: localizeProjectionList(
              reportCore.personModel.formationProfile.repeatedPatternFamilies || []
            ),
            dominantLatentGroups: localizeProjectionList(
              reportCore.personModel.formationProfile.dominantLatentGroups || []
            ),
            pressureHabits: localizeProjectionList(
              reportCore.personModel.formationProfile.pressureHabits || []
            ),
            supportHabits: localizeProjectionList(
              reportCore.personModel.formationProfile.supportHabits || []
            ),
          },
          timeProfile: {
            ...reportCore.personModel.timeProfile,
            timingNarrative: localizeReportFreeText(
              reportCore.personModel.timeProfile.timingNarrative
            ),
            windows: reportCore.personModel.timeProfile.windows.map((window) => ({
              ...window,
              label: localizeReportFreeText(window.label),
              window: localizeReportFreeText(window.window),
              granularity: localizeReportFreeText(window.granularity),
              whyNow: localizeReportFreeText(window.whyNow),
              entryConditions: localizeProjectionList(window.entryConditions || []),
              abortConditions: localizeProjectionList(window.abortConditions || []),
            })),
            activationSources: reportCore.personModel.timeProfile.activationSources.map(
              (source) => ({
                ...source,
                label: localizeReportFreeText(source.label),
              })
            ),
          },
          layers: reportCore.personModel.layers.map((layer) => ({
            ...layer,
            label: localizeReportFreeText(layer.label),
            summary: localizeReportFreeText(layer.summary),
            bullets: localizeProjectionList(layer.bullets || []),
          })),
          dimensions: reportCore.personModel.dimensions.map((dimension) => ({
            ...dimension,
            label: localizeReportFreeText(dimension.label),
            summary: localizeReportFreeText(dimension.summary),
          })),
          domainPortraits: reportCore.personModel.domainPortraits.map((portrait) => ({
            ...portrait,
            label: localizeReportFreeText(portrait.label),
            summary: localizeReportFreeText(portrait.summary),
            baselineThesis: localizeReportFreeText(portrait.baselineThesis),
            activationThesis: localizeReportFreeText(portrait.activationThesis),
            likelyExpressions: localizeProjectionList(portrait.likelyExpressions || []),
            riskExpressions: localizeProjectionList(portrait.riskExpressions || []),
            allowedActions: localizeProjectionList(portrait.allowedActions || []),
            blockedActions: localizeProjectionList(portrait.blockedActions || []),
          })),
          states: reportCore.personModel.states.map((state) => ({
            ...state,
            label: localizeReportFreeText(state.label),
            summary: localizeReportFreeText(state.summary),
            drivers: localizeProjectionList(state.drivers || []),
            counterweights: localizeProjectionList(state.counterweights || []),
          })),
          relationshipProfile: {
            ...reportCore.personModel.relationshipProfile,
            summary: localizeReportFreeText(reportCore.personModel.relationshipProfile.summary),
            partnerArchetypes: localizeProjectionList(
              reportCore.personModel.relationshipProfile.partnerArchetypes || []
            ),
            inflowPaths: localizeProjectionList(
              reportCore.personModel.relationshipProfile.inflowPaths || []
            ),
            commitmentConditions: localizeProjectionList(
              reportCore.personModel.relationshipProfile.commitmentConditions || []
            ),
            breakPatterns: localizeProjectionList(
              reportCore.personModel.relationshipProfile.breakPatterns || []
            ),
          },
          careerProfile: {
            ...reportCore.personModel.careerProfile,
            summary: localizeReportFreeText(reportCore.personModel.careerProfile.summary),
            suitableLanes: localizeProjectionList(
              reportCore.personModel.careerProfile.suitableLanes || []
            ),
            executionStyle: localizeProjectionList(
              reportCore.personModel.careerProfile.executionStyle || []
            ),
            hiringTriggers: localizeProjectionList(
              reportCore.personModel.careerProfile.hiringTriggers || []
            ),
            blockers: localizeProjectionList(reportCore.personModel.careerProfile.blockers || []),
          },
          futureBranches: reportCore.personModel.futureBranches.map((branch) => ({
            ...branch,
            label: localizeReportFreeText(branch.label),
            summary: localizeReportFreeText(branch.summary),
            conditions: localizeProjectionList(branch.conditions || []),
            blockers: localizeProjectionList(branch.blockers || []),
          })),
          evidenceLedger: {
            ...reportCore.personModel.evidenceLedger,
            coherenceNotes: localizeProjectionList(
              reportCore.personModel.evidenceLedger.coherenceNotes || []
            ),
            contradictionFlags: localizeProjectionList(
              reportCore.personModel.evidenceLedger.contradictionFlags || []
            ),
          },
        }
      : undefined,
    arbitrationBrief: reportCore.arbitrationBrief,
    latentTopAxes: reportCore.latentTopAxes,
    projections: {
      structure: {
        headline: lang === 'ko' ? '?? ??' : 'Structure Projection',
        summary: structureSummary,
        topAxes: reportCore.latentTopAxes.slice(0, 4).map((axis) => axis.label),
        detailLines: localizeProjectionList(reportCore.projections?.structure?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.structure?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.structure?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.structure?.nextMoves || []),
      },
      timing: {
        headline: lang === 'ko' ? '??? ??' : 'Timing Projection',
        summary: timingSummary,
        window: timingWindow?.window,
        granularity: timingWindow?.timingGranularity,
        detailLines: localizeProjectionList(reportCore.projections?.timing?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.timing?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.timing?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.timing?.nextMoves || []),
      },
      conflict: {
        headline: lang === 'ko' ? '?? ??' : 'Conflict Projection',
        summary: conflictSummary,
        detailLines: localizeProjectionList(reportCore.projections?.conflict?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.conflict?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.conflict?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.conflict?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? reportCore.arbitrationBrief.conflictReasons
                .slice(0, 3)
                .map((item) => localizeReportFreeText(item))
            : reportCore.arbitrationBrief.conflictReasons.slice(0, 3),
      },
      action: {
        headline: lang === 'ko' ? '?? ??' : 'Action Projection',
        summary:
          lang === 'ko'
            ? `${actionLabel}??? ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction}? ?? ?? ???????.`
            : `On the ${actionLabel} axis, ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction} is the live move.`,
        detailLines: localizeProjectionList(reportCore.projections?.action?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.action?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.action?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.action?.nextMoves || []),
        reasons: [
          reportCore.topDecisionLabel || reportCore.topDecisionId || '',
          ...(reportCore.judgmentPolicy.allowedActionLabels || []).slice(0, 2),
        ].filter(Boolean),
      },
      risk: {
        headline: lang === 'ko' ? '??? ??' : 'Risk Projection',
        summary:
          lang === 'ko'
            ? [
                localizeReportFreeText(reportCore.primaryCaution),
                localizeReportFreeText(reportCore.riskControl),
              ]
                .filter(Boolean)
                .join('. ')
            : `${reportCore.primaryCaution} ${reportCore.riskControl}`.trim(),
        detailLines: localizeProjectionList(reportCore.projections?.risk?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.risk?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.risk?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.risk?.nextMoves || []),
        reasons: [
          ...(reportCore.judgmentPolicy.blockedActionLabels || []).slice(0, 2),
          ...(reportCore.judgmentPolicy.hardStopLabels || []).slice(0, 2),
        ]
          .map((item) => (lang === 'ko' ? localizeReportFreeText(item) : item))
          .filter(Boolean),
      },
      evidence: {
        headline: lang === 'ko' ? '?? ??' : 'Evidence Projection',
        summary: evidenceSummary,
        detailLines: localizeProjectionList(reportCore.projections?.evidence?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.evidence?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.evidence?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.evidence?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? [
                reportCore.topSignalIds.length
                  ? `?? ?? ${reportCore.topSignalIds.slice(0, 3).length}?? ??? ?? ????.`
                  : '',
                reportCore.topPatternIds.length
                  ? `?? ?? ${reportCore.topPatternIds.slice(0, 2).length}?? ?? ???? ????.`
                  : '',
                reportCore.topScenarioIds.length
                  ? `?? ???? ${reportCore.topScenarioIds.slice(0, 2).length}?? ?? ??? ?????.`
                  : '',
              ].filter(Boolean)
            : [
                ...reportCore.topSignalIds.slice(0, 2),
                ...reportCore.topPatternIds.slice(0, 1),
                ...reportCore.topScenarioIds.slice(0, 1),
              ].filter(Boolean),
      },
      branches: {
        headline: lang === 'ko' ? '?? ??' : 'Branch Projection',
        summary:
          localizeReportFreeText(reportCore.projections?.branches?.summary) ||
          (lang === 'ko'
            ? '??? ??? ??? ?????? 2~3?? ?? ??? ??? ?? ????.'
            : 'Multiple realistic branches are open rather than one fixed outcome.'),
        window: reportCore.projections?.branches?.window,
        granularity: reportCore.projections?.branches?.granularity,
        detailLines: localizeProjectionList(reportCore.projections?.branches?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.branches?.drivers || []),
        counterweights: localizeProjectionList(
          reportCore.projections?.branches?.counterweights || []
        ),
        nextMoves: localizeProjectionList(reportCore.projections?.branches?.nextMoves || []),
        reasons: localizeProjectionList(reportCore.projections?.branches?.reasons || []),
      },
    },
    topDecisionId: reportCore.topDecisionId,
    topDecisionLabel: reportCore.topDecisionLabel,
    riskControl: reportCore.riskControl,
  }
}

function toObjectRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

type PersonalDaeunWindow = {
  startAge: number
  endAge: number
  element?: string
  ganji?: string
  isCurrent: boolean
}

function extractPersonalDaeunWindows(
  input: MatrixCalculationInput,
  timingData?: TimingData
): PersonalDaeunWindow[] {
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const windows: PersonalDaeunWindow[] = []
  const rawSnapshot = toObjectRecord(input.sajuSnapshot)
  const rawUnse = toObjectRecord(rawSnapshot?.unse)
  const rawDaeun = rawUnse?.daeun
  if (Array.isArray(rawDaeun)) {
    for (const item of rawDaeun) {
      const row = toObjectRecord(item)
      if (!row) continue
      const startAge =
        toFiniteNumber(row.startAge) ??
        toFiniteNumber(row.age) ??
        toFiniteNumber(row.start) ??
        toFiniteNumber(row.beginAge)
      if (startAge === null) continue
      const endAge =
        toFiniteNumber(row.endAge) ??
        toFiniteNumber(row.end) ??
        (Number.isFinite(startAge) ? startAge + 9 : null)
      if (endAge === null) continue
      const heavenlyStem = typeof row.heavenlyStem === 'string' ? row.heavenlyStem : ''
      const earthlyBranch = typeof row.earthlyBranch === 'string' ? row.earthlyBranch : ''
      const ganji =
        typeof row.ganji === 'string' && row.ganji
          ? row.ganji
          : `${heavenlyStem || ''}${earthlyBranch || ''}` || undefined
      const element =
        typeof row.element === 'string'
          ? row.element
          : heavenlyStem
            ? getElementByStemName(heavenlyStem)
            : undefined
      const isCurrent =
        row.current === true ||
        row.isCurrent === true ||
        (age !== null && age >= startAge && age <= endAge)
      windows.push({
        startAge,
        endAge,
        element,
        ganji,
        isCurrent,
      })
    }
  }

  if (windows.length === 0 && timingData?.daeun) {
    windows.push({
      startAge: timingData.daeun.startAge,
      endAge: timingData.daeun.endAge,
      element: timingData.daeun.element,
      ganji: `${timingData.daeun.heavenlyStem}${timingData.daeun.earthlyBranch}`,
      isCurrent:
        timingData.daeun.isCurrent ||
        (age !== null && age >= timingData.daeun.startAge && age <= timingData.daeun.endAge),
    })
  }

  return windows
    .sort((a, b) => a.startAge - b.startAge)
    .filter((item, index, array) => {
      const prev = array[index - 1]
      return !prev || prev.startAge !== item.startAge || prev.ganji !== item.ganji
    })
}

function buildPersonalLifeTimelineNarrative(
  input: MatrixCalculationInput,
  timingData: TimingData | undefined,
  lang: 'ko' | 'en'
): string {
  const windows = extractPersonalDaeunWindows(input, timingData)
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  if (windows.length === 0) return buildPersonalCycleNarrative(input, lang)
  const currentIndex = Math.max(
    0,
    windows.findIndex((item) => item.isCurrent)
  )
  const current = windows[currentIndex] || windows[0]
  const prev = currentIndex > 0 ? windows[currentIndex - 1] : null
  const next = currentIndex < windows.length - 1 ? windows[currentIndex + 1] : null
  const currentLabel = formatCycleLabel(
    current.ganji,
    current.element,
    lang,
    lang === 'ko' ? '?? ??' : 'current 10-year cycle'
  )
  if (lang !== 'ko') {
    const currentAgeLine =
      age !== null
        ? `At around age ${age}, the active 10-year cycle is ${current.startAge}-${current.endAge} (${currentLabel}).`
        : `The active 10-year cycle is ${current.startAge}-${current.endAge} (${currentLabel}).`
    const prevLine = prev
      ? `The previous ${prev.startAge}-${prev.endAge} cycle set the habits you are now either carrying forward or editing.`
      : ''
    const nextLine = next
      ? `The next ${next.startAge}-${next.endAge} cycle is likely to shift emphasis toward ${formatCycleLabel(
          next.ganji,
          next.element,
          lang,
          'a different operating mode'
        )}, so this period should be used to prepare that handoff.`
      : ''
    return [currentAgeLine, prevLine, nextLine].filter(Boolean).join(' ')
  }

  const currentAgeLine =
    age !== null
      ? `?? ${age}? ??? ?? ?? ??? ${current.startAge}-${current.endAge}? ??(${currentLabel})???. ? ??? ?? ??? ? ??? ???, ????????? ? ??? ?? ??? ??? ?? ??? ?????.`
      : `${current.startAge}-${current.endAge}? ??(${currentLabel})? ?? ?? ??? ?????. ? ??? ?? ??? ? ??? ???, ????????? ? ??? ?? ??? ??? ?? ??? ?????.`
  const prevLine = prev
    ? `${prev.startAge}-${prev.endAge}? ???? ??? ??? ?? ??? ?? ??? ???? ???. ??? ?? ??? ? ??? ?? ???, ?? ?? ? ??? ???? ??? ??? ?? ??? ????.`
    : ''
  const nextLine = next
    ? `?? ${next.startAge}-${next.endAge}? ??(${next.ganji || next.element || '?? ?? ??'})?? ???? ????, ?? ???? ??? ?? ??? ?? ??? ??? ??? ??? ?? ?? ?????.`
    : ''
  return [currentAgeLine, prevLine, nextLine].filter(Boolean).join(' ')
}

function calculateProfileAge(
  birthDate: string | undefined,
  currentDateIso: string | undefined
): number | null {
  if (!birthDate) return null
  const birth = new Date(birthDate)
  const current = currentDateIso ? new Date(currentDateIso) : new Date()
  if (Number.isNaN(birth.getTime()) || Number.isNaN(current.getTime())) return null
  let age = current.getUTCFullYear() - birth.getUTCFullYear()
  const currentMonthDay = current.toISOString().slice(5, 10)
  const birthMonthDay = birth.toISOString().slice(5, 10)
  if (currentMonthDay < birthMonthDay) age -= 1
  return age >= 0 ? age : null
}

function formatPlanetPlacement(
  input: MatrixCalculationInput,
  planet: 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn',
  lang: 'ko' | 'en'
): string {
  const sign = input.planetSigns?.[planet]
  const house = input.planetHouses?.[planet]
  if (!sign && !house) return ''
  if (lang === 'ko') {
    const planetLabel = localizePlanetName(planet, lang)
    const signLabel = localizeSignName(String(sign || ''), lang)
    if (sign && house)
      return `${planetLabel}${hasBatchim(planetLabel) ? '?' : '?'} ${signLabel} ${house}???? ?? ????`
    if (sign) return `${planetLabel}${hasBatchim(planetLabel) ? '?' : '?'} ${signLabel}? ?? ????`
    return `${planetLabel}${hasBatchim(planetLabel) ? '?' : '?'} ${house}???? ?? ????`
  }
  if (sign && house) return `${planet} in ${sign}, house ${house}`
  if (sign) return `${planet} in ${sign}`
  return `${planet} in house ${house}`
}

function buildPersonalCycleNarrative(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData?: TimingData
): string {
  if (lang === 'ko' && timingData?.daeun) {
    return buildPersonalLifeTimelineNarrative(input, timingData, lang)
  }
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const parts = [
    input.currentDaeunElement
      ? lang === 'ko'
        ? `?? ${input.currentDaeunElement}`
        : `Daeun ${getElementLabel(input.currentDaeunElement, lang)}`
      : '',
    input.currentSaeunElement
      ? lang === 'ko'
        ? `?? ${input.currentSaeunElement}`
        : `annual cycle ${getElementLabel(input.currentSaeunElement, lang)}`
      : '',
    input.currentWolunElement
      ? lang === 'ko'
        ? `?? ${input.currentWolunElement}`
        : `monthly cycle ${getElementLabel(input.currentWolunElement, lang)}`
      : '',
    input.currentIljinElement
      ? lang === 'ko'
        ? `?? ${input.currentIljinElement}`
        : `daily cycle ${getElementLabel(input.currentIljinElement, lang)}`
      : '',
  ].filter(Boolean)
  if (lang === 'ko') {
    const agePart = age !== null ? `?? ${age}? ??` : '?? ??'
    if (parts.length === 0) return `${agePart}? ??? ??? ??? ?? ?? ??? ??? ??? ?????.`
    const normalizedParts = parts.map((part) => {
      const [cycle, element] = part.split(' ')
      if (!cycle || !element) return part
      return `${withSubjectParticle(`${cycle} ${element}`)}`
    })
    return `${agePart}? ${normalizedParts.join(', ')} ?? ???? ?????. ? ??? ??? ???, ??? ??? ?? ?? ??? ?????.`
  }
  const agePart = age !== null ? `Around age ${age}` : 'At the current phase'
  if (parts.length === 0)
    return `${agePart}, timing inputs are present but the active cycle names are only weakly captured.`
  return `${agePart}, ${parts.join(', ')} are overlapping. The long climate is set by the larger cycle, and yearly/monthly cycles adjust what becomes tangible.`
}

function buildFocusedCycleLead(
  input: MatrixCalculationInput,
  timingData: TimingData | undefined,
  lang: 'ko' | 'en',
  focus: 'career' | 'wealth' | 'health' | 'lifeMission' | 'actionPlan' | 'conclusion'
): string {
  const windows = extractPersonalDaeunWindows(input, timingData)
  const current = windows.find((item) => item.isCurrent) || windows[0] || null
  const age = calculateProfileAge(input.profileContext?.birthDate, input.currentDateIso)
  const currentLabel =
    current && (current.ganji || current.element)
      ? `${current.ganji || ''}${current.element ? `(${current.element})` : ''}`
      : lang === 'ko'
        ? '?? ??'
        : 'current cycle'

  if (lang !== 'ko') {
    const agePrefix = age !== null ? `Around age ${age}, ` : 'At the current phase, '
    switch (focus) {
      case 'career':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} favors role clarity and priority control over broad expansion.`
      case 'wealth':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} rewards term checks and downside control before chasing upside.`
      case 'health':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} works better when recovery rhythm is protected before intensity.`
      case 'lifeMission':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} is a phase for refining standards you can carry into the next stage.`
      case 'actionPlan':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} is best managed by separating start, review, and commitment.`
      case 'conclusion':
        return `${agePrefix}${current ? `${current.startAge}-${current.endAge} (${currentLabel})` : currentLabel} puts more value on clean sequencing than fast commitment.`
    }
  }

  const agePrefix = age !== null ? `?? ${age}? ??? ` : '??? '
  const cycleLabel =
    current !== null ? `${current.startAge}-${current.endAge}? ??(${currentLabel})` : currentLabel
  switch (focus) {
    case 'career':
      return `${agePrefix}${cycleLabel} ?? ?? ?? ??? ????? ? ???? ??????? ??? ?????.`
    case 'wealth':
      return `${agePrefix}${cycleLabel} ?? ?? ?? ?? ????? ?? ???? ?? ??? ?? ?? ??? ?????.`
    case 'health':
      return `${agePrefix}${cycleLabel} ?? ?? ?? ?? ????? ?? ???? ?? ??? ?? ??? ?? ????.`
    case 'lifeMission':
      return `${agePrefix}${cycleLabel} ??? ?? ?? ???? ??? ??? ???? ?? ??? ??? ??? ? ??? ???.`
    case 'actionPlan':
      return `${agePrefix}${cycleLabel} ????? ??? ??-???-???? ???? ?? ???? ?????.`
    case 'conclusion':
      return `${agePrefix}${cycleLabel} ??? ??? ??? ???? ?? ??? ?? ??? ? ? ??? ???? ????.`
  }
}

function buildPersonalBaseNarrative(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const dayMaster = sanitizeEvidenceToken(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = sanitizeEvidenceToken(getElementLabel(input.yongsin, lang), lang)
  const western = sanitizeEvidenceToken(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const geokguk = sanitizeEvidenceToken(localizeGeokgukLabel(input.geokguk, lang), lang)

  if (lang === 'ko') {
    const parts = [
      dayMaster ? `?? ${dayMaster}` : '',
      geokguk ? `?? ${geokguk}` : '',
      yongsin ? `?? ${yongsin}` : '',
      western ? `?? ?? ${western}` : '',
    ].filter(Boolean)
    if (parts.length === 0) return '????? ?? ???? ?? ?? ??? ?? ??? ?? ?? ?? ????.'
    return `?? ????? ${parts.join(', ')} ??? ?? ??? ??? ????.`
  }

  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  if (parts.length === 0)
    return 'At the natal level, the base structure matters less than how the current phase is being activated.'
  return `At the natal level, ${parts.join(', ')} form the base layer behind the current reading.`
}

function buildSectionPersonalLead(
  section:
    | 'introduction'
    | 'personalityDeep'
    | 'careerPath'
    | 'relationshipDynamics'
    | 'wealthPotential'
    | 'healthGuidance'
    | 'lifeMission'
    | 'timingAdvice'
    | 'actionPlan'
    | 'conclusion',
  input: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData?: TimingData
): string {
  switch (section) {
    case 'introduction':
      return buildPersonalCycleNarrative(input, lang, timingData)
    case 'personalityDeep':
      return [
        buildPersonalBaseNarrative(input, lang),
        formatPlanetPlacement(input, 'Sun', lang),
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Mercury', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'careerPath':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'career'),
        formatPlanetPlacement(input, 'Jupiter', lang),
        formatPlanetPlacement(input, 'Saturn', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'relationshipDynamics':
      return [
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Venus', lang),
        formatPlanetPlacement(input, 'Mars', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'wealthPotential':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'wealth'),
        formatPlanetPlacement(input, 'Jupiter', lang),
        formatPlanetPlacement(input, 'Venus', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'healthGuidance':
      return [
        buildFocusedCycleLead(input, timingData, lang, 'health'),
        formatPlanetPlacement(input, 'Moon', lang),
        formatPlanetPlacement(input, 'Saturn', lang),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? '. ' : '. ')
    case 'lifeMission':
      return [
        buildPersonalBaseNarrative(input, lang),
        buildFocusedCycleLead(input, timingData, lang, 'lifeMission'),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? ' ' : ' ')
    case 'timingAdvice':
      return buildPersonalLifeTimelineNarrative(input, timingData, lang)
    case 'actionPlan':
      return buildFocusedCycleLead(input, timingData, lang, 'actionPlan')
    case 'conclusion':
      return [
        buildPersonalBaseNarrative(input, lang),
        buildFocusedCycleLead(input, timingData, lang, 'conclusion'),
      ]
        .filter(Boolean)
        .join(lang === 'ko' ? ' ' : ' ')
    default:
      return ''
  }
}

function buildNarrativeSectionFromCore(
  primary: Array<string | undefined | null>,
  supporting: Array<string | undefined | null>,
  base: string,
  lang: 'ko' | 'en',
  minChars: number,
  includeBase = false,
  allowBaseFallback = true
): string {
  const primaryLines = collectCleanNarrativeLines(primary, lang)
  const supportingLines = collectCleanNarrativeLines(supporting, lang)
  const baseLine = includeBase ? buildReportCoreLine(base, lang) : ''
  let out = primaryLines.join(' ').trim()

  if (baseLine && !out.includes(baseLine)) {
    out = out ? `${out} ${baseLine}` : baseLine
  }

  out = ensureLongSectionNarrative(out, minChars, supportingLines)
  if (allowBaseFallback && (!out || out.length < Math.floor(minChars * 0.7))) {
    out = ensureLongSectionNarrative(out, minChars, [sanitizeUserFacingNarrative(base)])
  }
  return formatNarrativeParagraphs(sanitizeUserFacingNarrative(out), lang)
}

function buildTimingWindowNarrative(
  domain: string,
  item: NonNullable<ReturnType<typeof findReportCoreTimingWindow>>,
  lang: 'ko' | 'en'
): string {
  const domainLabel = getReportDomainLabel(domain, lang)
  return describeHumanTimingWindowNarrative({
    domainLabel,
    window: item.window,
    whyNow: item.whyNow,
    entryConditions: item.entryConditions,
    abortConditions: item.abortConditions,
    timingGranularity: item.timingGranularity,
    precisionReason: item.precisionReason,
    timingConflictNarrative: item.timingConflictNarrative,
    lang,
  })
}

function buildManifestationNarrative(
  item: NonNullable<ReturnType<typeof findReportCoreManifestation>>,
  lang: 'ko' | 'en'
): string {
  const expressions = [...(item.likelyExpressions || []), ...(item.riskExpressions || [])]
  if (lang === 'ko') {
    return [item.baselineThesis, item.activationThesis, item.manifestation, ...expressions]
      .filter(Boolean)
      .join(' ')
  }
  return [item.baselineThesis, item.activationThesis, item.manifestation, ...expressions]
    .filter(Boolean)
    .join(' ')
}

function buildVerdictNarrative(
  item: NonNullable<ReturnType<typeof findReportCoreVerdict>>,
  lang: 'ko' | 'en'
): string {
  const allowed = (item.allowedActionLabels || item.allowedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  const blocked = (item.blockedActionLabels || item.blockedActions || [])
    .filter(Boolean)
    .slice(0, 2)
    .join(', ')
  if (lang === 'ko') {
    const parts = [
      item.rationale,
      allowed ? `?? ???? ???? ${allowed} ????.` : '',
      blocked ? `??? ${blocked}? ?? ???? ?? ?? ?? ????.` : '',
    ]
    return parts.filter(Boolean).join(' ')
  }
  const parts = [
    item.rationale,
    allowed ? `The moves currently allowed are ${allowed}.` : '',
    blocked ? `By contrast, ${blocked} should not be forced right now.` : '',
  ]
  return parts.filter(Boolean).join(' ')
}

function buildPrimaryActionLead(
  action: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(action, lang)
  if (!value) return fallback
  if (/[.!?]\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}? ?? ?? ?? ????.` : `Lean into ${value}.`
}

function buildPrimaryCautionLead(
  caution: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(caution, lang)
  if (!value) return fallback
  if (/[.!?]\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}? ?? ?? ?? ????.` : `Block ${value} first.`
}

function findReportCoreDomainVerdict(reportCore: ReportCoreViewModel, domain: string) {
  return reportCore.domainVerdicts.find((item) => item.domain === domain) || null
}

function formatScenarioIdForNarrative(
  scenarioId: string | null | undefined,
  lang: 'ko' | 'en'
): string {
  const value = String(scenarioId || '')
    .replace(/_window$/i, '')
    .replace(/_(main|alt|defensive)$/i, '')
    .trim()
  if (!value) return ''
  if (/(hidden|support|defensive|cluster|fallback|generic|alt|residual|residue)/i.test(value)) {
    return ''
  }

  const entries: Array<[RegExp, string, string]> = [
    [/promotion_review/i, '?? ??', 'promotion or role review'],
    [/contract_negotiation/i, '?? ??', 'contract negotiation'],
    [/manager_track/i, '??? ??', 'management-track expansion'],
    [/specialist_track/i, '??? ??', 'specialist-track deepening'],
    [/entry/i, '? ?? ??', 'entry into a new role'],
    [/distance_tuning/i, '?? ??', 'distance tuning'],
    [/boundary_reset/i, '?? ???', 'boundary reset'],
    [/commitment_preparation/i, '?? ??', 'commitment preparation'],
    [/clarify_expectations/i, '?? ??', 'expectation clarification'],
    [/commitment_execution/i, '?? ??', 'commitment execution'],
    [/cohabitation/i, '?? ??', 'cohabitation planning'],
    [/family_acceptance/i, '?? ??', 'family acceptance'],
    [/separation/i, '?? ??', 'relationship separation'],
    [/capital_allocation/i, '?? ?? ??', 'capital allocation review'],
    [/asset_exit/i, '?? ??', 'asset exit'],
    [/debt_restructure/i, '?? ????', 'debt restructuring'],
    [/income_growth/i, '?? ??', 'income growth'],
    [/liquidity_defense/i, '??? ??', 'liquidity defense'],
    [/recovery_reset/i, '?? ???', 'recovery reset'],
    [/routine_lock/i, '?? ??', 'routine lock'],
    [/burnout_trigger/i, '??? ??', 'burnout risk'],
    [/sleep_disruption/i, '?? ??', 'sleep disruption'],
    [/commute_restructure/i, '?? ?? ???', 'commute restructure'],
    [/route_recheck/i, '?? ???', 'route recheck'],
    [/basecamp_reset/i, '?? ???', 'basecamp reset'],
    [/lease_decision/i, '?? ?? ??', 'lease decision review'],
    [/housing_search/i, '?? ??', 'housing search'],
    [/relocation/i, '??', 'relocation'],
    [/learning_acceleration/i, '?? ??', 'learning acceleration'],
    [/deep_partnership_activation/i, '?? ?? ???', 'deep partnership activation'],
    [/timing_upside/i, '??? ?? ???', 'timing upside cluster'],
    [/timing_risk/i, '??? ?? ???', 'timing risk cluster'],
    [/health_risk/i, '?? ?? ???', 'health risk cluster'],
  ]

  for (const [pattern, ko, en] of entries) {
    if (pattern.test(value)) return lang === 'ko' ? ko : en
  }

  const normalized = value.replace(/_/g, ' ').trim()
  return lang === 'ko' ? normalized : normalized
}

function formatCycleLabel(
  ganji: string | undefined,
  element: string | undefined,
  lang: 'ko' | 'en',
  fallback: string
): string {
  const ganjiLabel = String(ganji || '').trim()
  const elementLabel = getElementLabel(element, lang)
  if (ganjiLabel && elementLabel) return `${ganjiLabel} (${elementLabel})`
  if (ganjiLabel) return ganjiLabel
  if (elementLabel) return elementLabel
  return fallback
}

function normalizeElementKey(element: string | undefined): string {
  const raw = String(element || '')
    .trim()
    .toLowerCase()
  const map: Record<string, string> = {
    wood: 'wood',

    fire: 'fire',

    earth: 'earth',

    metal: 'metal',

    water: 'water',
  }
  return map[raw] || raw
}

function buildElementMetaphor(
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): {
  archetype: string
  environment: string
  edge: string
  risk: string
} {
  const dayMaster = normalizeElementKey(input.dayMasterElement)
  switch (dayMaster) {
    case 'metal':
      return lang === 'ko'
        ? {
            archetype: '??? ???? ??',
            environment: '??? ??? ????? ???? ??',
            edge: '??? ???',
            risk: '???? ?? ??? ?? ? ?? ???? ?',
          }
        : {
            archetype: 'a blade that cuts noise away',
            environment: 'a scene where clutter gets stripped from a crowded stage',
            edge: 'clarity and clean cuts',
            risk: 'dulling the edge by deciding too fast',
          }
    case 'wood':
      return lang === 'ko'
        ? {
            archetype: '?? ??? ??? ? ??',
            environment: '??? ??? ???? ??? ??',
            edge: '??? ???',
            risk: '?? ?? ?? ???? ??? ?',
          }
        : {
            archetype: 'a tree that expands by taking more ground',
            environment: 'a scene where influence spreads like branches',
            edge: 'growth and extension',
            risk: 'adding branches before stabilizing the roots',
          }
    case 'water':
      return lang === 'ko'
        ? {
            archetype: '??? ?? ??? ??',
            environment: '?? ? ??? ?? ????? ??',
            edge: '??? ???',
            risk: '?? ?? ?? ??? ??? ?',
          }
        : {
            archetype: 'a current that finds the opening',
            environment: 'a scene where a path forms through narrow gaps',
            edge: 'adaptive penetration',
            risk: 'spreading too thin without a fixed direction',
          }
    case 'fire':
      return lang === 'ko'
        ? {
            archetype: '??? ?? ??? ??',
            environment: '??? ??? ? ??? ???? ???? ??',
            edge: '???? ???',
            risk: '?? ?? ?? ????? ??? ?',
          }
        : {
            archetype: 'a flame that lights the scene at once',
            environment: 'a moment that makes the whole stage visible',
            edge: 'visibility and momentum',
            risk: 'burning too hot and fading early',
          }
    default:
      return lang === 'ko'
        ? {
            archetype: '???? ?? ??? ??',
            environment: '??? ??? ??? ??? ???',
            edge: '???? ??',
            risk: '??? ????? ???? ??? ?',
          }
        : {
            archetype: 'a foundation that holds a shifting stage',
            environment: 'a support that keeps collapse from happening',
            edge: 'stability and structure',
            risk: 'delaying movement past the right timing',
          }
  }
}

function isMeaningfulEvidenceToken(value: string | undefined | null): boolean {
  const token = String(value || '').trim()
  if (!token) return false
  const normalized = token.toLowerCase()
  if (['?', '-', 'unknown', '??', 'none', 'n/a'].includes(normalized)) return false
  if (/^[?\s.-]+$/.test(token)) return false
  return true
}

function buildEvidenceLine(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const dayMaster = sanitizeEvidenceToken(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = sanitizeEvidenceToken(getElementLabel(input.yongsin, lang), lang)
  const western = sanitizeEvidenceToken(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const geokguk = sanitizeEvidenceToken(localizeGeokgukLabel(input.geokguk, lang), lang)
  if (lang === 'ko') {
    const parts = [
      dayMaster ? `?? ${dayMaster}` : '',
      geokguk ? `?? ${geokguk}` : '',
      yongsin ? `?? ${yongsin}` : '',
      western ? `?? ?? ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0 ? `${parts.join(', ')} ??? ?? ??? ?? ?? ??? ?? ??? ????.` : ''
  }
  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  return parts.length > 0
    ? `This reading comes from the same directional push across ${parts.join(', ')}.`
    : ''
}

function buildEvidenceFooter(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  const dayMaster = sanitizeEvidenceToken(getElementLabel(input.dayMasterElement, lang), lang)
  const yongsin = sanitizeEvidenceToken(getElementLabel(input.yongsin, lang), lang)
  const western = sanitizeEvidenceToken(
    getWesternElementLabel(input.dominantWesternElement, lang),
    lang
  )
  const geokguk = sanitizeEvidenceToken(localizeGeokgukLabel(input.geokguk, lang), lang)

  if (lang === 'ko') {
    const parts = [
      dayMaster ? `?? ${dayMaster}` : '',
      geokguk ? `?? ${geokguk}` : '',
      yongsin ? `?? ${yongsin}` : '',
      western ? `?? ?? ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0 ? `?? ??? ${parts.join(', ')}???.` : ''
  }

  const parts = [
    dayMaster ? `day master ${dayMaster}` : '',
    geokguk ? `frame ${geokguk}` : '',
    yongsin ? `useful element ${yongsin}` : '',
    western ? `dominant western element ${western}` : '',
  ].filter(Boolean)
  return parts.length > 0
    ? normalizeNarrativeCoreText(`Key grounding comes from ${parts.join(', ')}.`, lang)
    : ''
}

function appendEvidenceFooter(
  body: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const evidence = buildEvidenceFooter(input, lang)
  if (!evidence) return body
  return `${body} ${evidence}`.trim()
}

function sanitizeNarrativeReason(
  value: string | null | undefined,
  lang: 'ko' | 'en',
  fallback = ''
): string {
  const text = String(value || '').trim()
  if (!text) return fallback
  return normalizeNarrativeCoreText(text, lang) || fallback
}

function buildReportTrustNarratives(
  reportCore: ReportCoreViewModel,
  coreQuality: DestinyCoreQuality | undefined,
  lang: 'ko' | 'en'
): { trust: string; provenance: string } {
  return buildReportTrustNarrativesExternal(
    reportCore,
    coreQuality,
    lang,
    reportSectionRendererDeps
  )
}

function attachTrustNarrativeToSections<T extends Record<string, unknown>>(
  mode: 'comprehensive' | 'timing' | 'themed',
  sections: T,
  trust: string,
  provenance: string
): T {
  return attachTrustNarrativeToSectionsExternal(mode, sections, trust, provenance)
}

function renderIntroductionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const base = renderIntroductionSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps
  )
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const focusRunnerUpLabel = reportCore.arbitrationBrief?.focusRunnerUpDomain
    ? getReportDomainLabel(reportCore.arbitrationBrief.focusRunnerUpDomain, lang)
    : ''
  const arbitrationLine =
    lang === 'ko'
      ? reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `?? ??? ?? ?? ?? ${actionLabel}??, ?? ?? ??? ? ?? ? ?? ?? ???.`
        : focusRunnerUpLabel
          ? `${focusLabel} ??? ${focusRunnerUpLabel}?? ?? ?? ??? ??? ? ??? ??? ????.`
          : ''
      : reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `${actionLabel} is the axis that answers the question most directly, and it is carrying the actionable pressure in this phase.`
        : focusRunnerUpLabel
          ? `${focusLabel} stayed ahead of ${focusRunnerUpLabel} as the lead axis in this phase.`
          : ''
  const latentLine = reportCore.latentTopAxes?.length
    ? lang === 'ko'
      ? `?? ? ??? ?? ?? ?? ?? ${reportCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}???.`
      : `The strongest active layers right now are ${reportCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}.`
    : ''
  const riskAxisLine = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `??? ?? ???? ???? ? ??? ${reportCore.riskAxisLabel}???.`
      : `At the same time, the most sensitive risk axis is ${reportCore.riskAxisLabel}.`
    : ''
  const timingMatrixLine = reportCore.timingMatrix?.length
    ? lang === 'ko'
      ? `???? ?? ?? ?? ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')} ??? ????.`
      : `By domain, windows split as ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}.`
    : ''
  const structureProjection = reportCore.projections?.structure
  const structureDetailLine = localizeReportNarrativeText(
    structureProjection?.detailLines?.[0] || '',
    lang
  )
  const structureBackgroundLine =
    reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
      ? lang === 'ko'
        ? `${focusLabel} ??? ? ??? ??? ?? ?? ???? ??? ????.`
        : `${focusLabel} remains the background structural axis behind this reading.`
      : ''
  const structureDriversLine = structureProjection?.drivers?.length
    ? lang === 'ko'
      ? `?? ??? ?? ?? ?? ??? ${structureProjection.drivers
          .slice(0, 3)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')}???.`
      : `The direct structural drivers are ${structureProjection.drivers.slice(0, 3).join(', ')}.`
    : ''
  const structureCounterweightLine =
    reportCore.arbitrationBrief?.suppressionNarratives?.length ||
    structureProjection?.counterweights?.length
      ? lang === 'ko'
        ? `?? ${(reportCore.arbitrationBrief?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || []
          )
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(' ??? ')} ?? ?? ??? ?? ????.`
        : `Counterweights are still coming from ${(reportCore.arbitrationBrief
            ?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || []
          )
            .slice(0, 2)
            .join(', ')}.`
      : ''
  const branchProjection = reportCore.projections?.branches
  const branchLeadLine = localizeReportNarrativeText(branchProjection?.detailLines?.[0] || '', lang)
  return [
    arbitrationLine,
    latentLine,
    structureDetailLine,
    structureBackgroundLine,
    structureDriversLine,
    structureCounterweightLine,
    branchLeadLine,
    riskAxisLine,
    timingMatrixLine,
    base,
  ]
    .filter(Boolean)
    .join(' ')
}

function renderLifeMissionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderLifeMissionSectionExternal(reportCore, matrixInput, lang, reportSectionRendererDeps)
}

function renderPersonalityDeepSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderPersonalityDeepSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps
  )
}

function renderTimingAdviceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  matrixSummary?: MatrixSummary
): string {
  const base = renderTimingAdviceSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps,
    matrixSummary
  )
  const timingProjection = reportCore.projections?.timing
  const preferredTimingRow =
    reportCore.timingMatrix?.find(
      (row) => row.domain === (reportCore.actionFocusDomain || reportCore.focusDomain)
    ) || reportCore.timingMatrix?.[0]
  const timingDetailLine = localizeReportNarrativeText(
    preferredTimingRow?.summary || timingProjection?.detailLines?.[0] || '',
    lang
  )
  const timingDriverLine = timingProjection?.drivers?.length
    ? lang === 'ko'
      ? `?? ?? ?? ?? ?? ?? ${timingProjection.drivers
          .slice(0, 3)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')}???.`
      : `The live timing drivers are ${timingProjection.drivers.slice(0, 3).join(', ')}.`
    : ''
  const timingCounterweightLine = timingProjection?.counterweights?.length
    ? lang === 'ko'
      ? `??? ${timingProjection.counterweights
          .slice(0, 2)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')} ?? ??? ??? ??? ??? ?? ??? ???.`
      : `Counterweights still come from ${timingProjection.counterweights.slice(0, 2).join(', ')}.`
    : ''
  const timingNextLine = timingProjection?.nextMoves?.length
    ? buildProjectionMoveSentence(
        timingProjection.nextMoves.slice(0, 2),
        lang,
        lang === 'ko'
          ? '?? ???? ???? ?? ??? ?? ?? ?? ?? ?? ????.'
          : 'To use this timing well, realign the live execution conditions first.'
      )
    : ''
  const timingMatrixLine = reportCore.timingMatrix?.length
    ? lang === 'ko'
      ? `???? ?? ?? ?? ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')} ???? ????.`
      : `Across domains, timing splits into ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}.`
    : ''
  const branchProjection = reportCore.projections?.branches
  const branchTimingLine =
    localizeReportNarrativeText(branchProjection?.detailLines?.[0] || '', lang) ||
    (branchProjection?.summary && lang === 'ko'
      ? `??? ??? ??? ? ??? ?????? ${localizeReportNarrativeText(branchProjection.summary, lang)}`
      : localizeReportNarrativeText(branchProjection?.summary || '', lang) || '')
  const enriched = [
    timingDetailLine,
    timingDriverLine,
    timingCounterweightLine,
    timingNextLine,
    timingMatrixLine,
    branchTimingLine,
  ].filter(Boolean)
  return sanitizeUserFacingNarrative(
    [...enriched, ...(enriched.length < 4 ? [base] : [])].filter(Boolean).join(' ')
  )
}

function renderActionPlanSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  void matrixInput
  const base = renderActionPlanSectionExternal(reportCore, lang, reportSectionRendererDeps)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const topDecisionLabel = reportCore.topDecisionLabel || reportCore.primaryAction
  const openingLine =
    lang === 'ko'
      ? `?? ${actionLabel} ?? ??? ${topDecisionLabel}???.`
      : `The operating rule on the ${actionLabel} axis is ${topDecisionLabel}.`
  const guardrailLine = reportCore.riskControl
  const actionProjection = reportCore.projections?.action
  const actionDriverLabels = collectProjectionDriverLabels(actionProjection?.drivers, lang)
  const actionDriverLine = actionDriverLabels.length
    ? lang === 'ko'
      ? `?? ??? ??? ?? ${actionDriverLabels.join(', ')}???.`
      : `The current execution drivers are ${actionDriverLabels.join(', ')}.`
    : ''
  const actionCounterweightLine = actionProjection?.counterweights?.length
    ? lang === 'ko'
      ? `${actionProjection.counterweights
          .slice(0, 2)
          .map((item) => localizeReportNarrativeText(item, lang))
          .join(', ')} ?? ??? ??? ???? ??? ?? ??? ???.`
      : `${actionProjection.counterweights.slice(0, 2).join(', ')} still signal that pace should stay controlled.`
    : ''
  const actionNextLine = actionProjection?.nextMoves?.length
    ? buildProjectionMoveSentence(
        actionProjection.nextMoves.slice(0, 2),
        lang,
        lang === 'ko'
          ? '?? ???? ?? ??? ?? ??? ?? ???? ?? ???? ?? ????.'
          : 'The next move should begin by resetting execution criteria in smaller steps.'
      )
    : ''
  const riskAxisLine = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `??? ???? ${reportCore.riskAxisLabel} ?? ?? ??? ??? ???? ???.`
      : `Even while acting, ${reportCore.riskAxisLabel} should be managed as the primary risk axis first.`
    : ''
  const branchProjection = reportCore.projections?.branches
  const branchActionLine = branchProjection?.nextMoves?.length
    ? buildProjectionMoveSentence(
        branchProjection.nextMoves.slice(0, 2),
        lang,
        lang === 'ko'
          ? '?? ?? ????? ?? ?? ??? ???? ?? ???? ?? ????.'
          : 'Across the live branches, reset criteria and guardrails before execution.'
      )
    : ''
  const enriched = [
    openingLine,
    actionDriverLine,
    actionCounterweightLine,
    actionNextLine,
    riskAxisLine,
    branchActionLine,
    guardrailLine,
  ].filter(Boolean)
  return sanitizeUserFacingNarrative(
    [...enriched, ...(enriched.length < 5 ? [base] : [])].filter(Boolean).join(' ')
  )
}

function renderCareerPathSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderCareerPathSectionExternal(reportCore, matrixInput, lang, reportSectionRendererDeps)
}

function renderRelationshipDynamicsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderRelationshipDynamicsSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps
  )
}

function renderWealthPotentialSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderWealthPotentialSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps
  )
}

function renderConclusionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const base = renderConclusionSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps
  )
  const riskAxisLine = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `????? ?? ???? ???? ? ?? ${reportCore.riskAxisLabel}???.`
      : `The axis that must be managed most carefully through the close is ${reportCore.riskAxisLabel}.`
    : ''
  const branchLine = reportCore.projections?.branches?.detailLines?.[0] || ''
  return sanitizeUserFacingNarrative([riskAxisLine, branchLine, base].filter(Boolean).join(' '))
}

function renderHealthGuidanceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderHealthGuidanceSectionExternal(
    reportCore,
    matrixInput,
    lang,
    reportSectionRendererDeps
  )
}

function renderComprehensiveSpouseProfileSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const riskLabel =
    reportCore.riskAxisLabel || getReportDomainLabel(reportCore.riskAxisDomain, lang)

  if (lang === 'ko') {
    return formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          '오래 가는 관계는 감정의 세기보다 생활 리듬, 책임감, 속도를 함께 맞출 수 있는 사람과의 관계에서 나옵니다. 당신은 설렘이 커도 기준이 맞지 않으면 오래 버티지 않는 편이고, 반대로 속도와 기준이 맞는 관계에서는 깊이를 천천히 키워 갑니다.',
          `지금 삶의 전면에 ${actionLabel} 문제가 올라와 있기 때문에, 관계 역시 말보다 실제 일정과 책임을 함께 운영할 수 있는 사람이 더 잘 맞습니다. 함께 시간을 쓰는 방식, 약속을 지키는 방식, 서로의 일을 존중하는 태도가 중요합니다.`,
          '배우자상으로 보면 겉으로 화려한 사람보다 기준이 분명하고, 감정이 흔들릴 때도 생활을 무너뜨리지 않는 사람이 더 맞습니다. 대화가 잘 되는 것만큼이나 속도 조절과 경계 감각이 맞는지가 핵심입니다.',
          riskLabel
            ? `${riskLabel} 문제가 예민해질수록 관계도 감정적으로 몰입하기보다 서로의 리듬을 보호해 줄 수 있는지가 더 중요해집니다. 같이 있을 때 편해지는 사람, 무리한 속도를 강요하지 않는 사람이 오래 갑니다.`
            : '관계는 결론을 서두르는 사람보다, 서로의 속도와 경계를 먼저 맞추는 사람과 더 안정적으로 깊어집니다.',
        ].join(' ')
      ),
      lang
    )
  }

  return formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        'Long-term partner fit depends less on intensity and more on pace, responsibility, and the ability to keep shared standards.',
        `Because ${actionLabel} is on the front line of life right now, relationship fit also has to survive real scheduling, pressure, and obligation.`,
        `When ${riskLabel} becomes sensitive, the better match is the person who can protect rhythm and trust, not just chemistry.`,
      ].join(' ')
    ),
    lang
  )
}

function renderComprehensiveLifeStagesSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  matrixSummary?: MatrixSummary
): string {
  const age = calculateProfileAge(matrixInput.profileContext?.birthDate, matrixInput.currentDateIso)
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )

  if (lang === 'ko') {
    const stageLead =
      age === null
        ? '지금 구간은 기준을 다시 세우고 삶의 우선순위를 정리해야 하는 시기로 읽힙니다.'
        : age < 20
          ? '초년기에는 주변 환경 안에서 배운 기준이 성격과 선택의 바탕이 되는 흐름이 강합니다.'
          : age < 35
            ? '청년기에는 관계와 현실 조건이 삶의 배경을 흔들고, 실제로는 자기 자리를 만드는 쪽에서 방향이 정해집니다.'
            : age < 55
              ? '중년기에는 지금 세우는 기준이 평판과 성과로 굳어지면서, 무엇을 맡고 무엇을 줄일지의 판단이 더 중요해집니다.'
              : '후반부로 갈수록 더 넓히는 것보다 무엇을 남기고 무엇을 정리할지를 아는 힘이 삶의 안정성을 만듭니다.'

    return formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          '이 사람의 삶은 한 번에 뒤집히는 사건보다, 시기마다 무엇을 기준으로 선택하느냐에 따라 방향이 분명하게 갈리는 구조입니다. 그래서 생애 흐름도 감정의 파도보다 기준의 변화로 읽는 편이 정확합니다.',
          `${focusLabel} 문제는 삶의 배경에서 계속 작동하고, 실제로 손을 대고 움직이게 만드는 쪽은 ${actionLabel} 영역으로 모입니다. ${stageLead}`,
          '초년기에는 주변 환경이 준 기준을 배우는 시간이 길고, 청년기에는 사람과 현실 조건을 동시에 맞추면서 자기 자리를 만들게 됩니다. 이후에는 지금 세운 기준이 성과와 평판으로 굳어질 가능성이 큽니다.',
          `예를 들어, 지금 세우는 ${actionLabel} 기준은 앞으로 더 큰 선택을 할 때 흔들리지 않는 뼈대가 됩니다. 지금 대충 넘긴 문제는 나중에 더 큰 비용으로 돌아올 수 있습니다.`,
        ].join(' ')
      ),
      lang
    )
  }

  return formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        'Early life is shaped less by emotion itself and more by the standards learned inside the surrounding environment.',
        `In young adulthood, ${focusLabel} keeps setting the background while ${actionLabel} is where real positioning happens.`,
        'Midlife turns today’s standards into reputation, structure, and durable consequence.',
        'Later life rewards discernment: knowing what to keep, what to reduce, and what should outlast the current phase.',
      ].join(' ')
    ),
    lang
  )
}

function renderComprehensiveTurningPointsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const branches = (reportCore.branchSet || []).slice(0, 3)
  const branchLabels = branches
    .map((branch) =>
      sanitizeUserFacingNarrative(
        localizeReportNarrativeText(branch.label || branch.summary || '', lang)
      )
    )
    .filter(Boolean)

  if (lang === 'ko') {
    return formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `이 사람의 큰 변곡점은 감정 하나로 뒤집히기보다, 현실에서 맡는 역할과 조건을 다시 정리해야 할 때 강하게 들어옵니다. 가장 직접적인 변곡점은 ${actionLabel} 문제를 어떻게 다루느냐에 달려 있습니다.`,
          '그래서 변화는 한 사건으로 오기보다 일, 사람, 돈의 조건이 동시에 재배열되는 식으로 들어올 가능성이 큽니다. 무엇을 계속 가져가고 무엇을 끊어낼지 결정해야 할 때가 바로 변곡점입니다.',
          branchLabels.length > 0
            ? `현실적으로는 ${branchLabels.join(', ')} 같은 경로를 비교하면서 판이 갈릴 가능성이 큽니다. 한 방향만 정답처럼 밀기보다 여러 경로를 놓고 손실과 되돌림 비용을 함께 봐야 합니다.`
            : '현실적인 분기점은 하나의 정답보다 몇 가지 가능한 경로를 비교하는 과정에서 열릴 가능성이 큽니다.',
          '결국 변곡점의 본질은 속도를 올리는 데 있지 않습니다. 지금까지의 기준으로 더는 버틸 수 없을 때, 무엇을 새 기준으로 삼을지 결정하는 데 있습니다.',
        ].join(' ')
      ),
      lang
    )
  }

  return formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        `The strongest turning points arrive where ${actionLabel} has to be reorganized first.`,
        'The shift is more likely to arrive as a reordering of role, people, and conditions than as a single dramatic event.',
        branchLabels.length > 0
          ? `Realistically, the choice will narrow through paths such as ${branchLabels.join(', ')}.`
          : 'The turning point will likely open through comparison rather than a single obvious answer.',
      ].join(' ')
    ),
    lang
  )
}

function renderComprehensiveFutureOutlookSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  const matrixRow = (reportCore.matrixView || []).find(
    (row) => row.domain === (reportCore.actionFocusDomain || reportCore.focusDomain)
  )
  const topBranches = (reportCore.branchSet || []).slice(0, 3)
  const riskLabel =
    reportCore.riskAxisLabel || getReportDomainLabel(reportCore.riskAxisDomain, lang)

  if (lang === 'ko') {
    const timingLine = matrixRow?.cells?.length
      ? (() => {
          const cells = matrixRow.cells.slice(0, 3)
          const avgAgreement =
            cells.reduce((sum, cell) => sum + (cell.agreement || 0), 0) / Math.max(1, cells.length)
          const avgContradiction =
            cells.reduce((sum, cell) => sum + (cell.contradiction || 0), 0) /
            Math.max(1, cells.length)
          if (avgAgreement >= 0.82 && avgContradiction <= 0.18) {
            return '가까운 시기부터 중기까지는 전반적으로 흐름이 잘 맞는 편이라, 조건만 맞추면 실제 성과로 이어질 가능성이 큽니다.'
          }
          if (avgContradiction >= 0.3) {
            return '앞으로 몇 년은 기회와 부담이 함께 들어올 수 있으니, 무리하게 넓히기보다 감당 가능한 범위를 먼저 정하는 편이 맞습니다.'
          }
          return '앞으로 몇 년은 열려 있는 흐름이 이어지지만, 속도 조절과 기준 관리가 결과를 더 크게 가를 가능성이 큽니다.'
        })()
      : ''
    const branchLine =
      topBranches.length > 0
        ? `현실적인 경로는 ${topBranches
            .map((branch) =>
              sanitizeUserFacingNarrative(
                localizeReportNarrativeText(branch.label || branch.summary || '', lang)
              )
            )
            .filter(Boolean)
            .join(
              ', '
            )} 쪽으로 열려 있습니다. 한 번에 확정하기보다 비교 가능한 경로부터 좁혀가는 편이 맞습니다.`
        : ''

    return formatNarrativeParagraphs(
      sanitizeUserFacingNarrative(
        [
          `앞으로 3~5년은 한 번의 큰 승부보다, 반복 가능한 기준을 만드는 사람이 더 멀리 갑니다. 실제로 판을 움직이는 중심은 ${getReportDomainLabel(reportCore.actionFocusDomain || reportCore.focusDomain, lang)} 쪽입니다.`,
          timingLine,
          branchLine,
          riskLabel
            ? `다만 앞으로 3~5년 동안도 ${riskLabel} 관리를 놓치면 좋은 기회가 소모로 바뀔 수 있습니다. 결과는 능력만이 아니라 회복과 운영의 안정성에 크게 좌우됩니다.`
            : '',
        ].join(' ')
      ),
      lang
    )
  }

  return formatNarrativeParagraphs(
    sanitizeUserFacingNarrative(
      [
        'Over the next three to five years, repeatable standards matter more than one dramatic move.',
        matrixRow?.cells?.length
          ? matrixRow.cells
              .slice(0, 3)
              .map((cell) =>
                sanitizeUserFacingNarrative(localizeReportNarrativeText(cell.summary || '', lang))
              )
              .filter(Boolean)
              .join(' / ')
          : '',
        topBranches.length > 0
          ? `The realistic paths are ${topBranches
              .map((branch) =>
                sanitizeUserFacingNarrative(
                  localizeReportNarrativeText(branch.label || branch.summary || '', lang)
                )
              )
              .filter(Boolean)
              .join(', ')}.`
          : '',
        riskLabel ? `Longer-term results depend heavily on how well ${riskLabel} is managed.` : '',
      ].join(' ')
    ),
    lang
  )
}

function buildExtendedComprehensiveSections(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  matrixSummary?: MatrixSummary
): AIPremiumReport['sections'] {
  const forceDeterministicOptionalLifeSections = isCostOptimizedAiPath()
  return {
    ...sections,
    spouseProfile:
      (!forceDeterministicOptionalLifeSections && sections.spouseProfile) ||
      renderComprehensiveSpouseProfileSection(reportCore, matrixInput, lang),
    lifeStages:
      (!forceDeterministicOptionalLifeSections && sections.lifeStages) ||
      renderComprehensiveLifeStagesSection(reportCore, matrixInput, lang, matrixSummary),
    turningPoints:
      (!forceDeterministicOptionalLifeSections && sections.turningPoints) ||
      renderComprehensiveTurningPointsSection(reportCore, matrixInput, lang),
    futureOutlook:
      (!forceDeterministicOptionalLifeSections && sections.futureOutlook) ||
      renderComprehensiveFutureOutlookSection(reportCore, matrixInput, lang),
  }
}

function getComprehensiveRenderPaths(sections: Partial<AIPremiumReport['sections']>): string[] {
  return [
    ...COMPREHENSIVE_SECTION_KEYS,
    ...COMPREHENSIVE_OPTIONAL_LIFE_SECTION_KEYS.filter((key) => {
      const value = sections[key]
      return typeof value === 'string' && value.trim().length > 0
    }),
  ]
}

function shouldForceComprehensiveNarrativeFallback(
  quality: ReportQualityMetrics | undefined
): boolean {
  if (!quality) return false
  return Boolean(
    (quality.crossSectionRepetition || 0) >= 3 ||
    (quality.genericAdviceDensity || 0) >= 0.5 ||
    (quality.internalScenarioLeakCount || 0) > 0
  )
}

function enforceComprehensiveNarrativeQualityFallback(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): AIPremiumReport['sections'] {
  const next: AIPremiumReport['sections'] = { ...sections }
  next.introduction = renderIntroductionSection(reportCore, matrixInput, lang)
  next.personalityDeep = renderPersonalityDeepSection(reportCore, matrixInput, lang)
  next.lifeMission = renderLifeMissionSection(reportCore, matrixInput, lang)
  next.careerPath = renderCareerPathSection(reportCore, matrixInput, lang)
  next.relationshipDynamics = renderRelationshipDynamicsSection(reportCore, matrixInput, lang)
  next.wealthPotential = renderWealthPotentialSection(reportCore, matrixInput, lang)
  next.healthGuidance = renderHealthGuidanceSection(reportCore, matrixInput, lang)
  next.timingAdvice = renderTimingAdviceSection(reportCore, matrixInput, lang)
  next.actionPlan = renderActionPlanSection(reportCore, matrixInput, lang)
  next.conclusion = renderConclusionSection(reportCore, matrixInput, lang)
  return sanitizeComprehensiveSectionsForUser(
    next as unknown as Record<string, unknown>,
    [...COMPREHENSIVE_SECTION_KEYS],
    comprehensivePostProcessDeps,
    lang
  ) as AIPremiumReport['sections']
}

function shouldForceThemedNarrativeFallback(quality: ReportQualityMetrics | undefined): boolean {
  if (!quality) return false
  return Boolean(
    (quality.crossSectionRepetition || 0) >= 3 ||
    (quality.genericAdviceDensity || 0) >= 0.5 ||
    (quality.internalScenarioLeakCount || 0) > 0 ||
    ((quality.personalizationDensity || 0) > 0 && (quality.personalizationDensity || 0) < 0.8)
  )
}

function joinNarrativeParts(parts: Array<string | null | undefined>): string {
  return sanitizeUserFacingNarrative(
    parts
      .map((part) => String(part || '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
  )
}

function toSentenceCaseNarrativeLine(text: string, lang: 'ko' | 'en'): string {
  const normalized = sanitizeUserFacingNarrative(localizeReportNarrativeText(text, lang))
    .replace(/\s+/g, ' ')
    .trim()
  if (!normalized) return ''
  if (/[.!?]$/u.test(normalized)) return normalized
  return lang === 'ko' ? `${normalized}.` : `${normalized}.`
}

function buildProjectionMoveSentence(
  moves: string[] | undefined,
  lang: 'ko' | 'en',
  fallback: string
): string {
  const first = String(moves?.[0] || '').trim()
  if (!first) return ''
  const normalized = toSentenceCaseNarrativeLine(first, lang)
  return normalized || fallback
}

function collectProjectionDriverLabels(
  items: string[] | undefined,
  lang: 'ko' | 'en',
  limit = 2
): string[] {
  return (items || [])
    .map((item) => sanitizeUserFacingNarrative(localizeReportNarrativeText(item, lang)).trim())
    .filter(Boolean)
    .filter((item) => !/(recommended|recommend|caution|warning|recheck|verify)$/i.test(item))
    .filter((item) => item.length <= 24)
    .slice(0, limit)
}

function buildProjectionFirstThemedSections(
  theme: ReportTheme,
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData: TimingData | undefined
): ThemedReportSections {
  const outputCore = buildReportOutputCoreFields(reportCore, lang)
  const projections = outputCore.projections
  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(actionDomain, lang)
  const riskLabel = reportCore.riskAxisLabel || (lang === 'ko' ? '??' : 'health')

  const clean = (value: string | undefined): string =>
    sanitizeUserFacingNarrative(localizeReportNarrativeText(String(value || ''), lang)).trim()

  const focusTiming = findReportCoreTimingWindow(reportCore, actionDomain)
  const branchSet = (reportCore.branchSet || []).slice(0, 3)
  const matrixRows = reportCore.matrixView || []
  const actionMatrixRow = matrixRows.find((row) => row.domain === actionDomain) || matrixRows[0]
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const wealthAdvisory = findReportCoreAdvisory(reportCore, 'wealth')
  const healthAdvisory = findReportCoreAdvisory(reportCore, 'health')

  const paragraph = (...parts: Array<string | undefined>): string =>
    joinNarrativeParts(parts.map((part) => clean(part)).filter(Boolean))

  const listText = (values: string[] | undefined): string => {
    const cleaned = (values || []).map((value) => clean(value)).filter(Boolean)
    return cleaned.join(lang === 'ko' ? ', ' : ', ')
  }

  const structureSummary = clean(projections?.structure?.summary || reportCore.thesis)
  const structureDetail = clean(projections?.structure?.detailLines?.[0] || '')
  const actionSummary = clean(projections?.action?.summary || reportCore.primaryAction)
  const actionDetail = clean(projections?.action?.detailLines?.[0] || '')
  const riskSummary = clean(projections?.risk?.summary || reportCore.riskControl)
  const timingSummary = clean(projections?.timing?.summary || reportCore.gradeReason)
  const timingDetail = clean(projections?.timing?.detailLines?.[0] || '')
  const conflictSummary = clean(projections?.conflict?.summary || reportCore.primaryCaution)
  const evidenceSummary = clean(
    projections?.evidence?.summary || reportCore.judgmentPolicy.rationale
  )

  const windowNarrative = focusTiming
    ? clean(buildTimingWindowNarrative(actionDomain, focusTiming, lang))
    : lang === 'ko'
      ? '??? ?? ????? ????? ??? ?????.'
      : 'This phase is better used to confirm direction before locking decisions.'

  const firstBranch = branchSet[0]
  const branchEntry = clean((firstBranch?.entry || []).join(', '))
  const branchAbort = clean((firstBranch?.abort || []).join(', '))
  const branchRisk = clean(firstBranch?.reversalRisk || firstBranch?.wrongMoveCost || '')
  const branchLead = branchSet
    .map((branch, index) => `${index + 1}. ${clean(branch.summary || branch.label || '')}`)
    .filter((line) => !/^[0-9]+\.\s*$/.test(line))
    .join('\n')

  const matrixSummary = actionMatrixRow
    ? lang === 'ko'
      ? `${actionLabel} ?? ${clean(
          actionMatrixRow.cells
            .map((cell) => cell.summary)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')
        )}`
      : `${actionLabel} currently reads as ${clean(
          actionMatrixRow.cells
            .map((cell) => cell.summary)
            .filter(Boolean)
            .slice(0, 2)
            .join(', ')
        )}`
    : ''

  const timingDrivers = listText(projections?.timing?.drivers)
  const actionMoves = listText(projections?.action?.nextMoves)
  const riskCounters = listText(projections?.risk?.counterweights)
  const structureDrivers = listText(projections?.structure?.drivers)

  const sharedDeepAnalysis =
    lang === 'ko'
      ? paragraph(
          `${focusLabel}? ?? ??? ???, ?? ??? ???? ? ?? ${actionLabel}???.`,
          structureSummary || structureDetail,
          structureDrivers ? `${actionLabel} ??? ??? ???? ??? ${structureDrivers}???.` : '',
          `${riskLabel} ??? ?? ???? ?? ??? ???? ????.`
        )
      : paragraph(
          `${focusLabel} forms the background while ${actionLabel} is the front line that actually changes outcomes.`,
          structureSummary || structureDetail,
          structureDrivers ? `${actionLabel} is being supported by ${structureDrivers}.` : '',
          `${riskLabel} must be managed at the same time to keep the whole read stable.`
        )

  const sharedTiming =
    lang === 'ko'
      ? paragraph(
          timingSummary || timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers ? `${actionLabel} ???? ??? ?? ??? ${timingDrivers}???.` : '',
          branchEntry ? `??? ${branchEntry}` : ''
        )
      : paragraph(
          timingSummary || timingDetail,
          windowNarrative,
          matrixSummary,
          timingDrivers ? `${actionLabel} timing is being pushed by ${timingDrivers}.` : '',
          branchEntry ? `For now, ${branchEntry}` : ''
        )

  const sharedActionPlan =
    lang === 'ko'
      ? paragraph(
          `${actionLabel}??? ${actionSummary || reportCore.topDecisionLabel || reportCore.primaryAction}? ?? ?????.`,
          actionDetail,
          actionMoves ? `?? ?? ? ?? ?? ???? ${actionMoves}???.` : '',
          branchAbort ? `??? ${branchAbort} ?? ??? ??? ??? ??? ?? ????.` : '',
          branchRisk ? `???? ${branchRisk}` : '',
          riskCounters ? `${riskLabel} ???? ${riskCounters}?? ?? ??? ???.` : ''
        )
      : paragraph(
          `On the ${actionLabel} axis, ${actionSummary || reportCore.topDecisionLabel || reportCore.primaryAction} is the base operating rule.`,
          actionDetail,
          actionMoves ? `The next practical move is ${actionMoves}.` : '',
          branchAbort ? `If ${branchAbort} shows up, slow down before committing.` : '',
          branchRisk ? `If you rush, ${branchRisk}` : '',
          riskCounters ? `On the ${riskLabel} side, reduce ${riskCounters} first.` : ''
        )

  const recommendations =
    lang === 'ko'
      ? [
          `${actionLabel}??? ???? ??? ?? ?????.`,
          branchAbort
            ? `${branchAbort} ?? ??? ??? ???? ???? ?????.`
            : `${riskLabel} ??? ??? ???? ???? ?????.`,
          branchRisk
            ? `${branchRisk} ?? ??? ??? ??? ?? ??? ??????.`
            : `? ?? ?? ?????? ??? ? ?? ??? ????? ?? ????.`,
        ]
      : [
          `Fix criteria before speed on the ${actionLabel} axis.`,
          branchAbort
            ? `If ${branchAbort} appears, review before committing.`
            : `If ${riskLabel} rises, review before committing.`,
          branchRisk
            ? `Test in small reversible steps so ${branchRisk} does not grow.`
            : `Use small reversible moves instead of one large irreversible decision.`,
        ]

  switch (theme) {
    case 'love':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          relationshipAdvisory?.thesis ||
            (lang === 'ko'
              ? '??? ??? ???? ??? ??? ?? ??? ?? ? ????? ?????.'
              : 'Relationships become stable when interpretation and daily rhythm align better than emotional intensity alone.')
        ),
        patterns: paragraph(
          relationshipAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '?? ?? ??? ??? ????? ??? ???? ??? ?? ??? ?? ?? ?????.'
            : 'This relationship phase favors aligning pace and expectation before moving closer quickly.'
        ),
        timing: sharedTiming,
        compatibility: paragraph(
          lang === 'ko'
            ? '? ?? ??? ??? ???? ?? ??? ?? ??? ??? ?????.'
            : 'The stronger match is based more on pace and boundaries than intensity.',
          evidenceSummary
        ),
        spouseProfile: paragraph(
          lang === 'ko'
            ? '?? ?? ??? ?? ??? ? ???? ???? ?? ??? ?? ?? ? ?? ?? ?? ?????.'
            : 'The longer-lasting partner is steadier and more realistic than merely exciting.',
          relationshipAdvisory?.action
        ),
        marriageTiming: paragraph(
          sharedTiming,
          lang === 'ko'
            ? '???? ??? ??? ?? ??? ??? ?? ??? ?? ?? ? ? ?????.'
            : 'Commitment timing strengthens when trust and daily fit rise together.'
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'career':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          careerAdvisory?.thesis ||
            (lang === 'ko'
              ? '???? ? ?? ?? ??? ???? ??? ?? ??? ?? ???? ??? ??? ??? ?????.'
              : 'Career favors the person who fixes role and evaluation criteria before expanding workload.')
        ),
        patterns: paragraph(
          careerAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '?? ???? ??? ????? ???? ??? ???, ??? ?? ??? ??? ?? ?????.'
            : 'Right now career punishes rushed expansion and rewards clearly fixed standards.'
        ),
        timing: sharedTiming,
        strategy: paragraph(
          lang === 'ko'
            ? '??? ??? ??? ? ?? ?? ?? ???, ?? ??? ??? ??? ?? ???? ? ????.'
            : 'The strategy is to fix role and ownership before chasing more opportunities.',
          actionDetail,
          actionMoves ? `?????? ${actionMoves}?? ???? ?? ????.` : ''
        ),
        roleFit: paragraph(
          lang === 'ko'
            ? '? ?? ??? ??? ???? ???? ??, ??, ?? ??? ??? ?????.'
            : 'The better fit is a role where judgment and coordination matter more than raw speed.',
          structureDetail
        ),
        turningPoints: paragraph(
          lang === 'ko'
            ? '???? ? ? ??? ?? ?? ???, ?? ????? ?? ??? ? ??? ??? ???? ? ????.'
            : 'Turning points open when the old operating method stops being enough.',
          sharedTiming,
          branchLead
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'wealth':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          wealthAdvisory?.thesis ||
            (lang === 'ko'
              ? '??? ?? ?? ????, ?? ??? ?? ?? ??? ???? ??? ?? ????? ?????.'
              : 'Wealth improves more reliably by fixing leakage and conditions first than by chasing larger upside.')
        ),
        patterns: paragraph(
          wealthAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '??? ?? ??? ??? ?? ??, ?? ?? ???? ??? ??? ?? ??? ? ????.'
            : 'Upside can look large now, but unclear conditions can increase both loss and fatigue.'
        ),
        timing: sharedTiming,
        strategy: paragraph(
          lang === 'ko'
            ? '?? ??? ??? ??, ??, ?? ??? ?? ?? ?? ? ????.'
            : 'The financial strategy starts by fixing amount, timing, and downside limit in writing.',
          actionDetail
        ),
        incomeStreams: paragraph(
          lang === 'ko'
            ? '? ???? ?? ? ? ?? ????, ?? ???? ?? ??? ??? ??? ??? ? ????.'
            : 'New income streams are better tested small and kept only if repeatable.',
          evidenceSummary
        ),
        riskManagement: paragraph(
          lang === 'ko'
            ? '??? ??? ??? ??? ??? ??? ???? ??? ?? ??? ?? ?????.'
            : 'Risk management starts by limiting downside before enlarging return.',
          riskSummary,
          branchAbort ? `?? ${branchAbort} ?? ??? ??? ?? ??? ???.` : ''
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'health':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          healthAdvisory?.thesis ||
            (lang === 'ko'
              ? '??? ??? ??? ?? ??? ??? ?? ???? ?? ?? ?????.'
              : 'Health improves more through repeatable recovery rhythm than endurance alone.')
        ),
        patterns: paragraph(
          healthAdvisory?.caution || conflictSummary,
          lang === 'ko'
            ? '???? ??? ?? ??? ?? ??? ?? ??? ?? ?? ??? ?? ? ????.'
            : 'If overload is not interrupted early, small fatigue can shake the whole rhythm.'
        ),
        timing: sharedTiming,
        prevention: paragraph(
          lang === 'ko'
            ? '??? ??? ? ??? ?? ?? ?? ?? ??? ?? ??? ????.'
            : 'Prevention starts by responding to small warning signs early.',
          riskSummary
        ),
        riskWindows: paragraph(
          lang === 'ko'
            ? '?? ??? ??? ??????, ??? ???? ?? ??? ???? ??? ??? ??? ????.'
            : 'Risk windows usually open quietly when recovery lags and schedule pressure stacks up.',
          sharedTiming
        ),
        recoveryPlan: paragraph(
          lang === 'ko'
            ? '??? ?? ?? ? ???, ?????????? ?? ?? ?? ??? ??? ??? ??? ? ?? ? ????.'
            : 'Recovery holds better through repeatable routines than a single strong correction.',
          healthAdvisory?.action
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
    case 'family':
      return {
        deepAnalysis: paragraph(
          sharedDeepAnalysis,
          lang === 'ko'
            ? '?? ??? ?? ????? ??? ?? ??? ??? ?? ? ???? ? ?????.'
            : 'Family issues improve more through aligned interpretation than deciding who is right.'
        ),
        patterns: paragraph(
          conflictSummary,
          lang === 'ko'
            ? '??? ???? ????? ?? ??? ??? ???? ?? ???? ????.'
            : 'If roles and expectations stay implicit, fatigue and resentment accumulate.'
        ),
        timing: sharedTiming,
        dynamics: paragraph(
          lang === 'ko'
            ? '?? ??? ??? ???? ??? ??, ?? ??? ??? ????? ?? ?? ?????.'
            : 'Family dynamics shift more through clear roles and care distribution than emotion alone.',
          structureDetail
        ),
        communication: paragraph(
          lang === 'ko'
            ? '?? ??? ?? ?? ?? ???, ?? ??? ?? ??? ???? ??? ?? ? ?????.'
            : 'Family communication improves when people understand the same scene the same way.',
          actionDetail
        ),
        legacy: paragraph(
          lang === 'ko'
            ? '??? ?? ?? ? ?? ?? ??? ??? ??? ?? ?????.'
            : 'What remains in family life is shaped more by repeated patterns than one intense moment.',
          evidenceSummary
        ),
        recommendations,
        actionPlan: sharedActionPlan,
      }
  }
}

function finalizeThemedSectionsForUser(
  theme: ReportTheme,
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData: TimingData | undefined
): ThemedReportSections {
  const base = buildProjectionFirstThemedSections(theme, reportCore, matrixInput, lang, timingData)
  if (lang !== 'ko') return base

  const focusDomain = reportCore.focusDomain
  const actionDomain = reportCore.actionFocusDomain || reportCore.focusDomain
  const focusLabel = getReportDomainLabel(focusDomain, lang)
  const actionLabel = getReportDomainLabel(actionDomain, lang)
  const riskLabel = reportCore.riskAxisLabel || '\uac74\uac15'
  const focusTiming = findReportCoreTimingWindow(reportCore, actionDomain)
  const branchSet = (reportCore.branchSet || []).slice(0, 3)

  const clean = (value: string | undefined): string =>
    sanitizeUserFacingNarrative(localizeReportNarrativeText(String(value || ''), lang)).trim()

  const dedupe = (items: string[]): string[] => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const item of items.map((v) => v.trim()).filter(Boolean)) {
      if (seen.has(item)) continue
      seen.add(item)
      out.push(item)
    }
    return out
  }

  const p = (...parts: Array<string | undefined>): string =>
    joinNarrativeParts(dedupe(parts.map((part) => clean(part)).filter(Boolean)))

  const timingWindow = clean(String(focusTiming?.window || '\uc9c0\uae08')) || '\uc9c0\uae08'
  const timingLine =
    timingWindow === '\uc9c0\uae08'
      ? '\uc9c0\uae08\uc740 \uc870\uac74\ub9cc \ub9de\uc73c\uba74 \uc2e4\uc81c\ub85c \uc6c0\uc9c1\uc77c \uc218 \uc788\ub294 \ucc3d\uc774 \uc5f4\ub824 \uc788\uc2b5\ub2c8\ub2e4.'
      : `\ud604\uc7ac\ub294 ${timingWindow} \uad6c\uac04\uc774 \uac00\uc7a5 \uc9c1\uc811\uc801\uc73c\ub85c \uc791\ub3d9\ud569\ub2c8\ub2e4.`

  const localizeBranchTitle = (title: string): string => {
    const lower = title.toLowerCase()
    if (lower.includes('promotion')) return '\uc2b9\uc9c4 \ub610\ub294 \uc5ed\ud560 \ud655\uc7a5'
    if (lower.includes('contract')) return '\uc870\uac74 \uc7ac\ud611\uc0c1'
    if (lower.includes('specialist')) return '\uc804\ubb38\uc131 \uc2ec\ud654'
    if (lower.includes('reconcile')) return '\uad00\uacc4 \ud68c\ubcf5'
    if (lower.includes('distance')) return '\uac70\ub9ac \uc7ac\uc870\uc815'
    if (lower.includes('restart')) return '\ub2e4\uc2dc \uc2dc\uc791'
    return clean(title)
  }

  const branchTitles = dedupe(
    branchSet
      .map((branch) => localizeBranchTitle(String(branch.label || branch.summary || '')))
      .filter(Boolean)
  )
  const branchEntry = clean(String(branchSet[0]?.entry || ''))
  const branchAbort = clean(String(branchSet[0]?.abort || ''))
  const branchRisk = clean(String(branchSet[0]?.reversalRisk || branchSet[0]?.wrongMoveCost || ''))
  const branchList =
    branchTitles.length > 0
      ? branchTitles.join(', ')
      : '\uc2b9\uc9c4 \ub610\ub294 \uc5ed\ud560 \ud655\uc7a5, \uc870\uac74 \uc7ac\ud611\uc0c1, \uc804\ubb38\uc131 \uc2ec\ud654'
  const riskLine = `${riskLabel} \ubb38\uc81c\uac00 \uac00\uc7a5 \uc608\ubbfc\ud55c \ubcc0\uc218\ub85c \uac19\uc774 \uc6c0\uc9c1\uc774\uae30 \ub54c\ubb38\uc5d0, \uc88b\uc740 \uae30\ud68c\uac00 \uc640\ub3c4 \uc6b4\uc601 \uc21c\uc11c\ub97c \uc798\ubabb \uc7a1\uc73c\uba74 \uacb0\uacfc\ubcf4\ub2e4 \uc18c\ubaa8\uac00 \uba3c\uc800 \ucee4\uc9c8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.`

  if (theme === 'career') {
    return {
      deepAnalysis: p(
        `\uc774\ubc88 \ucee4\ub9ac\uc5b4 \ub9ac\ud3ec\ud2b8\uc5d0\uc11c \uba3c\uc800 \ubd10\uc57c \ud560 \uac83\uc740 \uc0b6\uc758 \ubc30\uacbd \ud750\ub984\uacfc \uc9c0\uae08 \uba3c\uc800 \uc6c0\uc9c1\uc5ec\uc57c \ud560 \uc601\uc5ed\uc774 \ub2e4\ub974\ub2e4\ub294 \uc810\uc785\ub2c8\ub2e4. \uc9c0\uae08 \uc0b6\uc758 \ubc14\ud0d5\uc5d0\ub294 ${focusLabel} \ud750\ub984\uc774 \uae54\ub824 \uc788\uc9c0\ub9cc, \uc2e4\uc81c\ub85c \uc190\uc744 \ub300\uace0 \uc6c0\uc9c1\uc5ec\uc57c \ud558\ub294 \ucabd\uc740 ${actionLabel}\uc785\ub2c8\ub2e4.`,
        `\uadf8\ub798\uc11c \uc774 \uc2dc\uae30\uc758 \uc2b9\ubd80\ub294 \ubb34\uc5c7\uc774 \uc911\uc694\ud558\ub0d0\ub97c \uc544\ub294 \ub370\uc11c \ub05d\ub098\uc9c0 \uc54a\uace0, \ubb34\uc5c7\uc744 \uba3c\uc800 \uc815\ub9ac\ud558\uace0 \ubb34\uc5c7\uc744 \ub098\uc911\uc5d0 \ud655\uc815\ud560\uc9c0\ub97c \uac00\ub974\ub294 \ub370 \uc788\uc2b5\ub2c8\ub2e4.`,
        riskLine
      ),
      patterns: p(
        '\ub2f9\uc2e0\uc740 \ubb34\uc791\uc815 \ubc00\uc5b4\ubd99\uc774\ub294 \uc0ac\ub78c\ubcf4\ub2e4, \uae30\uc900\uc744 \uc138\uc6b4 \ub4a4 \uc624\ub798 \ubc00\uace0 \uac00\ub294 \ubc29\uc2dd\uc5d0 \ub354 \uac15\ud569\ub2c8\ub2e4.',
        '\uc5ed\ud560 \ubc94\uc704\uc640 \ucc45\uc784 \ubc94\uc704, \ud3c9\uac00 \uae30\uc900\uc744 \uba3c\uc800 \uace0\uc815\ud558\ub294 \uc0ac\ub78c\uc774 \uacb0\uad6d \uc55e\uc11c\uac11\ub2c8\ub2e4.',
        '\ubc29\ud5a5\uc774 \ubd84\uba85\ud558\uba74 \ubc84\ud2f0\ub294 \ud798\uc774 \uc788\uc9c0\ub9cc, \uae30\uc900\uc774 \ud750\ub824\uc9c0\uba74 \uc5d0\ub108\uc9c0\uac00 \ubd84\uc0b0\ub418\uace0 \uc790\uae30\uac80\uc5f4\uc774 \uac15\ud574\uc9c8 \uc218 \uc788\uc2b5\ub2c8\ub2e4.'
      ),
      timing: p(
        timingLine,
        '\ud558\uc9c0\ub9cc \uc774 \ud750\ub984\uc758 \uc758\ubbf8\ub294 \uc9c0\uae08 \ub2f9\uc7a5 \ubaa8\ub4e0 \uac83\uc744 \ud655\uc815\ud558\ub77c\ub294 \ub73b\uc774 \uc544\ub2d9\ub2c8\ub2e4. \uc9c0\uae08\uc740 \ud310\uc774 \uc0b4\uc544\ub098\ub294\uc9c0, \uc870\uac74\uc774 \uc720\uc9c0\ub418\ub294\uc9c0, \uae30\uc900\uc774 \ubb34\ub108\uc9c0\uc9c0 \uc54a\ub294\uc9c0\ub97c \uba3c\uc800 \ud655\uc778\ud558\ub294 \uad6c\uac04\uc785\ub2c8\ub2e4.',
        branchEntry
          ? `\ud2b9\ud788 ${branchEntry}\uac00 \ub9de\uc744 \ub54c \uc2e4\ud589\ub825\uc774 \uac00\uc7a5 \uc548\uc815\uc801\uc73c\ub85c \ubd99\uc2b5\ub2c8\ub2e4.`
          : ''
      ),
      strategy: p(
        `\ud604\uc2e4\uc801\uc73c\ub85c \uc5f4\ub9b0 \uacbd\ub85c\ub294 ${branchList}\uc785\ub2c8\ub2e4.`,
        '\uacf5\ud1b5\uc810\uc740 \ud558\ub098\uc785\ub2c8\ub2e4. \ubb34\uc5c7\uc744 \ub9e1\uace0 \ubb34\uc5c7\uc73c\ub85c \ud3c9\uac00\ubc1b\uc744\uc9c0\ub97c \uba3c\uc800 \ubd84\uba85\ud558\uac8c \ud574\uc57c \ud55c\ub2e4\ub294 \uc810\uc785\ub2c8\ub2e4.',
        '\uac10\uc73c\ub85c \uc6c0\uc9c1\uc774\uba74 \uc18c\ubaa8\uac00 \ucee4\uc9c0\uace0, \uae30\uc900\uc744 \uba3c\uc800 \uc138\uc6b0\uba74 \uc131\uacfc\uac00 \ubd99\ub294 \uad6c\uc870\uc785\ub2c8\ub2e4.'
      ),
      roleFit: p(
        '\uc9c0\uae08 \ub2f9\uc2e0\uc5d0\uac8c \ub9de\ub294 \uc790\ub9ac\ub294 \ub2e8\uc21c\ud788 \uc77c\uc774 \ub9ce\uc740 \uc790\ub9ac\ubcf4\ub2e4, \ud310\ub2e8\uacfc \uc870\uc728 \ub2a5\ub825\uc774 \uc2e4\uc81c \uacb0\uacfc\uc5d0 \ubc18\uc601\ub418\ub294 \uc790\ub9ac\uc785\ub2c8\ub2e4.',
        '\uc9c1\ud568\ubcf4\ub2e4 \uad8c\ud55c, \uc5ed\ud560 \ubc94\uc704, \ucc45\uc784 \uad6c\uc870\uac00 \uc120\uba85\ud55c \ud3ec\uc9c0\uc158\uc774 \ub354 \uc798 \ub9de\uc2b5\ub2c8\ub2e4.'
      ),
      turningPoints: p(
        '\ucee4\ub9ac\uc5b4\uc758 \ud070 \ubcc0\uace1\uc810\uc740 \ud55c \ubc88\uc758 \uc0ac\uac74\ubcf4\ub2e4 \uae30\uc874 \uc6b4\uc601 \ubc29\uc2dd\uc774 \ub354\ub294 \ud1b5\ud558\uc9c0 \uc54a\ub294 \uc21c\uac04\uc5d0 \uc5f4\ub9bd\ub2c8\ub2e4.',
        '\uc9c0\uae08\uc740 \ubc14\ub85c \uadf8 \uc804\ud658 \uc9c1\uc804 \uad6c\uac04\uc5d0 \uac00\uae5d\uace0, \uc5ed\ud560 \uae30\uc900\uc744 \ub2e4\uc2dc \uc138\uc6b0\ub294 \ucabd\uc5d0\uc11c \ud310\uc774 \uac08\ub9b4 \uac00\ub2a5\uc131\uc774 \ud07d\ub2c8\ub2e4.',
        branchAbort
          ? `\ubc18\ub300\ub85c ${branchAbort} \uac19\uc740 \uc2e0\ud638\uac00 \ubcf4\uc774\uba74 \uc18d\ub3c4\ub97c \uc904\uc774\uace0 \uc7ac\uac80\ud1a0\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.`
          : ''
      ),
      recommendations: dedupe([
        '\uc5ed\ud560 \ubc94\uc704\uc640 \ucc45\uc784 \ubc94\uc704\ub97c \uba3c\uc800 \ubb38\uc11c\ud654\ud558\uc138\uc694.',
        branchAbort ||
          '\ud3c9\uac00 \uae30\uc900\uc774 \ud750\ub824\uc9c0\uba74 \ud655\uc815\uc744 \ub2a6\ucd94\uc138\uc694.',
        '\uc18d\ub3c4\ubcf4\ub2e4 \uc21c\uc11c\ub97c \uba3c\uc800 \uc7a1\uc73c\uc138\uc694.',
      ]),
      actionPlan: p(
        '\uc9c0\uae08 \ucee4\ub9ac\uc5b4\uc5d0\uc11c \uac00\uc7a5 \ub9de\ub294 \uae30\ubcf8 \uc790\uc138\ub294 \uac80\ud1a0 \uc6b0\uc120\uc785\ub2c8\ub2e4.',
        '\uba3c\uc800 \uc2b9\ubd80\ub97c \uac78\uae30\ubcf4\ub2e4 \uc5ed\ud560\uacfc \uae30\uc900\uc744 \uace0\uc815\ud558\uace0, \uadf8\ub2e4\uc74c \uc2e4\ud589 \uac15\ub3c4\ub97c \uc62c\ub9ac\ub294 \ud3b8\uc774 \ud6e8\uc52c \uc720\ub9ac\ud569\ub2c8\ub2e4.',
        branchRisk ? `\uc11c\ub450\ub974\uba74 ${branchRisk}` : '',
        '\uc608\ub97c \ub4e4\uc5b4 \uc2b9\uc9c4 \uc81c\uc548\uc774\ub098 \uc774\uc9c1 \uc774\uc57c\uae30\uac00 \ub4e4\uc5b4\uc624\uba74 \uc9c1\ud568\ubcf4\ub2e4 \uc5ed\ud560 \ubc94\uc704, \uc758\uc0ac\uacb0\uc815 \uad8c\ud55c, \ud3c9\uac00 \uae30\uc900\ubd80\ud130 \ubb38\uc11c\ub85c \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.'
      ),
    }
  }

  if (theme === 'love') {
    return {
      deepAnalysis: p(
        '\uc774\ubc88 \uad00\uacc4 \ub9ac\ud3ec\ud2b8\uc5d0\uc11c \uba3c\uc800 \ubd10\uc57c \ud560 \uac83\uc740 \uac10\uc815\uc758 \ud06c\uae30\ubcf4\ub2e4 \uad00\uacc4\ub97c \uc6b4\uc601\ud558\ub294 \ubc29\uc2dd\uc785\ub2c8\ub2e4. \uc9c0\uae08 \uc0b6\uc758 \ubc30\uacbd\uc5d0\ub294 ' +
          focusLabel +
          ' \ud750\ub984\uc774 \uae54\ub824 \uc788\uc9c0\ub9cc, \uc2e4\uc81c\ub85c \uad00\uacc4\uc758 \uacb0\uacfc\ub97c \ubc14\uafb8\ub294 \uc190\uc740 \uc18d\ub3c4\uc640 \uacbd\uacc4\ub97c \uc5b4\ub5bb\uac8c \ub9de\ucd94\ub290\ub0d0\uc5d0 \uc788\uc2b5\ub2c8\ub2e4.',
        '\ub2f9\uc2e0\uc740 \uc124\ub818\ub9cc\uc73c\ub85c \uc624\ub798 \uac00\uc9c0 \uc54a\uace0, \uc0dd\ud65c \ub9ac\ub4ec\uacfc \ucc45\uc784\uac10\uc774 \ub9de\uc744 \ub54c \uad00\uacc4\uac00 \uc548\uc815\ub418\ub294 \ucabd\uc5d0 \uac00\uae5d\uc2b5\ub2c8\ub2e4.',
        riskLine
      ),
      patterns: p(
        '\uc9c0\uae08 \uad00\uacc4\uc5d0\uc11c\ub294 \ube68\ub9ac \uac00\uae4c\uc6cc\uc9c0\ub294 \uac83\ubcf4\ub2e4 \uc11c\ub85c\uc758 \uae30\ub300\uce58\uc640 \uc18d\ub3c4\ub97c \uba3c\uc800 \ub9de\ucd94\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.',
        '\ub9d0\uc774 \uc798 \ud1b5\ud558\ub294 \uc0ac\ub78c\ubcf4\ub2e4 \uc77c\uc815, \uc0dd\ud65c \ub9ac\ub4ec, \ucc45\uc784\uac10\uc774 \ub9de\ub294 \uc0ac\ub78c\uc774 \uc624\ub798 \uac11\ub2c8\ub2e4.'
      ),
      timing: p(
        timingLine,
        '\uad00\uacc4\ub294 \uc9c0\uae08 \ub2f9\uc7a5 \uacb0\ub860\uc744 \ub0b4\ub9ac\uae30\ubcf4\ub2e4 \uac70\ub9ac\uc640 \uc18d\ub3c4\ub97c \uba3c\uc800 \ub9de\ucd9c\uc218\ub85d \ud6e8\uc52c \uc548\uc815\uc801\uc73c\ub85c \uc6c0\uc9c1\uc785\ub2c8\ub2e4.',
        branchEntry
          ? `\ud2b9\ud788 ${branchEntry}\uac00 \uc790\uc5f0\uc2a4\ub7fd\uac8c \ub9de\uc544\ub5a8\uc5b4\uc9c8 \ub54c \uad00\uacc4\ub294 \ub354 \uc624\ub798 \uac11\ub2c8\ub2e4.`
          : ''
      ),
      compatibility: p(
        '\uc798 \ub9de\ub294 \uc0ac\ub78c\uc740 \uac10\uc815\uc758 \uc628\ub3c4\ubcf4\ub2e4 \uc0dd\ud65c\uc758 \uc18d\ub3c4\uc640 \uacbd\uacc4\ub97c \ud568\uaed8 \uc870\uc728\ud560 \uc218 \uc788\ub294 \uc0ac\ub78c\uc785\ub2c8\ub2e4.',
        '\ub2f9\uc2e0\uc5d0\uac8c\ub294 \uc11c\ub85c\uc758 \uc2dc\uac04\uc744 \uc874\uc911\ud558\uace0 \ucc45\uc784 \ubc94\uc704\ub97c \ubd84\uba85\ud788 \ud558\ub294 \uad00\uacc4\uac00 \ub354 \uc798 \ub9de\uc2b5\ub2c8\ub2e4.'
      ),
      spouseProfile: p(
        '\ubc30\uc6b0\uc790\uc0c1\ub3c4 \ud654\ub824\ud568\ubcf4\ub2e4 \uc548\uc815\uac10, \ub9d0\ubcf4\ub2e4 \ud589\ub3d9 \uae30\uc900\uc774 \ubd84\uba85\ud55c \uc0ac\ub78c \ucabd\uc73c\ub85c \uc77d\ud799\ub2c8\ub2e4.',
        '\ud2b9\ud788 \uc77c\uc744 \ub300\ud558\ub294 \ud0dc\ub3c4\uc640 \uc0dd\ud65c \ub8e8\ud2f4\uc774 \uc548\uc815\uc801\uc778 \uc0ac\ub78c\uc774 \uc2e4\uc81c\ub85c \uc624\ub798 \uac08 \uac00\ub2a5\uc131\uc774 \ud07d\ub2c8\ub2e4.'
      ),
      marriageTiming: p(
        '\uacb0\ud63c\uc774\ub098 \uae4a\uc740 \uad00\uacc4\uc758 \ud0c0\uc774\ubc0d\uc740 \uac10\uc815\uc774 \ucee4\uc9c8 \ub54c\ubcf4\ub2e4 \uc2e0\ub8b0\uc640 \uc0dd\ud65c \uc801\ud569\ub3c4\uac00 \ud568\uaed8 \uc62c\ub77c\uc62c \ub54c \ub354 \uac15\ud569\ub2c8\ub2e4.',
        '\uc9c0\uae08\uc740 \uacb0\ub860\uc744 \uc11c\ub450\ub974\uae30\ubcf4\ub2e4 \uad00\uacc4\ub97c \uc2e4\uc81c \uc0dd\ud65c \uc18d\uc5d0\uc11c \uac80\uc99d\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.'
      ),
      recommendations: dedupe([
        '\uad00\uacc4\uc758 \uc18d\ub3c4\ubcf4\ub2e4 \uacbd\uacc4\uc640 \uc0dd\ud65c \ub9ac\ub4ec\uc744 \uba3c\uc800 \ud655\uc778\ud558\uc138\uc694.',
        branchAbort ||
          '\uae30\ub300\uce58\uac00 \uc5b4\uae0b\ub098\uba74 \uacb0\ub860\uc744 \ub2a6\ucd94\uc138\uc694.',
        '\uc124\ub818\ubcf4\ub2e4 \uc9c0\uc18d \uac00\ub2a5\uc131\uc744 \uba3c\uc800 \ubcf4\uc138\uc694.',
      ]),
      actionPlan: p(
        '\uc9c0\uae08 \uad00\uacc4\uc5d0\uc11c \uac00\uc7a5 \uc911\uc694\ud55c \uac83\uc740 \ube68\ub9ac \uac00\uae4c\uc6cc\uc9c0\ub294 \uac83\uc774 \uc544\ub2c8\ub77c, \uc624\ub798 \uac08 \uc218 \uc788\ub294 \uc6b4\uc601 \ubc29\uc2dd\uc744 \ud655\uc778\ud558\ub294 \uc77c\uc785\ub2c8\ub2e4.',
        '\uc608\ub97c \ub4e4\uc5b4 \uc5f0\ub77d \ube48\ub3c4, \ub9cc\ub0a8 \uc18d\ub3c4, \uc77c\uc815 \uc870\uc728 \uac19\uc740 \uc0dd\ud65c \ub9ac\ub4ec\ubd80\ud130 \ub9de\ub294\uc9c0 \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ud6e8\uc52c \ud604\uc2e4\uc801\uc785\ub2c8\ub2e4.',
        branchRisk ? `\uc11c\ub450\ub974\uba74 ${branchRisk}` : ''
      ),
    }
  }

  if (theme === 'wealth') {
    return {
      deepAnalysis: p(
        '\uc774\ubc88 \uc7ac\uc815 \ub9ac\ud3ec\ud2b8\uc758 \ud575\uc2ec\uc740 \ub3c8\uc744 \ub9ce\uc774 \ubc84\ub294 \uc120\ud0dd\ubcf4\ub2e4, \uc5b4\ub5a4 \uc870\uac74\uc5d0\uc11c \ub3c8\uc774 \ub0a8\uace0 \uc5b4\ub5a4 \uc870\uac74\uc5d0\uc11c \uc0c8\ub294\uc9c0\ub97c \uba3c\uc800 \uac00\ub974\ub294 \uc77c\uc785\ub2c8\ub2e4.',
        `\uc9c0\uae08 \uc7ac\uc815\uc740 ${actionLabel} \uacb0\uc815\uacfc \uac15\ud558\uac8c \uc5f0\uacb0\ub3fc \uc788\uc5b4\uc11c, \uc77c\uc758 \uae30\uc900\uc774 \ud750\ub4e4\ub9ac\uba74 \ub3c8\uc758 \ud750\ub984\ub3c4 \uac19\uc774 \ud754\ub4e4\ub9b4 \uac00\ub2a5\uc131\uc774 \ud07d\ub2c8\ub2e4.`,
        riskLine
      ),
      patterns: p(
        '\uc9c0\uae08 \uc7ac\uc815\uc5d0\uc11c\ub294 \ud070 \uc218\uc775 \uae30\ud68c\ubcf4\ub2e4 \uc870\uac74\uc744 \uc815\ud655\ud788 \uc77d\ub294 \ub2a5\ub825\uc774 \ub354 \uc911\uc694\ud569\ub2c8\ub2e4.',
        '\uae08\uc561, \uae30\ud55c, \ucde8\uc18c \uc870\uac74, \uc190\uc2e4 \uc0c1\ud55c\uc744 \uba3c\uc800 \uc801\uc5b4\ub450\ub294 \uc0ac\ub78c\uc774 \uacb0\uad6d \uc190\uc2e4\uc744 \uc904\uc785\ub2c8\ub2e4.'
      ),
      timing: p(
        timingLine,
        '\uc7ac\uc815\ub3c4 \uc9c0\uae08 \ucc3d\uc774 \uc5f4\ub824 \uc788\uc9c0\ub9cc, \uadf8 \uc758\ubbf8\ub294 \ubc14\ub85c \ud06c\uac8c \ubca0\ud305\ud558\ub77c\ub294 \ub73b\uc774 \uc544\ub2d9\ub2c8\ub2e4.',
        '\uc9c0\uae08\uc740 \ud310\uc774 \uc0b4\uc544\ub098\ub294\uc9c0, \uc870\uac74\uc774 \uc720\uc9c0\ub418\ub294\uc9c0, \uc190\uc2e4 \uc0c1\ud55c\uc744 \ud1b5\uc81c\ud560 \uc218 \uc788\ub294\uc9c0\ub97c \uba3c\uc800 \ud655\uc778\ud558\ub294 \uad6c\uac04\uc785\ub2c8\ub2e4.'
      ),
      strategy: p(
        '\uc7ac\uc815 \uc804\ub7b5\uc758 \ud575\uc2ec\uc740 \uc218\uc775 \ud655\ub300\ubcf4\ub2e4 \uae30\uc900 \uace0\uc815\uc785\ub2c8\ub2e4.',
        '\uc5bc\ub9c8\ub97c \ubc8c \uc218 \uc788\ub098\ubcf4\ub2e4 \uc5b4\ub5a4 \uc870\uac74\uc744 \ubc1b\uc544\ub4e4\uc77c \uac83\uc778\uac00\ub97c \uba3c\uc800 \uc815\ud574\uc57c \ud754\ub4e4\ub9bc\uc774 \uc904\uc5b4\ub4ed\ub2c8\ub2e4.',
        '\ub3cc\uc774\ud0ac \uc218 \uc788\ub294 \uc120\ud0dd\uc744 \uba3c\uc800 \ube44\uad50\ud558\ub294 \ucabd\uc774 \uc9c0\uae08\uc740 \ud6e8\uc52c \ud604\uc2e4\uc801\uc785\ub2c8\ub2e4.'
      ),
      incomeStreams: p(
        '\uc0c8\ub85c\uc6b4 \uc218\uc785 \uacbd\ub85c\ub294 \ud06c\uac8c \ud55c \ubc88\uc5d0 \ubc8c\ub9ac\ub294 \uac83\ubcf4\ub2e4 \uc791\uac8c \uc2dc\ud5d8\ud558\uace0, \ubc18\ubcf5 \uac00\ub2a5\ud55c\uc9c0\ub9cc \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.',
        '\uc9c0\uc18d \uac00\ub2a5\ud55c \ud750\ub984\uc778\uc9c0 \ud655\uc778\ub418\uae30 \uc804\uae4c\uc9c0\ub294 \ubab8\uc9d1\uc744 \ud0a4\uc6b0\uc9c0 \uc54a\ub294 \ucabd\uc774 \uc720\ub9ac\ud569\ub2c8\ub2e4.'
      ),
      riskManagement: p(
        '\ub9ac\uc2a4\ud06c \uad00\ub9ac\ub294 \uae30\ud68c\uac00 \uc801\uc5b4\uc11c\uac00 \uc544\ub2c8\ub77c, \uc190\uc2e4\uc744 \ub9c9\ub294 \uae30\uc900\uc774 \uc5c6\uc744 \ub54c \ubb38\uc81c\uac00 \ucee4\uc9d1\ub2c8\ub2e4.',
        '\uadf8\ub798\uc11c \uc218\uc775\ubcf4\ub2e4 \uc190\uc2e4 \uc0c1\ud55c, \uae30\uac04, \ucca0\uc218 \uc870\uac74\uc744 \uba3c\uc800 \uc815\ud574\uc57c \ud569\ub2c8\ub2e4.',
        branchAbort
          ? `\ud2b9\ud788 ${branchAbort} \uac19\uc740 \uc2e0\ud638\uac00 \ubcf4\uc774\uba74 \uba48\ucd94\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.`
          : ''
      ),
      recommendations: dedupe([
        '\uae08\uc561\ubcf4\ub2e4 \uc870\uac74\uc744 \uba3c\uc800 \uc801\uc5b4\ub450\uc138\uc694.',
        branchAbort ||
          '\uc190\uc2e4 \uc0c1\ud55c\uc774 \ubd88\ubd84\uba85\ud558\uba74 \uba48\ucd94\uc138\uc694.',
        '\uc0c8 \uc218\uc785 \uacbd\ub85c\ub294 \uc791\uac8c \uc2dc\ud5d8\ud55c \ub4a4 \ud0a4\uc6b0\uc138\uc694.',
      ]),
      actionPlan: p(
        '\uc9c0\uae08 \uc7ac\uc815\uc5d0\uc11c \uac00\uc7a5 \uc911\uc694\ud55c \uac74 \ub354 \ud06c\uac8c \ubc8c\ub9ac\ub294 \uac83\uc774 \uc544\ub2c8\ub77c, \ud754\ub4e4\ub824\ub3c4 \ubc84\ud2f8 \uc218 \uc788\ub294 \uad6c\uc870\ub97c \ub9cc\ub4dc\ub294 \uc77c\uc785\ub2c8\ub2e4.',
        '\uc608\ub97c \ub4e4\uc5b4 \ud22c\uc790, \uacc4\uc57d, \ubd80\uc5c5 \uc81c\uc548\uc774 \ub4e4\uc5b4\uc624\uba74 \uae30\ub300 \uc218\uc775\ubcf4\ub2e4 \ucde8\uc18c \uc870\uac74, \uace0\uc815\ube44 \uc99d\uac00, \uc190\uc2e4 \uc0c1\ud55c\ubd80\ud130 \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.',
        branchRisk ? `\uc11c\ub450\ub974\uba74 ${branchRisk}` : ''
      ),
    }
  }

  return base
}

function enforceThemedNarrativeQualityFallback(
  theme: ReportTheme,
  reportCore: ReportCoreViewModel,
  signalSynthesis: SignalSynthesisResult | undefined,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  timingData: TimingData | undefined,
  evidenceRefs: SectionEvidenceRefs
): ThemedReportSections {
  const sectionPaths = [...getThemedSectionKeys(theme)]
  let next = buildProjectionFirstThemedSections(
    theme,
    reportCore,
    matrixInput,
    lang,
    timingData
  ) as unknown as Record<string, unknown>
  next = sanitizeThemedSectionsForUserExternal(
    next,
    sectionPaths,
    lang,
    secondaryPostProcessDeps,
    theme
  )
  const deepAnalysis = typeof next.deepAnalysis === 'string' ? next.deepAnalysis : ''
  if (deepAnalysis) {
    const needsTimingDisclaimer =
      !/(broad directional read|confirm finer timing separately|timing guide)/i.test(deepAnalysis)
    const needsEvidenceNarrative =
      !/(cross-evidence bundle|rule arbitration|read together across signals)/i.test(deepAnalysis)
    const additions: string[] = []
    if (needsTimingDisclaimer) {
      additions.push(
        lang === 'ko'
          ? '? ?? ???? ???? ?? ????.'
          : 'Use this as a broad directional guide and confirm finer timing separately.'
      )
    }
    if (needsEvidenceNarrative) {
      additions.push(
        lang === 'ko'
          ? '?? ?? ??? ?? ? ?????.'
          : 'This read is grounded in a cross-evidence bundle and rule arbitration.'
      )
    }
    if (additions.length > 0) {
      next.deepAnalysis = `${deepAnalysis.trim()} ${additions.join(' ')}`.trim()
    }
  }
  next = enforceEvidenceRefFooters(next, sectionPaths, evidenceRefs, lang)
  next = sanitizeSectionsByPathsExternal(next, sectionPaths, narrativePathSanitizerDeps)
  return next as unknown as ThemedReportSections
}

const reportCoreEnrichmentDeps: ReportCoreEnrichmentDeps = {
  buildReportCoreLine,
  buildNarrativeSectionFromCore,
  ensureLongSectionNarrative,
  sanitizeUserFacingNarrative,
  formatNarrativeParagraphs,
  buildPrimaryActionLead,
  buildPrimaryCautionLead,
  buildSectionPersonalLead,
  buildPersonalLifeTimelineNarrative,
  buildTimingWindowNarrative,
  buildManifestationNarrative,
  buildVerdictNarrative,
  getReportDomainLabel,
  distinctNarrative,
  formatPolicyCheckLabels,
  renderTimingAdviceSection,
  renderActionPlanSection,
}

const comprehensivePostProcessDeps: ComprehensivePostProcessDeps = {
  sanitizeUserFacingNarrative,
  formatNarrativeParagraphs,
  removeCrossSectionNarrativeRepetition,
  getReportDomainLabel,
  getTimingWindowLabel,
  buildTimingWindowNarrative,
  findReportCoreAdvisory,
  findReportCoreTimingWindow,
  findReportCoreManifestation,
  renderIntroductionSection,
  renderCareerPathSection,
  renderRelationshipDynamicsSection,
  renderWealthPotentialSection,
  renderHealthGuidanceSection,
  renderLifeMissionSection,
  renderConclusionSection,
}

const comprehensiveFallbackDeps: ComprehensiveFallbackDeps = {
  ensureLongSectionNarrative,
  summarizeTopInsightsByCategory,
  renderIntroductionSection,
  renderPersonalityDeepSection,
  renderCareerPathSection,
  renderRelationshipDynamicsSection,
  renderWealthPotentialSection,
  renderHealthGuidanceSection,
  renderLifeMissionSection,
  renderTimingAdviceSection,
  renderActionPlanSection,
  renderConclusionSection,
}

const secondaryFallbackDeps: SecondaryFallbackDeps = {
  ensureLongSectionNarrative,
  cleanRecommendationLine,
  buildTimingWindowNarrative,
  findReportCoreAdvisory,
  findReportCoreTimingWindow,
  findReportCoreManifestation,
}

const secondaryPostProcessDeps: SecondaryPostProcessDeps = {
  sanitizeUserFacingNarrative,
  formatNarrativeParagraphs,
}

const narrativePathSanitizerDeps: NarrativePathSanitizerDeps = {
  getPathValue,
  postProcessSectionNarrative,
  setPathText,
  softenOverclaimPhrases,
}

function softenOverclaimPhrases(text: string): string {
  if (!text) return text
  return text
    .replace(/always/gi, 'often')
    .replace(/never/gi, 'rarely')
    .replace(/guaranteed/gi, 'high-probability')
    .replace(/100%/gi, '?? ???')
    .replace(/\bguaranteed\b/gi, 'high-probability')
    .replace(/\bcertainly\b/gi, 'likely')
    .replace(/\balways\b/gi, 'in most cases')
    .replace(/\bnever\b/gi, 'rarely')
}

// Premium reports default to live generation unless explicitly forced into deterministic mode.
// Keep the old rewrite-only generation path disabled unless we intentionally revive it.
const FORCE_REWRITE_ONLY_MODE = false
const FORCE_DETERMINISTIC_CORE_MODE = (() => {
  const raw = String(process.env.DESTINY_REPORT_FORCE_DETERMINISTIC_CORE || '')
    .trim()
    .toLowerCase()
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on'
})()

function shouldUseDeterministicOnly(flag?: boolean): boolean {
  if (process.env.VITEST) return true
  if (FORCE_DETERMINISTIC_CORE_MODE) return true
  if (typeof flag === 'boolean') return flag
  const env = String(process.env.DESTINY_REPORT_DETERMINISTIC_ONLY || '')
    .trim()
    .toLowerCase()
  return env === '1' || env === 'true' || env === 'yes' || env === 'on'
}

function shouldUsePremiumSelectivePolish(userPlan?: AIUserPlan): boolean {
  if (isCostOptimizedAiPath()) return false
  return userPlan === 'premium'
}

function getPremiumPolishPaths(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
}): string[] {
  if (params.reportType === 'comprehensive') {
    return ['timingAdvice']
  }
  if (params.reportType === 'timing') {
    return ['overview', 'opportunities', 'actionPlan']
  }

  const shared = ['deepAnalysis', 'timing', 'actionPlan']
  switch (params.theme) {
    case 'love':
      return [...shared, 'compatibility', 'marriageTiming']
    case 'career':
      return [...shared, 'strategy', 'roleFit', 'turningPoints']
    case 'wealth':
      return [...shared, 'strategy', 'incomeStreams', 'riskManagement']
    case 'health':
      return [...shared, 'prevention', 'recoveryPlan', 'riskWindows']
    case 'family':
      return [...shared, 'communication', 'legacy', 'dynamics']
    default:
      return shared
  }
}

function getPremiumPolishBatchSize(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
}): number {
  if (params.reportType === 'comprehensive') return 2
  if (params.reportType === 'themed') return 3
  return 3
}

function chunkPaths(paths: string[], size: number): string[][] {
  if (size <= 0 || paths.length <= size) return [paths]
  const chunks: string[][] = []
  for (let index = 0; index < paths.length; index += size) {
    chunks.push(paths.slice(index, index + size))
  }
  return chunks
}

function pickSectionEvidenceRefs(
  evidenceRefs: SectionEvidenceRefs,
  sectionPaths: string[]
): SectionEvidenceRefs {
  const picked: SectionEvidenceRefs = {}
  for (const path of sectionPaths) {
    if (evidenceRefs[path]) {
      picked[path] = evidenceRefs[path]
    }
  }
  return picked
}

function pickSectionBlocks(
  blocksBySection: Record<string, DeterministicSectionBlock[]> | undefined,
  sectionPaths: string[]
): Record<string, DeterministicSectionBlock[]> | undefined {
  if (!blocksBySection) return undefined
  const picked: Record<string, DeterministicSectionBlock[]> = {}
  for (const path of sectionPaths) {
    if (blocksBySection[path]) {
      picked[path] = blocksBySection[path]
    }
  }
  return picked
}

async function maybePolishPremiumSections<T extends object>(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
  sections: T
  lang: 'ko' | 'en'
  userPlan?: AIUserPlan
  evidenceRefs: SectionEvidenceRefs
  blocksBySection?: Record<string, DeterministicSectionBlock[]>
  minCharsPerSection: number
}): Promise<{ sections: T; modelUsed?: string; tokensUsed?: number }> {
  if (!shouldUsePremiumSelectivePolish(params.userPlan)) {
    return { sections: params.sections }
  }

  const sectionPaths = getPremiumPolishPaths({
    reportType: params.reportType,
    theme: params.theme,
  }).filter(
    (path) => typeof getPathValue(params.sections as Record<string, unknown>, path) === 'string'
  )

  if (sectionPaths.length === 0) {
    return { sections: params.sections }
  }

  const merged = JSON.parse(JSON.stringify(params.sections)) as Record<string, unknown>
  const batchSize = getPremiumPolishBatchSize({
    reportType: params.reportType,
    theme: params.theme,
  })
  const batches = chunkPaths(sectionPaths, batchSize)
  let tokensUsedTotal = 0
  const modelStatuses: string[] = []

  for (const batch of batches) {
    const rewrite = await rewriteSectionsWithFallback<T>({
      lang: params.lang,
      userPlan: params.userPlan,
      draftSections: merged as T,
      evidenceRefs: pickSectionEvidenceRefs(params.evidenceRefs, batch),
      blocksBySection: pickSectionBlocks(params.blocksBySection, batch),
      sectionPaths: batch,
      requiredPaths: batch,
      minCharsPerSection: params.minCharsPerSection,
      validationMode: 'selective_polish',
    })
    tokensUsedTotal += rewrite.tokensUsed || 0
    if (rewrite.modelUsed) {
      modelStatuses.push(rewrite.modelUsed)
    }

    const rewritten = rewrite.sections as Record<string, unknown>
    for (const path of batch) {
      const value = getPathValue(rewritten, path)
      if (typeof value === 'string' && value.trim()) {
        setPathText(merged, path, value)
      }
    }
  }

  const successfulModels = modelStatuses.filter((status) => !status.startsWith('rewrite-fallback'))
  const modelUsed =
    successfulModels[successfulModels.length - 1] || modelStatuses[modelStatuses.length - 1]

  return {
    sections: merged as T,
    modelUsed,
    tokensUsed: tokensUsedTotal,
  }
}

type CoreComprehensiveSectionKey =
  | 'introduction'
  | 'personalityDeep'
  | 'careerPath'
  | 'relationshipDynamics'
  | 'wealthPotential'
  | 'healthGuidance'
  | 'lifeMission'
  | 'timingAdvice'
  | 'actionPlan'
  | 'conclusion'

const COMPREHENSIVE_SECTION_KEYS: CoreComprehensiveSectionKey[] = [
  'introduction',
  'personalityDeep',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
  'healthGuidance',
  'lifeMission',
  'timingAdvice',
  'actionPlan',
  'conclusion',
]

const COMPREHENSIVE_OPTIONAL_LIFE_SECTION_KEYS: Array<
  keyof Pick<
    AIPremiumReport['sections'],
    'spouseProfile' | 'lifeStages' | 'turningPoints' | 'futureOutlook'
  >
> = ['spouseProfile', 'lifeStages', 'turningPoints', 'futureOutlook']

const reportEvidenceSupportDeps: ReportEvidenceSupportDeps = {
  comprehensiveSectionKeys: [...COMPREHENSIVE_SECTION_KEYS] as string[],
  getDomainsForSection,
  getPathText,
  setPathText,
  buildReportCoreLine,
  normalizeNarrativeCoreText,
}

const reportSectionRendererDeps: ReportSectionRendererDeps = {
  buildEvidenceFooter,
  normalizeNarrativeCoreText,
  getReportDomainLabel: (domain, lang) => getReportDomainLabel(domain || 'timing', lang),
  getTimingWindowLabel: (window, lang) =>
    getTimingWindowLabel((window as 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+') || 'now', lang),
  findReportCoreTimingWindow: (reportCore, domain) =>
    domain ? findReportCoreTimingWindow(reportCore, domain) || undefined : undefined,
  findReportCoreAdvisory: (reportCore, domain) =>
    domain ? findReportCoreAdvisory(reportCore, domain) || undefined : undefined,
  findReportCoreManifestation: (reportCore, domain) =>
    domain ? findReportCoreManifestation(reportCore, domain) || undefined : undefined,
  findReportCoreVerdict: (reportCore, domain) =>
    domain ? findReportCoreVerdict(reportCore, domain) || undefined : undefined,
  findReportCoreDomainVerdict: (reportCore, domain) =>
    domain
      ? (() => {
          const verdict = findReportCoreDomainVerdict(reportCore, domain)
          return verdict
            ? {
                ...verdict,
                leadScenarioId: verdict.leadScenarioId || undefined,
              }
            : undefined
        })()
      : undefined,
  buildPersonalLifeTimelineNarrative: (matrixInput, matrixSummary, lang) =>
    buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang),
  buildElementMetaphor,
  formatScenarioIdForNarrative,
  formatNarrativeParagraphs,
  sanitizeUserFacingNarrative,
  containsHangul,
  capitalizeFirst,
  describeDataTrustSummary,
  describeProvenanceSummary,
  describeTimingCalibrationSummary: (params: {
    reliabilityBand?: string
    reliabilityScore?: number
    pastStability?: number
    futureStability?: number
    backtestConsistency?: number
    calibratedFromHistory?: boolean
    calibrationSampleSize?: number
    calibrationMatchedRate?: number
    lang: 'ko' | 'en'
  }) =>
    describeTimingCalibrationSummary({
      reliabilityBand:
        params.reliabilityBand === 'low' ||
        params.reliabilityBand === 'medium' ||
        params.reliabilityBand === 'high'
          ? params.reliabilityBand
          : undefined,
      reliabilityScore: params.reliabilityScore,
      pastStability: params.pastStability,
      futureStability: params.futureStability,
      backtestConsistency: params.backtestConsistency,
      calibratedFromHistory: params.calibratedFromHistory,
      calibrationSampleSize: params.calibrationSampleSize,
      calibrationMatchedRate: params.calibrationMatchedRate,
      lang: params.lang,
    }),
  describeIntraMonthPeakWindow: (params) =>
    describeIntraMonthPeakWindow({
      domainLabel: params.domainLabel,
      points: Array.isArray(params.points) ? params.points : [],
      lang: params.lang,
    }),
}

const reportLifeSectionDeps: ReportLifeSectionDeps = {
  calculateProfileAge,
  formatNarrativeParagraphs,
  getReportDomainLabel,
  localizeReportNarrativeText,
  sanitizeUserFacingNarrative,
}

function resolveSignalDomain(
  domainHints: string[] | undefined,
  preferredDomains?: Set<SignalDomain>
): SignalDomain {
  return resolveSignalDomainExternal(domainHints, preferredDomains)
}

function buildComprehensiveEvidenceRefs(
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  return buildComprehensiveEvidenceRefsExternal(synthesis, reportEvidenceSupportDeps)
}

function buildTimingEvidenceRefs(
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  return buildTimingEvidenceRefsExternal(sectionPaths, synthesis)
}

function buildThemedEvidenceRefs(
  theme: ReportTheme,
  sectionPaths: string[],
  synthesis: SignalSynthesisResult | undefined
): SectionEvidenceRefs {
  return buildThemedEvidenceRefsExternal(theme, sectionPaths, synthesis)
}

function hasEvidenceSupport(text: string, refs: ReportEvidenceRef[]): boolean {
  return hasEvidenceSupportExternal(text, refs)
}

function enforceEvidenceRefFooters(
  sections: Record<string, unknown>,
  sectionPaths: string[],
  evidenceRefs: SectionEvidenceRefs,
  lang: 'ko' | 'en'
): Record<string, unknown> {
  return enforceEvidenceRefFootersExternal(
    sections,
    sectionPaths,
    evidenceRefs,
    lang,
    reportEvidenceSupportDeps
  )
}

function isComprehensiveSectionsPayload(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return COMPREHENSIVE_SECTION_KEYS.every((key) => typeof record[key] === 'string')
}

const SECTION_CONCRETE_NOUNS: Record<keyof AIPremiumReport['sections'], string[]> = {
  introduction: ['??', '???', '??', '??', '??', '????'],
  personalityDeep: ['??', '??', '???', '??', '????', '??'],
  careerPath: ['??', '??', '??', '???', '?? ??', '?? ??'],
  relationshipDynamics: ['??', '??', '??', '??', '??', '??'],
  spouseProfile: ['??', '??', '??', '??', '??', '???'],
  wealthPotential: ['??', '??', '????', '?? ??', '??', '??'],
  healthGuidance: ['??', '??', '??', '??', '???', '???'],
  lifeMission: ['??', '??', '??', '??', '??', '?? ??'],
  lifeStages: ['??', '??', '??', '??', '??', '??'],
  turningPoints: ['??', '??', '??', '??', '??', '????'],
  futureOutlook: ['??', '??', '??', '???', '??', '??'],
  timingAdvice: ['??', '1~3??', '?', '??', '??', '???'],
  actionPlan: ['??', '??', '??', '?????', '????', '??'],
  conclusion: ['??', '????', '??', '???', '??', '??'],
}
const REPETITIVE_OPENER_REGEX =
  /^(?:\uACB0\uB860\uBD80\uD130 \uB9D0\uD558\uBA74|\uC694\uC57D\uD558\uBA74|\uD575\uC2EC\uC740)\b/
const SECTION_OPENERS_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '?? ??? ??? ?? ???? ??? ????.',
  personalityDeep: '? ??? ??? ??? ??? ??? ? ????.',
  careerPath: '???? ???? ??? ??? ?? ????? ?????.',
  relationshipDynamics: '??? ???? ?? ??? ?? ??? ?????.',
  spouseProfile: '?? ?? ???? ?? ?? ??? ????.',
  wealthPotential: '??? ???? ??? ?? ??? ? ?? ????.',
  healthGuidance: '??? ??? ??? ?? ?? ??? ? ?????.',
  lifeMission: '?? ????? ???? ??? ?? ??? ??? ?????.',
  lifeStages: '?? ???? ??? ??? ??? ?????.',
  turningPoints: '?? ??? ???? ??? ?? ??? ????.',
  futureOutlook: '???? 3~5? ??? ??? ???? ????.',
  timingAdvice: '?? ???? ???? ?? ??? ??? ?????.',
  actionPlan: '??? ? ?? ???? ????? ???? ?? ????.',
  conclusion: '?? ??? ??? ???? ??? ????? ????.',
}
function normalizeSentenceKey(sentence: string): string {
  return sentence
    .replace(/\s+/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}
function postProcessSectionNarrative(
  text: string,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  const base = sanitizeSectionNarrative(text)
  if (!base) return base
  const sentences = splitSentences(base)
  if (sentences.length === 0) return base
  const deduped: string[] = []
  const seen = new Set<string>()
  for (const sentence of sentences) {
    const key = normalizeSentenceKey(sentence)
    if (key.length < 12 || !seen.has(key)) {
      deduped.push(sentence)
      if (key.length >= 12) seen.add(key)
    }
  }
  if (lang === 'ko' && deduped[0] && REPETITIVE_OPENER_REGEX.test(deduped[0])) {
    deduped[0] = SECTION_OPENERS_KO[sectionKey]
  }
  return deduped
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function toKoreanDomainLabel(domain: SignalDomain): string {
  const map: Record<SignalDomain, string> = {
    personality: '??',
    career: '???',
    relationship: '??',
    wealth: '??',
    health: '??',
    spirituality: '??',
    timing: '???',
    move: '??',
  }
  return map[domain]
}

interface GraphRagSummaryPayload {
  topInsights: string[]
  drivers: string[]
  cautions: string[]
  trust: {
    avgOverlapScore: number
    avgOrbFitScore: number
    highTrustSetCount: number
    lowTrustSetCount: number
    totalSets: number
  }
  cautionSections: string[]
}

function uniqueStrings(values: Array<string | undefined | null>, limit = 6): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const value of values) {
    const text = String(value || '').trim()
    if (!text) continue
    if (seen.has(text)) continue
    seen.add(text)
    out.push(text)
    if (out.length >= limit) break
  }
  return out
}

function buildGraphRagSummaryPayload(
  lang: 'ko' | 'en',
  matrixReport: FusionReport,
  graphRagEvidence: NonNullable<AIPremiumReport['graphRagEvidence']>,
  signalSynthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  reportCore?: ReportCoreViewModel
): GraphRagSummaryPayload {
  const graphSummary = summarizeGraphRAGEvidence(graphRagEvidence)
  const preferredDomains: Set<SignalDomain> | null = reportCore
    ? new Set([
        reportCore.focusDomain as SignalDomain,
        ...reportCore.domainVerdicts.slice(0, 2).map((item) => item.domain as SignalDomain),
      ])
    : null
  const topInsightTitles = uniqueStrings(
    (matrixReport.topInsights || [])
      .filter((item) => !preferredDomains || preferredDomains.has(item.domain))
      .map((item) => item.title),
    5
  )
  const claimFallback = uniqueStrings(
    (signalSynthesis?.claims || [])
      .filter((claim) => !preferredDomains || preferredDomains.has(claim.domain))
      .map((claim) => claim.thesis),
    5
  )
  const anchorFallback = uniqueStrings(
    (graphRagEvidence.anchors || []).map((anchor) =>
      lang === 'ko' ? `${anchor.section} ?? ?? ??` : `${anchor.section} cross evidence`
    ),
    5
  )
  const topInsights =
    topInsightTitles.length > 0
      ? topInsightTitles
      : claimFallback.length > 0
        ? claimFallback
        : anchorFallback

  const strengthSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      return !preferredDomains || preferredDomains.has(domain)
    })
    .filter((signal) => signal.polarity === 'strength')
    .slice(0, 3)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} ?? ??: ${signal.keyword || signal.rowKey}`
      }
      return `${domain} upside signal: ${signal.keyword || signal.rowKey}`
    })
  const strategyDrivers = (strategyEngine?.domainStrategies || [])
    .filter((strategy) => !preferredDomains || preferredDomains.has(strategy.domain))
    .slice(0, 3)
    .map((strategy) => {
      const strategyDomain = strategy.domain as SignalDomain
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(strategyDomain)}? ${describePhaseFlow(
          strategy.phaseLabel,
          'ko'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'ko')}`
      }
      return `${strategy.domain} is in a phase where ${describePhaseFlow(
        strategy.phaseLabel,
        'en'
      ).toLowerCase()} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'en')}`
    })
  const drivers = uniqueStrings(
    [
      ...strengthSignals,
      ...strategyDrivers,
      ...(signalSynthesis?.claims || [])
        .filter((claim) => !preferredDomains || preferredDomains.has(claim.domain))
        .map((claim) => {
          const claimDomain = claim.domain as SignalDomain
          return lang === 'ko'
            ? `${toKoreanDomainLabel(claimDomain)}: ${claim.thesis}`
            : `${claim.domain}: ${claim.thesis}`
        }),
    ],
    6
  )

  const cautionSignals = (signalSynthesis?.selectedSignals || [])
    .filter((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      return !preferredDomains || preferredDomains.has(domain)
    })
    .filter((signal) => signal.polarity === 'caution')
    .slice(0, 4)
    .map((signal) => {
      const domain = resolveSignalDomain(signal.domainHints)
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(domain)} ??: ${signal.keyword || signal.rowKey} ??? ?? ? ???? ?????.`
      }
      return `${domain} caution: ${signal.keyword || signal.rowKey} requires recheck before commitment.`
    })
  const cautionSections = (graphSummary?.cautionSections || []).slice(0, preferredDomains ? 3 : 6)
  const cautionFromSections = cautionSections.map((section) =>
    lang === 'ko'
      ? `${section} ??? ?? ?? ??? ?? ?? ???? ???? ???.`
      : `${section} section has lower cross-evidence trust and should run verification-first.`
  )
  const trustCaution =
    (graphSummary?.lowTrustSetCount || 0) > 0
      ? [
          lang === 'ko'
            ? `??? ?? ?? ${graphSummary?.lowTrustSetCount || 0}?? ?? ??/??/????? ????? ?????.`
            : `There are ${graphSummary?.lowTrustSetCount || 0} low-trust cross sets, so keep sign/finalize decisions conservative.`,
        ]
      : []

  const cautions = uniqueStrings([...cautionSignals, ...cautionFromSections, ...trustCaution], 6)

  return {
    topInsights,
    drivers:
      drivers.length > 0
        ? drivers
        : [
            lang === 'ko'
              ? '?? ??? ??? ??? ?? ??? ?? ??? ?? ?? ???? ?? ????.'
              : 'Use the positive signals together with the current pace and phase before acting.',
          ],
    cautions:
      cautions.length > 0
        ? cautions
        : [
            lang === 'ko'
              ? '?? ??? ?? ??? ?? ?? ????? ??? ?? ?????.'
              : 'When evidence trust is low, apply checklist verification before commitment.',
          ],
    trust: {
      avgOverlapScore: graphSummary?.avgOverlapScore || 0,
      avgOrbFitScore: graphSummary?.avgOrbFitScore || 0,
      highTrustSetCount: graphSummary?.highTrustSetCount || 0,
      lowTrustSetCount: graphSummary?.lowTrustSetCount || 0,
      totalSets: graphSummary?.totalSets || 0,
    },
    cautionSections,
  }
}

function humanizeCrossSetFact(set: GraphRAGCrossEvidenceSet): string {
  const pairMatch = set.astrologyEvidence.match(/^([A-Za-z]+)-([a-z]+)-([A-Za-z]+)/i)
  const p1 = pairMatch?.[1] || '??'
  const aspectRaw = (pairMatch?.[2] || '').toLowerCase()
  const p2 = pairMatch?.[3] || '??'
  const aspectKoMap: Record<string, string> = {
    conjunction: '??? ????',
    opposition: '???? ?? ???? ??? ????',
    square: '?? ??? ??? ???',
    trine: '????? ??? ????',
    sextile: '???? ??? ???',
    quincunx: '??? ??? ??? ?? ????',
  }
  const aspectKo = aspectKoMap[aspectRaw] || '??? ???'
  const domains = set.overlapDomains.map(toKoreanDomainLabel).join(', ')
  return `${p1}? ${p2} ??? ${aspectKo}. ${domains} ?? ??? ????? ????.`
}

function extractTopMatrixFacts(matrixReport: FusionReport, sectionKey: string): string[] {
  const domainBySection: Record<string, string[]> = {
    introduction: ['personality', 'timing'],
    personalityDeep: ['personality'],
    careerPath: ['career', 'wealth'],
    relationshipDynamics: ['relationship'],
    wealthPotential: ['wealth', 'career'],
    healthGuidance: ['health'],
    lifeMission: ['spirituality', 'personality'],
    timingAdvice: ['timing'],
    actionPlan: ['career', 'relationship', 'wealth', 'health', 'timing'],
    conclusion: ['personality', 'timing'],
  }
  const targets = new Set(domainBySection[sectionKey] || ['personality'])
  return matrixReport.topInsights
    .filter((item) => targets.has(item.domain))
    .slice(0, 3)
    .map(
      (item) => `${item.title} ??? ?????. ??? ${toKoreanDomainLabel(item.domain)} ? ??? ? ?????.`
    )
}

function buildStrategyFactsForSection(
  strategyEngine: StrategyEngineResult | undefined,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string[] {
  if (!strategyEngine) return []
  const domains = getDomainsForSection(sectionKey)
  const candidates = strategyEngine.domainStrategies
    .filter((strategy) => domains.includes(strategy.domain))
    .slice(0, 2)
  if (candidates.length === 0) return []
  const lines: string[] = []
  for (const strategy of candidates) {
    const key = `${strategy.domain}:${strategy.phase}`
    const koActionByKey: Record<string, string> = {
      'career:expansion': '?? ?? 1~2?? ?? ???? ?? ??? ????? ? ?????.',
      'career:high_tension_expansion': '??? ?? ?????? 24?? ??? ?? ?? ????.',
      'relationship:expansion_guarded': '??? ??? ?? ??? ?? ?? ?? ??? ????.',
      'wealth:expansion_guarded': '?????????? 3?? ?? ???? ?? ??? ?????.',
      'health:defensive_reset': '??? ??? ???????? ???? ?????.',
      'timing:high_tension_expansion': '?? ??? ?? ??? ??? ?????? ???? ????.',
    }
    const enActionByKey: Record<string, string> = {
      'career:expansion':
        'Finish 1-2 core tasks first, then commit externally after checklist pass.',
      'career:high_tension_expansion':
        'Decide now, but push signing/sending behind a 24h recheck slot.',
      'relationship:expansion_guarded':
        'Increase dialogue and delay final statements to reduce interpretation errors.',
      'wealth:expansion_guarded':
        'Lock amount/deadline/cancellation terms first and split position size.',
      'health:defensive_reset': 'Stop overspeed and restore sleep-hydration-recovery blocks first.',
      'timing:high_tension_expansion':
        'Separate decision timing from execution timing to reduce communication risk.',
    }
    const phaseAction =
      lang === 'ko'
        ? koActionByKey[key] || '??? ??? ??? ???? ?? ? ???? ?????.'
        : enActionByKey[key] || 'Run staged execution with recheck gates before commitment.'

    if (lang === 'ko') {
      lines.push(
        `${toKoreanDomainLabel(strategy.domain)}? ${describePhaseFlow(
          strategy.phaseLabel,
          'ko'
        )} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'ko')}`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    } else {
      lines.push(
        `${strategy.domain} is in a phase where ${describePhaseFlow(
          strategy.phaseLabel,
          'en'
        ).toLowerCase()} ${describeExecutionStance(strategy.attackPercent, strategy.defensePercent, 'en')}`
      )
      lines.push(strategy.strategy)
      lines.push(phaseAction)
      if (strategy.riskControl) lines.push(strategy.riskControl)
    }
  }
  return lines
}

function buildSectionFactPack(
  sectionKey: keyof AIPremiumReport['sections'],
  anchor: GraphRAGEvidenceAnchor | undefined,
  matrixReport: FusionReport,
  input: MatrixCalculationInput,
  reportCore: ReportCoreViewModel | undefined,
  signalSynthesis?: SignalSynthesisResult,
  strategyEngine?: StrategyEngineResult,
  lang: 'ko' | 'en' = 'ko'
): string[] {
  const cleanFact = (line: string): string => {
    const normalized = sanitizeUserFacingNarrative(localizeReportNarrativeText(line, lang))
      .replace(/\bcore pattern family\b/gi, '')
      .replace(/\bpattern\b/gi, lang === 'ko' ? '??' : 'pattern')
      .replace(/\bscenario\b/gi, lang === 'ko' ? '??? ??' : 'scenario')
      .replace(/\bList [A-Za-z0-9 ,/-]+\b/g, '')
      .replace(/\bL\d+\b/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
    return normalized
  }
  const bullets: string[] = []
  const hasReportCore = Boolean(reportCore)
  if (!hasReportCore && input.dayMasterElement) {
    bullets.push(`??? ${input.dayMasterElement}??, ?? ??? ?? ??? ?? ??? ????.`)
  }
  if (!hasReportCore && input.geokguk) {
    bullets.push(`??? ${input.geokguk}? ???, ?? ?? ?? ??? ?? ??? ?????.`)
  }
  if (!hasReportCore && input.yongsin) {
    bullets.push(`??? ${input.yongsin}?? ???, ?? ??? ???? ??? ????? ?????.`)
  }

  const topSets = [...(anchor?.crossEvidenceSets || [])]
    .sort((a, b) => b.overlapScore - a.overlapScore)
    .slice(0, hasReportCore ? 1 : 2)
  for (const set of topSets) {
    bullets.push(humanizeCrossSetFact(set))
  }

  let addedTimingNarrative = false
  if (reportCore) {
    const sectionDomains = getDomainsForSection(sectionKey)
    for (const domain of sectionDomains) {
      const advisory = findReportCoreAdvisory(reportCore, domain)
      const timing = findReportCoreTimingWindow(reportCore, domain)
      const manifestation = findReportCoreManifestation(reportCore, domain)
      const verdict = findReportCoreVerdict(reportCore, domain)
      if (advisory?.thesis) bullets.push(advisory.thesis)
      if (advisory?.action) bullets.push(advisory.action)
      if (advisory?.caution) bullets.push(advisory.caution)
      if (timing) {
        bullets.push(buildTimingWindowNarrative(domain, timing, lang))
        addedTimingNarrative = true
      }
      if (manifestation) bullets.push(buildManifestationNarrative(manifestation, lang))
      if (verdict) bullets.push(buildVerdictNarrative(verdict, lang))
    }
    bullets.push(reportCore.primaryAction)
    bullets.push(reportCore.primaryCaution)
    bullets.push(reportCore.riskControl)
    bullets.push(reportCore.judgmentPolicy.rationale)
  } else {
    bullets.push(...buildSynthesisFactsForSection(signalSynthesis, sectionKey, lang))
    bullets.push(...buildStrategyFactsForSection(strategyEngine, sectionKey, lang))
    bullets.push(...extractTopMatrixFacts(matrixReport, sectionKey))
  }

  const activeTransits = (input.activeTransits || []).slice(0, 2)
  if (!hasReportCore && activeTransits.length > 0) {
    bullets.push(`?? ??? ${activeTransits.join(', ')}? ?? ??? ?? ??? ?????.`)
  }
  if (
    !hasReportCore &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push('??????????? ??? ?? ??? ?? ??? ?? ??? ?? ??? ???.')
  }
  if (
    hasReportCore &&
    !addedTimingNarrative &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push(
      lang === 'ko'
        ? '?? ??? ?? ??? ?? ?????, ?? ??? ???? ? ??? ??? ??? ?? ????.'
        : 'Long-cycle and short-cycle signals are moving together, so fix sequencing and verification before commitment.'
    )
  }

  return bullets
    .map((line) => cleanFact(line))
    .filter((line, idx, arr) => line.length > 0 && arr.indexOf(line) === idx)
    .slice(0, 12)
}

function buildSectionPrompt(
  sectionKey: keyof AIPremiumReport['sections'],
  factPack: string[],
  lang: 'ko' | 'en',
  draftText?: string,
  targetMinChars?: number
): string {
  const facts = factPack.map((fact) => `- ${fact}`).join('\n')
  const concreteNouns = SECTION_CONCRETE_NOUNS[sectionKey].join(', ')
  const minChars = Math.max(220, Math.floor(targetMinChars || (lang === 'ko' ? 420 : 320)))
  const longForm = minChars >= (lang === 'ko' ? 600 : 450)
  if (lang === 'ko') {
    return [
      '??? ??? ??? ?? ?? ?? ??? ??????.',
      `?? ??: ${sectionKey}`,
      '?? ??:',
      '- ??? ????? ?????.',
      '- ? ??? ? ??? ?? ???? ?????.',
      longForm ? '- 22~60??? ? ????? ???.' : '- 15~35??? ??? ? ????? ???.',
      longForm ? '- ??? 8~14???? ???? ???.' : '- ??? 4~7???? ???? ???.',
      `- ?? ${minChars}? ???? ???.`,
      '- bullet, ?? ??, JSON ??, ?? ??? ?? ????.',
      `- ??? ? ?? ??(${concreteNouns})? ????? ?????.`,
      '- ?? ?? ??, ???, ???? id? ??? ?? ????.',
      '- ??? ?? ????. ??? ?? ????? ???? ?????.',
      '- ???? ?? ??? ??? ? ?? ?????.',
      '- ????? ????? ??? ?? ?? ??? ??? ?? ???? ????.',
      draftText ? '?? ??? ??? ? ????? ?? ?? ???.' : '?? fact pack? ??? ???.',
      '?? ??:',
      facts,
      draftText ? `??:\n${draftText}` : '',
      '??? JSON? ?????: {"text":"..."}',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    'You are a combined Saju+Astrology counselor.',
    `Section: ${sectionKey}`,
    'Style rules:',
    '- Start with a direct conclusion, but vary opening expressions by section.',
    longForm
      ? '- Use medium-length declarative sentences with concrete detail and context.'
      : '- Use concise declarative sentences with concrete details.',
    longForm
      ? '- Write 8-14 connected sentences for this section.'
      : '- Write 4-7 connected sentences for this section.',
    `- This section must be at least ${minChars} characters.`,
    '- No hype, no absolutes, and no fear language.',
    '- No bullet or numbered output; prose paragraphs only.',
    '- Avoid repeating semantically equivalent sentences.',
    draftText
      ? 'Refine the draft with stronger depth and precision.'
      : 'Write only from the fact pack below.',
    'Fact pack:',
    facts,
    draftText ? `Draft:\n${draftText}` : '',
    'Return JSON only: {"text":"..."}',
  ]
    .filter(Boolean)
    .join('\n')
}

function summarizeTopInsightsByCategory(
  report: FusionReport,
  categories: string[],
  lang: 'ko' | 'en',
  limit = 3
): string {
  const rows = (report.topInsights || [])
    .filter((item) => categories.includes(item.category))
    .slice(0, limit)
    .map((item) => (lang === 'ko' ? item.title : item.titleEn || item.title))
    .filter(Boolean)
  return rows.length > 0
    ? rows.join(', ')
    : lang === 'ko'
      ? '?? ?????? ??'
      : 'Core signals in review'
}

function ensureLongSectionNarrative(base: string, minChars: number, extras: string[]): string {
  let out = String(base || '')
    .replace(/\s{2,}/g, ' ')
    .trim()
  const uniqExtras = [...new Set(extras.map((v) => String(v || '').trim()).filter(Boolean))]
  for (const extra of uniqExtras) {
    if (out.length >= minChars) break
    if (out.includes(extra)) continue
    out = `${out} ${extra}`.replace(/\s{2,}/g, ' ').trim()
  }
  return dedupeNarrativeSentences(out)
}

function cleanRecommendationLine(text: string, lang: 'ko' | 'en'): string {
  const normalized = sanitizeUserFacingNarrative(String(text || '').trim())
    .replace(/,+/g, ',')
    .replace(/,\s*/g, '. ')
    .replace(/\.\s*\./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return formatNarrativeParagraphs(normalized, lang)
}

function buildSynthesisPromptBlock(
  synthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  lang: 'ko' | 'en',
  mode: 'timing' | 'themed',
  theme?: ReportTheme
): string {
  if (!synthesis || synthesis.claims.length === 0) return ''
  const themeDomainMap: Record<ReportTheme, string[]> = {
    love: ['relationship', 'personality'],
    career: ['career', 'wealth'],
    wealth: ['wealth', 'career'],
    health: ['health', 'timing'],
    family: ['relationship', 'personality'],
  }
  const preferredDomains =
    mode === 'timing'
      ? ['timing', 'career', 'relationship', 'wealth', 'health']
      : themeDomainMap[theme || 'career']
  const pickedClaims = synthesis.claims
    .filter((claim) => preferredDomains.includes(claim.domain))
    .slice(0, 4)
  const claims = pickedClaims.length > 0 ? pickedClaims : synthesis.claims.slice(0, 3)
  const claimLines = claims.map((claim) => {
    const evidence = claim.evidence
      .slice(0, 2)
      .map((id) => synthesis.signalsById[id])
      .filter(Boolean)
      .map((signal) => `${signal.id}:${signal.keyword || signal.rowKey}`)
      .join(', ')
    if (lang === 'ko') {
      return `- ${claim.domain}: ${claim.thesis} | ??: ${evidence || 'pending'} | ??: ${claim.riskControl}`
    }
    return `- ${claim.domain}: ${claim.thesis} | evidence: ${evidence || 'pending'} | control: ${claim.riskControl}`
  })
  const strategyLines = (strategyEngine?.domainStrategies || [])
    .filter((item) => preferredDomains.includes(item.domain))
    .slice(0, 3)
    .map((item) =>
      lang === 'ko'
        ? `- ?? ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'ko')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'ko')} | thesis=${item.thesis}`
        : `- strategy ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'en')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'en')} | thesis=${item.thesis}`
    )
  if (lang === 'ko') {
    return [
      '## Signal Synthesizer (?? ??)',
      '- ?? ???? ?? ID? ???? ?? ?? ??',
      '- ?? ????? ??/??? ??? ??? ??? "?? + ?????"? ?? ??',
      strategyEngine
        ? `- ?? ??: ${describePhaseFlow(strategyEngine.overallPhaseLabel, 'ko')} ${describeExecutionStance(strategyEngine.attackPercent, strategyEngine.defensePercent, 'ko')}`
        : '',
      ...strategyLines,
      ...claimLines,
    ].join('\n')
  }
  return [
    '## Signal Synthesizer (fixed evidence)',
    '- Do not add facts beyond these claim/evidence IDs',
    '- If strength and caution coexist in a domain, synthesize as "upside + risk-control"',
    strategyEngine
      ? `- Overall phase: ${strategyEngine.overallPhaseLabel}, offense ${strategyEngine.attackPercent}% / defense ${strategyEngine.defensePercent}%`
      : '',
    ...strategyLines,
    ...claimLines,
  ].join('\n')
}

// ===========================
// Main generation function
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const detailLevel = options.detailLevel || 'detailed'
  const normalizedInput = buildNormalizedMatrixInput(input)

  // 1. Build prompt
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'comprehensive',
    focusDomain: options.focusDomain,
  })
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'comprehensive',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const fallbackSections = buildComprehensiveFallbackSectionsExternal(
      normalizedInput,
      matrixReport,
      deterministicCore,
      lang,
      comprehensiveFallbackDeps,
      reportCore,
      { matrixSummary: options.matrixSummary }
    )
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'comprehensive',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      birthDate: options.birthDate,
      timingData: options.timingData,
      sectionPaths,
      evidenceRefs,
    })
    const draftSections = mergeComprehensiveDraftWithBlocksExternal(
      [...COMPREHENSIVE_SECTION_KEYS],
      fallbackSections,
      unified.blocksBySection,
      lang,
      comprehensiveFallbackDeps
    )
    let sections = draftSections as unknown as Record<string, unknown>
    if (lang === 'ko') {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'comprehensive',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections<AIPremiumReport['sections']>({
      reportType: 'comprehensive',
      sections: sections as AIPremiumReport['sections'],
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 360 : 260,
    })
    sections = polished.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    sections = sanitizeComprehensiveSectionsForUser(
      sections as Record<string, unknown>,
      [...COMPREHENSIVE_SECTION_KEYS],
      comprehensivePostProcessDeps,
      lang
    )
    sections = applyComprehensiveSectionRoleGuards(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      comprehensivePostProcessDeps,
      lang
    )
    sections = repairMalformedComprehensiveSections(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    if (lang === 'en') {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
    }
    sections = stripGenericEvidenceFooters(sections, sectionPaths, lang)
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)

    const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
    const keyStrengths = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'strength')
      .slice(0, 3)
      .map((i) => i.title)
    const keyChallenges = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'challenge' || i.category === 'caution')
      .slice(0, 3)
      .map((i) => i.title)
    const domainFallback = [...(matrixReport.domainAnalysis || [])]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((d) =>
        lang === 'ko' ? `${d.domain} ??(${d.score})` : `${d.domain} strength (${d.score})`
      )
    const anchorFallback = (graphRagEvidence.anchors || [])
      .slice(0, 3)
      .map((a) =>
        lang === 'ko' ? `${a.section} ?? ?? ??` : `${a.section} section evidence alignment`
      )
    const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
    const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
    const safeKeyChallenges =
      keyChallenges.length > 0
        ? keyChallenges
        : lang === 'ko'
          ? ['?? ?? ?? ??', '?? ? ??? ??', '?????? ??? ??']
          : [
              'Caution signals require review',
              'Recheck before final commitment',
              'Communication risk check',
            ]
    let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
      sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
      qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
        requiredPaths: sectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      })
    }
    if (lang === 'en') {
      sections = {
        ...(sections as Record<string, unknown>),
        personalityDeep: renderPersonalityDeepSection(reportCore, normalizedInput, lang),
        timingAdvice: renderTimingAdviceSection(
          reportCore,
          normalizedInput,
          lang,
          options.matrixSummary
        ),
        actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
      }
      sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    }
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('comprehensive', finalModelUsed, qualityMetrics)
    let outputSections = buildExtendedComprehensiveSections(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang,
      options.matrixSummary
    )
    let outputSectionPaths = getComprehensiveRenderPaths(outputSections)
    outputSections = sanitizeComprehensiveSectionsForUser(
      outputSections as Record<string, unknown>,
      outputSectionPaths,
      comprehensivePostProcessDeps,
      lang
    ) as AIPremiumReport['sections']
    outputSectionPaths = getComprehensiveRenderPaths(outputSections)
    outputSections = applyFinalReportStyle(outputSections, outputSectionPaths, lang, reportCore)
    outputSectionPaths = getComprehensiveRenderPaths(outputSections)
    qualityMetrics = buildReportQualityMetrics(
      outputSections as Record<string, unknown>,
      outputSectionPaths,
      evidenceRefs,
      {
        requiredPaths: outputSectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      }
    )

    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore, lang),
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
        geokguk: input.geokguk,
      },
      sections: outputSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      renderedMarkdown: renderSectionsAsMarkdown(outputSections, outputSectionPaths, lang),
      renderedText: renderSectionsAsText(outputSections, outputSectionPaths),
      matrixSummary: {
        overallScore: matrixReport.overallScore.total,
        grade: matrixReport.overallScore.grade,
        topInsights: safeTopInsights,
        keyStrengths: safeKeyStrengths,
        keyChallenges: safeKeyChallenges,
      },
      signalSynthesis,
      strategyEngine,
      meta: {
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
    const evidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const fallbackSections = buildComprehensiveFallbackSectionsExternal(
      input,
      matrixReport,
      deterministicCore,
      lang,
      comprehensiveFallbackDeps,
      reportCore,
      { matrixSummary: options.matrixSummary }
    )
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'comprehensive',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      birthDate: options.birthDate,
      timingData: options.timingData,
      sectionPaths,
      evidenceRefs,
    })
    const draftSections = mergeComprehensiveDraftWithBlocksExternal(
      [...COMPREHENSIVE_SECTION_KEYS],
      fallbackSections,
      unified.blocksBySection,
      lang,
      comprehensiveFallbackDeps
    )
    const rewrite = await rewriteSectionsWithFallback<AIPremiumReport['sections']>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths: sectionPaths,
      minCharsPerSection: lang === 'ko' ? 380 : 280,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    if (lang === 'ko') {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'comprehensive',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    sections = sanitizeComprehensiveSectionsForUser(
      sections,
      [...COMPREHENSIVE_SECTION_KEYS],
      comprehensivePostProcessDeps,
      lang
    )
    sections = sanitizeComprehensiveSectionsForUser(
      sections as Record<string, unknown>,
      [...COMPREHENSIVE_SECTION_KEYS],
      comprehensivePostProcessDeps,
      lang
    )
    sections = applyComprehensiveSectionRoleGuards(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      comprehensivePostProcessDeps,
      lang
    )
    sections = repairMalformedComprehensiveSections(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    if (lang === 'en') {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
    }
    sections = stripGenericEvidenceFooters(sections, sectionPaths, lang)
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)

    const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
    const keyStrengths = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'strength')
      .slice(0, 3)
      .map((i) => i.title)
    const keyChallenges = (matrixReport.topInsights || [])
      .filter((i) => i.category === 'challenge' || i.category === 'caution')
      .slice(0, 3)
      .map((i) => i.title)
    const domainFallback = [...(matrixReport.domainAnalysis || [])]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((d) =>
        lang === 'ko' ? `${d.domain} ??(${d.score})` : `${d.domain} strength (${d.score})`
      )
    const anchorFallback = (graphRagEvidence.anchors || [])
      .slice(0, 3)
      .map((a) =>
        lang === 'ko' ? `${a.section} ?? ?? ??` : `${a.section} section evidence alignment`
      )
    const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
    const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
    const safeKeyChallenges =
      keyChallenges.length > 0
        ? keyChallenges
        : lang === 'ko'
          ? ['?? ?? ?? ??', '?? ? ??? ??', '?????? ??? ??']
          : [
              'Caution signals require review',
              'Recheck before final commitment',
              'Communication risk check',
            ]
    let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
      sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
      qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
        requiredPaths: sectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      })
    }
    recordReportQualityMetrics('comprehensive', rewrite.modelUsed, qualityMetrics)

    recordRewriteModeMetric('comprehensive', rewrite.modelUsed, rewrite.tokensUsed)
    let outputSections = buildExtendedComprehensiveSections(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang,
      options.matrixSummary
    )
    let outputSectionPaths = getComprehensiveRenderPaths(outputSections)
    outputSections = sanitizeComprehensiveSectionsForUser(
      outputSections as Record<string, unknown>,
      outputSectionPaths,
      comprehensivePostProcessDeps,
      lang
    ) as AIPremiumReport['sections']
    outputSectionPaths = getComprehensiveRenderPaths(outputSections)
    outputSections = applyFinalReportStyle(outputSections, outputSectionPaths, lang, reportCore)
    outputSectionPaths = getComprehensiveRenderPaths(outputSections)
    qualityMetrics = buildReportQualityMetrics(
      outputSections as Record<string, unknown>,
      outputSectionPaths,
      evidenceRefs,
      {
        requiredPaths: outputSectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      }
    )
    return {
      id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore, lang),
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
        geokguk: input.geokguk,
      },
      sections: outputSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      renderedMarkdown: renderSectionsAsMarkdown(outputSections, outputSectionPaths, lang),
      renderedText: renderSectionsAsText(outputSections, outputSectionPaths),
      matrixSummary: {
        overallScore: matrixReport.overallScore.total,
        grade: matrixReport.overallScore.grade,
        topInsights: safeTopInsights,
        keyStrengths: safeKeyStrengths,
        keyChallenges: safeKeyChallenges,
      },
      signalSynthesis,
      strategyEngine,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }

  const requestedChars =
    typeof options.targetChars === 'number' && Number.isFinite(options.targetChars)
      ? Math.max(3500, Math.min(32000, Math.floor(options.targetChars)))
      : detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 18000
          : 14000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 11000
            : 8500
          : undefined
  const maxTokensOverride = requestedChars ? Math.ceil(requestedChars / 2) + 1200 : undefined
  const costOptimizedAiPath = isCostOptimizedAiPath()
  const sectionTokenBudget = maxTokensOverride
    ? costOptimizedAiPath
      ? Math.max(700, Math.min(1400, Math.floor(maxTokensOverride / 6)))
      : Math.max(850, Math.min(2400, Math.floor(maxTokensOverride / 4)))
    : undefined
  const sectionMinChars =
    detailLevel === 'comprehensive'
      ? lang === 'ko'
        ? 850
        : 650
      : detailLevel === 'detailed'
        ? lang === 'ko'
          ? 600
          : 450
        : lang === 'ko'
          ? 380
          : 300

  const sectionAnchors = new Map(
    (graphRagEvidence.anchors || []).map((anchor) => [anchor.section, anchor])
  )
  const deterministicFallbackSections = buildComprehensiveFallbackSectionsExternal(
    normalizedInput,
    matrixReport,
    deterministicCore,
    lang,
    comprehensiveFallbackDeps,
    reportCore,
    { matrixSummary: options.matrixSummary }
  ) as Record<string, unknown>
  let sections: Record<string, unknown> = costOptimizedAiPath
    ? { ...deterministicFallbackSections }
    : {}
  let tokensUsed = 0
  const models = new Set<string>()
  let usedDeterministicFallback = false

  try {
    const liveSectionKeys = costOptimizedAiPath
      ? getCostOptimizedComprehensiveLiveSectionKeys()
      : COMPREHENSIVE_SECTION_KEYS
    for (const sectionKey of liveSectionKeys) {
      const anchor = sectionAnchors.get(sectionKey)
      const factPack = buildSectionFactPack(
        sectionKey,
        anchor,
        matrixReport,
        input,
        reportCore,
        signalSynthesis,
        strategyEngine,
        lang
      )
      const draftPrompt = buildSectionPrompt(sectionKey, factPack, lang, undefined, sectionMinChars)

      const draft = await callAIBackendGeneric<{ text: string }>(draftPrompt, lang, {
        userPlan: options.userPlan,
        maxTokensOverride: sectionTokenBudget,
        qualityTier: getAiQualityTier('base'),
        debugTag: `comprehensive.sectionDraft.${sectionKey}`,
      })
      tokensUsed += draft.tokensUsed || 0
      models.add(draft.model)
      const draftText = sanitizeSectionNarrative(draft.sections?.text || '')
      let sectionText = sanitizeTimingContradictionsExternal(
        postProcessSectionNarrative(draftText, sectionKey, lang),
        input
      )

      if (!costOptimizedAiPath) {
        const synthesisPrompt = buildSectionPrompt(
          sectionKey,
          factPack,
          lang,
          draftText,
          sectionMinChars
        )
        const synthesized = await callAIBackendGeneric<{ text: string }>(synthesisPrompt, lang, {
          userPlan: options.userPlan,
          maxTokensOverride: sectionTokenBudget,
          qualityTier: getAiQualityTier('base'),
          debugTag: `comprehensive.sectionSynthesis.${sectionKey}`,
        })
        tokensUsed += synthesized.tokensUsed || 0
        models.add(synthesized.model)
        sectionText = sanitizeTimingContradictionsExternal(
          postProcessSectionNarrative(synthesized.sections?.text || draftText, sectionKey, lang),
          input
        )
      }

      const quality = evaluateSectionGate(sectionText, factPack, sectionKey, containsBannedPhrase)
      if (!quality.pass && !costOptimizedAiPath) {
        const repairPrompt = [
          buildSectionPrompt(sectionKey, factPack, lang, sectionText, sectionMinChars),
          lang === 'ko'
            ? `?? ??: ? ???? ?? 3? ??, ?? ??? ?? 2? ??, ?? ?? ?? ??? ?? 2? ?? ???. ?? ?? ??? 40? ??? ??? ?? ??? ??? ???. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
            : `Repair rules: add at least 3 new points, include at least 2 concrete nouns, and reflect at least 2 fact-pack points. Keep average sentence length under 40 chars and remove banned phrases. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`,
        ].join('\n')
        try {
          const repaired = await callAIBackendGeneric<{ text: string }>(repairPrompt, lang, {
            userPlan: options.userPlan,
            maxTokensOverride: sectionTokenBudget,
            qualityTier: getAiQualityTier('repair'),
            debugTag: `comprehensive.sectionRepair.${sectionKey}`,
          })
          tokensUsed += repaired.tokensUsed || 0
          models.add(repaired.model)
          sectionText = sanitizeTimingContradictionsExternal(
            postProcessSectionNarrative(repaired.sections?.text || sectionText, sectionKey, lang),
            input
          )
        } catch (error) {
          logger.warn('[AI Report] Section repair failed; keeping synthesized text', {
            section: sectionKey,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      sections[sectionKey] = sectionText
    }
  } catch (error) {
    usedDeterministicFallback = true
    const fallbackSections = buildComprehensiveFallbackSectionsExternal(
      input,
      matrixReport,
      deterministicCore,
      lang,
      comprehensiveFallbackDeps,
      reportCore,
      { matrixSummary: options.matrixSummary }
    )
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
      sections[sectionKey] = fallbackSections[sectionKey]
    }
    logger.warn('[AI Report] Falling back to deterministic narrative sections', {
      error: error instanceof Error ? error.message : String(error),
      lang,
    })
  }

  const maxRepairPasses = getEffectiveMaxRepairPasses(options.userPlan)
  if (!usedDeterministicFallback && maxRepairPasses > 0) {
    const sectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
    const crossPaths = sectionPaths.filter((path) => path !== 'conclusion')
    const timingPaths = ['timingAdvice', 'actionPlan', 'careerPath', 'wealthPotential']
    const minCharsPerSection =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 600
          : 450
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 420
            : 300
          : lang === 'ko'
            ? 280
            : 220
    const minTotalChars =
      detailLevel === 'comprehensive'
        ? lang === 'ko'
          ? 9000
          : 7000
        : detailLevel === 'detailed'
          ? lang === 'ko'
            ? 6200
            : 4600
          : lang === 'ko'
            ? 4200
            : 3200
    const minCrossCoverage = 0.75
    const minActionCoverage = 0.7
    const minEvidenceTripletCoverage = 0.68
    const minTimingCoverage = 0.55

    const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
    const missingCross = getMissingCrossPaths(sections, crossPaths)
    const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
    const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
    const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
    const missingEvidenceTripletPaths = getMissingPathsByPredicate(
      sections,
      crossPaths,
      hasEvidenceTriplet
    )
    const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
      sections,
      crossPaths,
      hasEvidenceTriplet
    )
    const missingTimingPaths = getMissingPathsByPredicate(sections, timingPaths, hasTimingInText)
    const timingCoverageRatio = getCoverageRatioByPredicate(sections, timingPaths, hasTimingInText)
    const listStylePaths = getListStylePaths(sections, sectionPaths)
    const repetitivePaths = getRepetitivePaths(sections, sectionPaths)
    const totalChars = countSectionChars(sections)
    const needsRepair =
      shortPaths.length > 0 ||
      missingCross.length > 0 ||
      totalChars < minTotalChars ||
      crossCoverageRatio < minCrossCoverage ||
      actionCoverageRatio < minActionCoverage ||
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
      timingCoverageRatio < minTimingCoverage ||
      listStylePaths.length > 0 ||
      repetitivePaths.length > 0

    if (needsRepair && maxRepairPasses > 0) {
      const rewritePrompt = buildNarrativeRewritePrompt(lang, sections, {
        minCharsPerSection,
        minTotalChars,
        requiredTimingSections: timingPaths,
      })
      const repairPrompt = [
        rewritePrompt,
        buildDepthRepairInstruction(
          lang,
          sectionPaths,
          shortPaths,
          minCharsPerSection,
          minTotalChars
        ),
        missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
        crossCoverageRatio < minCrossCoverage
          ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
          : '',
        actionCoverageRatio < minActionCoverage
          ? buildActionRepairInstruction(
              lang,
              actionCoverageRatio,
              minActionCoverage,
              missingActionPaths
            )
          : '',
        evidenceTripletCoverageRatio < minEvidenceTripletCoverage
          ? buildEvidenceRepairInstruction(
              lang,
              evidenceTripletCoverageRatio,
              minEvidenceTripletCoverage,
              missingEvidenceTripletPaths
            )
          : '',
        timingCoverageRatio < minTimingCoverage
          ? buildTimingRepairInstruction(
              lang,
              timingCoverageRatio,
              minTimingCoverage,
              missingTimingPaths
            )
          : '',
        listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
        repetitivePaths.length > 0 ? buildAntiRepetitionInstruction(lang, repetitivePaths) : '',
      ]
        .filter(Boolean)
        .join('\n')

      try {
        const repaired = await callAIBackendGeneric<AIPremiumReport['sections']>(
          repairPrompt,
          lang,
          {
            userPlan: options.userPlan,
            maxTokensOverride,
            qualityTier: getAiQualityTier('repair'),
            debugTag: 'comprehensive.globalRepair',
          }
        )
        const candidateSections = repaired.sections as unknown
        if (isComprehensiveSectionsPayload(candidateSections)) {
          sections = candidateSections
        }
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)

        const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
        const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
        const secondActionCoverageRatio = getCoverageRatioByPredicate(
          sections,
          crossPaths,
          hasActionInText
        )
        const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
          sections,
          crossPaths,
          hasEvidenceTriplet
        )
        const secondTimingCoverageRatio = getCoverageRatioByPredicate(
          sections,
          timingPaths,
          hasTimingInText
        )
        const secondTotalChars = countSectionChars(sections)
        if (
          maxRepairPasses > 1 &&
          (secondShortPaths.length > 0 ||
            secondTotalChars < minTotalChars ||
            secondCrossCoverageRatio < minCrossCoverage ||
            secondActionCoverageRatio < minActionCoverage ||
            secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
            secondTimingCoverageRatio < minTimingCoverage)
        ) {
          const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
          try {
            const second = await callAIBackendGeneric<AIPremiumReport['sections']>(
              secondPrompt,
              lang,
              {
                userPlan: options.userPlan,
                maxTokensOverride,
                qualityTier: getAiQualityTier('repair'),
                debugTag: 'comprehensive.globalRepair.second',
              }
            )
            const secondCandidate = second.sections as unknown
            if (isComprehensiveSectionsPayload(secondCandidate)) {
              sections = secondCandidate
            }
            tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
            models.add(second.model)
          } catch (error) {
            logger.warn(
              '[AI Report] Second global repair pass failed; keeping first repaired result',
              {
                error: error instanceof Error ? error.message : String(error),
                plan: options.userPlan || 'free',
              }
            )
          }
        }
      } catch (error) {
        logger.warn('[AI Report] Global narrative repair failed; keeping section-wise result', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }
  }

  const comprehensiveSectionPaths = [...COMPREHENSIVE_SECTION_KEYS] as string[]
  const comprehensiveEvidenceRefs = buildComprehensiveEvidenceRefs(signalSynthesis)
  if (!usedDeterministicFallback) {
    const evidenceCheck = validateEvidenceBinding(
      sections,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs
    )
    if (evidenceCheck.needsRepair && maxRepairPasses > 0) {
      try {
        const repairPrompt = buildEvidenceBindingRepairPrompt(
          lang,
          sections,
          comprehensiveEvidenceRefs,
          evidenceCheck.violations
        )
        const repaired = await callAIBackendGeneric<AIPremiumReport['sections']>(
          repairPrompt,
          lang,
          {
            userPlan: options.userPlan,
            maxTokensOverride,
            qualityTier: getAiQualityTier('repair'),
            debugTag: 'comprehensive.evidenceRepair',
          }
        )
        const candidate = repaired.sections as unknown
        if (isComprehensiveSectionsPayload(candidate)) {
          sections = candidate
        }
        tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
        models.add(repaired.model)
      } catch (error) {
        logger.warn('[AI Report] Evidence-binding repair failed; keeping current sections', {
          error: error instanceof Error ? error.message : String(error),
          plan: options.userPlan || 'free',
        })
      }
    }

    const finalEvidenceCheck = validateEvidenceBinding(
      sections,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs
    )
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        comprehensiveEvidenceRefs,
        lang
      )
    }
  }
  sections = enforceEvidenceRefFooters(
    sections,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )
  sections = sanitizeSectionsByPathsExternal(
    sections,
    comprehensiveSectionPaths,
    narrativePathSanitizerDeps
  )
  sections = sanitizeComprehensiveSectionsForUser(
    sections,
    [...COMPREHENSIVE_SECTION_KEYS],
    comprehensivePostProcessDeps,
    lang
  )
  sections = applyComprehensiveSectionRoleGuards(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    comprehensivePostProcessDeps,
    lang
  )
  sections = repairMalformedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  )
  if (lang === 'en') {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    ) as unknown as Record<string, unknown>
  }
  sections = enforceEvidenceRefFooters(
    sections,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )

  const model = usedDeterministicFallback ? 'deterministic-fallback' : [...models].join(' -> ')
  const topInsights = (matrixReport.topInsights || []).slice(0, 3).map((i) => i.title)
  const keyStrengths = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'strength')
    .slice(0, 3)
    .map((i) => i.title)
  const keyChallenges = (matrixReport.topInsights || [])
    .filter((i) => i.category === 'challenge' || i.category === 'caution')
    .slice(0, 3)
    .map((i) => i.title)
  const domainFallback = [...(matrixReport.domainAnalysis || [])]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((d) =>
      lang === 'ko' ? `${d.domain} ??(${d.score})` : `${d.domain} strength (${d.score})`
    )
  const anchorFallback = (graphRagEvidence.anchors || [])
    .slice(0, 3)
    .map((a) =>
      lang === 'ko' ? `${a.section} ?? ?? ??` : `${a.section} section evidence alignment`
    )
  const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
  const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
  const safeKeyChallenges =
    keyChallenges.length > 0
      ? keyChallenges
      : lang === 'ko'
        ? ['?? ?? ?? ??', '?? ? ??? ??', '?????? ??? ??']
        : [
            'Caution signals require review',
            'Recheck before final commitment',
            'Communication risk check',
          ]
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'comprehensive',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    birthDate: options.birthDate,
    timingData: options.timingData,
    sectionPaths: comprehensiveSectionPaths,
    evidenceRefs: comprehensiveEvidenceRefs,
  })
  sections = sanitizeComprehensiveSectionsForUser(
    sections as Record<string, unknown>,
    [...COMPREHENSIVE_SECTION_KEYS],
    comprehensivePostProcessDeps,
    lang
  )
  sections = applyComprehensiveSectionRoleGuards(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    comprehensivePostProcessDeps,
    lang
  )
  sections = repairMalformedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  )
  if (lang === 'en') {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    ) as unknown as Record<string, unknown>
  }
  sections = enforceEvidenceRefFooters(
    sections as Record<string, unknown>,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    lang
  )
  let qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    comprehensiveSectionPaths,
    comprehensiveEvidenceRefs,
    {
      requiredPaths: comprehensiveSectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )
  if (shouldForceComprehensiveNarrativeFallback(qualityMetrics)) {
    sections = enforceComprehensiveNarrativeQualityFallback(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang
    )
    sections = enforceEvidenceRefFooters(
      sections as Record<string, unknown>,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs,
      lang
    ) as AIPremiumReport['sections']
    qualityMetrics = buildReportQualityMetrics(
      sections as Record<string, unknown>,
      comprehensiveSectionPaths,
      comprehensiveEvidenceRefs,
      {
        requiredPaths: comprehensiveSectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      }
    )
  }
  recordReportQualityMetrics('comprehensive', model, qualityMetrics)

  sections = repairMalformedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang
  ) as unknown as Record<string, unknown>
  let outputSections = buildExtendedComprehensiveSections(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang,
    options.matrixSummary
  )
  let outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  outputSections = sanitizeComprehensiveSectionsForUser(
    outputSections as Record<string, unknown>,
    outputSectionPaths,
    comprehensivePostProcessDeps,
    lang
  ) as AIPremiumReport['sections']
  outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  outputSections = applyFinalReportStyle(outputSections, outputSectionPaths, lang, reportCore)
  outputSectionPaths = getComprehensiveRenderPaths(outputSections)
  qualityMetrics = buildReportQualityMetrics(
    outputSections as Record<string, unknown>,
    outputSectionPaths,
    comprehensiveEvidenceRefs,
    {
      requiredPaths: outputSectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 3. ??? ??
  const report: AIPremiumReport = {
    id: `air_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...buildReportOutputCoreFields(reportCore, lang),
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
      geokguk: input.geokguk,
    },

    sections: outputSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: comprehensiveEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    renderedMarkdown: [
      renderSectionsAsMarkdown(outputSections as Record<string, unknown>, outputSectionPaths, lang),
    ]
      .filter(Boolean)
      .join('\n\n'),
    renderedText: [
      renderProjectionBlocksAsText(
        buildReportOutputCoreFields(reportCore, lang).projections,
        lang,
        {
          matrixView: buildReportOutputCoreFields(reportCore, lang).matrixView,
          singleUserModel: buildReportOutputCoreFields(reportCore, lang).singleUserModel,
          branchSet: buildReportOutputCoreFields(reportCore, lang).branchSet,
          singleSubjectView: buildReportOutputCoreFields(reportCore, lang).singleSubjectView,
        }
      ),
      renderSectionsAsText(outputSections as Record<string, unknown>, outputSectionPaths, lang),
    ]
      .filter(Boolean)
      .join('\n\n'),

    matrixSummary: {
      overallScore: matrixReport.overallScore.total,
      grade: matrixReport.overallScore.grade,
      topInsights: safeTopInsights,
      keyStrengths: safeKeyStrengths,
      keyChallenges: safeKeyChallenges,
    },
    signalSynthesis,
    strategyEngine,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics,
    },
  }

  return report
}

// ===========================
// Timing report generation function
// ===========================

export async function generateTimingReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  period: ReportPeriod,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    targetDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    deterministicOnly?: boolean
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {}
): Promise<TimingAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const targetDate = options.targetDate || new Date().toISOString().split('T')[0]
  const normalizedInput = buildNormalizedMatrixInput(input)
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'timing',
    period,
  })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'timing',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const sectionPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]
    const draftSections = buildTimingFallbackSectionsExternal(
      normalizedInput,
      reportCore,
      signalSynthesis,
      lang,
      secondaryFallbackDeps
    )
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'timing',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      period,
      targetDate,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichTimingSectionsWithReportCore(
      sections as unknown as TimingReportSections,
      reportCore,
      lang,
      reportCoreEnrichmentDeps
    ) as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'timing',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections<TimingReportSections>({
      reportType: 'timing',
      sections: sections as unknown as TimingReportSections,
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 320 : 240,
    })
    sections = polished.sections as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'timing',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
      ],
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('timing', finalModelUsed, qualityMetrics)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore, lang),
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      period,
      targetDate,
      periodLabel,
      timingData,
      sections: sections as unknown as TimingReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
    const sectionPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]
    const requiredPaths = [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
    ]
    const draftSections = buildTimingFallbackSectionsExternal(
      normalizedInput,
      reportCore,
      signalSynthesis,
      lang,
      secondaryFallbackDeps
    )
    const evidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'timing',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      period,
      targetDate,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const rewrite = await rewriteSectionsWithFallback<TimingReportSections>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 320 : 240,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    sections = enrichTimingSectionsWithReportCore(
      sections as unknown as TimingReportSections,
      reportCore,
      lang,
      reportCoreEnrichmentDeps
    ) as unknown as Record<string, unknown>
    const periodLabel = generatePeriodLabel(period, targetDate, lang)
    const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
    const qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    recordReportQualityMetrics('timing', rewrite.modelUsed, qualityMetrics)
    recordRewriteModeMetric('timing', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      period,
      targetDate,
      periodLabel,
      timingData,
      sections: sections as unknown as TimingReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      periodScore,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock('comprehensive', lang)
  const synthesisPromptBlock = buildSynthesisPromptBlock(
    signalSynthesis,
    strategyEngine,
    lang,
    'timing'
  )

  // 1. Build matrix summary
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. Build prompt
  const prompt = `${buildTimingPrompt(
    period,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
    },
    timingData,
    targetDate,
    matrixSummary,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}\n\n${synthesisPromptBlock}`

  // 3. Call AI backend + quality gate (length/cross evidence)
  const base = await callAIBackendGeneric<TimingReportSections>(prompt, lang, {
    userPlan: options.userPlan,
    qualityTier: getAiQualityTier('base'),
  })
  const timingRequiredPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  let sections = hasRequiredSectionPaths(base.sections as unknown, timingRequiredPaths)
    ? (base.sections as unknown as Record<string, unknown>)
    : (buildTimingFallbackSectionsExternal(
        normalizedInput,
        reportCore,
        signalSynthesis,
        lang,
        secondaryFallbackDeps
      ) as unknown as Record<string, unknown>)
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getEffectiveMaxRepairPasses(options.userPlan)

  const sectionPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
    'luckyElements',
  ]
  const crossPaths = [
    'overview',
    'energy',
    'opportunities',
    'cautions',
    'domains.career',
    'domains.love',
    'domains.wealth',
    'domains.health',
    'actionPlan',
  ]
  const minCharsPerSection = lang === 'ko' ? 300 : 230
  const minTotalChars = lang === 'ko' ? 5200 : 4000
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65

  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<TimingReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
        qualityTier: getAiQualityTier('repair'),
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, timingRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<TimingReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
            qualityTier: getAiQualityTier('repair'),
          })
          const secondSections = second.sections as unknown
          if (hasRequiredSectionPaths(secondSections, timingRequiredPaths)) {
            sections = secondSections as Record<string, unknown>
          }
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Timing Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Timing Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const timingEvidenceRefs = buildTimingEvidenceRefs(sectionPaths, signalSynthesis)
  const timingEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, timingEvidenceRefs)
  if (timingEvidenceCheck.needsRepair && maxRepairPasses > 0) {
    try {
      const repairPrompt = buildEvidenceBindingRepairPrompt(
        lang,
        sections,
        timingEvidenceRefs,
        timingEvidenceCheck.violations
      )
      const repaired = await callAIBackendGeneric<TimingReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
        qualityTier: getAiQualityTier('repair'),
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, timingRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
    } catch (error) {
      logger.warn('[Timing Report] Evidence-binding repair failed; using current response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const finalTimingEvidenceCheck = validateEvidenceBinding(
    sections,
    sectionPaths,
    timingEvidenceRefs
  )
  if (finalTimingEvidenceCheck.needsRepair) {
    sections = enforceEvidenceBindingFallback(
      sections,
      finalTimingEvidenceCheck.violations,
      timingEvidenceRefs,
      lang
    )
  }
  sections = enforceEvidenceRefFooters(sections, sectionPaths, timingEvidenceRefs, lang)
  sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
  sections = enrichTimingSectionsWithReportCore(
    sections as unknown as TimingReportSections,
    reportCore,
    lang,
    reportCoreEnrichmentDeps
  ) as unknown as Record<string, unknown>

  // 4. Build period label
  const periodLabel = generatePeriodLabel(period, targetDate, lang)

  // 5. Calculate score
  const periodScore = calculatePeriodScore(timingData, input.dayMasterElement)
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'timing',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    period,
    targetDate,
    timingData,
    birthDate: options.birthDate,
    sectionPaths,
    evidenceRefs: timingEvidenceRefs,
  })
  const qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    timingEvidenceRefs,
    {
      requiredPaths: timingRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )
  sections = applyFinalReportStyle(
    sections as Record<string, unknown>,
    sectionPaths,
    lang,
    reportCore
  )
  const styledTimingQualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    timingEvidenceRefs,
    {
      requiredPaths: timingRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 6. Assemble report
  const report: TimingAIPremiumReport = {
    id: `timing_${period}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...buildReportOutputCoreFields(reportCore, lang),
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    period,
    targetDate,
    periodLabel,

    timingData,
    sections: sections as unknown as TimingReportSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: timingEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    strategyEngine,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      [
        'overview',
        'energy',
        'opportunities',
        'cautions',
        'domains.career',
        'domains.love',
        'domains.wealth',
        'domains.health',
        'actionPlan',
        'luckyElements',
      ],
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, [
      'overview',
      'energy',
      'opportunities',
      'cautions',
      'domains.career',
      'domains.love',
      'domains.wealth',
      'domains.health',
      'actionPlan',
      'luckyElements',
    ]),
    periodScore,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics: styledTimingQualityMetrics,
    },
  }

  recordReportQualityMetrics('timing', model, report.meta.qualityMetrics!)

  return report
}

// ===========================
// Themed report generation function
// ===========================

export async function generateThemedReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  theme: ReportTheme,
  timingData: TimingData,
  options: {
    name?: string
    birthDate?: string
    lang?: 'ko' | 'en'
    userPlan?: AIUserPlan
    deterministicOnly?: boolean
    userQuestion?: string
    deterministicProfile?: DeterministicProfile
    matrixSummary?: MatrixSummary
  } = {}
): Promise<ThemedAIPremiumReport> {
  const startTime = Date.now()
  const lang = options.lang || 'ko'
  const normalizedInput = buildNormalizedMatrixInput(input)
  const graphRagEvidence = buildGraphRAGEvidence(normalizedInput, matrixReport, {
    mode: 'themed',
    theme,
  })
  const graphRagEvidencePrompt = formatGraphRAGEvidenceForPrompt(graphRagEvidence, lang)
  const deterministicCore = buildDeterministicCore({
    matrixInput: normalizedInput,
    matrixReport,
    graphEvidence: graphRagEvidence,
    userQuestion: options.userQuestion,
    lang,
    profile: options.deterministicProfile,
  })
  const coreSeed = runDestinyCore({
    mode: 'themed',
    lang,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
  })
  const reportCore = adaptCoreToReport(coreSeed, lang)
  const signalSynthesis = coreSeed.signalSynthesis
  const strategyEngine = coreSeed.strategyEngine
  const topMatchedPatterns = buildTopMatchedPatterns(coreSeed.patterns)
  const graphRagSummary = buildGraphRagSummaryPayload(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
  const deterministicOnly = shouldUseDeterministicOnly(options.deterministicOnly)

  if (deterministicOnly) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const draftSections = buildProjectionFirstThemedSections(
      theme,
      reportCore,
      normalizedInput,
      lang,
      timingData
    )
    const evidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'themed',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichThemedSectionsWithReportCore(
      sections as unknown as ThemedReportSections,
      reportCore,
      lang,
      theme,
      normalizedInput,
      reportCoreEnrichmentDeps,
      timingData
    ) as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'themed',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const polished = await maybePolishPremiumSections<ThemedReportSections>({
      reportType: 'themed',
      theme,
      sections: sections as unknown as ThemedReportSections,
      lang,
      userPlan: options.userPlan,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      minCharsPerSection: lang === 'ko' ? 340 : 260,
    })
    sections = polished.sections as unknown as Record<string, unknown>
    {
      const trustNarratives = buildReportTrustNarratives(reportCore, coreSeed.quality, lang)
      sections = attachTrustNarrativeToSections(
        'themed',
        sections,
        trustNarratives.trust,
        trustNarratives.provenance
      )
    }
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    sections = sanitizeThemedSectionsForUserExternal(
      sections,
      sectionPaths,
      lang,
      secondaryPostProcessDeps,
      theme
    )
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    const themeMeta = THEME_META[theme]
    const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)
    const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
    let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths: sectionPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    if (shouldForceThemedNarrativeFallback(qualityMetrics)) {
      sections = enforceThemedNarrativeQualityFallback(
        theme,
        reportCore,
        signalSynthesis,
        normalizedInput,
        lang,
        timingData,
        evidenceRefs
      ) as unknown as Record<string, unknown>
      qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
        requiredPaths: sectionPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      })
    }
    sections = finalizeThemedSectionsForUser(
      theme,
      reportCore,
      normalizedInput,
      lang,
      timingData
    ) as unknown as Record<string, unknown>
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    const finalModelUsed = polished.modelUsed
      ? `deterministic+${polished.modelUsed}`
      : 'deterministic-only'
    const finalReportVersion = polished.modelUsed
      ? '1.2.0-deterministic+rewrite'
      : '1.2.0-deterministic-only'
    recordReportQualityMetrics('themed', finalModelUsed, qualityMetrics)
    return {
      id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore, lang),
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      theme,
      themeLabel: themeMeta.label[lang],
      themeEmoji: themeMeta.emoji,
      sections: sections as unknown as ThemedReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      themeScore,
      keywords,
      meta: {
        modelUsed: finalModelUsed,
        tokensUsed: polished.tokensUsed || 0,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: finalReportVersion,
        qualityMetrics,
      },
    }
  }

  if (FORCE_REWRITE_ONLY_MODE && !deterministicOnly) {
    const sectionPaths = [...getThemedSectionKeys(theme)]
    const requiredPaths = [...sectionPaths]
    const draftSections = buildProjectionFirstThemedSections(
      theme,
      reportCore,
      normalizedInput,
      lang,
      timingData
    )
    const evidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
    const generatedAt = new Date().toISOString()
    const unified = buildUnifiedEnvelope({
      mode: 'themed',
      lang,
      generatedAt,
      matrixInput: normalizedInput,
      matrixReport,
      matrixSummary: options.matrixSummary,
      signalSynthesis,
      graphRagEvidence,
      timingData,
      birthDate: options.birthDate,
      sectionPaths,
      evidenceRefs,
    })
    const rewrite = await rewriteSectionsWithFallback<ThemedReportSections>({
      lang,
      userPlan: options.userPlan,
      draftSections,
      evidenceRefs,
      blocksBySection: unified.blocksBySection,
      sectionPaths,
      requiredPaths,
      minCharsPerSection: lang === 'ko' ? 340 : 260,
    })
    let sections = rewrite.sections as unknown as Record<string, unknown>
    const finalEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, evidenceRefs)
    if (finalEvidenceCheck.needsRepair) {
      sections = enforceEvidenceBindingFallback(
        sections,
        finalEvidenceCheck.violations,
        evidenceRefs,
        lang
      )
    }
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
    sections = enrichThemedSectionsWithReportCore(
      sections as unknown as ThemedReportSections,
      reportCore,
      lang,
      theme,
      normalizedInput,
      reportCoreEnrichmentDeps,
      timingData
    ) as unknown as Record<string, unknown>
    sections = sanitizeThemedSectionsForUserExternal(
      sections,
      sectionPaths,
      lang,
      secondaryPostProcessDeps,
      theme
    )
    sections = enforceEvidenceRefFooters(sections, sectionPaths, evidenceRefs, lang)
    const themeMeta = THEME_META[theme]
    const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)
    const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
    let qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
      requiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    })
    if (shouldForceThemedNarrativeFallback(qualityMetrics)) {
      sections = enforceThemedNarrativeQualityFallback(
        theme,
        reportCore,
        signalSynthesis,
        normalizedInput,
        lang,
        timingData,
        evidenceRefs
      ) as unknown as Record<string, unknown>
      qualityMetrics = buildReportQualityMetrics(sections, sectionPaths, evidenceRefs, {
        requiredPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      })
    }
    recordReportQualityMetrics('themed', rewrite.modelUsed, qualityMetrics)
    recordRewriteModeMetric('themed', rewrite.modelUsed, rewrite.tokensUsed)
    return {
      id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      generatedAt,
      lang,
      ...buildReportOutputCoreFields(reportCore, lang),
      ...unified,
      coreHash: coreSeed.coreHash,
      patterns: coreSeed.patterns,
      topMatchedPatterns,
      scenarios: coreSeed.scenarios,
      profile: {
        name: options.name,
        birthDate: options.birthDate,
        dayMaster: input.dayMasterElement,
        dominantElement: input.dominantWesternElement || input.dayMasterElement,
      },
      theme,
      themeLabel: themeMeta.label[lang],
      themeEmoji: themeMeta.emoji,
      sections: sections as unknown as ThemedReportSections,
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      strategyEngine,
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
      themeScore,
      keywords,
      meta: {
        modelUsed: rewrite.modelUsed,
        tokensUsed: rewrite.tokensUsed,
        processingTime: Math.max(1, Date.now() - startTime),
        reportVersion: '1.1.0-rewrite-only',
        qualityMetrics,
      },
    }
  }
  const inferredAge = inferAgeFromBirthDate(options.birthDate)
  const lifecyclePrompt = inferredAge !== null ? buildLifeCyclePromptBlock(inferredAge, lang) : ''
  const themeSchemaPrompt = buildThemeSchemaPromptBlock(theme, lang)
  const synthesisPromptBlock = buildSynthesisPromptBlock(
    signalSynthesis,
    strategyEngine,
    lang,
    'themed',
    theme
  )

  // 1. Build matrix summary
  const matrixSummary = buildMatrixSummary(matrixReport, lang)

  // 2. Build prompt
  const prompt = `${buildThemedPrompt(
    theme,
    lang,
    {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dayMasterElement: input.dayMasterElement,
      sibsinDistribution: input.sibsinDistribution,
    },
    timingData,
    matrixSummary,
    undefined,
    graphRagEvidencePrompt,
    options.userQuestion,
    deterministicCore.promptBlock
  )}\n\n${themeSchemaPrompt}\n\n${lifecyclePrompt}\n\n${buildDirectToneOverride(lang)}\n\n${synthesisPromptBlock}`

  // 3. Call AI backend + quality gate (length/cross evidence)
  const base = await callAIBackendGeneric<ThemedReportSections>(prompt, lang, {
    userPlan: options.userPlan,
    qualityTier: getAiQualityTier('base'),
  })
  const themedRequiredPaths = [...getThemedSectionKeys(theme)]
  let sections = hasRequiredSectionPaths(base.sections as unknown, themedRequiredPaths)
    ? (base.sections as unknown as Record<string, unknown>)
    : (buildProjectionFirstThemedSections(
        theme,
        reportCore,
        normalizedInput,
        lang,
        timingData
      ) as unknown as Record<string, unknown>)
  let model = base.model
  let tokensUsed = base.tokensUsed
  const maxRepairPasses = getEffectiveMaxRepairPasses(options.userPlan)

  const sectionPaths = [...getThemedSectionKeys(theme)]
  const crossPaths = sectionPaths.filter((path) => path !== 'recommendations')
  const minCharsPerSection = lang === 'ko' ? 320 : 240
  const minTotalChars = lang === 'ko' ? 5600 : 4200
  const minCrossCoverage = 0.72
  const minActionCoverage = 0.65
  const minEvidenceTripletCoverage = 0.65
  const shortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
  const missingCross = getMissingCrossPaths(sections, crossPaths)
  const crossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
  const missingActionPaths = getMissingPathsByPredicate(sections, crossPaths, hasActionInText)
  const actionCoverageRatio = getCoverageRatioByPredicate(sections, crossPaths, hasActionInText)
  const missingEvidenceTripletPaths = getMissingPathsByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const evidenceTripletCoverageRatio = getCoverageRatioByPredicate(
    sections,
    crossPaths,
    hasEvidenceTriplet
  )
  const listStylePaths = getListStylePaths(sections, sectionPaths)
  const totalChars = countSectionChars(sections)
  const needsRepair =
    shortPaths.length > 0 ||
    missingCross.length > 0 ||
    totalChars < minTotalChars ||
    crossCoverageRatio < minCrossCoverage ||
    actionCoverageRatio < minActionCoverage ||
    evidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
    listStylePaths.length > 0

  if (needsRepair && maxRepairPasses > 0) {
    const repairPrompt = [
      prompt,
      buildDepthRepairInstruction(
        lang,
        sectionPaths,
        shortPaths,
        minCharsPerSection,
        minTotalChars
      ),
      missingCross.length > 0 ? buildCrossRepairInstruction(lang, missingCross) : '',
      crossCoverageRatio < minCrossCoverage
        ? buildCrossCoverageRepairInstruction(lang, crossCoverageRatio, minCrossCoverage)
        : '',
      actionCoverageRatio < minActionCoverage
        ? buildActionRepairInstruction(
            lang,
            actionCoverageRatio,
            minActionCoverage,
            missingActionPaths
          )
        : '',
      evidenceTripletCoverageRatio < minEvidenceTripletCoverage
        ? buildEvidenceRepairInstruction(
            lang,
            evidenceTripletCoverageRatio,
            minEvidenceTripletCoverage,
            missingEvidenceTripletPaths
          )
        : '',
      listStylePaths.length > 0 ? buildNarrativeStyleRepairInstruction(lang, listStylePaths) : '',
    ]
      .filter(Boolean)
      .join('\n')
    try {
      const repaired = await callAIBackendGeneric<ThemedReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
        qualityTier: getAiQualityTier('repair'),
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, themedRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)

      const secondShortPaths = getShortSectionPaths(sections, sectionPaths, minCharsPerSection)
      const secondMissingCross = getMissingCrossPaths(sections, crossPaths)
      const secondCrossCoverageRatio = getCrossCoverageRatio(sections, crossPaths)
      const secondActionCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasActionInText
      )
      const secondEvidenceTripletCoverageRatio = getCoverageRatioByPredicate(
        sections,
        crossPaths,
        hasEvidenceTriplet
      )
      const secondListStylePaths = getListStylePaths(sections, sectionPaths)
      const secondTotalChars = countSectionChars(sections)
      if (
        maxRepairPasses > 1 &&
        (secondShortPaths.length > 0 ||
          secondMissingCross.length > 0 ||
          secondTotalChars < minTotalChars ||
          secondCrossCoverageRatio < minCrossCoverage ||
          secondActionCoverageRatio < minActionCoverage ||
          secondEvidenceTripletCoverageRatio < minEvidenceTripletCoverage ||
          secondListStylePaths.length > 0)
      ) {
        const secondPrompt = [repairPrompt, buildSecondPassInstruction(lang)].join('\n')
        try {
          const second = await callAIBackendGeneric<ThemedReportSections>(secondPrompt, lang, {
            userPlan: options.userPlan,
            qualityTier: getAiQualityTier('repair'),
          })
          const secondSections = second.sections as unknown
          if (hasRequiredSectionPaths(secondSections, themedRequiredPaths)) {
            sections = secondSections as Record<string, unknown>
          }
          model = second.model
          tokensUsed = (tokensUsed || 0) + (second.tokensUsed || 0)
        } catch (error) {
          logger.warn('[Themed Report] Second repair pass failed; using first repaired result', {
            error: error instanceof Error ? error.message : String(error),
            plan: options.userPlan || 'free',
          })
        }
      }
    } catch (error) {
      logger.warn('[Themed Report] Repair pass failed; using base response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const themedEvidenceRefs = buildThemedEvidenceRefs(theme, sectionPaths, signalSynthesis)
  const themedEvidenceCheck = validateEvidenceBinding(sections, sectionPaths, themedEvidenceRefs)
  if (themedEvidenceCheck.needsRepair && maxRepairPasses > 0) {
    try {
      const repairPrompt = buildEvidenceBindingRepairPrompt(
        lang,
        sections,
        themedEvidenceRefs,
        themedEvidenceCheck.violations
      )
      const repaired = await callAIBackendGeneric<ThemedReportSections>(repairPrompt, lang, {
        userPlan: options.userPlan,
        qualityTier: getAiQualityTier('repair'),
      })
      const repairedSections = repaired.sections as unknown
      if (hasRequiredSectionPaths(repairedSections, themedRequiredPaths)) {
        sections = repairedSections as Record<string, unknown>
      }
      model = repaired.model
      tokensUsed = (tokensUsed || 0) + (repaired.tokensUsed || 0)
    } catch (error) {
      logger.warn('[Themed Report] Evidence-binding repair failed; using current response', {
        error: error instanceof Error ? error.message : String(error),
        plan: options.userPlan || 'free',
      })
    }
  }

  const finalThemedEvidenceCheck = validateEvidenceBinding(
    sections,
    sectionPaths,
    themedEvidenceRefs
  )
  if (finalThemedEvidenceCheck.needsRepair) {
    sections = enforceEvidenceBindingFallback(
      sections,
      finalThemedEvidenceCheck.violations,
      themedEvidenceRefs,
      lang
    )
  }
  sections = enforceEvidenceRefFooters(sections, sectionPaths, themedEvidenceRefs, lang)
  sections = sanitizeSectionsByPathsExternal(sections, sectionPaths, narrativePathSanitizerDeps)
  sections = enrichThemedSectionsWithReportCore(
    sections as unknown as ThemedReportSections,
    reportCore,
    lang,
    theme,
    normalizedInput,
    reportCoreEnrichmentDeps,
    timingData
  ) as unknown as Record<string, unknown>
  sections = sanitizeThemedSectionsForUserExternal(
    sections,
    sectionPaths,
    lang,
    secondaryPostProcessDeps,
    theme
  )
  sections = enforceEvidenceRefFooters(sections, sectionPaths, themedEvidenceRefs, lang)

  // 4. Theme metadata
  const themeMeta = THEME_META[theme]

  // 5. Calculate score
  const themeScore = calculateThemeScore(theme, normalizedInput.sibsinDistribution)

  // 6. Extract keywords
  const keywords = extractKeywords(sections as unknown as ThemedReportSections, theme, lang)
  const generatedAt = new Date().toISOString()
  const unified = buildUnifiedEnvelope({
    mode: 'themed',
    lang,
    generatedAt,
    matrixInput: normalizedInput,
    matrixReport,
    matrixSummary: options.matrixSummary,
    signalSynthesis,
    graphRagEvidence,
    timingData,
    birthDate: options.birthDate,
    sectionPaths,
    evidenceRefs: themedEvidenceRefs,
  })
  let qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    themedEvidenceRefs,
    {
      requiredPaths: themedRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )
  if (shouldForceThemedNarrativeFallback(qualityMetrics)) {
    sections = enforceThemedNarrativeQualityFallback(
      theme,
      reportCore,
      signalSynthesis,
      normalizedInput,
      lang,
      timingData,
      themedEvidenceRefs
    ) as unknown as Record<string, unknown>
    qualityMetrics = buildReportQualityMetrics(
      sections as Record<string, unknown>,
      sectionPaths,
      themedEvidenceRefs,
      {
        requiredPaths: themedRequiredPaths,
        claims: unified.claims,
        anchors: unified.anchors,
        scenarioBundles: unified.scenarioBundles,
        timelineEvents: unified.timelineEvents,
        coreQuality: coreSeed.quality,
      }
    )
  }
  sections = finalizeThemedSectionsForUser(
    theme,
    reportCore,
    normalizedInput,
    lang,
    timingData
  ) as unknown as Record<string, unknown>
  sections = enforceEvidenceRefFooters(sections, sectionPaths, themedEvidenceRefs, lang)
  sections = applyFinalReportStyle(
    sections as Record<string, unknown>,
    sectionPaths,
    lang,
    reportCore
  )
  qualityMetrics = buildReportQualityMetrics(
    sections as Record<string, unknown>,
    sectionPaths,
    themedEvidenceRefs,
    {
      requiredPaths: themedRequiredPaths,
      claims: unified.claims,
      anchors: unified.anchors,
      scenarioBundles: unified.scenarioBundles,
      timelineEvents: unified.timelineEvents,
      coreQuality: coreSeed.quality,
    }
  )

  // 7. Assemble report
  const report: ThemedAIPremiumReport = {
    id: `themed_${theme}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    generatedAt,
    lang,
    ...buildReportOutputCoreFields(reportCore, lang),
    ...unified,
    coreHash: coreSeed.coreHash,
    patterns: coreSeed.patterns,
    topMatchedPatterns,
    scenarios: coreSeed.scenarios,

    profile: {
      name: options.name,
      birthDate: options.birthDate,
      dayMaster: input.dayMasterElement,
      dominantElement: input.dominantWesternElement || input.dayMasterElement,
    },

    theme,
    themeLabel: themeMeta.label[lang],
    themeEmoji: themeMeta.emoji,

    sections: sections as unknown as ThemedReportSections,
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: themedEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    strategyEngine,
    renderedMarkdown: renderSectionsAsMarkdown(
      sections as Record<string, unknown>,
      sectionPaths,
      lang
    ),
    renderedText: renderSectionsAsText(sections as Record<string, unknown>, sectionPaths),
    themeScore,
    keywords,

    meta: {
      modelUsed: model,
      tokensUsed,
      processingTime: Math.max(1, Date.now() - startTime),
      reportVersion: '1.0.0',
      qualityMetrics,
    },
  }

  recordReportQualityMetrics('themed', model, report.meta.qualityMetrics!)

  return report
}
