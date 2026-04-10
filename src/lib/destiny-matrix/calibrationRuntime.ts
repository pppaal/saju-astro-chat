import type {
  TimingCalibrationSummary,
  DomainKey,
  MonthlyOverlapPoint,
} from '@/lib/destiny-matrix/types'
import type {
  DestinyLoggedService,
  DestinyPredictionType,
  DestinyTimingGranularity,
  DestinyTimingWindow,
} from '@/lib/destiny-matrix/core/logging'
import type {
  DestinyCalibrationAggregate,
  DestinyCalibrationReport,
} from '@/lib/destiny-matrix/calibration'

type RuntimeCalibrationContext = {
  service: DestinyLoggedService
  actionFocusDomain?: string | null
  timingWindow?: DestinyTimingWindow | null
  timingGranularity?: DestinyTimingGranularity | null
  predictionType?: DestinyPredictionType | null
  overlapTimeline?: MonthlyOverlapPoint[] | null
  overlapTimelineByDomain?: Partial<Record<DomainKey, MonthlyOverlapPoint[]>> | null
}

type JsonRecord = Record<string, unknown>

let cachedEnvPayload: string | null = null
let cachedReport: DestinyCalibrationReport | null = null

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(1, value))
}

function reliabilityBandForScore(score: number): 'low' | 'medium' | 'high' {
  if (score >= 0.72) return 'high'
  if (score >= 0.46) return 'medium'
  return 'low'
}

function asCalibrationReport(value: unknown): DestinyCalibrationReport | null {
  if (!value || typeof value !== 'object') return null
  const record = value as JsonRecord
  if (!Array.isArray(record.aggregates)) return null
  return value as DestinyCalibrationReport
}

function readCalibrationPayloadFromEnv(): string | null {
  const inlineJson = process.env.DESTINY_CALIBRATION_TABLE_JSON?.trim()
  if (inlineJson) return inlineJson

  const base64Json = process.env.DESTINY_CALIBRATION_TABLE_JSON_BASE64?.trim()
  if (!base64Json) return null

  try {
    return Buffer.from(base64Json, 'base64').toString('utf8')
  } catch {
    return null
  }
}

async function loadCalibrationReport(): Promise<DestinyCalibrationReport | null> {
  const payload = readCalibrationPayloadFromEnv()
  if (!payload) return null

  if (cachedEnvPayload === payload && cachedReport) {
    return cachedReport
  }

  try {
    const parsed = asCalibrationReport(JSON.parse(payload))
    cachedEnvPayload = payload
    cachedReport = parsed
    return parsed
  } catch {
    cachedEnvPayload = payload
    cachedReport = null
    return null
  }
}

function mapActionDomainToTimelineDomain(actionFocusDomain?: string | null): DomainKey | null {
  switch (actionFocusDomain) {
    case 'career':
      return 'career'
    case 'relationship':
      return 'love'
    case 'wealth':
      return 'money'
    case 'health':
      return 'health'
    case 'move':
      return 'move'
    default:
      return null
  }
}

function probeBucketFromDay(day?: number | null): 'early' | 'mid' | 'late' | 'unknown' {
  if (!day || !Number.isFinite(day)) return 'unknown'
  if (day <= 10) return 'early'
  if (day <= 20) return 'mid'
  return 'late'
}

function pickProbeBucket(context: RuntimeCalibrationContext): 'early' | 'mid' | 'late' | 'unknown' {
  const domainKey = mapActionDomainToTimelineDomain(context.actionFocusDomain)
  const domainPoints = domainKey ? context.overlapTimelineByDomain?.[domainKey] : undefined
  const points =
    (domainPoints && domainPoints.length > 0 ? domainPoints : context.overlapTimeline) || []
  const strongest = [...points].sort(
    (a, b) => (b.overlapStrength || 0) - (a.overlapStrength || 0)
  )[0]
  return probeBucketFromDay(strongest?.probeDay)
}

function scoreAggregate(
  aggregate: DestinyCalibrationAggregate,
  context: RuntimeCalibrationContext
): number {
  let score = 0
  if (aggregate.bucket.actionFocusDomain === (context.actionFocusDomain || 'unknown')) score += 5
  if (aggregate.bucket.timingWindow === (context.timingWindow || 'unknown')) score += 4
  if (aggregate.bucket.timingGranularity === (context.timingGranularity || 'unknown')) score += 3
  if (aggregate.bucket.predictionType === (context.predictionType || 'unknown')) score += 2
  if (aggregate.bucket.selectedProbeBucket === pickProbeBucket(context)) score += 2
  score += Math.min(aggregate.predictionCount, 10) / 10
  score += Math.min(aggregate.outcomeCount, 10) / 20
  return score
}

function chooseBestAggregate(
  report: DestinyCalibrationReport,
  context: RuntimeCalibrationContext
): DestinyCalibrationAggregate | null {
  const serviceAggregates = report.aggregates.filter(
    (aggregate) => aggregate.bucket.service === context.service
  )
  if (serviceAggregates.length === 0) return null
  const sorted = [...serviceAggregates].sort(
    (left, right) => scoreAggregate(right, context) - scoreAggregate(left, context)
  )
  return sorted[0] || null
}

export async function applyRuntimeCalibration(
  base: TimingCalibrationSummary | undefined,
  context: RuntimeCalibrationContext
): Promise<TimingCalibrationSummary | undefined> {
  if (!base) return base
  const report = await loadCalibrationReport()
  if (!report) return base

  const best = chooseBestAggregate(report, context)
  if (!best) return base
  if (best.predictionCount < 3 || best.outcomeCount < 2) return base

  const empirical = best.matchedRate > 0 ? best.matchedRate : best.happenedRate
  const adjustedScore = clamp01(base.reliabilityScore * 0.6 + empirical * 0.4)
  const adjustedConsistency = clamp01(base.backtestConsistency * 0.6 + empirical * 0.4)

  return {
    ...base,
    reliabilityScore: adjustedScore,
    reliabilityBand: reliabilityBandForScore(adjustedScore),
    backtestConsistency: adjustedConsistency,
    calibratedFromHistory: true,
    calibrationSampleSize: best.outcomeCount,
    calibrationMatchedRate: empirical,
    calibrationBucket: [
      best.bucket.service,
      best.bucket.actionFocusDomain,
      best.bucket.timingWindow,
      best.bucket.timingGranularity,
      best.bucket.selectedProbeBucket,
      best.bucket.predictionType,
    ].join('|'),
  }
}
