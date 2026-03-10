import type { MatrixSummary } from '@/lib/destiny-matrix/types'
import type {
  SignalDomain,
  SignalPolarity,
  SignalSynthesisResult,
} from '@/lib/destiny-matrix/core/signalSynthesizer'
import type { StrategyPhaseCode } from '@/lib/destiny-matrix/core/strategyEngine'
import type { ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'

export interface CoreLayerScore {
  layer: number
  signalCount: number
  avgScore: number
  strengthCount: number
  cautionCount: number
  balanceCount: number
}

export interface CoreInteractionHit {
  id: string
  layer: number
  rowKey: string
  colKey: string
  domainHints: SignalDomain[]
  polarity: SignalPolarity
  score: number
  keyword: string
  sajuBasis?: string
  astroBasis?: string
}

export interface CoreTimelineHit {
  id: string
  source: 'scenario' | 'matrix-overlap'
  domain: SignalDomain | 'timing'
  window: string
  confidence: number
  evidenceIds: string[]
}

export interface DestinyCoreCanonicalOutput {
  version: 'v1'
  claimIds: string[]
  evidenceRefs: Record<string, string[]>
  confidence: number
  crossAgreement: number | null
  phase: StrategyPhaseCode
  attackPercent: number
  defensePercent: number
  cautions: string[]
  layerScores: CoreLayerScore[]
  interactionHits: CoreInteractionHit[]
  timelineHits: CoreTimelineHit[]
}

export interface BuildCoreCanonicalOutputInput {
  signalSynthesis: SignalSynthesisResult
  scenarios: ScenarioResult[]
  matrixSummary?: MatrixSummary
  strategy: {
    phase: StrategyPhaseCode
    attackPercent: number
    defensePercent: number
  }
  crossAgreement?: unknown
}
