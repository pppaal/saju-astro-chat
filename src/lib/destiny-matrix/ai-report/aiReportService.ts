// src/lib/destiny-matrix/ai-report/aiReportService.ts
// Destiny Fusion Matrix(TM) - AI Premium Report Generator
// 유료 기능: AI 기반 상세 내러티브 리포트 생성

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

const RECHECK_REGEX = /재확인|점검|검토|verify|recheck|double-check|checklist|review/i
const ABSOLUTE_RISK_REGEX = /무조건|절대|반드시|100%|always|never|guaranteed|certainly/i
const IRREVERSIBLE_ACTION_REGEX =
  /계약|서명|확정|예약|결혼식|청첩장|이직\s*확정|창업\s*확정|런칭|큰\s*결정|즉시\s*결정|sign|finalize|commit now|book|wedding|invitation|big decision|launch/i
const CAUTION_INDICATOR_REGEX =
  /주의|리스크|경계|재확인|확인|오류|갈등|충돌|caution|risk|warning|recheck|conflict/i
const IMMEDIATE_FORCE_REGEX =
  /즉시|바로|지금\s*확정|오늘\s*확정|today\s*finalize|sign now|commit now|immediately/i
const MITIGATION_REGEX =
  /전|재확인|점검|검토|보류|미루|분리|하지\s*말|avoid|before|recheck|verify|defer|hold/i
const RECOMMENDATION_TONE_REGEX =
  /하세요|하십시오|권장|추천|진행|실행|하라|해야|권합니다|recommended|recommend|should|must|do this|proceed/i
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
      '## 말투 강제 규칙',
      '- 친구식 위로체 대신 전문가 컨설팅 톤으로 작성합니다.',
      '- 각 단락 첫 문장은 결론형으로 시작합니다.',
      '- 두루뭉술한 표현 대신 명확한 판단 문장을 사용합니다.',
      '- 근거(사주/점성) -> 해석 -> 행동 순서를 유지합니다.',
      '- 불릿이 아니라 문단형으로 작성하되, 문장은 짧고 단정하게 씁니다.',
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
      .replace(/\bpersonality\b/gi, '성향')
      .replace(/\bcareer\b/gi, '커리어')
      .replace(/\brelationship\b/gi, '관계')
      .replace(/\bwealth\b/gi, '재정')
      .replace(/\bhealth\b/gi, '건강')
      .replace(/\bmove\b/gi, '이동')
      .replace(/\bspirituality\b/gi, '장기 방향')
      .replace(/\bnow\b/gi, '지금')
      .replace(/\bweek\b/gi, '주 단위')
      .replace(/\bfortnight\b/gi, '2주 단위')
      .replace(/\bmonth\b/gi, '월 단위')
      .replace(/\bseason\b/gi, '분기 단위')
      .replace(/\bverify\b/gi, '확인')
      .replace(/\bprepare\b/gi, '준비 우선')
      .replace(/\bexecute\b/gi, '실행')
      .replace(/\bTransit\s+saturnReturn\b/gi, '책임 압력 신호')
      .replace(/\bTransit\s+jupiterReturn\b/gi, '확장 신호')
      .replace(/\bTransit\s+nodeReturn\b/gi, '방향 전환 신호')
      .replace(/\bTransit\s+mercuryRetrograde\b/gi, '소통 재검토 신호')
      .replace(/\bTransit\s+marsRetrograde\b/gi, '마찰 재검토 신호')
      .replace(/\bTransit\s+venusRetrograde\b/gi, '관계 재검토 신호')
      .replace(/\bsaturnReturn\b/gi, '책임 압력 신호')
      .replace(/\bjupiterReturn\b/gi, '확장 신호')
      .replace(/\bnodeReturn\b/gi, '방향 전환 신호')
      .replace(/\bmercuryRetrograde\b/gi, '소통 재검토 신호')
      .replace(/\bmarsRetrograde\b/gi, '마찰 재검토 신호')
      .replace(/\bvenusRetrograde\b/gi, '관계 재검토 신호')
      .replace(/\bsolarReturn\b/gi, '연간 초점 강조')
      .replace(/\blunarReturn\b/gi, '감정 파동 신호')
      .replace(/\bprogressions?\b/gi, '장기 전개 흐름')
      .replace(/\bcaution\b/gi, '주의 신호')
      .replace(/\bdowngrade pressure\b/gi, '하향 조정 압력')
      .replace(/\bgeokguk strength\b/gi, '격국 응집력')
      .replace(/\bdebt restructure\b/gi, '부채 재정리')
      .replace(/\bliquidity defense\b/gi, '유동성 방어')
      .replace(/\bexpense spike\b/gi, '지출 급증 대응')
      .replace(/\bpromotion review\b/gi, '승진 검토')
      .replace(/\brecovery reset\b/gi, '회복 재정렬')
      .replace(/\bbasecamp reset\b/gi, '거점 재정비')
      .replace(/\bmap full debt stack\b/gi, '전체 부채 구조를 다시 정리하기')
      .replace(/\bwealth volatility pattern\b/gi, '재정 변동성 패턴')
      .replace(/\bcareer expansion pattern\b/gi, '커리어 확장 패턴')
      .replace(/\brelationship tension pattern\b/gi, '관계 긴장 패턴')
      .replace(/\bcashflow\b/gi, '현금흐름')
      .replace(/\bmoney expansion action\b/gi, '재정 확장은 조건 검증부터 진행하세요')
      .replace(/\brelationship caution\b/gi, '관계에서는 속도보다 기준 확인이 먼저입니다')
      .replace(/활성 신호\s+책임 압력 신호/gi, '책임 압력 신호')
      .replace(/활성 신호\s+확장 신호/gi, '확장 신호')
      .replace(/활성 신호\s+방향 전환 신호/gi, '방향 전환 신호')
      .replace(/활성 신호\s+소통 재검토 신호/gi, '소통 재검토 신호')
      .replace(/변동성 패턴\s+패턴/gi, '변동성 패턴')
      .replace(
        /action pressure stayed narrow between ([^\s]+) and ([^\s]+)/gi,
        (_, left: string, right: string) =>
          `${getReportDomainLabel(left, 'ko')}와 ${getReportDomainLabel(right, 'ko')} 사이의 행동 압력이 좁게 경쟁했습니다`
      )
      .replace(
        /\b\w+\s+stayed secondary because total support remained below the winner\b/gi,
        '최종 지지가 승자축보다 약해 보조축에 머물렀습니다'
      )
      .replace(
        /([가-힣]+)\s+stayed secondary because total support remained below the winner/gi,
        '$1은 최종 지지가 승자축보다 약해 보조축에 머물렀습니다'
      )
      .replace(/밀는/g, '미는')
      .replace(/중단는/g, '중단은')
      .replace(/커리어은/g, '커리어는')
      .replace(/관계은/g, '관계는')
      .replace(/타이밍와/g, '타이밍과')
      .replace(/장기 방향와/g, '장기 방향과')
      .replace(/재정와/g, '재정과')
      .replace(/건강와/g, '건강과')
      .replace(/편이 맞습니다\.입니다\./g, '편이 맞습니다.')
      .replace(/트랜짓가/g, '트랜짓이')
      .replace(/\s+/g, ' ')
      .trim()
  }
  const focusLabel = getReportDomainLabel(reportCore.focusDomain, lang)
  const actionLabel = getReportDomainLabel(
    reportCore.actionFocusDomain || reportCore.focusDomain,
    lang
  )
  const localizeProjectionList = (items: Array<string | undefined | null>) =>
    items.map((item) => localizeReportFreeText(item)).filter(Boolean)
  const timingWindow = reportCore.domainTimingWindows.find(
    (item) => item.domain === reportCore.actionFocusDomain || item.domain === reportCore.focusDomain
  )
  const structureSummary =
    lang === 'ko'
      ? reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `지금 바로 다뤄야 할 축은 ${actionLabel}이고, 배경 구조축은 ${focusLabel}입니다. 상위 잠재 축은 ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}입니다.`
        : `중심축은 ${focusLabel}, 행동축은 ${actionLabel}이며 상위 잠재 축은 ${reportCore.latentTopAxes
            .slice(0, 3)
            .map((axis) => axis.label)
            .join(', ')}입니다.`
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
      ? `${actionLabel} 쪽 타이밍은 ${localizeReportFreeText(timingWindow?.window || 'unknown')} 구간으로 읽히며, ${localizeReportFreeText(timingWindow?.timingConflictNarrative || '구조와 촉발을 함께 봐야 합니다.')}`
      : `Timing for ${actionLabel} reads as ${timingWindow?.window || 'unknown'}, and ${timingWindow?.timingConflictNarrative || 'structure and trigger need to be read together.'}`
  const conflictSummary =
    lang === 'ko'
      ? localizeReportFreeText(reportCore.arbitrationBrief.conflictReasons[0]) ||
        `${focusLabel} 중심축과 ${actionLabel} 행동축이 분리돼 읽히는 구간입니다.`
      : reportCore.arbitrationBrief.conflictReasons[0] ||
        `${focusLabel} and ${actionLabel} currently separate into identity and action axes.`
  const evidenceSummary =
    lang === 'ko'
      ? `상위 신호 ${reportCore.topSignalIds.slice(0, 3).length}개와 핵심 패턴 ${reportCore.topPatternIds.slice(0, 2).length}개, 시나리오 ${reportCore.topScenarioIds.slice(0, 2).length}개가 이번 해석의 골격입니다.`
      : `Top signals ${reportCore.topSignalIds.slice(0, 3).join(', ')}, patterns ${reportCore.topPatternIds.slice(0, 2).join(', ')}, and scenarios ${reportCore.topScenarioIds.slice(0, 2).join(', ')} form the current spine.`
  return {
    focusDomain: reportCore.focusDomain,
    actionFocusDomain: reportCore.actionFocusDomain,
    arbitrationBrief: reportCore.arbitrationBrief,
    latentTopAxes: reportCore.latentTopAxes,
    projections: {
      structure: {
        headline: lang === 'ko' ? '구조 투영' : 'Structure Projection',
        summary: structureSummary,
        topAxes: reportCore.latentTopAxes.slice(0, 4).map((axis) => axis.label),
        detailLines: localizeProjectionList(reportCore.projections?.structure?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.structure?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.structure?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.structure?.nextMoves || []),
      },
      timing: {
        headline: lang === 'ko' ? '타이밍 투영' : 'Timing Projection',
        summary: timingSummary,
        window: timingWindow?.window,
        granularity: timingWindow?.timingGranularity,
        detailLines: localizeProjectionList(reportCore.projections?.timing?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.timing?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.timing?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.timing?.nextMoves || []),
      },
      conflict: {
        headline: lang === 'ko' ? '충돌 투영' : 'Conflict Projection',
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
        headline: lang === 'ko' ? '행동 투영' : 'Action Projection',
        summary:
          lang === 'ko'
            ? `${actionLabel} 축에서는 ${reportCore.topDecisionLabel || reportCore.topDecisionId || reportCore.primaryAction}이 실제 움직임의 중심입니다.`
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
        headline: lang === 'ko' ? '리스크 투영' : 'Risk Projection',
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
        headline: lang === 'ko' ? '근거 투영' : 'Evidence Projection',
        summary: evidenceSummary,
        detailLines: localizeProjectionList(reportCore.projections?.evidence?.detailLines || []),
        drivers: localizeProjectionList(reportCore.projections?.evidence?.drivers || []),
        counterweights: localizeProjectionList(reportCore.projections?.evidence?.counterweights || []),
        nextMoves: localizeProjectionList(reportCore.projections?.evidence?.nextMoves || []),
        reasons:
          lang === 'ko'
            ? [
                reportCore.topSignalIds.length
                  ? `핵심 신호 ${reportCore.topSignalIds.slice(0, 3).length}개가 동시에 작동 중입니다.`
                  : '',
                reportCore.topPatternIds.length
                  ? `상위 패턴 ${reportCore.topPatternIds.slice(0, 2).length}개가 같은 방향으로 겹칩니다.`
                  : '',
                reportCore.topScenarioIds.length
                  ? `대표 시나리오 ${reportCore.topScenarioIds.slice(0, 2).length}개가 현재 판단을 지지합니다.`
                  : '',
              ].filter(Boolean)
            : [
                ...reportCore.topSignalIds.slice(0, 2),
                ...reportCore.topPatternIds.slice(0, 1),
                ...reportCore.topScenarioIds.slice(0, 1),
              ].filter(Boolean),
      },
      branches: {
        headline: lang === 'ko' ? '분기 투영' : 'Branch Projection',
        summary:
          localizeReportFreeText(reportCore.projections?.branches?.summary) ||
          (lang === 'ko'
            ? '가능한 경로가 하나로 고정되기보다 여러 갈래로 열려 있습니다.'
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
    lang === 'ko' ? '현재 대운' : 'current 10-year cycle'
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
      ? `현재 ${age}세 전후의 핵심 장기 흐름은 ${current.startAge}-${current.endAge}세 대운(${currentLabel})입니다. 이 구간이 인생 전체의 큰 기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다.`
      : `${current.startAge}-${current.endAge}세 대운(${currentLabel})이 현재 장기 흐름의 중심입니다. 이 구간이 인생 전체의 큰 기후를 정하고, 세운·월운·일운은 그 위에서 실제 사건의 속도와 체감 강도를 조절합니다.`
  const prevLine = prev
    ? `${prev.startAge}-${prev.endAge}세 구간에서 굳어진 습관과 판단 기준이 지금 흐름의 출발점이 됩니다. 그래서 현재 대운은 새 기회를 여는 동시에, 예전 방식 중 무엇을 유지하고 무엇을 버릴지 다시 고르게 만듭니다.`
    : ''
  const nextLine = next
    ? `다음 ${next.startAge}-${next.endAge}세 대운(${next.ganji || next.element || '다음 장기 흐름'})으로 넘어가기 전까지는, 지금 구간에서 성과를 내는 방식과 다음 구간에 가져갈 기준을 구분해 두는 것이 중요합니다.`
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
      return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${signLabel} ${house}하우스에 놓여 있습니다`
    if (sign)
      return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${signLabel}에 놓여 있습니다`
    return `${planetLabel}${hasBatchim(planetLabel) ? '은' : '는'} ${house}하우스에 놓여 있습니다`
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
        ? `대운 ${input.currentDaeunElement}`
        : `Daeun ${getElementLabel(input.currentDaeunElement, lang)}`
      : '',
    input.currentSaeunElement
      ? lang === 'ko'
        ? `세운 ${input.currentSaeunElement}`
        : `annual cycle ${getElementLabel(input.currentSaeunElement, lang)}`
      : '',
    input.currentWolunElement
      ? lang === 'ko'
        ? `월운 ${input.currentWolunElement}`
        : `monthly cycle ${getElementLabel(input.currentWolunElement, lang)}`
      : '',
    input.currentIljinElement
      ? lang === 'ko'
        ? `일운 ${input.currentIljinElement}`
        : `daily cycle ${getElementLabel(input.currentIljinElement, lang)}`
      : '',
  ].filter(Boolean)
  if (lang === 'ko') {
    const agePart = age !== null ? `현재 ${age}세 전후` : '현재 구간'
    if (parts.length === 0)
      return `${agePart}는 타이밍 입력은 있으나 겹친 운의 이름이 약하게 포착된 상태입니다.`
    const normalizedParts = parts.map((part) => {
      const [cycle, element] = part.split(' ')
      if (!cycle || !element) return part
      return `${withSubjectParticle(`${cycle} ${element}`)}`
    })
    return `${agePart}는 ${normalizedParts.join(', ')} 겹쳐 작동하는 구간입니다. 큰 기후는 대운이 만들고, 세운과 월운이 실제 체감 강도를 조절합니다.`
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
        ? '현재 흐름'
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

  const agePrefix = age !== null ? `현재 ${age}세 전후는 ` : '지금은 '
  const cycleLabel =
    current !== null
      ? `${current.startAge}-${current.endAge}세 대운(${currentLabel})`
      : currentLabel
  switch (focus) {
    case 'career':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 커리어 판단에서도 새 확장보다 역할·우선순위 정리가 먼저입니다.`
    case 'wealth':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 재정 판단에서는 수익 기대보다 조건 검토와 손실 상한 관리가 먼저입니다.`
    case 'health':
      return `${agePrefix}${cycleLabel} 흐름 안에 있어 건강 관리에서는 강한 가속보다 회복 리듬을 먼저 세우는 편이 맞습니다.`
    case 'lifeMission':
      return `${agePrefix}${cycleLabel} 흐름은 다음 장기 구간까지 가져갈 기준을 정리하고 반복 가능한 원칙을 남기는 데 의미가 큽니다.`
    case 'actionPlan':
      return `${agePrefix}${cycleLabel} 흐름에서는 실행을 착수-재확인-확정으로 나눌수록 결과 재현성이 올라갑니다.`
    case 'conclusion':
      return `${agePrefix}${cycleLabel} 흐름의 결론은 성급한 확정보다 기준 정리와 순서 설계가 더 큰 차이를 만든다는 점입니다.`
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
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    if (parts.length === 0)
      return '원국에서는 기본 구조보다 현재 활성 흐름과 실행 순서를 함께 보는 편이 맞습니다.'
    return `원국 기준으로는 ${parts.join(', ')} 흐름이 현재 판단의 바탕을 만듭니다.`
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
      allowed ? `지금 허용되는 움직임은 ${allowed} 쪽입니다.` : '',
      blocked ? `반대로 ${blocked}는 지금 무리하게 밀지 않는 편이 맞습니다.` : '',
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
  if (/[.!?]|[다요]\s*$|하세요\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}에 힘을 두는 편이 맞습니다.` : `Lean into ${value}.`
}

function buildPrimaryCautionLead(
  caution: string | undefined | null,
  fallback: string,
  lang: 'ko' | 'en'
): string {
  const value = buildReportCoreLine(caution, lang)
  if (!value) return fallback
  if (/[.!?]|[다요]\s*$|하세요\s*$/.test(value)) return value
  return lang === 'ko' ? `${value}은 먼저 막는 편이 맞습니다.` : `Block ${value} first.`
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
    [/promotion_review/i, '승진/역할 재검토', 'promotion or role review'],
    [/contract_negotiation/i, '조건 협의', 'contract negotiation'],
    [/manager_track/i, '관리 책임 확장', 'management-track expansion'],
    [/specialist_track/i, '전문성 심화', 'specialist-track deepening'],
    [/entry/i, '새 역할 진입', 'entry into a new role'],
    [/distance_tuning/i, '관계 거리 조정', 'distance tuning'],
    [/boundary_reset/i, '경계 재설정', 'boundary reset'],
    [/commitment_preparation/i, '관계 정의 준비', 'commitment preparation'],
    [/clarify_expectations/i, '기대치 명확화', 'expectation clarification'],
    [/commitment_execution/i, '관계 확정 실행', 'commitment execution'],
    [/cohabitation/i, '생활 결합 점검', 'cohabitation planning'],
    [/family_acceptance/i, '가족 수용 절차', 'family acceptance'],
    [/separation/i, '관계 분리 정리', 'relationship separation'],
    [/capital_allocation/i, '자금 배분 재검토', 'capital allocation review'],
    [/asset_exit/i, '자산 정리', 'asset exit'],
    [/debt_restructure/i, '부채 구조 재정리', 'debt restructuring'],
    [/income_growth/i, '수입 확장', 'income growth'],
    [/liquidity_defense/i, '유동성 방어', 'liquidity defense'],
    [/recovery_reset/i, '회복 리듬 재설정', 'recovery reset'],
    [/routine_lock/i, '루틴 고정', 'routine lock'],
    [/burnout_trigger/i, '번아웃 경고', 'burnout risk'],
    [/sleep_disruption/i, '수면 리듬 흔들림', 'sleep disruption'],
    [/commute_restructure/i, '동선 재설계', 'commute restructure'],
    [/route_recheck/i, '경로 재확인', 'route recheck'],
    [/basecamp_reset/i, '생활 거점 재정비', 'basecamp reset'],
    [/lease_decision/i, '계약 조건 검토', 'lease decision review'],
    [/housing_search/i, '거주 후보지 탐색', 'housing search'],
    [/relocation/i, '이동 결정', 'relocation'],
    [/learning_acceleration/i, '학습/역량 가속', 'learning acceleration'],
    [/deep_partnership_activation/i, '관계 심화 국면', 'deep partnership activation'],
    [/timing_upside/i, '상승 타이밍 집중', 'timing upside cluster'],
    [/timing_risk/i, '타이밍 변동 경계', 'timing risk cluster'],
    [/health_risk/i, '건강 경계 국면', 'health risk cluster'],
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
    목: 'wood',
    木: 'wood',
    fire: 'fire',
    화: 'fire',
    火: 'fire',
    earth: 'earth',
    토: 'earth',
    土: 'earth',
    metal: 'metal',
    금: 'metal',
    金: 'metal',
    water: 'water',
    수: 'water',
    水: 'water',
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
            archetype: '잡음을 잘라내는 칼날',
            environment: '복잡한 판에서 군더더기를 걷어내는 장면',
            edge: '정리와 절단력',
            risk: '지나치게 빨리 결론을 내릴 때 날이 무뎌지는 것',
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
            archetype: '판을 넓히며 자라는 큰 나무',
            environment: '가지가 퍼지듯 영향권을 넓히는 장면',
            edge: '확장과 성장력',
            risk: '뿌리 정리 없이 가지부터 늘리는 것',
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
            archetype: '빈틈을 찾아 흐르는 물길',
            environment: '막힌 곳 사이로 길을 만들어내는 장면',
            edge: '유연한 침투력',
            risk: '방향 없이 흘러 판단이 번지는 것',
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
            archetype: '순간에 판을 밝히는 불빛',
            environment: '모두가 망설일 때 장면을 선명하게 드러내는 순간',
            edge: '가시성과 추진력',
            risk: '열이 너무 빨라 번아웃으로 꺼지는 것',
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
            archetype: '흔들리는 판을 붙잡는 축대',
            environment: '무너질 장면을 버티게 만드는 버팀목',
            edge: '지속력과 구조',
            risk: '움직일 타이밍까지 지나치게 늦추는 것',
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
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0
      ? `${parts.join(', ')} 흐름이 같은 방향을 밀고 있기 때문에 이런 해석이 나옵니다.`
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
      dayMaster ? `일간 ${dayMaster}` : '',
      geokguk ? `격국 ${geokguk}` : '',
      yongsin ? `용신 ${yongsin}` : '',
      western ? `서양 원소 ${western}` : '',
    ].filter(Boolean)
    return parts.length > 0 ? `핵심 근거는 ${parts.join(', ')}입니다.` : ''
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
        ? `이번 질문에 바로 닿는 축은 ${actionLabel}이며, 실제 행동 압력도 이 축이 더 직접 끌고 갑니다.`
        : focusRunnerUpLabel
          ? `${focusLabel} 축이 ${focusRunnerUpLabel}보다 앞서 이번 중심 판단으로 채택됐습니다.`
          : ''
      : reportCore.actionFocusDomain && reportCore.actionFocusDomain !== reportCore.focusDomain
        ? `${actionLabel} is the axis that answers the question most directly, and it is carrying the actionable pressure in this phase.`
        : focusRunnerUpLabel
          ? `${focusLabel} stayed ahead of ${focusRunnerUpLabel} as the lead axis in this phase.`
          : ''
  const latentLine = reportCore.latentTopAxes?.length
    ? lang === 'ko'
      ? `지금 판을 가장 세게 미는 층은 ${reportCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}입니다.`
      : `The strongest active layers right now are ${reportCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}.`
      : ''
  const riskAxisLine =
    reportCore.riskAxisLabel
      ? lang === 'ko'
        ? `동시에 가장 예민한 리스크 축은 ${reportCore.riskAxisLabel}입니다.`
        : `At the same time, the most sensitive risk axis is ${reportCore.riskAxisLabel}.`
      : ''
  const timingMatrixLine =
    reportCore.timingMatrix?.length
      ? lang === 'ko'
        ? `도메인별로는 ${reportCore.timingMatrix
            .slice(0, 3)
            .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
            .join(', ')} 순으로 창이 갈립니다.`
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
        ? `${focusLabel} 축은 이번 판단의 배경 구조로 남아 있습니다.`
        : `${focusLabel} remains the background structural axis behind this reading.`
      : ''
  const structureDriversLine =
    structureProjection?.drivers?.length
      ? lang === 'ko'
        ? `구조를 받치는 직접 축은 ${structureProjection.drivers
            .slice(0, 3)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')}입니다.`
        : `The direct structural drivers are ${structureProjection.drivers.slice(0, 3).join(', ')}.`
      : ''
  const structureCounterweightLine =
    reportCore.arbitrationBrief?.suppressionNarratives?.length || structureProjection?.counterweights?.length
      ? lang === 'ko'
        ? `다만 ${(reportCore.arbitrationBrief?.suppressionNarratives?.length
            ? reportCore.arbitrationBrief.suppressionNarratives
            : structureProjection?.counterweights || [])
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(' 또한 ')} 같은 보조 압력이 함께 걸립니다.`
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
        ? `지금 창을 직접 밀고 있는 축은 ${timingProjection.drivers
            .slice(0, 3)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')}입니다.`
        : `The live timing drivers are ${timingProjection.drivers.slice(0, 3).join(', ')}.`
      : ''
  const timingCounterweightLine =
    timingProjection?.counterweights?.length
      ? lang === 'ko'
        ? `반대로 ${timingProjection.counterweights
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')} 같은 조건은 속도를 늦추는 신호로 같이 읽어야 합니다.`
        : `Counterweights still come from ${timingProjection.counterweights.slice(0, 2).join(', ')}.`
      : ''
  const timingNextLine =
    timingProjection?.nextMoves?.length
      ? buildProjectionMoveSentence(
          timingProjection.nextMoves.slice(0, 2),
          lang,
          lang === 'ko'
            ? '지금 타이밍을 살리려면 실행 조건을 다시 작게 맞춰 보는 편이 맞습니다.'
            : 'To use this timing well, realign the live execution conditions first.'
        )
      : ''
  const timingMatrixLine =
    reportCore.timingMatrix?.length
      ? lang === 'ko'
        ? `도메인별 창을 같이 보면 ${reportCore.timingMatrix
            .slice(0, 3)
            .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
            .join(', ')} 흐름으로 갈립니다.`
        : `Across domains, timing splits into ${reportCore.timingMatrix
            .slice(0, 3)
            .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
            .join(', ')}.`
      : ''
  const branchProjection = reportCore.projections?.branches
  const branchTimingLine =
    localizeReportNarrativeText(branchProjection?.detailLines?.[0] || '', lang) ||
    (branchProjection?.summary && lang === 'ko'
      ? `지금은 가능한 경로를 한 갈래로 고정하기보다 ${localizeReportNarrativeText(branchProjection.summary, lang)}`
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
      ? `이번 ${actionLabel} 실행 기준은 ${topDecisionLabel}입니다.`
      : `The operating rule on the ${actionLabel} axis is ${topDecisionLabel}.`
  const guardrailLine = reportCore.riskControl
  const actionProjection = reportCore.projections?.action
  const actionDriverLabels = collectProjectionDriverLabels(actionProjection?.drivers, lang)
  const actionDriverLine =
    actionDriverLabels.length
      ? lang === 'ko'
        ? `지금 실행을 받치는 층은 ${actionDriverLabels.join(', ')}입니다.`
        : `The current execution drivers are ${actionDriverLabels.join(', ')}.`
      : ''
  const actionCounterweightLine =
    actionProjection?.counterweights?.length
      ? lang === 'ko'
        ? `${actionProjection.counterweights
            .slice(0, 2)
            .map((item) => localizeReportNarrativeText(item, lang))
            .join(', ')} 같은 제약은 속도를 늦추라는 신호로 같이 읽어야 합니다.`
        : `${actionProjection.counterweights.slice(0, 2).join(', ')} still signal that pace should stay controlled.`
      : ''
  const actionNextLine =
    actionProjection?.nextMoves?.length
      ? buildProjectionMoveSentence(
          actionProjection.nextMoves.slice(0, 2),
          lang,
          lang === 'ko'
            ? '다음 움직임은 실행 기준을 작은 단위로 다시 고정하는 데서 시작하는 편이 맞습니다.'
            : 'The next move should begin by resetting execution criteria in smaller steps.'
        )
      : ''
  const riskAxisLine =
    reportCore.riskAxisLabel
      ? lang === 'ko'
        ? `실행을 밀더라도 ${reportCore.riskAxisLabel} 축을 먼저 리스크 축으로 관리해야 합니다.`
        : `Even while acting, ${reportCore.riskAxisLabel} should be managed as the primary risk axis first.`
      : ''
  const branchProjection = reportCore.projections?.branches
  const branchActionLine =
    branchProjection?.nextMoves?.length
      ? buildProjectionMoveSentence(
          branchProjection.nextMoves.slice(0, 2),
          lang,
          lang === 'ko'
            ? '열려 있는 분기에서는 실행 전에 기준과 경계부터 다시 고정하는 편이 맞습니다.'
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
        ? `마지막까지 가장 민감하게 관리해야 할 축은 ${reportCore.riskAxisLabel}입니다.`
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
      (item) =>
        !/(하세요|하십시오|합니다\.|입니다\.|거치세요|가세요|맞추세요|고정하세요|잠그세요|확보하세요|정리하세요)$/u.test(
          item
        )
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
      ? '지금 창을 살리려면 먼저 실행 조건을 작은 단위로 다시 맞추는 편이 좋습니다.'
      : 'To use this window well, realign the live execution conditions first.'
  )
  const actionMoveLine = buildProjectionMoveSentence(
    actionNextMoves,
    lang,
    lang === 'ko'
      ? '다음 움직임은 작은 단위로 실행 기준을 다시 고정하는 데서 시작하는 편이 맞습니다.'
      : 'The next move should begin by resetting execution criteria in smaller steps.'
  )
  const timingMatrixLead = reportCore.timingMatrix?.length
    ? lang === 'ko'
      ? `지금 창은 ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')} 순으로 다르게 열립니다.`
      : `The active windows split by domain as ${reportCore.timingMatrix
          .slice(0, 3)
          .map((row) => `${getReportDomainLabel(row.domain, lang)}=${row.window}`)
          .join(', ')}.`
    : ''
  const riskAxisLead = reportCore.riskAxisLabel
    ? lang === 'ko'
      ? `이번 테마에서 가장 예민한 리스크 축은 ${reportCore.riskAxisLabel}입니다.`
      : `The most sensitive risk axis in this theme is ${reportCore.riskAxisLabel}.`
    : ''
  const timelineNarrative = buildPersonalLifeTimelineNarrative(matrixInput, undefined, lang)
  const timingGuardrail = focusTiming
    ? buildTimingWindowNarrative(reportCore.actionFocusDomain || reportCore.focusDomain, focusTiming, lang)
    : ''
  const themeAngle =
    theme === 'love'
      ? lang === 'ko'
        ? '관계 테마는 감정 강도보다 해석 일치와 속도 조율이 실제 성패를 가릅니다.'
        : 'The relationship theme turns more on aligned interpretation and pace than on intensity alone.'
      : theme === 'career'
        ? lang === 'ko'
          ? '커리어 테마는 기회를 넓게 잡는 것보다 역할과 평가 기준을 먼저 고정하는 쪽이 강합니다.'
          : 'The career theme strengthens when role and evaluation criteria are fixed before expansion.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '재정 테마는 수익 기대보다 손실 상한과 회수 조건을 먼저 정할 때 오래 갑니다.'
            : 'The wealth theme lasts longer when downside limits and exit conditions are set before upside.'
          : theme === 'health'
            ? lang === 'ko'
              ? '건강 테마는 버티는 힘보다 과부하를 빨리 끊는 운영 습관에서 차이가 납니다.'
              : 'The health theme separates more by interrupting overload early than by endurance.'
            : lang === 'ko'
              ? '가족 테마는 감정보다 역할, 비용, 돌봄 분담을 보이는 언어로 맞출 때 안정됩니다.'
              : 'The family theme stabilizes when roles, cost, and care are made explicit.'
  const themeActionLine =
    theme === 'love'
      ? lang === 'ko'
        ? '관계를 서두르기보다 기대치와 생활 조건을 먼저 맞추는 편이 맞습니다.'
        : 'Do not rush the relationship; align expectations and living conditions first.'
      : theme === 'career'
        ? lang === 'ko'
          ? '성과를 늘리기보다 책임 범위와 검토 지점을 먼저 고정하세요.'
          : 'Before increasing output, lock responsibility boundaries and review points.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '확장을 서두르기보다 금액, 기한, 취소 조건을 먼저 고정하세요.'
            : 'Before expanding, lock amount, timing, and exit conditions.'
          : theme === 'health'
            ? lang === 'ko'
              ? '강도를 올리기보다 회복 블록과 일정 완충부터 확보하세요.'
              : 'Before increasing intensity, secure recovery blocks and schedule buffers.'
            : lang === 'ko'
              ? '결론을 밀기보다 역할과 해석 일치부터 확인하세요.'
              : 'Before pushing conclusions, align roles and interpretations first.'
  const actionOpeningLine =
    lang === 'ko'
      ? `이번 ${actionLabel} 실행 기준은 ${reportCore.topDecisionLabel || reportCore.primaryAction}입니다.`
      : `The operating rule on the ${actionLabel} axis is ${reportCore.topDecisionLabel || reportCore.primaryAction}.`
  const themeRiskLine =
    theme === 'love'
      ? lang === 'ko'
        ? '감정이 앞서도 생활 운영이 맞지 않으면 빠른 확정이 오히려 갈등 비용을 키울 수 있습니다.'
        : 'Even with strong feeling, quick commitment can increase conflict cost when daily fit is weak.'
      : theme === 'career'
        ? lang === 'ko'
          ? '속도는 성과처럼 보여도 기준 없는 확장은 바로 재작업 비용으로 돌아올 수 있습니다.'
          : 'Speed can look like progress, but expansion without criteria often returns as rework cost.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '문서화되지 않은 이점은 쉽게 손실로 뒤집히므로 수익보다 보호 장치를 먼저 세워야 합니다.'
            : 'Undocumented upside flips into loss easily, so protection must come before profit.'
          : theme === 'health'
            ? lang === 'ko'
              ? '회복이 밀린 상태에서 버티기로 버티면 다음 구간의 비용이 더 커질 수 있습니다.'
              : 'When recovery is deferred, endurance often increases the cost of the next window.'
            : lang === 'ko'
              ? '보이지 않는 역할 불균형을 오래 끌면 가까운 관계일수록 피로와 억울함이 크게 남습니다.'
              : 'Unspoken role imbalance leaves more fatigue and resentment the longer it stays implicit.'

  const themeStructureLine =
    theme === 'love'
      ? lang === 'ko'
        ? '이 관계 테마는 감정 표현보다 생활 리듬과 기대치 조율이 구조를 만듭니다.'
        : 'This relationship theme is structured more by daily rhythm and expectation alignment than by expression alone.'
      : theme === 'career'
        ? lang === 'ko'
          ? '이 커리어 테마는 재능보다 역할 정의와 평가 기준의 선명도가 구조를 만듭니다.'
          : 'This career theme is structured more by role clarity and evaluation criteria than by talent alone.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '이 재정 테마는 수익률보다 누수 통제와 회수 규칙이 구조를 만듭니다.'
            : 'This wealth theme is structured more by leakage control and recovery rules than by return rate alone.'
          : theme === 'health'
            ? lang === 'ko'
              ? '이 건강 테마는 의지보다 회복 리듬과 과부하 차단이 구조를 만듭니다.'
              : 'This health theme is structured more by recovery rhythm and overload interruption than by willpower.'
            : lang === 'ko'
              ? '이 가족 테마는 감정보다 역할 분담과 해석 일치가 구조를 만듭니다.'
              : 'This family theme is structured more by role distribution and aligned interpretation than by emotion alone.'

  const themeWindowLine =
    theme === 'love'
      ? lang === 'ko'
        ? '강한 창이 와도 감정 확인보다 생활 조건과 관계 속도를 먼저 맞출 때 성사 가능성이 커집니다.'
        : 'Even when the window opens, probability improves when living conditions and relationship pace are aligned first.'
      : theme === 'career'
        ? lang === 'ko'
          ? '강한 창은 확장 자체보다 역할과 검토 지점을 문서로 고정할 때 더 선명하게 살아납니다.'
          : 'The stronger window shows up more clearly when role and review points are fixed in writing before expansion.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '강한 창은 기대 수익을 키우는 순간보다 조건과 손실 상한을 잠글 때 더 유효합니다.'
            : 'The stronger window is more reliable when downside limits are locked before upside is chased.'
          : theme === 'health'
            ? lang === 'ko'
              ? '강한 창은 버티는 때가 아니라 회복 블록을 되찾고 과부하를 끊는 때에 더 잘 열립니다.'
              : 'The stronger window opens less in endurance and more in reclaiming recovery blocks and cutting overload.'
            : lang === 'ko'
              ? '강한 창은 결론을 재촉하는 때보다 역할과 비용을 다시 맞추는 때에 더 잘 열립니다.'
              : 'The stronger window opens less in forced conclusions and more in realigning roles and cost.'

  const themeBranchLine =
    theme === 'love'
      ? lang === 'ko'
        ? branchDetail || '이 관계 테마는 한 번의 확정으로 닫히기보다 몇 갈래 현실 경로가 같이 열려 움직입니다.'
        : branchDetail || 'This relationship theme moves through multiple live branches rather than one fixed commitment path.'
      : theme === 'career'
        ? lang === 'ko'
          ? branchDetail || '이 커리어 테마는 확정과 보류, 재협상 경로가 동시에 열려 있어 조건 차이가 결과를 가릅니다.'
          : branchDetail || 'This career theme keeps commit, defer, and renegotiation paths open at the same time.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? branchDetail || '이 재정 테마는 확대와 방어, 재조정 경로가 같이 살아 있어 조건 관리가 핵심입니다.'
            : branchDetail || 'This wealth theme keeps expansion, defense, and reset paths alive together.'
          : theme === 'health'
            ? lang === 'ko'
              ? branchDetail || '이 건강 테마는 회복과 과부하가 동시에 경쟁해 일상 리듬 조정이 결과를 가릅니다.'
              : branchDetail || 'This health theme keeps recovery and overload competing at the same time.'
            : lang === 'ko'
              ? branchDetail || '이 가족 테마는 감정선보다 역할과 비용 재조정 경로가 같이 열려 있습니다.'
              : branchDetail || 'This family theme keeps multiple role and cost realignment paths open.'

  const deepStructureLine =
    theme === 'love'
      ? lang === 'ko'
        ? '이 테마에서는 끌림보다 생활 리듬과 기대치가 맞는지가 관계의 뼈대를 만듭니다.'
        : 'Here the relationship is built less by attraction and more by aligned rhythm and expectations.'
      : theme === 'career'
        ? lang === 'ko'
          ? '이 테마에서는 능력보다 역할 정의와 평가 기준이 커리어의 뼈대를 만듭니다.'
          : 'Here the career frame is built less by talent and more by role definition and evaluation criteria.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '이 테마에서는 수익률보다 누수 통제와 회수 규칙이 재정의 뼈대를 만듭니다.'
            : 'Here the financial frame is built less by return rate and more by leakage control and recovery rules.'
          : theme === 'health'
            ? lang === 'ko'
              ? '이 테마에서는 의지보다 회복 리듬과 과부하 차단이 건강의 뼈대를 만듭니다.'
              : 'Here the health frame is built less by willpower and more by recovery rhythm and overload control.'
            : lang === 'ko'
              ? '이 테마에서는 감정보다 역할 분담과 해석 일치가 가족 흐름의 뼈대를 만듭니다.'
              : 'Here the family frame is built less by emotion and more by role distribution and aligned interpretation.'

  const patternPressureLine =
    theme === 'love'
      ? lang === 'ko'
        ? `핵심 패턴은 관계를 빠르게 정하는 힘보다 속도와 경계를 다시 맞추는 압력이 더 크다는 점입니다.`
        : `The active pattern favors pace and boundary alignment over rushing the bond into definition.`
      : theme === 'career'
        ? lang === 'ko'
          ? `핵심 패턴은 일을 넓히는 힘보다 역할과 검토 기준을 좁히는 압력이 더 크다는 점입니다.`
          : `The active pattern favors narrowing role and review criteria over widening the workload.`
        : theme === 'wealth'
          ? lang === 'ko'
            ? `핵심 패턴은 공격적 확장보다 손실 상한과 회수 조건을 먼저 잠그는 압력이 더 크다는 점입니다.`
            : `The active pattern favors locking downside and recovery conditions before aggressive expansion.`
          : theme === 'health'
            ? lang === 'ko'
              ? `핵심 패턴은 버티는 힘보다 과부하를 빨리 끊고 회복 블록을 확보하는 압력이 더 크다는 점입니다.`
              : `The active pattern favors cutting overload and securing recovery blocks over simple endurance.`
            : lang === 'ko'
              ? `핵심 패턴은 감정 표현보다 역할, 비용, 돌봄 분담을 다시 맞추는 압력이 더 크다는 점입니다.`
              : `The active pattern favors realigning role, cost, and care distribution over emotional insistence.`

  const timingReadLine =
    theme === 'love'
      ? lang === 'ko'
        ? '세부 날짜를 좇기보다 관계 속도와 생활 조건이 맞는 구간을 먼저 찾는 편이 오차를 줄입니다.'
        : 'Error stays lower when the read is tied to pace-fit windows instead of exact dates.'
      : theme === 'career'
        ? lang === 'ko'
          ? '세부 날짜보다 역할과 검토 지점을 문서로 고정할 수 있는 구간을 찾는 편이 더 정확합니다.'
          : 'This reads more accurately by finding windows that allow role and review points to be fixed in writing.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '세부 날짜보다 조건과 손실 상한을 잠글 수 있는 구간을 찾는 편이 더 정확합니다.'
            : 'This reads more accurately by finding windows where conditions and downside limits can be locked.'
          : theme === 'health'
            ? lang === 'ko'
              ? '세부 날짜보다 회복 블록을 되찾고 과부하를 줄일 수 있는 구간을 찾는 편이 더 정확합니다.'
              : 'This reads more accurately by finding windows that restore recovery blocks and reduce overload.'
            : lang === 'ko'
              ? '세부 날짜보다 역할과 비용을 다시 맞출 수 있는 구간을 찾는 편이 더 정확합니다.'
              : 'This reads more accurately by finding windows where roles and cost can be realigned.'

  const recommendationCloseLine =
    theme === 'love'
      ? lang === 'ko'
        ? '감정 확인은 그 다음 문제이고, 지금은 속도와 생활 조건을 먼저 맞춰야 합니다.'
        : 'Emotional confirmation comes after pace and living fit are aligned.'
      : theme === 'career'
        ? lang === 'ko'
          ? '성과 압박은 뒤로 미루고, 지금은 책임 범위와 검토 지점을 먼저 잠가야 합니다.'
          : 'Push output pressure back; first lock responsibility boundaries and review points.'
        : theme === 'wealth'
          ? lang === 'ko'
            ? '수익 기대는 뒤로 미루고, 지금은 금액과 기한, 빠져나올 문부터 잠가야 합니다.'
            : 'Defer upside expectation; first lock amount, timing, and the exit door.'
          : theme === 'health'
            ? lang === 'ko'
              ? '강도 증가는 뒤로 미루고, 지금은 회복 블록과 일정 완충부터 확보해야 합니다.'
              : 'Delay intensity gains; first secure recovery blocks and schedule buffers.'
            : lang === 'ko'
              ? '결론은 뒤로 미루고, 지금은 역할과 해석 일치부터 확보해야 합니다.'
              : 'Delay conclusions; first secure aligned roles and interpretation.'

  const actionRhythmLine =
    theme === 'love'
      ? lang === 'ko'
        ? `지금은 ${actionLabel} 축에서도 감정 확정보다 확인-조율-공식화 순서가 더 안전합니다.`
        : `Even on the ${actionLabel} axis, confirm-align-formalize is safer than immediate emotional commitment.`
      : theme === 'career'
        ? lang === 'ko'
          ? `지금은 ${actionLabel} 축에서도 착수-검토-확정 순서가 확장보다 더 중요합니다.`
          : `Even on the ${actionLabel} axis, start-review-commit matters more than expansion itself.`
        : theme === 'wealth'
          ? lang === 'ko'
            ? `지금은 ${actionLabel} 축에서도 조건 확인-손실 제한-확정 순서가 더 중요합니다.`
            : `Even on the ${actionLabel} axis, condition check-downside control-commit matters more than speed.`
          : theme === 'health'
            ? lang === 'ko'
              ? `지금은 ${actionLabel} 축에서도 강도 상승보다 회복 확보-부하 감축-재개 순서가 더 중요합니다.`
              : `Even on the ${actionLabel} axis, recovery-load reduction-resume matters more than pushing intensity.`
            : lang === 'ko'
              ? `지금은 ${actionLabel} 축에서도 결론보다 역할 정리-비용 확인-합의 순서가 더 중요합니다.`
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
                ? `이번 관계 해석을 직접 밀어주는 축은 ${structureDrivers.join(', ')}입니다.`
                : `The relationship read is being driven directly by ${structureDrivers.join(', ')}.`
              : '',
            lang === 'ko'
              ? '이 사랑 테마는 감정의 세기보다 관계를 운영하는 생활 리듬이 맞는지에서 갈립니다.'
              : 'This love theme turns more on relational operating rhythm than on emotional intensity alone.',
          ]),
          patterns: joinNarrativeParts([
            relationshipAdvisory?.caution,
            conflictDetail,
            patternPressureLine,
            lang === 'ko'
              ? '마음이 앞서도 현실 조건이 늦게 따라오면 관계는 쉽게 과열됐다가 식을 수 있습니다.'
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
                ? `관계 창을 미는 축은 ${timingDrivers.join(', ')}입니다.`
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
                  ? `특히 ${riskCounterweights.join(', ')} 같은 제약은 먼저 줄여야 합니다.`
                  : `Counterweights like ${riskCounterweights.join(', ')} should be reduced first.`
                : '',
              lang === 'ko'
                ? '감정 확인과 관계 공식화는 같은 호흡으로 처리하지 않는 편이 안전합니다.'
                : 'Do not treat emotional confirmation and formal commitment as the same move.',
            ]),
            joinNarrativeParts([
              conflictSummary,
              lang === 'ko'
                ? '서로 다른 속도가 보이면 더 빠른 쪽을 누르고 같은 속도를 먼저 만드는 편이 맞습니다.'
                : 'When pace diverges, slow the faster side first and build a shared rhythm.',
            ]),
          ].filter(Boolean),
          actionPlan: joinNarrativeParts([
            actionOpeningLine,
            actionMoveLine,
            actionRhythmLine,
            lang === 'ko'
              ? '핵심은 감정을 더 크게 표현하는 것보다 속도와 경계를 먼저 맞추는 데 있습니다.'
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
                  ? `이번 커리어 해석을 직접 받치는 축은 ${structureDrivers.join(', ')}입니다.`
                  : `The career read is being driven directly by ${structureDrivers.join(', ')}.`
                : '',
              lang === 'ko'
                ? '이 커리어 테마는 많이 하는 사람보다 기준을 먼저 세우는 사람이 오래 가져갑니다.'
                : 'This career theme favors the person who fixes standards first, not the one who simply does more.',
            ]),
            patterns: joinNarrativeParts([
              careerAdvisory?.caution,
              conflictDetail,
              patternPressureLine,
              lang === 'ko'
                ? '능력보다 역할 정의가 흐릴 때 재작업과 소모가 커지는 패턴이 반복되기 쉽습니다.'
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
                  ? `커리어 창을 미는 축은 ${timingDrivers.join(', ')}입니다.`
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
                    ? `특히 ${riskCounterweights.join(', ')} 같은 제약은 역할보다 먼저 정리해야 합니다.`
                    : `Counterweights like ${riskCounterweights.join(', ')} should be cleared before expansion.`
                  : '',
                lang === 'ko'
                  ? '실행과 검토를 같은 호흡으로 밀면 성과보다 재작업이 먼저 쌓일 수 있습니다.'
                  : 'If execution and review are forced into one move, rework builds faster than results.',
              ]),
              joinNarrativeParts([
                conflictSummary,
                lang === 'ko'
                  ? '여러 일감이 경쟁하면 더 큰 일보다 기준이 분명한 일 하나를 먼저 고르는 편이 맞습니다.'
                  : 'When tasks compete, choose the one with the clearest criteria before the larger one.',
              ]),
            ].filter(Boolean),
            actionPlan: joinNarrativeParts([
            actionOpeningLine,
            actionMoveLine,
              actionRhythmLine,
              lang === 'ko'
                ? '핵심은 더 많은 일을 잡는 것보다 역할, 기준, 책임을 먼저 고정하는 데 있습니다.'
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
                    ? `이번 재정 해석을 직접 받치는 축은 ${structureDrivers.join(', ')}입니다.`
                    : `The wealth read is being driven directly by ${structureDrivers.join(', ')}.`
                  : '',
                lang === 'ko'
                  ? '이 재정 테마는 크게 버는 사람보다 손실을 먼저 잠그는 사람이 오래 앞섭니다.'
                  : 'This wealth theme rewards the person who locks downside first, not the one who chases upside hardest.',
              ]),
              patterns: joinNarrativeParts([
                wealthAdvisory?.caution,
                conflictDetail,
                patternPressureLine,
                lang === 'ko'
                  ? '조건이 문서화되지 않은 이점은 쉽게 누수로 바뀌어 수익보다 피로를 먼저 남길 수 있습니다.'
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
                    ? `재정 창을 미는 축은 ${timingDrivers.join(', ')}입니다.`
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
                      ? `특히 ${riskCounterweights.join(', ')} 같은 제약은 수익 논의보다 먼저 줄여야 합니다.`
                      : `Counterweights like ${riskCounterweights.join(', ')} should be reduced before upside is discussed.`
                    : '',
                  lang === 'ko'
                    ? '확장과 확정이 한 번에 붙으면 수익보다 손실 복구 비용이 더 빨리 커질 수 있습니다.'
                    : 'If expansion and commitment happen in one move, recovery cost can grow faster than return.',
                ]),
                joinNarrativeParts([
                  conflictSummary,
                  lang === 'ko'
                    ? '여러 수입 흐름이 경쟁하면 더 커 보이는 제안보다 회수 규칙이 선명한 흐름을 먼저 택하세요.'
                    : 'When revenue paths compete, choose the one with the clearest recovery rules before the bigger-looking one.',
                ]),
              ].filter(Boolean),
              actionPlan: joinNarrativeParts([
                actionOpeningLine,
                actionMoveLine,
                actionRhythmLine,
                lang === 'ko'
                  ? '핵심은 기대 수익을 키우는 것보다 손실 상한과 회수 조건을 먼저 잠그는 데 있습니다.'
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
                      ? `이번 건강 해석을 직접 받치는 축은 ${structureDrivers.join(', ')}입니다.`
                      : `The health read is being driven directly by ${structureDrivers.join(', ')}.`
                    : '',
                  lang === 'ko'
                    ? '이 건강 테마는 강하게 버티는 사람보다 과부하를 빨리 끊는 사람이 오래 버팁니다.'
                    : 'This health theme favors the person who interrupts overload early, not the one who simply endures harder.',
                ]),
                patterns: joinNarrativeParts([
                  healthAdvisory?.caution,
                  conflictDetail,
                  patternPressureLine,
                  lang === 'ko'
                    ? '피로와 일정 압력이 겹치면 의지보다 회복 리듬 붕괴가 먼저 누적되기 쉽습니다.'
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
                      ? `건강 창을 미는 축은 ${timingDrivers.join(', ')}입니다.`
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
                        ? `특히 ${riskCounterweights.join(', ')} 같은 제약은 체력보다 일정에서 먼저 줄여야 합니다.`
                        : `Counterweights like ${riskCounterweights.join(', ')} should be reduced in the schedule before intensity is raised.`
                      : '',
                    lang === 'ko'
                      ? '무리한 회복 계획은 오래 가지 않으니 작아도 반복 가능한 리듬부터 남겨야 합니다.'
                      : 'Recovery plans that are too intense do not last; keep the smallest repeatable rhythm first.',
                  ]),
                  joinNarrativeParts([
                    conflictSummary,
                    lang === 'ko'
                      ? '회복과 성과가 경쟁하면 이번 구간은 성과보다 회복을 먼저 선택하는 편이 맞습니다.'
                      : 'When recovery competes with output, this phase should choose recovery first.',
                  ]),
                ].filter(Boolean),
                actionPlan: joinNarrativeParts([
                  actionOpeningLine,
                  actionMoveLine,
                  actionRhythmLine,
                  lang === 'ko'
                    ? '핵심은 더 버티는 것이 아니라 회복 블록과 일정 완충을 먼저 되찾는 데 있습니다.'
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
                      ? `이번 가족 해석을 직접 받치는 축은 ${structureDrivers.join(', ')}입니다.`
                      : `The family read is being driven directly by ${structureDrivers.join(', ')}.`
                    : '',
                  lang === 'ko'
                    ? '이 가족 테마는 감정 표현보다 역할과 비용을 보이는 언어로 맞추는 사람이 오래 버팁니다.'
                    : 'This family theme favors the person who makes roles and cost explicit rather than relying on feeling alone.',
                ]),
                patterns: joinNarrativeParts([
                  relationshipAdvisory?.caution,
                  conflictDetail,
                  patternPressureLine,
                  lang === 'ko'
                    ? '보이지 않는 역할 불균형은 가까운 사이일수록 억울함과 피로를 더 크게 남깁니다.'
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
                      ? `가족 창을 미는 축은 ${timingDrivers.join(', ')}입니다.`
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
                        ? `특히 ${riskCounterweights.join(', ')} 같은 제약은 감정보다 역할 조정에서 먼저 풀어야 합니다.`
                        : `Counterweights like ${riskCounterweights.join(', ')} should be resolved through role adjustment before emotion is pushed harder.`
                      : '',
                    lang === 'ko'
                      ? '같은 장면을 다르게 읽고 있으면 결론보다 해석 일치를 먼저 만드는 편이 안전합니다.'
                      : 'When people read the same scene differently, aligned interpretation must come before conclusions.',
                  ]),
                  joinNarrativeParts([
                    conflictSummary,
                    lang === 'ko'
                      ? '가족 안에서 여러 요구가 경쟁하면 더 큰 목소리보다 더 오래 남는 부담을 먼저 줄이세요.'
                      : 'When demands compete inside the family, reduce the burden that lasts longer before reacting to the louder voice.',
                  ]),
                ].filter(Boolean),
                actionPlan: joinNarrativeParts([
                  actionOpeningLine,
                  actionMoveLine,
                  actionRhythmLine,
                  lang === 'ko'
                    ? '핵심은 감정을 더 세게 말하는 것이 아니라 역할, 비용, 돌봄을 먼저 보이는 언어로 바꾸는 데 있습니다.'
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
            ? '궁합은 감정 강도보다 속도와 기대치 조율이 맞는지가 더 중요합니다.'
            : 'Compatibility depends more on pace and expectation alignment than emotional intensity.',
        ]),
        spouseProfile: joinNarrativeParts([
          relationshipAdvisory?.action,
          lang === 'ko'
            ? '관계에서는 생활 운영과 책임 분담이 되는 사람이 더 강하게 맞습니다.'
            : 'The stronger fit is someone who can share daily structure and responsibility.',
        ]),
        marriageTiming: joinNarrativeParts([
          timingSummary,
          relationshipAdvisory?.timingHint,
          lang === 'ko'
            ? '공식화는 감정보다 기준과 생활 조건이 맞는 창에서 성사시키는 편이 맞습니다.'
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
            ? '이번 승부처는 더 많이 벌이는 순간이 아니라, 역할과 평가 기준을 먼저 고정하는 순간입니다.'
            : 'The real turning point is not expansion itself, but the moment role and evaluation criteria are fixed.',
          lang === 'ko'
            ? '커리어는 역할, 범위, 평가 기준을 먼저 고정할수록 결과가 좋아집니다.'
            : 'Career improves when role, scope, and evaluation criteria are fixed first.',
        ]),
        roleFit: joinNarrativeParts([
          structureSummary,
          careerAdvisory?.action,
          lang === 'ko'
            ? '직무 적합도는 속도보다 기준 정리와 조율 능력이 필요한 역할에서 더 강합니다.'
            : 'Role fit is strongest where prioritization and coordination matter more than speed.',
          lang === 'ko'
            ? '혼자 몰아치는 자리보다 기준을 세우고 여러 흐름을 조율해야 하는 자리에서 강점이 더 분명하게 드러납니다.'
            : 'Strength shows more clearly in roles that set criteria and coordinate moving parts than in roles that reward isolated speed.',
        ]),
        turningPoints: joinNarrativeParts([
          timingSummary,
          careerAdvisory?.timingHint,
          lang === 'ko'
            ? '전환점은 판이 커지는 순간보다 역할과 책임이 다시 정리되는 순간에 더 선명하게 옵니다.'
            : 'Turning points arrive more clearly when role and responsibility are reset.',
          lang === 'ko'
            ? '특히 평가 기준과 검토 주기가 다시 잡히는 구간이 오면 같은 노력도 결과로 붙는 속도가 달라질 수 있습니다.'
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
            ? '재정은 수익 기대보다 조건과 손실 상한을 먼저 고정할수록 오래 남습니다.'
            : 'Wealth holds better when conditions and downside limits are fixed first.',
        ]),
        incomeStreams: joinNarrativeParts([
          lang === 'ko'
            ? '수입 흐름은 새 채널을 크게 여는 것보다 작게 시험하고 살아남는 구조만 남길 때 좋아집니다.'
            : 'Income flow improves when new channels are tested small and only durable structures remain.',
          evidenceDetail,
          wealthAdvisory?.action,
          lang === 'ko'
            ? '새 수입원은 작게 검증하고 반복 가능한 구조만 남기는 방식이 맞습니다.'
            : 'New income channels should be tested small and kept only when repeatable.',
        ]),
        riskManagement: joinNarrativeParts([
          riskSummary,
          wealthAdvisory?.caution,
          lang === 'ko'
            ? '금액, 기한, 취소 조건이 문서로 남지 않으면 이점이 바로 손실로 바뀔 수 있습니다.'
            : 'If amount, timing, and exit conditions are not written down, upside can flip into loss quickly.',
        ]),
      }
    case 'health':
      return {
        ...common,
        prevention: joinNarrativeParts([
          lang === 'ko'
            ? '예방의 핵심은 버티는 힘보다 과부하를 빨리 끊는 운영 습관을 만드는 데 있습니다.'
            : 'Prevention works best when overload is interrupted early, not when endurance is forced.',
          healthAdvisory?.thesis,
          lang === 'ko'
            ? '건강은 버티는 힘보다 과부하 신호를 빨리 끊는 습관에서 차이가 납니다.'
            : 'Health separates more by interrupting overload early than by endurance.',
        ]),
        riskWindows: joinNarrativeParts([
          timingSummary,
          healthAdvisory?.timingHint,
          lang === 'ko'
            ? '피로와 일정 압력이 겹치는 창에서는 강도를 낮추고 회복 블록을 먼저 고정하세요.'
            : 'When fatigue and schedule pressure overlap, lower intensity and lock recovery blocks first.',
        ]),
        recoveryPlan: joinNarrativeParts([
          healthAdvisory?.action,
          riskSummary,
          lang === 'ko'
            ? '회복은 큰 결심보다 수면, 수분, 식사, 일정 조정의 반복성에서 나옵니다.'
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
            ? '가족 역학은 감정보다 역할, 비용, 돌봄 분담이 보이지 않을 때 더 꼬입니다.'
            : 'Family dynamics tangle more when roles, cost, and care distribution stay implicit.',
        ]),
        communication: joinNarrativeParts([
          lang === 'ko'
            ? '가족 커뮤니케이션은 결론을 빨리 내리는 것보다 서로 같은 장면을 보고 있는지부터 확인할 때 좋아집니다.'
            : 'Family communication improves when people confirm they are reading the same scene before pushing conclusions.',
          relationshipAdvisory?.caution,
          healthAdvisory?.action,
          lang === 'ko'
            ? '가족 소통은 결론보다 해석 일치 확인을 먼저 두는 편이 갈등 비용을 줄입니다.'
            : 'In family communication, aligned interpretation before conclusions lowers conflict cost.',
        ]),
        legacy: joinNarrativeParts([
          timelineNarrative,
          moveAdvisory?.caution,
          lang === 'ko'
            ? '세대 과제는 말보다 운영 규칙으로 남길 때 반복 갈등을 줄일 수 있습니다.'
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
      lang === 'ko'
        ? !/(함께 참고해도 되는 편입니다|참고할 만하지만|큰 흐름 중심으로 참고하는 편이 맞습니다|세부 타이밍은 한 번 더 확인하는 편이 좋습니다)/.test(
            deepAnalysis
          )
        : !/(worth using as a broad directional read|use this as a broad directional guide|confirm finer timing separately)/.test(
            deepAnalysis
          )
    const needsEvidenceNarrative =
      lang === 'ko'
        ? !/(함께 본 결과입니다|교차 근거 묶음|규칙 판정)/.test(deepAnalysis)
        : !/(cross-evidence bundle|rule arbitration|read together across signals)/.test(
            deepAnalysis
          )
    const additions: string[] = []
    if (needsTimingDisclaimer) {
      additions.push(
        lang === 'ko'
          ? '큰 흐름 중심으로 참고하는 편이 맞습니다.'
          : 'Use this as a broad directional guide and confirm finer timing separately.'
      )
    }
    if (needsEvidenceNarrative) {
      additions.push(
        lang === 'ko'
          ? '교차 근거 묶음을 함께 본 결과입니다.'
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
    .replace(/무조건/gi, '가능하면')
    .replace(/절대/gi, '가급적')
    .replace(/반드시/gi, '우선적으로')
    .replace(/100%/gi, '높은 확률로')
    .replace(/\bguaranteed\b/gi, 'high-probability')
    .replace(/\bcertainly\b/gi, 'likely')
    .replace(/\balways\b/gi, 'in most cases')
    .replace(/\bnever\b/gi, 'rarely')
}

// Premium reports currently ship as deterministic core + selective AI polish.
// Keep the old rewrite-only generation path disabled unless we intentionally revive it.
const FORCE_REWRITE_ONLY_MODE = false
const FORCE_DETERMINISTIC_CORE_MODE = true

function shouldUseDeterministicOnly(flag?: boolean): boolean {
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
  introduction: ['일정', '우선순위', '대화', '수면', '피로', '마감'],
  personalityDeep: ['말투', '속도', '거리두기', '결정', '수면', '두통'],
  careerPath: ['일정', '우선순위', '협업', '결정 지연', '마감', '회의'],
  relationshipDynamics: ['말이 빨라짐', '단호해짐', '거리두기', '확정 서두름', '대화', '연락'],
  wealthPotential: ['지출', '저축', '계약', '예산', '마감', '우선순위'],
  healthGuidance: ['소화', '수면', '두통', '허리', '관절', '피로'],
  lifeMission: ['일정', '습관', '기록', '대화', '협업', '우선순위'],
  timingAdvice: ['오늘', '이번주', '이번 달', '마감', '대화', '결정'],
  actionPlan: ['일정', '우선순위', '협업', '수면', '대화', '마감'],
  conclusion: ['일정', '대화', '수면', '우선순위', '피로', '결정'],
}
const REPETITIVE_OPENER_REGEX =
  /^(?:\uACB0\uB860\uBD80\uD130 \uB9D0\uD558\uBA74|\uC694\uC57D\uD558\uBA74|\uD575\uC2EC\uC740)\b/
const SECTION_OPENERS_KO: Record<keyof AIPremiumReport['sections'], string> = {
  introduction: '지금 국면의 핵심은 방향 설정입니다',
  personalityDeep: '성향의 중심축은 판단과 리듬 조절입니다',
  careerPath: '커리어에서는 우선순위 설계가 성과를 가릅니다',
  relationshipDynamics: '관계에서는 해석 오차 관리가 먼저입니다',
  wealthPotential: '재정에서는 기대수익보다 조건 검증이 우선입니다',
  healthGuidance: '건강은 회복 리듬 관리가 핵심입니다',
  lifeMission: '장기 성장은 일관된 실행 기록에서 나옵니다',
  timingAdvice: '타이밍은 속도보다 순서가 중요합니다',
  actionPlan: '실행은 단계를 분리할수록 재현성이 높아집니다',
  conclusion: '이번 흐름의 결론은 속도와 검증의 균형입니다',
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
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '사명',
    timing: '시기',
    move: '변화',
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
      lang === 'ko' ? `${anchor.section} 섹션 교차 근거` : `${anchor.section} cross evidence`
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
        return `${toKoreanDomainLabel(domain)} 상승 근거: ${signal.keyword || signal.rowKey}`
      }
      return `${domain} upside signal: ${signal.keyword || signal.rowKey}`
    })
  const strategyDrivers = (strategyEngine?.domainStrategies || [])
    .filter((strategy) => !preferredDomains || preferredDomains.has(strategy.domain))
    .slice(0, 3)
    .map((strategy) => {
      const strategyDomain = strategy.domain as SignalDomain
      if (lang === 'ko') {
        return `${toKoreanDomainLabel(strategyDomain)}은 ${describePhaseFlow(
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
        return `${toKoreanDomainLabel(domain)} 주의: ${signal.keyword || signal.rowKey} 신호는 확정 전 재확인이 필요합니다.`
      }
      return `${domain} caution: ${signal.keyword || signal.rowKey} requires recheck before commitment.`
    })
  const cautionSections = (graphSummary?.cautionSections || []).slice(0, preferredDomains ? 3 : 6)
  const cautionFromSections = cautionSections.map((section) =>
    lang === 'ko'
      ? `${section} 섹션은 교차 근거 신뢰가 낮아 검증 중심으로 운영해야 합니다.`
      : `${section} section has lower cross-evidence trust and should run verification-first.`
  )
  const trustCaution =
    (graphSummary?.lowTrustSetCount || 0) > 0
      ? [
          lang === 'ko'
            ? `저신뢰 교차 세트 ${graphSummary?.lowTrustSetCount || 0}건이 있어 서명/확정/즉시결정은 보수적으로 처리하세요.`
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
              ? '좋아 보이는 근거가 있어도 지금 흐름과 실행 속도를 함께 보고 움직이는 편이 좋습니다.'
              : 'Use the positive signals together with the current pace and phase before acting.',
          ],
    cautions:
      cautions.length > 0
        ? cautions
        : [
            lang === 'ko'
              ? '근거 신뢰가 낮은 구간은 확정 전에 체크리스트 검증을 먼저 적용하세요.'
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
  const p1 = pairMatch?.[1] || '행성'
  const aspectRaw = (pairMatch?.[2] || '').toLowerCase()
  const p2 = pairMatch?.[3] || '행성'
  const aspectKoMap: Record<string, string> = {
    conjunction: '합으로 만납니다',
    opposition: '대립으로 충돌 포인트가 생기기 쉽습니다',
    square: '각을 세우며 압박을 줍니다',
    trine: '자연스럽게 조화를 이룹니다',
    sextile: '부드럽게 기회를 엽니다',
    quincunx: '조정이 필요한 구간이 자주 생깁니다',
  }
  const aspectKo = aspectKoMap[aspectRaw] || '영향을 줍니다'
  const domains = set.overlapDomains.map(toKoreanDomainLabel).join(', ')
  return `${p1}과 ${p2} 흐름은 ${aspectKo}. ${domains} 쪽은 방향이 또렷해지기 쉽습니다.`
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
        `${item.title} 흐름이 이어집니다. 지금은 ${toKoreanDomainLabel(item.domain)} 쪽 선택이 더 중요합니다.`
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
      'career:expansion': '핵심 과제 1~2개를 먼저 완료하고 외부 확정은 체크리스트 후 진행하세요.',
      'career:high_tension_expansion': '결론은 내되 서명·발송은 24시간 재확인 슬롯 뒤로 미루세요.',
      'relationship:expansion_guarded': '대화는 늘리고 확정 발언은 늦춰 해석 오차 비용을 낮추세요.',
      'wealth:expansion_guarded': '금액·기한·취소조건 3항을 먼저 고정하고 실행 규모를 분할하세요.',
      'health:defensive_reset': '과속을 멈추고 수면·수분·회복 루틴부터 복구하세요.',
      'timing:high_tension_expansion':
        '결정 시점과 실행 시점을 분리해 커뮤니케이션 리스크를 줄이세요.',
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
        ? koActionByKey[key] || '국면별 조건을 분리해 실행하고 확정 전 재확인을 유지하세요.'
        : enActionByKey[key] || 'Run staged execution with recheck gates before commitment.'

    if (lang === 'ko') {
      lines.push(
        `${toKoreanDomainLabel(strategy.domain)}은 ${describePhaseFlow(
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
  const bullets: string[] = []
  const hasReportCore = Boolean(reportCore)
  if (!hasReportCore && input.dayMasterElement) {
    bullets.push(
      `타고난 구조상 ${input.dayMasterElement} 일간은 방향을 먼저 잡을 때 흔들림이 줄기 쉽습니다.`
    )
  }
  if (!hasReportCore && input.geokguk) {
    bullets.push(
      `타고난 구조상 ${input.geokguk} 성향은 역할과 책임을 분명히 할수록 성과가 올라가기 쉽습니다.`
    )
  }
  if (!hasReportCore && input.yongsin) {
    bullets.push(
      `용신이 ${input.yongsin} 쪽이면 생활 리듬을 그쪽으로 맞출 때 체감이 빨라지기 쉽습니다.`
    )
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
    bullets.push(
      `현재는 ${activeTransits.join(', ')} 영향이 겹쳐 결정 속도를 조절하는 쪽이 낫습니다.`
    )
  }
  if (
    !hasReportCore &&
    (input.currentDaeunElement ||
      input.currentSaeunElement ||
      input.currentWolunElement ||
      input.currentIljinElement ||
      input.currentIljinDate)
  ) {
    bullets.push(
      `대운/세운/월운/일진 신호가 함께 움직이는 구간이라 단기 감정보다 단계별 계획을 우선하는 쪽이 낫습니다.`
    )
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
        ? '큰 흐름과 단기 신호가 함께 움직이는 구간이므로, 실행보다 순서와 검증 절차를 먼저 고정하는 편이 맞습니다.'
        : 'Long-cycle and short-cycle signals are moving together, so fix sequencing and verification before commitment.'
    )
  }

  return bullets
    .map((line) => line.trim())
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
      '당신은 사주+점성 통합 상담가입니다.',
      `섹션 이름: ${sectionKey}`,
      '스타일 규칙:',
      '- 첫 문장은 결론형으로 시작하되, 시작 표현을 섹션마다 다르게 씁니다.',
      '- 쉬운 한국어 설명문으로 씁니다.',
      longForm ? '- 문장 길이는 22~60자로 맞춥니다.' : '- 문장 길이는 15~35자로 맞춥니다.',
      longForm ? '- 문단마다 8~14문장으로 작성합니다.' : '- 문단마다 4~7문장으로 작성합니다.',
      `- 이 섹션은 최소 ${minChars}자 이상으로 작성합니다.`,
      '- 구체 명사를 최소 2개 포함합니다.',
      `- 이 섹션 명사 후보: ${concreteNouns}`,
      '- 과장/공포 조장 금지. 근거가 있을 때만 단정합니다.',
      '- 불릿/번호 목록 없이 자연 문단으로 작성합니다.',
      '- 같은 의미 문장을 반복하지 말고, 각 문장은 새 정보 1개 이상 포함합니다.',
      '- 조언형 문장(좋습니다/유의하셔야 합니다)은 최대 2문장만 사용합니다.',
      draftText
        ? '아래 초안을 보강해 더 정교하게 완성합니다.'
        : '아래 사실 묶음만으로 섹션을 작성합니다.',
      '사실 묶음:',
      facts,
      draftText ? `초안:\n${draftText}` : '',
      'JSON으로만 반환: {"text":"..."}',
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
      ? '성과 확장·완결률 강화'
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
      return `- ${claim.domain}: ${claim.thesis} | 근거: ${evidence || 'pending'} | 통제: ${claim.riskControl}`
    }
    return `- ${claim.domain}: ${claim.thesis} | evidence: ${evidence || 'pending'} | control: ${claim.riskControl}`
  })
  const strategyLines = (strategyEngine?.domainStrategies || [])
    .filter((item) => preferredDomains.includes(item.domain))
    .slice(0, 3)
    .map((item) =>
      lang === 'ko'
        ? `- 전략 ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'ko')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'ko')} | thesis=${item.thesis}`
        : `- strategy ${item.domain}: ${describePhaseFlow(item.phaseLabel, 'en')} ${describeExecutionStance(item.attackPercent, item.defensePercent, 'en')} | thesis=${item.thesis}`
    )
  if (lang === 'ko') {
    return [
      '## Signal Synthesizer (고정 근거)',
      '- 아래 클레임과 근거 ID를 벗어나는 사실 추가 금지',
      '- 같은 도메인에서 상승/주의가 동시에 있으면 반드시 "상승 + 리스크관리"로 통합 서술',
      strategyEngine
        ? `- 전체 흐름: ${describePhaseFlow(strategyEngine.overallPhaseLabel, 'ko')} ${describeExecutionStance(strategyEngine.attackPercent, strategyEngine.defensePercent, 'ko')}`
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
    const comprehensiveSupplements = buildNarrativeSupplementsBySectionExternal(
      [...COMPREHENSIVE_SECTION_KEYS],
      unified.blocksBySection,
      lang
    )
    let sections = draftSections as unknown as Record<string, unknown>
    sections = enrichComprehensiveSectionsWithReportCore(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang,
      reportCoreEnrichmentDeps,
      comprehensiveSupplements,
      options.timingData
    )
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
    if (lang === 'en') {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
    }
    sections = {
      ...(sections as Record<string, unknown>),
      timingAdvice: renderTimingAdviceSection(
        reportCore,
        normalizedInput,
        lang,
        options.matrixSummary
      ),
      actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
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
        lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
      )
    const anchorFallback = (graphRagEvidence.anchors || [])
      .slice(0, 3)
      .map((a) =>
        lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
      )
    const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
    const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
    const safeKeyChallenges =
      keyChallenges.length > 0
        ? keyChallenges
        : lang === 'ko'
          ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
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
    const comprehensiveSupplements = buildNarrativeSupplementsBySectionExternal(
      [...COMPREHENSIVE_SECTION_KEYS],
      unified.blocksBySection,
      lang
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
    sections = enrichComprehensiveSectionsWithReportCore(
      sections as AIPremiumReport['sections'],
      reportCore,
      normalizedInput,
      lang,
      reportCoreEnrichmentDeps,
      comprehensiveSupplements,
      options.timingData
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
    if (lang === 'en') {
      sections = enforceComprehensiveNarrativeQualityFallback(
        sections as AIPremiumReport['sections'],
        reportCore,
        normalizedInput,
        lang
      ) as unknown as Record<string, unknown>
    }
    sections = {
      ...(sections as Record<string, unknown>),
      timingAdvice: renderTimingAdviceSection(
        reportCore,
        normalizedInput,
        lang,
        options.matrixSummary
      ),
      actionPlan: renderActionPlanSection(reportCore, normalizedInput, lang),
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
        lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
      )
    const anchorFallback = (graphRagEvidence.anchors || [])
      .slice(0, 3)
      .map((a) =>
        lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
      )
    const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
    const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
    const safeKeyChallenges =
      keyChallenges.length > 0
        ? keyChallenges
        : lang === 'ko'
          ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
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
            ? `보강 규칙: 새 포인트를 최소 3개 넣고, 구체 명사를 최소 2개 넣고, 사실 묶음 반영 문장을 최소 2개 넣어 주세요. 평균 문장 길이는 40자 이하로 맞추고 금지 표현은 제거해 주세요. current novelty=${quality.novelty}, specificity=${quality.specificity}, evidence=${quality.evidenceDensity}, avgLen=${Math.round(quality.avgSentenceLength)}, advice=${quality.adviceCount}, banned=${quality.banned}`
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
      lang === 'ko' ? `${d.domain} 강점(${d.score})` : `${d.domain} strength (${d.score})`
    )
  const anchorFallback = (graphRagEvidence.anchors || [])
    .slice(0, 3)
    .map((a) =>
      lang === 'ko' ? `${a.section} 섹션 근거 정렬` : `${a.section} section evidence alignment`
    )
  const safeTopInsights = topInsights.length > 0 ? topInsights : anchorFallback
  const safeKeyStrengths = keyStrengths.length > 0 ? keyStrengths : domainFallback
  const safeKeyChallenges =
    keyChallenges.length > 0
      ? keyChallenges
      : lang === 'ko'
        ? ['주의 신호 검토 필요', '확정 전 재확인 필요', '커뮤니케이션 리스크 점검']
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
  const comprehensiveSupplements = buildNarrativeSupplementsBySectionExternal(
    [...COMPREHENSIVE_SECTION_KEYS],
    unified.blocksBySection,
    lang
  )
  sections = enrichComprehensiveSectionsWithReportCore(
    sections as AIPremiumReport['sections'],
    reportCore,
    normalizedInput,
    lang,
    reportCoreEnrichmentDeps,
    comprehensiveSupplements,
    options.timingData
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
      renderProjectionBlocksAsMarkdown(
        buildReportOutputCoreFields(reportCore, lang).projections,
        lang
      ),
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
      renderProjectionBlocksAsText(buildReportOutputCoreFields(reportCore, lang).projections, lang),
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
