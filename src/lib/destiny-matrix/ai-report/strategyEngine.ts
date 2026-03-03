import type { SignalDomain, SignalSynthesisResult } from './signalSynthesizer'

export type StrategyPhaseCode = 'expansion' | 'expansion_guarded' | 'stabilize' | 'defensive_reset'

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
    volatility: number
    momentum: number
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
      expansion_guarded: '확장+리스크관리 국면',
      stabilize: '안정화 국면',
      defensive_reset: '방어/재정렬 국면',
    }
    return map[phase]
  }
  const map: Record<StrategyPhaseCode, string> = {
    expansion: 'Expansion Phase',
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

function decidePhase(
  strengthScore: number,
  cautionScore: number,
  balanceScore: number
): StrategyPhaseCode {
  if (strengthScore >= 8 && cautionScore <= 3) return 'expansion'
  if (strengthScore >= 6 && cautionScore >= 5) return 'expansion_guarded'
  if (cautionScore >= 7 && strengthScore <= 4) return 'defensive_reset'
  if (cautionScore > strengthScore) return 'stabilize'
  if (balanceScore >= 6 && cautionScore >= 5) return 'stabilize'
  return 'expansion_guarded'
}

function computeAttackPercent(
  phase: StrategyPhaseCode,
  strengthScore: number,
  cautionScore: number,
  balanceScore: number
): number {
  let attack = 50 + (strengthScore - cautionScore) * 6 + balanceScore * 1.8
  if (phase === 'expansion') attack = Math.max(65, attack)
  if (phase === 'expansion_guarded') attack = clamp(attack, 55, 72)
  if (phase === 'stabilize') attack = clamp(attack, 45, 58)
  if (phase === 'defensive_reset') attack = Math.min(40, attack)
  return round(clamp(attack, 20, 80))
}

function buildDomainThesis(
  phase: StrategyPhaseCode,
  domain: SignalDomain,
  lang: 'ko' | 'en'
): string {
  const d = domainLabel(domain, lang)
  if (lang === 'ko') {
    if (phase === 'expansion') return `${d}은 확장 신호가 우세해 주도적으로 밀어도 됩니다.`
    if (phase === 'expansion_guarded')
      return `${d}은 기회와 리스크가 함께 있어 공격과 검증을 동시에 운영해야 합니다.`
    if (phase === 'stabilize') return `${d}은 속도보다 구조 정렬이 성과를 지키는 구간입니다.`
    return `${d}은 방어 우선으로 재정렬한 뒤 확장 타이밍을 다시 잡아야 합니다.`
  }
  if (phase === 'expansion') return `${d} has clear upside and supports proactive execution.`
  if (phase === 'expansion_guarded')
    return `${d} shows upside and risk together, so run offense with verification.`
  if (phase === 'stabilize') return `${d} favors structural alignment over speed.`
  return `${d} requires defense-first reset before expansion.`
}

function buildDomainStrategy(
  phase: StrategyPhaseCode,
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
    if (phase === 'expansion')
      return `지금은 확장 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 주도권을 잡되, 확정 전 검수는 유지하세요.`
    if (phase === 'expansion_guarded')
      return `지금은 확장+리스크관리 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 운영하며 검증 단계를 생략하지 마세요.`
    if (phase === 'stabilize')
      return `지금은 안정화 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 속도보다 구조를 먼저 맞추세요.`
    return `지금은 방어/재정렬 국면입니다. 공격 ${attackPercent}% / 방어 ${100 - attackPercent}%로 손실 방지와 재정비를 우선하세요.`
  }
  if (phase === 'expansion')
    return `Expansion phase. Operate at offense ${attackPercent}% / defense ${100 - attackPercent}% with verification before commitment.`
  if (phase === 'expansion_guarded')
    return `Expansion with guardrails. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and keep verification gates.`
  if (phase === 'stabilize')
    return `Stabilization phase. Use offense ${attackPercent}% / defense ${100 - attackPercent}% and align structure first.`
  return `Defensive reset phase. Run offense ${attackPercent}% / defense ${100 - attackPercent}% and prioritize risk containment.`
}

export function buildPhaseStrategyEngine(
  synthesis: SignalSynthesisResult | undefined,
  lang: 'ko' | 'en'
): StrategyEngineResult | undefined {
  if (!synthesis || synthesis.selectedSignals.length === 0) return undefined

  const grouped = synthesis.selectedSignals.reduce<
    Record<string, typeof synthesis.selectedSignals>
  >((acc, signal) => {
    const domain = signal.domainHints[0] || 'personality'
    if (!acc[domain]) acc[domain] = []
    acc[domain].push(signal)
    return acc
  }, {})

  const domainStrategies: DomainStrategy[] = Object.entries(grouped).map(([domain, signals]) => {
    const strengthScore = signals
      .filter((signal) => signal.polarity === 'strength')
      .reduce((sum, signal) => sum + signal.score, 0)
    const cautionScore = signals
      .filter((signal) => signal.polarity === 'caution')
      .reduce((sum, signal) => sum + signal.score, 0)
    const balanceScore = signals
      .filter((signal) => signal.polarity === 'balance')
      .reduce((sum, signal) => sum + signal.score, 0)
    const phase = decidePhase(strengthScore, cautionScore, balanceScore)
    const attackPercent = computeAttackPercent(phase, strengthScore, cautionScore, balanceScore)
    const defensePercent = 100 - attackPercent
    const total = Math.max(1, strengthScore + cautionScore + balanceScore)
    const volatility = round((cautionScore / total) * 100)
    const momentum = round(strengthScore - cautionScore)
    const evidenceIds = signals.slice(0, 3).map((signal) => signal.id)
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
      metrics: {
        strengthScore,
        cautionScore,
        balanceScore,
        volatility,
        momentum,
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
