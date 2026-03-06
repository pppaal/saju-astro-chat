export type SLODefinition = {
  key: 'api_availability' | 'p95_latency_ms' | 'error_rate'
  target: number
  windowDays: 7 | 30
  comparator: '>=' | '<='
  description: string
}

export type ServiceSnapshot = {
  totalRequests: number
  failedRequests: number
  p95LatencyMs: number
}

export type SLOStatus = {
  key: SLODefinition['key']
  passed: boolean
  value: number
  target: number
  comparator: SLODefinition['comparator']
}

export const SLO_DEFINITIONS: SLODefinition[] = [
  {
    key: 'api_availability',
    target: 99.5,
    windowDays: 30,
    comparator: '>=',
    description: 'API success rate over rolling 30 days',
  },
  {
    key: 'p95_latency_ms',
    target: 700,
    windowDays: 7,
    comparator: '<=',
    description: 'P95 latency target for user-facing endpoints',
  },
  {
    key: 'error_rate',
    target: 1.0,
    windowDays: 7,
    comparator: '<=',
    description: 'Error rate across all API requests',
  },
]

export function evaluateSLO(snapshot: ServiceSnapshot): SLOStatus[] {
  const availability = snapshot.totalRequests === 0
    ? 100
    : ((snapshot.totalRequests - snapshot.failedRequests) / snapshot.totalRequests) * 100
  const errorRate = snapshot.totalRequests === 0
    ? 0
    : (snapshot.failedRequests / snapshot.totalRequests) * 100

  const values: Record<SLODefinition['key'], number> = {
    api_availability: Number(availability.toFixed(3)),
    p95_latency_ms: Number(snapshot.p95LatencyMs.toFixed(3)),
    error_rate: Number(errorRate.toFixed(3)),
  }

  return SLO_DEFINITIONS.map((slo) => {
    const value = values[slo.key]
    const passed = slo.comparator === '>=' ? value >= slo.target : value <= slo.target
    return {
      key: slo.key,
      passed,
      value,
      target: slo.target,
      comparator: slo.comparator,
    }
  })
}
