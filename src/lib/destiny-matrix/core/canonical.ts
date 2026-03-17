import type { DomainKey, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type {
  BuildCoreCanonicalOutputInput,
  CoreCoherenceAudit,
  CoreDomainAdvisory,
  CoreDomainLead,
  CoreDomainTimingWindow,
  CoreDecisionLead,
  CoreDomainVerdict,
  CoreInteractionHit,
  CoreJudgmentPolicy,
  CoreLayerScore,
  CorePatternLead,
  CoreScenarioLead,
  CoreTimelineHit,
  DestinyCoreCanonicalOutput,
} from './types'
import { buildDomainManifestations } from './manifestationEngine'

const ACTIONABLE_DOMAINS = ['career', 'relationship', 'wealth', 'health', 'move'] as const

function mapSignalDomainToSummaryDomainKey(domain: string): DomainKey | null {
  if (domain === 'relationship') return 'love'
  if (domain === 'wealth') return 'money'
  if (domain === 'career' || domain === 'health' || domain === 'move') return domain
  return null
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function normalizeToUnit(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  if (value >= 0 && value <= 1) return round2(clamp(value, 0, 1))
  if (value > 1 && value <= 100) return round2(clamp(value / 100, 0, 1))
  return null
}

function buildLayerScores(input: BuildCoreCanonicalOutputInput): CoreLayerScore[] {
  const grouped = new Map<number, CoreLayerScore>()
  for (const signal of input.signalSynthesis.normalizedSignals || []) {
    const prev = grouped.get(signal.layer) || {
      layer: signal.layer,
      signalCount: 0,
      avgScore: 0,
      strengthCount: 0,
      cautionCount: 0,
      balanceCount: 0,
    }
    prev.signalCount += 1
    prev.avgScore += signal.score
    if (signal.polarity === 'strength') prev.strengthCount += 1
    else if (signal.polarity === 'caution') prev.cautionCount += 1
    else prev.balanceCount += 1
    grouped.set(signal.layer, prev)
  }
  return [...grouped.values()]
    .map((layer) => ({
      ...layer,
      avgScore: layer.signalCount > 0 ? round2(layer.avgScore / layer.signalCount) : 0,
    }))
    .sort((a, b) => a.layer - b.layer)
}

function buildInteractionHits(input: BuildCoreCanonicalOutputInput): CoreInteractionHit[] {
  return (input.signalSynthesis.selectedSignals || [])
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 16)
    .map((signal) => ({
      id: signal.id,
      layer: signal.layer,
      rowKey: signal.rowKey,
      colKey: signal.colKey,
      domainHints: [...(signal.domainHints || [])],
      polarity: signal.polarity,
      score: signal.score,
      keyword: signal.keyword,
      sajuBasis: signal.sajuBasis,
      astroBasis: signal.astroBasis,
    }))
}

function buildTimelineHits(input: BuildCoreCanonicalOutputInput): CoreTimelineHit[] {
  const hits: CoreTimelineHit[] = []
  const fromScenarios = (input.scenarios || [])
    .slice()
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 8)
    .map<CoreTimelineHit>((scenario) => ({
      id: `scenario:${scenario.id}`,
      source: 'scenario',
      domain: scenario.domain,
      window: scenario.window,
      confidence: round2(clamp(scenario.confidence, 0, 1)),
      evidenceIds: [scenario.patternId],
    }))
  hits.push(...fromScenarios)

  const timeline = (input.matrixSummary?.overlapTimeline || [])
    .slice()
    .sort((a, b) => b.overlapStrength - a.overlapStrength)
    .slice(0, 4)
    .map<CoreTimelineHit>((point: MonthlyOverlapPoint) => ({
      id: `overlap:${point.month}`,
      source: 'matrix-overlap',
      domain: 'timing',
      window: point.month,
      confidence: round2(clamp(point.overlapStrength, 0, 1)),
      evidenceIds: [point.month, point.peakLevel],
    }))
  hits.push(...timeline)
  return hits
}

function buildEvidenceRefs(input: BuildCoreCanonicalOutputInput): Record<string, string[]> {
  const refs: Record<string, string[]> = {}
  for (const claim of input.signalSynthesis.claims || []) {
    refs[claim.claimId] = [...new Set(claim.evidence || [])]
  }
  refs.__caution__ = (input.signalSynthesis.selectedSignals || [])
    .filter((signal) => signal.polarity === 'caution')
    .slice(0, 10)
    .map((signal) => signal.id)
  return refs
}

function buildCautions(input: BuildCoreCanonicalOutputInput): string[] {
  return (input.signalSynthesis.selectedSignals || [])
    .filter((signal) => signal.polarity === 'caution')
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8)
    .map((signal) => signal.id)
}

function buildTimingHintByDomain(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string
): string {
  const scenarioWindow =
    (input.scenarios || []).find((scenario) => scenario.domain === focusDomain)?.window ||
    input.scenarios[0]?.window
  if (scenarioWindow) return scenarioWindow

  const overlapMonth = (input.matrixSummary?.overlapTimeline || [])[0]?.month
  return overlapMonth || 'now'
}

function buildDomainLeads(input: BuildCoreCanonicalOutputInput): CoreDomainLead[] {
  const patternScores = new Map<string, number>()
  for (const pattern of input.patterns || []) {
    for (const domain of pattern.domains || []) {
      patternScores.set(domain, (patternScores.get(domain) || 0) + pattern.score)
    }
  }

  const scenarioScores = new Map<string, number>()
  for (const scenario of input.scenarios || []) {
    scenarioScores.set(
      scenario.domain,
      (scenarioScores.get(scenario.domain) || 0) + scenario.probability * scenario.confidence
    )
  }

  const decisionScores = new Map<string, number>()
  for (const option of input.decisionEngine.options || []) {
    decisionScores.set(
      option.domain,
      Math.max(decisionScores.get(option.domain) || 0, option.scores.total)
    )
  }

  return (input.strategy.domainStrategies || [])
    .map((strategy) => {
      const signalScore =
        strategy.metrics.strengthScore + strategy.metrics.cautionScore + strategy.metrics.balanceScore
      const patternScore = round2(patternScores.get(strategy.domain) || 0)
      const scenarioScore = round2(scenarioScores.get(strategy.domain) || 0)
      const decisionScore = round2(decisionScores.get(strategy.domain) || 0)
      const dominanceScore = round2(
        signalScore * 0.45 + patternScore * 0.2 + scenarioScore * 0.15 + decisionScore * 0.2
      )

      return {
        domain: strategy.domain,
        phase: strategy.phase,
        totalSignalScore: round2(signalScore),
        patternScore,
        scenarioScore,
        decisionScore,
        dominanceScore,
        evidenceIds: [...(strategy.evidenceIds || [])].slice(0, 6),
      } satisfies CoreDomainLead
    })
    .sort((a, b) => b.dominanceScore - a.dominanceScore)
}

function resolveFocusDomain(input: BuildCoreCanonicalOutputInput, domainLeads: CoreDomainLead[]) {
  if (input.strategy.focusDomain) return input.strategy.focusDomain
  if (domainLeads[0]?.domain) return domainLeads[0].domain

  const topClaim = (input.signalSynthesis.claims || []).find((claim) => claim.domain)
  if (topClaim?.domain) return topClaim.domain

  const topSignal = (input.signalSynthesis.selectedSignals || []).find(
    (signal) => signal.domainHints?.length
  )
  if (topSignal?.domainHints?.[0]) return topSignal.domainHints[0]

  return 'personality'
}

function resolveRiskControl(input: BuildCoreCanonicalOutputInput, focusDomain: string): string {
  const focusedClaim = (input.signalSynthesis.claims || []).find((claim) => claim.domain === focusDomain)
  if (focusedClaim?.riskControl) return focusedClaim.riskControl

  const firstClaim = (input.signalSynthesis.claims || []).find((claim) => claim.riskControl)
  if (firstClaim?.riskControl) return firstClaim.riskControl

  return input.strategy.riskControl || ''
}

function buildTopSignalIds(input: BuildCoreCanonicalOutputInput): string[] {
  if ((input.signalSynthesis.leadSignalIds || []).length > 0) {
    return [
      ...(input.signalSynthesis.leadSignalIds || []),
      ...(input.signalSynthesis.supportSignalIds || []),
    ].slice(0, 8)
  }
  return (input.signalSynthesis.selectedSignals || [])
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8)
    .map((signal) => signal.id)
}

function buildTopPatterns(input: BuildCoreCanonicalOutputInput): CorePatternLead[] {
  return (input.patterns || [])
    .slice()
    .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
    .slice(0, 6)
    .map((pattern) => ({
      id: pattern.id,
      label: pattern.label,
      family: pattern.family,
      profile: pattern.profile,
      domains: [...(pattern.domains || [])],
      score: pattern.score,
      confidence: round2(clamp(pattern.confidence, 0, 1)),
      matchedSignalIds: [...(pattern.matchedSignalIds || [])].slice(0, 8),
    }))
}

function buildTopScenarios(input: BuildCoreCanonicalOutputInput): CoreScenarioLead[] {
  const focusDomain = input.strategy.focusDomain || input.strategy.domainStrategies[0]?.domain || null
  const leadScenarioId = input.scenarios.find((scenario) => scenario.domain === focusDomain)?.id || null
  const scenarioSpecificity = (branch: string) => {
    const key = branch.toLowerCase()
    if (/(review|negotiation|restructure|compliance|acceptance|decision|conflict|disruption)/.test(key)) return 4
    if (/(manager|specialist|authority|cohabitation|cross_border|lease|allocation|execution)/.test(key)) return 3
    if (/(entry|travel|new_connection|recovery|bond_deepening)/.test(key)) return 2
    return 1
  }
  return (input.scenarios || [])
    .slice()
    .sort(
      (a, b) =>
        (b.domain === focusDomain ? 1 : 0) - (a.domain === focusDomain ? 1 : 0) ||
        (b.id === leadScenarioId ? 1 : 0) - (a.id === leadScenarioId ? 1 : 0) ||
        b.probability - a.probability ||
        b.timingRelevance - a.timingRelevance ||
        b.confidence - a.confidence ||
        scenarioSpecificity(b.branch) - scenarioSpecificity(a.branch) ||
        a.abortConditions.length - b.abortConditions.length
    )
    .slice(0, 6)
    .map((scenario) => ({
      id: scenario.id,
      patternId: scenario.patternId,
      domain: scenario.domain,
      branch: scenario.branch,
      probability: scenario.probability,
      confidence: round2(clamp(scenario.confidence, 0, 1)),
      window: scenario.window,
      timingRelevance: round2(clamp(scenario.timingRelevance, 0, 1)),
      reversible: scenario.reversible,
      whyNow: scenario.whyNow,
      entryConditions: [...scenario.entryConditions].slice(0, 3),
      abortConditions: [...scenario.abortConditions].slice(0, 3),
      evidenceIds: [...scenario.evidenceIds].slice(0, 6),
    }))
}

function buildTopDecision(input: BuildCoreCanonicalOutputInput): CoreDecisionLead | null {
  const focusDomain = input.strategy.focusDomain || input.strategy.domainStrategies[0]?.domain || null
  const actionSpecificity = (action: string) => {
    if (action === 'route_recheck_first' || action === 'lease_review_first' || action === 'basecamp_reset_first') return 5
    if (action === 'review_first' || action === 'negotiate_first' || action === 'boundary_first') return 4
    if (action === 'pilot_first' || action === 'staged_commit') return 3
    if (action === 'prepare_only') return 2
    if (action === 'commit_now') return 1
    return 0
  }
  const sorted = (input.decisionEngine.options || [])
    .slice()
    .sort(
      (a, b) =>
        (b.domain === focusDomain ? 1 : 0) - (a.domain === focusDomain ? 1 : 0) ||
        (a.gated ? 1 : 0) - (b.gated ? 1 : 0) ||
        b.scores.total - a.scores.total ||
        b.confidence - a.confidence ||
        actionSpecificity(b.action) - actionSpecificity(a.action)
    )
  const top = sorted.find((option) => option.id === input.decisionEngine.topOptionId) || sorted[0]
  if (!top) return null

  return {
    id: top.id,
    domain: top.domain,
    action: top.action,
    label: top.label,
    reversible: top.reversible,
    gated: Boolean(top.gated),
    gateReason: top.gateReason || null,
    totalScore: top.scores.total,
    confidence: round2(clamp(top.confidence, 0, 1)),
  }
}

function resolveTopClaimId(input: BuildCoreCanonicalOutputInput, focusDomain: string, claimIds: string[]) {
  return (
    (input.signalSynthesis.claims || []).find((claim) => claim.domain === focusDomain)?.claimId ||
    claimIds[0] ||
    null
  )
}

function resolveLeadPatternId(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string
): string | null {
  return (
    (input.patterns || []).find((pattern) => pattern.domains.includes(focusDomain as any))?.id ||
    input.patterns[0]?.id ||
    null
  )
}

function resolveLeadScenarioId(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string
): string | null {
  return (
    (input.scenarios || []).find((scenario) => scenario.domain === focusDomain)?.id ||
    input.scenarios[0]?.id ||
    null
  )
}

function resolvePrimaryAction(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string,
  riskControl: string
): string {
  const claim = (input.signalSynthesis.claims || []).find((item) => item.domain === focusDomain)
  if (claim?.actions?.[0]) return claim.actions[0]

  const scenario = (input.scenarios || []).find((item) => item.domain === focusDomain)
  if (scenario?.actions?.[0]) return scenario.actions[0]

  if (input.decisionEngine.options[0]?.summary) return input.decisionEngine.options[0].summary
  return riskControl
}

function findManifestation(
  manifestations: ReturnType<typeof buildDomainManifestations>,
  domain: string
) {
  return manifestations.find((item) => item.domain === domain) || manifestations[0] || null
}

function resolveCanonicalThesis(input: {
  lang: 'ko' | 'en'
  focusDomain: string
  strategyThesis: string
  manifestation: ReturnType<typeof buildDomainManifestations>[number] | null
}): string {
  if (input.manifestation?.manifestation) return input.manifestation.manifestation
  if (input.manifestation?.activationThesis) return input.manifestation.activationThesis
  return input.strategyThesis
}

function resolvePrimaryActionFromManifestation(input: {
  lang: 'ko' | 'en'
  fallback: string
  manifestation: ReturnType<typeof buildDomainManifestations>[number] | null
}): string {
  if (input.manifestation?.likelyExpressions?.[0]) return input.manifestation.likelyExpressions[0]
  return input.fallback
}

function resolvePrimaryCaution(input: BuildCoreCanonicalOutputInput, focusDomain: string): string {
  const cautionSignal =
    (input.signalSynthesis.selectedSignals || []).find(
      (signal) => signal.polarity === 'caution' && signal.domainHints.includes(focusDomain as any)
    ) ||
    (input.signalSynthesis.selectedSignals || []).find((signal) => signal.polarity === 'caution')

  if (!cautionSignal) {
    return input.lang === 'ko'
      ? '핵심 확정 전에 체크리스트를 한 번 더 통과시키세요.'
      : 'Run one more checklist pass before final commitment.'
  }

  if (cautionSignal.advice) return cautionSignal.advice
  if (cautionSignal.keyword) return cautionSignal.keyword
  return cautionSignal.id
}

function resolvePrimaryCautionFromManifestation(input: {
  lang: 'ko' | 'en'
  fallback: string
  manifestation: ReturnType<typeof buildDomainManifestations>[number] | null
}): string {
  if (input.manifestation?.riskExpressions?.[0]) return input.manifestation.riskExpressions[0]
  return input.fallback
}

function mergeAdvisoriesWithManifestations(input: {
  advisories: CoreDomainAdvisory[]
  manifestations: ReturnType<typeof buildDomainManifestations>
}): CoreDomainAdvisory[] {
  return input.advisories.map((advisory) => {
    const manifestation = input.manifestations.find((item) => item.domain === advisory.domain)
    if (!manifestation) return advisory
    return {
      ...advisory,
      thesis: manifestation.baselineThesis || advisory.thesis,
      action: manifestation.likelyExpressions[0] || advisory.action,
      caution: manifestation.riskExpressions[0] || advisory.caution,
      timingHint: manifestation.activationThesis || advisory.timingHint,
      strategyLine: manifestation.manifestation || advisory.strategyLine,
      evidenceIds: [...new Set([...(advisory.evidenceIds || []), ...(manifestation.evidenceIds || [])])].slice(0, 10),
    }
  })
}

function buildGradeReasonWithManifestation(input: {
  lang: 'ko' | 'en'
  baseReason: string
  manifestation: ReturnType<typeof buildDomainManifestations>[number] | null
}): string {
  if (!input.manifestation) return input.baseReason
  return input.lang === 'ko'
    ? `${input.baseReason} 현재 발현은 ${input.manifestation.activationThesis}`
    : `${input.baseReason} Current manifestation: ${input.manifestation.activationThesis}`
}

function findEvidenceIdsForDomain(
  input: BuildCoreCanonicalOutputInput,
  domain: string
): string[] {
  return [
    ...(input.signalSynthesis.claims || [])
      .filter((item) => item.domain === domain)
      .flatMap((item) => item.evidence || []),
    ...(input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.includes(domain as any))
      .map((signal) => signal.id),
    ...(input.patterns || [])
      .filter((pattern) => pattern.domains.includes(domain as any))
      .map((pattern) => pattern.id),
    ...(input.scenarios || [])
      .filter((scenario) => scenario.domain === domain)
      .flatMap((scenario) => [scenario.id, ...(scenario.evidenceIds || [])]),
    ...(input.strategy.domainStrategies || [])
      .filter((strategy) => strategy.domain === domain)
      .flatMap((strategy) => strategy.evidenceIds || []),
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)
}

function buildFallbackDomainLead(
  input: BuildCoreCanonicalOutputInput,
  domain: string
): CoreDomainLead | null {
  const evidenceIds = findEvidenceIdsForDomain(input, domain)
  if (evidenceIds.length === 0) return null

  const strategy =
    (input.strategy.domainStrategies || []).find((item) => item.domain === domain) || null
  const patternScore = round2(
    (input.patterns || [])
      .filter((pattern) => pattern.domains.includes(domain as any))
      .reduce((sum, pattern) => sum + pattern.score, 0)
  )
  const scenarioScore = round2(
    (input.scenarios || [])
      .filter((scenario) => scenario.domain === domain)
      .reduce((sum, scenario) => sum + scenario.probability * scenario.confidence, 0)
  )
  const decisionScore = round2(
    Math.max(
      0,
      ...(input.decisionEngine.options || [])
        .filter((option) => option.domain === domain)
        .map((option) => option.scores.total)
    )
  )
  const totalSignalScore = round2(
    (input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.includes(domain as any))
      .reduce((sum, signal) => sum + signal.score, 0)
  )

  return {
    domain: domain as CoreDomainLead['domain'],
    phase: strategy?.phase || input.strategy.phase,
    totalSignalScore,
    patternScore,
    scenarioScore,
    decisionScore,
    dominanceScore: round2(
      totalSignalScore * 0.45 + patternScore * 0.2 + scenarioScore * 0.15 + decisionScore * 0.2
    ),
    evidenceIds: evidenceIds.slice(0, 8),
  }
}

function collectCanonicalDomains(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[]
): CoreDomainLead[] {
  const leadMap = new Map(domainLeads.map((lead) => [lead.domain, lead]))
  const actionable = ACTIONABLE_DOMAINS.map(
    (domain) => leadMap.get(domain) || buildFallbackDomainLead(input, domain)
  ).filter((lead): lead is CoreDomainLead => Boolean(lead))
  const extras = domainLeads.filter(
    (lead) => !ACTIONABLE_DOMAINS.includes(lead.domain as (typeof ACTIONABLE_DOMAINS)[number])
  )
  return [...actionable, ...extras.slice(0, 2)]
}

function buildDomainTimingWindow(
  input: BuildCoreCanonicalOutputInput,
  lead: CoreDomainLead,
  domainVerdict: CoreDomainVerdict | null
): CoreDomainTimingWindow {
  const scenario =
    (input.scenarios || [])
      .filter((item) => item.domain === lead.domain)
      .sort(
        (a, b) =>
          b.timingRelevance - a.timingRelevance ||
          b.probability - a.probability ||
          b.confidence - a.confidence
      )[0] || null
  const summaryDomainKey = mapSignalDomainToSummaryDomainKey(lead.domain)
  const overlapPoint = summaryDomainKey
    ? (input.matrixSummary?.overlapTimelineByDomain?.[summaryDomainKey] || [])[0] || null
    : null
  const domainScore = summaryDomainKey ? input.matrixSummary?.domainScores?.[summaryDomainKey] : null
  const overlapConfidence = overlapPoint
    ? clamp(overlapPoint.overlapStrength * 0.75 + (overlapPoint.timeOverlapWeight - 1) * 0.5, 0.2, 0.95)
    : null

  let window: CoreDomainTimingWindow['window'] = scenario?.window || '6-12m'
  if (!scenario && overlapPoint) {
    window =
      overlapPoint.peakLevel === 'peak'
        ? '1-3m'
        : overlapPoint.peakLevel === 'high'
          ? '3-6m'
          : '6-12m'
  }
  if (!scenario && !overlapPoint && domainVerdict?.mode === 'prepare') {
    window = '12m+'
  }

  const confidence = round2(
    clamp(
      scenario?.confidence ||
        overlapConfidence ||
        domainScore?.confidenceScore ||
        lead.dominanceScore / 100 ||
        0.35,
      0.2,
      0.98
    )
  )
  const timingRelevance = round2(
    clamp(
      scenario?.timingRelevance ||
        overlapPoint?.overlapStrength ||
        domainScore?.overlapStrength ||
        lead.scenarioScore / 100 ||
        0.25,
      0.15,
      0.99
    )
  )
  const whyNow =
    scenario?.whyNow ||
    (input.lang === 'ko'
      ? overlapPoint
        ? `${lead.domain} 영역은 ${overlapPoint.month} 전후로 겹침 강도가 올라 timing window가 열립니다.`
        : `${lead.domain} 영역은 현재 국면과 도메인 주도권 기준으로 당장 확정보다 조건 정리가 먼저 필요한 구간입니다.`
      : overlapPoint
        ? `${lead.domain} is entering a stronger timing window around ${overlapPoint.month}.`
        : `${lead.domain} currently needs condition-setting before hard commitment.`)
  const entryConditions = scenario?.entryConditions?.length
    ? [...scenario.entryConditions].slice(0, 3)
    : input.lang === 'ko'
      ? [
          '핵심 조건 1개를 먼저 문장으로 고정',
          '바로 확정하지 말고 검증 단계를 먼저 통과',
          '주도 도메인 기준선과 충돌하는 행동은 제외',
        ]
      : [
          'Lock one condition first',
          'Pass a verification step before commitment',
          'Exclude moves that conflict with the lead-domain baseline',
        ]
  const abortConditions = scenario?.abortConditions?.length
    ? [...scenario.abortConditions].slice(0, 3)
    : input.lang === 'ko'
      ? ['신뢰가 더 낮아질 때', '핵심 조건이 바뀔 때', '반복 경고 신호가 늘어날 때']
      : [
          'When confidence drops further',
          'When the key condition changes',
          'When repeated caution signals increase',
        ]
  const evidenceIds = [
    ...(scenario?.evidenceIds || []),
    ...lead.evidenceIds,
    ...(overlapPoint ? [overlapPoint.month, overlapPoint.peakLevel] : []),
  ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)

  return {
    domain: lead.domain,
    window,
    confidence,
    timingRelevance,
    whyNow,
    entryConditions,
    abortConditions,
    evidenceIds: evidenceIds.slice(0, 8),
  }
}

function buildDomainAdvisories(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[],
  domainVerdicts: CoreDomainVerdict[]
): CoreDomainAdvisory[] {
  return domainLeads.map((lead) => {
    const claim =
      (input.signalSynthesis.claims || []).find((item) => item.domain === lead.domain) ||
      input.signalSynthesis.claims[0]
    const scenarios = (input.scenarios || []).filter((item) => item.domain === lead.domain)
    const scenario = scenarios[0] || input.scenarios[0]
    const verdict = domainVerdicts.find((item) => item.domain === lead.domain) || null
    const cautionSignal =
      (input.signalSynthesis.selectedSignals || []).find(
        (signal) => signal.polarity === 'caution' && signal.domainHints.includes(lead.domain)
      ) ||
      (input.signalSynthesis.selectedSignals || []).find((signal) => signal.polarity === 'caution')
    const leadSignals = (input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.includes(lead.domain))
      .sort((a, b) => b.rankScore - a.rankScore)
      .slice(0, 3)
    const leadPatterns = (input.patterns || [])
      .filter((pattern) => pattern.domains.includes(lead.domain as any))
      .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
      .slice(0, 2)
    const evidenceIds = [
      ...(claim?.evidence || []),
      ...leadSignals.map((signal) => signal.id),
      ...leadPatterns.map((pattern) => pattern.id),
      ...(scenario ? [scenario.id] : []),
      ...(lead.evidenceIds || []),
    ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)

    return {
      domain: lead.domain,
      phase: lead.phase,
      thesis:
        claim?.thesis ||
        (input.lang === 'ko'
          ? `${lead.domain} 축이 이번 입력의 상위 주도 영역입니다.`
          : `${lead.domain} is acting as a lead domain in this input.`),
      action:
        claim?.actions?.[0] ||
        scenario?.actions?.[0] ||
        resolveRiskControl(input, lead.domain),
      caution:
        cautionSignal?.advice ||
        cautionSignal?.keyword ||
        (input.lang === 'ko'
          ? '확정 전 재확인 과정을 생략하지 마세요.'
          : 'Do not skip the recheck step before commitment.'),
      timingHint: scenario?.whyNow || buildTimingHintByDomain(input, lead.domain),
      strategyLine:
        verdict?.rationale ||
        (input.lang === 'ko'
          ? `${lead.domain} 영역은 ${lead.phase} 국면 기준으로 단계 실행이 적합합니다.`
          : `${lead.domain} is best handled with staged execution under the ${lead.phase} phase.`),
      leadSignalIds: leadSignals.map((signal) => signal.id),
      leadPatternIds: leadPatterns.map((pattern) => pattern.id),
      leadScenarioIds: scenarios.slice(0, 2).map((item) => item.id),
      evidenceIds: evidenceIds.slice(0, 8),
    } satisfies CoreDomainAdvisory
  })
}

function buildDomainTimingWindows(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[],
  domainVerdicts: CoreDomainVerdict[]
): CoreDomainTimingWindow[] {
  return domainLeads.map((lead) =>
    buildDomainTimingWindow(
      input,
      lead,
      domainVerdicts.find((item) => item.domain === lead.domain) || null
    )
  )
}

function resolveGrade(input: BuildCoreCanonicalOutputInput): {
  gradeLabel: string
  gradeReason: string
} {
  const phase = input.strategy.phase
  const confidence = normalizeToUnit(input.matrixSummary?.confidenceScore) ?? resolveConfidence(input)
  const crossAgreement = normalizeToUnit(input.crossAgreement)
  const cautionCount = (input.signalSynthesis.selectedSignals || []).filter(
    (signal) => signal.polarity === 'caution'
  ).length
  const topDecision = buildTopDecision(input)
  const highRiskCommit = Boolean(topDecision && topDecision.reversible === false && cautionCount >= 2)

  let label: string
  if (phase === 'expansion' && confidence >= 0.72 && cautionCount <= 1 && !highRiskCommit) {
    label = input.lang === 'ko' ? '공격형' : 'Attack'
  } else if (
    (phase === 'high_tension_expansion' || phase === 'expansion_guarded') &&
    confidence >= 0.52
  ) {
    label = input.lang === 'ko' ? '활용형' : 'Leverage'
  } else if (phase === 'stabilize') {
    label = input.lang === 'ko' ? '운영형' : 'Operate'
  } else if (
    phase === 'defensive_reset' ||
    confidence < 0.42 ||
    (crossAgreement !== null && crossAgreement < 0.35)
  ) {
    label = input.lang === 'ko' ? '방어형' : 'Defend'
  } else {
    label = input.lang === 'ko' ? '주의형' : 'Caution'
  }

  const reason =
    input.lang === 'ko'
      ? `${input.strategy.phaseLabel} 기준이며, 신뢰 ${Math.round(confidence * 100)}%와 주의 신호 ${cautionCount}개를 함께 반영한 결과입니다.`
      : `Derived from ${input.strategy.phaseLabel}, confidence ${Math.round(confidence * 100)}%, and ${cautionCount} active caution signals.`

  return { gradeLabel: label, gradeReason: reason }
}

function resolveConfidence(input: BuildCoreCanonicalOutputInput): number {
  const summaryConfidence = normalizeToUnit(input.matrixSummary?.confidenceScore)
  if (typeof summaryConfidence === 'number') return summaryConfidence
  const scenarioConfidence =
    input.scenarios.length > 0
      ? input.scenarios.reduce((sum, scenario) => sum + clamp(scenario.confidence, 0, 1), 0) /
        input.scenarios.length
      : 0.5
  return round2(clamp(scenarioConfidence, 0, 1))
}

function buildCoherenceAudit(input: BuildCoreCanonicalOutputInput): CoreCoherenceAudit {
  const contradictionFlags: string[] = []
  const notes: string[] = []
  const topPatterns = buildTopPatterns(input)
  const topDecision = buildTopDecision(input)
  const crossAgreement = normalizeToUnit(input.crossAgreement)
  const cautionIds = buildCautions(input)
  const domainProfiles = new Map<string, Set<string>>()

  for (const pattern of topPatterns) {
    for (const domain of pattern.domains) {
      const bucket = domainProfiles.get(domain) || new Set<string>()
      bucket.add(pattern.profile)
      domainProfiles.set(domain, bucket)
    }
  }

  let domainConflictCount = 0
  for (const [domain, profiles] of domainProfiles.entries()) {
    if (profiles.has('upside') && profiles.has('risk')) {
      domainConflictCount += 1
      contradictionFlags.push(`domain_mixed:${domain}`)
    }
  }

  const verificationBias =
    cautionIds.length >= 2 ||
    input.strategy.phase === 'expansion_guarded' ||
    input.strategy.phase === 'high_tension_expansion' ||
    input.strategy.phase === 'defensive_reset' ||
    (crossAgreement !== null && crossAgreement < 0.45)

  if (verificationBias) {
    notes.push(
      input.lang === 'ko'
        ? '\uD604\uC7AC \uD310\uB2E8\uC740 \uD655\uC815\uBCF4\uB2E4 \uAC80\uC99D \uD3B8\uD5A5\uC774 \uC6B0\uC120\uC778 \uAD6C\uC870\uC785\uB2C8\uB2E4.'
        : 'Current judgment is in verification-biased mode rather than direct commitment mode.'
    )
  }

  if (topDecision?.gated) {
    contradictionFlags.push(`gated_top_decision:${topDecision.action}`)
    notes.push(
      topDecision.gateReason ||
        (input.lang === 'ko'
          ? '\uC0C1\uC704 \uACB0\uC815\uC548\uC5D0 \uAC8C\uC774\uD2B8\uAC00 \uAC78\uB824 \uC788\uC5B4 \uC989\uC2DC \uD655\uC815\uBCF4\uB2E4 \uBCF4\uB958\uAC00 \uB354 \uC548\uC804\uD569\uB2C8\uB2E4.'
          : 'The top decision path is gated, so immediate commitment should be deferred.')
    )
  }

  if (crossAgreement !== null && crossAgreement < 0.35) {
    contradictionFlags.push('low_cross_agreement')
    notes.push(
      input.lang === 'ko'
        ? '\uAD50\uCC28 \uD569\uC758\uB3C4\uAC00 \uB0AE\uC544 \uB2E8\uC815\uBCF4\uB2E4 \uC870\uAC74\uBD80 \uC2E4\uD589\uC774 \uB354 \uC801\uD569\uD569\uB2C8\uB2E4.'
        : 'Cross-agreement is low, so conditional execution is safer than hard conclusions.'
    )
  }

  if (domainConflictCount === 0 && !topDecision?.gated && !verificationBias) {
    notes.push(
      input.lang === 'ko'
        ? '\uC0C1\uC704 \uB3C4\uBA54\uC778 \uC2E0\uD638\uAC00 \uBE44\uAD50\uC801 \uD55C \uBC29\uD5A5\uC73C\uB85C \uC815\uB82C\uB3FC \uC788\uC2B5\uB2C8\uB2E4.'
        : 'Lead-domain signals are relatively aligned in one direction.'
    )
  }

  return {
    verificationBias,
    gatedDecision: Boolean(topDecision?.gated),
    domainConflictCount,
    contradictionFlags,
    notes,
  }
}

function uniqueActions(actions: Array<
  'commit_now' |
  'staged_commit' |
  'prepare_only' |
  'review_first' |
  'negotiate_first' |
  'boundary_first' |
  'pilot_first' |
  'route_recheck_first' |
  'lease_review_first' |
  'basecamp_reset_first'
>) {
  return [...new Set(actions)]
}

const MODE_RANK: Record<CoreJudgmentPolicy['mode'], number> = {
  prepare: 0,
  verify: 1,
  execute: 2,
}

const RANK_MODE: Record<number, CoreJudgmentPolicy['mode']> = {
  0: 'prepare',
  1: 'verify',
  2: 'execute',
}

const DOMAIN_ARBITRATION_RULES: Record<
  string,
  {
    minMode: CoreJudgmentPolicy['mode']
    commitThreshold: number
    forceBlockCommitOnRiskFamily?: boolean
    forceVerificationWhenIrreversible?: boolean
  }
> = {
  career: {
    minMode: 'verify',
    commitThreshold: 0.72,
    forceVerificationWhenIrreversible: true,
  },
  relationship: {
    minMode: 'verify',
    commitThreshold: 0.78,
    forceBlockCommitOnRiskFamily: true,
  },
  wealth: {
    minMode: 'verify',
    commitThreshold: 0.8,
    forceBlockCommitOnRiskFamily: true,
    forceVerificationWhenIrreversible: true,
  },
  health: {
    minMode: 'prepare',
    commitThreshold: 0.99,
    forceBlockCommitOnRiskFamily: true,
  },
  move: {
    minMode: 'verify',
    commitThreshold: 0.82,
    forceVerificationWhenIrreversible: true,
  },
  timing: {
    minMode: 'verify',
    commitThreshold: 0.99,
  },
  personality: {
    minMode: 'verify',
    commitThreshold: 0.86,
  },
  spirituality: {
    minMode: 'verify',
    commitThreshold: 0.88,
  },
}

function downgradeMode(
  current: CoreJudgmentPolicy['mode'],
  next: CoreJudgmentPolicy['mode']
): CoreJudgmentPolicy['mode'] {
  return RANK_MODE[Math.min(MODE_RANK[current], MODE_RANK[next])]
}

function resolveJudgmentPolicy(input: {
  lang: 'ko' | 'en'
  coherenceAudit: CoreCoherenceAudit
  topDecision: CoreDecisionLead | null
  phase: BuildCoreCanonicalOutputInput['strategy']['phase']
  confidence: number
  crossAgreement: number | null
  primaryCaution: string
  riskControl: string
  focusDomainVerdict: CoreDomainVerdict | null
}): CoreJudgmentPolicy {
  const hardStops: string[] = []
  const softChecks: string[] = []

  if (input.coherenceAudit.gatedDecision) {
    hardStops.push(
      input.topDecision?.gateReason ||
        (input.lang === 'ko'
          ? '상위 결정안이 게이트에 걸려 즉시 확정은 차단됩니다.'
          : 'The top decision path is gated, so immediate commitment is blocked.')
    )
  }

  if (input.crossAgreement !== null && input.crossAgreement < 0.35) {
    hardStops.push(
      input.lang === 'ko'
        ? '교차 합의도가 낮아 확정형 해석보다 조건부 실행이 우선입니다.'
        : 'Cross-agreement is too low for hard commitment; conditional execution comes first.'
    )
  }

  if (
    input.phase === 'defensive_reset' ||
    input.confidence < 0.42 ||
    input.coherenceAudit.domainConflictCount >= 2
  ) {
    hardStops.push(
      input.lang === 'ko'
        ? '현재 국면에서는 새 확장보다 방어와 재정렬이 우선입니다.'
        : 'The current phase prioritizes defense and reset over fresh expansion.'
    )
  }

  if (input.riskControl) softChecks.push(input.riskControl)
  if (input.primaryCaution) softChecks.push(input.primaryCaution)
  if (input.coherenceAudit.verificationBias) {
    softChecks.push(
      input.lang === 'ko'
        ? '실행 전 검증 절차를 생략하지 마세요.'
        : 'Do not skip the verification step before execution.'
    )
  }

  let mode: CoreJudgmentPolicy['mode'] =
    hardStops.length > 0
      ? 'prepare'
      : input.coherenceAudit.verificationBias || input.phase === 'expansion_guarded'
        ? 'verify'
        : 'execute'

  if (input.focusDomainVerdict) {
    mode = downgradeMode(mode, input.focusDomainVerdict.mode)
    for (const action of input.focusDomainVerdict.blockedActions) {
      if (!hardStops.some((item) => item.includes(action))) {
        hardStops.push(
          input.lang === 'ko'
            ? `${input.focusDomainVerdict.domain} 영역에서는 ${action} 액션이 차단됩니다.`
            : `${action} is blocked in the ${input.focusDomainVerdict.domain} domain.`
        )
      }
    }
  }

  let allowedActions =
    mode === 'execute'
        ? uniqueActions([
            'commit_now',
            'staged_commit',
            'review_first',
            'negotiate_first',
            'boundary_first',
            'pilot_first',
            'route_recheck_first',
            'lease_review_first',
            'basecamp_reset_first',
            'prepare_only',
          ])
      : mode === 'verify'
        ? uniqueActions([
            'staged_commit',
            'review_first',
            'negotiate_first',
            'boundary_first',
            'pilot_first',
            'route_recheck_first',
            'lease_review_first',
            'basecamp_reset_first',
            'prepare_only',
          ])
        : uniqueActions(['prepare_only'])

  if (input.focusDomainVerdict) {
    allowedActions = uniqueActions(
      allowedActions.filter((action) => input.focusDomainVerdict?.allowedActions.includes(action))
    )
    if (allowedActions.length === 0) {
      allowedActions = [...input.focusDomainVerdict.allowedActions]
    }
  }

  const blockedActions = uniqueActions(
    (
      [
        'commit_now',
        'staged_commit',
        'prepare_only',
        'review_first',
        'negotiate_first',
        'boundary_first',
        'pilot_first',
        'route_recheck_first',
        'lease_review_first',
        'basecamp_reset_first',
      ] as const
    ).filter((action) => !allowedActions.includes(action))
  )

  const rationale =
    input.lang === 'ko'
      ? mode === 'execute'
        ? '근거 정렬도가 높아 실행 중심 판단이 가능합니다.'
        : mode === 'verify'
          ? '기회는 있으나 검증 절차를 포함한 단계 실행이 더 적합합니다.'
          : '모순·게이트·저합의 신호 때문에 준비 중심 판단으로 낮춰야 합니다.'
      : mode === 'execute'
        ? 'Evidence alignment supports execution-first judgment.'
        : mode === 'verify'
          ? 'Upside exists, but staged execution with verification is safer.'
          : 'Contradictions, gates, or low agreement force the judgment into prepare-first mode.'

  return {
    mode,
    allowedActions,
    blockedActions,
    hardStops: [...new Set(hardStops)],
    softChecks: [...new Set(softChecks)].slice(0, 4),
    rationale,
  }
}

function buildDomainVerdicts(input: {
  lang: 'ko' | 'en'
  domainLeads: CoreDomainLead[]
  topPatterns: CorePatternLead[]
  topScenarios: CoreScenarioLead[]
  decisionEngine: BuildCoreCanonicalOutputInput['decisionEngine']
  coherenceAudit: CoreCoherenceAudit
}): CoreDomainVerdict[] {
  return input.domainLeads.map((lead) => {
    const rules = DOMAIN_ARBITRATION_RULES[lead.domain] || DOMAIN_ARBITRATION_RULES.personality
    const leadPattern =
      input.topPatterns.find((pattern) => pattern.domains.includes(lead.domain)) || null
    const leadScenario =
      input.topScenarios.find((scenario) => scenario.domain === lead.domain) || null
    const domainOptions = input.decisionEngine.options.filter((option) => option.domain === lead.domain)
    let blockedActions = uniqueActions(
      domainOptions.filter((option) => option.gated).map((option) => option.action)
    )
    let allowedActions = uniqueActions(
      domainOptions.filter((option) => !option.gated).map((option) => option.action)
    )
    let mode: CoreJudgmentPolicy['mode'] =
      blockedActions.includes('commit_now') && allowedActions.length <= 1
        ? 'prepare'
        : blockedActions.includes('commit_now') || input.coherenceAudit.verificationBias
          ? 'verify'
          : 'execute'

    const leadConfidence = round2(
      clamp((lead.dominanceScore / 100) * 0.65 + (lead.scenarioScore / 100) * 0.35, 0.1, 0.99)
    )

    if (leadConfidence < rules.commitThreshold && allowedActions.includes('commit_now')) {
      allowedActions = allowedActions.filter((action) => action !== 'commit_now')
      blockedActions = uniqueActions([...blockedActions, 'commit_now'])
      mode = downgradeMode(mode, 'verify')
    }

    if (
      rules.forceBlockCommitOnRiskFamily &&
      leadPattern?.profile === 'risk' &&
      allowedActions.includes('commit_now')
    ) {
      allowedActions = allowedActions.filter((action) => action !== 'commit_now')
      blockedActions = uniqueActions([...blockedActions, 'commit_now'])
      mode = downgradeMode(mode, 'verify')
    }

    if (
      rules.forceVerificationWhenIrreversible &&
      leadScenario &&
      !leadScenario.reversible &&
      mode === 'execute'
    ) {
      mode = downgradeMode(mode, 'verify')
    }

    mode = downgradeMode(mode, rules.minMode)

    if (mode === 'prepare') {
      allowedActions = allowedActions.filter((action) => action === 'prepare_only')
      if (allowedActions.length === 0) allowedActions = ['prepare_only']
      blockedActions = uniqueActions([
        'commit_now',
        'staged_commit',
        'review_first',
        'negotiate_first',
        'boundary_first',
        'pilot_first',
        'route_recheck_first',
        'lease_review_first',
        'basecamp_reset_first',
        ...blockedActions,
      ])
    } else if (mode === 'verify') {
      allowedActions = uniqueActions(
        allowedActions
          .filter((action) => action !== 'commit_now')
          .concat('prepare_only', 'staged_commit', 'review_first')
      )
      blockedActions = uniqueActions([...blockedActions, 'commit_now'])
    }

    const rationale =
      input.lang === 'ko'
        ? `${lead.domain} 영역은 ${lead.phase} 국면이며, ${leadPattern?.family || 'core'} 패턴 계열이 주도합니다. 도메인 규칙상 현재 모드는 ${mode}로 정리됩니다.`
        : `${lead.domain} is in ${lead.phase} phase, led by the ${leadPattern?.family || 'core'} pattern family. Domain arbitration resolves the current mode as ${mode}.`

    return {
      domain: lead.domain,
      mode,
      confidence: leadConfidence,
      leadPatternId: leadPattern?.id || null,
      leadPatternFamily: leadPattern?.family || null,
      leadScenarioId: leadScenario?.id || null,
      allowedActions: allowedActions.length > 0 ? allowedActions : ['prepare_only'],
      blockedActions,
      rationale,
      evidenceIds: [...new Set([...(lead.evidenceIds || []), ...(leadScenario?.evidenceIds || [])])].slice(0, 8),
    }
  })
}

export function buildCoreCanonicalOutput(
  input: BuildCoreCanonicalOutputInput
): DestinyCoreCanonicalOutput {
  const claimIds = [...new Set((input.signalSynthesis.claims || []).map((claim) => claim.claimId))]
    .filter((id) => id.length > 0)
    .sort()
  const domainLeads = buildDomainLeads(input)
  const canonicalDomains = collectCanonicalDomains(input, domainLeads)
  const focusDomain = resolveFocusDomain(input, domainLeads)
  const riskControl = resolveRiskControl(input, focusDomain)
  const topClaimId = resolveTopClaimId(input, focusDomain, claimIds)
  const leadPatternId = resolveLeadPatternId(input, focusDomain)
  const leadScenarioId = resolveLeadScenarioId(input, focusDomain)
  const { gradeLabel, gradeReason: baseGradeReason } = resolveGrade(input)
  const coherenceAudit = buildCoherenceAudit(input)
  const basePrimaryCaution = resolvePrimaryCaution(input, focusDomain)
  const topDecision = buildTopDecision(input)
  const topPatterns = buildTopPatterns(input)
  const topScenarios = buildTopScenarios(input)
  const domainVerdicts = buildDomainVerdicts({
    lang: input.lang,
    domainLeads: canonicalDomains,
    topPatterns,
    topScenarios,
    decisionEngine: input.decisionEngine,
    coherenceAudit,
  })
  const advisories = buildDomainAdvisories(input, canonicalDomains, domainVerdicts)
  const domainTimingWindows = buildDomainTimingWindows(input, canonicalDomains, domainVerdicts)
  const manifestations = buildDomainManifestations({
    lang: input.lang,
    canonicalInput: input,
    domainLeads: canonicalDomains,
    domainVerdicts,
    domainTimingWindows,
    advisories,
    topPatterns,
    topScenarios,
  })
  const mergedAdvisories = mergeAdvisoriesWithManifestations({
    advisories,
    manifestations,
  })
  const focusManifestation = findManifestation(manifestations, focusDomain)
  const gradeReason = buildGradeReasonWithManifestation({
    lang: input.lang,
    baseReason: baseGradeReason,
    manifestation: focusManifestation,
  })
  const primaryCaution = resolvePrimaryCautionFromManifestation({
    lang: input.lang,
    fallback: basePrimaryCaution,
    manifestation: focusManifestation,
  })
  const primaryAction = resolvePrimaryActionFromManifestation({
    lang: input.lang,
    fallback: resolvePrimaryAction(input, focusDomain, riskControl),
    manifestation: focusManifestation,
  })
  const thesis = resolveCanonicalThesis({
    lang: input.lang,
    focusDomain,
    strategyThesis: input.strategy.thesis,
    manifestation: focusManifestation,
  })
  const judgmentPolicy = resolveJudgmentPolicy({
    lang: input.lang,
    coherenceAudit,
    topDecision,
    phase: input.strategy.phase,
    confidence: resolveConfidence(input),
    crossAgreement: normalizeToUnit(input.crossAgreement),
    primaryCaution,
    riskControl,
    focusDomainVerdict:
      domainVerdicts.find((verdict) => verdict.domain === focusDomain) || domainVerdicts[0] || null,
  })

  return {
    version: 'v1',
    claimIds,
    evidenceRefs: buildEvidenceRefs(input),
    confidence: resolveConfidence(input),
    crossAgreement: normalizeToUnit(input.crossAgreement),
    gradeLabel,
    gradeReason,
    focusDomain,
    phase: input.strategy.phase,
    phaseLabel: input.strategy.phaseLabel,
    attackPercent: input.strategy.attackPercent,
    defensePercent: input.strategy.defensePercent,
    thesis,
    riskControl,
    primaryAction,
    primaryCaution,
    topClaimId,
    leadPatternId,
    leadScenarioId,
    topSignalIds: buildTopSignalIds(input),
    cautions: buildCautions(input),
    domainLeads: canonicalDomains,
    advisories: mergedAdvisories,
    domainTimingWindows,
    manifestations,
    coherenceAudit,
    judgmentPolicy,
    domainVerdicts,
    topPatterns,
    topScenarios,
    topDecision,
    layerScores: buildLayerScores(input),
    interactionHits: buildInteractionHits(input),
    timelineHits: buildTimelineHits(input),
  }
}


