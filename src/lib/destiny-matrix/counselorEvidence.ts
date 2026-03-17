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

type CounselorTheme =
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

export interface CounselorEvidencePacket {
  focusDomain: string
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
}

type CounselorEvidencePacketLike = {
  focusDomain?: string
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
  canonicalBrief?: CounselorEvidencePacket['canonicalBrief']
  topDomainAdvisory?: CounselorEvidencePacket['topDomainAdvisory']
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow']
  topManifestation?: CounselorEvidencePacket['topManifestation']
}

function uniq<T>(items: T[]): T[] {
  return [...new Set(items)]
}

function normalizeCounselorSentence(value: string): string {
  return value.replace(/\s+/g, ' ').trim().replace(/[.。!！?？]+$/u, '')
}

function joinUniqueVerdictParts(parts: Array<string | null | undefined>): string {
  const normalized: string[] = []
  for (const raw of parts) {
    const cleaned = normalizeCounselorSentence(String(raw || ''))
    if (!cleaned) continue
    if (
      normalized.some(
        (existing) =>
          existing === cleaned || existing.includes(cleaned) || cleaned.includes(existing)
      )
    ) {
      continue
    }
    normalized.push(cleaned)
  }
  return normalized.join('. ').trim()
}

function buildCounselorVerdictLead(
  topDecisionLabel: string | undefined,
  lang: 'ko' | 'en'
): string | undefined {
  if (!topDecisionLabel) return undefined
  return lang === 'ko'
    ? `지금 우선은 ${topDecisionLabel}입니다`
    : `The priority now is ${topDecisionLabel}.`
}

function mapThemeToDomain(theme: CounselorTheme): InsightDomain {
  switch (theme) {
    case 'love':
    case 'family':
      return 'relationship'
    case 'career':
      return 'career'
    case 'wealth':
      return 'wealth'
    case 'health':
      return 'health'
    case 'today':
    case 'month':
    case 'year':
      return 'timing'
    case 'life':
    case 'chat':
    default:
      return 'personality'
  }
}

function localizeCounselorDomain(domain: string, lang: 'ko' | 'en'): string {
  if (lang === 'en') return domain
  const labels: Record<string, string> = {
    personality: '성향',
    career: '커리어',
    relationship: '관계',
    wealth: '재정',
    health: '건강',
    spirituality: '사명',
    timing: '타이밍',
    move: '이동/변화',
  }
  return labels[domain] || domain
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
  const prioritized = selected.filter((signal) => signal.domainHints.some((domain) => domainHints.includes(domain)))
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
  const ordered = [...(signalSynthesis.selectedSignals || []), ...(signalSynthesis.normalizedSignals || [])]
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
  const sectionHints = sectionPath ? domainHintsForSection(sectionPath, focusDomain as InsightDomain) : []
  const matchesSectionLead = sectionHints.length > 0 && signalDomains[0] && sectionHints.includes(signalDomains[0])
  const matchesSectionAny = sectionHints.some((hint) => signalDomains.some((domain) => domain === hint))
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
  return anchor.crossEvidenceSummary.replace(/\s+/g, ' ').trim().slice(0, 180)
}

function summarizeClaim(claim: UnifiedClaim): string {
  return claim.text.replace(/\s+/g, ' ').trim().slice(0, 180)
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
    if (/boundary|distance|commitment|cohabitation|family_acceptance|reconciliation|separation|clarify/.test(key)) {
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

function buildScenarioActionHints(
  scenarioIds: string[],
  lang: 'ko' | 'en'
): string[] {
  const hints = new Set<string>()
  for (const id of scenarioIds) {
    const key = String(id || '').toLowerCase()
    if (!key) continue
    if (/clarify_expectations/.test(key)) {
      hints.add(lang === 'ko' ? '기대치를 먼저 명확히 하세요' : 'clarify expectations first')
    }
    if (/distance_tuning/.test(key)) {
      hints.add(lang === 'ko' ? '거리와 속도를 다시 맞추세요' : 'tune distance and pace')
    }
    if (/boundary_reset/.test(key)) {
      hints.add(lang === 'ko' ? '관계 경계를 다시 정리하세요' : 'reset the boundary')
    }
    if (/commitment_preparation/.test(key)) {
      hints.add(lang === 'ko' ? '확정보다 준비 단계를 먼저 두세요' : 'prepare before defining commitment')
    }
    if (/route_recheck/.test(key)) {
      hints.add(lang === 'ko' ? '경로를 먼저 재확인하세요' : 'recheck the route first')
    }
    if (/commute_restructure/.test(key)) {
      hints.add(lang === 'ko' ? '경로와 동선을 다시 설계하세요' : 'restructure the commute')
    }
    if (/basecamp_reset/.test(key)) {
      hints.add(lang === 'ko' ? '생활 거점을 다시 정리하세요' : 'reset the base of operations')
    }
    if (/lease_decision/.test(key)) {
      hints.add(lang === 'ko' ? '계약 조건을 먼저 재확인하고 다시 협의하세요' : 'renegotiate the lease terms')
    }
    if (/promotion_review/.test(key)) {
      hints.add(lang === 'ko' ? '승진/역할 검토를 먼저 하세요' : 'review the promotion case first')
    }
    if (/contract_negotiation/.test(key)) {
      hints.add(lang === 'ko' ? '조건 협의부터 하세요' : 'negotiate the terms first')
    }
    if (/debt_restructure/.test(key)) {
      hints.add(lang === 'ko' ? '부채 구조를 재정리하세요' : 'restructure the debt before expanding')
    }
    if (/capital_allocation/.test(key)) {
      hints.add(lang === 'ko' ? '자금 배분부터 다시 점검하세요' : 'review capital allocation first')
    }
    if (/recovery_reset|recovery_compliance/.test(key)) {
      hints.add(lang === 'ko' ? '회복 루틴을 먼저 복구하세요' : 'restore the recovery routine first')
    }
  }
  return [...hints].slice(0, 3)
}

function buildPacketGuardrail(
  phase: StrategyEngineResult['overallPhase'],
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (phase === 'expansion') return '실행은 하되, 확정 전 반대 근거 1개를 반드시 확인하세요.'
    if (phase === 'high_tension_expansion')
      return '속도는 내되 문서, 금액, 약속은 이중 확인 후 확정하세요.'
    if (phase === 'expansion_guarded')
      return '기회는 잡되 체크리스트를 먼저 끝낸 뒤 확장하세요.'
    if (phase === 'stabilize') return '새 확장보다 구조 정렬과 우선순위 재정리를 먼저 하세요.'
    return '새로운 확장보다 손실, 오해, 과속을 먼저 막으세요.'
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
  const preferredDomain =
    params.focusDomainOverride || counselorCore?.focusDomain || fallbackFocusDomain

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
    anchors: [],
  }

  const topClaim = (unified.claims || [])[0]
  const topClaimText = topClaim ? summarizeClaim(topClaim) : ''
  const guardrail = buildPacketGuardrail(params.strategyEngine.overallPhase, params.lang)

  const topDomainAdvisory =
    counselorCore?.advisories.find((item) => item.domain === preferredDomain) ||
    counselorCore?.advisories[0] ||
    null
  const topTimingWindow =
    counselorCore?.domainTimingWindows.find((item) => item.domain === preferredDomain) ||
    counselorCore?.domainTimingWindows[0] ||
    null
  const topManifestation =
    counselorCore?.manifestations.find((item) => item.domain === preferredDomain) ||
    counselorCore?.manifestations[0] ||
    null
  const scenarioActionHints = buildScenarioActionHints(counselorCore?.topScenarioIds || [], params.lang)
  const prefersScenarioActionLead =
    preferredDomain === 'move' &&
    scenarioActionHints.length > 0 &&
    (
      counselorCore?.topDecisionAction === 'prepare_only' ||
      /preparation|information-gathering|준비|정보 수집/i.test(counselorCore?.topDecisionLabel || '')
    )
  const topDecisionLeadLabel =
    prefersScenarioActionLead && scenarioActionHints[0]
      ? `${localizeCounselorDomain(preferredDomain, params.lang)}: ${scenarioActionHints[0]}`
      : counselorCore?.topDecisionLabel

  const verdict = joinUniqueVerdictParts([
    buildCounselorVerdictLead(topDecisionLeadLabel ?? undefined, params.lang),
    counselorCore?.answerThesis,
    prefersScenarioActionLead ? scenarioActionHints[0] : undefined,
    topManifestation?.manifestation,
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

  return {
    focusDomain: preferredDomain,
    verdict,
    guardrail: counselorCore?.primaryCaution || guardrail,
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
      ? {
          gradeLabel: counselorCore.gradeLabel,
          phaseLabel: counselorCore.phaseLabel,
          topDecisionAction: counselorCore.topDecisionAction || undefined,
          topDecisionLabel: topDecisionLeadLabel || undefined,
          answerThesis: counselorCore.answerThesis,
          primaryAction: counselorCore.primaryAction,
          primaryCaution: counselorCore.primaryCaution,
          timingHint: counselorCore.timingHint,
          policyMode: counselorCore.judgmentPolicy.mode,
          policyRationale: counselorCore.judgmentPolicy.rationale,
          allowedActions: [...scenarioActionHints, ...(counselorCore.judgmentPolicy.allowedActionLabels || [])].slice(0, 3),
          blockedActions: (counselorCore.judgmentPolicy.blockedActionLabels || []).slice(0, 3),
          softChecks: (counselorCore.judgmentPolicy.softCheckLabels || counselorCore.judgmentPolicy.softChecks).slice(0, 3),
          hardStops: (counselorCore.judgmentPolicy.hardStopLabels || counselorCore.judgmentPolicy.hardStops).slice(0, 3),
        }
      : undefined,
    topDomainAdvisory: topDomainAdvisory
      ? {
          domain: topDomainAdvisory.domain,
          thesis: topDomainAdvisory.thesis,
          action: [topDomainAdvisory.action, ...scenarioActionHints].filter(Boolean).join(
            params.lang === 'ko' ? ' / ' : ' / '
          ),
          caution: topDomainAdvisory.caution,
          timingHint: topDomainAdvisory.timingHint,
          strategyLine: topDomainAdvisory.strategyLine,
        }
      : undefined,
    topTimingWindow: topTimingWindow
      ? {
          domain: topTimingWindow.domain,
          window: topTimingWindow.window,
          whyNow: topTimingWindow.whyNow,
          entryConditions: [...topTimingWindow.entryConditions].slice(0, 3),
          abortConditions: [...topTimingWindow.abortConditions].slice(0, 3),
        }
      : undefined,
    topManifestation: topManifestation
      ? {
          domain: topManifestation.domain,
          baselineThesis: topManifestation.baselineThesis,
          activationThesis: topManifestation.activationThesis,
          manifestation: topManifestation.manifestation,
          likelyExpressions: [...topManifestation.likelyExpressions].slice(0, 3),
          riskExpressions: [...topManifestation.riskExpressions].slice(0, 3),
          timingWindow: topManifestation.timingWindow,
        }
      : undefined,
  }
}

export function formatCounselorEvidencePacket(
  packet: CounselorEvidencePacketLike | null | undefined,
  lang: 'ko' | 'en'
): string {
  if (!packet || !packet.focusDomain || !packet.graphRagEvidenceSummary) return ''

  const claimLimit = packet.canonicalBrief ? 3 : 6
  const scenarioLimit = packet.canonicalBrief ? 2 : 4
  const signalLimit = packet.canonicalBrief ? 4 : 8
  const anchorLimit = packet.canonicalBrief ? 3 : 6

  const anchorLines = (packet.topAnchors || [])
    .slice(0, anchorLimit)
    .map((anchor) => `- ${anchor.section}: ${anchor.summary} (sets=${anchor.setCount})`)
  const claimLines = (packet.topClaims || [])
    .slice(0, claimLimit)
    .map(
      (claim) =>
        `- [${claim.domain || 'general'}] ${claim.text} | signals=${(claim.signalIds || []).slice(0, 4).join(',') || 'none'}`
    )
  const scenarioLines = (packet.scenarioBriefs || []).slice(0, scenarioLimit).map((scenario) => {
    const main = (scenario.mainTokens || []).slice(0, 4).join(', ') || 'none'
    const alt = (scenario.altTokens || []).slice(0, 4).join(', ') || 'none'
    return `- ${scenario.domain}: main=${main} | alt=${alt}`
  })
  const signalLines = (packet.selectedSignals || [])
    .slice(0, signalLimit)
    .map(
      (signal) =>
        `- ${signal.domain}/${signal.polarity}/score=${signal.score}: ${signal.summary || 'none'}`
    )
  const strategyLabel = packet.strategyBrief?.overallPhaseLabel || 'none'
  const attackPercent = packet.strategyBrief?.attackPercent ?? '-'
  const defensePercent = packet.strategyBrief?.defensePercent ?? '-'

  const canonicalLines = packet.canonicalBrief
    ? [
        '[Canonical Core]',
        `grade=${packet.canonicalBrief.gradeLabel}`,
        `phase=${packet.canonicalBrief.phaseLabel}`,
        `top_decision=${packet.canonicalBrief.topDecisionLabel || packet.canonicalBrief.topDecisionAction || 'none'}`,
        `answer=${packet.canonicalBrief.answerThesis}`,
        `action=${packet.canonicalBrief.primaryAction}`,
        `caution=${packet.canonicalBrief.primaryCaution}`,
        `timing=${packet.canonicalBrief.timingHint}`,
        `policy_mode=${packet.canonicalBrief.policyMode}`,
        `allowed_actions=${(packet.canonicalBrief.allowedActions || []).join(' | ') || 'none'}`,
        `blocked_actions=${(packet.canonicalBrief.blockedActions || []).join(' | ') || 'none'}`,
        `soft_checks=${(packet.canonicalBrief.softChecks || []).join(' | ') || 'none'}`,
        `hard_stops=${(packet.canonicalBrief.hardStops || []).join(' | ') || 'none'}`,
        '',
      ]
    : []

  const advisoryLines = packet.topDomainAdvisory
    ? [
        '[Domain Advisory]',
        `domain=${packet.topDomainAdvisory.domain}`,
        `thesis=${packet.topDomainAdvisory.thesis}`,
        `action=${packet.topDomainAdvisory.action}`,
        `caution=${packet.topDomainAdvisory.caution}`,
        `timing=${packet.topDomainAdvisory.timingHint}`,
        `strategy_line=${packet.topDomainAdvisory.strategyLine}`,
        '',
      ]
    : []

  const timingLines = packet.topTimingWindow
    ? [
        '[Timing Window]',
        `domain=${packet.topTimingWindow.domain}`,
        `window=${packet.topTimingWindow.window}`,
        `why_now=${packet.topTimingWindow.whyNow}`,
        `entry=${(packet.topTimingWindow.entryConditions || []).join(' | ') || 'none'}`,
        `abort=${(packet.topTimingWindow.abortConditions || []).join(' | ') || 'none'}`,
        '',
      ]
    : []

  const manifestationLines = packet.topManifestation
    ? [
        '[Manifestation]',
        `domain=${packet.topManifestation.domain}`,
        `baseline=${packet.topManifestation.baselineThesis}`,
        `activation=${packet.topManifestation.activationThesis}`,
        `manifestation=${packet.topManifestation.manifestation}`,
        `likely=${(packet.topManifestation.likelyExpressions || []).join(' | ') || 'none'}`,
        `risk=${(packet.topManifestation.riskExpressions || []).join(' | ') || 'none'}`,
        '',
      ]
    : []

  const commonLines = [
    '[Counselor Evidence Packet v2]',
    `focus_domain=${packet.focusDomain}`,
    `graph_anchors=${packet.graphRagEvidenceSummary.totalAnchors}`,
    `graph_sets=${packet.graphRagEvidenceSummary.totalSets}`,
    `strategy=${strategyLabel}(${attackPercent}/${defensePercent})`,
    '',
    ...canonicalLines,
    ...advisoryLines,
    ...timingLines,
    ...manifestationLines,
    '[Core Claims]',
    ...(claimLines.length > 0 ? claimLines : ['- none']),
    '',
    '[Scenarios]',
    ...(scenarioLines.length > 0 ? scenarioLines : ['- none']),
    '',
    '[Signal Evidence]',
    ...(signalLines.length > 0 ? signalLines : ['- none']),
    '',
    '[Anchor Evidence]',
    ...(anchorLines.length > 0 ? anchorLines : ['- none']),
    '',
  ]

  if (lang === 'ko') {
    return [
      ...commonLines,
      '[Response Contract]',
      '- 답변은 4문단 이상으로 작성: 현재국면 -> 근거해석 -> 실행전략 -> 재확인체크리스트.',
      '- 각 문단에 근거를 최소 1개씩 연결하고, 추천/주의가 서로 충돌하지 않게 유지.',
      '- irreversible 행동(서명, 확정, 발송, 결제)은 caution 신호가 있으면 즉시 권하지 말 것.',
      '- 핵심 결론은 strategy와 top claim에 반드시 일치시킬 것.',
    ].join('\n')
  }

  return [
    ...commonLines,
    '[Response Contract]',
    '- Write at least 4 paragraphs: current phase -> grounded interpretation -> strategy -> recheck checklist.',
    '- Each paragraph must include at least one evidence item and keep recommendation/caution non-contradictory.',
    '- If caution signals exist, do not push irreversible actions (sign/finalize/send/pay) immediately.',
    '- Keep final verdict strictly aligned with strategy and top claims.',
  ].join('\n')
}
