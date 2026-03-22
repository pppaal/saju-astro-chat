import type { SignalDomain, SignalSynthesisResult } from './signalSynthesizer'
import { STRATEGY_ENGINE_TUNING, type StrategyDomainWeightConfig } from './strategyEngineConfig'

export type StrategyPhaseCode =
  | 'expansion'
  | 'high_tension_expansion'
  | 'expansion_guarded'
  | 'stabilize'
  | 'defensive_reset'

export interface StrategyTimingContext {
  daeunActive?: boolean
  seunActive?: boolean
  wolunActive?: boolean
  iljinActive?: boolean
  activeTransitCount?: number
}

export interface StrategyDomainWeights {
  strengthWeight: number
  cautionWeight: number
  balanceWeight: number
  volatilityWeight: number
}

export interface Strategy3DVector {
  expansion: number
  volatility: number
  structure: number
}

export interface DomainSignalContribution {
  id: string
  keyword?: string
  polarity: 'strength' | 'caution' | 'balance'
  score: number
  sourceWeight: number
  contribution: number
  weightedScore: number
}

export interface DomainStrategy {
  domain: SignalDomain
  phase: StrategyPhaseCode
  phaseLabel: string
  attackPercent: number
  defensePercent: number
  thesis: string
  strategy: string
  riskControl: string
  evidenceIds: string[]
  vector: Strategy3DVector
  signalContributions: DomainSignalContribution[]
  metrics: {
    strengthScore: number
    cautionScore: number
    balanceScore: number
    effectiveStrength: number
    effectiveCaution: number
    effectiveBalance: number
    volatility: number
    momentum: number
    timeActivation: number
    readinessScore?: number
    triggerScore?: number
    convergenceScore?: number
  }
}

export interface StrategyEngineResult {
  overallPhase: StrategyPhaseCode
  overallPhaseLabel: string
  attackPercent: number
  defensePercent: number
  thesis: string
  vector: Strategy3DVector
  vectorMode: 'v1-multi-domain'
  domainStrategies: DomainStrategy[]
}

type SynthSignal = SignalSynthesisResult['normalizedSignals'][number]

interface SignalContributionRaw {
  signal: SynthSignal
  sourceWeight: number
  contribution: number
}

const DOMAIN_ORDER: SignalDomain[] = [
  'career',
  'relationship',
  'wealth',
  'health',
  'personality',
  'timing',
  'spirituality',
  'move',
]
const NON_SELECTED_SIGNAL_WEIGHT = 0.35
const DOMAIN_SIGNAL_NORMALIZATION_TARGET = 3

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value)
}

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function clamp01(value: number): number {
  return clamp(value, 0, 1)
}

function phaseLabel(phase: StrategyPhaseCode, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const map: Record<StrategyPhaseCode, string> = {
      expansion: '확장 국면',
      high_tension_expansion: '고긴장 확장 국면',
      expansion_guarded: '확장+리스크관리 국면',
      stabilize: '안정화 국면',
      defensive_reset: '방어/재정렬 국면',
    }
    return map[phase]
  }
  const map: Record<StrategyPhaseCode, string> = {
    expansion: 'Expansion Phase',
    high_tension_expansion: 'High-Tension Expansion',
    expansion_guarded: 'Expansion with Guardrails',
    stabilize: 'Stabilization Phase',
    defensive_reset: 'Defensive Reset Phase',
  }
  return map[phase]
}

function domainLabel(domain: SignalDomain, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const map: Record<SignalDomain, string> = {
      personality: '성향',
      career: '커리어',
      relationship: '관계',
      wealth: '재정',
      health: '건강',
      spirituality: '사명',
      timing: '시기',
      move: '이동/변화',
    }
    return map[domain]
  }
  return domain
}

function toWeights(cfg: StrategyDomainWeightConfig): StrategyDomainWeights {
  return {
    strengthWeight: cfg.strengthWeight,
    cautionWeight: cfg.cautionWeight,
    balanceWeight: cfg.balanceWeight,
    volatilityWeight: cfg.volatilityWeight,
  }
}

function getDomainWeights(domain: SignalDomain): StrategyDomainWeights {
  if (domain === 'career') return toWeights(STRATEGY_ENGINE_TUNING.domainWeights.career)
  if (domain === 'relationship') return toWeights(STRATEGY_ENGINE_TUNING.domainWeights.relationship)
  if (domain === 'health') return toWeights(STRATEGY_ENGINE_TUNING.domainWeights.health)
  return toWeights(STRATEGY_ENGINE_TUNING.domainWeights.default)
}

function computeTimingProfile(context?: StrategyTimingContext): {
  readinessScore: number
  triggerScore: number
  convergenceScore: number
  timeActivation: number
} {
  const readinessRaw =
    (context?.daeunActive ? 0.42 : 0) +
    (context?.seunActive ? 0.26 : 0) +
    (context?.wolunActive ? 0.2 : 0) +
    (context?.iljinActive ? 0.12 : 0)
  const readinessScore = round2(clamp01(readinessRaw))

  const activeTransitCount = Math.max(0, context?.activeTransitCount || 0)
  const transitSignal = Math.min(activeTransitCount * 0.22, 0.72)
  const shortTermSignal = (context?.wolunActive ? 0.12 : 0) + (context?.iljinActive ? 0.08 : 0)
  const triggerScore = round2(clamp01(transitSignal + shortTermSignal))

  const convergenceBase = Math.sqrt(Math.max(0, readinessScore * triggerScore))
  const convergenceBonus =
    readinessScore >= 0.55 && triggerScore >= 0.45
      ? 0.1
      : readinessScore >= 0.4 && triggerScore >= 0.3
        ? 0.04
        : 0
  const convergenceScore = round2(clamp01(convergenceBase + convergenceBonus))

  const readinessMultiplier =
    1 +
    (context?.daeunActive ? STRATEGY_ENGINE_TUNING.timeActivation.daeunMultiplier - 1 : 0) * 0.55 +
    (context?.seunActive ? STRATEGY_ENGINE_TUNING.timeActivation.seunMultiplier - 1 : 0) * 0.3 +
    (context?.wolunActive ? STRATEGY_ENGINE_TUNING.timeActivation.wolunMultiplier - 1 : 0) * 0.15 +
    (context?.iljinActive ? STRATEGY_ENGINE_TUNING.timeActivation.iljinMultiplier - 1 : 0) * 0.1
  const triggerMultiplier =
    1 +
    Math.min(activeTransitCount, 3) *
      ((STRATEGY_ENGINE_TUNING.timeActivation.transitMultiplier - 1) * 0.38)

  const timeActivation = round2(
    clamp(
      0.92 +
        readinessScore * 0.18 +
        triggerScore * 0.12 +
        convergenceScore * 0.14 +
        (readinessMultiplier - 1) * 0.45 +
        (triggerMultiplier - 1) * 0.35,
      0.9,
      1.38
    )
  )

  return {
    readinessScore,
    triggerScore,
    convergenceScore,
    timeActivation,
  }
}

function normalizeSignalDomains(hints?: SignalDomain[]): SignalDomain[] {
  const values = (hints || []).filter((hint): hint is SignalDomain =>
    DOMAIN_ORDER.includes(hint as SignalDomain)
  )
  const unique = [...new Set(values)]
  return unique.length > 0 ? unique : ['personality']
}

function buildDomainSignalMap(
  signals: SynthSignal[],
  signalWeights: Record<string, number>
): Record<SignalDomain, SignalContributionRaw[]> {
  const grouped = {} as Record<SignalDomain, SignalContributionRaw[]>
  for (const signal of signals) {
    const domains = normalizeSignalDomains(signal.domainHints)
    const sourceWeight = signalWeights[signal.id] ?? NON_SELECTED_SIGNAL_WEIGHT
    const contribution = sourceWeight / domains.length
    for (const domain of domains) {
      if (!grouped[domain]) grouped[domain] = []
      grouped[domain].push({ signal, sourceWeight, contribution })
    }
  }
  return grouped
}

function buildSignalWeightMap(synthesis: SignalSynthesisResult): Record<string, number> {
  const map: Record<string, number> = {}
  for (const signal of synthesis.normalizedSignals || []) {
    map[signal.id] = NON_SELECTED_SIGNAL_WEIGHT
  }
  for (const selected of synthesis.selectedSignals || []) {
    map[selected.id] = 1
  }
  return map
}

function decidePhase(
  strengthScore: number,
  cautionScore: number,
  balanceScore: number,
  volatility: number
): StrategyPhaseCode {
  const rules = STRATEGY_ENGINE_TUNING.phaseRules
  if (
    strengthScore >= rules.highTensionExpansion.minStrength &&
    cautionScore >= rules.highTensionExpansion.minCaution
  ) {
    return 'high_tension_expansion'
  }
  if (strengthScore >= rules.expansion.minStrength && cautionScore <= rules.expansion.maxCaution) {
    return 'expansion'
  }
  if (
    strengthScore >= rules.expansionGuarded.minStrength &&
    cautionScore >= rules.expansionGuarded.minCaution
  ) {
    return 'expansion_guarded'
  }
  if (
    cautionScore >= rules.defensiveReset.minCaution &&
    strengthScore <= rules.defensiveReset.maxStrength
  ) {
    return 'defensive_reset'
  }
  if (
    strengthScore <= rules.lowMomentumReset.maxStrength &&
    volatility >= rules.lowMomentumReset.minVolatility
  ) {
    return 'defensive_reset'
  }
  if (cautionScore > strengthScore) return 'stabilize'
  if (balanceScore >= rules.stabilize.minBalance && cautionScore >= rules.stabilize.minCaution) {
    return 'stabilize'
  }
  return 'expansion_guarded'
}

function computeDomainVector(
  effectiveStrength: number,
  effectiveCaution: number,
  effectiveBalance: number,
  volatility: number
): Strategy3DVector {
  const total = Math.max(0.0001, effectiveStrength + effectiveCaution + effectiveBalance)
  const strengthUnit = (effectiveStrength / total) * 10
  const cautionUnit = (effectiveCaution / total) * 10
  const balanceUnit = (effectiveBalance / total) * 10
  const vf = STRATEGY_ENGINE_TUNING.vectorFormula
  const expansion = clamp(
    vf.expansionBase +
      strengthUnit * vf.expansionFromStrength +
      balanceUnit * vf.expansionFromBalance -
      cautionUnit * vf.expansionFromCaution,
    0,
    100
  )
  const volatilityVector = clamp(
    vf.volatilityBase +
      cautionUnit * vf.volatilityFromCaution +
      Math.max(0, volatility - 1) * vf.volatilityFromImbalance -
      balanceUnit * vf.volatilityFromBalance,
    0,
    100
  )
  const structure = clamp(
    vf.structureBase +
      balanceUnit * vf.structureFromBalance +
      cautionUnit * vf.structureFromCaution +
      strengthUnit * vf.structureFromStrength,
    0,
    100
  )
  return {
    expansion: round1(expansion),
    volatility: round1(volatilityVector),
    structure: round1(structure),
  }
}

function decidePhaseByVector(vector: Strategy3DVector): StrategyPhaseCode | undefined {
  const rules = STRATEGY_ENGINE_TUNING.vectorPhaseRules
  if (
    vector.expansion >= rules.highTension.minExpansion &&
    vector.volatility >= rules.highTension.minVolatility
  ) {
    return 'high_tension_expansion'
  }
  if (
    vector.expansion <= rules.defensiveReset.maxExpansion &&
    vector.volatility >= rules.defensiveReset.minVolatility
  ) {
    return 'defensive_reset'
  }
  if (
    vector.expansion >= rules.expansion.minExpansion &&
    vector.volatility <= rules.expansion.maxVolatility
  ) {
    return 'expansion'
  }
  if (
    vector.expansion >= rules.expansionGuarded.minExpansion &&
    vector.volatility <= rules.expansionGuarded.maxVolatility
  ) {
    return 'expansion_guarded'
  }
  if (
    vector.structure >= rules.stabilize.minStructure &&
    vector.volatility <= rules.stabilize.maxVolatility
  ) {
    return 'stabilize'
  }
  return undefined
}

function computeAttackPercent(
  phase: StrategyPhaseCode,
  momentum: number,
  volatility: number,
  balanceScore: number,
  domain: SignalDomain
): number {
  const weights = getDomainWeights(domain)
  const formula = STRATEGY_ENGINE_TUNING.attackFormula
  let attack =
    formula.base +
    momentum * formula.momentumCoeff -
    (volatility - 1) * (formula.volatilityCoeff * weights.volatilityWeight) +
    balanceScore * formula.balanceCoeff

  if (phase === 'expansion') attack = Math.max(formula.expansionMin, attack)
  if (phase === 'high_tension_expansion') {
    attack = clamp(attack, formula.highTensionRange.min, formula.highTensionRange.max)
  }
  if (phase === 'expansion_guarded') {
    attack = clamp(attack, formula.expansionGuardedRange.min, formula.expansionGuardedRange.max)
  }
  if (phase === 'stabilize') {
    attack = clamp(attack, formula.stabilizeRange.min, formula.stabilizeRange.max)
  }
  if (phase === 'defensive_reset') attack = Math.min(formula.defensiveResetMax, attack)

  return round(clamp(attack, formula.min, formula.max))
}

function buildDomainThesis(
  phase: StrategyPhaseCode,
  domain: SignalDomain,
  lang: 'ko' | 'en'
): string {
  const d = domainLabel(domain, lang)
  if (lang === 'ko') {
    if (phase === 'expansion') return `${d}은 확장 신호가 우세해 주도적으로 밀어도 됩니다.`
    if (phase === 'high_tension_expansion') {
      return `${d}은 가속 확장이 가능하지만 긴장도가 높아 확정 전 위험 항목 점검이 필수입니다.`
    }
    if (phase === 'expansion_guarded') {
      return `${d}은 기회와 리스크가 함께 있어 공격과 재확인을 동시에 운영해야 합니다.`
    }
    if (phase === 'stabilize') return `${d}은 속도보다 구조 정렬이 성과를 지키는 구간입니다.`
    return `${d}은 방어 우선으로 재정렬한 뒤 확장 타이밍을 다시 잡아야 합니다.`
  }
  if (phase === 'expansion') return `${d} has clear upside and supports proactive execution.`
  if (phase === 'high_tension_expansion') {
    return `${d} can expand fast, but high tension requires strict pre-commit checks.`
  }
  if (phase === 'expansion_guarded') {
    return `${d} shows upside and risk together, so run offense with recheck gates.`
  }
  if (phase === 'stabilize') return `${d} favors structural alignment over speed.`
  return `${d} requires defense-first reset before expansion.`
}

function buildDomainStrategy(
  phase: StrategyPhaseCode,
  attackPercent: number,
  domain: SignalDomain,
  lang: 'ko' | 'en'
): string {
  const detailByKey: Record<string, string> = {
    'career:expansion': 'Prioritize 1-2 core tasks, then commit externally after checklist pass.',
    'career:high_tension_expansion': 'Make decision now, but delay sign/send until a 24h recheck.',
    'relationship:expansion_guarded':
      'Increase dialogue volume, delay final statements, and confirm intent in one line.',
    'wealth:expansion_guarded':
      'Split position size and lock amount/deadline/cancellation terms before commitment.',
    'health:defensive_reset':
      'Reduce load immediately and restore sleep-hydration-recovery blocks first.',
    'timing:high_tension_expansion':
      'Separate decision timing from execution timing to reduce communication risk.',
  }
  const key = `${domain}:${phase}`
  const detail = detailByKey[key] || 'Execute in staged steps with explicit recheck gates.'

  if (lang === 'ko') {
    return `${domainLabel(domain, lang)} 전략은 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 운용하세요. ${detail}`
  }
  return `Run ${domain} at offense ${attackPercent}% / defense ${100 - attackPercent}%. ${detail}`
}

function buildOverallThesis(
  phase: StrategyPhaseCode,
  attackPercent: number,
  vector: Strategy3DVector,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (phase === 'expansion') {
      return `지금은 확장 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 주도권을 잡되, 재확인 단계는 유지하세요. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
    }
    if (phase === 'high_tension_expansion') {
      return `지금은 고긴장 확장 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 가속은 가능하지만, 확정 전 항목별 점검을 고정해야 합니다. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
    }
    if (phase === 'expansion_guarded') {
      return `지금은 확장+리스크관리 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 운영하며 재확인 단계를 생략하지 마세요. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
    }
    if (phase === 'stabilize') {
      return `지금은 안정화 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 속도보다 구조를 먼저 맞추세요. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
    }
    return `지금은 방어/재정렬 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 손실 방지와 재정비를 우선하세요. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
  }
  if (phase === 'expansion') {
    return `Expansion phase. Operate at offense ${attackPercent}% / defense ${100 - attackPercent}% with recheck before commitment. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
  }
  if (phase === 'high_tension_expansion') {
    return `High-tension expansion. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and force pre-commit checks. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
  }
  if (phase === 'expansion_guarded') {
    return `Expansion with guardrails. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and keep recheck gates. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
  }
  if (phase === 'stabilize') {
    return `Stabilization phase. Use offense ${attackPercent}% / defense ${100 - attackPercent}% and align structure first. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
  }
  return `Defensive reset phase. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and prioritize risk containment. (E:${vector.expansion}/V:${vector.volatility}/S:${vector.structure})`
}

function buildOverallVector(domainStrategies: DomainStrategy[]): Strategy3DVector {
  if (domainStrategies.length === 0) {
    return { expansion: 0, volatility: 0, structure: 0 }
  }
  const weighted = domainStrategies.map((item) => ({
    vector: item.vector,
    weight:
      item.metrics.strengthScore + item.metrics.cautionScore + item.metrics.balanceScore > 0
        ? item.metrics.strengthScore + item.metrics.cautionScore + item.metrics.balanceScore
        : 1,
  }))
  const totalWeight = weighted.reduce((sum, item) => sum + item.weight, 0) || 1
  return {
    expansion: round1(
      weighted.reduce((sum, item) => sum + item.vector.expansion * item.weight, 0) / totalWeight
    ),
    volatility: round1(
      weighted.reduce((sum, item) => sum + item.vector.volatility * item.weight, 0) / totalWeight
    ),
    structure: round1(
      weighted.reduce((sum, item) => sum + item.vector.structure * item.weight, 0) / totalWeight
    ),
  }
}

export function buildPhaseStrategyEngine(
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en',
  timingContext?: StrategyTimingContext
): StrategyEngineResult | undefined {
  if (!synthesis || synthesis.normalizedSignals.length === 0) return undefined

  const timingProfile = computeTimingProfile(timingContext)
  const timeActivation = timingProfile.timeActivation
  const signalWeights = buildSignalWeightMap(synthesis)
  const grouped = buildDomainSignalMap(synthesis.normalizedSignals, signalWeights)

  const domainStrategies: DomainStrategy[] = Object.entries(grouped).map(([domain, rows]) => {
    const contributions = rows as SignalContributionRaw[]
    const normalizationFactor = Math.max(
      1,
      contributions.length / DOMAIN_SIGNAL_NORMALIZATION_TARGET
    )
    const baseStrengthScore =
      contributions
        .filter((row) => row.signal.polarity === 'strength')
        .reduce((sum, row) => sum + row.signal.score * row.contribution, 0) / normalizationFactor
    const baseCautionScore =
      contributions
        .filter((row) => row.signal.polarity === 'caution')
        .reduce((sum, row) => sum + row.signal.score * row.contribution, 0) / normalizationFactor
    const baseBalanceScore =
      contributions
        .filter((row) => row.signal.polarity === 'balance')
        .reduce((sum, row) => sum + row.signal.score * row.contribution, 0) / normalizationFactor

    const weights = getDomainWeights(domain as SignalDomain)

    const effectiveStrength = baseStrengthScore * timeActivation * weights.strengthWeight
    const effectiveCaution = baseCautionScore * timeActivation * weights.cautionWeight
    const effectiveBalance = baseBalanceScore * timeActivation * weights.balanceWeight

    const strengthScore = round1(effectiveStrength)
    const cautionScore = round1(effectiveCaution)
    const balanceScore = round1(effectiveBalance)

    const momentum = round1(effectiveStrength - effectiveCaution)
    const rawVolatility =
      effectiveStrength > 0 ? effectiveCaution / effectiveStrength : effectiveCaution > 0 ? 2 : 0
    const volatility = round2(rawVolatility * weights.volatilityWeight)

    const vector = computeDomainVector(
      effectiveStrength,
      effectiveCaution,
      effectiveBalance,
      volatility
    )

    const scalarPhase = decidePhase(strengthScore, cautionScore, balanceScore, volatility)
    const vectorPhase = decidePhaseByVector(vector)
    let phase = scalarPhase
    if (vectorPhase) {
      phase = vectorPhase
      // Keep the strongest risk signal if scalar says high tension.
      if (scalarPhase === 'high_tension_expansion' && vectorPhase !== 'high_tension_expansion') {
        phase = 'high_tension_expansion'
      }
      // Avoid unsafe upshift: if scalar is defensive, keep defensive.
      if (scalarPhase === 'defensive_reset' && vectorPhase !== 'defensive_reset') {
        phase = 'defensive_reset'
      }
    }

    const attackPercent = computeAttackPercent(
      phase,
      momentum,
      volatility,
      balanceScore,
      domain as SignalDomain
    )
    const defensePercent = 100 - attackPercent

    const evidenceIds = [...contributions]
      .sort((a, b) => b.signal.score * b.contribution - a.signal.score * a.contribution)
      .map((row) => row.signal.id)
      .filter((id, index, arr) => arr.indexOf(id) === index)
      .slice(0, 3)

    const signalContributions: DomainSignalContribution[] = contributions
      .map((row) => ({
        id: row.signal.id,
        keyword: row.signal.keyword,
        polarity: row.signal.polarity,
        score: row.signal.score,
        sourceWeight: round2(row.sourceWeight),
        contribution: round2(row.contribution),
        weightedScore: round2(row.signal.score * row.contribution),
      }))
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, 8)

    const claim = synthesis.claims.find((item) => item.domain === domain)

    return {
      domain: domain as SignalDomain,
      phase,
      phaseLabel: phaseLabel(phase, lang),
      attackPercent,
      defensePercent,
      thesis: claim?.thesis || buildDomainThesis(phase, domain as SignalDomain, lang),
      strategy: buildDomainStrategy(phase, attackPercent, domain as SignalDomain, lang),
      riskControl: claim?.riskControl || '',
      evidenceIds,
      vector,
      signalContributions,
      metrics: {
        strengthScore,
        cautionScore,
        balanceScore,
        effectiveStrength: round2(effectiveStrength),
        effectiveCaution: round2(effectiveCaution),
        effectiveBalance: round2(effectiveBalance),
        volatility,
        momentum,
        timeActivation: round2(timeActivation),
        readinessScore: timingProfile.readinessScore,
        triggerScore: timingProfile.triggerScore,
        convergenceScore: timingProfile.convergenceScore,
      },
    }
  })

  const sorted = [...domainStrategies].sort(
    (a, b) =>
      b.metrics.strengthScore +
      b.metrics.cautionScore +
      b.metrics.balanceScore -
      (a.metrics.strengthScore + a.metrics.cautionScore + a.metrics.balanceScore)
  )

  const head = sorted[0] || domainStrategies[0]
  const vector = buildOverallVector(sorted)
  const avgStrength = round1(
    domainStrategies.reduce((sum, strategy) => sum + strategy.metrics.strengthScore, 0) /
      Math.max(1, domainStrategies.length)
  )
  const avgCaution = round1(
    domainStrategies.reduce((sum, strategy) => sum + strategy.metrics.cautionScore, 0) /
      Math.max(1, domainStrategies.length)
  )
  const avgBalance = round1(
    domainStrategies.reduce((sum, strategy) => sum + strategy.metrics.balanceScore, 0) /
      Math.max(1, domainStrategies.length)
  )
  const avgVolatility = round2(
    domainStrategies.reduce((sum, strategy) => sum + strategy.metrics.volatility, 0) /
      Math.max(1, domainStrategies.length)
  )

  const scalarOverallPhase = decidePhase(avgStrength, avgCaution, avgBalance, avgVolatility)
  const vectorOverallPhase = decidePhaseByVector(vector)
  let overallPhase = vectorOverallPhase || scalarOverallPhase || head?.phase || 'stabilize'
  if (scalarOverallPhase === 'high_tension_expansion') overallPhase = 'high_tension_expansion'
  if (scalarOverallPhase === 'defensive_reset') overallPhase = 'defensive_reset'

  const attackPercent = round(
    domainStrategies.reduce((sum, strategy) => sum + strategy.attackPercent, 0) /
      Math.max(1, domainStrategies.length)
  )

  return {
    overallPhase,
    overallPhaseLabel: phaseLabel(overallPhase, lang),
    attackPercent,
    defensePercent: 100 - attackPercent,
    thesis: buildOverallThesis(overallPhase, attackPercent, vector, lang),
    vector,
    vectorMode: 'v1-multi-domain',
    domainStrategies: sorted,
  }
}
