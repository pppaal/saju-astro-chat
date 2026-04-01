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

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function buildDomainSpecificWhyReasons(input: {
  domain: string
  lang: 'ko' | 'en'
  yongsin?: string
  currentDaeunElement?: string
  geokguk?: string
  activeTransits?: string[]
  aspectsCount?: number
  graphFocusReason?: string
  graphReason?: string
  strategyLine?: string
  answerThesis?: string
}): {
  sajuWhy: string
  astroWhy: string
  crossWhy: string
  graphWhy: string
} {
  const {
    domain,
    lang,
    yongsin,
    currentDaeunElement,
    geokguk,
    activeTransits = [],
    aspectsCount = 0,
    graphFocusReason,
    graphReason,
    strategyLine,
    answerThesis,
  } = input

  if (lang !== 'ko') {
    const genericSaju =
      yongsin && currentDaeunElement
        ? yongsin === currentDaeunElement
          ? `the current 10-year cycle matches the useful element (${yongsin}), so the broader pattern is supportive`
          : `the current 10-year cycle (${currentDaeunElement}) does not fully match the useful element (${yongsin}), so pace control matters`
        : geokguk
          ? `the pattern frame (${geokguk}) sets the baseline temperament of this issue`
          : `the broader pattern sets the baseline direction of the issue`
    const genericAstro =
      activeTransits.length > 0
        ? `active transits like ${activeTransits.slice(0, 2).join(', ')} are changing timing and reaction speed`
        : aspectsCount > 0
          ? `the natal chart geometry explains which scene becomes visible first`
          : `astrology is mainly reinforcing timing and variable management`
    return {
      sajuWhy: genericSaju,
      astroWhy: genericAstro,
      crossWhy:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        'the overlapping signals point to the same decision axis first',
      graphWhy:
        graphReason ||
        'the top evidence bundle is ranked first because its overlap and fit are stronger than the surrounding sets',
    }
  }

  const byDomain: Record<
    string,
    {
      saju: string
      astro: string
      cross: string
      graph: string
    }
  > = {
    relationship: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ??? ?? ?? ??? ?? ???? ???? ??? ?? ?????.`
            : `?? ?? ?? ?? ??? ???? ???? ?? ??? ?????.`
          : `??? ?? ?? ?? ???? ?? ???? ?? ??? ???? ?? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)}? ?? ??? ?? ???? ??? ??? ?? ?????.`
          : `?? ? ?? ??? ????, ??? ??? ???? ??? ?? ? ????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '??? ???? ?? ??? ?? ??? ?? ??? ????? ????.',
      graph:
        graphReason ||
        '?? ??? ?? ???? ?? ??? ?? ??? ?? ?????.',
    },
    career: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ??? ?? ?? ??? ??? ??? ?? ??? ?? ?????.`
            : `?? ?? ?? ?? ???? ???? ?? ??? ??? ??? ?????.`
          : `??? ?? ?? ?? ?? ?? ?? ??? ???? ??? ?? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)}? ?? ??? ??? ??? ???, ?? ??? ?? ??? ?? ???? ???.`
          : `?? ? ??? ????, ??? ?? ??? ?? ??? ??? ?? ????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '???? ?? ???? ?? ??? ?? ??? ?? ???? ??? ?????.',
      graph:
        graphReason ||
        '?? ?? ??? ?? ???? ?? ???? ?? ?? ??? ?? ?????.',
    },
    wealth: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ?? ??? ??(${yongsin})? ?? ?? ??? ?? ??? ???, ??? ?? ???? ???? ????.`
            : `?? ?? ??(${currentDaeunElement})? ??(${yongsin})? ??? ?? ???? ??? ?? ???? ?? ???.`
          : `????? ??? ????? ??? ?? ???? ?? ??? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} ?? ?? ??? ?? ???, ?? ??, ?? ??? ?? ????.`
          : `?? ?? ???? ??, ?? ??, ?? ?? ? ??? ?????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '??? ?? ???? ??, ??, ?? ??? ?? ??? ?? ??? ??? ????.',
      graph:
        graphReason ||
        '?? ?? ??? ???? ?? ??, ????, ?? ??? ?? ?? ??? ??? ?? ???.',
    },
    health: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ?? ??? ??(${yongsin})? ?? ?? ??? ?? ??? ??? ???? ?? ?????.`
            : `?? ?? ??(${currentDaeunElement})? ??(${yongsin})? ??? ?? ??? ???? ?? ?? ??? ?????.`
          : `????? ???? ?? ??? ??? ???? ????? ?? ??? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} ?? ?? ??? ?? ??, ?? ???, ??? ???? ?? ?????.`
          : `?? ?? ? ??? ?? ???? ?? ?? ??? ??? ?? ?? ???? ?????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '??? ??? ????? ??? ?? ??? ??? ??? ???? ??? ??? ????.',
      graph:
        graphReason ||
        '?? ?? ??? ???? ?? ??, ?? ??, ?? ??? ?? ?? ??? ??? ?? ????.',
    },
    move: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ?? ??? ??(${yongsin})? ?? ???? ?? ???? ? ??? ?? ?? ?????.`
            : `?? ?? ??(${currentDaeunElement})? ??(${yongsin})? ??? ?? ?? ????? ??? ?? ??? ?? ?? ?? ????.`
          : `????? ????? ?? ??? ?? ??? ??? ?? ??? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} ?? ?? ??? ??, ?? ??, ?? ?? ?? ??? ??? ????.`
          : `?? ?? ?? ?? ?? ???, ?? ?? ?? ??? ???? ??? ?????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '??? ? ?? ???? ??? ??? ??? ??? ?? ???? ??? ??? ????.',
      graph:
        graphReason ||
        '?? ?? ??? ???? ?? ???, ?? ??, ?? ???? ?? ???? ??? ?? ???.',
    },
    timing: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ?? ??? ??(${yongsin})? ?? ? ??? ?? ???? ??? ?? ???? ???.`
            : `?? ?? ??(${currentDaeunElement})? ??(${yongsin})? ??? ?? ?? ??? ? ????? ?? ?? ????.`
          : `?????? ? ??? ??????? ?? ?? ?????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} ?? ?? ??? ?? ??? ?? ????? ?? ?? ?? ??? ????.`
          : `?? ?? ??? ??? ??? ? ???? ?????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '???? ?? ??? ???? ??? ??? ?? ??? ??? ???? ??? ??? ????.',
      graph:
        graphReason ||
        '?? ?? ??? ????? ??? ??? ??? ? ??? ?? ??? ??? ?? ????.',
    },
    personality: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ?? ??? ??(${yongsin})? ?? ?? ??? ? ? ???? ?????.`
            : `?? ?? ??(${currentDaeunElement})? ??(${yongsin})? ??? ?? ?? ???? ?? ??? ?? ????? ????.`
          : `????? ?? ?? ???? ???, ??? ?????? ?? ??? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} ?? ?? ??? ?? ??? ?? ??? ????? ????.`
          : `?? ?? ?? ??? ?? ???? ? ??? ????? ?????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '??? ??? ??? ?? ??, ??? ????? ?? ??? ??? ????.',
      graph:
        graphReason ||
        '?? ?? ??? ???? ???? ?? ??? ? ??? ?? ? ???? ??? ?? ???.',
    },
    spirituality: {
      saju:
        yongsin && currentDaeunElement
          ? yongsin === currentDaeunElement
            ? `?? ?? ??? ??(${yongsin})? ?? ?? ??? ?? ??? ?? ??? ?? ?????.`
            : `?? ?? ??(${currentDaeunElement})? ??(${yongsin})? ??? ?? ???? ?? ?????? ?? ??? ?? ???? ?? ????.`
          : `??? ?? ????? ?? ???? ??? ?? ????? ??? ?? ??? ????.`,
      astro:
        activeTransits.length > 0
          ? `${formatTransitLabels(activeTransits, lang)} ?? ?? ??? ?? ??? ?? ??? ?? ??? ?? ????.`
          : `?? ?? ?? ??? ?? ??? ???? ?? ?????? ?????.`,
      cross:
        strategyLine ||
        answerThesis ||
        graphFocusReason ||
        '?? ??? ??? ???? ??? ?? ????? ??? ??? ??? ??? ????.',
      graph:
        graphReason ||
        '?? ?? ??? ?? ???? ?? ??? ?? ??? ?? ? ???? ??? ?? ???.',
    },
  }

  const selected = byDomain[domain] || byDomain.personality
  return {
    sajuWhy: selected.saju,
    astroWhy: selected.astro,
    crossWhy: selected.cross,
    graphWhy: selected.graph,
  }
}

function domainHintsForSection(sectionPath: string, focusDomain: string): string[] {
  switch (sectionPath) {
    case 'overview':
      return uniq([focusDomain, 'personality', 'timing'])
    case 'patterns':
      return uniq([focusDomain, 'personality'])
    case 'timing':
      return uniq(['timing', focusDomain])
    case 'recommendations':
    case 'actionPlan':
      return uniq([focusDomain, 'timing'])
    default:
      return [focusDomain]
  }
}

function toEvidenceRefs(
  sectionPath: string,
  focusDomain: string,
  signalSynthesis: SignalSynthesisResult
): ReportEvidenceRef[] {
  const domainHints = domainHintsForSection(sectionPath, focusDomain)
  const selected = (signalSynthesis.selectedSignals || [])
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
  const prioritized = selected.filter((signal) =>
    signal.domainHints.some((domain) => domainHints.includes(domain))
  )
  const fallback = selected.slice(0, 8)
  const source = (prioritized.length > 0 ? prioritized : fallback).slice(0, 8)

  return source.map((signal) => ({
    id: signal.id,
    domain: signal.domainHints[0],
    layer: signal.layer,
    rowKey: signal.rowKey,
    colKey: signal.colKey,
    keyword: signal.keyword,
    sajuBasis: signal.sajuBasis,
    astroBasis: signal.astroBasis,
    score: signal.score,
  }))
}

function mergeUniqueSignals(signalSynthesis: SignalSynthesisResult): NormalizedSignal[] {
  const seen = new Set<string>()
  const ordered = [
    ...(signalSynthesis.selectedSignals || []),
    ...(signalSynthesis.normalizedSignals || []),
  ]
  const out: NormalizedSignal[] = []
  for (const signal of ordered) {
    if (!signal?.id || seen.has(signal.id)) continue
    seen.add(signal.id)
    out.push(signal)
  }
  return out
}

function scoreCounselorSignal(
  signal: NormalizedSignal,
  focusDomain: string,
  sectionPath: string | undefined,
  isSelected: boolean
): number {
  const signalDomains = signal.domainHints || []
  const matchesFocusLead = signalDomains[0] === focusDomain
  const matchesFocusAny = signalDomains.some((domain) => domain === focusDomain)
  const sectionHints = sectionPath
    ? domainHintsForSection(sectionPath, focusDomain as InsightDomain)
    : []
  const matchesSectionLead =
    sectionHints.length > 0 && signalDomains[0] && sectionHints.includes(signalDomains[0])
  const matchesSectionAny = sectionHints.some((hint) =>
    signalDomains.some((domain) => domain === hint)
  )
  return (
    (matchesFocusLead ? 120 : 0) +
    (matchesFocusAny ? 80 : 0) +
    (matchesSectionLead ? 48 : 0) +
    (matchesSectionAny ? 24 : 0) +
    (isSelected ? 12 : 0) +
    signal.rankScore
  )
}

function rankCounselorSignals(
  signalSynthesis: SignalSynthesisResult,
  focusDomain: string,
  sectionPath?: string
): NormalizedSignal[] {
  const selectedIds = new Set((signalSynthesis.selectedSignals || []).map((signal) => signal.id))
  return mergeUniqueSignals(signalSynthesis)
    .slice()
    .sort((a, b) => {
      const delta =
        scoreCounselorSignal(b, focusDomain, sectionPath, selectedIds.has(b.id)) -
        scoreCounselorSignal(a, focusDomain, sectionPath, selectedIds.has(a.id))
      if (delta !== 0) return delta
      return b.rankScore - a.rankScore
    })
}

function summarizeAnchor(anchor: UnifiedAnchor): string {
  const normalized = anchor.crossEvidenceSummary.replace(/\s+/g, ' ').trim()
  if (normalized.length <= 180) return normalized
  const candidate = normalized.slice(0, 180)
  const lastBoundary = Math.max(candidate.lastIndexOf(' '), candidate.lastIndexOf('|'))
  return `${candidate.slice(0, lastBoundary > 72 ? lastBoundary : 180).trim()}...`
}

function summarizeClaim(claim: UnifiedClaim): string {
  return claim.text.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function compactCounselorNarrative(
  text: string | undefined,
  lang: 'ko' | 'en',
  maxSentences: number
): string {
  const cleaned = sanitizeCounselorFreeText(text, lang).replace(/\s+/g, ' ').trim()
  if (!cleaned) return ''
  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  if (sentences.length === 0) return cleaned
  return sentences.slice(0, maxSentences).join(' ').trim()
}

function isInsightDomain(domain: string): domain is InsightDomain {
  return (
    domain === 'personality' ||
    domain === 'career' ||
    domain === 'relationship' ||
    domain === 'wealth' ||
    domain === 'health' ||
    domain === 'spirituality' ||
    domain === 'timing'
  )
}

function getGraphRagFocusDomain(domain: SignalDomain): GraphRAGDomain {
  if (domain === 'move') return 'move'
  return isInsightDomain(domain) ? domain : 'personality'
}

function getCounselorDomainPriority(domain: SignalDomain): string[] {
  if (domain === 'move') return ['move', 'timing', 'spirituality']
  return [domain]
}

function inferScenarioSectionHints(scenarioIds: string[]): string[] {
  const hints = new Set<string>()
  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (
      /boundary|distance|commitment|cohabitation|family_acceptance|reconciliation|separation|clarify/.test(
        key
      )
    ) {
      hints.add('relationshipDynamics')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/promotion|contract|manager|specialist|authority|entry|restart|role/.test(key)) {
      hints.add('careerPath')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/income|asset|capital|debt|expense|cashflow|pricing/.test(key)) {
      hints.add('wealthPotential')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/recovery|burnout|sleep|inflammation|routine|load/.test(key)) {
      hints.add('recommendations')
      hints.add('actionPlan')
      hints.add('timing')
    }
    if (/travel|relocation|housing|lease|route|commute|basecamp|cross_border|foreign/.test(key)) {
      hints.add('timing')
      hints.add('actionPlan')
      hints.add('overview')
    }
  }
  return [...hints]
}

function buildScenarioActionHints(scenarioIds: string[], lang: 'ko' | 'en'): string[] {
  const hints = new Set<string>()
  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (/clarify_expectations/.test(key)) {
      hints.add(lang === 'ko' ? '???? ???? ?? ????' : 'clarify expectations first')
    }
    if (/distance_tuning/.test(key)) {
      hints.add(lang === 'ko' ? '??? ???? ????' : 'tune distance and pace')
    }
    if (/boundary_reset/.test(key)) {
      hints.add(lang === 'ko' ? '????? ?? ???' : 'reset the boundary')
    }
    if (/commitment_preparation/.test(key)) {
      hints.add(
        lang === 'ko' ? '??? ??? ?? ???? ???' : 'prepare before defining commitment'
      )
    }
    if (/route_recheck/.test(key)) {
      hints.add(lang === 'ko' ? '???? ?? ????' : 'recheck the route first')
    }
    if (/commute_restructure/.test(key)) {
      hints.add(lang === 'ko' ? '?? ???? ?????' : 'restructure the commute')
    }
    if (/basecamp_reset/.test(key)) {
      hints.add(lang === 'ko' ? '???? ?? ????' : 'reset the base of operations')
    }
    if (/lease_decision/.test(key)) {
      hints.add(
        lang === 'ko'
          ? '?? ???? ?? ????'
          : 'renegotiate the lease terms'
      )
    }
    if (/promotion_review/.test(key)) {
      hints.add(lang === 'ko' ? '??/?? ???? ?? ????' : 'review the promotion case first')
    }
    if (/contract_negotiation/.test(key)) {
      hints.add(lang === 'ko' ? '???? ?? ????' : 'negotiate the terms first')
    }
    if (/debt_restructure/.test(key)) {
      hints.add(
        lang === 'ko' ? '?? ?? ?? ???? ?????' : 'restructure the debt before expanding'
      )
    }
    if (/capital_allocation/.test(key)) {
      hints.add(lang === 'ko' ? '?? ???? ?? ????' : 'review capital allocation first')
    }
    if (/recovery_reset|recovery_compliance/.test(key)) {
      hints.add(
        lang === 'ko' ? '?? ???? ?? ???' : 'restore the recovery routine first'
      )
    }
  }
  return [...hints].slice(0, 3)
}

function buildPacketGuardrail(
  phase: StrategyEngineResult['overallPhase'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (phase === 'expansion') return '??? ?? ???, ?? ? ?? ??? ? ? ? ?????.'
    if (phase === 'high_tension_expansion')
      return '??? ??? ??, ?, ???? ?? ?????.'
    if (phase === 'expansion_guarded') return '?????? ?? ??? ?? ??? ????.'
    if (phase === 'stabilize') return '? ???? ?? ??? ?? ??? ?????.'
    return '??, ??, ?? ???? ?? ?? ?? ??? ????.'
  }

  if (phase === 'expansion') return 'Move forward, but force one counter-check before committing.'
  if (phase === 'high_tension_expansion')
    return 'Keep momentum, but double-check documents, money, and commitments first.'
  if (phase === 'expansion_guarded')
    return 'Take the opportunity only after your checklist is complete.'
  if (phase === 'stabilize') return 'Prioritize structural alignment before new expansion.'
  return 'Contain loss, confusion, and overspeed before starting something new.'
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
    compactCounselorNarrative(
      verdictContext || counselorCore?.answerThesis,
      params.lang,
      2
    ),
    prefersScenarioActionLead ? compactCounselorNarrative(scenarioActionHints[0], params.lang, 1) : undefined,
    compactCounselorNarrative(
      verdictTimingLine || topManifestation?.manifestation,
      params.lang,
      2
    ),
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
          structure: sanitizeCounselorProjectionBlock(counselorCore.projections.structure, params.lang),
          timing: sanitizeCounselorProjectionBlock(counselorCore.projections.timing, params.lang),
          conflict: sanitizeCounselorProjectionBlock(counselorCore.projections.conflict, params.lang),
          action: sanitizeCounselorProjectionBlock(counselorCore.projections.action, params.lang),
          risk: sanitizeCounselorProjectionBlock(counselorCore.projections.risk, params.lang),
          evidence: sanitizeCounselorProjectionBlock(counselorCore.projections.evidence, params.lang),
          branches: sanitizeCounselorProjectionBlock(counselorCore.projections.branches, params.lang),
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

  const actionBlock = packet.projections?.action
  const timingBlock = packet.projections?.timing
  const riskBlock = packet.projections?.risk
  const branchBlock = packet.projections?.branches
  const topBranches = (packet.branchSet || []).slice(0, 3)
  const openingWhyLines = (packet.whyStack || []).slice(0, 2)
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
    `answer=${packet.canonicalBrief?.answerThesis || actionBlock?.summary || 'none'}`,
    `action_focus=${packet.canonicalBrief?.actionFocusDomain || packet.focusDomain || 'none'}`,
    `risk_focus=${packet.riskAxisLabel || 'none'}`,
    `top_decision=${packet.canonicalBrief?.topDecisionLabel || packet.canonicalBrief?.topDecisionAction || 'none'}`,
    `opening_rationale=${openingWhyLines[0] || packet.canonicalBrief?.answerThesis || 'none'}`,
    '',
    '[Current Read]',
    ...actionDetails.slice(0, 2).map((line, index) => `current_${index + 1}=${line}`),
    ...(riskDetails.slice(0, 1).map((line, index) => `current_risk_${index + 1}=${line}`)),
    '',
    '[Timing]',
    `window=${packet.topTimingWindow?.window || 'none'}`,
    `conflict=${packet.topTimingWindow?.timingConflictNarrative || timingBlock?.summary || 'none'}`,
    ...timingDetails.slice(0, 2).map((line, index) => `timing_${index + 1}=${line}`),
    '',
    '[Branch Options]',
    ...(
      topBranches.length > 0
        ? topBranches.flatMap((branch, index) => [
            `branch_${index + 1}=${branch.summary}`,
            ...(branch.entry || []).slice(0, 1).map((line) => `branch_${index + 1}_entry=${line}`),
            ...(branch.abort || []).slice(0, 1).map((line) => `branch_${index + 1}_stop=${line}`),
          ])
        : (branchBlock?.detailLines || []).slice(0, 2).map((line, index) => `branch_${index + 1}=${line}`)
    ),
    '',
    '[Evidence Cues]',
    ...(keyEvidence.length > 0
      ? keyEvidence.slice(0, 3).map((line, index) => `evidence_${index + 1}=${line}`)
      : ['evidence_1=none']),
    '',
  ]

  if (lang === 'ko') {
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

