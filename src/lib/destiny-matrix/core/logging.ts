export type DestinyLoggedService = 'calendar' | 'counselor' | 'report'

export type DestinyInteractionEventType =
  | 'destiny_question_opened'
  | 'destiny_answer_rendered'
  | 'destiny_followup_sent'
  | 'destiny_feedback_submitted'
  | 'destiny_report_viewed'
  | 'destiny_calendar_action_viewed'

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
