import { randomUUID } from 'node:crypto'

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  buildDestinyOutcomeMetadata,
  buildDestinyPredictionSnapshotMetadata,
  type DestinyLoggedService,
  type DestinyPredictionType,
  type DestinyReliabilityBand,
  type DestinyTimingConflictMode,
  type DestinyTimingGranularity,
  type DestinyTimingWindow,
} from '@/lib/destiny-matrix/core/logging'

export interface PersistDestinyPredictionSnapshotInput {
  userId?: string | null
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

export interface PersistDestinyOutcomeInput {
  userId: string
  service: DestinyLoggedService
  lang: 'ko' | 'en'
  predictionId: string
  happened?: boolean | null
  actualDomain?: string | null
  actualWindowBucket?: 'early' | 'mid' | 'late' | 'outside' | 'unknown' | null
  actualDate?: string | null
  matchedPrediction?: boolean | null
  note?: string | null
}

function inferPredictionType(input: PersistDestinyPredictionSnapshotInput): DestinyPredictionType {
  const action = `${input.topDecisionAction || ''} ${input.topDecisionLabel || ''}`.toLowerCase()
  const focus = `${input.actionFocusDomain || ''} ${input.focusDomain || ''}`.toLowerCase()
  if (action.includes('review') || action.includes('검토')) return 'review'
  if (action.includes('contact') || action.includes('연락')) return 'contact'
  if (action.includes('move') || focus.includes('move') || action.includes('이동')) return 'move'
  if (focus.includes('health') || focus.includes('건강')) return 'health_load'
  if (action.includes('delay') || action.includes('보류') || action.includes('pause')) return 'delay'
  if (action || focus) return 'opportunity'
  return 'general'
}

export async function persistDestinyPredictionSnapshot(
  input: PersistDestinyPredictionSnapshotInput
): Promise<string | null> {
  if (!input.userId) return null

  const predictionId = randomUUID()
  const metadata = buildDestinyPredictionSnapshotMetadata({
    predictionId,
    service: input.service,
    lang: input.lang,
    theme: input.theme,
    sessionId: input.sessionId,
    questionId: input.questionId,
    questionText: input.questionText,
    focusDomain: input.focusDomain,
    actionFocusDomain: input.actionFocusDomain,
    phase: input.phase,
    phaseLabel: input.phaseLabel,
    topDecisionId: input.topDecisionId,
    topDecisionAction: input.topDecisionAction,
    topDecisionLabel: input.topDecisionLabel,
    timingWindow: input.timingWindow,
    timingGranularity: input.timingGranularity,
    precisionReason: input.precisionReason,
    timingConflictMode: input.timingConflictMode,
    timingConflictNarrative: input.timingConflictNarrative,
    readinessScore: input.readinessScore,
    triggerScore: input.triggerScore,
    convergenceScore: input.convergenceScore,
    timingReliabilityScore: input.timingReliabilityScore,
    timingReliabilityBand: input.timingReliabilityBand,
    selectedProbeDay: input.selectedProbeDay,
    selectedProbeBucket: input.selectedProbeBucket,
    predictionClaim: input.predictionClaim,
    predictionType: input.predictionType ?? inferPredictionType(input),
  })

  try {
    await prisma.userInteraction.create({
      data: {
        userId: input.userId,
        type: 'destiny_prediction_snapshot',
        service: input.service,
        theme: input.theme ?? null,
        metadata: metadata as unknown as object,
      },
    })
    return predictionId
  } catch (error) {
    logger.warn('[destiny] failed to persist prediction snapshot', {
      service: input.service,
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}

export async function persistDestinyOutcomeFeedback(
  input: PersistDestinyOutcomeInput
): Promise<string | null> {
  const metadata = buildDestinyOutcomeMetadata({
    predictionId: input.predictionId,
    service: input.service,
    lang: input.lang,
    happened: input.happened,
    actualDomain: input.actualDomain,
    actualWindowBucket: input.actualWindowBucket,
    actualDate: input.actualDate,
    matchedPrediction: input.matchedPrediction,
    note: input.note,
  })

  try {
    const saved = await prisma.userInteraction.create({
      data: {
        userId: input.userId,
        type: 'destiny_outcome_logged',
        service: input.service,
        theme: input.actualDomain ?? null,
        metadata: metadata as unknown as object,
      },
      select: { id: true },
    })
    return saved.id
  } catch (error) {
    logger.warn('[destiny] failed to persist outcome feedback', {
      service: input.service,
      userId: input.userId,
      error: error instanceof Error ? error.message : String(error),
    })
    return null
  }
}
