import type {
  CrossAgreementMatrixRow,
  MatrixCalculationInput,
  MatrixSummary,
  RelationContext,
  SubjectContext,
  TemporalSlice,
} from '@/lib/destiny-matrix/types'
import type {
  SignalDomain,
  SignalPolarity,
  SignalSynthesisResult,
} from '@/lib/destiny-matrix/core/signalSynthesizer'
import type { StrategyPhaseCode } from '@/lib/destiny-matrix/core/strategyEngine'
import type { ScenarioResult } from '@/lib/destiny-matrix/core/scenarioEngine'
import type { DecisionActionType } from '@/lib/destiny-matrix/core/decisionEngine'

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

export interface CorePatternLead {
  id: string
  label: string
  family: string
  profile: 'upside' | 'risk' | 'support' | 'timing' | 'identity'
  domains: SignalDomain[]
  score: number
  confidence: number
  matchedSignalIds: string[]
}

export interface CoreScenarioLead {
  id: string
  patternId: string
  domain: SignalDomain
  branch: string
  probability: number
  confidence: number
  window: ScenarioResult['window']
  timingRelevance: number
  timingGranularity: ScenarioResult['timingGranularity']
  precisionReason: string
  reversible: boolean
  whyNow: string
  entryConditions: string[]
  abortConditions: string[]
  sustainConditions: string[]
  reversalRisk: string
  wrongMoveCost: string
  sustainability: number
  evidenceIds: string[]
}

export interface CoreDecisionLead {
  id: string
  domain: SignalDomain
  action: DecisionActionType
  label: string
  reversible: boolean
  gated: boolean
  gateReason: string | null
  totalScore: number
  confidence: number
}

export interface CoreDomainLead {
  domain: SignalDomain
  phase: StrategyPhaseCode
  totalSignalScore: number
  patternScore: number
  scenarioScore: number
  decisionScore: number
  dominanceScore: number
  evidenceIds: string[]
}

export interface CoreProvenance {
  sourceFields: string[]
  sourceSignalIds: string[]
  sourceRuleIds: string[]
  sourceSetIds: string[]
}

export interface CoreDomainAdvisory {
  domain: SignalDomain
  phase: StrategyPhaseCode
  thesis: string
  action: string
  caution: string
  timingHint: string
  strategyLine: string
  leadSignalIds: string[]
  leadPatternIds: string[]
  leadScenarioIds: string[]
  evidenceIds: string[]
  provenance: CoreProvenance
}

export interface CoreDomainTimingWindow {
  domain: SignalDomain
  window: ScenarioResult['window'] | '12m+'
  confidence: number
  timingRelevance: number
  timingGranularity: ScenarioResult['timingGranularity'] | 'season'
  precisionReason: string
  timingConflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
  timingConflictNarrative: string
  readinessScore: number
  triggerScore: number
  convergenceScore: number
  whyNow: string
  entryConditions: string[]
  abortConditions: string[]
  evidenceIds: string[]
  provenance: CoreProvenance
}

export interface CoreActivationSource {
  source:
    | 'natal'
    | 'daeun'
    | 'saeun'
    | 'wolun'
    | 'ilun'
    | 'transit'
    | 'astro_timing'
    | 'advanced_astro'
  active: boolean
  intensity: number
  label: string
  evidenceIds: string[]
}

export interface CoreDomainManifestation {
  domain: SignalDomain
  baselineThesis: string
  activationThesis: string
  manifestation: string
  likelyExpressions: string[]
  riskExpressions: string[]
  timingWindow: CoreDomainTimingWindow['window']
  activationSources: CoreActivationSource[]
  evidenceIds: string[]
  provenance: CoreProvenance
}

export interface CoreCoherenceAudit {
  verificationBias: boolean
  gatedDecision: boolean
  domainConflictCount: number
  contradictionFlags: string[]
  notes: string[]
}

export interface CoreJudgmentPolicy {
  mode: 'execute' | 'verify' | 'prepare'
  allowedActions: DecisionActionType[]
  blockedActions: DecisionActionType[]
  hardStops: string[]
  softChecks: string[]
  rationale: string
}

export interface CoreDomainVerdict {
  domain: SignalDomain
  mode: CoreJudgmentPolicy['mode']
  confidence: number
  leadPatternId: string | null
  leadPatternFamily: string | null
  leadScenarioId: string | null
  allowedActions: DecisionActionType[]
  blockedActions: DecisionActionType[]
  rationale: string
  evidenceIds: string[]
  provenance: CoreProvenance
}

export interface CoreArbitrationEntryBreakdown {
  signalDominance?: number
  scenarioDominance?: number
  decisionDominance?: number
  summaryDominance?: number
  convergenceBonus?: number
  timingBalanceBonus?: number
  focusBonus?: number
  optionStrength?: number
  confidenceBoost?: number
  topOptionBonus?: number
  gatedPenalty?: number
}

export interface CoreArbitrationEntry {
  domain: SignalDomain
  score: number
  reason: string
  breakdown: CoreArbitrationEntryBreakdown
}

export interface CoreArbitrationSuppression {
  domain: SignalDomain
  scoreGap: number
  reason: string
}

export interface CoreArbitrationLedger {
  focusWinner: CoreArbitrationEntry
  focusRunnerUp: CoreArbitrationEntry | null
  actionWinner: CoreArbitrationEntry | null
  actionRunnerUp: CoreArbitrationEntry | null
  suppressedDomains: CoreArbitrationSuppression[]
  conflictReasons: string[]
}

export interface DestinyCoreCanonicalOutput {
  version: 'v1'
  claimIds: string[]
  claimProvenanceById: Record<string, CoreProvenance>
  evidenceRefs: Record<string, string[]>
  confidence: number
  crossAgreement: number | null
  crossAgreementMatrix: CrossAgreementMatrixRow[]
  gradeLabel: string
  gradeReason: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  phase: StrategyPhaseCode
  phaseLabel: string
  attackPercent: number
  defensePercent: number
  thesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  topClaimId: string | null
  leadPatternId: string | null
  leadScenarioId: string | null
  topSignalIds: string[]
  cautions: string[]
  domainLeads: CoreDomainLead[]
  advisories: CoreDomainAdvisory[]
  domainTimingWindows: CoreDomainTimingWindow[]
  manifestations: CoreDomainManifestation[]
  coherenceAudit: CoreCoherenceAudit
  judgmentPolicy: CoreJudgmentPolicy
  domainVerdicts: CoreDomainVerdict[]
  topPatterns: CorePatternLead[]
  topScenarios: CoreScenarioLead[]
  topDecision: CoreDecisionLead | null
  layerScores: CoreLayerScore[]
  interactionHits: CoreInteractionHit[]
  timelineHits: CoreTimelineHit[]
  arbitrationLedger: CoreArbitrationLedger
  subjects: SubjectContext[]
  relationContexts: RelationContext[]
  timeSlices: TemporalSlice[]
}

export interface BuildCoreCanonicalOutputInput {
  lang: 'ko' | 'en'
  matrixInput?: MatrixCalculationInput
  signalSynthesis: SignalSynthesisResult
  patterns: Array<{
    id: string
    label: string
    family: string
    profile: 'upside' | 'risk' | 'support' | 'timing' | 'identity'
    domains: SignalDomain[]
    score: number
    confidence: number
    matchedSignalIds: string[]
  }>
  scenarios: ScenarioResult[]
  decisionEngine: {
    topOptionId: string | null
    options: Array<{
      id: string
      domain: SignalDomain
      action: DecisionActionType
      label: string
      summary: string
      reversible: boolean
      gated?: boolean
      gateReason?: string | null
      confidence: number
      scores: { total: number }
    }>
  }
  matrixSummary?: MatrixSummary
  strategy: {
    phase: StrategyPhaseCode
    phaseLabel: string
    attackPercent: number
    defensePercent: number
    thesis: string
    riskControl: string
    focusDomain?: SignalDomain
    domainStrategies: Array<{
      domain: SignalDomain
      phase: StrategyPhaseCode
      evidenceIds: string[]
      metrics: {
        strengthScore: number
        cautionScore: number
        balanceScore: number
        readinessScore?: number
        triggerScore?: number
        convergenceScore?: number
      }
    }>
  }
  crossAgreement?: unknown
  crossAgreementMatrix?: CrossAgreementMatrixRow[] | null
}
