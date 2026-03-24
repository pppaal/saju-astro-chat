import { describe, expect, it } from 'vitest'

import {
  aggregateDestinyCalibration,
  buildDestinyCalibrationBucket,
  isDestinyOutcomeMetadata,
  isDestinyPredictionSnapshotMetadata,
} from '@/lib/destiny-matrix/calibration'
import {
  buildDestinyOutcomeMetadata,
  buildDestinyPredictionSnapshotMetadata,
} from '@/lib/destiny-matrix/core/logging'

describe('destiny calibration', () => {
  it('recognizes prediction and outcome metadata', () => {
    const prediction = buildDestinyPredictionSnapshotMetadata({
      predictionId: 'pred-1',
      service: 'calendar',
      lang: 'ko',
      actionFocusDomain: 'career',
      timingWindow: '1-3m',
      timingGranularity: 'month',
      timingReliabilityBand: 'high',
      predictionType: 'opportunity',
    })
    const outcome = buildDestinyOutcomeMetadata({
      predictionId: 'pred-1',
      service: 'calendar',
      lang: 'ko',
      happened: true,
      matchedPrediction: true,
    })

    expect(isDestinyPredictionSnapshotMetadata(prediction)).toBe(true)
    expect(isDestinyOutcomeMetadata(outcome)).toBe(true)
    expect(buildDestinyCalibrationBucket(prediction)).toEqual({
      service: 'calendar',
      actionFocusDomain: 'career',
      timingWindow: '1-3m',
      timingGranularity: 'month',
      selectedProbeBucket: 'unknown',
      reliabilityBand: 'high',
      predictionType: 'opportunity',
    })
  })

  it('aggregates linked predictions and outcomes into calibration buckets', () => {
    const predictionA = buildDestinyPredictionSnapshotMetadata({
      predictionId: 'pred-a',
      service: 'calendar',
      lang: 'ko',
      actionFocusDomain: 'career',
      timingWindow: '1-3m',
      timingGranularity: 'month',
      selectedProbeBucket: 'mid',
      timingReliabilityBand: 'high',
      predictionType: 'opportunity',
      readinessScore: 0.8,
      triggerScore: 0.6,
      convergenceScore: 0.7,
      timingReliabilityScore: 0.9,
    })
    const predictionB = buildDestinyPredictionSnapshotMetadata({
      predictionId: 'pred-b',
      service: 'calendar',
      lang: 'ko',
      actionFocusDomain: 'career',
      timingWindow: '1-3m',
      timingGranularity: 'month',
      selectedProbeBucket: 'mid',
      timingReliabilityBand: 'high',
      predictionType: 'opportunity',
      readinessScore: 0.4,
      triggerScore: 0.5,
      convergenceScore: 0.45,
      timingReliabilityScore: 0.5,
    })
    const predictionC = buildDestinyPredictionSnapshotMetadata({
      predictionId: 'pred-c',
      service: 'report',
      lang: 'en',
      actionFocusDomain: 'relationship',
      timingWindow: 'now',
      timingGranularity: 'week',
      selectedProbeBucket: 'early',
      timingReliabilityBand: 'medium',
      predictionType: 'review',
      readinessScore: 0.3,
      triggerScore: 0.8,
      convergenceScore: 0.55,
      timingReliabilityScore: 0.6,
    })

    const outcomeA = buildDestinyOutcomeMetadata({
      predictionId: 'pred-a',
      service: 'calendar',
      lang: 'ko',
      happened: true,
      matchedPrediction: true,
      actualWindowBucket: 'mid',
    })
    const outcomeB = buildDestinyOutcomeMetadata({
      predictionId: 'pred-b',
      service: 'calendar',
      lang: 'ko',
      happened: false,
      matchedPrediction: false,
      actualWindowBucket: 'outside',
    })
    const unmatched = buildDestinyOutcomeMetadata({
      predictionId: 'pred-z',
      service: 'calendar',
      lang: 'ko',
      happened: true,
      matchedPrediction: false,
    })

    const report = aggregateDestinyCalibration([
      { id: '1', userId: 'u1', createdAt: new Date('2026-03-01T00:00:00Z'), metadata: predictionA },
      { id: '2', userId: 'u1', createdAt: new Date('2026-03-03T00:00:00Z'), metadata: outcomeA },
      { id: '3', userId: 'u2', createdAt: new Date('2026-03-02T00:00:00Z'), metadata: predictionB },
      { id: '4', userId: 'u2', createdAt: new Date('2026-03-06T00:00:00Z'), metadata: outcomeB },
      { id: '5', userId: 'u3', createdAt: new Date('2026-03-07T00:00:00Z'), metadata: predictionC },
      { id: '6', userId: 'u9', createdAt: new Date('2026-03-08T00:00:00Z'), metadata: unmatched },
      { id: '7', userId: 'u9', createdAt: new Date('2026-03-08T00:00:00Z'), metadata: { foo: 'bar' } },
    ])

    expect(report.predictions).toHaveLength(3)
    expect(report.outcomes).toHaveLength(3)
    expect(report.unmatchedOutcomeCount).toBe(1)
    expect(report.aggregates).toHaveLength(2)

    const calendarBucket = report.aggregates.find(
      (aggregate) =>
        aggregate.bucket.service === 'calendar' && aggregate.bucket.actionFocusDomain === 'career'
    )
    expect(calendarBucket).toBeDefined()
    expect(calendarBucket).toMatchObject({
      predictionCount: 2,
      outcomeCount: 2,
      happenedCount: 1,
      matchedCount: 1,
      happenedRate: 0.5,
      matchedRate: 0.5,
    })
    expect(calendarBucket?.avgReadinessScore).toBeCloseTo(0.6, 5)
    expect(calendarBucket?.avgTriggerScore).toBeCloseTo(0.55, 5)
    expect(calendarBucket?.avgConvergenceScore).toBeCloseTo(0.575, 5)
    expect(calendarBucket?.avgTimingReliabilityScore).toBeCloseTo(0.7, 5)

    const reportBucket = report.aggregates.find(
      (aggregate) =>
        aggregate.bucket.service === 'report' &&
        aggregate.bucket.actionFocusDomain === 'relationship'
    )
    expect(reportBucket).toMatchObject({
      predictionCount: 1,
      outcomeCount: 0,
      happenedRate: 0,
      matchedRate: 0,
    })
  })
})
