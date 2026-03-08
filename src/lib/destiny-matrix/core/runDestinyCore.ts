import { createHash } from 'node:crypto'
import type { FusionReport } from '@/lib/destiny-matrix/interpreter/types'
import type { MatrixCalculationInput, MatrixSummary } from '@/lib/destiny-matrix/types'
import type { TimingData } from '@/lib/destiny-matrix/ai-report/types'
import type { GraphRAGEvidenceBundle } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'
import type { SectionEvidenceRefs } from '@/lib/destiny-matrix/ai-report/evidenceRefs'
import { buildUnifiedEnvelope } from '@/lib/destiny-matrix/ai-report/unifiedReport'
import {
  synthesizeMatrixSignals,
  type SignalSynthesisResult,
} from '@/lib/destiny-matrix/ai-report/signalSynthesizer'
import {
  buildPhaseStrategyEngine,
  type StrategyEngineResult,
} from '@/lib/destiny-matrix/ai-report/strategyEngine'
import type {
  UnifiedAnchor,
  UnifiedClaim,
  UnifiedScenarioBundle,
} from '@/lib/destiny-matrix/ai-report/types'
import { buildPatternEngine, type PatternResult } from '@/lib/destiny-matrix/core/patternEngine'
import { buildScenarioEngine, type ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'
import {
  buildDecisionEngine,
  type DecisionEngineResult,
} from '@/lib/destiny-matrix/core/decisionEngine'

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
  sectionPaths?: string[]
  evidenceRefs?: SectionEvidenceRefs
  graphRagEvidence?: GraphRAGEvidenceBundle
  birthDate?: string
  timingData?: TimingData
}

export type UnifiedEnvelope = ReturnType<typeof buildUnifiedEnvelope>

export interface DestinyCoreResult {
  normalizedInput: MatrixCalculationInputNormalized
  availability: MatrixInputAvailability
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  strategyEngine: StrategyEngineResult
  quality: DestinyCoreQuality
  unified?: UnifiedEnvelope
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

  const warnings: string[] = []
  if (input.signalSynthesis.selectedSignals.length < 7) warnings.push('selected_signals_under_7')
  if (selectedDomains.size < 3) warnings.push('low_selected_domain_diversity')
  if (input.patterns.length < 8) warnings.push('pattern_count_low')
  if (input.scenarios.length < 12) warnings.push('scenario_count_low')
  if (scenarioDomains.size < 3) warnings.push('scenario_domain_coverage_low')
  if (!strategySumValid) warnings.push('strategy_percent_sum_invalid')
  if (input.decisionEngine.options.length < 6) warnings.push('decision_option_count_low')
  if (input.decisionEngine.domains.length < 2) warnings.push('decision_domain_coverage_low')
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
    },
  }
}

export function computeDestinyCoreHash(input: {
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
  decisionEngine: DecisionEngineResult
  strategyEngine: StrategyEngineResult
  unified?: UnifiedEnvelope
}): string {
  const claims =
    input.unified?.claims.map((claim: UnifiedClaim) => claim.id).sort() ||
    input.signalSynthesis.claims.map((claim) => claim.claimId).sort()
  const scenarios = (input.unified?.scenarioBundles || [])
    .map((bundle: UnifiedScenarioBundle) => bundle.id)
    .sort()
  const anchors = (input.unified?.anchors || []).map((anchor: UnifiedAnchor) => anchor.id).sort()
  const domainStrategyKeys = input.strategyEngine.domainStrategies
    .map((strategy) => `${strategy.domain}:${strategy.phase}:${strategy.attackPercent}`)
    .sort()
  const patternKeys = input.patterns.map((pattern) => `${pattern.id}:${pattern.score}`).sort()
  const scenarioKeys = input.scenarios
    .slice(0, 12)
    .map((scenario) => `${scenario.id}:${scenario.probability}:${scenario.window}`)
    .sort()
  const decisionKeys = input.decisionEngine.options
    .slice(0, 8)
    .map((option) => `${option.id}:${option.scores.total}:${option.confidence}`)
    .sort()

  const payload = JSON.stringify({
    claims,
    scenarios,
    anchors,
    patternKeys,
    scenarioKeys,
    decisionKeys,
    overallPhase: input.strategyEngine.overallPhase,
    attackPercent: input.strategyEngine.attackPercent,
    defensePercent: input.strategyEngine.defensePercent,
    domainStrategyKeys,
  })
  return createHash('sha256').update(payload).digest('hex').slice(0, 20)
}

export function runDestinyCore(params: RunDestinyCoreParams): DestinyCoreResult {
  const normalizedInput = buildNormalizedMatrixInput(params.matrixInput)
  const signalSynthesis = synthesizeMatrixSignals({
    lang: params.lang,
    matrixReport: params.matrixReport,
    matrixSummary: params.matrixSummary,
    matrixInput: normalizedInput,
  })
  const strategyEngine =
    buildPhaseStrategyEngine(signalSynthesis, params.lang, {
      daeunActive: Boolean(normalizedInput.currentDaeunElement),
      seunActive: Boolean(normalizedInput.currentSaeunElement),
      activeTransitCount: normalizedInput.activeTransits.length,
    }) || buildSafeStrategyFallback(params.lang)
  const patterns = buildPatternEngine(signalSynthesis, strategyEngine)
  const scenarios = buildScenarioEngine(patterns, strategyEngine, normalizedInput)
  const decisionEngine = buildDecisionEngine({
    lang: params.lang,
    patterns,
    scenarios,
    strategyEngine,
  })
  const quality = buildDestinyCoreQuality({
    normalizedInput,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    strategyEngine,
  })

  let unified: UnifiedEnvelope | undefined
  if (params.sectionPaths && params.evidenceRefs && params.graphRagEvidence) {
    unified = buildUnifiedEnvelope({
      mode: params.mode === 'calendar' ? 'timing' : params.mode,
      lang: params.lang,
      generatedAt: new Date().toISOString(),
      matrixInput: normalizedInput,
      matrixReport: params.matrixReport,
      matrixSummary: params.matrixSummary,
      signalSynthesis,
      graphRagEvidence: params.graphRagEvidence,
      birthDate: params.birthDate,
      timingData: params.timingData,
      sectionPaths: params.sectionPaths,
      evidenceRefs: params.evidenceRefs,
    })
  }

  return {
    normalizedInput,
    availability: normalizedInput.availability,
    signalSynthesis,
    patterns,
    scenarios,
    decisionEngine,
    strategyEngine,
    quality,
    unified,
    coreHash: computeDestinyCoreHash({
      signalSynthesis,
      patterns,
      scenarios,
      decisionEngine,
      strategyEngine,
      unified,
    }),
  }
}
