import type { CrossAgreementMatrixRow } from '../types'
import type { SignalDomain } from './signalSynthesizer'

export type AdapterProvenance = {
  sourceFields: string[]
  sourceSignalIds: string[]
  sourceRuleIds: string[]
  sourceSetIds: string[]
}

export type AdapterArbitrationBrief = {
  focusWinnerDomain: SignalDomain
  focusWinnerReason: string
  focusRunnerUpDomain: SignalDomain | null
  actionWinnerDomain: SignalDomain
  actionWinnerReason: string
  actionRunnerUpDomain: SignalDomain | null
  conflictReasons: string[]
  focusNarrative: string
  actionNarrative: string
  suppressionNarratives: string[]
}

export type AdapterLatentAxis = {
  id: string
  label: string
  score: number
  group: string
}

export type AdapterTimingMatrixRow = {
  domain: SignalDomain
  label: string
  window: string
  granularity: string
  confidence: number
  conflictMode: 'aligned' | 'readiness_ahead' | 'trigger_ahead' | 'weak_both'
  summary: string
}

export type AdapterProjectionBlock = {
  headline: string
  summary: string
  reasons: string[]
  detailLines: string[]
  drivers: string[]
  counterweights: string[]
  nextMoves: string[]
  topAxes?: string[]
  window?: string
  granularity?: string
}

export type AdapterProjectionSet = {
  structure: AdapterProjectionBlock
  timing: AdapterProjectionBlock
  conflict: AdapterProjectionBlock
  action: AdapterProjectionBlock
  risk: AdapterProjectionBlock
  evidence: AdapterProjectionBlock
  branches: AdapterProjectionBlock
}

export type AdapterMatrixViewCell = {
  timescale: 'now' | '1-3m' | '3-6m' | '6-12m'
  agreement: number
  contradiction: number
  leadLag: number
  summary: string
}

export type AdapterMatrixViewRow = {
  domain: SignalDomain
  label: string
  cells: AdapterMatrixViewCell[]
}

export type AdapterBranchCandidate = {
  id: string
  label: string
  domain: SignalDomain
  window?: string
  granularity?: string
  summary: string
  entry: string[]
  abort: string[]
  sustain: string[]
  reversalRisk?: string
  sustainability?: number
  wrongMoveCost?: string
}

export type AdapterSingleUserFacet = {
  key: 'structure' | 'cycle' | 'trigger' | 'risk' | 'action' | 'calibration'
  label: string
  summary: string
  details: string[]
}

export type AdapterSingleUserModel = {
  subject: string
  facets: AdapterSingleUserFacet[]
}

export type AdapterPersonLayer = {
  key: 'foundation' | 'formation' | 'active' | 'future'
  label: string
  summary: string
  bullets: string[]
}

export type AdapterPersonDimension = {
  domain: SignalDomain
  label: string
  structuralScore: number
  activationScore: number
  pressureScore: number
  supportScore: number
  timingWindow?: string
  summary: string
}

export type AdapterPersonState = {
  key: 'baseline' | 'pressure' | 'opportunity'
  label: string
  summary: string
  drivers: string[]
  counterweights: string[]
  domains: SignalDomain[]
}

export type AdapterPersonFutureBranch = {
  id: string
  label: string
  domain: SignalDomain
  window?: string
  probability?: number
  summary: string
  conditions: string[]
  blockers: string[]
}

export type AdapterPersonDomainState = {
  domain: SignalDomain
  label: string
  currentState: 'expansion' | 'stable' | 'mixed' | 'defensive' | 'blocked'
  currentWindow?: string
  thesis: string
  supportSignals: string[]
  pressureSignals: string[]
  alignedWith: SignalDomain[]
  conflictingWith: SignalDomain[]
  nextShift?: string
  firstMove: string
  holdMove: string
  timescales: Array<{
    timescale: 'now' | '1-3m' | '3-6m' | '6-12m'
    status: 'open' | 'mixed' | 'blocked'
    thesis: string
    entryConditions: string[]
    abortConditions: string[]
  }>
}

export type AdapterPersonAppliedProfile = {
  foodProfile: {
    summary: string
    thermalBias: string
    digestionStyle: string
    helpfulFoods: string[]
    cautionFoods: string[]
    rhythmGuidance: string[]
  }
  lifeRhythmProfile: {
    summary: string
    peakWindows: string[]
    recoveryWindows: string[]
    stressBehaviors: string[]
    regulationMoves: string[]
  }
  relationshipStyleProfile: {
    summary: string
    attractionPatterns: string[]
    stabilizers: string[]
    ruptureTriggers: string[]
    repairMoves: string[]
  }
  workStyleProfile: {
    summary: string
    bestRoles: string[]
    bestConditions: string[]
    fatigueTriggers: string[]
    leverageMoves: string[]
  }
  moneyStyleProfile: {
    summary: string
    earningPattern: string[]
    savingPattern: string[]
    leakageRisks: string[]
    controlRules: string[]
  }
  environmentProfile: {
    summary: string
    preferredSettings: string[]
    drainSignals: string[]
    resetActions: string[]
  }
}

export type AdapterPersonEventOutlook = {
  key: 'careerEntry' | 'partnerEntry' | 'commitment' | 'moneyBuild' | 'healthReset'
  label: string
  domain: SignalDomain
  status: 'open' | 'mixed' | 'blocked'
  readiness: number
  bestWindow?: string
  summary: string
  entryConditions: string[]
  abortConditions: string[]
  nextMove: string
}

export type AdapterBirthTimeHypothesis = {
  label: string
  birthTime: string
  bucket: 'early-morning' | 'morning' | 'afternoon' | 'evening' | 'night'
  status: 'current-best' | 'plausible' | 'low-fit'
  fitScore: number
  confidence: number
  summary: string
  supportSignals: string[]
  cautionSignals: string[]
  coreDiff?: {
    directAnswer?: string
    actionDomain?: string
    riskDomain?: string
    bestWindow?: string
    branchSummary?: string
  }
}

export type AdapterCrossConflictItem = {
  domain: SignalDomain
  label: string
  status: 'aligned' | 'saju-leading' | 'astro-leading' | 'contested'
  strongestTimescale?: 'now' | '1-3m' | '3-6m' | '6-12m'
  summary: string
  sajuView: string
  astroView: string
  resolutionMove: string
}

export type AdapterPastEventMarker = {
  key: 'identity-reset' | 'career-pivot' | 'relationship-lesson' | 'money-reset' | 'health-reset'
  label: string
  ageWindow: string
  status: 'anchored' | 'conditional'
  summary: string
  evidence: string[]
}

export type AdapterPersonUncertaintyEnvelope = {
  summary: string
  reliableAreas: string[]
  conditionalAreas: string[]
  unresolvedAreas: string[]
}

export type AdapterSingleSubjectTimingCell = {
  timescale: 'now' | '1-3m' | '3-6m' | '6-12m'
  status: 'open' | 'mixed' | 'blocked'
  agreement: number
  contradiction: number
  leadLag: number
  summary: string
}

export type AdapterSingleSubjectPressure = {
  domain: SignalDomain
  label: string
  status: 'open' | 'mixed' | 'blocked'
  nextWindow?: string
  agreement?: number
  contradiction?: number
  leadLag?: number
  summary: string
}

export type AdapterSingleSubjectBranch = {
  label: string
  summary: string
  entryConditions: string[]
  abortConditions: string[]
  nextMove: string
}

export type AdapterSingleSubjectView = {
  directAnswer: string
  structureAxis: {
    domain: SignalDomain
    label: string
    thesis: string
    topAxes: string[]
  }
  actionAxis: {
    domain: SignalDomain
    label: string
    nowAction: string
    whyThisFirst: string
  }
  riskAxis: {
    domain: SignalDomain
    label: string
    warning: string
    hardStops: string[]
  }
  timingState: {
    bestWindow: string
    whyNow?: string
    whyNotYet?: string
    confidence?: number
    windows: AdapterSingleSubjectTimingCell[]
  }
  competingPressures: AdapterSingleSubjectPressure[]
  branches: AdapterSingleSubjectBranch[]
  entryConditions: string[]
  abortConditions: string[]
  nextMove: string
  confidence?: number
  reliability?: {
    crossAgreement?: number | null
    contradictionFlags: string[]
    notes: string[]
  }
}

export type AdapterPersonModel = {
  subject: string
  overview: string
  structuralCore: {
    focusDomain: SignalDomain
    actionFocusDomain: SignalDomain
    riskAxisDomain: SignalDomain
    gradeLabel: string
    phaseLabel: string
    overview: string
    latentAxes: string[]
  }
  formationProfile: {
    summary: string
    repeatedPatternFamilies: string[]
    dominantLatentGroups: string[]
    pressureHabits: string[]
    supportHabits: string[]
  }
  timeProfile: {
    currentWindow?: string
    currentGranularity?: string
    timingNarrative: string
    confidence: number
    windows: Array<{
      domain: SignalDomain
      label: string
      window: string
      granularity: string
      confidence: number
      whyNow: string
      entryConditions: string[]
      abortConditions: string[]
    }>
    activationSources: Array<{
      domain: SignalDomain
      source: string
      label: string
      intensity: number
      active: boolean
    }>
  }
  layers: AdapterPersonLayer[]
  dimensions: AdapterPersonDimension[]
  domainStateGraph: AdapterPersonDomainState[]
  domainPortraits: Array<{
    domain: SignalDomain
    label: string
    mode: 'execute' | 'verify' | 'prepare'
    structuralScore: number
    activationScore: number
    pressureScore: number
    supportScore: number
    timingWindow?: string
    summary: string
    baselineThesis: string
    activationThesis: string
    likelyExpressions: string[]
    riskExpressions: string[]
    allowedActions: string[]
    blockedActions: string[]
  }>
  states: AdapterPersonState[]
  appliedProfile: AdapterPersonAppliedProfile
  relationshipProfile: {
    summary: string
    partnerArchetypes: string[]
    inflowPaths: string[]
    commitmentConditions: string[]
    breakPatterns: string[]
  }
  careerProfile: {
    summary: string
    suitableLanes: string[]
    executionStyle: string[]
    hiringTriggers: string[]
    blockers: string[]
  }
  futureBranches: AdapterPersonFutureBranch[]
  eventOutlook: AdapterPersonEventOutlook[]
  birthTimeHypotheses: AdapterBirthTimeHypothesis[]
  crossConflictMap: AdapterCrossConflictItem[]
  pastEventReconstruction: {
    summary: string
    markers: AdapterPastEventMarker[]
  }
  uncertaintyEnvelope: AdapterPersonUncertaintyEnvelope
  evidenceLedger: {
    topClaimIds: string[]
    topSignalIds: string[]
    topPatternIds: string[]
    topScenarioIds: string[]
    topDecisionId: string | null
    topDecisionLabel: string | null
    coherenceNotes: string[]
    contradictionFlags: string[]
  }
}

export interface CalendarCoreAdapterResult {
  coreHash: string
  gradeLabel: string
  gradeReason: string
  phase: string
  phaseLabel: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  riskAxisDomain: SignalDomain
  riskAxisLabel: string
  timingMatrix: AdapterTimingMatrixRow[]
  confidence: number
  crossAgreement: number | null
  crossAgreementMatrix: CrossAgreementMatrixRow[]
  matrixView: AdapterMatrixViewRow[]
  branchSet: AdapterBranchCandidate[]
  singleUserModel: AdapterSingleUserModel
  singleSubjectView: AdapterSingleSubjectView
  personModel: AdapterPersonModel
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
  attackPercent: number
  defensePercent: number
  thesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  claimIds: string[]
  claimProvenanceById: Record<string, AdapterProvenance>
  cautionIds: string[]
  topSignalIds: string[]
  topPatternIds: string[]
  topScenarioIds: string[]
  topDecisionId: string | null
  topDecisionAction: string | null
  topDecisionLabel: string | null
  judgmentPolicy: {
    mode: 'execute' | 'verify' | 'prepare'
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    hardStops: string[]
    hardStopLabels: string[]
    softChecks: string[]
    softCheckLabels: string[]
    rationale: string
  }
  domainVerdicts: Array<{
    domain: SignalDomain
    mode: 'execute' | 'verify' | 'prepare'
    confidence: number
    leadPatternId: string | null
    leadPatternFamily: string | null
    leadScenarioId: string | null
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    rationale: string
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  coherenceAudit: {
    verificationBias: boolean
    gatedDecision: boolean
    domainConflictCount: number
    contradictionFlags: string[]
    notes: string[]
  }
  advisories: Array<{
    domain: SignalDomain
    phase: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
    leadSignalIds: string[]
    leadPatternIds: string[]
    leadScenarioIds: string[]
    provenance: AdapterProvenance
  }>
  topTimingWindow?: {
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
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
    provenance: AdapterProvenance
  }
  domainTimingWindows: Array<{
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
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
    provenance: AdapterProvenance
  }>
  manifestations: Array<{
    domain: SignalDomain
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    activationSources: Array<{
      source: string
      active: boolean
      intensity: number
      label: string
      evidenceIds: string[]
    }>
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
}

export interface CounselorCoreAdapterResult {
  coreHash: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  riskAxisDomain: SignalDomain
  riskAxisLabel: string
  timingMatrix: AdapterTimingMatrixRow[]
  crossAgreementMatrix: CrossAgreementMatrixRow[]
  matrixView: AdapterMatrixViewRow[]
  branchSet: AdapterBranchCandidate[]
  singleUserModel: AdapterSingleUserModel
  singleSubjectView: AdapterSingleSubjectView
  personModel: AdapterPersonModel
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
  gradeLabel: string
  phase: string
  phaseLabel: string
  answerThesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  timingHint: string
  topClaimId: string | null
  claimIds: string[]
  claimProvenanceById: Record<string, AdapterProvenance>
  topSignalIds: string[]
  topScenarioIds: string[]
  topDecisionId: string | null
  topDecisionAction: string | null
  topDecisionLabel: string | null
  judgmentPolicy: {
    mode: 'execute' | 'verify' | 'prepare'
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    hardStops: string[]
    hardStopLabels: string[]
    softChecks: string[]
    softCheckLabels: string[]
    rationale: string
  }
  domainVerdicts: Array<{
    domain: SignalDomain
    mode: 'execute' | 'verify' | 'prepare'
    confidence: number
    leadPatternId: string | null
    leadPatternFamily: string | null
    leadScenarioId: string | null
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    rationale: string
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  coherenceAudit: {
    verificationBias: boolean
    gatedDecision: boolean
    domainConflictCount: number
    contradictionFlags: string[]
    notes: string[]
  }
  advisories: Array<{
    domain: SignalDomain
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
    leadSignalIds: string[]
    leadPatternIds: string[]
    leadScenarioIds: string[]
    provenance: AdapterProvenance
  }>
  domainTimingWindows: Array<{
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
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
    provenance: AdapterProvenance
  }>
  manifestations: Array<{
    domain: SignalDomain
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    activationSources: Array<{
      source: string
      active: boolean
      intensity: number
      label: string
      evidenceIds: string[]
    }>
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
}

export interface ReportCoreAdapterResult {
  coreHash: string
  focusDomain: SignalDomain
  actionFocusDomain: SignalDomain
  riskAxisDomain: SignalDomain
  riskAxisLabel: string
  timingMatrix: AdapterTimingMatrixRow[]
  crossAgreementMatrix: CrossAgreementMatrixRow[]
  matrixView: AdapterMatrixViewRow[]
  branchSet: AdapterBranchCandidate[]
  singleUserModel: AdapterSingleUserModel
  singleSubjectView: AdapterSingleSubjectView
  personModel: AdapterPersonModel
  arbitrationBrief: AdapterArbitrationBrief
  latentTopAxes: AdapterLatentAxis[]
  projections: AdapterProjectionSet
  gradeLabel: string
  gradeReason: string
  phase: string
  phaseLabel: string
  thesis: string
  riskControl: string
  primaryAction: string
  primaryCaution: string
  confidence: number
  crossAgreement: number | null
  claimIds: string[]
  claimProvenanceById: Record<string, AdapterProvenance>
  evidenceRefs: Record<string, string[]>
  topSignalIds: string[]
  topPatternIds: string[]
  topScenarioIds: string[]
  topDecisionId: string | null
  topDecisionAction: string | null
  topDecisionLabel: string | null
  judgmentPolicy: {
    mode: 'execute' | 'verify' | 'prepare'
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    hardStops: string[]
    hardStopLabels: string[]
    softChecks: string[]
    softCheckLabels: string[]
    rationale: string
  }
  domainVerdicts: Array<{
    domain: SignalDomain
    mode: 'execute' | 'verify' | 'prepare'
    confidence: number
    leadPatternId: string | null
    leadPatternFamily: string | null
    leadScenarioId: string | null
    allowedActions: string[]
    allowedActionLabels: string[]
    blockedActions: string[]
    blockedActionLabels: string[]
    rationale: string
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  coherenceAudit: {
    verificationBias: boolean
    gatedDecision: boolean
    domainConflictCount: number
    contradictionFlags: string[]
    notes: string[]
  }
  advisories: Array<{
    domain: SignalDomain
    phase: string
    thesis: string
    action: string
    caution: string
    timingHint: string
    strategyLine: string
    leadSignalIds: string[]
    leadPatternIds: string[]
    leadScenarioIds: string[]
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
  domainTimingWindows: Array<{
    domain: SignalDomain
    window: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    confidence: number
    timingRelevance: number
    timingGranularity: 'day' | 'week' | 'fortnight' | 'month' | 'season'
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
    provenance: AdapterProvenance
  }>
  manifestations: Array<{
    domain: SignalDomain
    baselineThesis: string
    activationThesis: string
    manifestation: string
    likelyExpressions: string[]
    riskExpressions: string[]
    timingWindow: 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
    activationSources: Array<{
      source: string
      active: boolean
      intensity: number
      label: string
      evidenceIds: string[]
    }>
    evidenceIds: string[]
    provenance: AdapterProvenance
  }>
}
