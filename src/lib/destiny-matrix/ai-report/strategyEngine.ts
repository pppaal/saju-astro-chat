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
  activeTransitCount?: number
}

export interface StrategyDomainWeights {
  strengthWeight: number
  cautionWeight: number
  balanceWeight: number
  volatilityWeight: number
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
  }
}

export interface StrategyEngineResult {
  overallPhase: StrategyPhaseCode
  overallPhaseLabel: string
  attackPercent: number
  defensePercent: number
  thesis: string
  domainStrategies: DomainStrategy[]
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value)
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

function computeTimeActivation(context?: StrategyTimingContext): number {
  const daeun = context?.daeunActive ? STRATEGY_ENGINE_TUNING.timeActivation.daeunMultiplier : 1
  const seun = context?.seunActive ? STRATEGY_ENGINE_TUNING.timeActivation.seunMultiplier : 1
  const transit =
    (context?.activeTransitCount || 0) > 0
      ? STRATEGY_ENGINE_TUNING.timeActivation.transitMultiplier
      : 1
  return daeun * seun * transit
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
      return `${d}은 가속 확장이 가능하지만 긴장도가 높아 확정 전 위험 항목 검증이 필수입니다.`
    }
    if (phase === 'expansion_guarded') {
      return `${d}은 기회와 리스크가 함께 있어 공격과 검증을 동시에 운영해야 합니다.`
    }
    if (phase === 'stabilize') return `${d}은 속도보다 구조 정렬이 성과를 지키는 구간입니다.`
    return `${d}은 방어 우선으로 재정렬한 뒤 확장 타이밍을 다시 잡아야 합니다.`
  }
  if (phase === 'expansion') return `${d} has clear upside and supports proactive execution.`
  if (phase === 'high_tension_expansion') {
    return `${d} can expand fast, but high tension requires strict pre-commit verification.`
  }
  if (phase === 'expansion_guarded') {
    return `${d} shows upside and risk together, so run offense with verification.`
  }
  if (phase === 'stabilize') return `${d} favors structural alignment over speed.`
  return `${d} requires defense-first reset before expansion.`
}

function buildDomainStrategy(
  attackPercent: number,
  domain: SignalDomain,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    return `${domainLabel(domain, lang)} 전략은 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 운용하세요.`
  }
  return `Run ${domain} at offense ${attackPercent}% / defense ${100 - attackPercent}%.`
}

function buildOverallThesis(
  phase: StrategyPhaseCode,
  attackPercent: number,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (phase === 'expansion') {
      return `지금은 확장 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 주도권을 잡되, 확정 전 검수는 유지하세요.`
    }
    if (phase === 'high_tension_expansion') {
      return `지금은 고긴장 확장 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 가속은 가능하지만, 확정 전 항목별 검증을 고정해야 합니다.`
    }
    if (phase === 'expansion_guarded') {
      return `지금은 확장+리스크관리 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 운영하며 검증 단계를 생략하지 마세요.`
    }
    if (phase === 'stabilize') {
      return `지금은 안정화 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 속도보다 구조를 먼저 맞추세요.`
    }
    return `지금은 방어/재정렬 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 손실 방지와 재정비를 우선하세요.`
  }
  if (phase === 'expansion') {
    return `Expansion phase. Operate at offense ${attackPercent}% / defense ${100 - attackPercent}% with verification before commitment.`
  }
  if (phase === 'high_tension_expansion') {
    return `High-tension expansion. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and force pre-commit checks.`
  }
  if (phase === 'expansion_guarded') {
    return `Expansion with guardrails. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and keep verification gates.`
  }
  if (phase === 'stabilize') {
    return `Stabilization phase. Use offense ${attackPercent}% / defense ${100 - attackPercent}% and align structure first.`
  }
  return `Defensive reset phase. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and prioritize risk containment.`
}

export function buildPhaseStrategyEngine(
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en',
  timingContext?: StrategyTimingContext
): StrategyEngineResult | undefined {
  if (!synthesis || synthesis.selectedSignals.length === 0) return undefined

  const timeActivation = computeTimeActivation(timingContext)

  const grouped = synthesis.selectedSignals.reduce<
    Record<string, typeof synthesis.selectedSignals>
  >((acc, signal) => {
    const domain = signal.domainHints[0] || 'personality'
    if (!acc[domain]) acc[domain] = []
    acc[domain].push(signal)
    return acc
  }, {})

  const domainStrategies: DomainStrategy[] = Object.entries(grouped).map(([domain, signals]) => {
    const baseStrengthScore = signals
      .filter((signal) => signal.polarity === 'strength')
      .reduce((sum, signal) => sum + signal.score, 0)
    const baseCautionScore = signals
      .filter((signal) => signal.polarity === 'caution')
      .reduce((sum, signal) => sum + signal.score, 0)
    const baseBalanceScore = signals
      .filter((signal) => signal.polarity === 'balance')
      .reduce((sum, signal) => sum + signal.score, 0)

    const weights = getDomainWeights(domain as SignalDomain)

    const effectiveStrength = baseStrengthScore * timeActivation * weights.strengthWeight
    const effectiveCaution = baseCautionScore * timeActivation * weights.cautionWeight
    const effectiveBalance = baseBalanceScore * timeActivation * weights.balanceWeight

    const strengthScore = round(effectiveStrength * 10) / 10
    const cautionScore = round(effectiveCaution * 10) / 10
    const balanceScore = round(effectiveBalance * 10) / 10

    const momentum = round((effectiveStrength - effectiveCaution) * 10) / 10
    const rawVolatility =
      effectiveStrength > 0 ? effectiveCaution / effectiveStrength : effectiveCaution > 0 ? 2 : 0
    const volatility = round(rawVolatility * weights.volatilityWeight * 100) / 100

    const phase = decidePhase(strengthScore, cautionScore, balanceScore, volatility)
    const attackPercent = computeAttackPercent(
      phase,
      momentum,
      volatility,
      balanceScore,
      domain as SignalDomain
    )
    const defensePercent = 100 - attackPercent

    const evidenceIds = signals.slice(0, 3).map((signal) => signal.id)
    const claim = synthesis.claims.find((item) => item.domain === domain)

    return {
      domain: domain as SignalDomain,
      phase,
      phaseLabel: phaseLabel(phase, lang),
      attackPercent,
      defensePercent,
      thesis: claim?.thesis || buildDomainThesis(phase, domain as SignalDomain, lang),
      strategy: buildDomainStrategy(attackPercent, domain as SignalDomain, lang),
      riskControl: claim?.riskControl || '',
      evidenceIds,
      metrics: {
        strengthScore,
        cautionScore,
        balanceScore,
        effectiveStrength: round(effectiveStrength * 100) / 100,
        effectiveCaution: round(effectiveCaution * 100) / 100,
        effectiveBalance: round(effectiveBalance * 100) / 100,
        volatility,
        momentum,
        timeActivation: round(timeActivation * 100) / 100,
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
  const overallPhase = head?.phase || 'stabilize'
  const attackPercent = round(
    domainStrategies.reduce((sum, strategy) => sum + strategy.attackPercent, 0) /
      Math.max(1, domainStrategies.length)
  )

  return {
    overallPhase,
    overallPhaseLabel: phaseLabel(overallPhase, lang),
    attackPercent,
    defensePercent: 100 - attackPercent,
    thesis: buildOverallThesis(overallPhase, attackPercent, lang),
    domainStrategies: sorted,
  }
}
