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
import type { DeterministicProfile } from './deterministicCoreConfig'
import { getThemedSectionKeys } from './themeSchema'
import { buildLifeCyclePromptBlock, buildThemeSchemaPromptBlock } from '../interpretationSchema'
import { formatPolicyCheckLabels } from '@/lib/destiny-matrix/core/actionCopy'
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
  containsBannedPhrase,
  dedupeNarrativeSentences,
  sanitizeSectionNarrative,
  sanitizeUserFacingNarrative,
} from './reportNarrativeSanitizer'
export { sanitizeSectionNarrative } from './reportNarrativeSanitizer'
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
import type { ReportQualityMetrics } from './reportQuality'
import {
  buildSynthesisFactsForSection,
  type SignalSynthesisResult,
  type SignalDomain,
  getDomainsForSection,
} from './signalSynthesizer'
import type { ReportEvidenceRef, SectionEvidenceRefs } from './evidenceRefs'
import type { StrategyEngineResult } from './strategyEngine'
import { generateNarrativeSectionsFromSynthesis } from './narrativeGenerator'
import { buildDeterministicCore, type DeterministicSectionBlock } from './deterministicCore'
import { buildUnifiedEnvelope, inferAgeFromBirthDate } from './unifiedReport'
import {
  buildActionRepairInstruction,
  buildAntiRepetitionInstruction,
  buildCrossCoverageRepairInstruction,
  buildCrossRepairInstruction,
  buildDepthRepairInstruction,
  buildEvidenceRepairInstruction,
  buildNarrativeRewritePrompt,
  buildNarrativeStyleRepairInstruction,
  buildSecondPassInstruction,
  buildTimingRepairInstruction,
} from './repairPrompts'
import {
  buildComprehensiveEvidenceRefs as buildComprehensiveEvidenceRefsExternal,
  buildThemedEvidenceRefs as buildThemedEvidenceRefsExternal,
  buildTimingEvidenceRefs as buildTimingEvidenceRefsExternal,
  enforceEvidenceRefFooters as enforceEvidenceRefFootersExternal,
  hasEvidenceSupport as hasEvidenceSupportExternal,
  resolveSignalDomain as resolveSignalDomainExternal,
  type ReportEvidenceSupportDeps,
} from './reportEvidenceSupport'
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
import {
  applyFinalReportStyle,
  attachDeterministicArtifacts,
  buildDirectToneOverride,
  buildReportOutputCoreFields,
  buildReportQualityMetrics,
  buildTopMatchedPatterns,
  countSectionChars,
  ensureFinalActionPlanGrounding,
  ensureFinalReportPolish,
  getAiQualityTier,
  getCostOptimizedComprehensiveLiveSectionKeys,
  getEffectiveMaxRepairPasses,
  isCostOptimizedAiPath,
  recordReportQualityMetrics,
  recordRewriteModeMetric,
} from './aiReportServiceRuntimeSupport'
import {
  generateThemedReportWithSupport,
  generateTimingReportWithSupport,
} from './aiReportServiceGenerationSupport'
import { generateAIPremiumReportWithSupport } from './aiReportServicePremiumGenerationSupport'
import {
  buildElementMetaphor,
  buildFocusedCycleLead,
  buildManifestationNarrative,
  buildNarrativeSectionFromCore,
  buildPersonalBaseNarrative,
  buildPersonalCycleNarrative,
  buildPersonalLifeTimelineNarrative,
  buildPrimaryActionLead,
  buildPrimaryCautionLead,
  buildSectionPersonalLead,
  buildTimingWindowNarrative,
  buildVerdictNarrative,
  calculateProfileAge,
  extractPersonalDaeunWindows,
  findReportCoreDomainVerdict,
  formatCycleLabel,
  formatPlanetPlacement,
  formatScenarioIdForNarrative,
  normalizeElementKey,
  toFiniteNumber,
  toObjectRecord,
} from './aiReportServiceNarrativeSupport'
import {
  buildProjectionFirstThemedSections,
  buildProjectionMoveSentence,
  joinNarrativeParts,
  collectProjectionDriverLabels,
} from './aiReportServiceThemedSupport'
import {
  buildGraphRagSummaryPayload as buildGraphRagSummaryPayloadSupport,
  buildSectionFactPack as buildSectionFactPackSupport,
  buildSectionPrompt as buildSectionPromptSupport,
  buildStrategyFactsForSection as buildStrategyFactsForSectionSupport,
  buildSynthesisPromptBlock as buildSynthesisPromptBlockSupport,
  cleanRecommendationLine as cleanRecommendationLineSupport,
  ensureLongSectionNarrative as ensureLongSectionNarrativeSupport,
  extractTopMatrixFacts as extractTopMatrixFactsSupport,
  humanizeCrossSetFact as humanizeCrossSetFactSupport,
  isComprehensiveSectionsPayload as isComprehensiveSectionsPayloadSupport,
  postProcessSectionNarrative as postProcessSectionNarrativeSupport,
  summarizeTopInsightsByCategory as summarizeTopInsightsByCategorySupport,
  toKoreanDomainLabel as toKoreanDomainLabelSupport,
  type GraphRagSummaryPayload,
} from './aiReportServicePromptSupport'
import {
  getPremiumPolishPaths as getPremiumPolishPathsSupport,
  getPremiumPolishBatchSize as getPremiumPolishBatchSizeSupport,
  maybePolishPremiumSections as maybePolishPremiumSectionsSupport,
  shouldForceComprehensiveNarrativeFallback as shouldForceComprehensiveNarrativeFallbackSupport,
  shouldForceThemedNarrativeFallback as shouldForceThemedNarrativeFallbackSupport,
  shouldUsePremiumSelectivePolish as shouldUsePremiumSelectivePolishSupport,
} from './aiReportServicePolishSupport'
import {
  appendEvidenceFooter as appendEvidenceFooterSupport,
  attachTrustNarrativeToSections as attachTrustNarrativeToSectionsSupport,
  buildEvidenceFooter as buildEvidenceFooterSupport,
  buildEvidenceLine as buildEvidenceLineSupport,
  buildExtendedComprehensiveSections as buildExtendedComprehensiveSectionsSupport,
  buildReportTrustNarratives as buildReportTrustNarrativesSupport,
  getComprehensiveRenderPaths as getComprehensiveRenderPathsSupport,
  isMeaningfulEvidenceToken as isMeaningfulEvidenceTokenSupport,
  renderActionPlanSection as renderActionPlanSectionSupport,
  renderCareerPathSection as renderCareerPathSectionSupport,
  renderComprehensiveFutureOutlookSection as renderComprehensiveFutureOutlookSectionSupport,
  renderComprehensiveLifeStagesSection as renderComprehensiveLifeStagesSectionSupport,
  renderComprehensiveSpouseProfileSection as renderComprehensiveSpouseProfileSectionSupport,
  renderComprehensiveTurningPointsSection as renderComprehensiveTurningPointsSectionSupport,
  renderConclusionSection as renderConclusionSectionSupport,
  renderHealthGuidanceSection as renderHealthGuidanceSectionSupport,
  renderIntroductionSection as renderIntroductionSectionSupport,
  renderLifeMissionSection as renderLifeMissionSectionSupport,
  renderPersonalityDeepSection as renderPersonalityDeepSectionSupport,
  renderRelationshipDynamicsSection as renderRelationshipDynamicsSectionSupport,
  renderTimingAdviceSection as renderTimingAdviceSectionSupport,
  renderWealthPotentialSection as renderWealthPotentialSectionSupport,
  sanitizeNarrativeReason as sanitizeNarrativeReasonSupport,
} from './aiReportServiceSectionSupport'

function isMeaningfulEvidenceToken(value: string | undefined | null): boolean {
  return isMeaningfulEvidenceTokenSupport(value)
}

function buildEvidenceLine(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  return buildEvidenceLineSupport(input, lang)
}

function buildEvidenceFooter(input: MatrixCalculationInput, lang: 'ko' | 'en'): string {
  return buildEvidenceFooterSupport(input, lang)
}

function appendEvidenceFooter(
  body: string,
  input: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return appendEvidenceFooterSupport(body, input, lang)
}

function sanitizeNarrativeReason(
  value: string | null | undefined,
  lang: 'ko' | 'en',
  fallback = ''
): string {
  return sanitizeNarrativeReasonSupport(value, lang, fallback)
}

function buildReportTrustNarratives(
  reportCore: ReportCoreViewModel,
  coreQuality: DestinyCoreQuality | undefined,
  lang: 'ko' | 'en'
): { trust: string; provenance: string } {
  return buildReportTrustNarrativesSupport(
    reportCore,
    coreQuality,
    lang,
    aiReportSectionSupportDeps
  )
}

function attachTrustNarrativeToSections<T extends Record<string, unknown>>(
  mode: 'comprehensive' | 'timing' | 'themed',
  sections: T,
  trust: string,
  provenance: string
): T {
  return attachTrustNarrativeToSectionsSupport(mode, sections, trust, provenance)
}

function renderIntroductionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderIntroductionSectionSupport(reportCore, matrixInput, lang, aiReportSectionSupportDeps)
}

function renderLifeMissionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderLifeMissionSectionSupport(reportCore, matrixInput, lang, aiReportSectionSupportDeps)
}

function renderPersonalityDeepSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderPersonalityDeepSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderTimingAdviceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  matrixSummary?: MatrixSummary
): string {
  return renderTimingAdviceSectionSupport(
    reportCore,
    matrixInput,
    lang,
    matrixSummary,
    aiReportSectionSupportDeps
  )
}

function renderActionPlanSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderActionPlanSectionSupport(reportCore, matrixInput, lang, aiReportSectionSupportDeps)
}

function renderCareerPathSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderCareerPathSectionSupport(reportCore, matrixInput, lang, aiReportSectionSupportDeps)
}

function renderRelationshipDynamicsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderRelationshipDynamicsSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderWealthPotentialSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderWealthPotentialSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderConclusionSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderConclusionSectionSupport(reportCore, matrixInput, lang, aiReportSectionSupportDeps)
}

function renderHealthGuidanceSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderHealthGuidanceSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderComprehensiveSpouseProfileSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderComprehensiveSpouseProfileSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderComprehensiveLifeStagesSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderComprehensiveLifeStagesSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderComprehensiveTurningPointsSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderComprehensiveTurningPointsSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function renderComprehensiveFutureOutlookSection(
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en'
): string {
  return renderComprehensiveFutureOutlookSectionSupport(
    reportCore,
    matrixInput,
    lang,
    aiReportSectionSupportDeps
  )
}

function buildExtendedComprehensiveSections(
  sections: AIPremiumReport['sections'],
  reportCore: ReportCoreViewModel,
  matrixInput: MatrixCalculationInput,
  lang: 'ko' | 'en',
  _matrixSummary?: MatrixSummary
): AIPremiumReport['sections'] {
  return {
    ...sections,
    ...buildExtendedComprehensiveSectionsSupport(
      reportCore,
      matrixInput,
      lang,
      aiReportSectionSupportDeps
    ),
  }
}

function getComprehensiveRenderPaths(sections: Partial<AIPremiumReport['sections']>): string[] {
  return getComprehensiveRenderPathsSupport(sections)
}

function shouldForceComprehensiveNarrativeFallback(
  quality: ReportQualityMetrics | undefined
): boolean {
  return shouldForceComprehensiveNarrativeFallbackSupport(quality)
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
  return shouldForceThemedNarrativeFallbackSupport(quality)
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
        `\uc9c0\uae08 \uad00\uacc4\uc5d0\uc11c \uac00\uc7a5 \ub9de\ub294 \uae30\ubcf8 \uc790\uc138\ub294 ${reportCore.topDecisionLabel || reportCore.primaryAction}\uc785\ub2c8\ub2e4.`,
        '\ube68\ub9ac \uac00\uae4c\uc6cc\uc9c0\uae30\ubcf4\ub2e4 \uc624\ub798 \uac08 \uc218 \uc788\ub294 \uc6b4\uc601 \ubc29\uc2dd\uc744 \uba3c\uc800 \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.',
        '\uc608\ub97c \ub4e4\uc5b4 \uc5f0\ub77d \ube48\ub3c4, \ub9cc\ub0a8 \uc18d\ub3c4, \uc77c\uc815 \uc870\uc728 \uac19\uc740 \uc0dd\ud65c \ub9ac\ub4ec\ubd80\ud130 \ub9de\ub294\uc9c0 \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ud6e8\uc52c \ud604\uc2e4\uc801\uc785\ub2c8\ub2e4.',
        reportCore.riskControl,
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
        `\uc9c0\uae08 \uc7ac\uc815\uc5d0\uc11c \uac00\uc7a5 \ub9de\ub294 \uae30\ubcf8 \uc790\uc138\ub294 ${reportCore.topDecisionLabel || reportCore.primaryAction}\uc785\ub2c8\ub2e4.`,
        '\ub354 \ud06c\uac8c \ubc8c\ub9ac\uae30\ubcf4\ub2e4 \ud754\ub4e4\ub824\ub3c4 \ubc84\ud2f8 \uc218 \uc788\ub294 \uad6c\uc870\ub97c \uba3c\uc800 \ub9cc\ub4dc\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.',
        '\uc608\ub97c \ub4e4\uc5b4 \ud22c\uc790, \uacc4\uc57d, \ubd80\uc5c5 \uc81c\uc548\uc774 \ub4e4\uc5b4\uc624\uba74 \uae30\ub300 \uc218\uc775\ubcf4\ub2e4 \ucde8\uc18c \uc870\uac74, \uace0\uc815\ube44 \uc99d\uac00, \uc190\uc2e4 \uc0c1\ud55c\ubd80\ud130 \ud655\uc778\ud558\ub294 \ud3b8\uc774 \ub9de\uc2b5\ub2c8\ub2e4.',
        reportCore.riskControl,
        branchRisk ? `\uc11c\ub450\ub974\uba74 ${branchRisk}` : ''
      ),
    }
  }

  if (theme === 'health') {
    return {
      deepAnalysis: p(
        `${riskLabel} 문제가 지금 가장 예민한 변수로 같이 움직입니다. 그래서 이번 건강 리포트의 핵심은 버티는 힘을 증명하는 것이 아니라, 무너지기 전에 회복 리듬을 다시 세우는 데 있습니다.`,
        `지금 몸 상태는 단순한 보조 이슈가 아니라 커리어와 관계 판단의 품질까지 흔들 수 있는 핵심 변수입니다.`,
        `좋은 기회가 와도 회복이 밀리면 결과보다 소모가 먼저 커질 수 있으니, 건강은 이번 구간에서 가장 먼저 관리해야 할 기반입니다.`
      ),
      patterns: p(
        '지금 건강에서는 작은 경고를 빨리 읽는 사람이 결국 오래 갑니다.',
        '한 번 크게 쉬는 것보다, 반복 가능한 수면·회복·에너지 배분 루틴을 다시 고정하는 편이 훨씬 현실적입니다.',
        '몸이 보내는 짧은 경고를 무시하고 밀어붙이면 일정 전체가 길게 흔들릴 수 있습니다.'
      ),
      timing: p(
        timingLine,
        '지금은 컨디션이 잠깐 올라오는 순간을 성과로 착각하기보다, 회복이 실제로 안정되는지부터 확인하는 편이 맞습니다.',
        branchEntry
          ? `특히 ${branchEntry}가 자연스럽게 맞아떨어질 때 회복 리듬도 함께 안정됩니다.`
          : ''
      ),
      prevention: p(
        '예방의 핵심은 무너진 뒤에 크게 쉬는 것이 아니라, 무너지기 전에 작은 경고를 끊어내는 데 있습니다.',
        '예를 들어 수면 시간, 식사 리듬, 통증·피로가 심해지는 시간대를 먼저 기록해 두면 번아웃 경로를 훨씬 빨리 끊을 수 있습니다.'
      ),
      riskWindows: p(
        '위험 구간은 보통 조용히 열립니다. 일정이 쌓이고 회복이 밀리는데도 버틸 수 있다고 느낄 때가 가장 위험합니다.',
        branchAbort
          ? `특히 ${branchAbort} 같은 신호가 보이면 일정을 줄이고 회복을 우선으로 돌려야 합니다.`
          : ''
      ),
      recoveryPlan: p(
        `지금 건강에서 가장 맞는 기본 자세는 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
        '쉬는 날 하루를 만드는 것보다, 매일 반복 가능한 회복 리듬을 먼저 고정하는 편이 더 오래 갑니다.',
        '예를 들어 취침 시간, 자극적인 일정의 상한선, 회복이 필요한 날의 대체 루틴을 미리 정해두면 컨디션이 무너질 때도 빨리 복구할 수 있습니다.'
      ),
      recommendations: dedupe([
        '무리해서 버티기보다 회복 리듬을 먼저 고정하세요.',
        branchAbort || '경고 신호가 반복되면 일정을 줄이고 휴식 기준을 다시 세우세요.',
        '몸 상태가 흔들리는 날의 대체 루틴을 미리 정해두세요.',
      ]),
      actionPlan: p(
        `지금 건강에서 가장 맞는 기본 자세는 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
        '버티는 시간을 늘리기보다, 회복이 가능한 구조를 먼저 만드는 편이 맞습니다.',
        '예를 들어 수면 시간, 업무 강도, 식사와 수분 같은 기본 리듬부터 다시 맞추고, 회복이 밀리는 날엔 일정을 줄이는 원칙을 먼저 세워두세요.',
        reportCore.riskControl,
        branchRisk ? `서두르거나 무리하면 ${branchRisk}` : ''
      ),
    }
  }

  if (theme === 'family') {
    return {
      deepAnalysis: p(
        `이번 가족 리포트의 핵심은 누가 옳으냐를 가르는 것이 아니라, 서로 다른 기대와 역할을 같은 장면으로 맞추는 데 있습니다.`,
        `가족 문제는 감정의 강도보다 역할, 책임, 돌봄의 분배가 맞지 않을 때 더 오래 흔들립니다.`,
        riskLine
      ),
      patterns: p(
        '지금 가족 흐름에서는 말의 양보다 해석의 일치가 더 중요합니다.',
        '서로 같은 장면을 다르게 읽고 있으면 작은 일도 오래 남고, 기대치가 흐리면 피로와 서운함이 계속 쌓입니다.'
      ),
      timing: p(
        timingLine,
        '지금은 한 번에 정답을 내리기보다, 누가 무엇을 맡고 어디까지 책임질지를 먼저 맞추는 편이 안정적입니다.',
        branchEntry ? `특히 ${branchEntry}가 자연스럽게 맞아떨어질 때 갈등도 훨씬 덜 커집니다.` : ''
      ),
      dynamics: p(
        '가족 안에서는 감정보다 역할 구조가 먼저 정리돼야 합니다.',
        '예를 들어 돌봄, 일정 조율, 비용 부담, 연락 빈도 같은 현실 항목을 문장으로 합의하면 감정 소모가 크게 줄어듭니다.'
      ),
      communication: p(
        '지금 필요한 대화는 누가 더 힘든지를 겨루는 대화가 아니라, 같은 상황을 어떻게 이해하고 있는지 맞추는 대화입니다.',
        '말을 길게 하기보다 서로의 기대치와 보류 조건을 짧게라도 분명히 적어두는 편이 훨씬 효과적입니다.'
      ),
      legacy: p(
        '가족 문제는 한 번의 큰 대화보다 반복되는 습관과 역할 패턴이 더 오래 남습니다.',
        '이번 구간에서는 감정적 결론보다 지속 가능한 운영 방식을 만드는 쪽이 결국 오래 갑니다.'
      ),
      recommendations: dedupe([
        '감정보다 역할과 책임 범위를 먼저 맞추세요.',
        branchAbort || '기대치가 어긋나면 결론을 미루고 보류 조건부터 정리하세요.',
        '돌봄·일정·비용 분담 같은 현실 항목을 먼저 문서화하세요.',
      ]),
      actionPlan: p(
        `지금 가족 문제에서 가장 맞는 기본 자세는 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`,
        '누가 옳은지 따지기보다, 누가 무엇을 맡고 어디까지 책임질지를 먼저 정리하는 편이 맞습니다.',
        '예를 들어 연락 빈도, 돌봄 분담, 비용 부담, 방문 일정 같은 생활 기준을 먼저 맞춰두면 감정 소모를 크게 줄일 수 있습니다.',
        reportCore.riskControl,
        branchRisk ? `서두르면 ${branchRisk}` : ''
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
  return shouldUsePremiumSelectivePolishSupport(userPlan, {
    isCostOptimizedAiPath,
  })
}

function getPremiumPolishPaths(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
}): string[] {
  return getPremiumPolishPathsSupport(params)
}

function getPremiumPolishBatchSize(params: {
  reportType: 'comprehensive' | 'timing' | 'themed'
  theme?: ReportTheme
}): number {
  return getPremiumPolishBatchSizeSupport(params)
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
  return maybePolishPremiumSectionsSupport(params, {
    isCostOptimizedAiPath,
    getPathValue,
    setPathText,
    rewriteSectionsWithFallback,
  })
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
  getReportDomainLabel: (domain, lang) => getReportDomainLabel(domain || 'timing', lang),
  localizeReportNarrativeText,
  sanitizeUserFacingNarrative,
}

const aiReportSectionSupportDeps = {
  reportSectionRendererDeps,
  reportLifeSectionDeps,
  buildProjectionMoveSentence,
  collectProjectionDriverLabels,
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
  return isComprehensiveSectionsPayloadSupport(value, COMPREHENSIVE_SECTION_KEYS)
}
function postProcessSectionNarrative(
  text: string,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string {
  return postProcessSectionNarrativeSupport(text, sectionKey, lang)
}

function toKoreanDomainLabel(domain: SignalDomain): string {
  return toKoreanDomainLabelSupport(domain)
}

function buildGraphRagSummaryPayload(
  lang: 'ko' | 'en',
  matrixReport: FusionReport,
  graphRagEvidence: NonNullable<AIPremiumReport['graphRagEvidence']>,
  signalSynthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  reportCore?: ReportCoreViewModel
): GraphRagSummaryPayload {
  return buildGraphRagSummaryPayloadSupport(
    lang,
    matrixReport,
    graphRagEvidence,
    signalSynthesis,
    strategyEngine,
    reportCore
  )
}

function humanizeCrossSetFact(set: GraphRAGCrossEvidenceSet): string {
  return humanizeCrossSetFactSupport(set)
}

function extractTopMatrixFacts(matrixReport: FusionReport, sectionKey: string): string[] {
  return extractTopMatrixFactsSupport(matrixReport, sectionKey)
}

function buildStrategyFactsForSection(
  strategyEngine: StrategyEngineResult | undefined,
  sectionKey: keyof AIPremiumReport['sections'],
  lang: 'ko' | 'en'
): string[] {
  return buildStrategyFactsForSectionSupport(strategyEngine, sectionKey, lang)
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
  return buildSectionFactPackSupport(
    sectionKey,
    anchor,
    matrixReport,
    input,
    reportCore,
    signalSynthesis,
    strategyEngine,
    buildTimingWindowNarrative,
    buildManifestationNarrative,
    buildVerdictNarrative,
    lang
  )
}

function buildSectionPrompt(
  sectionKey: keyof AIPremiumReport['sections'],
  factPack: string[],
  lang: 'ko' | 'en',
  draftText?: string,
  targetMinChars?: number
): string {
  return buildSectionPromptSupport(sectionKey, factPack, lang, draftText, targetMinChars)
}

function summarizeTopInsightsByCategory(
  report: FusionReport,
  categories: string[],
  lang: 'ko' | 'en',
  limit = 3
): string {
  return summarizeTopInsightsByCategorySupport(report, categories, lang, limit)
}

function ensureLongSectionNarrative(base: string, minChars: number, extras: string[]): string {
  return ensureLongSectionNarrativeSupport(base, minChars, extras)
}

function cleanRecommendationLine(text: string, lang: 'ko' | 'en'): string {
  return formatNarrativeParagraphs(cleanRecommendationLineSupport(text, lang), lang)
}

function buildSynthesisPromptBlock(
  synthesis: SignalSynthesisResult | undefined,
  strategyEngine: StrategyEngineResult | undefined,
  lang: 'ko' | 'en',
  mode: 'timing' | 'themed',
  theme?: ReportTheme
): string {
  return buildSynthesisPromptBlockSupport(synthesis, strategyEngine, lang, mode, theme)
}

// ===========================
// Main generation function
// ===========================

export async function generateAIPremiumReport(
  input: MatrixCalculationInput,
  matrixReport: FusionReport,
  options: AIReportGenerationOptions = {}
): Promise<AIPremiumReport> {
  return generateAIPremiumReportWithSupport(input, matrixReport, options, {
    FORCE_REWRITE_ONLY_MODE,
    logger,
    buildNormalizedMatrixInput,
    buildGraphRAGEvidence,
    buildDeterministicCore,
    runDestinyCore,
    adaptCoreToReport,
    buildTopMatchedPatterns,
    buildGraphRagSummaryPayload,
    shouldUseDeterministicOnly,
    buildComprehensiveEvidenceRefs,
    COMPREHENSIVE_SECTION_KEYS,
    buildComprehensiveFallbackSectionsExternal,
    comprehensiveFallbackDeps,
    buildUnifiedEnvelope,
    mergeComprehensiveDraftWithBlocksExternal,
    maybePolishPremiumSections,
    validateEvidenceBinding,
    enforceEvidenceBindingFallback,
    sanitizeSectionsByPathsExternal,
    narrativePathSanitizerDeps,
    sanitizeComprehensiveSectionsForUser,
    comprehensivePostProcessDeps,
    applyComprehensiveSectionRoleGuards,
    repairMalformedComprehensiveSections,
    enforceComprehensiveNarrativeQualityFallback,
    stripGenericEvidenceFooters,
    enforceEvidenceRefFooters,
    buildReportQualityMetrics,
    shouldForceComprehensiveNarrativeFallback,
    renderPersonalityDeepSection,
    renderTimingAdviceSection,
    renderActionPlanSection,
    recordReportQualityMetrics,
    buildExtendedComprehensiveSections,
    getComprehensiveRenderPaths,
    applyFinalReportStyle,
    ensureFinalActionPlanGrounding,
    ensureFinalReportPolish,
    buildReportOutputCoreFields,
    attachDeterministicArtifacts,
    renderSectionsAsMarkdown,
    renderSectionsAsText,
    rewriteSectionsWithFallback,
    recordRewriteModeMetric,
    buildReportTrustNarratives,
    attachTrustNarrativeToSections,
    buildNarrativeSupplementsBySectionExternal,
    generateNarrativeSectionsFromSynthesis,
    buildSectionFactPack,
    buildSectionPrompt,
    buildSynthesisPromptBlock,
    buildThemeSchemaPromptBlock,
    inferAgeFromBirthDate,
    buildLifeCyclePromptBlock,
    buildMatrixSummary,
    summarizeGraphRAGEvidence,
    buildDirectToneOverride,
    sanitizeSectionNarrative,
    sanitizeTimingContradictionsExternal,
    postProcessSectionNarrative,
    evaluateSectionGate,
    containsBannedPhrase,
    hasTimingInText,
    buildNarrativeRewritePrompt,
    buildTimingRepairInstruction,
    renderProjectionBlocksAsText,
    callAIBackendGeneric,
    getAiQualityTier,
    isComprehensiveSectionsPayload,
    hasRequiredSectionPaths,
    getShortSectionPaths,
    getMissingCrossPaths,
    getCrossCoverageRatio,
    getMissingPathsByPredicate,
    getCoverageRatioByPredicate,
    hasActionInText,
    hasEvidenceTriplet,
    getListStylePaths,
    countSectionChars,
    buildDepthRepairInstruction,
    buildCrossRepairInstruction,
    buildCrossCoverageRepairInstruction,
    buildActionRepairInstruction,
    buildEvidenceRepairInstruction,
    buildNarrativeStyleRepairInstruction,
    buildSecondPassInstruction,
    buildAntiRepetitionInstruction,
    getRepetitivePaths,
    hasRepetitiveSentences,
    buildEvidenceBindingRepairPrompt,
    buildComprehensiveEvidenceRefsExternal,
    getEffectiveMaxRepairPasses,
    getCostOptimizedComprehensiveLiveSectionKeys,
    isCostOptimizedAiPath,
    reportCoreEnrichmentDeps,
  })
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
  return generateTimingReportWithSupport(input, matrixReport, period, timingData, options, {
    FORCE_REWRITE_ONLY_MODE,
    logger,
    buildNormalizedMatrixInput,
    buildGraphRAGEvidence,
    formatGraphRAGEvidenceForPrompt,
    buildDeterministicCore,
    runDestinyCore,
    adaptCoreToReport,
    buildTopMatchedPatterns,
    buildGraphRagSummaryPayload,
    shouldUseDeterministicOnly,
    buildTimingFallbackSectionsExternal,
    buildTimingEvidenceRefs,
    buildUnifiedEnvelope,
    enrichTimingSectionsWithReportCore,
    buildReportTrustNarratives,
    attachTrustNarrativeToSections,
    maybePolishPremiumSections,
    validateEvidenceBinding,
    enforceEvidenceBindingFallback,
    enforceEvidenceRefFooters,
    sanitizeSectionsByPathsExternal,
    narrativePathSanitizerDeps,
    generatePeriodLabel,
    calculatePeriodScore,
    buildReportQualityMetrics,
    recordReportQualityMetrics,
    buildReportOutputCoreFields,
    attachDeterministicArtifacts,
    renderSectionsAsMarkdown,
    renderSectionsAsText,
    rewriteSectionsWithFallback,
    recordRewriteModeMetric,
    inferAgeFromBirthDate,
    buildLifeCyclePromptBlock,
    buildThemeSchemaPromptBlock,
    buildSynthesisPromptBlock,
    buildMatrixSummary,
    buildTimingPrompt,
    buildDirectToneOverride,
    callAIBackendGeneric,
    getAiQualityTier,
    hasRequiredSectionPaths,
    getEffectiveMaxRepairPasses,
    getShortSectionPaths,
    getMissingCrossPaths,
    getCrossCoverageRatio,
    getMissingPathsByPredicate,
    getCoverageRatioByPredicate,
    hasActionInText,
    hasEvidenceTriplet,
    getListStylePaths,
    countSectionChars,
    buildDepthRepairInstruction,
    buildCrossRepairInstruction,
    buildCrossCoverageRepairInstruction,
    buildActionRepairInstruction,
    buildEvidenceRepairInstruction,
    buildNarrativeStyleRepairInstruction,
    buildSecondPassInstruction,
    buildEvidenceBindingRepairPrompt,
    applyFinalReportStyle,
    ensureFinalActionPlanGrounding,
    ensureFinalReportPolish,
    reportCoreEnrichmentDeps,
    secondaryFallbackDeps,
  })
}

// ===========================
// Themed report generation function
// ===========================

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
  return generateThemedReportWithSupport(input, matrixReport, theme, timingData, options, {
    FORCE_REWRITE_ONLY_MODE,
    logger,
    buildNormalizedMatrixInput,
    buildGraphRAGEvidence,
    formatGraphRAGEvidenceForPrompt,
    buildDeterministicCore,
    runDestinyCore,
    adaptCoreToReport,
    buildTopMatchedPatterns,
    buildGraphRagSummaryPayload,
    shouldUseDeterministicOnly,
    getThemedSectionKeys,
    buildProjectionFirstThemedSections,
    buildThemedEvidenceRefs,
    buildUnifiedEnvelope,
    enrichThemedSectionsWithReportCore,
    buildReportTrustNarratives,
    attachTrustNarrativeToSections,
    maybePolishPremiumSections,
    validateEvidenceBinding,
    enforceEvidenceBindingFallback,
    enforceEvidenceRefFooters,
    sanitizeSectionsByPathsExternal,
    narrativePathSanitizerDeps,
    sanitizeThemedSectionsForUserExternal,
    secondaryPostProcessDeps,
    THEME_META,
    calculateThemeScore,
    extractKeywords,
    buildReportQualityMetrics,
    shouldForceThemedNarrativeFallback,
    enforceThemedNarrativeQualityFallback,
    finalizeThemedSectionsForUser,
    recordReportQualityMetrics,
    buildReportOutputCoreFields,
    attachDeterministicArtifacts,
    renderSectionsAsMarkdown,
    renderSectionsAsText,
    rewriteSectionsWithFallback,
    recordRewriteModeMetric,
    inferAgeFromBirthDate,
    buildLifeCyclePromptBlock,
    buildThemeSchemaPromptBlock,
    buildSynthesisPromptBlock,
    buildMatrixSummary,
    buildThemedPrompt,
    buildDirectToneOverride,
    callAIBackendGeneric,
    getAiQualityTier,
    hasRequiredSectionPaths,
    getEffectiveMaxRepairPasses,
    getShortSectionPaths,
    getMissingCrossPaths,
    getCrossCoverageRatio,
    getMissingPathsByPredicate,
    getCoverageRatioByPredicate,
    hasActionInText,
    hasEvidenceTriplet,
    getListStylePaths,
    countSectionChars,
    buildDepthRepairInstruction,
    buildCrossRepairInstruction,
    buildCrossCoverageRepairInstruction,
    buildActionRepairInstruction,
    buildEvidenceRepairInstruction,
    buildNarrativeStyleRepairInstruction,
    buildSecondPassInstruction,
    buildEvidenceBindingRepairPrompt,
    applyFinalReportStyle,
    ensureFinalActionPlanGrounding,
    ensureFinalReportPolish,
    reportCoreEnrichmentDeps,
  })
}
