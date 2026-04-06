import type {
  AdapterBranchCandidate,
  AdapterMatrixViewRow,
  AdapterPersonModel,
  AdapterSingleSubjectView,
  AdapterSingleUserModel,
} from '@/lib/destiny-matrix/core/adaptersTypes'
import type { GraphRAGEvidenceSummary } from '@/lib/destiny-matrix/ai-report/graphRagEvidence'

export type CounselorTheme =
  | 'love'
  | 'career'
  | 'wealth'
  | 'health'
  | 'family'
  | 'today'
  | 'month'
  | 'year'
  | 'life'
  | 'chat'
  | string

export interface CounselorEvidencePacket {
  focusDomain: string
  actionFocusDomain?: string
  riskAxisLabel?: string
  matrixView?: AdapterMatrixViewRow[]
  branchSet?: AdapterBranchCandidate[]
  singleUserModel?: AdapterSingleUserModel
  singleSubjectView?: AdapterSingleSubjectView
  personModel?: AdapterPersonModel
  timingMatrix?: Array<{
    domain: string
    label: string
    window: string
    granularity: string
    confidence: number
    summary: string
  }>
  verdict: string
  guardrail: string
  topAnchorSummary: string
  graphRagEvidenceSummary: GraphRAGEvidenceSummary
  topAnchors: Array<{
    id: string
    section: string
    summary: string
    setCount: number
  }>
  topClaims: Array<{
    id: string
    text: string
    domain?: string
    signalIds: string[]
    anchorIds: string[]
    provenanceSummary?: string
  }>
  scenarioBriefs: Array<{
    id: string
    domain: string
    mainTokens: string[]
    altTokens: string[]
  }>
  selectedSignals: Array<{
    id: string
    domain: string
    polarity: string
    summary: string
    score: number
  }>
  strategyBrief: {
    overallPhase: string
    overallPhaseLabel: string
    attackPercent: number
    defensePercent: number
  }
  canonicalBrief?: {
    gradeLabel: string
    phaseLabel: string
    actionFocusDomain?: string
    focusRunnerUpDomain?: string
    actionRunnerUpDomain?: string
    focusNarrative?: string
    actionNarrative?: string
    suppressionNarratives?: string[]
    topDecisionAction?: string
    topDecisionLabel?: string
    answerThesis: string
    primaryAction: string
    primaryCaution: string
    timingHint: string
    policyMode: 'execute' | 'verify' | 'prepare'
    policyRationale: string
    allowedActions: string[]
    blockedActions: string[]
    softChecks: string[]
    hardStops: string[]
    latentTopAxes?: string[]
  }
  topDomainAdvisory?: {
    domain: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
  }
  topTimingWindow?: {
    domain: string
    window: string
    timingGranularity?: 'day' | 'week' | 'fortnight' | 'month' | 'season'
    timingReliabilityBand?: 'low' | 'medium' | 'high'
    timingReliabilityScore?: number
    readinessScore?: number
    triggerScore?: number
    convergenceScore?: number
    precisionReason?: string
    timingConflictMode?: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
    timingConflictNarrative?: string
    whyNow: string
    entryConditions: string[]
    abortConditions: string[]
  }
  topManifestation?: {
    domain: string
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: string
  }
  projections?: {
    structure?: CounselorProjectionBlock
    timing?: CounselorProjectionBlock
    conflict?: CounselorProjectionBlock
    action?: CounselorProjectionBlock
    risk?: CounselorProjectionBlock
    evidence?: CounselorProjectionBlock
    branches?: CounselorProjectionBlock
  }
  whyStack: string[]
}

export type CounselorProjectionBlock = {
  headline: string
  summary: string
  reasons?: string[]
  detailLines?: string[]
  drivers?: string[]
  counterweights?: string[]
  nextMoves?: string[]
}

export type CounselorEvidencePacketLike = {
  focusDomain?: string
  riskAxisLabel?: string
  matrixView?: CounselorEvidencePacket['matrixView']
  branchSet?: CounselorEvidencePacket['branchSet']
  singleUserModel?: CounselorEvidencePacket['singleUserModel']
  singleSubjectView?: CounselorEvidencePacket['singleSubjectView']
  timingMatrix?: CounselorEvidencePacket['timingMatrix']
  verdict?: string
  guardrail?: string
  topAnchorSummary?: string
  graphRagEvidenceSummary?: Partial<GraphRAGEvidenceSummary>
  topAnchors?: Array<{
    id?: string
    section?: string
    summary?: string
    setCount?: number
  }>
  topClaims?: Array<{
    id?: string
    text?: string
    domain?: string
    signalIds?: string[]
    anchorIds?: string[]
    provenanceSummary?: string
  }>
  scenarioBriefs?: Array<{
    id?: string
    domain?: string
    mainTokens?: string[]
    altTokens?: string[]
  }>
  selectedSignals?: Array<{
    id?: string
    domain?: string
    polarity?: string
    summary?: string
    score?: number
  }>
  strategyBrief?: {
    overallPhase?: string
    overallPhaseLabel?: string
    attackPercent?: number
    defensePercent?: number
  }
  canonicalBrief?: Partial<NonNullable<CounselorEvidencePacket['canonicalBrief']>>
  topDomainAdvisory?: CounselorEvidencePacket['topDomainAdvisory']
  topTimingWindow?: CounselorEvidencePacket['topTimingWindow']
  topManifestation?: CounselorEvidencePacket['topManifestation']
  projections?: CounselorEvidencePacket['projections']
  whyStack?: string[]
}

