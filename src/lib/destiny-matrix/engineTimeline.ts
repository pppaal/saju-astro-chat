import type {
  DomainKey,
  DomainScore,
  MatrixCalculationInput,
  MatrixCell,
  MatrixSummary,
  MonthlyOverlapPoint,
  TimingCalibrationSummary,
} from './types'

import { applyTimelineToDomainScores } from './domainScoring'
import {
  buildHistoricalMonthlyInputs,
  buildProjectedMonthlyInputs,
  buildTimelineByDomainFromMonthlyScores,
  generateMonthlyOverlapTimeline,
  generateTimelineByDomain,
  summarizeTimingCalibration,
} from './monthlyTimeline'

type TimelineSummarySnapshot = Pick<
  MatrixSummary,
  'overlapStrength' | 'timeOverlapWeight' | 'domainScores'
>

interface RecomputedPoint {
  month: string
  summary: TimelineSummarySnapshot
}

interface BuildTimelineArtifactsParams {
  input: MatrixCalculationInput
  layer4: Record<string, MatrixCell>
  layer7: Record<string, MatrixCell>
  baseOverlapStrength: number
  initialDomainScores: Record<DomainKey, DomainScore>
  skipTimelineRecompute?: boolean
  recalculateSummary: (input: MatrixCalculationInput) => TimelineSummarySnapshot
}

interface TimelineArtifacts {
  overlapTimeline: MonthlyOverlapPoint[]
  overlapTimelinePast: MonthlyOverlapPoint[]
  overlapTimelineByDomain: Record<DomainKey, MonthlyOverlapPoint[]>
  overlapTimelineByDomainPast?: Record<DomainKey, MonthlyOverlapPoint[]>
  domainScores: Record<DomainKey, DomainScore>
  timingCalibration: TimingCalibrationSummary
}

function toMonthlyOverlapPoint(
  month: string,
  summary: TimelineSummarySnapshot
): MonthlyOverlapPoint {
  const overlapStrength = Math.round((summary.overlapStrength || 0) * 1000) / 1000
  const peakLevel: MonthlyOverlapPoint['peakLevel'] =
    (summary.overlapStrength || 0) >= 0.75
      ? 'peak'
      : (summary.overlapStrength || 0) >= 0.6
        ? 'high'
        : 'normal'

  return {
    month,
    overlapStrength,
    timeOverlapWeight: Math.round((summary.timeOverlapWeight || 1) * 1000) / 1000,
    peakLevel,
  }
}

function toMonthlyDomainScorePoint(
  month: string,
  summary: TimelineSummarySnapshot
): { month: string; domainScores: Record<DomainKey, DomainScore> } | null {
  if (!summary.domainScores) {
    return null
  }

  return {
    month,
    domainScores: summary.domainScores,
  }
}

function recomputeMonthlySummaries(
  points: Array<{ month: string; input: MatrixCalculationInput }>,
  recalculateSummary: (input: MatrixCalculationInput) => TimelineSummarySnapshot
): RecomputedPoint[] {
  return points.map((point) => ({
    month: point.month,
    summary: recalculateSummary(point.input),
  }))
}

export function buildTimelineArtifacts({
  input,
  layer4,
  layer7,
  baseOverlapStrength,
  initialDomainScores,
  skipTimelineRecompute,
  recalculateSummary,
}: BuildTimelineArtifactsParams): TimelineArtifacts {
  const projectedMonths = skipTimelineRecompute
    ? []
    : buildProjectedMonthlyInputs(input, input.startYearMonth)
  const historicalMonths = skipTimelineRecompute
    ? []
    : buildHistoricalMonthlyInputs(input, input.startYearMonth)
  const monthlyRecomputed = recomputeMonthlySummaries(projectedMonths, recalculateSummary)
  const historicalRecomputed = recomputeMonthlySummaries(historicalMonths, recalculateSummary)

  const overlapTimeline =
    monthlyRecomputed.length > 0
      ? monthlyRecomputed.map(({ month, summary }) => toMonthlyOverlapPoint(month, summary))
      : generateMonthlyOverlapTimeline({
          input,
          layer4,
          layer7,
          startYearMonth: input.startYearMonth,
          baseOverlapStrength,
        })
  const overlapTimelinePast =
    historicalRecomputed.length > 0
      ? historicalRecomputed.map(({ month, summary }) => toMonthlyOverlapPoint(month, summary))
      : []
  const monthlyDomainScores = monthlyRecomputed
    .map(({ month, summary }) => toMonthlyDomainScorePoint(month, summary))
    .filter(
      (point): point is { month: string; domainScores: Record<DomainKey, DomainScore> } =>
        point !== null
    )
  const overlapTimelineByDomain =
    monthlyDomainScores.length > 0
      ? buildTimelineByDomainFromMonthlyScores(monthlyDomainScores)
      : generateTimelineByDomain(overlapTimeline, initialDomainScores)
  const historicalDomainScores = historicalRecomputed
    .map(({ month, summary }) => toMonthlyDomainScorePoint(month, summary))
    .filter(
      (point): point is { month: string; domainScores: Record<DomainKey, DomainScore> } =>
        point !== null
    )
  const overlapTimelineByDomainPast =
    historicalDomainScores.length > 0
      ? buildTimelineByDomainFromMonthlyScores(historicalDomainScores)
      : undefined

  return {
    overlapTimeline,
    overlapTimelinePast,
    overlapTimelineByDomain,
    overlapTimelineByDomainPast,
    domainScores: applyTimelineToDomainScores(initialDomainScores, overlapTimelineByDomain),
    timingCalibration: summarizeTimingCalibration({
      input,
      layer4,
      layer7,
      futureTimeline: overlapTimeline,
      pastTimeline: overlapTimelinePast,
    }),
  }
}
