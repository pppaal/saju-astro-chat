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
  strategyEngine: StrategyEngineResult
  unified?: UnifiedEnvelope
  coreHash: string
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

export function computeDestinyCoreHash(input: {
  signalSynthesis: SignalSynthesisResult
  patterns: PatternResult[]
  scenarios: ScenarioResult[]
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

  const payload = JSON.stringify({
    claims,
    scenarios,
    anchors,
    patternKeys,
    scenarioKeys,
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
    strategyEngine,
    unified,
    coreHash: computeDestinyCoreHash({
      signalSynthesis,
      patterns,
      scenarios,
      strategyEngine,
      unified,
    }),
  }
}
