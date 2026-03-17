import type { SignalDomain } from './signalSynthesizer'
import type { StrategyEngineResult, StrategyPhaseCode } from './strategyEngine'
import type { PatternResult } from './patternEngine'
import type { ScenarioResult } from './scenarioEngine'

export type DecisionActionType =
  | 'commit_now'
  | 'staged_commit'
  | 'prepare_only'
  | 'review_first'
  | 'negotiate_first'
  | 'boundary_first'
  | 'pilot_first'
  | 'route_recheck_first'
  | 'lease_review_first'
  | 'basecamp_reset_first'

export interface DecisionScoreCard {
  growth: number
  risk: number
  stability: number
  total: number
}

export interface DecisionOption {
  id: string
  domain: SignalDomain
  action: DecisionActionType
  label: string
  summary: string
  reversible: boolean
  gated: boolean
  gateReason: string | null
  rank: number
  confidence: number
  scores: DecisionScoreCard
  supportingPatternIds: string[]
  supportingScenarioIds: string[]
  supportingSignalIds: string[]
}

export interface DecisionDomainResult {
  domain: SignalDomain
  bestOptionId: string | null
  bestScore: number
  optionIds: string[]
}

export interface DecisionEngineResult {
  mode: 'option-comparison-v1'
  topOptionId: string | null
  topOptionScore: number
  options: DecisionOption[]
  domains: DecisionDomainResult[]
}

interface OptionTemplate {
  action: DecisionActionType
  growthBias: number
  riskBias: number
  stabilityBias: number
  irreversiblePenalty: number
  reversible: boolean
}

interface DomainContext {
  domain: SignalDomain
  phase: StrategyPhaseCode
  attackPercent: number
  defensePercent: number
  vector: { expansion: number; volatility: number; structure: number }
  evidenceSignalIds: string[]
  patternIds: string[]
  scenarioIds: string[]
  scenarioBranches: string[]
  patternScore: number
  scenarioProbability: number
  scenarioConfidence: number
  scenarioTimingRelevance: number
  irreversibleScenarioCount: number
  riskPatternCount: number
  evidenceDensity: number
  blockedActions: string[]
  resolvedMode: 'execute' | 'verify' | 'prepare'
  domainState: PatternResult['domainState']
  crossAgreement: number | null
  manifestationPressure: number
}

const OPTION_TEMPLATES: OptionTemplate[] = [
  {
    action: 'commit_now',
    growthBias: 1,
    riskBias: 1,
    stabilityBias: 0.85,
    irreversiblePenalty: 14,
    reversible: false,
  },
  {
    action: 'staged_commit',
    growthBias: 0.88,
    riskBias: 0.72,
    stabilityBias: 1.08,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'prepare_only',
    growthBias: 0.72,
    riskBias: 0.58,
    stabilityBias: 1.18,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'review_first',
    growthBias: 0.78,
    riskBias: 0.54,
    stabilityBias: 1.14,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'negotiate_first',
    growthBias: 0.82,
    riskBias: 0.6,
    stabilityBias: 1.08,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'boundary_first',
    growthBias: 0.68,
    riskBias: 0.5,
    stabilityBias: 1.16,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'pilot_first',
    growthBias: 0.84,
    riskBias: 0.62,
    stabilityBias: 1.04,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'route_recheck_first',
    growthBias: 0.74,
    riskBias: 0.52,
    stabilityBias: 1.15,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'lease_review_first',
    growthBias: 0.76,
    riskBias: 0.54,
    stabilityBias: 1.12,
    irreversiblePenalty: 0,
    reversible: true,
  },
  {
    action: 'basecamp_reset_first',
    growthBias: 0.72,
    riskBias: 0.5,
    stabilityBias: 1.18,
    irreversiblePenalty: 0,
    reversible: true,
  },
]

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function round(value: number): number {
  return Math.round(value)
}

function mean(values: number[]): number {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)]
}

function normalizeDomain(domain: string): SignalDomain {
  const allowed: SignalDomain[] = [
    'career',
    'relationship',
    'wealth',
    'health',
    'timing',
    'move',
    'personality',
    'spirituality',
  ]
  return allowed.includes(domain as SignalDomain) ? (domain as SignalDomain) : 'personality'
}

function domainLabel(domain: SignalDomain, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    const ko: Record<SignalDomain, string> = {
      personality: '성향',
      career: '커리어',
      relationship: '관계',
      wealth: '재정',
      health: '건강',
      spirituality: '사명',
      timing: '타이밍',
      move: '이동/변화',
    }
    return ko[domain]
  }
  return domain
}

function actionLabel(action: DecisionActionType, lang: 'ko' | 'en'): string {
  if (lang === 'ko') {
    if (action === 'commit_now') return '지금 확정'
    if (action === 'staged_commit') return '단계 확정'
    if (action === 'review_first') return '검토 우선'
    if (action === 'negotiate_first') return '협의 우선'
    if (action === 'boundary_first') return '경계 정리 우선'
    if (action === 'pilot_first') return '파일럿 우선'
    if (action === 'route_recheck_first') return '경로 재확인 우선'
    if (action === 'lease_review_first') return '조건 재확인·협의 우선'
    if (action === 'basecamp_reset_first') return '거점 재정비 우선'
    return '준비 우선'
  }
  if (action === 'commit_now') return 'Commit now'
  if (action === 'staged_commit') return 'Staged commit'
  if (action === 'review_first') return 'Review first'
  if (action === 'negotiate_first') return 'Negotiate first'
  if (action === 'boundary_first') return 'Boundary first'
  if (action === 'pilot_first') return 'Pilot first'
  if (action === 'route_recheck_first') return 'Recheck the route first'
  if (action === 'lease_review_first') return 'Review the lease first'
  if (action === 'basecamp_reset_first') return 'Reset the basecamp first'
  return 'Prepare first'
}

function actionSummary(
  action: DecisionActionType,
  phase: StrategyPhaseCode,
  lang: 'ko' | 'en'
): string {
  if (lang === 'ko') {
    if (action === 'commit_now') {
      return phase === 'expansion'
        ? '모멘텀이 높아 빠른 실행이 가능하지만 체크리스트는 반드시 유지하세요.'
        : '확정은 가능하나 리스크 재확인 없이 바로 밀어붙이면 손실이 커질 수 있습니다.'
    }
    if (action === 'staged_commit') {
      return '결론은 잡되 실행은 분할해 리스크를 줄이는 전략입니다.'
    }
    if (action === 'review_first') {
      return '지금은 결론보다 검토 기준과 보류 조건을 먼저 정리하는 편이 맞습니다.'
    }
    if (action === 'negotiate_first') {
      return '확정보다 범위·조건·기한을 먼저 조율해야 손실을 줄일 수 있습니다.'
    }
    if (action === 'boundary_first') {
      return '실행보다 먼저 경계와 책임 범위를 정리해야 같은 문제가 반복되지 않습니다.'
    }
    if (action === 'pilot_first') {
      return '작게 시험하고 검증한 뒤 넓히는 편이 지금 국면과 더 잘 맞습니다.'
    }
    if (action === 'route_recheck_first') {
      return '바로 이동하기보다 이동 경로와 생활 동선을 먼저 다시 점검하는 편이 안전합니다.'
    }
    if (action === 'lease_review_first') {
      return '계약을 잠그기 전에 조건, 비용, 일정부터 다시 검토하는 편이 맞습니다.'
    }
    if (action === 'basecamp_reset_first') {
      return '큰 이동보다 생활 거점과 운영 방식부터 재정비하는 쪽이 더 적합합니다.'
    }
    return '당장 확정보다 정보 검증과 구조 정리에 집중하는 전략입니다.'
  }
  if (action === 'commit_now') {
    return phase === 'expansion'
      ? 'Momentum supports fast execution, but keep hard checks in place.'
      : 'Commitment is possible, but rushing without rechecks increases downside.'
  }
  if (action === 'staged_commit') {
    return 'Lock direction first and split execution into verified steps.'
  }
  if (action === 'review_first') {
    return 'Define the review criteria and hold conditions before making a commitment.'
  }
  if (action === 'negotiate_first') {
    return 'Negotiate scope, terms, and timing before locking the move.'
  }
  if (action === 'boundary_first') {
    return 'Set boundaries, ownership, and response limits before proceeding.'
  }
  if (action === 'pilot_first') {
    return 'Start with a pilot and expand only after the first proof loop.'
  }
  if (action === 'route_recheck_first') {
    return 'Recheck the route, commute, and daily path before making the move.'
  }
  if (action === 'lease_review_first') {
    return 'Review lease terms, cost, and timing before you lock anything in.'
  }
  if (action === 'basecamp_reset_first') {
    return 'Reset the base of operations before you make the larger move.'
  }
  return 'Prioritize evidence, readiness, and structure before commitment.'
}

function phaseWeights(phase: StrategyPhaseCode): {
  growth: number
  risk: number
  stability: number
} {
  if (phase === 'expansion') return { growth: 0.56, risk: 0.19, stability: 0.25 }
  if (phase === 'high_tension_expansion') return { growth: 0.46, risk: 0.32, stability: 0.22 }
  if (phase === 'expansion_guarded') return { growth: 0.42, risk: 0.25, stability: 0.33 }
  if (phase === 'stabilize') return { growth: 0.29, risk: 0.2, stability: 0.51 }
  return { growth: 0.22, risk: 0.26, stability: 0.52 }
}

function isRiskPattern(pattern: PatternResult): boolean {
  const text = `${pattern.id} ${pattern.label} ${pattern.risk}`.toLowerCase()
  return /(risk|tension|volatility|reset|burnout|guarded|defensive|conflict)/.test(text)
}

function buildDomainContexts(
  patterns: PatternResult[],
  scenarios: ScenarioResult[],
  strategyEngine: StrategyEngineResult
): DomainContext[] {
  const fallbackSignals = strategyEngine.domainStrategies[0]?.evidenceIds || []
  const baseContexts = strategyEngine.domainStrategies.map((strategy) => {
    const domain = normalizeDomain(strategy.domain)
    const domainPatterns = patterns.filter((pattern) => pattern.domains.includes(domain))
    const leadPatternIds = domainPatterns.slice(0, 4).map((pattern) => pattern.id)
    const domainScenarios = scenarios.filter((scenario) => scenario.domain === domain)
    const leadScenarioIds = domainScenarios.slice(0, 4).map((scenario) => scenario.id)
    const leadScenarioBranches = domainScenarios.slice(0, 6).map((scenario) => scenario.branch)
    const topPatternScores = domainPatterns.slice(0, 4).map((pattern) => pattern.score)
    const topScenarioProbabilities = domainScenarios
      .slice(0, 4)
      .map((scenario) => scenario.probability)
    const topScenarioConfidence = domainScenarios
      .slice(0, 4)
      .map((scenario) => scenario.confidence * 100)
    const topScenarioTimingRelevance = domainScenarios
      .slice(0, 4)
      .map((scenario) => scenario.timingRelevance * 100)
    const irreversibleScenarioCount = domainScenarios.filter(
      (scenario) => !scenario.reversible
    ).length
    const riskPatternCount = domainPatterns.filter((pattern) => isRiskPattern(pattern)).length
    const leadPattern = domainPatterns[0]
    const blockedActions = unique(domainPatterns.flatMap((pattern) => pattern.blockedBy || [])).slice(0, 6)
    const manifestationPressure = clamp(
      round(
        domainScenarios
          .slice(0, 4)
          .reduce((sum, scenario) => sum + (scenario.whyNotYet ? 6 : 0) + scenario.abortConditions.length * 2, 0)
      ),
      0,
      60
    )

    return {
      domain,
      phase: strategy.phase,
      attackPercent: strategy.attackPercent,
      defensePercent: strategy.defensePercent,
      vector: strategy.vector,
      evidenceSignalIds:
        strategy.evidenceIds.length > 0
          ? strategy.evidenceIds.slice(0, 8)
          : fallbackSignals.slice(0, 8),
      patternIds: leadPatternIds,
      scenarioIds: leadScenarioIds,
      scenarioBranches: leadScenarioBranches,
      patternScore: round(mean(topPatternScores)),
      scenarioProbability: round(mean(topScenarioProbabilities)),
      scenarioConfidence: clamp(round(mean(topScenarioConfidence)), 20, 95),
      scenarioTimingRelevance: clamp(round(mean(topScenarioTimingRelevance)), 20, 95),
      irreversibleScenarioCount,
      riskPatternCount,
      evidenceDensity: strategy.evidenceIds.length,
      blockedActions,
      resolvedMode: leadPattern?.resolvedMode || 'verify',
      domainState: leadPattern?.domainState ?? null,
      crossAgreement: leadPattern?.crossAgreement ?? null,
      manifestationPressure,
    } satisfies DomainContext
  })

  return baseContexts
    .filter((context) => context.patternIds.length > 0 || context.scenarioIds.length > 0)
    .slice(0, 6)
}

function templateEligible(context: DomainContext, template: OptionTemplate): boolean {
  const branches = context.scenarioBranches.map((branch) => branch.toLowerCase())
  const hasBranch = (pattern: RegExp) => branches.some((branch) => pattern.test(branch))

  if (template.action === 'review_first') {
    return hasBranch(/review|clarify|recheck|restructure|preparation|compliance|search|expectations/)
  }
  if (template.action === 'negotiate_first') {
    return hasBranch(/negotiation|acceptance|boundary|authority_conflict|lease_decision|pricing|allocation|cohabitation/)
  }
  if (template.action === 'boundary_first') {
    return (
      context.domain === 'relationship' ||
      context.domain === 'health' ||
      hasBranch(/boundary|distance_tuning|separation|load_rebalance|early_warning|burnout|sleep_disruption/)
    )
  }
  if (template.action === 'pilot_first') {
    return hasBranch(/entry|launch|restart|new_connection|travel|housing_search|side_income|income_growth|role_shift/)
  }
  if (template.action === 'route_recheck_first') {
    return hasBranch(/route_recheck|commute_restructure|cross_border_move|relocation/)
  }
  if (template.action === 'lease_review_first') {
    return hasBranch(/lease_decision|housing_search|relocation/)
  }
  if (template.action === 'basecamp_reset_first') {
    return hasBranch(/basecamp_reset|commute_restructure|relocation|cross_border_move/)
  }
  return true
}

function actionContextBonus(context: DomainContext, action: DecisionActionType): number {
  const branches = context.scenarioBranches.map((branch) => branch.toLowerCase())
  const hasBranch = (pattern: RegExp) => branches.some((branch) => pattern.test(branch))

  if (action === 'review_first') {
    let bonus = context.resolvedMode === 'verify' || context.resolvedMode === 'prepare' ? 7 : 1
    if (hasBranch(/review|clarify|recheck|expectations|restructure|compliance/)) bonus += 5
    if (context.crossAgreement !== null && context.crossAgreement < 0.5) bonus += 3
    return bonus
  }
  if (action === 'negotiate_first') {
    let bonus = hasBranch(/negotiation|acceptance|lease_decision|allocation|authority_conflict/) ? 7 : 1
    if (context.blockedActions.includes('commit_now')) bonus += 3
    if (context.resolvedMode === 'verify') bonus += 2
    return bonus
  }
  if (action === 'boundary_first') {
    let bonus = context.domain === 'relationship' || context.domain === 'health' ? 5 : 1
    if (hasBranch(/boundary|distance_tuning|separation|burnout|sleep_disruption|early_warning/)) bonus += 6
    if (context.riskPatternCount >= 1) bonus += 2
    return bonus
  }
  if (action === 'pilot_first') {
    let bonus = hasBranch(/entry|launch|restart|travel|housing_search|side_income|income_growth/) ? 6 : 1
    if (context.resolvedMode === 'verify') bonus += 2
    if (context.domainState === 'opening' || context.domainState === 'active') bonus += 2
    return bonus
  }
  if (action === 'route_recheck_first') {
    let bonus = hasBranch(/route_recheck|commute_restructure|cross_border_move/) ? 8 : 1
    if (context.domain === 'move') bonus += 4
    if (context.resolvedMode !== 'execute') bonus += 2
    return bonus
  }
  if (action === 'lease_review_first') {
    let bonus = hasBranch(/lease_decision|housing_search|relocation/) ? 7 : 1
    if (context.domain === 'move') bonus += 3
    if (context.blockedActions.includes('commit_now')) bonus += 2
    return bonus
  }
  if (action === 'basecamp_reset_first') {
    let bonus = hasBranch(/basecamp_reset|commute_restructure|relocation/) ? 8 : 1
    if (context.domain === 'move') bonus += 4
    if (context.domainState === 'consolidation' || context.domainState === 'opening') bonus += 2
    return bonus
  }
  return 0
}

function actionSpecificityAdjustment(context: DomainContext, action: DecisionActionType): number {
  const branches = context.scenarioBranches.map((branch) => branch.toLowerCase())
  const hasBranch = (pattern: RegExp) => branches.some((branch) => pattern.test(branch))

  const hasBoundaryCluster = hasBranch(/boundary|distance_tuning|separation/)
  const hasReviewCluster = hasBranch(/review|clarify|expectations|preparation|recheck|compliance/)
  const hasNegotiationCluster = hasBranch(/negotiation|acceptance|allocation|lease_decision|authority_conflict|cohabitation/)
  const hasPilotCluster = hasBranch(/entry|launch|restart|travel|housing_search|commute_restructure|side_income|income_growth|route_recheck/)
  const hasRouteCluster = hasBranch(/route_recheck|commute_restructure|cross_border_move/)
  const hasLeaseCluster = hasBranch(/lease_decision|housing_search|relocation/)
  const hasBasecampCluster = hasBranch(/basecamp_reset|commute_restructure|relocation|cross_border_move/)

  let adjustment = 0

  if (action === 'boundary_first') {
    if (hasBoundaryCluster) adjustment += 10
    if (context.domain === 'relationship' && context.resolvedMode !== 'execute') adjustment += 3
    if (hasReviewCluster) adjustment -= 1
  } else if (action === 'review_first') {
    if (hasReviewCluster) adjustment += 9
    if (hasBoundaryCluster) adjustment -= 2
    if (context.crossAgreement !== null && context.crossAgreement < 0.5) adjustment += 2
  } else if (action === 'negotiate_first') {
    if (hasNegotiationCluster) adjustment += 9
    if (hasBoundaryCluster) adjustment -= 3
    if (hasPilotCluster) adjustment -= 2
  } else if (action === 'pilot_first') {
    if (hasPilotCluster) adjustment += 8
    if (hasBoundaryCluster) adjustment -= 3
    if (hasNegotiationCluster) adjustment -= 2
    if (hasRouteCluster || hasBasecampCluster) adjustment -= 2
  } else if (action === 'route_recheck_first') {
    if (hasRouteCluster) adjustment += 10
    if (hasLeaseCluster) adjustment -= 2
    if (hasBoundaryCluster) adjustment -= 3
  } else if (action === 'lease_review_first') {
    if (hasLeaseCluster) adjustment += 10
    if (hasRouteCluster) adjustment -= 1
    if (hasBoundaryCluster) adjustment -= 3
  } else if (action === 'basecamp_reset_first') {
    if (hasBasecampCluster) adjustment += 10
    if (hasRouteCluster) adjustment += 2
    if (hasBoundaryCluster) adjustment -= 2
  } else if (action === 'staged_commit') {
    if (hasBoundaryCluster || hasReviewCluster) adjustment -= 4
    if (hasNegotiationCluster) adjustment -= 2
    if (hasRouteCluster || hasLeaseCluster || hasBasecampCluster) adjustment -= 4
  } else if (action === 'prepare_only') {
    if (hasBoundaryCluster || hasReviewCluster || hasNegotiationCluster || hasPilotCluster || hasRouteCluster || hasLeaseCluster || hasBasecampCluster) adjustment -= 5
    if (context.resolvedMode === 'prepare' && context.domainState === 'closure') adjustment += 2
  } else if (action === 'commit_now') {
    if (hasBoundaryCluster || hasReviewCluster) adjustment -= 6
    if (hasNegotiationCluster || hasPilotCluster) adjustment -= 4
    if (hasRouteCluster || hasLeaseCluster || hasBasecampCluster) adjustment -= 6
  }

  return adjustment
}

function scoreOption(context: DomainContext, template: OptionTemplate): DecisionScoreCard {
  const momentum = context.attackPercent
  const volatility = context.vector.volatility
  const structure = context.vector.structure
  const growthBase =
    context.patternScore * 0.38 +
    context.scenarioProbability * 0.24 +
    context.scenarioTimingRelevance * 0.16 +
    momentum * 0.22
  const riskBase =
    volatility * 0.48 +
    context.riskPatternCount * 5 +
    context.irreversibleScenarioCount * 4 +
    (100 - structure) * 0.22 +
    context.manifestationPressure * 0.35
  const stabilityBase =
    structure * 0.42 +
    (100 - volatility) * 0.2 +
    context.defensePercent * 0.2 +
    context.scenarioConfidence * 0.18

  const modeAdjustment =
    context.resolvedMode === 'execute'
      ? 6
      : context.resolvedMode === 'prepare'
        ? -8
        : -2
  const stateAdjustment =
    context.domainState === 'peak'
      ? 5
      : context.domainState === 'active'
        ? 3
        : context.domainState === 'opening'
          ? 1
          : context.domainState === 'consolidation'
            ? -3
            : context.domainState === 'residue'
              ? -5
              : 0
  const agreementAdjustment =
    context.crossAgreement === null
      ? 0
      : context.crossAgreement >= 0.65
        ? 4
        : context.crossAgreement < 0.35
          ? -6
          : -1

  const growth = clamp(round(growthBase * template.growthBias + modeAdjustment + stateAdjustment + agreementAdjustment), 1, 99)
  const risk = clamp(
    round(
      riskBase * template.riskBias +
        template.irreversiblePenalty +
        (context.blockedActions.includes('commit_now') ? 7 : 0) +
        (context.resolvedMode === 'prepare' ? 6 : 0)
    ),
    1,
    99
  )
  const stability = clamp(
    round(
      stabilityBase * template.stabilityBias +
        (context.resolvedMode === 'prepare' ? 6 : context.resolvedMode === 'verify' ? 3 : 0) +
        (context.domainState === 'consolidation' ? 4 : 0)
    ),
    1,
    99
  )
  const phase = phaseWeights(context.phase)
  const total = clamp(
    round(
      growth * phase.growth +
        stability * phase.stability -
        risk * phase.risk +
        25 +
        actionContextBonus(context, template.action) +
        actionSpecificityAdjustment(context, template.action)
    ),
    1,
    99
  )
  return { growth, risk, stability, total }
}

function gateReason(
  context: DomainContext,
  template: OptionTemplate,
  lang: 'ko' | 'en'
): string | null {
  if (template.action !== 'commit_now') return null

  if (context.blockedActions.includes('commit_now')) {
    return lang === 'ko'
      ? '현재 규칙 엔진에서 즉시 확정이 차단되어 있어 단계형 실행이 우선입니다.'
      : 'Immediate commitment is blocked by the current rule layer.'
  }

  if (context.phase === 'defensive_reset') {
    return lang === 'ko'
      ? '방어/재정렬 국면에서는 즉시 확정보다 준비 우선이 맞습니다.'
      : 'Defensive-reset phase blocks immediate commitment.'
  }
  if (context.phase === 'high_tension_expansion' && context.riskPatternCount >= 1) {
    return lang === 'ko'
      ? '고긴장 확장 구간이라 즉시 확정보다 단계 확정이 안전합니다.'
      : 'High-tension expansion favors staged commitment over immediate lock-in.'
  }
  if (context.phase === 'expansion_guarded' && context.riskPatternCount >= 2) {
    return lang === 'ko'
      ? '리스크 패턴이 겹쳐 있어 즉시 확정은 상한 제한됩니다.'
      : 'Guarded expansion with layered risk gates blocks immediate commitment.'
  }
  if (context.irreversibleScenarioCount >= 2 && context.scenarioTimingRelevance < 58) {
    return lang === 'ko'
      ? '비가역 시나리오 비중이 높지만 타이밍 적합도가 아직 낮아 즉시 확정은 보류해야 합니다.'
      : 'Irreversible scenarios are active, but timing relevance is still too low for immediate commitment.'
  }
  if (context.vector.volatility >= 18) {
    return lang === 'ko'
      ? '변동성이 높아 즉시 확정은 손실 비용이 큽니다.'
      : 'Volatility is too high for immediate commitment.'
  }
  if (context.attackPercent < 52 || context.vector.structure < 24 || context.evidenceDensity < 2) {
    return lang === 'ko'
      ? '공격 비중, 구조 점수, 근거 밀도 중 하나가 부족해 즉시 확정보다 분할 실행이 맞습니다.'
      : 'Attack, structure, or evidence density is insufficient for immediate commitment.'
  }
  if (context.resolvedMode === 'prepare' || context.domainState === 'residue') {
    return lang === 'ko'
      ? '현재 상태는 준비/잔존 국면이라 확정보다 정리와 검증이 우선입니다.'
      : 'The current state is still in prepare/residue mode, so verification comes before commitment.'
  }
  if (context.crossAgreement !== null && context.crossAgreement < 0.35) {
    return lang === 'ko'
      ? '교차 합의가 낮아 즉시 확정보다 재검증이 더 적절합니다.'
      : 'Cross-agreement is too low for immediate commitment.'
  }
  return null
}

function toOption(
  context: DomainContext,
  template: OptionTemplate,
  lang: 'ko' | 'en'
): DecisionOption {
  const gate = gateReason(context, template, lang)
  const scores = scoreOption(context, template)
  const gatedScores: DecisionScoreCard = {
    growth: scores.growth,
    risk: clamp(scores.risk + (gate ? 8 : 0), 1, 99),
    stability: scores.stability,
    total: clamp(scores.total - (gate ? 22 : 0), 1, 99),
  }
  return {
    id: `${context.domain}__${template.action}`,
    domain: context.domain,
    action: template.action,
    label: `${domainLabel(context.domain, lang)}: ${actionLabel(template.action, lang)}`,
    summary: gate || actionSummary(template.action, context.phase, lang),
    reversible: template.reversible,
    gated: Boolean(gate),
    gateReason: gate,
    rank: 0,
    confidence: clamp(round(context.scenarioConfidence * 0.6 + gatedScores.total * 0.4), 1, 99),
    scores: gatedScores,
    supportingPatternIds: context.patternIds.slice(0, 3),
    supportingScenarioIds: context.scenarioIds.slice(0, 3),
    supportingSignalIds: context.evidenceSignalIds.slice(0, 6),
  }
}

export function buildDecisionEngine(input: {
  lang: 'ko' | 'en'
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  strategyEngine: StrategyEngineResult
}): DecisionEngineResult {
  const contexts = buildDomainContexts(input.patterns, input.scenarios, input.strategyEngine)
  const options = contexts.flatMap((context) =>
    OPTION_TEMPLATES
      .filter((template) => templateEligible(context, template))
      .map((template) => toOption(context, template, input.lang))
  )

  const ranked = options
    .sort((a, b) => b.scores.total - a.scores.total || b.confidence - a.confidence)
    .map((option, index) => ({ ...option, rank: index + 1 }))
  const ungatedRanked = ranked.filter((option) => !option.gated)
  const preferredDomain = normalizeDomain(input.strategyEngine.domainStrategies[0]?.domain || 'personality')
  const preferredDomainOptions = ranked.filter((option) => option.domain === preferredDomain)
  const preferredDomainUngated = preferredDomainOptions.filter((option) => !option.gated)
  const preferredTopOption =
    preferredDomainUngated[0] || preferredDomainOptions[0] || null
  const globalTopOption = ungatedRanked[0] || ranked[0] || null
  const topOption = preferredTopOption || globalTopOption

  const domains: DecisionDomainResult[] = contexts.map((context) => {
    const domainOptions = ranked.filter((option) => option.domain === context.domain)
    const domainUngated = domainOptions.filter((option) => !option.gated)
    const bestOption = domainUngated[0] || domainOptions[0]
    return {
      domain: context.domain,
      bestOptionId: bestOption?.id || null,
      bestScore: bestOption?.scores.total || 0,
      optionIds: domainOptions.map((option) => option.id),
    }
  })

  return {
    mode: 'option-comparison-v1',
    topOptionId: topOption?.id || null,
    topOptionScore: topOption?.scores.total || 0,
    options: ranked.slice(0, 18),
    domains,
  }
}
