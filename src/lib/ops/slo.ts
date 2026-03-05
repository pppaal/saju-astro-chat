export type SLOMetricStatus = 'pass' | 'warning' | 'fail' | 'no_data'
export type SLOOverallStatus = 'healthy' | 'degraded' | 'critical' | 'unknown'

export interface SLOThresholds {
  availabilityPercent: number
  p95LatencyMs: number
  errorRatePercent: number
}

export interface SLOInput {
  availabilityPercent?: number | null
  p95LatencyMs?: number | null
  errorRatePercent?: number | null
}

export interface SLOMetricResult {
  key: 'availability' | 'p95_latency' | 'error_rate'
  current: number | null
  threshold: number
  unit: '%' | 'ms'
  status: SLOMetricStatus
  message: string
}

export interface SLOReport {
  generatedAt: string
  periodLabel: string
  overallStatus: SLOOverallStatus
  summary: {
    total: number
    pass: number
    warning: number
    fail: number
    noData: number
  }
  thresholds: SLOThresholds
  metrics: SLOMetricResult[]
}

export const DEFAULT_SLO_THRESHOLDS: SLOThresholds = {
  availabilityPercent: 99.5,
  p95LatencyMs: 700,
  errorRatePercent: 0.5,
}

function toNumber(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null
  }
  return value
}

function evaluateAvailability(current: number | null, threshold: number): SLOMetricResult {
  if (current === null) {
    return {
      key: 'availability',
      current: null,
      threshold,
      unit: '%',
      status: 'no_data',
      message: 'Availability data is missing.',
    }
  }

  if (current >= threshold) {
    return {
      key: 'availability',
      current: Number(current.toFixed(3)),
      threshold,
      unit: '%',
      status: 'pass',
      message: `Availability ${current.toFixed(3)}% is within target.`,
    }
  }

  if (current >= threshold - 0.2) {
    return {
      key: 'availability',
      current: Number(current.toFixed(3)),
      threshold,
      unit: '%',
      status: 'warning',
      message: `Availability ${current.toFixed(3)}% is near breach.`,
    }
  }

  return {
    key: 'availability',
    current: Number(current.toFixed(3)),
    threshold,
    unit: '%',
    status: 'fail',
    message: `Availability ${current.toFixed(3)}% is below target.`,
  }
}

function evaluateMaxMetric(
  key: 'p95_latency' | 'error_rate',
  current: number | null,
  threshold: number,
  unit: '%' | 'ms'
): SLOMetricResult {
  if (current === null) {
    return {
      key,
      current: null,
      threshold,
      unit,
      status: 'no_data',
      message: `${key} data is missing.`,
    }
  }

  if (current <= threshold) {
    return {
      key,
      current: Number(current.toFixed(3)),
      threshold,
      unit,
      status: 'pass',
      message: `${key} ${current.toFixed(3)}${unit} is within target.`,
    }
  }

  if (current <= threshold * 1.2) {
    return {
      key,
      current: Number(current.toFixed(3)),
      threshold,
      unit,
      status: 'warning',
      message: `${key} ${current.toFixed(3)}${unit} is near breach.`,
    }
  }

  return {
    key,
    current: Number(current.toFixed(3)),
    threshold,
    unit,
    status: 'fail',
    message: `${key} ${current.toFixed(3)}${unit} exceeds target.`,
  }
}

export function evaluateSLO(
  input: SLOInput,
  thresholds: SLOThresholds = DEFAULT_SLO_THRESHOLDS
): SLOMetricResult[] {
  const availability = evaluateAvailability(
    toNumber(input.availabilityPercent),
    thresholds.availabilityPercent
  )
  const p95Latency = evaluateMaxMetric(
    'p95_latency',
    toNumber(input.p95LatencyMs),
    thresholds.p95LatencyMs,
    'ms'
  )
  const errorRate = evaluateMaxMetric(
    'error_rate',
    toNumber(input.errorRatePercent),
    thresholds.errorRatePercent,
    '%'
  )

  return [availability, p95Latency, errorRate]
}

export function getOverallStatus(metrics: SLOMetricResult[]): SLOOverallStatus {
  if (metrics.every((metric) => metric.status === 'no_data')) {
    return 'unknown'
  }
  if (metrics.some((metric) => metric.status === 'fail')) {
    return 'critical'
  }
  if (metrics.some((metric) => metric.status === 'warning')) {
    return 'degraded'
  }
  if (metrics.some((metric) => metric.status === 'pass')) {
    return 'healthy'
  }
  return 'unknown'
}

export function buildSLOReport(
  input: SLOInput,
  options?: {
    generatedAt?: string
    periodLabel?: string
    thresholds?: SLOThresholds
  }
): SLOReport {
  const thresholds = options?.thresholds ?? DEFAULT_SLO_THRESHOLDS
  const metrics = evaluateSLO(input, thresholds)
  const summary = {
    total: metrics.length,
    pass: metrics.filter((metric) => metric.status === 'pass').length,
    warning: metrics.filter((metric) => metric.status === 'warning').length,
    fail: metrics.filter((metric) => metric.status === 'fail').length,
    noData: metrics.filter((metric) => metric.status === 'no_data').length,
  }

  return {
    generatedAt: options?.generatedAt ?? new Date().toISOString(),
    periodLabel: options?.periodLabel ?? 'last-7d',
    overallStatus: getOverallStatus(metrics),
    summary,
    thresholds,
    metrics,
  }
}
