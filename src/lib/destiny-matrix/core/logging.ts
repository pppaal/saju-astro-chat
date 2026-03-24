export type DestinyLoggedService = 'calendar' | 'counselor' | 'report'

export type DestinyInteractionEventType =
  | 'destiny_question_opened'
  | 'destiny_answer_rendered'
  | 'destiny_followup_sent'
  | 'destiny_feedback_submitted'
  | 'destiny_report_viewed'
  | 'destiny_calendar_action_viewed'

export type DestinyTimingWindow = 'now' | '1-3m' | '3-6m' | '6-12m' | '12m+'
export type DestinyTimingGranularity = 'day' | 'week' | 'fortnight' | 'month' | 'season'
export type DestinyTimingConflictMode =
  | 'aligned'
  | 'readiness_ahead'
  | 'trigger_ahead'
  | 'weak_both'
export type DestinyReliabilityBand = 'low' | 'medium' | 'high'
export type DestinyPredictionType =
  | 'opportunity'
  | 'delay'
  | 'review'
  | 'contact'
  | 'move'
  | 'health_load'
  | 'general'

export interface DestinyInteractionMetadata {
  eventType: DestinyInteractionEventType
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  theme?: string | null
  sessionId?: string | null
  questionId?: string | null
  questionText?: string | null
  focusDomain?: string | null
  phase?: string | null
  phaseLabel?: string | null
  topDecisionId?: string | null
  topDecisionAction?: string | null
  topDecisionLabel?: string | null
  topScenarioIds?: string[]
  topPatternIds?: string[]
  policyMode?: 'execute' | 'verify' | 'prepare' | null
  allowedActions?: string[]
  blockedActions?: string[]
  softChecks?: string[]
  hardStops?: string[]
  riskControl?: string | null
  confidence?: number | null
  crossAgreement?: number | null
  graphRagAnchorCount?: number | null
  graphRagTopAnchorId?: string | null
  graphRagTopAnchorSection?: string | null
  regressionSuite?: string | null
  qaVersion?: string | null
  userRating?: number | null
  userFollowupCount?: number | null
  metadataVersion: 'v1'
}

export interface DestinyPredictionSnapshotMetadata {
  kind: 'prediction_snapshot'
  metadataVersion: 'v1'
  predictionId: string
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  theme?: string | null
  sessionId?: string | null
  questionId?: string | null
  questionText?: string | null
  focusDomain?: string | null
  actionFocusDomain?: string | null
  phase?: string | null
  phaseLabel?: string | null
  topDecisionId?: string | null
  topDecisionAction?: string | null
  topDecisionLabel?: string | null
  timingWindow?: DestinyTimingWindow | null
  timingGranularity?: DestinyTimingGranularity | null
  precisionReason?: string | null
  timingConflictMode?: DestinyTimingConflictMode | null
  timingConflictNarrative?: string | null
  readinessScore?: number | null
  triggerScore?: number | null
  convergenceScore?: number | null
  timingReliabilityScore?: number | null
  timingReliabilityBand?: DestinyReliabilityBand | null
  selectedProbeDay?: number | null
  selectedProbeBucket?: 'early' | 'mid' | 'late' | null
  predictionClaim?: string | null
  predictionType?: DestinyPredictionType | null
}

export interface DestinyOutcomeMetadata {
  kind: 'outcome_feedback'
  metadataVersion: 'v1'
  predictionId: string
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  happened?: boolean | null
  actualDomain?: string | null
  actualWindowBucket?: 'early' | 'mid' | 'late' | 'outside' | 'unknown' | null
  actualDate?: string | null
  matchedPrediction?: boolean | null
  note?: string | null
}

export interface BuildDestinyInteractionMetadataInput {
  eventType: DestinyInteractionEventType
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  theme?: string | null
  sessionId?: string | null
  questionId?: string | null
  questionText?: string | null
  focusDomain?: string | null
  phase?: string | null
  phaseLabel?: string | null
  topDecisionId?: string | null
  topDecisionAction?: string | null
  topDecisionLabel?: string | null
  topScenarioIds?: string[] | null
  topPatternIds?: string[] | null
  policyMode?: 'execute' | 'verify' | 'prepare' | null
  allowedActions?: string[] | null
  blockedActions?: string[] | null
  softChecks?: string[] | null
  hardStops?: string[] | null
  riskControl?: string | null
  confidence?: number | null
  crossAgreement?: number | null
  graphRagAnchorCount?: number | null
  graphRagTopAnchorId?: string | null
  graphRagTopAnchorSection?: string | null
  regressionSuite?: string | null
  qaVersion?: string | null
  userRating?: number | null
  userFollowupCount?: number | null
}

export interface BuildDestinyPredictionSnapshotMetadataInput {
  predictionId: string
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  theme?: string | null
  sessionId?: string | null
  questionId?: string | null
  questionText?: string | null
  focusDomain?: string | null
  actionFocusDomain?: string | null
  phase?: string | null
  phaseLabel?: string | null
  topDecisionId?: string | null
  topDecisionAction?: string | null
  topDecisionLabel?: string | null
  timingWindow?: DestinyTimingWindow | null
  timingGranularity?: DestinyTimingGranularity | null
  precisionReason?: string | null
  timingConflictMode?: DestinyTimingConflictMode | null
  timingConflictNarrative?: string | null
  readinessScore?: number | null
  triggerScore?: number | null
  convergenceScore?: number | null
  timingReliabilityScore?: number | null
  timingReliabilityBand?: DestinyReliabilityBand | null
  selectedProbeDay?: number | null
  selectedProbeBucket?: 'early' | 'mid' | 'late' | null
  predictionClaim?: string | null
  predictionType?: DestinyPredictionType | null
}

export interface BuildDestinyOutcomeMetadataInput {
  predictionId: string
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  happened?: boolean | null
  actualDomain?: string | null
  actualWindowBucket?: 'early' | 'mid' | 'late' | 'outside' | 'unknown' | null
  actualDate?: string | null
  matchedPrediction?: boolean | null
  note?: string | null
}

function compactString(value?: string | null): string | null | undefined {
  if (value == null) return value
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function compactArray(value?: string[] | null): string[] | undefined {
  if (!value) return undefined
  const cleaned = [...new Set(value.map((item) => item.trim()).filter(Boolean))]
  return cleaned.length > 0 ? cleaned : undefined
}

function clampUnit(value?: number | null): number | null | undefined {
  if (value == null || Number.isNaN(value)) return value ?? undefined
  return Math.max(0, Math.min(1, Number(value)))
}

function clampNonNegative(value?: number | null): number | null | undefined {
  if (value == null || Number.isNaN(value)) return value ?? undefined
  return Math.max(0, Number(value))
}

export function buildDestinyInteractionMetadata(
  input: BuildDestinyInteractionMetadataInput
): DestinyInteractionMetadata {
  return {
    eventType: input.eventType,
    service: input.service,
    lang: input.lang,
    theme: compactString(input.theme) ?? null,
    sessionId: compactString(input.sessionId) ?? null,
    questionId: compactString(input.questionId) ?? null,
    questionText: compactString(input.questionText) ?? null,
    focusDomain: compactString(input.focusDomain) ?? null,
    phase: compactString(input.phase) ?? null,
    phaseLabel: compactString(input.phaseLabel) ?? null,
    topDecisionId: compactString(input.topDecisionId) ?? null,
    topDecisionAction: compactString(input.topDecisionAction) ?? null,
    topDecisionLabel: compactString(input.topDecisionLabel) ?? null,
    topScenarioIds: compactArray(input.topScenarioIds ?? undefined),
    topPatternIds: compactArray(input.topPatternIds ?? undefined),
    policyMode: input.policyMode ?? null,
    allowedActions: compactArray(input.allowedActions ?? undefined),
    blockedActions: compactArray(input.blockedActions ?? undefined),
    softChecks: compactArray(input.softChecks ?? undefined),
    hardStops: compactArray(input.hardStops ?? undefined),
    riskControl: compactString(input.riskControl) ?? null,
    confidence: clampUnit(input.confidence),
    crossAgreement: clampUnit(input.crossAgreement),
    graphRagAnchorCount: input.graphRagAnchorCount ?? null,
    graphRagTopAnchorId: compactString(input.graphRagTopAnchorId) ?? null,
    graphRagTopAnchorSection: compactString(input.graphRagTopAnchorSection) ?? null,
    regressionSuite: compactString(input.regressionSuite) ?? null,
    qaVersion: compactString(input.qaVersion) ?? null,
    userRating: input.userRating ?? null,
    userFollowupCount: input.userFollowupCount ?? null,
    metadataVersion: 'v1',
  }
}

export function buildDestinyPredictionSnapshotMetadata(
  input: BuildDestinyPredictionSnapshotMetadataInput
): DestinyPredictionSnapshotMetadata {
  return {
    kind: 'prediction_snapshot',
    metadataVersion: 'v1',
    predictionId: input.predictionId.trim(),
    service: input.service,
    lang: input.lang,
    theme: compactString(input.theme) ?? null,
    sessionId: compactString(input.sessionId) ?? null,
    questionId: compactString(input.questionId) ?? null,
    questionText: compactString(input.questionText) ?? null,
    focusDomain: compactString(input.focusDomain) ?? null,
    actionFocusDomain: compactString(input.actionFocusDomain) ?? null,
    phase: compactString(input.phase) ?? null,
    phaseLabel: compactString(input.phaseLabel) ?? null,
    topDecisionId: compactString(input.topDecisionId) ?? null,
    topDecisionAction: compactString(input.topDecisionAction) ?? null,
    topDecisionLabel: compactString(input.topDecisionLabel) ?? null,
    timingWindow: input.timingWindow ?? null,
    timingGranularity: input.timingGranularity ?? null,
    precisionReason: compactString(input.precisionReason) ?? null,
    timingConflictMode: input.timingConflictMode ?? null,
    timingConflictNarrative: compactString(input.timingConflictNarrative) ?? null,
    readinessScore: clampUnit(input.readinessScore),
    triggerScore: clampUnit(input.triggerScore),
    convergenceScore: clampUnit(input.convergenceScore),
    timingReliabilityScore: clampUnit(input.timingReliabilityScore),
    timingReliabilityBand: input.timingReliabilityBand ?? null,
    selectedProbeDay: clampNonNegative(input.selectedProbeDay) ?? null,
    selectedProbeBucket: input.selectedProbeBucket ?? null,
    predictionClaim: compactString(input.predictionClaim) ?? null,
    predictionType: input.predictionType ?? null,
  }
}

export function buildDestinyOutcomeMetadata(
  input: BuildDestinyOutcomeMetadataInput
): DestinyOutcomeMetadata {
  return {
    kind: 'outcome_feedback',
    metadataVersion: 'v1',
    predictionId: input.predictionId.trim(),
    service: input.service,
    lang: input.lang,
    happened: input.happened ?? null,
    actualDomain: compactString(input.actualDomain) ?? null,
    actualWindowBucket: input.actualWindowBucket ?? null,
    actualDate: compactString(input.actualDate) ?? null,
    matchedPrediction: input.matchedPrediction ?? null,
    note: compactString(input.note) ?? null,
  }
}
