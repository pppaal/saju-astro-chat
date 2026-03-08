import type { SignalDomain } from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import type {
  StrategyEngineResult,
  StrategyPhaseCode,
} from '@/lib/destiny-matrix/ai-report/strategyEngine'
import type { PatternResult } from './patternEngine'
import type { ScenarioResult } from './scenarioEngine'

export type DecisionActionType = 'commit_now' | 'staged_commit' | 'prepare_only'

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
  patternScore: number
  scenarioProbability: number
  scenarioConfidence: number
  riskPatternCount: number
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
    return '준비 우선'
  }
  if (action === 'commit_now') return 'Commit now'
  if (action === 'staged_commit') return 'Staged commit'
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
    const topPatternScores = domainPatterns.slice(0, 4).map((pattern) => pattern.score)
    const topScenarioProbabilities = domainScenarios
      .slice(0, 4)
      .map((scenario) => scenario.probability)
    const topScenarioConfidence = domainScenarios
      .slice(0, 4)
      .map((scenario) => scenario.confidence * 100)
    const riskPatternCount = domainPatterns.filter((pattern) => isRiskPattern(pattern)).length

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
      patternScore: round(mean(topPatternScores)),
      scenarioProbability: round(mean(topScenarioProbabilities)),
      scenarioConfidence: clamp(round(mean(topScenarioConfidence)), 20, 95),
      riskPatternCount,
    } satisfies DomainContext
  })

  return baseContexts
    .filter((context) => context.patternIds.length > 0 || context.scenarioIds.length > 0)
    .slice(0, 6)
}

function scoreOption(context: DomainContext, template: OptionTemplate): DecisionScoreCard {
  const momentum = context.attackPercent
  const volatility = context.vector.volatility
  const structure = context.vector.structure
  const growthBase =
    context.patternScore * 0.44 + context.scenarioProbability * 0.34 + momentum * 0.22
  const riskBase = volatility * 0.52 + context.riskPatternCount * 5 + (100 - structure) * 0.24
  const stabilityBase = structure * 0.48 + (100 - volatility) * 0.28 + context.defensePercent * 0.24

  const growth = clamp(round(growthBase * template.growthBias), 1, 99)
  const risk = clamp(round(riskBase * template.riskBias + template.irreversiblePenalty), 1, 99)
  const stability = clamp(round(stabilityBase * template.stabilityBias), 1, 99)
  const phase = phaseWeights(context.phase)
  const total = clamp(
    round(growth * phase.growth + stability * phase.stability - risk * phase.risk + 25),
    1,
    99
  )
  return { growth, risk, stability, total }
}

function toOption(
  context: DomainContext,
  template: OptionTemplate,
  lang: 'ko' | 'en'
): DecisionOption {
  const scores = scoreOption(context, template)
  return {
    id: `${context.domain}__${template.action}`,
    domain: context.domain,
    action: template.action,
    label: `${domainLabel(context.domain, lang)}: ${actionLabel(template.action, lang)}`,
    summary: actionSummary(template.action, context.phase, lang),
    reversible: template.reversible,
    rank: 0,
    confidence: clamp(round(context.scenarioConfidence * 0.6 + scores.total * 0.4), 1, 99),
    scores,
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
    OPTION_TEMPLATES.map((template) => toOption(context, template, input.lang))
  )

  const ranked = options
    .sort((a, b) => b.scores.total - a.scores.total || b.confidence - a.confidence)
    .map((option, index) => ({ ...option, rank: index + 1 }))

  const domains: DecisionDomainResult[] = contexts.map((context) => {
    const domainOptions = ranked.filter((option) => option.domain === context.domain)
    return {
      domain: context.domain,
      bestOptionId: domainOptions[0]?.id || null,
      bestScore: domainOptions[0]?.scores.total || 0,
      optionIds: domainOptions.map((option) => option.id),
    }
  })

  return {
    mode: 'option-comparison-v1',
    topOptionId: ranked[0]?.id || null,
    topOptionScore: ranked[0]?.scores.total || 0,
    options: ranked.slice(0, 18),
    domains,
  }
}
