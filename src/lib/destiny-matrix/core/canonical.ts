import type { DomainKey, MonthlyOverlapPoint } from '@/lib/destiny-matrix/types'
import type { SignalDomain } from './signalSynthesizer'
import type {
  CoreArbitrationEntry,
  CoreArbitrationLedger,
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
  CoreProvenance,
  CoreScenarioLead,
  CoreTimelineHit,
  DestinyCoreCanonicalOutput,
} from './types'
import { buildDomainManifestations } from './manifestationEngine'
import {
  buildCoherenceNote,
  buildJudgmentPolicy,
} from './canonicalPolicy'
import {
  buildDomainAdvisories,
  buildDomainTimingWindows,
  buildDomainVerdicts,
  buildProvenance,
  buildTopScenarios,
  clamp,
  collectCanonicalDomains,
  getPresentationScenarios,
  mapSignalDomainToSummaryDomainKey,
  resolveRiskControl,
  round2,
} from './canonicalDomainSupport'

function pickTopBreakdownLabels(
  breakdown: Record<string, number>,
  labels: Record<string, string>
): string[] {
  return Object.entries(breakdown)
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([key]) => labels[key] || key)
}

function buildFocusDomainRanking(
  input: BuildCoreCanonicalOutputInput,
  domainLeads: CoreDomainLead[]
): CoreArbitrationEntry[] {
  const candidateDomains = new Set<SignalDomain>()
  for (const lead of domainLeads) candidateDomains.add(lead.domain)
  if (input.strategy.focusDomain) candidateDomains.add(input.strategy.focusDomain)
  for (const scenario of input.scenarios || []) {
    if (scenario.domain) candidateDomains.add(scenario.domain)
  }
  for (const option of input.decisionEngine.options || []) {
    if (option.domain) candidateDomains.add(option.domain)
  }

  const leadByDomain = new Map(domainLeads.map((lead) => [lead.domain, lead]))
  const topScenarioByDomain = new Map<SignalDomain, number>()
  for (const scenario of input.scenarios || []) {
    const current = topScenarioByDomain.get(scenario.domain) || 0
    topScenarioByDomain.set(
      scenario.domain,
      Math.max(current, round2((scenario.rawScore ?? scenario.probability) * 100))
    )
  }
  const topDecisionByDomain = new Map<SignalDomain, number>()
  for (const option of input.decisionEngine.options || []) {
    const current = topDecisionByDomain.get(option.domain) || 0
    topDecisionByDomain.set(option.domain, Math.max(current, round2(option.scores.total)))
  }

  return [...candidateDomains]
    .map((domain) => {
      const lead = leadByDomain.get(domain)
      const strategy = (input.strategy.domainStrategies || []).find(
        (item) => item.domain === domain
      )
      const summaryKey = mapSignalDomainToSummaryDomainKey(domain)
      const summaryScore =
        summaryKey && input.matrixSummary?.domainScores
          ? input.matrixSummary.domainScores[summaryKey]
          : null
      const readiness = strategy?.metrics.readinessScore || 0
      const trigger = strategy?.metrics.triggerScore || 0
      const convergence = strategy?.metrics.convergenceScore || 0
      const breakdown = {
        signalDominance: round2((lead?.dominanceScore || 0) * 0.42),
        scenarioDominance: round2(
          (topScenarioByDomain.get(domain) || lead?.scenarioScore || 0) * 0.24
        ),
        decisionDominance: round2(
          (topDecisionByDomain.get(domain) || lead?.decisionScore || 0) * 0.18
        ),
        summaryDominance: round2((summaryScore?.finalScoreAdjusted || 0) * 10 * 0.12),
        convergenceBonus: round2(convergence * 10),
        timingBalanceBonus: round2(
          Math.max(0, readiness + trigger - Math.abs(readiness - trigger)) * 6
        ),
        focusBonus: round2(input.strategy.focusDomain === domain ? 4 : 0),
      }
      const score = round2(
        breakdown.signalDominance +
          breakdown.scenarioDominance +
          breakdown.decisionDominance +
          breakdown.summaryDominance +
          breakdown.convergenceBonus +
          breakdown.timingBalanceBonus +
          breakdown.focusBonus
      )
      const reasons = pickTopBreakdownLabels(breakdown, {
        signalDominance: 'signal dominance',
        scenarioDominance: 'scenario pressure',
        decisionDominance: 'decision pressure',
        summaryDominance: 'summary score',
        convergenceBonus: 'timing convergence',
        timingBalanceBonus: 'timing balance',
        focusBonus: 'strategy focus bias',
      })
      return {
        domain,
        score,
        reason:
          reasons.length > 0
            ? `${domain} won on ${reasons.join(' + ')}`
            : `${domain} won on aggregate support`,
        breakdown,
      } satisfies CoreArbitrationEntry
    })
    .sort((a, b) => b.score - a.score)
}

function buildActionDomainRanking(input: BuildCoreCanonicalOutputInput): CoreArbitrationEntry[] {
  const bestByDomain = new Map<SignalDomain, CoreArbitrationEntry>()

  for (const option of input.decisionEngine.options || []) {
    const breakdown = {
      optionStrength: round2(option.scores.total),
      confidenceBoost: round2(option.confidence * 12),
      topOptionBonus: round2(option.id === input.decisionEngine.topOptionId ? 3 : 0),
      gatedPenalty: round2(option.gated ? 10 : 0),
    }
    const score = round2(
      breakdown.optionStrength +
        breakdown.confidenceBoost +
        breakdown.topOptionBonus -
        breakdown.gatedPenalty
    )
    const reasons = pickTopBreakdownLabels(breakdown, {
      optionStrength: 'decision score',
      confidenceBoost: 'confidence',
      topOptionBonus: 'top-option priority',
      gatedPenalty: 'gate penalty',
    })
    const entry = {
      domain: option.domain,
      score,
      reason:
        reasons.length > 0
          ? `${option.domain} action lead came from ${reasons.join(' + ')}`
          : `${option.domain} action lead came from aggregate option strength`,
      breakdown,
    } satisfies CoreArbitrationEntry
    const current = bestByDomain.get(option.domain)
    if (!current || entry.score > current.score) bestByDomain.set(option.domain, entry)
  }

  return [...bestByDomain.values()].sort((a, b) => b.score - a.score)
}

function buildArbitrationLedger(input: {
  focusRanking: CoreArbitrationEntry[]
  actionRanking: CoreArbitrationEntry[]
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
}): CoreArbitrationLedger {
  const fallbackFocusEntry: CoreArbitrationEntry = {
    domain: input.focusDomain,
    score: 0,
    reason: `${input.focusDomain} was used as the fallback focus domain`,
    breakdown: {},
  }
  const fallbackActionEntry: CoreArbitrationEntry = {
    domain: input.actionFocusDomain,
    score: 0,
    reason: `${input.actionFocusDomain} was used as the fallback action domain`,
    breakdown: {},
  }
  const focusWinner =
    input.focusRanking.find((item) => item.domain === input.focusDomain) ||
    input.focusRanking[0] ||
    fallbackFocusEntry
  const focusRunnerUp =
    input.focusRanking.find((item) => item.domain !== input.focusDomain) ||
    input.focusRanking[1] ||
    null
  const actionWinner =
    input.actionRanking.find((item) => item.domain === input.actionFocusDomain) ||
    input.actionRanking[0] ||
    fallbackActionEntry
  const actionRunnerUp =
    input.actionRanking.find((item) => item.domain !== input.actionFocusDomain) ||
    input.actionRanking[1] ||
    null

  const suppressedDomains = input.focusRanking.slice(1, 5).map((item) => ({
    domain: item.domain,
    scoreGap: round2(Math.max(0, (focusWinner?.score || 0) - item.score)),
    reason:
      item.breakdown.convergenceBonus && item.breakdown.convergenceBonus < 1.5
        ? `${item.domain} stayed secondary because convergence was weaker than the winner`
        : `${item.domain} stayed secondary because total support remained below the winner`,
  }))

  const conflictReasons: string[] = []
  if (input.focusDomain !== input.actionFocusDomain) {
    conflictReasons.push(
      `identity focus stayed on ${input.focusDomain} while the actionable pressure concentrated on ${input.actionFocusDomain}`
    )
  }
  if (focusWinner && focusRunnerUp && focusWinner.score - focusRunnerUp.score < 8) {
    conflictReasons.push(
      `focus competition stayed narrow between ${focusWinner.domain} and ${focusRunnerUp.domain}`
    )
  }
  if (actionWinner && actionRunnerUp && actionWinner.score - actionRunnerUp.score < 6) {
    conflictReasons.push(
      `action pressure stayed narrow between ${actionWinner.domain} and ${actionRunnerUp.domain}`
    )
  }

  return {
    focusWinner,
    focusRunnerUp,
    actionWinner,
    actionRunnerUp,
    suppressedDomains,
    conflictReasons,
  }
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

function buildClaimProvenanceById(
  input: BuildCoreCanonicalOutputInput
): Record<string, CoreProvenance> {
  const out: Record<string, CoreProvenance> = {}
  for (const claim of input.signalSynthesis.claims || []) {
    if (!claim.claimId) continue
    out[claim.claimId] = buildProvenance({
      canonicalInput: input,
      domain: claim.domain,
      evidenceIds: claim.evidence || [],
      signalIds: claim.evidence || [],
      ruleIds: [claim.claimId],
      includeTiming: claim.domain === 'timing',
    })
  }
  return out
}

function buildCautions(input: BuildCoreCanonicalOutputInput): string[] {
  return (input.signalSynthesis.selectedSignals || [])
    .filter((signal) => signal.polarity === 'caution')
    .slice()
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 8)
    .map((signal) => signal.id)
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
        strategy.metrics.strengthScore +
        strategy.metrics.cautionScore +
        strategy.metrics.balanceScore
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

function buildTopDecision(input: BuildCoreCanonicalOutputInput): CoreDecisionLead | null {
  const focusDomain =
    input.strategy.focusDomain || input.strategy.domainStrategies[0]?.domain || null
  const actionSpecificity = (action: string) => {
    if (
      action === 'route_recheck_first' ||
      action === 'lease_review_first' ||
      action === 'basecamp_reset_first'
    )
      return 5
    if (action === 'review_first' || action === 'negotiate_first' || action === 'boundary_first')
      return 4
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

function resolveTopClaimId(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string,
  claimIds: string[]
) {
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
    (input.patterns || []).find((pattern) =>
      pattern.domains.some((domain) => domain === focusDomain)
    )?.id ||
    input.patterns[0]?.id ||
    null
  )
}

function resolveLeadScenarioId(
  input: BuildCoreCanonicalOutputInput,
  focusDomain: string
): string | null {
  const sourceScenarios = getPresentationScenarios(input)
  return (
    sourceScenarios.find((scenario) => scenario.domain === focusDomain)?.id ||
    sourceScenarios[0]?.id ||
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
      (signal) =>
        signal.polarity === 'caution' && signal.domainHints.some((domain) => domain === focusDomain)
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
      evidenceIds: [
        ...new Set([...(advisory.evidenceIds || []), ...(manifestation.evidenceIds || [])]),
      ].slice(0, 10),
      provenance: {
        sourceFields: [
          ...new Set([
            ...(advisory.provenance?.sourceFields || []),
            ...(manifestation.provenance?.sourceFields || []),
          ]),
        ].slice(0, 10),
        sourceSignalIds: [
          ...new Set([
            ...(advisory.provenance?.sourceSignalIds || []),
            ...(manifestation.provenance?.sourceSignalIds || []),
          ]),
        ].slice(0, 10),
        sourceRuleIds: [
          ...new Set([
            ...(advisory.provenance?.sourceRuleIds || []),
            ...(manifestation.provenance?.sourceRuleIds || []),
          ]),
        ].slice(0, 10),
        sourceSetIds: [
          ...new Set([
            ...(advisory.provenance?.sourceSetIds || []),
            ...(manifestation.provenance?.sourceSetIds || []),
          ]),
        ].slice(0, 10),
      },
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

function resolveGrade(input: BuildCoreCanonicalOutputInput): {
  gradeLabel: string
  gradeReason: string
} {
  const phase = input.strategy.phase
  const confidence =
    normalizeToUnit(input.matrixSummary?.confidenceScore) ?? resolveConfidence(input)
  const crossAgreement = normalizeToUnit(input.crossAgreement)
  const cautionCount = (input.signalSynthesis.selectedSignals || []).filter(
    (signal) => signal.polarity === 'caution'
  ).length
  const topDecision = buildTopDecision(input)
  const highRiskCommit = Boolean(
    topDecision && topDecision.reversible === false && cautionCount >= 2
  )

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

  if (verificationBias)
    notes.push(buildCoherenceNote({ lang: input.lang, key: 'verification_bias' }))

  if (topDecision?.gated) {
    contradictionFlags.push(`gated_top_decision:${topDecision.action}`)
    notes.push(buildCoherenceNote({ lang: input.lang, key: 'gated_defer' }))
  }

  if (crossAgreement !== null && crossAgreement < 0.35) {
    contradictionFlags.push('low_cross_agreement')
    notes.push(buildCoherenceNote({ lang: input.lang, key: 'conditional_execution' }))
  }

  if (domainConflictCount === 0 && !topDecision?.gated && !verificationBias) {
    notes.push(buildCoherenceNote({ lang: input.lang, key: 'aligned_domains' }))
  }

  return {
    verificationBias,
    gatedDecision: Boolean(topDecision?.gated),
    domainConflictCount,
    contradictionFlags,
    notes,
  }
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
  return buildJudgmentPolicy(input)
}

export function buildCoreCanonicalOutput(
  input: BuildCoreCanonicalOutputInput
): DestinyCoreCanonicalOutput {
  const claimIds = [...new Set((input.signalSynthesis.claims || []).map((claim) => claim.claimId))]
    .filter((id) => id.length > 0)
    .sort()
  const domainLeads = buildDomainLeads(input)
  const canonicalDomains = collectCanonicalDomains(input, domainLeads)
  const topDecision = buildTopDecision(input)
  const focusRanking = buildFocusDomainRanking(input, domainLeads)
  const focusDomain =
    focusRanking[0]?.domain ||
    input.strategy.focusDomain ||
    domainLeads[0]?.domain ||
    (input.signalSynthesis.claims || []).find((claim) => claim.domain)?.domain ||
    (input.signalSynthesis.selectedSignals || []).find((signal) => signal.domainHints?.length)
      ?.domainHints?.[0] ||
    'personality'
  const actionFocusDomain = topDecision?.domain || focusDomain
  const actionRanking = buildActionDomainRanking(input)
  const arbitrationLedger = buildArbitrationLedger({
    focusRanking,
    actionRanking,
    focusDomain,
    actionFocusDomain,
  })
  const riskControl = resolveRiskControl(input, focusDomain)
  const topClaimId = resolveTopClaimId(input, focusDomain, claimIds)
  const leadPatternId = resolveLeadPatternId(input, focusDomain)
  const leadScenarioId = resolveLeadScenarioId(input, focusDomain)
  const { gradeLabel, gradeReason: baseGradeReason } = resolveGrade(input)
  const coherenceAudit = buildCoherenceAudit(input)
  const basePrimaryCaution = resolvePrimaryCaution(input, focusDomain)
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
    claimProvenanceById: buildClaimProvenanceById(input),
    evidenceRefs: buildEvidenceRefs(input),
    confidence: resolveConfidence(input),
    crossAgreement: normalizeToUnit(input.crossAgreement),
    crossAgreementMatrix: Array.isArray(input.crossAgreementMatrix)
      ? input.crossAgreementMatrix
      : [],
    gradeLabel,
    gradeReason,
    focusDomain,
    actionFocusDomain,
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
    arbitrationLedger,
    subjects: input.matrixInput?.subjects || [],
    relationContexts: input.matrixInput?.relationContexts || [],
    timeSlices: input.matrixInput?.timeSlices || [],
  } satisfies DestinyCoreCanonicalOutput
}

