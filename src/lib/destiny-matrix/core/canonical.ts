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
  CoreProvenance,
  CoreScenarioLead,
  CoreTimelineHit,
  DestinyCoreCanonicalOutput,
} from './types'
import { buildDomainManifestations } from './manifestationEngine'
import {
  buildCoherenceNote,
  buildJudgmentPolicy,
  DOMAIN_ARBITRATION_RULES,
  downgradeMode,
  uniqueActions,
} from './canonicalPolicy'

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

function resolveTimingConflictProfile(input: {
  lang: 'ko' | 'en'
  readinessScore: number
  triggerScore: number
  convergenceScore: number
  domain: string
}): {
  timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
  timingConflictNarrative: string
} {
  const gap = input.readinessScore - input.triggerScore
  const domainLabel = input.domain

  if (input.readinessScore < 0.32 && input.triggerScore < 0.32) {
    return {
      timingConflictMode: 'weak_both',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 구조 지지와 촉발 신호가 모두 약해, 사건을 좁혀 보기보다 판이 살아나는지부터 관찰하는 편이 맞습니다.`
          : `${domainLabel} has weak structural support and weak triggering pressure, so the right move is to watch for activation before narrowing the timeline.`,
    }
  }

  if (gap >= 0.18) {
    return {
      timingConflictMode: 'readiness_ahead',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 구조 지지는 먼저 열려 있지만 촉발 신호가 아직 좁지 않아, 지금은 실행보다 준비와 검토가 더 맞습니다.`
          : `${domainLabel} has structural readiness before a clean trigger, so preparation and staged review fit better than immediate execution.`,
    }
  }

  if (gap <= -0.18) {
    return {
      timingConflictMode: 'trigger_ahead',
      timingConflictNarrative:
        input.lang === 'ko'
          ? `${domainLabel}은 촉발은 강하지만 구조 지지가 뒤따르지 않아, 사건성은 있어도 지속성은 약할 수 있습니다.`
          : `${domainLabel} has a live trigger before full structural support, so event pressure may be real while long-term sustainability stays weaker.`,
    }
  }

  return {
    timingConflictMode: 'aligned',
    timingConflictNarrative:
      input.lang === 'ko'
        ? `${domainLabel}은 구조 지지와 촉발 신호가 비교적 같은 방향으로 맞물려, 준비와 실행 리듬을 함께 잡을 수 있는 구간입니다.`
        : `${domainLabel} shows structural support and trigger pressure moving in the same direction, so timing can be staged without fighting the underlying trend.`,
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

function buildSourceFields(input: BuildCoreCanonicalOutputInput, domain: string, includeTiming = false): string[] {
  const fields = new Set<string>()
  const add = (condition: boolean, field: string) => {
    if (condition) fields.add(field)
  }

  add(Boolean(input.matrixInput?.dayMasterElement), 'dayMasterElement')
  add(Boolean(input.matrixInput?.pillarElements?.length), 'pillarElements')
  add(Boolean(input.matrixInput?.sibsinDistribution && Object.keys(input.matrixInput.sibsinDistribution).length), 'sibsinDistribution')
  add(Boolean(input.matrixInput?.relations?.length), 'relations')
  add(Boolean(input.matrixInput?.geokguk), 'geokguk')
  add(Boolean(input.matrixInput?.yongsin), 'yongsin')
  add(Boolean(input.matrixInput?.planetSigns && Object.keys(input.matrixInput.planetSigns).length), 'planetSigns')
  add(Boolean(input.matrixInput?.planetHouses && Object.keys(input.matrixInput.planetHouses).length), 'planetHouses')
  add(Boolean(input.matrixInput?.aspects?.length), 'aspects')
  add(Boolean(input.matrixInput?.activeTransits?.length), 'activeTransits')
  add(Boolean(input.matrixInput?.astroTimingIndex), 'astroTimingIndex')
  add(Boolean(input.matrixInput?.crossSnapshot?.crossAgreement !== undefined), 'crossSnapshot.crossAgreement')
  add(Boolean(input.matrixInput?.crossSnapshot?.astroTimingIndex), 'crossSnapshot.astroTimingIndex')
  add(Boolean(input.matrixInput?.advancedAstroSignals), 'advancedAstroSignals')

  if (includeTiming) {
    add(Boolean(input.matrixInput?.currentDaeunElement), 'currentDaeunElement')
    add(Boolean(input.matrixInput?.currentSaeunElement), 'currentSaeunElement')
    add(Boolean(input.matrixInput?.currentWolunElement), 'currentWolunElement')
    add(Boolean(input.matrixInput?.currentIljinElement), 'currentIljinElement')
    add(Boolean(input.matrixInput?.currentIljinDate), 'currentIljinDate')
  }

  if (domain === 'relationship') {
    add(Boolean(input.matrixInput?.relations?.length), 'relations')
    add(Boolean(input.matrixInput?.aspects?.length), 'aspects')
  } else if (domain === 'career') {
    add(Boolean(input.matrixInput?.geokguk), 'geokguk')
    add(Boolean(input.matrixInput?.planetHouses && Object.keys(input.matrixInput.planetHouses).length), 'planetHouses')
  } else if (domain === 'wealth') {
    add(Boolean(input.matrixInput?.yongsin), 'yongsin')
    add(Boolean(input.matrixInput?.aspects?.length), 'aspects')
  } else if (domain === 'health') {
    add(Boolean(input.matrixInput?.activeTransits?.length), 'activeTransits')
    add(Boolean(input.matrixInput?.planetSigns && Object.keys(input.matrixInput.planetSigns).length), 'planetSigns')
  } else if (domain === 'move') {
    add(Boolean(input.matrixInput?.activeTransits?.length), 'activeTransits')
    add(Boolean(input.matrixInput?.planetHouses && Object.keys(input.matrixInput.planetHouses).length), 'planetHouses')
  }

  return [...fields]
}

function buildSourceSetIds(evidenceIds: string[]): string[] {
  return [...new Set(
    (evidenceIds || []).filter((id) => /(set|anchor|claim|graph|rag)/i.test(String(id)))
  )].slice(0, 8)
}

function buildProvenance(input: {
  canonicalInput: BuildCoreCanonicalOutputInput
  domain: string
  evidenceIds: string[]
  signalIds?: string[]
  ruleIds?: string[]
  includeTiming?: boolean
}): CoreProvenance {
  return {
    sourceFields: buildSourceFields(input.canonicalInput, input.domain, input.includeTiming === true),
    sourceSignalIds: [...new Set(input.signalIds || [])].slice(0, 8),
    sourceRuleIds: [...new Set(input.ruleIds || [])].slice(0, 8),
    sourceSetIds: buildSourceSetIds(input.evidenceIds || []),
  }
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

function isPresentationScenario(scenario: { id: string; branch: string }): boolean {
  const id = String(scenario.id || '').toLowerCase()
  const branch = String(scenario.branch || '').toLowerCase()
  if (!id && !branch) return false
  const genericPattern =
    /(hidden|support|defensive|cluster|alt|fallback|generic|background|residual|residue)/
  return !genericPattern.test(id) && !genericPattern.test(branch)
}

function getPresentationScenarios(input: BuildCoreCanonicalOutputInput) {
  const scenarios = (input.scenarios || []).filter((scenario) => isPresentationScenario(scenario))
  return scenarios.length > 0 ? scenarios : input.scenarios || []
}

function buildTopScenarios(input: BuildCoreCanonicalOutputInput): CoreScenarioLead[] {
  const sourceScenarios = getPresentationScenarios(input)
  const focusDomain = input.strategy.focusDomain || input.strategy.domainStrategies[0]?.domain || null
  const leadScenarioId = sourceScenarios.find((scenario) => scenario.domain === focusDomain)?.id || null
  const scenarioSpecificity = (branch: string) => {
    const key = branch.toLowerCase()
    if (/(review|negotiation|restructure|compliance|acceptance|decision|conflict|disruption)/.test(key)) return 4
    if (/(manager|specialist|authority|cohabitation|cross_border|lease|allocation|execution)/.test(key)) return 3
    if (/(entry|travel|new_connection|recovery|bond_deepening)/.test(key)) return 2
    return 1
  }
  return sourceScenarios
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
      timingGranularity: scenario.timingGranularity,
      precisionReason: scenario.precisionReason,
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
    (input.patterns || []).find((pattern) => pattern.domains.some((domain) => domain === focusDomain))?.id ||
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

function buildDomainAdvisoryCopy(input: {
  lang: 'ko' | 'en'
  domain: string
  phase: string
  claimThesis?: string | null
  scenarioWhyNow?: string | null
  leadScenarioId?: string | null
  action?: string | null
  caution?: string | null
  verdictRationale?: string | null
}): Pick<CoreDomainAdvisory, 'thesis' | 'action' | 'caution' | 'strategyLine'> {
  const leadScenario = String(input.leadScenarioId || '')
  if (input.lang === 'ko') {
    const koDefaults: Record<string, Pick<CoreDomainAdvisory, 'thesis' | 'action' | 'caution' | 'strategyLine'>> = {
      career: {
        thesis:
          input.claimThesis ||
          '커리어는 일을 넓히는 것보다 맡을 역할, 책임, 평가 기준을 먼저 분명히 할 때 성장 폭이 커집니다.',
        action: input.action || '역할, 범위, 기한을 먼저 고정한 뒤 다음 단계를 여세요.',
        caution: input.caution || '분위기만 보고 바로 확정하지 말고 조건과 책임 범위를 먼저 확인하세요.',
        strategyLine:
          input.verdictRationale ||
          '커리어는 확장보다 우선순위와 책임 범위를 먼저 고정할 때 결과 변동이 줄어듭니다.',
      },
      relationship: {
        thesis:
          input.claimThesis ||
          '관계는 감정의 강도보다 거리, 기대치, 경계가 같은 뜻으로 맞춰질 때 안정됩니다.',
        action: input.action || '결론보다 기대치와 속도를 먼저 맞추는 대화를 여세요.',
        caution: input.caution || '해석이 다르다고 느껴질 때 바로 확정이나 약속으로 밀지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '관계에서는 감정 표현보다 속도와 경계를 먼저 맞출수록 오해 비용이 줄어듭니다.',
      },
      wealth: {
        thesis:
          input.claimThesis ||
          '재정은 수익 기대보다 유입 구조와 누수 지점을 먼저 분리해 볼 때 더 안정적으로 커집니다.',
        action: input.action || '금액보다 기한, 취소 조건, 책임 범위를 먼저 나눠 확인하세요.',
        caution: input.caution || '좋아 보이는 조건도 손실 상한을 정하지 않은 채 확정하지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '재정은 공격보다 손실 상한과 조건 점검을 먼저 고정할 때 복원력이 커집니다.',
      },
      health: {
        thesis:
          input.claimThesis ||
          '건강은 버티는 힘보다 회복 리듬과 과부하 신호를 얼마나 빨리 정리하느냐에서 갈립니다.',
        action: input.action || '강도를 올리기보다 회복 블록을 일정에 먼저 고정하세요.',
        caution: input.caution || '피로 신호를 의지로 덮은 채 일정 밀도를 유지하지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '건강은 강한 하루보다 반복 가능한 회복 루틴을 먼저 세울 때 안정됩니다.',
      },
      move: {
        thesis:
          input.claimThesis ||
          '이동과 거점 변화는 크게 옮기는 결정보다 동선, 경로, 생활 거점을 다시 설계할 때 더 정확해집니다.',
        action: input.action || '경로와 생활 동선을 먼저 재확인한 뒤 큰 이동 결정을 여세요.',
        caution: input.caution || '계약이나 이동 일정을 한 번에 확정하지 말고 경로와 비용을 나눠 보세요.',
        strategyLine:
          input.verdictRationale ||
          '이동은 속도보다 경로 검증과 거점 재정비를 먼저 할 때 손실이 줄어듭니다.',
      },
      personality: {
        thesis:
          input.claimThesis ||
          '기본 성향은 빠른 판단보다 기준을 먼저 세우고 정밀하게 조정할 때 더 강하게 작동합니다.',
        action: input.action || '결론을 내리기 전에 기준 문장을 먼저 짧게 고정하세요.',
        caution: input.caution || '해석이 끝나기 전에 결론부터 확정하지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '성향의 강점은 속도가 아니라 기준과 재정렬 능력에서 나옵니다.',
      },
      timing: {
        thesis:
          input.claimThesis ||
          '타이밍은 빨리 결정하는지보다 검토와 확정을 다른 슬롯으로 나눌 수 있는지에 달려 있습니다.',
        action: input.action || '착수와 확정 사이에 재확인 슬롯을 반드시 두세요.',
        caution: input.caution || '당일 판단과 당일 확정을 같은 결정으로 묶지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '타이밍의 핵심은 속도가 아니라 검토와 확정의 분리입니다.',
      },
      spirituality: {
        thesis:
          input.claimThesis ||
          '장기 방향은 외부 성과보다 어떤 기준을 반복 가능한 방식으로 남기는지에서 선명해집니다.',
        action: input.action || '지금 선택을 설명하는 한 줄 원칙을 먼저 정리하세요.',
        caution: input.caution || '큰 의미를 한 번에 확정하려 하지 마세요.',
        strategyLine:
          input.verdictRationale ||
          '장기 방향은 순간의 확신보다 반복 가능한 기준에서 나옵니다.',
      },
    }
    const base = koDefaults[input.domain] || koDefaults.personality
    const scenarioLine = input.scenarioWhyNow
      ? `${input.scenarioWhyNow}`
      : leadScenario
        ? `${leadScenario} 장면이 실제 사건축으로 붙고 있습니다.`
        : ''
    return {
      thesis: base.thesis,
      action: base.action,
      caution: base.caution,
      strategyLine: [base.strategyLine, scenarioLine].filter(Boolean).join(' '),
    }
  }

  const enDefaults: Record<string, Pick<CoreDomainAdvisory, 'thesis' | 'action' | 'caution' | 'strategyLine'>> = {
    career: {
      thesis:
        input.claimThesis ||
        'Career grows faster when role, responsibility, and evaluation standards are clearer than raw expansion.',
      action: input.action || 'Lock scope, deadline, and responsibility before opening the next step.',
      caution: input.caution || 'Do not finalize on momentum alone before checking conditions and responsibility.',
      strategyLine:
        input.verdictRationale ||
        'Career becomes more stable when priorities and responsibility are fixed before expansion.',
    },
    relationship: {
      thesis:
        input.claimThesis ||
        'Relationships stabilize when distance, expectations, and boundaries line up before commitment pressure rises.',
      action: input.action || 'Align pace and expectations before asking for a conclusion.',
      caution: input.caution || 'Do not force labels or promises while interpretation is still mismatched.',
      strategyLine:
        input.verdictRationale ||
        'Relationship risk falls when pace and boundaries are clarified before commitment.',
    },
    wealth: {
      thesis:
        input.claimThesis ||
        'Wealth improves when inflow structure and leakage are separated before upside is chased.',
      action: input.action || 'Check terms, deadlines, and downside first.',
      caution: input.caution || 'Do not commit before the loss boundary is explicit.',
      strategyLine:
        input.verdictRationale ||
        'Financial resilience improves when downside and conditions are fixed before growth.',
    },
    health: {
      thesis:
        input.claimThesis ||
        'Health depends more on recovery rhythm and overload detection than on endurance alone.',
      action: input.action || 'Schedule recovery blocks before increasing load.',
      caution: input.caution || 'Do not cover fatigue signals with willpower.',
      strategyLine:
        input.verdictRationale ||
        'Health stabilizes when recovery is repeatable rather than heroic.',
    },
    move: {
      thesis:
        input.claimThesis ||
        'Movement and relocation improve when route, commute, and basecamp design are checked before big commitment.',
      action: input.action || 'Recheck route and living logistics before final movement decisions.',
      caution: input.caution || 'Do not bundle contract, route, and move timing into one rushed decision.',
      strategyLine:
        input.verdictRationale ||
        'Movement works best when route validation comes before relocation commitment.',
    },
    personality: {
      thesis:
        input.claimThesis ||
        'Your baseline works best when standards are set before speed takes over.',
      action: input.action || 'Fix the standard in one short sentence before deciding.',
      caution: input.caution || 'Do not finalize before the interpretation is complete.',
      strategyLine:
        input.verdictRationale ||
        'The core strength is not speed but standards and recalibration.',
    },
    timing: {
      thesis:
        input.claimThesis ||
        'Timing improves when review and commitment are treated as separate slots.',
      action: input.action || 'Insert a recheck slot between starting and finalizing.',
      caution: input.caution || 'Do not treat same-day judgment and same-day commitment as one action.',
      strategyLine:
        input.verdictRationale ||
        'Timing is won through separation between review and commitment.',
    },
    spirituality: {
      thesis:
        input.claimThesis ||
        'Long-range direction becomes clearer when repeatable standards outlast temporary certainty.',
      action: input.action || 'Name the operating principle before chasing the outcome.',
      caution: input.caution || 'Do not try to finalize meaning in one move.',
      strategyLine:
        input.verdictRationale ||
        'Long-range direction is built through repeatable principles.',
    },
  }
  const base = enDefaults[input.domain] || enDefaults.personality
  const scenarioLine = input.scenarioWhyNow
    ? input.scenarioWhyNow
    : leadScenario
      ? `${leadScenario} is the active scene underneath this domain.`
      : ''
  return {
    thesis: base.thesis,
    action: base.action,
    caution: base.caution,
    strategyLine: [base.strategyLine, scenarioLine].filter(Boolean).join(' '),
  }
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
      (signal) => signal.polarity === 'caution' && signal.domainHints.some((domain) => domain === focusDomain)
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
      provenance: {
        sourceFields: [...new Set([...(advisory.provenance?.sourceFields || []), ...(manifestation.provenance?.sourceFields || [])])].slice(0, 10),
        sourceSignalIds: [...new Set([...(advisory.provenance?.sourceSignalIds || []), ...(manifestation.provenance?.sourceSignalIds || [])])].slice(0, 10),
        sourceRuleIds: [...new Set([...(advisory.provenance?.sourceRuleIds || []), ...(manifestation.provenance?.sourceRuleIds || [])])].slice(0, 10),
        sourceSetIds: [...new Set([...(advisory.provenance?.sourceSetIds || []), ...(manifestation.provenance?.sourceSetIds || [])])].slice(0, 10),
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

function findEvidenceIdsForDomain(
  input: BuildCoreCanonicalOutputInput,
  domain: string
): string[] {
  return [
    ...(input.signalSynthesis.claims || [])
      .filter((item) => item.domain === domain)
      .flatMap((item) => item.evidence || []),
    ...(input.signalSynthesis.selectedSignals || [])
      .filter((signal) => signal.domainHints.some((hint) => hint === domain))
      .map((signal) => signal.id),
    ...(input.patterns || [])
      .filter((pattern) => pattern.domains.some((hint) => hint === domain))
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
      .filter((pattern) => pattern.domains.some((hint) => hint === domain))
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
      .filter((signal) => signal.domainHints.some((hint) => hint === domain))
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
  const strategyDomain =
    (input.strategy.domainStrategies || []).find((item) => item.domain === lead.domain) || null
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
  const timingGranularity =
    scenario?.timingGranularity ||
    (window === 'now'
      ? 'week'
      : window === '1-3m'
        ? 'month'
        : window === '3-6m'
          ? 'month'
          : 'season')
  const readinessScore = round2(clamp(strategyDomain?.metrics.readinessScore || 0.25, 0, 1))
  const triggerScore = round2(clamp(strategyDomain?.metrics.triggerScore || 0.25, 0, 1))
  const convergenceScore = round2(clamp(strategyDomain?.metrics.convergenceScore || 0.2, 0, 1))

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
  const precisionReason =
    scenario?.precisionReason ||
    (input.lang === 'ko'
      ? timingGranularity === 'week'
        ? '단기 신호는 보이지만, 표현 정밀도는 주 단위 상한으로 제한합니다.'
        : timingGranularity === 'month'
          ? '구조 지지가 더 넓어 월 단위 상한으로 해석하는 편이 맞습니다.'
          : '지금은 구조적 흐름을 읽는 구간이라 계절 단위 상한으로 보는 편이 안전합니다.'
      : timingGranularity === 'week'
        ? 'Short-term signals are visible, but the wording is capped at week-level.'
        : timingGranularity === 'month'
          ? 'Structural support is broader than the trigger, so month-level is the safe cap.'
          : 'This is treated as a structural window, so the safe cap stays at season-level.')
  const { timingConflictMode, timingConflictNarrative } = resolveTimingConflictProfile({
    lang: input.lang,
    readinessScore,
    triggerScore,
    convergenceScore,
    domain: lead.domain,
  })
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
    timingGranularity,
    precisionReason,
    timingConflictMode,
    timingConflictNarrative,
    readinessScore,
    triggerScore,
    convergenceScore,
    whyNow,
    entryConditions,
    abortConditions,
    evidenceIds: evidenceIds.slice(0, 8),
    provenance: buildProvenance({
      canonicalInput: input,
      domain: lead.domain,
      evidenceIds,
      signalIds: lead.evidenceIds.filter((id) => (input.signalSynthesis.selectedSignals || []).some((signal) => signal.id === id)),
      ruleIds: [scenario?.patternId, scenario?.id, domainVerdict?.leadPatternId, domainVerdict?.leadScenarioId].filter(
        (value): value is string => Boolean(value)
      ),
      includeTiming: true,
    }),
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
    const sourceScenarios = getPresentationScenarios(input)
    const scenarios = sourceScenarios.filter((item) => item.domain === lead.domain)
    const scenario = scenarios[0] || sourceScenarios[0] || input.scenarios[0]
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
      .filter((pattern) => pattern.domains.some((domain) => domain === lead.domain))
      .sort((a, b) => b.score - a.score || b.confidence - a.confidence)
      .slice(0, 2)
    const evidenceIds = [
      ...(claim?.evidence || []),
      ...leadSignals.map((signal) => signal.id),
      ...leadPatterns.map((pattern) => pattern.id),
      ...(scenario ? [scenario.id] : []),
      ...(lead.evidenceIds || []),
    ].filter((value, index, array) => Boolean(value) && array.indexOf(value) === index)

    const advisoryCopy = buildDomainAdvisoryCopy({
      lang: input.lang,
      domain: lead.domain,
      phase: lead.phase,
      claimThesis: claim?.thesis,
      scenarioWhyNow: scenario?.whyNow,
      leadScenarioId: scenario?.id,
      action:
        claim?.actions?.[0] ||
        scenario?.actions?.[0] ||
        resolveRiskControl(input, lead.domain),
      caution:
        cautionSignal?.advice ||
        cautionSignal?.keyword ||
        (input.lang === 'ko'
          ? '?? ?? ??? ??? ???? ???.'
          : 'Do not skip the recheck step before commitment.'),
      verdictRationale: verdict?.rationale,
    })

    return {
      domain: lead.domain,
      phase: lead.phase,
      thesis: advisoryCopy.thesis,
      action: advisoryCopy.action,
      caution: advisoryCopy.caution,
      timingHint: scenario?.whyNow || buildTimingHintByDomain(input, lead.domain),
      strategyLine: advisoryCopy.strategyLine,
      leadSignalIds: leadSignals.map((signal) => signal.id),
      leadPatternIds: leadPatterns.map((pattern) => pattern.id),
      leadScenarioIds: scenarios.slice(0, 2).map((item) => item.id),
      evidenceIds: evidenceIds.slice(0, 8),
      provenance: buildProvenance({
        canonicalInput: input,
        domain: lead.domain,
        evidenceIds,
        signalIds: leadSignals.map((signal) => signal.id),
        ruleIds: [...leadPatterns.map((pattern) => pattern.id), ...scenarios.slice(0, 2).map((item) => item.id)],
      }),
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

  if (verificationBias) notes.push(buildCoherenceNote({ lang: input.lang, key: 'verification_bias' }))

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
      provenance: buildProvenance({
        canonicalInput: input as unknown as BuildCoreCanonicalOutputInput,
        domain: lead.domain,
        evidenceIds: [...new Set([...(lead.evidenceIds || []), ...(leadScenario?.evidenceIds || [])])],
        signalIds: [],
        ruleIds: [leadPattern?.id, leadScenario?.id].filter((value): value is string => Boolean(value)),
        includeTiming: true,
      }),
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
    claimProvenanceById: buildClaimProvenanceById(input),
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
