import { createHash } from 'node:crypto'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '@/lib/destiny-matrix/types'
import {
  synthesizeMatrixSignals,
  type SignalSynthesisResult,
} from '@/lib/destiny-matrix/core/signalSynthesizer'
import { compileFeatureTokens } from '@/lib/destiny-matrix/core/tokenCompiler'
import { buildActivationEngine } from '@/lib/destiny-matrix/core/activationEngine'
import { buildRuleEngine } from '@/lib/destiny-matrix/core/ruleEngine'
import { buildStateEngine } from '@/lib/destiny-matrix/core/stateEngine'
import {
  buildPhaseStrategyEngine,
  type StrategyEngineResult,
} from '@/lib/destiny-matrix/core/strategyEngine'
import { buildPatternEngine, type PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import { buildScenarioEngine, type ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'
import {
  buildDecisionEngine,
  type DecisionEngineResult,
} from '@/lib/destiny-matrix/core/decisionEngine'
import { buildCoreCanonicalOutput } from '@/lib/destiny-matrix/core/canonical'
import type { DestinyCoreCanonicalOutput } from '@/lib/destiny-matrix/core/types'

export type AvailabilityState = 'present' | 'empty-computed' | 'missing-upstream'

export interface MatrixInputAvailability {
  shinsal: AvailabilityState
  activeTransits: AvailabilityState
  advancedAstroSignals: AvailabilityState
}

export interface MatrixCalculationInputNormalized extends MatrixCalculationInput {
  shinsalList: NonNullable<MatrixCalculationInput['shinsalList']>
  activeTransits: NonNullable<MatrixCalculationInput['activeTransits']>
  advancedAstroSignals: NonNullable<MatrixCalculationInput['advancedAstroSignals']>
  availability: MatrixInputAvailability
}

export interface RunDestinyCoreParams {
  mode: 'comprehensive' | 'timing' | 'themed' | 'calendar'
  lang: 'ko' | 'en'
  matrixInput: MatrixCalculationInput
  matrixReport: FusionReport
  matrixSummary?: MatrixSummary
}

export interface DestinyCoreResult {
  normalizedInput: MatrixCalculationInputNormalized
  availability: MatrixInputAvailability
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  strategyEngine: StrategyEngineResult
  canonical: DestinyCoreCanonicalOutput
  quality: DestinyCoreQuality
  coreHash: string
}

export interface DestinyCoreQuality {
  score: number
  grade: 'A' | 'B' | 'C' | 'D'
  warnings: string[]
  metrics: {
    normalizedSignalCount: number
    selectedSignalCount: number
    selectedDomainCount: number
    patternCount: number
    compositePatternCount: number
    scenarioCount: number
    scenarioDomainCount: number
    advancedSignalCount: number
    snapshotSignalCount: number
    shinsalSignalCount: number
    relationSignalCount: number
    timingSignalCount: number
    strategySumValid: boolean
    decisionOptionCount: number
    decisionDomainCount: number
    gatedDecisionCount: number
    domainConflictCount: number
    verificationBias: boolean
  }
}

function normalizeArrayAvailability<T>(value: T[] | undefined): {
  items: T[]
  state: AvailabilityState
} {
  if (value === undefined) return { items: [], state: 'missing-upstream' }
  if (!Array.isArray(value) || value.length === 0) return { items: [], state: 'empty-computed' }
  return { items: value, state: 'present' }
}

function normalizeAdvancedAstroSignals(value: MatrixCalculationInput['advancedAstroSignals']): {
  value: NonNullable<MatrixCalculationInput['advancedAstroSignals']>
  state: AvailabilityState
} {
  if (!value) return { value: {}, state: 'missing-upstream' }
  const enabledCount = Object.values(value).filter((flag) => {
    if (flag === true) return true
    if (typeof flag === 'number') return Number.isFinite(flag) && flag !== 0
    if (typeof flag === 'string') {
      const normalized = flag.trim().toLowerCase()
      return (
        Boolean(normalized) && !['false', '0', 'none', 'null', 'undefined'].includes(normalized)
      )
    }
    if (Array.isArray(flag)) return flag.length > 0
    if (flag && typeof flag === 'object') return Object.keys(flag).length > 0
    return false
  }).length
  if (enabledCount === 0) return { value, state: 'empty-computed' }
  return { value, state: 'present' }
}

export function buildNormalizedMatrixInput(
  raw: MatrixCalculationInput
): MatrixCalculationInputNormalized {
  const shinsal = normalizeArrayAvailability(raw.shinsalList)
  const transits = normalizeArrayAvailability(raw.activeTransits)
  const advanced = normalizeAdvancedAstroSignals(raw.advancedAstroSignals)
  const availability: MatrixInputAvailability = {
    shinsal: shinsal.state,
    activeTransits: transits.state,
    advancedAstroSignals: advanced.state,
  }

  return {
    ...raw,
    shinsalList: shinsal.items,
    activeTransits: transits.items,
    advancedAstroSignals: advanced.value,
    availability,
  }
}

function buildSafeStrategyFallback(lang: 'ko' | 'en'): StrategyEngineResult {
  return {
    overallPhase: 'stabilize',
    overallPhaseLabel: lang === 'ko' ? 'Stabilize' : 'Stabilize',
    attackPercent: 50,
    defensePercent: 50,
    thesis: 'Signal density is low; operate in verification-first mode.',
    vector: { expansion: 0.5, volatility: 0.5, structure: 0.5 },
    vectorMode: 'v1-multi-domain',
    domainStrategies: [],
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function scoreByThreshold(value: number, target: number, maxPoints: number): number {
  if (target <= 0) return maxPoints
  return clamp(Math.round((value / target) * maxPoints), 0, maxPoints)
}

function buildDestinyCoreQuality(input: {
  normalizedInput: MatrixCalculationInputNormalized
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  strategyEngine: StrategyEngineResult
  canonical: DestinyCoreCanonicalOutput
}): DestinyCoreQuality {
  const selectedDomains = new Set(
    (input.signalSynthesis.selectedSignals || []).flatMap((signal) => signal.domainHints || [])
  )
  const scenarioDomains = new Set((input.scenarios || []).map((scenario) => scenario.domain))
  const tags = (input.signalSynthesis.normalizedSignals || []).flatMap(
    (signal) => signal.tags || []
  )
  const countByTag = (tag: string) => tags.filter((item) => item === tag).length
  const timingSignalCount = (input.signalSynthesis.normalizedSignals || []).filter((signal) =>
    signal.domainHints.includes('timing')
  ).length
  const strategySumValid =
    input.strategyEngine.attackPercent + input.strategyEngine.defensePercent === 100
  const gatedDecisionCount = input.decisionEngine.options.filter((option) => option.gated).length

  let score = 0
  score += scoreByThreshold(input.signalSynthesis.selectedSignals.length, 7, 14)
  score += scoreByThreshold(selectedDomains.size, 4, 10)
  score += scoreByThreshold(input.signalSynthesis.normalizedSignals.length, 24, 15)
  score += scoreByThreshold(input.patterns.length, 10, 13)
  score += scoreByThreshold(
    input.patterns.filter((pattern) => pattern.id.startsWith('composite_')).length,
    2,
    10
  )
  score += scoreByThreshold(input.scenarios.length, 18, 14)
  score += scoreByThreshold(scenarioDomains.size, 4, 8)
  score += scoreByThreshold(countByTag('advanced-astro'), 6, 6)
  score += scoreByThreshold(countByTag('snapshot'), 4, 4)
  score += scoreByThreshold(countByTag('shinsal'), 2, 3)
  score += scoreByThreshold(countByTag('relation'), 2, 3)
  score += scoreByThreshold(timingSignalCount, 6, 3)
  score += strategySumValid ? 7 : 0
  score += scoreByThreshold(input.decisionEngine.options.length, 9, 4)
  score += scoreByThreshold(input.decisionEngine.domains.length, 3, 3)
  score += gatedDecisionCount <= Math.ceil(Math.max(1, input.decisionEngine.options.length) * 0.5) ? 2 : 0

  const warnings: string[] = []
  if (input.signalSynthesis.selectedSignals.length < 7) warnings.push('selected_signals_under_7')
  if (selectedDomains.size < 3) warnings.push('low_selected_domain_diversity')
  if (input.patterns.length < 8) warnings.push('pattern_count_low')
  if (input.scenarios.length < 12) warnings.push('scenario_count_low')
  if (scenarioDomains.size < 3) warnings.push('scenario_domain_coverage_low')
  if (!strategySumValid) warnings.push('strategy_percent_sum_invalid')
  if (input.decisionEngine.options.length < 6) warnings.push('decision_option_count_low')
  if (input.decisionEngine.domains.length < 2) warnings.push('decision_domain_coverage_low')
  if (input.canonical.coherenceAudit.domainConflictCount > 2) {
    warnings.push('domain_conflict_count_high')
  }
  if (input.canonical.coherenceAudit.gatedDecision && gatedDecisionCount >= 3) {
    warnings.push('gated_decision_pressure_high')
  }
  const specificVerificationAction = new Set([
    'review_first',
    'negotiate_first',
    'boundary_first',
    'pilot_first',
    'route_recheck_first',
    'lease_review_first',
    'basecamp_reset_first',
  ])
  if (
    input.canonical.coherenceAudit.verificationBias &&
    !specificVerificationAction.has(input.canonical.topDecision?.action || '')
  ) {
    warnings.push('verification_bias_active')
  }
  if (
    input.normalizedInput.availability.advancedAstroSignals === 'present' &&
    countByTag('advanced-astro') < 2
  ) {
    warnings.push('advanced_astro_signal_coverage_low')
  }
  if (input.normalizedInput.availability.shinsal === 'present' && countByTag('shinsal') < 1) {
    warnings.push('shinsal_signal_coverage_low')
  }
  if (input.normalizedInput.availability.activeTransits === 'present' && timingSignalCount < 2) {
    warnings.push('timing_signal_coverage_low')
  }

  const normalizedScore = clamp(score, 0, 100)
  const grade: DestinyCoreQuality['grade'] =
    normalizedScore >= 90 ? 'A' : normalizedScore >= 80 ? 'B' : normalizedScore >= 70 ? 'C' : 'D'

  return {
    score: normalizedScore,
    grade,
    warnings,
    metrics: {
      normalizedSignalCount: input.signalSynthesis.normalizedSignals.length,
      selectedSignalCount: input.signalSynthesis.selectedSignals.length,
      selectedDomainCount: selectedDomains.size,
      patternCount: input.patterns.length,
      compositePatternCount: input.patterns.filter((pattern) => pattern.id.startsWith('composite_'))
        .length,
      scenarioCount: input.scenarios.length,
      scenarioDomainCount: scenarioDomains.size,
      advancedSignalCount: countByTag('advanced-astro'),
      snapshotSignalCount: countByTag('snapshot'),
      shinsalSignalCount: countByTag('shinsal'),
      relationSignalCount: countByTag('relation'),
      timingSignalCount,
      strategySumValid,
      decisionOptionCount: input.decisionEngine.options.length,
      decisionDomainCount: input.decisionEngine.domains.length,
      gatedDecisionCount,
      domainConflictCount: input.canonical.coherenceAudit.domainConflictCount,
      verificationBias: input.canonical.coherenceAudit.verificationBias,
    },
  }
}

export function computeDestinyCoreHash(input: {
  canonical: DestinyCoreCanonicalOutput
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
}): string {
  const patternKeys = input.patterns
    .map((pattern) => `${pattern.id}:${pattern.family}:${pattern.profile}:${pattern.score}`)
    .sort()
  const scenarioKeys = input.scenarios
    .slice(0, 12)
    .map(
      (scenario) =>
        `${scenario.id}:${scenario.probability}:${scenario.window}:${scenario.timingRelevance}:${scenario.reversible ? 1 : 0}`
    )
    .sort()
  const decisionKeys = input.decisionEngine.options
    .slice(0, 8)
    .map((option) => `${option.id}:${option.scores.total}:${option.confidence}`)
    .sort()

  const payload = JSON.stringify({
    claimIds: [...input.canonical.claimIds].sort(),
    evidenceRefKeys: Object.keys(input.canonical.evidenceRefs).sort(),
    cautions: [...input.canonical.cautions].sort(),
    gradeLabel: input.canonical.gradeLabel,
    focusDomain: input.canonical.focusDomain,
    phase: input.canonical.phase,
    primaryAction: input.canonical.primaryAction,
    primaryCaution: input.canonical.primaryCaution,
    coherenceAudit: input.canonical.coherenceAudit,
    judgmentPolicy: input.canonical.judgmentPolicy,
    domainVerdicts: input.canonical.domainVerdicts.map((verdict) => ({
      domain: verdict.domain,
      mode: verdict.mode,
      confidence: verdict.confidence,
      leadPatternFamily: verdict.leadPatternFamily,
      leadScenarioId: verdict.leadScenarioId,
      allowedActions: verdict.allowedActions,
      blockedActions: verdict.blockedActions,
    })),
    advisories: input.canonical.advisories.map((advisory) => ({
      domain: advisory.domain,
      phase: advisory.phase,
      leadSignalIds: advisory.leadSignalIds,
      leadPatternIds: advisory.leadPatternIds,
      leadScenarioIds: advisory.leadScenarioIds,
    })),
    domainTimingWindows: input.canonical.domainTimingWindows.map((window) => ({
      domain: window.domain,
      window: window.window,
      confidence: window.confidence,
      timingRelevance: window.timingRelevance,
    })),
    manifestations: input.canonical.manifestations.map((item) => ({
      domain: item.domain,
      timingWindow: item.timingWindow,
      sourceCount: item.activationSources.length,
      likelyExpressions: item.likelyExpressions.slice(0, 3),
      riskExpressions: item.riskExpressions.slice(0, 3),
    })),
    attackPercent: input.canonical.attackPercent,
    defensePercent: input.canonical.defensePercent,
    confidence: input.canonical.confidence,
    leadPatternId: input.canonical.leadPatternId,
    leadScenarioId: input.canonical.leadScenarioId,
    topPatternFamilies: input.canonical.topPatterns.map(
      (pattern) => `${pattern.id}:${pattern.family}:${pattern.profile}`
    ),
    topPatternIds: input.canonical.topPatterns.map((pattern) => pattern.id),
    topScenarioIds: input.canonical.topScenarios.map((scenario) => scenario.id),
    topScenarioTiming: input.canonical.topScenarios.map(
      (scenario) => `${scenario.id}:${scenario.window}:${scenario.timingRelevance}`
    ),
    topDecisionId: input.canonical.topDecision?.id || null,
    patternKeys,
    scenarioKeys,
    decisionKeys,
  })
  return createHash('sha256').update(payload).digest('hex').slice(0, 20)
}

export function runDestinyCore(params: RunDestinyCoreParams): DestinyCoreResult {
  const normalizedInput = buildNormalizedMatrixInput(params.matrixInput)
  const featureTokens = compileFeatureTokens(normalizedInput)
  const preActivation = buildActivationEngine({
    matrixInput: normalizedInput,
    tokens: featureTokens.tokens,
  })
  const preRules = buildRuleEngine({
    activation: preActivation,
    tokens: featureTokens.tokens,
  })
  const preStates = buildStateEngine({
    lang: params.lang,
    activation: preActivation,
    rules: preRules,
  })
  const signalSynthesis = synthesizeMatrixSignals({
    lang: params.lang,
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
    matrixInput: normalizedInput,
    resolvedContext: {
      activation: preActivation,
      rules: preRules,
      states: preStates,
    },
  })
  const strategyEngine =
    buildPhaseStrategyEngine(signalSynthesis, params.lang, {
      daeunActive: Boolean(normalizedInput.currentDaeunElement),
      seunActive: Boolean(normalizedInput.currentSaeunElement),
      wolunActive: Boolean(normalizedInput.currentWolunElement),
      iljinActive: Boolean(normalizedInput.currentIljinElement || normalizedInput.currentIljinDate),
      activeTransitCount: normalizedInput.activeTransits.length,
    }) || buildSafeStrategyFallback(params.lang)
  const patterns = buildPatternEngine(signalSynthesis, strategyEngine, {
    activation: preActivation,
    rules: preRules,
    states: preStates,
    crossAgreement:
      typeof normalizedInput.crossSnapshot?.crossAgreement === 'number'
        ? normalizedInput.crossSnapshot.crossAgreement
        : null,
  })
  const scenarios = buildScenarioEngine(patterns, strategyEngine, normalizedInput, params.lang, {
    activation: preActivation,
    rules: preRules,
    states: preStates,
  })
  const decisionEngine = buildDecisionEngine({
    lang: params.lang,
    patterns,
    scenarios,
    strategyEngine,
  })
  const canonical = buildCoreCanonicalOutput({
    lang: params.lang,
    matrixInput: normalizedInput,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    matrixSummary: params.matrixSummary,
    strategy: {
      phase: strategyEngine.overallPhase,
      phaseLabel: strategyEngine.overallPhaseLabel,
      attackPercent: strategyEngine.attackPercent,
      defensePercent: strategyEngine.defensePercent,
      thesis: strategyEngine.thesis,
      riskControl:
        strategyEngine.domainStrategies[0]?.riskControl ||
        strategyEngine.domainStrategies.find((item) => item.riskControl)?.riskControl ||
        '',
      focusDomain: strategyEngine.domainStrategies[0]?.domain,
      domainStrategies: strategyEngine.domainStrategies.map((item) => ({
        domain: item.domain,
        phase: item.phase,
        evidenceIds: item.evidenceIds,
        metrics: {
          strengthScore: item.metrics.strengthScore,
          cautionScore: item.metrics.cautionScore,
          balanceScore: item.metrics.balanceScore,
        },
      })),
    },
    crossAgreement: normalizedInput.crossSnapshot?.crossAgreement,
  })
  const quality = buildDestinyCoreQuality({
    normalizedInput,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    strategyEngine,
    canonical,
  })

  return {
    normalizedInput,
    availability: normalizedInput.availability,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    strategyEngine,
    canonical,
    quality,
    coreHash: computeDestinyCoreHash({
      canonical,
      patterns,
      scenarios,
      decisionEngine,
    }),
  }
}

