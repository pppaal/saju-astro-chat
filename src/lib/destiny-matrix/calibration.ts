import type {
  DestinyOutcomeMetadata,
  DestinyPredictionSnapshotMetadata,
  DestinyReliabilityBand,
  DestinyTimingGranularity,
  DestinyTimingWindow,
} from '@/lib/destiny-matrix/core/logging'

export interface DestinyCalibrationSourceRow {
  id?: string | null
  userId?: string | null
  createdAt?: Date | string | null
  metadata: unknown
}

export interface DestinyCalibrationPredictionRecord {
  rowId: string | null
  userId: string | null
  createdAt: string | null
  metadata: DestinyPredictionSnapshotMetadata
}

export interface DestinyCalibrationOutcomeRecord {
  rowId: string | null
  userId: string | null
  createdAt: string | null
  metadata: DestinyOutcomeMetadata
}

export interface DestinyCalibrationBucket {
  service: DestinyPredictionSnapshotMetadata['service']
  actionFocusDomain: string
  timingWindow: DestinyTimingWindow | 'unknown'
  timingGranularity: DestinyTimingGranularity | 'unknown'
  selectedProbeBucket: 'early' | 'mid' | 'late' | 'unknown'
  reliabilityBand: DestinyReliabilityBand | 'unknown'
  predictionType: NonNullable<DestinyPredictionSnapshotMetadata['predictionType']> | 'unknown'
}

export interface DestinyCalibrationAggregate {
  bucket: DestinyCalibrationBucket
  predictionCount: number
  outcomeCount: number
  happenedCount: number
  matchedCount: number
  happenedRate: number
  matchedRate: number
  avgReadinessScore: number | null
  avgTriggerScore: number | null
  avgConvergenceScore: number | null
  avgTimingReliabilityScore: number | null
}

export interface DestinyCalibrationReport {
  predictions: DestinyCalibrationPredictionRecord[]
  outcomes: DestinyCalibrationOutcomeRecord[]
  unmatchedOutcomeCount: number
  aggregates: DestinyCalibrationAggregate[]
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isTimingWindow(value: unknown): value is DestinyTimingWindow {
  return value === 'now' || value === '1-3m' || value === '3-6m' || value === '6-12m' || value === '12m+'
}

function isTimingGranularity(value: unknown): value is DestinyTimingGranularity {
  return value === 'day' || value === 'week' || value === 'fortnight' || value === 'month' || value === 'season'
}

function isReliabilityBand(value: unknown): value is DestinyReliabilityBand {
  return value === 'low' || value === 'medium' || value === 'high'
}

function isProbeBucket(value: unknown): value is 'early' | 'mid' | 'late' | 'outside' | 'unknown' {
  return value === 'early' || value === 'mid' || value === 'late' || value === 'outside' || value === 'unknown'
}

function isPredictionType(
  value: unknown
): value is NonNullable<DestinyPredictionSnapshotMetadata['predictionType']> {
  return (
    value === 'opportunity' ||
    value === 'delay' ||
    value === 'review' ||
    value === 'contact' ||
    value === 'move' ||
    value === 'health_load' ||
    value === 'general'
  )
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return value.toISOString()
  return typeof value === 'string' && value.trim() ? value : null
}

function average(values: Array<number | null | undefined>): number | null {
  const clean = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
  if (clean.length === 0) return null
  return clean.reduce((sum, value) => sum + value, 0) / clean.length
}

export function isDestinyPredictionSnapshotMetadata(
  value: unknown
): value is DestinyPredictionSnapshotMetadata {
  if (!isRecord(value)) return false
  if (value.kind !== 'prediction_snapshot') return false
  if (value.metadataVersion !== 'v1') return false
  if (typeof value.predictionId !== 'string' || !value.predictionId.trim()) return false
  if (value.service !== 'calendar' && value.service !== 'counselor' && value.service !== 'report') return false
  if (value.lang !== 'ko' && value.lang !== 'en') return false
  if (value.timingWindow != null && !isTimingWindow(value.timingWindow)) return false
  if (value.timingGranularity != null && !isTimingGranularity(value.timingGranularity)) return false
  if (value.timingReliabilityBand != null && !isReliabilityBand(value.timingReliabilityBand)) return false
  if (value.selectedProbeBucket != null && !isProbeBucket(value.selectedProbeBucket)) return false
  if (value.predictionType != null && !isPredictionType(value.predictionType)) return false
  return true
}

export function isDestinyOutcomeMetadata(value: unknown): value is DestinyOutcomeMetadata {
  if (!isRecord(value)) return false
  if (value.kind !== 'outcome_feedback') return false
  if (value.metadataVersion !== 'v1') return false
  if (typeof value.predictionId !== 'string' || !value.predictionId.trim()) return false
  if (value.service !== 'calendar' && value.service !== 'counselor' && value.service !== 'report') return false
  if (value.lang !== 'ko' && value.lang !== 'en') return false
  if (value.actualWindowBucket != null && !isProbeBucket(value.actualWindowBucket)) return false
  return true
}

export function buildDestinyCalibrationBucket(
  metadata: DestinyPredictionSnapshotMetadata
): DestinyCalibrationBucket {
  return {
    service: metadata.service,
    actionFocusDomain: metadata.actionFocusDomain ?? 'unknown',
    timingWindow: metadata.timingWindow ?? 'unknown',
    timingGranularity: metadata.timingGranularity ?? 'unknown',
    selectedProbeBucket: metadata.selectedProbeBucket ?? 'unknown',
    reliabilityBand: metadata.timingReliabilityBand ?? 'unknown',
    predictionType: metadata.predictionType ?? 'unknown',
  }
}

function bucketKey(bucket: DestinyCalibrationBucket): string {
  return [
    bucket.service,
    bucket.actionFocusDomain,
    bucket.timingWindow,
    bucket.timingGranularity,
    bucket.selectedProbeBucket,
    bucket.reliabilityBand,
    bucket.predictionType,
  ].join('|')
}

export function aggregateDestinyCalibration(
  rows: DestinyCalibrationSourceRow[]
): DestinyCalibrationReport {
  const predictions: DestinyCalibrationPredictionRecord[] = []
  const outcomes: DestinyCalibrationOutcomeRecord[] = []

  for (const row of rows) {
    if (isDestinyPredictionSnapshotMetadata(row.metadata)) {
      predictions.push({
        rowId: asNullableString(row.id),
        userId: asNullableString(row.userId),
        createdAt: toIsoString(row.createdAt),
        metadata: row.metadata,
      })
      continue
    }
    if (isDestinyOutcomeMetadata(row.metadata)) {
      outcomes.push({
        rowId: asNullableString(row.id),
        userId: asNullableString(row.userId),
        createdAt: toIsoString(row.createdAt),
        metadata: row.metadata,
      })
    }
  }

  const outcomesByPredictionId = new Map<string, DestinyCalibrationOutcomeRecord[]>()
  for (const outcome of outcomes) {
    const key = outcome.metadata.predictionId
    const list = outcomesByPredictionId.get(key) ?? []
    list.push(outcome)
    outcomesByPredictionId.set(key, list)
  }

  const aggregateMap = new Map<
    string,
    {
      bucket: DestinyCalibrationBucket
      predictions: DestinyCalibrationPredictionRecord[]
      outcomes: DestinyCalibrationOutcomeRecord[]
    }
  >()

  for (const prediction of predictions) {
    const bucket = buildDestinyCalibrationBucket(prediction.metadata)
    const key = bucketKey(bucket)
    const current = aggregateMap.get(key) ?? { bucket, predictions: [], outcomes: [] }
    current.predictions.push(prediction)
    const linkedOutcomes = outcomesByPredictionId.get(prediction.metadata.predictionId) ?? []
    current.outcomes.push(...linkedOutcomes)
    aggregateMap.set(key, current)
  }

  const matchedPredictionIds = new Set(predictions.map((prediction) => prediction.metadata.predictionId))
  const unmatchedOutcomeCount = outcomes.filter(
    (outcome) => !matchedPredictionIds.has(outcome.metadata.predictionId)
  ).length

  const aggregates = [...aggregateMap.values()]
    .map<DestinyCalibrationAggregate>(({ bucket, predictions: bucketPredictions, outcomes: bucketOutcomes }) => {
      const happenedCount = bucketOutcomes.filter((outcome) => outcome.metadata.happened === true).length
      const matchedCount = bucketOutcomes.filter((outcome) => outcome.metadata.matchedPrediction === true).length
      return {
        bucket,
        predictionCount: bucketPredictions.length,
        outcomeCount: bucketOutcomes.length,
        happenedCount,
        matchedCount,
        happenedRate: bucketOutcomes.length > 0 ? happenedCount / bucketOutcomes.length : 0,
        matchedRate: bucketOutcomes.length > 0 ? matchedCount / bucketOutcomes.length : 0,
        avgReadinessScore: average(bucketPredictions.map((prediction) => prediction.metadata.readinessScore)),
        avgTriggerScore: average(bucketPredictions.map((prediction) => prediction.metadata.triggerScore)),
        avgConvergenceScore: average(bucketPredictions.map((prediction) => prediction.metadata.convergenceScore)),
        avgTimingReliabilityScore: average(
          bucketPredictions.map((prediction) => prediction.metadata.timingReliabilityScore)
        ),
      }
    })
    .sort((left, right) => {
      if (right.predictionCount !== left.predictionCount) {
        return right.predictionCount - left.predictionCount
      }
      if (right.matchedRate !== left.matchedRate) {
        return right.matchedRate - left.matchedRate
      }
      return bucketKey(left.bucket).localeCompare(bucketKey(right.bucket))
    })

  return {
    predictions,
    outcomes,
    unmatchedOutcomeCount,
    aggregates,
  }
}
