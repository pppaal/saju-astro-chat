import type { FusionReport, InsightDomain } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '@/lib/destiny-matrix/types'
import {
  buildGraphRAGEvidence,
  summarizeGraphRAGEvidence,
  type GraphRAGEvidenceSummary,
  type GraphRAGDomain,
} from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { ReportEvidenceRef } from '@/lib/destiny-matrix/ai-report/evidenceRefs'
import type {
  AdapterBranchCandidate,
  AdapterMatrixViewRow,
  AdapterPersonModel,
  AdapterSingleSubjectView,
  AdapterSingleUserModel,
} from '@/lib/destiny-matrix/core/adaptersTypes'
import type {
  NormalizedSignal,
  SignalDomain,
  SignalSynthesisResult,
} from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type { StrategyEngineResult } from '@/lib/destiny-matrix/ai-report/strategyEngine'
import type {
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
} from '@/lib/destiny-matrix/ai-report/types'
import { buildUnifiedEnvelope } from '@/lib/destiny-matrix/ai-report/unifiedReport'
import { adaptCoreToCounselor } from '@/lib/destiny-matrix/core/adapters'
import type { DestinyCoreResult } from '@/lib/destiny-matrix/core/runDestinyCore'
import {
  describeDataTrustSummary,
  describeIntraMonthPeakWindow,
  describeProvenanceSummary,
  describeSajuAstroConflictByDomain,
  describeTimingCalibrationSummary,
  describeWhyStack,
} from '@/lib/destiny-matrix/interpretation/humanSemantics'
import {
  buildSanitizedCanonicalBrief,
  formatTransitLabels,
  localizeCounselorDomain,
  sanitizeCounselorFreeText,
  sanitizeCounselorProjectionBlock,
  sanitizeCounselorTextList,
} from '@/lib/destiny-matrix/counselorEvidenceSanitizer'
import {
  buildCounselorArbitrationLine,
  buildCounselorCrossSystemSummary,
  buildCounselorWhyStack,
  buildCounselorVerdictContext,
  buildCounselorVerdictLead,
  buildCounselorVerdictTimingLine,
  isQuestionDrivenTheme,
  joinUniqueVerdictParts,
  mapThemeToDomain,
} from '@/lib/destiny-matrix/counselorEvidenceVerdict'
import {
  buildDomainSpecificWhyReasons,
  buildPacketGuardrail,
  buildScenarioActionHints,
  compactCounselorNarrative,
  domainHintsForSection,
  getCounselorDomainPriority,
  getGraphRagFocusDomain,
  inferScenarioSectionHints,
  isInsightDomain,
  mergeUniqueSignals,
  rankCounselorSignals,
  scoreCounselorSignal,
  summarizeAnchor,
  summarizeClaim,
  toEvidenceRefs,
  uniq,
} from '@/lib/destiny-matrix/counselorEvidenceSupport'

const COUNSELOR_SECTION_PATHS = [
  'overview',
  'patterns',
  'timing',
  'recommendations',
  'actionPlan',
  'careerPath',
  'relationshipDynamics',
  'wealthPotential',
] as const

export type CounselorTheme =
  | 'love'
  | 'career'
  | 'wealth'
  | 'health'
  | 'family'
  | 'today'
  | 'month'
  | 'year'
  | 'life'
  | 'chat'
  | string

function mapSignalDomainToTimelineDomain(
  domain?: string
): import('@/lib/destiny-matrix/types').DomainKey | null {
  switch (domain) {
    case 'career':
      return 'career'
    case 'relationship':
      return 'love'
    case 'wealth':
      return 'money'
    case 'health':
      return 'health'
    case 'move':
      return 'move'
    default:
      return null
  }
}

export interface CounselorEvidencePacket {
  focusDomain: string
  actionFocusDomain?: string
  riskAxisLabel?: string
  matrixView?: AdapterMatrixViewRow[]
  branchSet?: AdapterBranchCandidate[]
  singleUserModel?: AdapterSingleUserModel
  singleSubjectView?: AdapterSingleSubjectView
  personModel?: AdapterPersonModel
  timingMatrix?: Array<{
    domain: string
    label: string
    window: string
    granularity: string
    confidence: number
    summary: string
  }>
  verdict: string
  guardrail: string
  topAnchorSummary: string
  graphRagEvidenceSummary: GraphRAGEvidenceSummary
  topAnchors: Array<{
    id: string
    section: string
    summary: string
    setCount: number
  }>
  topClaims: Array<{
    id: string
    text: string
    domain?: string
    signalIds: string[]
    anchorIds: string[]
    provenanceSummary?: string
  }>
  scenarioBriefs: Array<{
    id: string
    domain: string
    mainTokens: string[]
    altTokens: string[]
  }>
  selectedSignals: Array<{
    id: string
    domain: string
    polarity: string
    summary: string
    score: number
  }>
  strategyBrief: {
    overallPhase: string
    overallPhaseLabel: string
    attackPercent: number
    defensePercent: number
  }
  canonicalBrief?: {
    gradeLabel: string
    phaseLabel: string
    actionFocusDomain?: string
    focusRunnerUpDomain?: string
    actionRunnerUpDomain?: string
    focusNarrative?: string
    actionNarrative?: string
    suppressionNarratives?: string[]
    topDecisionAction?: string
    topDecisionLabel?: string
    answerThesis: string
    primaryAction: string
    primaryCaution: string
    timingHint: string
    policyMode: 'execute' | 'verify' | 'prepare'
    policyRationale: string
    allowedActions: string[]
    blockedActions: string[]
    softChecks: string[]
    hardStops: string[]
    latentTopAxes?: string[]
  }
  topDomainAdvisory?: {
    domain: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
  }
  topTimingWindow?: {
    domain: string
    window: string
    timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
    timingReliabilityBand?: 'low' | 'medium' | 'high'
    timingReliabilityScore?: number
    readinessScore?: number
    triggerScore?: number
    convergenceScore?: number
    precisionReason?: string
    timingConflictMode?: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
    timingConflictNarrative?: string
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
  }
  topManifestation?: {
    domain: string
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: string
  }
  projections?: {
    structure?: CounselorProjectionBlock
    timing?: CounselorProjectionBlock
    conflict?: CounselorProjectionBlock
    action?: CounselorProjectionBlock
    risk?: CounselorProjectionBlock
    evidence?: CounselorProjectionBlock
    branches?: CounselorProjectionBlock
  }
  whyStack: string[]
}

export type CounselorProjectionBlock = {
  headline: string
  summary: string
  reasons?: string[]
  detailLines?: string[]
  drivers?: string[]
  counterweights?: string[]
  nextMoves?: string[]
}

type CounselorEvidencePacketLike = {
  focusDomain?: string
  riskAxisLabel?: string
  matrixView?: CounselorEvidencePacket['matrixView']
  branchSet?: CounselorEvidencePacket['branchSet']
  singleUserModel?: CounselorEvidencePacket['singleUserModel']
  singleSubjectView?: CounselorEvidencePacket['singleSubjectView']
  timingMatrix?: CounselorEvidencePacket['timingMatrix']
  verdict?: string
  guardrail?: string
  topAnchorSummary?: string
  graphRagEvidenceSummary?: Partial<GraphRAGEvidenceSummary>
  topAnchors?: Array<{
    id?: string
    section?: string
    summary?: string
    setCount?: number
  }>
  topClaims?: Array<{
    id?: string
    text?: string
    domain?: string
    signalIds?: string[]
    anchorIds?: string[]
    provenanceSummary?: string
  }>
  scenarioBriefs?: Array<{
    id?: string
    domain?: string
    mainTokens?: string[]
    altTokens?: string[]
  }>
  selectedSignals?: Array<{
    id?: string
    domain?: string
    polarity?: string
    summary?: string
    score?: number
  }>
  strategyBrief?: {
    overallPhase?: string
    overallPhaseLabel?: string
    attackPercent?: number
    defensePercent?: number
  }
  canonicalBrief?: Partial<NonNullable<CounselorEvidencePacket['canonicalBrief']>>
  topDomainAdvisory?: CounselorEvidencePacket['topDomainAdvisory']
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow']
  topManifestation?: CounselorEvidencePacket['topManifestation']
  projections?: CounselorEvidencePacket['projections']
  whyStack?: string[]
}

export function buildCounselorEvidencePacket(params: {
  theme: CounselorTheme
  lang: 'ko' | 'en'
  focusDomainOverride?: InsightDomain
  matrixInput: MatrixCalculationInput
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
  signalSynthesis: SignalSynthesisResult
  strategyEngine: StrategyEngineResult
  core?: DestinyCoreResult
  birthDate?: string
}): CounselorEvidencePacket {
  const fallbackFocusDomain = params.focusDomainOverride || mapThemeToDomain(params.theme)
  const counselorCore = params.core ? adaptCoreToCounselor(params.core, params.lang) : null
  const questionDrivenTheme = isQuestionDrivenTheme(params.theme)
  const themedQuestionDomain = questionDrivenTheme ? mapThemeToDomain(params.theme) : undefined
  const preferredDomain =
    params.focusDomainOverride ||
    themedQuestionDomain ||
    counselorCore?.actionFocusDomain ||
    counselorCore?.focusDomain ||
    fallbackFocusDomain

  const graphRagEvidence = buildGraphRAGEvidence(params.matrixInput, params.matrixReport, {
    mode: 'comprehensive',
    focusDomain: getGraphRagFocusDomain(preferredDomain),
  })
  const evidenceRefs = Object.fromEntries(
    COUNSELOR_SECTION_PATHS.map((sectionPath) => [
      sectionPath,
      toEvidenceRefs(sectionPath, preferredDomain, params.signalSynthesis),
    ])
  )

  const unified = buildUnifiedEnvelope({
    mode: 'comprehensive',
    lang: params.lang,
    generatedAt: new Date().toISOString(),
    matrixInput: params.matrixInput,
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
    signalSynthesis: params.signalSynthesis,
    graphRagEvidence,
    birthDate: params.birthDate,
    sectionPaths: COUNSELOR_SECTION_PATHS as unknown as string[],
    evidenceRefs,
  })

  const graphRagEvidenceSummary = summarizeGraphRAGEvidence(graphRagEvidence) || {
    mode: 'comprehensive',
    totalAnchors: 0,
    totalSets: 0,
    avgOverlapScore: 0,
    avgOrbFitScore: 0,
    highTrustSetCount: 0,
    lowTrustSetCount: 0,
    cautionSections: [],
    focusReason: '',
    graphReason: '',
    anchors: [],
  }

  const topClaim = (unified.claims || [])[0]
  const topClaimText = topClaim ? summarizeClaim(topClaim) : ''
  const guardrail = buildPacketGuardrail(params.strategyEngine.overallPhase, params.lang)

  const topDomainAdvisory =
    counselorCore?.advisories.find(
      (item) => item.domain === (counselorCore?.actionFocusDomain || preferredDomain)
    ) ||
    counselorCore?.advisories.find((item) => item.domain === preferredDomain) ||
    counselorCore?.advisories[0] ||
    null
  const topTimingWindow =
    counselorCore?.domainTimingWindows.find(
      (item) => item.domain === (counselorCore?.actionFocusDomain || preferredDomain)
    ) ||
    counselorCore?.domainTimingWindows.find((item) => item.domain === preferredDomain) ||
    counselorCore?.domainTimingWindows[0] ||
    null
  const topManifestation =
    counselorCore?.manifestations.find(
      (item) => item.domain === (counselorCore?.actionFocusDomain || preferredDomain)
    ) ||
    counselorCore?.manifestations.find((item) => item.domain === preferredDomain) ||
    counselorCore?.manifestations[0] ||
    null
  const scenarioActionHints = buildScenarioActionHints(
    counselorCore?.topScenarioIds || [],
    params.lang
  )
  const prefersScenarioActionLead =
    preferredDomain === 'move' &&
    scenarioActionHints.length > 0 &&
    (counselorCore?.topDecisionAction === 'prepare_only' ||
      /preparation|information-gathering|review|slow prep/i.test(
        counselorCore?.topDecisionLabel || ''
      ))
  const topDecisionLeadLabel =
    prefersScenarioActionLead && scenarioActionHints[0]
      ? `${localizeCounselorDomain(preferredDomain, params.lang)}: ${scenarioActionHints[0]}`
      : counselorCore?.topDecisionLabel
  const verdictContext = buildCounselorVerdictContext({
    lang: params.lang,
    domainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    crossAgreement: params.core?.canonical.crossAgreement,
    topTimingWindow,
    topDomainAdvisory,
    topManifestation,
  })
  const verdictTimingLine = buildCounselorVerdictTimingLine({
    lang: params.lang,
    topTimingWindow,
    topManifestation,
  })

  const verdict = joinUniqueVerdictParts([
    buildCounselorVerdictLead(
      topDecisionLeadLabel ?? undefined,
      counselorCore?.actionFocusDomain,
      preferredDomain,
      params.lang
    ),
    compactCounselorNarrative(verdictContext || counselorCore?.answerThesis, params.lang, 2),
    prefersScenarioActionLead
      ? compactCounselorNarrative(scenarioActionHints[0], params.lang, 1)
      : undefined,
    compactCounselorNarrative(verdictTimingLine || topManifestation?.manifestation, params.lang, 2),
    counselorCore ? undefined : topClaimText,
  ])

  const prioritizedSignals = rankCounselorSignals(params.signalSynthesis, preferredDomain).slice(
    0,
    counselorCore ? 6 : 10
  )
  const prioritizedClaims = (unified.claims || [])
    .slice()
    .sort((a, b) => {
      const aFocus = a.domain === preferredDomain ? 1 : 0
      const bFocus = b.domain === preferredDomain ? 1 : 0
      if (aFocus !== bFocus) return bFocus - aFocus
      if (counselorCore?.topClaimId) {
        if (a.id === counselorCore.topClaimId) return -1
        if (b.id === counselorCore.topClaimId) return 1
      }
      return 0
    })
    .slice(0, counselorCore ? 4 : 10)
  const prioritizedScenarioBundles = (unified.scenarioBundles || [])
    .slice()
    .sort((a, b) => {
      const aFocus = a.domain === preferredDomain ? 1 : 0
      const bFocus = b.domain === preferredDomain ? 1 : 0
      if (aFocus !== bFocus) return bFocus - aFocus
      if (counselorCore?.topScenarioIds?.length) {
        const aTop = counselorCore.topScenarioIds.includes(a.id) ? 1 : 0
        const bTop = counselorCore.topScenarioIds.includes(b.id) ? 1 : 0
        if (aTop !== bTop) return bTop - aTop
      }
      return 0
    })
    .slice(0, counselorCore ? 3 : 6)
  const prioritizedAnchors = (unified.anchors || [])
    .slice()
    .sort((a, b) => {
      const scenarioSectionHints = inferScenarioSectionHints(counselorCore?.topScenarioIds || [])
      const anchorSectionDomains = (anchor: UnifiedAnchor) =>
        domainHintsForSection(anchor.section, getGraphRagFocusDomain(preferredDomain))
      const aScenarioFocus = scenarioSectionHints.includes(a.section) ? 1 : 0
      const bScenarioFocus = scenarioSectionHints.includes(b.section) ? 1 : 0
      if (aScenarioFocus !== bScenarioFocus) return bScenarioFocus - aScenarioFocus
      const aFocus = anchorSectionDomains(a).some((domain) =>
        getCounselorDomainPriority(preferredDomain).includes(domain)
      )
        ? 1
        : 0
      const bFocus = anchorSectionDomains(b).some((domain) =>
        getCounselorDomainPriority(preferredDomain).includes(domain)
      )
        ? 1
        : 0
      if (aFocus !== bFocus) return bFocus - aFocus
      if (a.setCount !== b.setCount) return b.setCount - a.setCount
      return summarizeAnchor(b).length - summarizeAnchor(a).length
    })
    .slice(0, counselorCore ? 4 : 8)
  const topAnchorSummary = prioritizedAnchors[0] ? summarizeAnchor(prioritizedAnchors[0]) : ''
  const whyReasons = buildDomainSpecificWhyReasons({
    domain: preferredDomain,
    lang: params.lang,
    yongsin: params.matrixInput.yongsin,
    currentDaeunElement: params.matrixInput.currentDaeunElement,
    geokguk: params.matrixInput.geokguk,
    activeTransits: params.matrixInput.activeTransits,
    aspectsCount: params.matrixInput.aspects?.length,
    graphFocusReason: graphRagEvidenceSummary.focusReason,
    graphReason:
      graphRagEvidenceSummary.graphReason ||
      (topAnchorSummary
        ? `"${topAnchorSummary}"? ?? ??? ?? ?????.`
        : '?? ?? ??? ?? ??? ?? ????? ?????.'),
    strategyLine: topDomainAdvisory?.strategyLine,
    answerThesis: counselorCore?.answerThesis,
  })
  const whyStack = describeWhyStack({
    lang: params.lang,
    focusDomainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    sajuReason: whyReasons.sajuWhy,
    astroReason: whyReasons.astroWhy,
    crossReason: whyReasons.crossWhy,
    graphReason: whyReasons.graphWhy,
  })
  const conflictNarrative = describeSajuAstroConflictByDomain({
    crossAgreement: params.core?.canonical.crossAgreement,
    focusDomainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    lang: params.lang,
  })
  const crossSystemSummary = buildCounselorCrossSystemSummary({
    lang: params.lang,
    domainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    crossAgreement: params.core?.canonical.crossAgreement,
    topTimingWindow,
  })
  const trustNarrative = describeDataTrustSummary({
    score: params.core?.quality.score,
    grade: params.core?.quality.grade,
    missingFields: params.core?.quality.dataQuality.missingFields || [],
    derivedFields: params.core?.quality.dataQuality.derivedFields || [],
    conflictingFields: params.core?.quality.dataQuality.conflictingFields || [],
    confidenceReason: params.core?.quality.dataQuality.confidenceReason,
    lang: params.lang,
  })
  const provenanceNarrative = describeProvenanceSummary({
    sourceFields:
      topTimingWindow?.provenance?.sourceFields ||
      topDomainAdvisory?.provenance?.sourceFields ||
      topManifestation?.provenance?.sourceFields ||
      [],
    sourceSetIds:
      topTimingWindow?.provenance?.sourceSetIds ||
      topDomainAdvisory?.provenance?.sourceSetIds ||
      topManifestation?.provenance?.sourceSetIds ||
      [],
    sourceRuleIds:
      topTimingWindow?.provenance?.sourceRuleIds ||
      topDomainAdvisory?.provenance?.sourceRuleIds ||
      topManifestation?.provenance?.sourceRuleIds ||
      [],
    lang: params.lang,
  })
  const timingCalibrationNarrative = describeTimingCalibrationSummary({
    reliabilityBand: params.matrixSummary?.timingCalibration?.reliabilityBand,
    reliabilityScore: params.matrixSummary?.timingCalibration?.reliabilityScore,
    pastStability: params.matrixSummary?.timingCalibration?.pastStability,
    futureStability: params.matrixSummary?.timingCalibration?.futureStability,
    backtestConsistency: params.matrixSummary?.timingCalibration?.backtestConsistency,
    calibratedFromHistory: params.matrixSummary?.timingCalibration?.calibratedFromHistory,
    calibrationSampleSize: params.matrixSummary?.timingCalibration?.calibrationSampleSize,
    calibrationMatchedRate: params.matrixSummary?.timingCalibration?.calibrationMatchedRate,
    lang: params.lang,
  })
  const timelineDomain = mapSignalDomainToTimelineDomain(preferredDomain)
  const intraMonthPeakNarrative = describeIntraMonthPeakWindow({
    domainLabel: localizeCounselorDomain(preferredDomain, params.lang),
    points: timelineDomain
      ? params.matrixSummary?.overlapTimelineByDomain?.[timelineDomain]
      : undefined,
    lang: params.lang,
  })
  const arbitrationNarrative = counselorCore
    ? buildCounselorArbitrationLine({
        focusDomain: preferredDomain,
        actionFocusDomain: counselorCore.actionFocusDomain,
        focusRunnerUpDomain: counselorCore.arbitrationBrief.focusRunnerUpDomain || undefined,
        actionRunnerUpDomain: counselorCore.arbitrationBrief.actionRunnerUpDomain || undefined,
        lang: params.lang,
      })
    : ''
  const latentNarrative = counselorCore?.latentTopAxes?.length
    ? params.lang === 'ko'
      ? `?? ?? ??? ???? ?? ?? ${counselorCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}???.`
      : `The strongest latent drivers right now are ${counselorCore.latentTopAxes
          .slice(0, 3)
          .map((axis) => axis.label)
          .join(', ')}.`
    : ''

  return {
    focusDomain: preferredDomain,
    actionFocusDomain: counselorCore?.actionFocusDomain,
    riskAxisLabel: counselorCore?.riskAxisLabel,
    matrixView: (counselorCore?.matrixView || []).slice(0, 4).map((row) => ({
      domain: row.domain,
      label: sanitizeCounselorFreeText(row.label, params.lang),
      cells: row.cells.slice(0, 4).map((cell) => ({
        ...cell,
        summary: sanitizeCounselorFreeText(cell.summary, params.lang),
      })),
    })),
    branchSet: (counselorCore?.branchSet || []).slice(0, 3).map((branch) => ({
      ...branch,
      label: sanitizeCounselorFreeText(branch.label, params.lang),
      summary: sanitizeCounselorFreeText(branch.summary, params.lang),
      entry: sanitizeCounselorTextList(branch.entry || [], params.lang),
      abort: sanitizeCounselorTextList(branch.abort || [], params.lang),
      sustain: sanitizeCounselorTextList(branch.sustain || [], params.lang),
      reversalRisk: sanitizeCounselorFreeText(branch.reversalRisk || '', params.lang),
      wrongMoveCost: sanitizeCounselorFreeText(branch.wrongMoveCost || '', params.lang),
    })),
    singleUserModel: counselorCore?.singleUserModel
      ? {
          subject: sanitizeCounselorFreeText(counselorCore.singleUserModel.subject, params.lang),
          facets: counselorCore.singleUserModel.facets.map((facet) => ({
            ...facet,
            label: sanitizeCounselorFreeText(facet.label, params.lang),
            summary: sanitizeCounselorFreeText(facet.summary, params.lang),
            details: sanitizeCounselorTextList(facet.details || [], params.lang),
          })),
        }
      : undefined,
    singleSubjectView: counselorCore?.singleSubjectView
      ? {
          directAnswer: sanitizeCounselorFreeText(
            counselorCore.singleSubjectView.directAnswer,
            params.lang
          ),
          structureAxis: {
            ...counselorCore.singleSubjectView.structureAxis,
            label: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.structureAxis.label,
              params.lang
            ),
            thesis: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.structureAxis.thesis,
              params.lang
            ),
            topAxes: sanitizeCounselorTextList(
              counselorCore.singleSubjectView.structureAxis.topAxes || [],
              params.lang
            ),
          },
          actionAxis: {
            ...counselorCore.singleSubjectView.actionAxis,
            label: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.actionAxis.label,
              params.lang
            ),
            nowAction: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.actionAxis.nowAction,
              params.lang
            ),
            whyThisFirst: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.actionAxis.whyThisFirst,
              params.lang
            ),
          },
          riskAxis: {
            ...counselorCore.singleSubjectView.riskAxis,
            label: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.riskAxis.label,
              params.lang
            ),
            warning: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.riskAxis.warning,
              params.lang
            ),
            hardStops: sanitizeCounselorTextList(
              counselorCore.singleSubjectView.riskAxis.hardStops || [],
              params.lang
            ),
          },
          timingState: {
            ...counselorCore.singleSubjectView.timingState,
            bestWindow: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.timingState.bestWindow,
              params.lang
            ),
            whyNow: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.timingState.whyNow || '',
              params.lang
            ),
            whyNotYet: sanitizeCounselorFreeText(
              counselorCore.singleSubjectView.timingState.whyNotYet || '',
              params.lang
            ),
            windows: counselorCore.singleSubjectView.timingState.windows.map((window) => ({
              ...window,
              summary: sanitizeCounselorFreeText(window.summary, params.lang),
            })),
          },
          competingPressures: counselorCore.singleSubjectView.competingPressures.map(
            (pressure) => ({
              ...pressure,
              label: sanitizeCounselorFreeText(pressure.label, params.lang),
              nextWindow: sanitizeCounselorFreeText(pressure.nextWindow || '', params.lang),
              summary: sanitizeCounselorFreeText(pressure.summary, params.lang),
            })
          ),
          branches: counselorCore.singleSubjectView.branches.map((branch) => ({
            label: sanitizeCounselorFreeText(branch.label, params.lang),
            summary: sanitizeCounselorFreeText(branch.summary, params.lang),
            entryConditions: sanitizeCounselorTextList(branch.entryConditions || [], params.lang),
            abortConditions: sanitizeCounselorTextList(branch.abortConditions || [], params.lang),
            nextMove: sanitizeCounselorFreeText(branch.nextMove, params.lang),
          })),
          entryConditions: sanitizeCounselorTextList(
            counselorCore.singleSubjectView.entryConditions || [],
            params.lang
          ),
          abortConditions: sanitizeCounselorTextList(
            counselorCore.singleSubjectView.abortConditions || [],
            params.lang
          ),
          nextMove: sanitizeCounselorFreeText(
            counselorCore.singleSubjectView.nextMove,
            params.lang
          ),
          confidence: counselorCore.singleSubjectView.confidence,
          reliability: counselorCore.singleSubjectView.reliability
            ? {
                crossAgreement: counselorCore.singleSubjectView.reliability.crossAgreement,
                contradictionFlags: sanitizeCounselorTextList(
                  counselorCore.singleSubjectView.reliability.contradictionFlags || [],
                  params.lang
                ),
                notes: sanitizeCounselorTextList(
                  counselorCore.singleSubjectView.reliability.notes || [],
                  params.lang
                ),
              }
            : undefined,
        }
      : undefined,
    personModel: counselorCore?.personModel
      ? {
          subject: sanitizeCounselorFreeText(counselorCore.personModel.subject, params.lang),
          overview: sanitizeCounselorFreeText(counselorCore.personModel.overview, params.lang),
          structuralCore: {
            ...counselorCore.personModel.structuralCore,
            overview: sanitizeCounselorFreeText(
              counselorCore.personModel.structuralCore.overview,
              params.lang
            ),
            latentAxes: sanitizeCounselorTextList(
              counselorCore.personModel.structuralCore.latentAxes || [],
              params.lang
            ),
          },
          formationProfile: {
            ...counselorCore.personModel.formationProfile,
            summary: sanitizeCounselorFreeText(
              counselorCore.personModel.formationProfile.summary,
              params.lang
            ),
            repeatedPatternFamilies: sanitizeCounselorTextList(
              counselorCore.personModel.formationProfile.repeatedPatternFamilies || [],
              params.lang
            ),
            dominantLatentGroups: sanitizeCounselorTextList(
              counselorCore.personModel.formationProfile.dominantLatentGroups || [],
              params.lang
            ),
            pressureHabits: sanitizeCounselorTextList(
              counselorCore.personModel.formationProfile.pressureHabits || [],
              params.lang
            ),
            supportHabits: sanitizeCounselorTextList(
              counselorCore.personModel.formationProfile.supportHabits || [],
              params.lang
            ),
          },
          timeProfile: {
            ...counselorCore.personModel.timeProfile,
            timingNarrative: sanitizeCounselorFreeText(
              counselorCore.personModel.timeProfile.timingNarrative,
              params.lang
            ),
            windows: counselorCore.personModel.timeProfile.windows.map((window) => ({
              ...window,
              label: sanitizeCounselorFreeText(window.label, params.lang),
              window: sanitizeCounselorFreeText(window.window, params.lang),
              granularity: sanitizeCounselorFreeText(window.granularity, params.lang),
              whyNow: sanitizeCounselorFreeText(window.whyNow, params.lang),
              entryConditions: sanitizeCounselorTextList(window.entryConditions || [], params.lang),
              abortConditions: sanitizeCounselorTextList(window.abortConditions || [], params.lang),
            })),
            activationSources: counselorCore.personModel.timeProfile.activationSources.map(
              (source) => ({
                ...source,
                label: sanitizeCounselorFreeText(source.label, params.lang),
              })
            ),
          },
          layers: counselorCore.personModel.layers.map((layer) => ({
            ...layer,
            label: sanitizeCounselorFreeText(layer.label, params.lang),
            summary: sanitizeCounselorFreeText(layer.summary, params.lang),
            bullets: sanitizeCounselorTextList(layer.bullets || [], params.lang),
          })),
          dimensions: counselorCore.personModel.dimensions.map((dimension) => ({
            ...dimension,
            label: sanitizeCounselorFreeText(dimension.label, params.lang),
            summary: sanitizeCounselorFreeText(dimension.summary, params.lang),
          })),
          domainStateGraph: counselorCore.personModel.domainStateGraph.map((state) => ({
            ...state,
            label: sanitizeCounselorFreeText(state.label, params.lang),
            thesis: sanitizeCounselorFreeText(state.thesis, params.lang),
            supportSignals: sanitizeCounselorTextList(state.supportSignals || [], params.lang),
            pressureSignals: sanitizeCounselorTextList(state.pressureSignals || [], params.lang),
            firstMove: sanitizeCounselorFreeText(state.firstMove, params.lang),
            holdMove: sanitizeCounselorFreeText(state.holdMove, params.lang),
            timescales: (state.timescales || []).map((timescale) => ({
              ...timescale,
              thesis: sanitizeCounselorFreeText(timescale.thesis, params.lang),
              entryConditions: sanitizeCounselorTextList(
                timescale.entryConditions || [],
                params.lang
              ),
              abortConditions: sanitizeCounselorTextList(
                timescale.abortConditions || [],
                params.lang
              ),
            })),
          })),
          domainPortraits: counselorCore.personModel.domainPortraits.map((portrait) => ({
            ...portrait,
            label: sanitizeCounselorFreeText(portrait.label, params.lang),
            summary: sanitizeCounselorFreeText(portrait.summary, params.lang),
            baselineThesis: sanitizeCounselorFreeText(portrait.baselineThesis, params.lang),
            activationThesis: sanitizeCounselorFreeText(portrait.activationThesis, params.lang),
            likelyExpressions: sanitizeCounselorTextList(
              portrait.likelyExpressions || [],
              params.lang
            ),
            riskExpressions: sanitizeCounselorTextList(portrait.riskExpressions || [], params.lang),
            allowedActions: sanitizeCounselorTextList(portrait.allowedActions || [], params.lang),
            blockedActions: sanitizeCounselorTextList(portrait.blockedActions || [], params.lang),
          })),
          states: counselorCore.personModel.states.map((state) => ({
            ...state,
            label: sanitizeCounselorFreeText(state.label, params.lang),
            summary: sanitizeCounselorFreeText(state.summary, params.lang),
            drivers: sanitizeCounselorTextList(state.drivers || [], params.lang),
            counterweights: sanitizeCounselorTextList(state.counterweights || [], params.lang),
          })),
          appliedProfile: {
            foodProfile: {
              ...counselorCore.personModel.appliedProfile.foodProfile,
              summary: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.foodProfile.summary,
                params.lang
              ),
              thermalBias: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.foodProfile.thermalBias,
                params.lang
              ),
              digestionStyle: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.foodProfile.digestionStyle,
                params.lang
              ),
              helpfulFoods: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.foodProfile.helpfulFoods || [],
                params.lang
              ),
              cautionFoods: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.foodProfile.cautionFoods || [],
                params.lang
              ),
              rhythmGuidance: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.foodProfile.rhythmGuidance || [],
                params.lang
              ),
            },
            lifeRhythmProfile: {
              ...counselorCore.personModel.appliedProfile.lifeRhythmProfile,
              summary: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.lifeRhythmProfile.summary,
                params.lang
              ),
              peakWindows: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.lifeRhythmProfile.peakWindows || [],
                params.lang
              ),
              recoveryWindows: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.lifeRhythmProfile.recoveryWindows || [],
                params.lang
              ),
              stressBehaviors: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.lifeRhythmProfile.stressBehaviors || [],
                params.lang
              ),
              regulationMoves: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.lifeRhythmProfile.regulationMoves || [],
                params.lang
              ),
            },
            relationshipStyleProfile: {
              ...counselorCore.personModel.appliedProfile.relationshipStyleProfile,
              summary: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.relationshipStyleProfile.summary,
                params.lang
              ),
              attractionPatterns: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.relationshipStyleProfile
                  .attractionPatterns || [],
                params.lang
              ),
              stabilizers: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.relationshipStyleProfile.stabilizers || [],
                params.lang
              ),
              ruptureTriggers: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.relationshipStyleProfile.ruptureTriggers ||
                  [],
                params.lang
              ),
              repairMoves: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.relationshipStyleProfile.repairMoves || [],
                params.lang
              ),
            },
            workStyleProfile: {
              ...counselorCore.personModel.appliedProfile.workStyleProfile,
              summary: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.workStyleProfile.summary,
                params.lang
              ),
              bestRoles: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.workStyleProfile.bestRoles || [],
                params.lang
              ),
              bestConditions: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.workStyleProfile.bestConditions || [],
                params.lang
              ),
              fatigueTriggers: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.workStyleProfile.fatigueTriggers || [],
                params.lang
              ),
              leverageMoves: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.workStyleProfile.leverageMoves || [],
                params.lang
              ),
            },
            moneyStyleProfile: {
              ...counselorCore.personModel.appliedProfile.moneyStyleProfile,
              summary: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.moneyStyleProfile.summary,
                params.lang
              ),
              earningPattern: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.moneyStyleProfile.earningPattern || [],
                params.lang
              ),
              savingPattern: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.moneyStyleProfile.savingPattern || [],
                params.lang
              ),
              leakageRisks: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.moneyStyleProfile.leakageRisks || [],
                params.lang
              ),
              controlRules: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.moneyStyleProfile.controlRules || [],
                params.lang
              ),
            },
            environmentProfile: {
              ...counselorCore.personModel.appliedProfile.environmentProfile,
              summary: sanitizeCounselorFreeText(
                counselorCore.personModel.appliedProfile.environmentProfile.summary,
                params.lang
              ),
              preferredSettings: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.environmentProfile.preferredSettings || [],
                params.lang
              ),
              drainSignals: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.environmentProfile.drainSignals || [],
                params.lang
              ),
              resetActions: sanitizeCounselorTextList(
                counselorCore.personModel.appliedProfile.environmentProfile.resetActions || [],
                params.lang
              ),
            },
          },
          relationshipProfile: {
            ...counselorCore.personModel.relationshipProfile,
            summary: sanitizeCounselorFreeText(
              counselorCore.personModel.relationshipProfile.summary,
              params.lang
            ),
            partnerArchetypes: sanitizeCounselorTextList(
              counselorCore.personModel.relationshipProfile.partnerArchetypes || [],
              params.lang
            ),
            inflowPaths: sanitizeCounselorTextList(
              counselorCore.personModel.relationshipProfile.inflowPaths || [],
              params.lang
            ),
            commitmentConditions: sanitizeCounselorTextList(
              counselorCore.personModel.relationshipProfile.commitmentConditions || [],
              params.lang
            ),
            breakPatterns: sanitizeCounselorTextList(
              counselorCore.personModel.relationshipProfile.breakPatterns || [],
              params.lang
            ),
          },
          careerProfile: {
            ...counselorCore.personModel.careerProfile,
            summary: sanitizeCounselorFreeText(
              counselorCore.personModel.careerProfile.summary,
              params.lang
            ),
            suitableLanes: sanitizeCounselorTextList(
              counselorCore.personModel.careerProfile.suitableLanes || [],
              params.lang
            ),
            executionStyle: sanitizeCounselorTextList(
              counselorCore.personModel.careerProfile.executionStyle || [],
              params.lang
            ),
            hiringTriggers: sanitizeCounselorTextList(
              counselorCore.personModel.careerProfile.hiringTriggers || [],
              params.lang
            ),
            blockers: sanitizeCounselorTextList(
              counselorCore.personModel.careerProfile.blockers || [],
              params.lang
            ),
          },
          futureBranches: counselorCore.personModel.futureBranches.map((branch) => ({
            ...branch,
            label: sanitizeCounselorFreeText(branch.label, params.lang),
            summary: sanitizeCounselorFreeText(branch.summary, params.lang),
            conditions: sanitizeCounselorTextList(branch.conditions || [], params.lang),
            blockers: sanitizeCounselorTextList(branch.blockers || [], params.lang),
          })),
          eventOutlook: counselorCore.personModel.eventOutlook.map((event) => ({
            ...event,
            label: sanitizeCounselorFreeText(event.label, params.lang),
            summary: sanitizeCounselorFreeText(event.summary, params.lang),
            bestWindow: sanitizeCounselorFreeText(event.bestWindow || '', params.lang),
            entryConditions: sanitizeCounselorTextList(event.entryConditions || [], params.lang),
            abortConditions: sanitizeCounselorTextList(event.abortConditions || [], params.lang),
            nextMove: sanitizeCounselorFreeText(event.nextMove, params.lang),
          })),
          uncertaintyEnvelope: {
            ...counselorCore.personModel.uncertaintyEnvelope,
            summary: sanitizeCounselorFreeText(
              counselorCore.personModel.uncertaintyEnvelope.summary,
              params.lang
            ),
            reliableAreas: sanitizeCounselorTextList(
              counselorCore.personModel.uncertaintyEnvelope.reliableAreas || [],
              params.lang
            ),
            conditionalAreas: sanitizeCounselorTextList(
              counselorCore.personModel.uncertaintyEnvelope.conditionalAreas || [],
              params.lang
            ),
            unresolvedAreas: sanitizeCounselorTextList(
              counselorCore.personModel.uncertaintyEnvelope.unresolvedAreas || [],
              params.lang
            ),
          },
          evidenceLedger: {
            ...counselorCore.personModel.evidenceLedger,
            coherenceNotes: sanitizeCounselorTextList(
              counselorCore.personModel.evidenceLedger.coherenceNotes || [],
              params.lang
            ),
            contradictionFlags: sanitizeCounselorTextList(
              counselorCore.personModel.evidenceLedger.contradictionFlags || [],
              params.lang
            ),
          },
        }
      : undefined,
    timingMatrix: (counselorCore?.timingMatrix || []).slice(0, 4).map((item) => ({
      domain: item.domain,
      label: item.label,
      window: item.window,
      granularity: item.granularity,
      confidence: item.confidence,
      summary: sanitizeCounselorFreeText(item.summary, params.lang),
    })),
    verdict: sanitizeCounselorFreeText(verdict, params.lang),
    guardrail: sanitizeCounselorFreeText(counselorCore?.primaryCaution || guardrail, params.lang),
    topAnchorSummary,
    graphRagEvidenceSummary,
    topAnchors: prioritizedAnchors.map((anchor) => ({
      id: anchor.id,
      section: anchor.section,
      summary: summarizeAnchor(anchor),
      setCount: anchor.setCount,
    })),
    topClaims: prioritizedClaims.map((claim) => ({
      id: claim.id,
      text: summarizeClaim(claim),
      domain: claim.domain,
      signalIds: claim.selectedSignalIds.slice(0, 8),
      anchorIds: claim.anchorIds.slice(0, 6),
      provenanceSummary: describeProvenanceSummary({
        sourceFields: counselorCore?.claimProvenanceById?.[claim.id]?.sourceFields || [],
        sourceSetIds: counselorCore?.claimProvenanceById?.[claim.id]?.sourceSetIds || [],
        sourceRuleIds: counselorCore?.claimProvenanceById?.[claim.id]?.sourceRuleIds || [],
        lang: params.lang,
      }),
    })),
    scenarioBriefs: prioritizedScenarioBundles.map((bundle: UnifiedScenarioBundle) => ({
      id: bundle.id,
      domain: bundle.domain,
      mainTokens: (bundle.main.summaryTokens || []).slice(0, 8),
      altTokens: (bundle.alt || []).flatMap((alt) => alt.summaryTokens || []).slice(0, 8),
    })),
    selectedSignals: prioritizedSignals.map((signal) => ({
      id: signal.id,
      domain: signal.domainHints[0] || 'personality',
      polarity: signal.polarity,
      summary: `${signal.keyword}: ${(signal.sajuBasis || signal.astroBasis || signal.advice || '').slice(0, 180)}`,
      score: signal.score,
    })),
    strategyBrief: {
      overallPhase: counselorCore?.phase || params.strategyEngine.overallPhase,
      overallPhaseLabel: counselorCore?.phaseLabel || params.strategyEngine.overallPhaseLabel,
      attackPercent: params.strategyEngine.attackPercent,
      defensePercent: params.strategyEngine.defensePercent,
    },
    canonicalBrief: counselorCore
      ? buildSanitizedCanonicalBrief({
          counselorCore,
          lang: params.lang,
          topDecisionLeadLabel: topDecisionLeadLabel || undefined,
          scenarioActionHints,
        })
      : undefined,
    topDomainAdvisory: topDomainAdvisory
      ? {
          domain: topDomainAdvisory.domain,
          thesis: sanitizeCounselorFreeText(topDomainAdvisory.thesis, params.lang),
          action: sanitizeCounselorFreeText(
            [topDomainAdvisory.action, ...scenarioActionHints].filter(Boolean).join(' / '),
            params.lang
          ),
          caution: sanitizeCounselorFreeText(topDomainAdvisory.caution, params.lang),
          timingHint: sanitizeCounselorFreeText(topDomainAdvisory.timingHint, params.lang),
          strategyLine: sanitizeCounselorFreeText(topDomainAdvisory.strategyLine, params.lang),
        }
      : undefined,
    topTimingWindow: topTimingWindow
      ? {
          domain: topTimingWindow.domain,
          window: topTimingWindow.window,
          timingGranularity: topTimingWindow.timingGranularity,
          timingReliabilityBand: params.matrixSummary?.timingCalibration?.reliabilityBand,
          timingReliabilityScore: params.matrixSummary?.timingCalibration?.reliabilityScore,
          readinessScore: topTimingWindow.readinessScore,
          triggerScore: topTimingWindow.triggerScore,
          convergenceScore: topTimingWindow.convergenceScore,
          precisionReason: sanitizeCounselorFreeText(topTimingWindow.precisionReason, params.lang),
          timingConflictMode: topTimingWindow.timingConflictMode,
          timingConflictNarrative: sanitizeCounselorFreeText(
            topTimingWindow.timingConflictNarrative,
            params.lang
          ),
          whyNow: sanitizeCounselorFreeText(topTimingWindow.whyNow, params.lang),
          entryConditions: sanitizeCounselorTextList(
            [...topTimingWindow.entryConditions].slice(0, 3),
            params.lang
          ),
          abortConditions: sanitizeCounselorTextList(
            [...topTimingWindow.abortConditions].slice(0, 3),
            params.lang
          ),
        }
      : undefined,
    topManifestation: topManifestation
      ? {
          domain: topManifestation.domain,
          baselineThesis: sanitizeCounselorFreeText(topManifestation.baselineThesis, params.lang),
          activationThesis: sanitizeCounselorFreeText(
            topManifestation.activationThesis,
            params.lang
          ),
          manifestation: sanitizeCounselorFreeText(topManifestation.manifestation, params.lang),
          likelyExpressions: sanitizeCounselorTextList(
            [...topManifestation.likelyExpressions].slice(0, 3),
            params.lang
          ),
          riskExpressions: sanitizeCounselorTextList(
            [...topManifestation.riskExpressions].slice(0, 3),
            params.lang
          ),
          timingWindow: topManifestation.timingWindow,
        }
      : undefined,
    projections: counselorCore
      ? {
          structure: sanitizeCounselorProjectionBlock(
            counselorCore.projections.structure,
            params.lang
          ),
          timing: sanitizeCounselorProjectionBlock(counselorCore.projections.timing, params.lang),
          conflict: sanitizeCounselorProjectionBlock(
            counselorCore.projections.conflict,
            params.lang
          ),
          action: sanitizeCounselorProjectionBlock(counselorCore.projections.action, params.lang),
          risk: sanitizeCounselorProjectionBlock(counselorCore.projections.risk, params.lang),
          evidence: sanitizeCounselorProjectionBlock(
            counselorCore.projections.evidence,
            params.lang
          ),
          branches: sanitizeCounselorProjectionBlock(
            counselorCore.projections.branches,
            params.lang
          ),
        }
      : undefined,
    whyStack: buildCounselorWhyStack({
      lang: params.lang,
      domain: preferredDomain,
      sajuReasons: whyReasons.sajuWhy ? [whyReasons.sajuWhy] : [],
      astroReasons: whyReasons.astroWhy ? [whyReasons.astroWhy] : [],
      crossSummary: crossSystemSummary || whyReasons.crossWhy,
      timingSummary: [
        topTimingWindow?.whyNow || '',
        topTimingWindow?.timingConflictNarrative || '',
        intraMonthPeakNarrative,
      ]
        .map((line) => sanitizeCounselorFreeText(line, params.lang))
        .filter(Boolean)
        .join(params.lang === 'ko' ? ' / ' : ' / '),
      decisionSummary: arbitrationNarrative,
      conflictSummary: conflictNarrative,
      calibrationSummary: [timingCalibrationNarrative, topTimingWindow?.precisionReason || '']
        .map((line) => sanitizeCounselorFreeText(line, params.lang))
        .filter(Boolean)
        .join(params.lang === 'ko' ? ' / ' : ' / '),
      trustSummary: trustNarrative,
      provenanceSummary: provenanceNarrative,
      latentSummary: latentNarrative,
      limit: 7,
    }),
  }
}

export function formatCounselorEvidencePacket(
  packet: CounselorEvidencePacketLike | null | undefined,
  lang: 'ko' | 'en'
): string {
  if (!packet || !packet.focusDomain) return ''

  const singleSubject = packet.singleSubjectView
  const actionBlock = packet.projections?.action
  const timingBlock = packet.projections?.timing
  const riskBlock = packet.projections?.risk
  const branchBlock = packet.projections?.branches
  const topBranches = (packet.branchSet || []).slice(0, 3)
  const openingWhyLines = (packet.whyStack || []).slice(0, 2)
  const branchCandidates =
    (singleSubject?.branches || []).length > 0
      ? (singleSubject?.branches || []).slice(0, 3).map((branch) => ({
          summary: branch.summary,
          entry: branch.entryConditions,
          abort: branch.abortConditions,
          nextMove: branch.nextMove,
        }))
      : topBranches.map((branch) => ({
          summary: branch.summary,
          entry: branch.entry || [],
          abort: branch.abort || [],
          nextMove: branch.sustain?.[0] || branch.entry?.[0] || '',
        }))
  const actionDetails = [
    ...(actionBlock?.detailLines || []).slice(0, 2),
    ...(actionBlock?.nextMoves || []).slice(0, 2),
  ].filter(Boolean)
  const timingDetails = [
    ...(timingBlock?.detailLines || []).slice(0, 2),
    ...(timingBlock?.counterweights || []).slice(0, 1),
  ].filter(Boolean)
  const riskDetails = [
    ...(riskBlock?.detailLines || []).slice(0, 2),
    ...(riskBlock?.counterweights || []).slice(0, 1),
  ].filter(Boolean)
  const keyEvidence = [
    ...(packet.projections?.structure?.drivers || []).slice(0, 1),
    ...(packet.projections?.evidence?.detailLines || []).slice(0, 2),
    ...(packet.projections?.evidence?.drivers || []).slice(0, 2),
  ]
    .filter(Boolean)
    .slice(0, 4)

  const commonLines = [
    '[Counselor Answer Plan]',
    `answer=${singleSubject?.directAnswer || packet.canonicalBrief?.answerThesis || actionBlock?.summary || 'none'}`,
    `action_focus=${packet.canonicalBrief?.actionFocusDomain || packet.focusDomain || 'none'}`,
    `risk_focus=${packet.riskAxisLabel || 'none'}`,
    `top_decision=${packet.canonicalBrief?.topDecisionLabel || packet.canonicalBrief?.topDecisionAction || 'none'}`,
    `opening_rationale=${singleSubject?.actionAxis.whyThisFirst || openingWhyLines[0] || packet.canonicalBrief?.answerThesis || 'none'}`,
    `next_move=${singleSubject?.nextMove || actionDetails[0] || 'none'}`,
    '',
    '[Current Read]',
    `current_direct=${singleSubject?.directAnswer || actionDetails[0] || 'none'}`,
    `current_why=${singleSubject?.actionAxis.whyThisFirst || actionDetails[1] || openingWhyLines[1] || 'none'}`,
    `current_risk=${singleSubject?.riskAxis.warning || riskDetails[0] || riskBlock?.summary || packet.guardrail || 'none'}`,
    '',
    '[Timing]',
    `window=${singleSubject?.timingState.bestWindow || packet.topTimingWindow?.window || 'none'}`,
    `why_now=${singleSubject?.timingState.whyNow || packet.topTimingWindow?.whyNow || timingBlock?.summary || 'none'}`,
    `why_not_yet=${singleSubject?.timingState.whyNotYet || packet.topTimingWindow?.timingConflictNarrative || 'none'}`,
    ...timingDetails.slice(0, 2).map((line, index) => `timing_${index + 1}=${line}`),
    '',
    '[Branch Options]',
    ...(branchCandidates.length > 0
      ? branchCandidates.flatMap((branch, index) => [
          `branch_${index + 1}=${branch.summary}`,
          ...(branch.entry || []).slice(0, 1).map((line) => `branch_${index + 1}_entry=${line}`),
          ...(branch.abort || []).slice(0, 1).map((line) => `branch_${index + 1}_stop=${line}`),
          ...(branch.nextMove ? [`branch_${index + 1}_next=${branch.nextMove}`] : []),
        ])
      : (branchBlock?.detailLines || [])
          .slice(0, 2)
          .map((line, index) => `branch_${index + 1}=${line}`)),
    '',
    '[Risk Guardrails]',
    `risk=${singleSubject?.riskAxis.warning || riskBlock?.summary || packet.guardrail || 'none'}`,
    ...(singleSubject?.riskAxis.hardStops || [])
      .slice(0, 2)
      .map((line, index) => `hard_stop_${index + 1}=${line}`),
    '',
    '[Evidence Cues]',
    ...(keyEvidence.length > 0
      ? keyEvidence.slice(0, 3).map((line, index) => `evidence_${index + 1}=${line}`)
      : ['evidence_1=none']),
    '',
  ]

  const responseContractKo = [
    '- 첫 문장은 질문에 대한 직접 답으로 시작하고, 둘째 문장 안에서 현재 국면을 단정적으로 정리하세요.',
    '- 첫 두 문장에는 current_direct, current_why, next_move의 핵심을 흡수해 왜 지금 이런 답이 나오는지 바로 이해되게 쓰세요.',
    '- 다음 문단에서는 structure, timing, why_now, why_not_yet를 함께 설명하고 준비도와 촉발 조건의 어긋남이 있으면 분명히 적으세요.',
    '- 그 다음 문단에서는 action과 risk를 같이 다루세요. 지금 할 것, 미룰 것, 서두르면 손해인 이유를 분리해서 적으세요.',
    '- 가능하면 Branch Options를 사용해 2~3개의 현실 경로를 구분하세요. 정답 하나처럼 몰아가지 마세요.',
    '- 마지막 문단에는 Risk Guardrails와 재확인 기준을 넣으세요. 사인, 확정, 송금, 결제 같은 비가역 행동은 성급히 밀지 마세요.',
    '- Direct Answer Seed, Timing, Action, Risk, Branch Options, Evidence Cues를 우선 사용하고 엔진 라벨을 그대로 반복하지 마세요.',
    '- 문체는 상담사처럼 짧고 단정하게 유지하세요. 추상 명사만 늘어놓지 말고 실제 행동 문장으로 마무리하세요.',
    '- 전체 분량은 650~1100자 사이의 자연스러운 한국어 답변으로 맞추세요.',
  ]

  if (lang === 'ko') {
    return [...commonLines, '[Response Contract]', ...responseContractKo].join('\n')
  }

  if (responseContractKo.length < 0) {
    return [
      ...commonLines,
      '[Response Contract]',
      '- 첫 문장은 질문에 대한 직접 답으로 시작하고, 둘째 문장 안에서 현재 국면을 단정적으로 정리하세요.',
      '- 첫 두 문장에는 opening_rationale_1과 opening_rationale_2의 핵심을 흡수해 왜 이런 결론이 나왔는지 바로 이해되게 하세요.',
      '- 그 다음 문단에서는 구조와 타이밍을 함께 설명하고, 준비도와 촉발의 어긋남이 있으면 분명히 적으세요.',
      '- 다음 문단에서는 행동과 리스크를 같이 설명하세요. 지금 할 것, 미룰 것, 서두르면 손해인 이유를 분리해서 적으세요.',
      '- 답변은 한 줄 운세처럼 쓰지 말고 구조, 주기, 촉발, 리스크, 행동, 보정이 함께 보이게 쓰세요.',
      '- 가능한 경우 Branch Options를 사용해 2~3개의 현실 경로를 구분하세요. 정답 하나처럼 몰아가지 마세요.',
      '- 마지막 문단에는 위험 신호와 재확인 기준을 넣으세요. 사인, 확정, 송금, 결제 같은 비가역 행동은 섣불리 밀지 마세요.',
      '- Direct Answer Seed, Timing, Action, Risk, Branch Options, Evidence Cues를 우선 사용하고, 엔진 라벨을 그대로 반복하지 마세요.',
      '- 문체는 상담사처럼 짧고 단정하게 유지하세요. 추상 명사만 늘어놓지 말고 실제 행동 문장으로 마무리하세요.',
      '- 전체 분량은 650~1100자 사이의 자연스러운 한국어 답변으로 맞추세요.',
    ].join('\n')
  }

  return [
    ...commonLines,
    '[Response Contract]',
    '- Open with a direct answer and a declarative read of the current phase.',
    '- In those first two sentences, explicitly absorb opening_rationale_1 and opening_rationale_2 so the user immediately understands why this conclusion is being made.',
    '- In the second paragraph, explain structure and timing together, and explicitly name any readiness/trigger/convergence mismatch.',
    '- In the third paragraph, translate conflict into action: what to do now, what to delay, and why.',
    '- Make the answer reflect structure, cycle, trigger, risk, action, and calibration rather than one flat verdict.',
    '- When possible, do not present a single fixed destiny; use Branch Options to distinguish 2-3 realistic paths.',
    '- End with risk and a recheck checklist; if caution signals exist, do not push irreversible actions (sign/finalize/send/pay) immediately.',
    '- Prefer Direct Answer Seed, Timing, Action, Risk, Branch Options, and Evidence Cues over raw engine labels.',
  ].join('\n')
}
