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
  containsBannedPhrase,
  dedupeNarrativeSentences,
  normalizeUserFacingArtifacts,
  sanitizeSectionNarrative,
  sanitizeUserFacingNarrative,
  sentenceKey,
  stripBannedPhrases,
} from './reportNarrativeSanitizer'
export { sanitizeSectionNarrative } from './reportNarrativeSanitizer'
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
const CAUTION_INDICATOR_REGEX =
  /caution|risk|warning|recheck|conflict|overreach|fragile/i
const IMMEDIATE_FORCE_REGEX =
  /today\s*finalize|sign now|commit now|immediately|rush|right away/i
const MITIGATION_REGEX =
  /avoid|before|recheck|verify|defer|hold|slow down|stage/i
const RECOMMENDATION_TONE_REGEX =
  /recommended|recommend|should|must|do this|proceed|best move/i
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

  return buildReportQualityMetricsCore({
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
  })
}

function recordReportQualityMetrics(
  reportType: 'comprehensive' | 'timing' | 'themed',
  modelUsed: string,
  quality: ReportQualityMetrics
) {
  recordReportQualityMetricsCore(reportType, modelUsed, quality)
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
      .replace(/([\uAC00-\uD7A3]+)\s+Expansion Pattern\s+\uD328\uD134\s+\uADFC\uAC70\uAC00\s+\uC720\uC9C0\uB420\s+\uAC83/gi, '$1 \uD655\uC7A5 \uD750\uB984\uC774 \uC720\uC9C0\uB420 \uAC83')
      .replace(/(.+?)\s+\uC774\uD6C4\uC5D0\uB3C4\s+([\uAC00-\uD7A3]+)\s+Expansion Pattern\s+\uADFC\uAC70\uAC00\s+\uC774\uC5B4\uC9C8\s+\uAC83/gi, '$1 \uC774\uD6C4\uC5D0\uB3C4 $2 \uD655\uC7A5 \uD750\uB984\uC774 \uC774\uC5B4\uC9C8 \uAC83')
      .replace(/\bExpansion Pattern\b/gi, '\uD655\uC7A5 \uD750\uB984')
      .replace(/([\uAC00-\uD7A3]+)\s+(?:\uD655\uC7A5|\uAE34\uC7A5|\uBCC0\uB3D9\uC131)\s+\uD750\uB984\s+\uD328\uD134\s+\uADFC\uAC70\uAC00\s+\uC720\uC9C0\uB420\s+\uAC83/gi, '$1 \uD750\uB984\uC774 \uC720\uC9C0\uB420 \uAC83')
      .replace(/\uC2DC\uB098\uB9AC\uC624\s+\uD655\uB960\s+[\d.]+%\uC640\s+\uC2E0\uB8B0\uB3C4\s+[\d.]+%\uAC00\s+\uC720\uC9C0\uB420\s+\uAC83/gi, '\uD604\uC7AC \uAC00\uB2A5\uC131\uACFC \uC2E0\uB8B0\uB3C4\uAC00 \uC720\uC9C0\uB420 \uAC83')
      .replace(/\uD0C0\uC774\uBC0D\s+\uC801\uD569\uB3C4\s+[\d.]+%\s+\uC774\uC0C1\uC5D0\uC11C\s+(.+?)\uB97C\s+\uBC14\uB85C\s+\uC2E4\uD589\uD560\s+\uC218\s+\uC788\uC744\s+\uAC83/gi, '\uD0C0\uC774\uBC0D\uC774 \uCDA9\uBD84\uD788 \uB9DE\uC744 \uB54C $1\uB97C \uC2E4\uD589\uD560 \uC218 \uC788\uC744 \uAC83')
      .replace(/(.+?)\s+\uC774\uD6C4\uC5D0\uB3C4\s+([\uAC00-\uD7A3]+)\s+\uD750\uB984\s+\uADFC\uAC70\uAC00\s+\uC774\uC5B4\uC9C8\s+\uAC83/gi, '$1 \uC774\uD6C4\uC5D0\uB3C4 $2 \uD750\uB984\uC774 \uC774\uC5B4\uC9C8 \uAC83')
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
    arbitrationBrief: reportCore.arbitrationBrief,
    latentTopAxes: reportCore.latentTopAxes,
    projections: {
      structure: {
        headline: lang === 'ko' ? '?? ??' : 'Structure Projection',
        summary: structureSummary,
        topAxes: reportCore.latentTopAxes.slice(0, 4).map((axis) => axis.label),
        detailLines: localizeProjectionList(reportCore.projections?.structure?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.structure?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.structure?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.structure?.nextMoves || []),
      },
      timing: {
        headline: lang === 'ko' ? '??? ??' : 'Timing Projection',
        summary: timingSummary,
        window: timingWindow?.window,
        granularity: timingWindow?.timingGranularity,
        detailLines: localizeProjectionList(reportCore.projections?.timing?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.timing?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.timing?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.timing?.nextMoves || []),
      },
      conflict: {
        headline: lang === 'ko' ? '?? ??' : 'Conflict Projection',
        summary: conflictSummary,
        detailLines: localizeProjectionList(reportCore.projections?.conflict?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.conflict?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.conflict?.counterweights || []),
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
        counterweights: localizeProjectionList(reportCore.projections?.action?.counterweights || []),
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
        counterweights: localizeProjectionList(reportCore.projections?.evidence?.counterweights || []),
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
        counterweights: localizeProjectionList(reportCore.projections?.branches?.counterweights || []),
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
    if (sign)
      return `${planetLabel}${hasBatchim(planetLabel) ? '?' : '?'} ${signLabel}? ?? ????`
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
    if (parts.length === 0)
      return `${agePart}? ??? ??? ??? ?? ?? ??? ??? ??? ?????.`
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
    current !== null
      ? `${current.startAge}-${current.endAge}? ??(${currentLabel})`
      : currentLabel
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
    if (parts.length === 0)
      return '????? ?? ???? ?? ?? ??? ?? ??? ?? ?? ?? ????.'
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
    return parts.length > 0
      ? `${parts.join(', ')} ??? ?? ??? ?? ?? ??? ?? ??? ????.`
      : ''
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
  const riskAxisLine =
    reportCore.riskAxisLabel
      ? lang === 'ko'
        ? `??? ?? ???? ???? ? ??? ${reportCore.riskAxisLabel}???.`
        : `At the same time, the most sensitive risk axis is ${reportCore.riskAxisLabel}.`
      : ''
  const timingMatrixLine =
    reportCore.timingMatrix?.length
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
  const structureDriversLine =
    structureProjection?.drivers?.length
      ? lang === 'ko'
        ? `?? ??? ?? ?? ?? ??? ${structureProjection.drivers
            .slice(0, 3)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')}???.`
        : `The direct structural drivers are ${structureProjection.drivers.slice(0, 3).join(', ')}.`
      : ''
  const structureCounterweightLine =
    reportCore.arbitrationBrief?.suppressionNarratives?.length || structureProjection?.counterweights?.length
      ? lang === 'ko'
        ? `?? ${(reportCore.arbitrationBrief?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || [])
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(' ??? ')} ?? ?? ??? ?? ????.`
        : `Counterweights are still coming from ${(reportCore.arbitrationBrief?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || [])
            .slice(0, 2)
            .join(', ')}.`
      : ''
  const branchProjection = reportCore.projections?.branches
  const branchLeadLine = localizeReportNarrativeText(
    branchProjection?.detailLines?.[0] || '',
    lang
  )
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
  const timingDriverLine =
    timingProjection?.drivers?.length
      ? lang === 'ko'
        ? `?? ?? ?? ?? ?? ?? ${timingProjection.drivers
            .slice(0, 3)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')}???.`
        : `The live timing drivers are ${timingProjection.drivers.slice(0, 3).join(', ')}.`
      : ''
  const timingCounterweightLine =
    timingProjection?.counterweights?.length
      ? lang === 'ko'
        ? `??? ${timingProjection.counterweights
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')} ?? ??? ??? ??? ??? ?? ??? ???.`
        : `Counterweights still come from ${timingProjection.counterweights.slice(0, 2).join(', ')}.`
      : ''
  const timingNextLine =
    timingProjection?.nextMoves?.length
      ? buildProjectionMoveSentence(
          timingProjection.nextMoves.slice(0, 2),
          lang,
          lang === 'ko'
            ? '?? ???? ???? ?? ??? ?? ?? ?? ?? ?? ????.'
            : 'To use this timing well, realign the live execution conditions first.'
        )
      : ''
  const timingMatrixLine =
    reportCore.timingMatrix?.length
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
    [...enriched, ...(enriched.length < 4 ? [base] : [])]
      .filter(Boolean)
      .join(' ')
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
  const actionDriverLine =
    actionDriverLabels.length
      ? lang === 'ko'
        ? `?? ??? ??? ?? ${actionDriverLabels.join(', ')}???.`
        : `The current execution drivers are ${actionDriverLabels.join(', ')}.`
      : ''
  const actionCounterweightLine =
    actionProjection?.counterweights?.length
      ? lang === 'ko'
        ? `${actionProjection.counterweights
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')} ?? ??? ??? ???? ??? ?? ??? ???.`
        : `${actionProjection.counterweights.slice(0, 2).join(', ')} still signal that pace should stay controlled.`
      : ''
  const actionNextLine =
    actionProjection?.nextMoves?.length
      ? buildProjectionMoveSentence(
          actionProjection.nextMoves.slice(0, 2),
          lang,
          lang === 'ko'
            ? '?? ???? ?? ??? ?? ??? ?? ???? ?? ???? ?? ????.'
            : 'The next move should begin by resetting execution criteria in smaller steps.'
        )
      : ''
  const riskAxisLine =
    reportCore.riskAxisLabel
      ? lang === 'ko'
        ? `??? ???? ${reportCore.riskAxisLabel} ?? ?? ??? ??? ???? ???.`
        : `Even while acting, ${reportCore.riskAxisLabel} should be managed as the primary risk axis first.`
      : ''
  const branchProjection = reportCore.projections?.branches
  const branchActionLine =
    branchProjection?.nextMoves?.length
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
    [...enriched, ...(enriched.length < 5 ? [base] : [])]
      .filter(Boolean)
      .join(' ')
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
  const base = renderConclusionSectionExternal(reportCore, matrixInput, lang, reportSectionRendererDeps)
  const riskAxisLine =
    reportCore.riskAxisLabel
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
    .filter(
      (item) => !/(recommended|recommend|caution|warning|recheck|verify)$/i.test(item)
    )
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
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const focusTiming = findReportCoreTimingWindow(
    reportCore,
    reportCore.actionFocusDomain || reportCore.focusDomain
  )
  const careerAdvisory = findReportCoreAdvisory(reportCore, 'career')
  const relationshipAdvisory = findReportCoreAdvisory(reportCore, 'relationship')
  const wealthAdvisory = findReportCoreAdvisory(reportCore, 'wealth')
  const healthAdvisory = findReportCoreAdvisory(reportCore, 'health')
  const moveAdvisory = findReportCoreAdvisory(reportCore, 'move')
  const actionSummary = projections?.action?.summary || reportCore.primaryAction
  const riskSummary = projections?.risk?.summary || reportCore.riskControl
  const timingSummary = projections?.timing?.summary || reportCore.gradeReason
  const structureSummary = projections?.structure?.summary || reportCore.thesis
  const conflictSummary = projections?.conflict?.summary || reportCore.primaryCaution
  const evidenceSummary = projections?.evidence?.summary || reportCore.judgmentPolicy.rationale
  const structureDetail = projections?.structure?.detailLines?.[0] || ''
  const timingDetail = projections?.timing?.detailLines?.[0] || ''
  const conflictDetail = projections?.conflict?.detailLines?.[0] || ''
  const actionDetail = projections?.action?.detailLines?.[0] || ''
  const riskDetail = projections?.risk?.detailLines?.[0] || ''
  const evidenceDetail = projections?.evidence?.detailLines?.[0] || ''
  const branchDetail = projections?.branches?.detailLines?.[0] || ''
  const branchNextMoves = projections?.branches?.nextMoves?.slice(0, 2) || []
  const branchReasons = projections?.branches?.reasons?.slice(0, 2) || []
  const structureDrivers = projections?.structure?.drivers?.slice(0, 3) || []
  const timingDrivers = projections?.timing?.drivers?.slice(0, 3) || []
  const actionDrivers = projections?.action?.drivers?.slice(0, 3) || []
  const riskCounterweights = projections?.risk?.counterweights?.slice(0, 2) || []
  const timingNextMoves = projections?.timing?.nextMoves?.slice(0, 2) || []
  const actionNextMoves = projections?.action?.nextMoves?.slice(0, 2) || []
  const timingMoveLine = buildProjectionMoveSentence(
    timingNextMoves,
    lang,
    lang === 'ko'
      ? '?? ?? ???? ?? ?? ??? ?? ??? ?? ??? ?? ????.'
      : 'To use this window well, realign the live execution conditions first.'
  )
  const actionMoveLine = buildProjectionMoveSentence(
    actionNextMoves,
    lang,
    lang === 'ko'
      ? '?? ???? ?? ??? ?? ??? ?? ???? ?? ???? ?? ????.'
      : 'The next move should begin by resetting execution criteria in smaller steps.'
  )
  const timingMatrixLead = reportCore.timingMatrix?.length
    ? lang === 'ko'
      ? `?? ?? ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')} ??? ??? ????.`
      : `The active windows split by domain as ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}.`
    : ''
  const riskAxisLead = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `?? ???? ?? ??? ??? ?? ${reportCore.riskAxisLabel}???.`
      : `The most sensitive risk axis in this theme is ${reportCore.riskAxisLabel}.`
    : ''
  const timelineNarrative = buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang)
  const timingGuardrail = focusTiming
    ? buildTimingWindowNarrative(reportCore.actionFocusDomain || reportCore.focusDomain, focusTiming, lang)
    : ''
  const themeAngle =
    theme === 'love'
      ? lang === 'ko'
        ? '?? ??? ?? ???? ?? ??? ?? ??? ?? ??? ????.'
        : 'The relationship theme turns more on aligned interpretation and pace than on intensity alone.'
      : theme === 'career'
        ? lang === 'ko'
          ? '??? ??? ??? ?? ?? ??? ??? ?? ??? ?? ???? ?? ????.'
          : 'The career theme strengthens when role and evaluation criteria are fixed before expansion.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '?? ??? ?? ???? ?? ??? ?? ??? ?? ?? ? ?? ???.'
            : 'The wealth theme lasts longer when downside limits and exit conditions are set before upside.'
          : theme === 'health'
            ? lang === 'ko'
              ? '?? ??? ??? ??? ???? ?? ?? ?? ???? ??? ???.'
              : 'The health theme separates more by interrupting overload early than by endurance.'
            : lang === 'ko'
              ? '?? ??? ???? ??, ??, ?? ??? ??? ??? ?? ? ?????.'
              : 'The family theme stabilizes when roles, cost, and care are made explicit.'
  const themeActionLine =
    theme === 'love'
      ? lang === 'ko'
        ? '??? ?????? ???? ?? ??? ?? ??? ?? ????.'
        : 'Do not rush the relationship; align expectations and living conditions first.'
      : theme === 'career'
        ? lang === 'ko'
          ? '??? ????? ?? ??? ?? ??? ?? ?????.'
          : 'Before increasing output, lock responsibility boundaries and review points.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '??? ?????? ??, ??, ?? ??? ?? ?????.'
            : 'Before expanding, lock amount, timing, and exit conditions.'
          : theme === 'health'
            ? lang === 'ko'
              ? '??? ????? ?? ??? ?? ???? ?????.'
              : 'Before increasing intensity, secure recovery blocks and schedule buffers.'
            : lang === 'ko'
              ? '??? ???? ??? ?? ???? ?????.'
              : 'Before pushing conclusions, align roles and interpretations first.'
  const actionOpeningLine =
    lang === 'ko'
      ? `?? ${actionLabel} ?? ??? ${reportCore.topDecisionLabel || reportCore.primaryAction}???.`
      : `The operating rule on the ${actionLabel} axis is ${reportCore.topDecisionLabel || reportCore.primaryAction}.`
  const themeRiskLine =
    theme === 'love'
      ? lang === 'ko'
        ? '??? ??? ?? ??? ?? ??? ?? ??? ??? ?? ??? ?? ? ????.'
        : 'Even with strong feeling, quick commitment can increase conflict cost when daily fit is weak.'
      : theme === 'career'
        ? lang === 'ko'
          ? '??? ???? ??? ?? ?? ??? ?? ??? ???? ??? ? ????.'
          : 'Speed can look like progress, but expansion without criteria often returns as rework cost.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '????? ?? ??? ?? ??? ????? ???? ?? ??? ?? ??? ???.'
            : 'Undocumented upside flips into loss easily, so protection must come before profit.'
          : theme === 'health'
            ? lang === 'ko'
              ? '??? ?? ???? ???? ??? ?? ??? ??? ? ?? ? ????.'
              : 'When recovery is deferred, endurance often increases the cost of the next window.'
            : lang === 'ko'
              ? '??? ?? ?? ???? ?? ?? ??? ????? ??? ???? ?? ????.'
              : 'Unspoken role imbalance leaves more fatigue and resentment the longer it stays implicit.'

  const themeStructureLine =
    theme === 'love'
      ? lang === 'ko'
        ? '? ?? ??? ?? ???? ?? ??? ??? ??? ??? ????.'
        : 'This relationship theme is structured more by daily rhythm and expectation alignment than by expression alone.'
      : theme === 'career'
        ? lang === 'ko'
          ? '? ??? ??? ???? ?? ??? ?? ??? ???? ??? ????.'
          : 'This career theme is structured more by role clarity and evaluation criteria than by talent alone.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '? ?? ??? ????? ?? ??? ?? ??? ??? ????.'
            : 'This wealth theme is structured more by leakage control and recovery rules than by return rate alone.'
          : theme === 'health'
            ? lang === 'ko'
              ? '? ?? ??? ???? ?? ??? ??? ??? ??? ????.'
              : 'This health theme is structured more by recovery rhythm and overload interruption than by willpower.'
            : lang === 'ko'
              ? '? ?? ??? ???? ?? ??? ?? ??? ??? ????.'
              : 'This family theme is structured more by role distribution and aligned interpretation than by emotion alone.'

  const themeWindowLine =
    theme === 'love'
      ? lang === 'ko'
        ? '?? ?? ?? ?? ???? ?? ??? ?? ??? ?? ?? ? ?? ???? ????.'
        : 'Even when the window opens, probability improves when living conditions and relationship pace are aligned first.'
      : theme === 'career'
        ? lang === 'ko'
          ? '?? ?? ?? ???? ??? ?? ??? ??? ??? ? ? ???? ?????.'
          : 'The stronger window shows up more clearly when role and review points are fixed in writing before expansion.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '?? ?? ?? ??? ??? ???? ??? ?? ??? ?? ? ? ?????.'
            : 'The stronger window is more reliable when downside limits are locked before upside is chased.'
          : theme === 'health'
            ? lang === 'ko'
              ? '?? ?? ??? ?? ??? ?? ??? ??? ???? ?? ?? ? ? ????.'
              : 'The stronger window opens less in endurance and more in reclaiming recovery blocks and cutting overload.'
            : lang === 'ko'
              ? '?? ?? ??? ???? ??? ??? ??? ?? ??? ?? ? ? ????.'
              : 'The stronger window opens less in forced conclusions and more in realigning roles and cost.'

  const themeBranchLine =
    theme === 'love'
      ? lang === 'ko'
        ? branchDetail || '? ?? ??? ? ?? ???? ????? ? ?? ?? ??? ?? ?? ?????.'
        : branchDetail || 'This relationship theme moves through multiple live branches rather than one fixed commitment path.'
      : theme === 'career'
        ? lang === 'ko'
          ? branchDetail || '? ??? ??? ??? ??, ??? ??? ??? ?? ?? ?? ??? ??? ????.'
          : branchDetail || 'This career theme keeps commit, defer, and renegotiation paths open at the same time.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? branchDetail || '? ?? ??? ??? ??, ??? ??? ?? ?? ?? ?? ??? ?????.'
            : branchDetail || 'This wealth theme keeps expansion, defense, and reset paths alive together.'
          : theme === 'health'
            ? lang === 'ko'
              ? branchDetail || '? ?? ??? ??? ???? ??? ??? ?? ?? ??? ??? ????.'
              : branchDetail || 'This health theme keeps recovery and overload competing at the same time.'
            : lang === 'ko'
              ? branchDetail || '? ?? ??? ????? ??? ?? ??? ??? ?? ?? ????.'
              : branchDetail || 'This family theme keeps multiple role and cost realignment paths open.'

  const deepStructureLine =
    theme === 'love'
      ? lang === 'ko'
        ? '? ????? ???? ?? ??? ???? ???? ??? ??? ????.'
        : 'Here the relationship is built less by attraction and more by aligned rhythm and expectations.'
      : theme === 'career'
        ? lang === 'ko'
          ? '? ????? ???? ?? ??? ?? ??? ???? ??? ????.'
          : 'Here the career frame is built less by talent and more by role definition and evaluation criteria.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '? ????? ????? ?? ??? ?? ??? ??? ??? ????.'
            : 'Here the financial frame is built less by return rate and more by leakage control and recovery rules.'
          : theme === 'health'
            ? lang === 'ko'
              ? '? ????? ???? ?? ??? ??? ??? ??? ??? ????.'
              : 'Here the health frame is built less by willpower and more by recovery rhythm and overload control.'
            : lang === 'ko'
              ? '? ????? ???? ?? ??? ?? ??? ?? ??? ??? ????.'
              : 'Here the family frame is built less by emotion and more by role distribution and aligned interpretation.'

  const patternPressureLine =
    theme === 'love'
      ? lang === 'ko'
        ? `?? ??? ??? ??? ??? ??? ??? ??? ?? ??? ??? ? ??? ????.`
        : `The active pattern favors pace and boundary alignment over rushing the bond into definition.`
      : theme === 'career'
        ? lang === 'ko'
          ? `?? ??? ?? ??? ??? ??? ?? ??? ??? ??? ? ??? ????.`
          : `The active pattern favors narrowing role and review criteria over widening the workload.`
        : theme === 'wealth'
          ? lang === 'ko'
            ? `?? ??? ??? ???? ?? ??? ?? ??? ?? ??? ??? ? ??? ????.`
            : `The active pattern favors locking downside and recovery conditions before aggressive expansion.`
          : theme === 'health'
            ? lang === 'ko'
              ? `?? ??? ??? ??? ???? ?? ?? ?? ??? ???? ??? ? ??? ????.`
              : `The active pattern favors cutting overload and securing recovery blocks over simple endurance.`
            : lang === 'ko'
              ? `?? ??? ?? ???? ??, ??, ?? ??? ?? ??? ??? ? ??? ????.`
              : `The active pattern favors realigning role, cost, and care distribution over emotional insistence.`

  const timingReadLine =
    theme === 'love'
      ? lang === 'ko'
        ? '?? ??? ???? ?? ??? ?? ??? ?? ??? ?? ?? ?? ??? ????.'
        : 'Error stays lower when the read is tied to pace-fit windows instead of exact dates.'
      : theme === 'career'
        ? lang === 'ko'
          ? '?? ???? ??? ?? ??? ??? ??? ? ?? ??? ?? ?? ? ?????.'
          : 'This reads more accurately by finding windows that allow role and review points to be fixed in writing.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '?? ???? ??? ?? ??? ?? ? ?? ??? ?? ?? ? ?????.'
            : 'This reads more accurately by finding windows where conditions and downside limits can be locked.'
          : theme === 'health'
            ? lang === 'ko'
              ? '?? ???? ?? ??? ??? ???? ?? ? ?? ??? ?? ?? ? ?????.'
              : 'This reads more accurately by finding windows that restore recovery blocks and reduce overload.'
            : lang === 'ko'
              ? '?? ???? ??? ??? ?? ?? ? ?? ??? ?? ?? ? ?????.'
              : 'This reads more accurately by finding windows where roles and cost can be realigned.'

  const recommendationCloseLine =
    theme === 'love'
      ? lang === 'ko'
        ? '?? ??? ? ?? ????, ??? ??? ?? ??? ?? ??? ???.'
        : 'Emotional confirmation comes after pace and living fit are aligned.'
      : theme === 'career'
        ? lang === 'ko'
          ? '?? ??? ?? ???, ??? ?? ??? ?? ??? ?? ??? ???.'
          : 'Push output pressure back; first lock responsibility boundaries and review points.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '?? ??? ?? ???, ??? ??? ??, ???? ??? ??? ???.'
            : 'Defer upside expectation; first lock amount, timing, and the exit door.'
          : theme === 'health'
            ? lang === 'ko'
              ? '?? ??? ?? ???, ??? ?? ??? ?? ???? ???? ???.'
              : 'Delay intensity gains; first secure recovery blocks and schedule buffers.'
            : lang === 'ko'
              ? '??? ?? ???, ??? ??? ?? ???? ???? ???.'
              : 'Delay conclusions; first secure aligned roles and interpretation.'

  const actionRhythmLine =
    theme === 'love'
      ? lang === 'ko'
        ? `??? ${actionLabel} ???? ?? ???? ??-??-??? ??? ? ?????.`
        : `Even on the ${actionLabel} axis, confirm-align-formalize is safer than immediate emotional commitment.`
      : theme === 'career'
        ? lang === 'ko'
          ? `??? ${actionLabel} ???? ??-??-?? ??? ???? ? ?????.`
          : `Even on the ${actionLabel} axis, start-review-commit matters more than expansion itself.`
        : theme === 'wealth'
          ? lang === 'ko'
            ? `??? ${actionLabel} ???? ?? ??-?? ??-?? ??? ? ?????.`
            : `Even on the ${actionLabel} axis, condition check-downside control-commit matters more than speed.`
          : theme === 'health'
            ? lang === 'ko'
              ? `??? ${actionLabel} ???? ?? ???? ?? ??-?? ??-?? ??? ? ?????.`
              : `Even on the ${actionLabel} axis, recovery-load reduction-resume matters more than pushing intensity.`
            : lang === 'ko'
              ? `??? ${actionLabel} ???? ???? ?? ??-?? ??-?? ??? ? ?????.`
              : `Even on the ${actionLabel} axis, role alignment-cost review-agreement matters more than rushing closure.`
  const common =
    theme === 'love'
      ? {
          deepAnalysis: joinNarrativeParts([
            relationshipAdvisory?.thesis,
            structureDetail,
            themeAngle,
            deepStructureLine,
            timelineNarrative,
            structureDrivers.length
              ? lang === 'ko'
                ? `?? ?? ??? ?? ???? ?? ${structureDrivers.join(', ')}???.`
                : `The relationship read is being driven directly by ${structureDrivers.join(', ')}.`
              : '',
            lang === 'ko'
              ? '? ?? ??? ??? ???? ??? ???? ?? ??? ????? ????.'
              : 'This love theme turns more on relational operating rhythm than on emotional intensity alone.',
          ]),
          patterns: joinNarrativeParts([
            relationshipAdvisory?.caution,
            conflictDetail,
            patternPressureLine,
            lang === 'ko'
              ? '??? ??? ?? ??? ?? ???? ??? ?? ????? ?? ? ????.'
              : 'When feeling outruns practical fit, the relationship can overheat and cool just as quickly.',
          ]),
          timing: joinNarrativeParts([
            relationshipAdvisory?.timingHint,
            timingDetail,
            timingGuardrail,
            themeWindowLine,
            timingMatrixLead,
            themeBranchLine,
            timingDrivers.length
              ? lang === 'ko'
                ? `?? ?? ?? ?? ${timingDrivers.join(', ')}???.`
                : `The relationship window is being driven by ${timingDrivers.join(', ')}.`
              : '',
            timingMoveLine,
            timingReadLine,
          ]),
          recommendations: [
            joinNarrativeParts([
              themeActionLine,
              relationshipAdvisory?.action,
              riskAxisLead,
              actionMoveLine,
              recommendationCloseLine,
            ]),
            joinNarrativeParts([
              riskDetail,
              riskCounterweights.length
                ? lang === 'ko'
                  ? `?? ${riskCounterweights.join(', ')} ?? ??? ?? ??? ???.`
                  : `Counterweights like ${riskCounterweights.join(', ')} should be reduced first.`
                : '',
              lang === 'ko'
                ? '?? ??? ?? ???? ?? ???? ???? ?? ?? ?????.'
                : 'Do not treat emotional confirmation and formal commitment as the same move.',
            ]),
            joinNarrativeParts([
              conflictSummary,
              lang === 'ko'
                ? '?? ?? ??? ??? ? ?? ?? ??? ?? ??? ?? ??? ?? ????.'
                : 'When pace diverges, slow the faster side first and build a shared rhythm.',
            ]),
          ].filter(Boolean),
          actionPlan: joinNarrativeParts([
            actionOpeningLine,
            actionMoveLine,
            actionRhythmLine,
            lang === 'ko'
              ? '??? ??? ? ?? ???? ??? ??? ??? ?? ??? ? ????.'
              : 'The edge here comes less from stronger expression and more from aligning pace and boundaries first.',
            themeRiskLine,
          ]),
        }
      : theme === 'career'
        ? {
            deepAnalysis: joinNarrativeParts([
              careerAdvisory?.thesis,
              structureDetail,
              themeAngle,
              deepStructureLine,
              timelineNarrative,
              structureDrivers.length
                ? lang === 'ko'
                  ? `?? ??? ??? ?? ??? ?? ${structureDrivers.join(', ')}???.`
                  : `The career read is being driven directly by ${structureDrivers.join(', ')}.`
                : '',
              lang === 'ko'
                ? '? ??? ??? ?? ?? ???? ??? ?? ??? ??? ?? ?????.'
                : 'This career theme favors the person who fixes standards first, not the one who simply does more.',
            ]),
            patterns: joinNarrativeParts([
              careerAdvisory?.caution,
              conflictDetail,
              patternPressureLine,
              lang === 'ko'
                ? '???? ?? ??? ?? ? ???? ??? ??? ??? ???? ????.'
                : 'When role definition stays blurry, rework and depletion repeat faster than skill can compensate.',
            ]),
            timing: joinNarrativeParts([
              careerAdvisory?.timingHint,
              timingDetail,
              timingGuardrail,
            themeWindowLine,
            timingMatrixLead,
            themeBranchLine,
            timingDrivers.length
                ? lang === 'ko'
                  ? `??? ?? ?? ?? ${timingDrivers.join(', ')}???.`
                  : `The career window is being driven by ${timingDrivers.join(', ')}.`
                : '',
              timingMoveLine,
              timingReadLine,
            ]),
            recommendations: [
              joinNarrativeParts([
              themeActionLine,
              careerAdvisory?.action,
              riskAxisLead,
              actionMoveLine,
              recommendationCloseLine,
            ]),
              joinNarrativeParts([
                riskDetail,
                riskCounterweights.length
                  ? lang === 'ko'
                    ? `?? ${riskCounterweights.join(', ')} ?? ??? ???? ?? ???? ???.`
                    : `Counterweights like ${riskCounterweights.join(', ')} should be cleared before expansion.`
                  : '',
                lang === 'ko'
                  ? '??? ??? ?? ???? ?? ???? ???? ?? ?? ? ????.'
                  : 'If execution and review are forced into one move, rework builds faster than results.',
              ]),
              joinNarrativeParts([
                conflictSummary,
                lang === 'ko'
                  ? '?? ??? ???? ? ? ??? ??? ??? ? ??? ?? ??? ?? ????.'
                  : 'When tasks compete, choose the one with the clearest criteria before the larger one.',
              ]),
            ].filter(Boolean),
            actionPlan: joinNarrativeParts([
            actionOpeningLine,
            actionMoveLine,
              actionRhythmLine,
              lang === 'ko'
                ? '??? ? ?? ?? ?? ??? ??, ??, ??? ?? ???? ? ????.'
                : 'The edge comes from fixing role, criteria, and responsibility before taking on more work.',
              themeRiskLine,
            ]),
          }
        : theme === 'wealth'
          ? {
              deepAnalysis: joinNarrativeParts([
                wealthAdvisory?.thesis,
                structureDetail,
                themeAngle,
                deepStructureLine,
                timelineNarrative,
                structureDrivers.length
                  ? lang === 'ko'
                    ? `?? ?? ??? ?? ??? ?? ${structureDrivers.join(', ')}???.`
                    : `The wealth read is being driven directly by ${structureDrivers.join(', ')}.`
                  : '',
                lang === 'ko'
                  ? '? ?? ??? ?? ?? ???? ??? ?? ??? ??? ?? ????.'
                  : 'This wealth theme rewards the person who locks downside first, not the one who chases upside hardest.',
              ]),
              patterns: joinNarrativeParts([
                wealthAdvisory?.caution,
                conflictDetail,
                patternPressureLine,
                lang === 'ko'
                  ? '??? ????? ?? ??? ?? ??? ??? ???? ??? ?? ?? ? ????.'
                  : 'Undocumented upside turns into leakage easily and can leave fatigue before profit.',
              ]),
              timing: joinNarrativeParts([
                wealthAdvisory?.timingHint,
                timingDetail,
                timingGuardrail,
                themeWindowLine,
                timingMatrixLead,
                themeBranchLine,
                timingDrivers.length
                  ? lang === 'ko'
                    ? `?? ?? ?? ?? ${timingDrivers.join(', ')}???.`
                    : `The wealth window is being driven by ${timingDrivers.join(', ')}.`
                  : '',
                timingMoveLine,
                timingReadLine,
              ]),
              recommendations: [
                joinNarrativeParts([
                  themeActionLine,
                  wealthAdvisory?.action,
                  riskAxisLead,
                  actionMoveLine,
                  recommendationCloseLine,
                ]),
                joinNarrativeParts([
                  riskDetail,
                  riskCounterweights.length
                    ? lang === 'ko'
                      ? `?? ${riskCounterweights.join(', ')} ?? ??? ?? ???? ?? ??? ???.`
                      : `Counterweights like ${riskCounterweights.join(', ')} should be reduced before upside is discussed.`
                    : '',
                  lang === 'ko'
                    ? '??? ??? ? ?? ??? ???? ?? ?? ??? ? ?? ?? ? ????.'
                    : 'If expansion and commitment happen in one move, recovery cost can grow faster than return.',
                ]),
                joinNarrativeParts([
                  conflictSummary,
                  lang === 'ko'
                    ? '?? ?? ??? ???? ? ? ??? ???? ?? ??? ??? ??? ?? ????.'
                    : 'When revenue paths compete, choose the one with the clearest recovery rules before the bigger-looking one.',
                ]),
              ].filter(Boolean),
              actionPlan: joinNarrativeParts([
                actionOpeningLine,
                actionMoveLine,
                actionRhythmLine,
                lang === 'ko'
                  ? '??? ?? ??? ??? ??? ?? ??? ?? ??? ?? ??? ? ????.'
                  : 'The edge comes from locking downside and recovery rules before enlarging upside.',
                themeRiskLine,
              ]),
            }
          : theme === 'health'
            ? {
                deepAnalysis: joinNarrativeParts([
                  healthAdvisory?.thesis,
                  structureDetail,
                  themeAngle,
                  deepStructureLine,
                  timelineNarrative,
                  structureDrivers.length
                    ? lang === 'ko'
                      ? `?? ?? ??? ?? ??? ?? ${structureDrivers.join(', ')}???.`
                      : `The health read is being driven directly by ${structureDrivers.join(', ')}.`
                    : '',
                  lang === 'ko'
                    ? '? ?? ??? ??? ??? ???? ???? ?? ?? ??? ?? ????.'
                    : 'This health theme favors the person who interrupts overload early, not the one who simply endures harder.',
                ]),
                patterns: joinNarrativeParts([
                  healthAdvisory?.caution,
                  conflictDetail,
                  patternPressureLine,
                  lang === 'ko'
                    ? '??? ?? ??? ??? ???? ?? ?? ??? ?? ???? ????.'
                    : 'When fatigue overlaps with schedule pressure, recovery breakdown accumulates faster than willpower can compensate.',
                ]),
                timing: joinNarrativeParts([
                  healthAdvisory?.timingHint,
                  timingDetail,
                  timingGuardrail,
                  themeWindowLine,
                  timingMatrixLead,
                  themeBranchLine,
                  timingDrivers.length
                    ? lang === 'ko'
                      ? `?? ?? ?? ?? ${timingDrivers.join(', ')}???.`
                      : `The health window is being driven by ${timingDrivers.join(', ')}.`
                    : '',
                  timingMoveLine,
                  timingReadLine,
                ]),
                recommendations: [
                  joinNarrativeParts([
                    themeActionLine,
                    healthAdvisory?.action,
                    riskAxisLead,
                    actionMoveLine,
                    recommendationCloseLine,
                  ]),
                  joinNarrativeParts([
                    riskDetail,
                    riskCounterweights.length
                      ? lang === 'ko'
                        ? `?? ${riskCounterweights.join(', ')} ?? ??? ???? ???? ?? ??? ???.`
                        : `Counterweights like ${riskCounterweights.join(', ')} should be reduced in the schedule before intensity is raised.`
                      : '',
                    lang === 'ko'
                      ? '??? ?? ??? ?? ?? ??? ??? ?? ??? ???? ??? ???.'
                      : 'Recovery plans that are too intense do not last; keep the smallest repeatable rhythm first.',
                  ]),
                  joinNarrativeParts([
                    conflictSummary,
                    lang === 'ko'
                      ? '??? ??? ???? ?? ??? ???? ??? ?? ???? ?? ????.'
                      : 'When recovery competes with output, this phase should choose recovery first.',
                  ]),
                ].filter(Boolean),
                actionPlan: joinNarrativeParts([
                  actionOpeningLine,
                  actionMoveLine,
                  actionRhythmLine,
                  lang === 'ko'
                    ? '??? ? ??? ?? ??? ?? ??? ?? ??? ?? ??? ? ????.'
                    : 'The edge comes from restoring recovery blocks and schedule buffers before pushing harder.',
                  themeRiskLine,
                ]),
              }
            : {
                deepAnalysis: joinNarrativeParts([
                  relationshipAdvisory?.thesis,
                  structureDetail,
                  themeAngle,
                  deepStructureLine,
                  timelineNarrative,
                  structureDrivers.length
                    ? lang === 'ko'
                      ? `?? ?? ??? ?? ??? ?? ${structureDrivers.join(', ')}???.`
                      : `The family read is being driven directly by ${structureDrivers.join(', ')}.`
                    : '',
                  lang === 'ko'
                    ? '? ?? ??? ?? ???? ??? ??? ??? ??? ??? ??? ?? ????.'
                    : 'This family theme favors the person who makes roles and cost explicit rather than relying on feeling alone.',
                ]),
                patterns: joinNarrativeParts([
                  relationshipAdvisory?.caution,
                  conflictDetail,
                  patternPressureLine,
                  lang === 'ko'
                    ? '??? ?? ?? ???? ??? ????? ???? ??? ? ?? ????.'
                    : 'Invisible role imbalance leaves greater fatigue and resentment the closer the relationship is.',
                ]),
                timing: joinNarrativeParts([
                  relationshipAdvisory?.timingHint,
                  timingDetail,
                  timingGuardrail,
                  themeWindowLine,
                  timingMatrixLead,
                  themeBranchLine,
                  timingDrivers.length
                    ? lang === 'ko'
                      ? `?? ?? ?? ?? ${timingDrivers.join(', ')}???.`
                      : `The family window is being driven by ${timingDrivers.join(', ')}.`
                    : '',
                  timingMoveLine,
                  timingReadLine,
                ]),
                recommendations: [
                  joinNarrativeParts([
                    themeActionLine,
                    relationshipAdvisory?.action,
                    riskAxisLead,
                    actionMoveLine,
                    recommendationCloseLine,
                  ]),
                  joinNarrativeParts([
                    riskDetail,
                    riskCounterweights.length
                      ? lang === 'ko'
                        ? `?? ${riskCounterweights.join(', ')} ?? ??? ???? ?? ???? ?? ??? ???.`
                        : `Counterweights like ${riskCounterweights.join(', ')} should be resolved through role adjustment before emotion is pushed harder.`
                      : '',
                    lang === 'ko'
                      ? '?? ??? ??? ?? ??? ???? ?? ??? ?? ??? ?? ?????.'
                      : 'When people read the same scene differently, aligned interpretation must come before conclusions.',
                  ]),
                  joinNarrativeParts([
                    conflictSummary,
                    lang === 'ko'
                      ? '?? ??? ?? ??? ???? ? ? ????? ? ?? ?? ??? ?? ????.'
                      : 'When demands compete inside the family, reduce the burden that lasts longer before reacting to the louder voice.',
                  ]),
                ].filter(Boolean),
                actionPlan: joinNarrativeParts([
                  actionOpeningLine,
                  actionMoveLine,
                  actionRhythmLine,
                  lang === 'ko'
                    ? '??? ??? ? ?? ??? ?? ??? ??, ??, ??? ?? ??? ??? ??? ? ????.'
                    : 'The edge comes from making role, cost, and care explicit before pushing emotion harder.',
                  themeRiskLine,
                ]),
              }

  switch (theme) {
    case 'love':
      return {
        ...common,
        compatibility: joinNarrativeParts([
          relationshipAdvisory?.thesis,
          structureSummary,
          lang === 'ko'
            ? '??? ?? ???? ??? ??? ??? ???? ? ?????.'
            : 'Compatibility depends more on pace and expectation alignment than emotional intensity.',
        ]),
        spouseProfile: joinNarrativeParts([
          relationshipAdvisory?.action,
          lang === 'ko'
            ? '????? ?? ??? ?? ??? ?? ??? ? ??? ????.'
            : 'The stronger fit is someone who can share daily structure and responsibility.',
        ]),
        marriageTiming: joinNarrativeParts([
          timingSummary,
          relationshipAdvisory?.timingHint,
          lang === 'ko'
            ? '???? ???? ??? ?? ??? ?? ??? ????? ?? ????.'
            : 'Formal commitment is strongest when standards and living conditions align.',
        ]),
      }
    case 'career':
      return {
        ...common,
        strategy: joinNarrativeParts([
          careerAdvisory?.thesis,
          actionSummary,
          actionDetail,
          lang === 'ko'
            ? '?? ???? ? ?? ??? ??? ???, ??? ?? ??? ?? ???? ?????.'
            : 'The real turning point is not expansion itself, but the moment role and evaluation criteria are fixed.',
          lang === 'ko'
            ? '???? ??, ??, ?? ??? ?? ????? ??? ?????.'
            : 'Career improves when role, scope, and evaluation criteria are fixed first.',
        ]),
        roleFit: joinNarrativeParts([
          structureSummary,
          careerAdvisory?.action,
          lang === 'ko'
            ? '?? ???? ???? ?? ??? ?? ??? ??? ???? ? ????.'
            : 'Role fit is strongest where prioritization and coordination matter more than speed.',
          lang === 'ko'
            ? '?? ???? ???? ??? ??? ?? ??? ???? ?? ???? ??? ? ???? ?????.'
            : 'Strength shows more clearly in roles that set criteria and coordinate moving parts than in roles that reward isolated speed.',
        ]),
        turningPoints: joinNarrativeParts([
          timingSummary,
          careerAdvisory?.timingHint,
          lang === 'ko'
            ? '???? ?? ??? ???? ??? ??? ?? ???? ??? ? ???? ???.'
            : 'Turning points arrive more clearly when role and responsibility are reset.',
          lang === 'ko'
            ? '?? ?? ??? ?? ??? ?? ??? ??? ?? ?? ??? ??? ?? ??? ??? ? ????.'
            : 'The shift becomes sharper when evaluation criteria and review cadence are reset, because the same effort starts converting into visible results faster.',
        ]),
      }
    case 'wealth':
      return {
        ...common,
        strategy: joinNarrativeParts([
          wealthAdvisory?.thesis,
          actionSummary,
          lang === 'ko'
            ? '??? ?? ???? ??? ?? ??? ?? ????? ?? ????.'
            : 'Wealth holds better when conditions and downside limits are fixed first.',
        ]),
        incomeStreams: joinNarrativeParts([
          lang === 'ko'
            ? '?? ??? ? ??? ?? ?? ??? ?? ???? ???? ??? ?? ? ?????.'
            : 'Income flow improves when new channels are tested small and only durable structures remain.',
          evidenceDetail,
          wealthAdvisory?.action,
          lang === 'ko'
            ? '? ???? ?? ???? ?? ??? ??? ??? ??? ????.'
            : 'New income channels should be tested small and kept only when repeatable.',
        ]),
        riskManagement: joinNarrativeParts([
          riskSummary,
          wealthAdvisory?.caution,
          lang === 'ko'
            ? '??, ??, ?? ??? ??? ?? ??? ??? ?? ??? ?? ? ????.'
            : 'If amount, timing, and exit conditions are not written down, upside can flip into loss quickly.',
        ]),
      }
    case 'health':
      return {
        ...common,
        prevention: joinNarrativeParts([
          lang === 'ko'
            ? '??? ??? ??? ??? ???? ?? ?? ?? ??? ??? ? ????.'
            : 'Prevention works best when overload is interrupted early, not when endurance is forced.',
          healthAdvisory?.thesis,
          lang === 'ko'
            ? '??? ??? ??? ??? ??? ?? ?? ???? ??? ???.'
            : 'Health separates more by interrupting overload early than by endurance.',
        ]),
        riskWindows: joinNarrativeParts([
          timingSummary,
          healthAdvisory?.timingHint,
          lang === 'ko'
            ? '??? ?? ??? ??? ???? ??? ??? ?? ??? ?? ?????.'
            : 'When fatigue and schedule pressure overlap, lower intensity and lock recovery blocks first.',
        ]),
        recoveryPlan: joinNarrativeParts([
          healthAdvisory?.action,
          riskSummary,
          lang === 'ko'
            ? '??? ? ???? ??, ??, ??, ?? ??? ????? ????.'
            : 'Recovery comes from repeatable sleep, hydration, meals, and schedule adjustment.',
        ]),
      }
    case 'family':
      return {
        ...common,
        dynamics: joinNarrativeParts([
          relationshipAdvisory?.thesis,
          wealthAdvisory?.caution,
          lang === 'ko'
            ? '?? ??? ???? ??, ??, ?? ??? ??? ?? ? ? ????.'
            : 'Family dynamics tangle more when roles, cost, and care distribution stay implicit.',
        ]),
        communication: joinNarrativeParts([
          lang === 'ko'
            ? '?? ??????? ??? ?? ??? ??? ?? ?? ??? ?? ????? ??? ? ?????.'
            : 'Family communication improves when people confirm they are reading the same scene before pushing conclusions.',
          relationshipAdvisory?.caution,
          healthAdvisory?.action,
          lang === 'ko'
            ? '?? ??? ???? ?? ?? ??? ?? ?? ?? ?? ??? ????.'
            : 'In family communication, aligned interpretation before conclusions lowers conflict cost.',
        ]),
        legacy: joinNarrativeParts([
          timelineNarrative,
          moveAdvisory?.caution,
          lang === 'ko'
            ? '?? ??? ??? ?? ???? ?? ? ?? ??? ?? ? ????.'
            : 'Intergenerational legacy improves when left as operating rules rather than words.',
        ]),
      }
  }
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

const COMPREHENSIVE_SECTION_KEYS: Array<keyof AIPremiumReport['sections']> = [
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
  wealthPotential: ['??', '??', '????', '?? ??', '??', '??'],
  healthGuidance: ['??', '??', '??', '??', '???', '???'],
  lifeMission: ['??', '??', '??', '??', '??', '?? ??'],
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
  wealthPotential: '??? ???? ??? ?? ??? ? ?? ????.',
  healthGuidance: '??? ??? ??? ?? ?? ??? ? ?????.',
  lifeMission: '?? ????? ???? ??? ?? ??? ??? ?????.',
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
      (item) =>
        `${item.title} ??? ?????. ??? ${toKoreanDomainLabel(item.domain)} ? ??? ? ?????.`
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
      'timing:high_tension_expansion':
        '?? ??? ?? ??? ??? ?????? ???? ????.',
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
      sections: sections as AIPremiumReport['sections'],
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
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
      sections: sections as AIPremiumReport['sections'],
      graphRagEvidence,
      graphRagSummary,
      evidenceRefs,
      evidenceRefsByPara: unified.evidenceRefsByPara,
      deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
      renderedMarkdown: renderSectionsAsMarkdown(sections, sectionPaths, lang),
      renderedText: renderSectionsAsText(sections, sectionPaths),
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
  const sectionTokenBudget = maxTokensOverride
    ? Math.max(850, Math.min(2400, Math.floor(maxTokensOverride / 4)))
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
  let sections: Record<string, unknown> = {}
  let tokensUsed = 0
  const models = new Set<string>()
  let usedDeterministicFallback = false

  try {
    for (const sectionKey of COMPREHENSIVE_SECTION_KEYS) {
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
        modelOverride: 'gpt-4o-mini',
      })
      tokensUsed += draft.tokensUsed || 0
      models.add(draft.model)
      const draftText = sanitizeSectionNarrative(draft.sections?.text || '')

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
        modelOverride: 'gpt-4o',
      })
      tokensUsed += synthesized.tokensUsed || 0
      models.add(synthesized.model)
      let sectionText = sanitizeTimingContradictionsExternal(
        postProcessSectionNarrative(synthesized.sections?.text || draftText, sectionKey, lang),
        input
      )

      const quality = evaluateSectionGate(sectionText, factPack, sectionKey, containsBannedPhrase)
      if (!quality.pass) {
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
            modelOverride: 'gpt-4o',
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

  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)
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

    if (needsRepair) {
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
            modelOverride: 'gpt-4o',
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
                modelOverride: 'gpt-4o',
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
            modelOverride: 'gpt-4o',
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

    sections: sections as AIPremiumReport['sections'],
    graphRagEvidence,
    graphRagSummary,
    evidenceRefs: comprehensiveEvidenceRefs,
    evidenceRefsByPara: unified.evidenceRefsByPara,
    deterministicCore: attachDeterministicArtifacts(deterministicCore, unified),
    renderedMarkdown: [
      renderSectionsAsMarkdown(
        sections as Record<string, unknown>,
        [
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
        ],
        lang
      ),
    ]
      .filter(Boolean)
      .join('\n\n'),
    renderedText: [
      renderProjectionBlocksAsText(buildReportOutputCoreFields(reportCore, lang).projections, lang, {
        matrixView: buildReportOutputCoreFields(reportCore, lang).matrixView,
        singleUserModel: buildReportOutputCoreFields(reportCore, lang).singleUserModel,
        branchSet: buildReportOutputCoreFields(reportCore, lang).branchSet,
      }),
      renderSectionsAsText(
        sections as Record<string, unknown>,
        [
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
        ],
        lang
      ),
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
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

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
      qualityMetrics,
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
  const maxRepairPasses = getMaxRepairPassesByPlan(options.userPlan)

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






