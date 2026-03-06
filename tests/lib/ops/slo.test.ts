import { describe, expect, it } from 'vitest'
import { evaluateSLO } from '@/lib/ops/slo'

describe('SLO evaluation', () => {
  it('passes all SLOs for healthy snapshot', () => {
    const status = evaluateSLO({
      totalRequests: 1000,
      failedRequests: 2,
      p95LatencyMs: 420,
    })
    expect(status.every((s) => s.passed)).toBe(true)
  })

  it('fails latency and error SLOs for degraded snapshot', () => {
    const status = evaluateSLO({
      totalRequests: 1000,
      failedRequests: 25,
      p95LatencyMs: 950,
    })
    const byKey = Object.fromEntries(status.map((s) => [s.key, s]))
    expect(byKey.error_rate.passed).toBe(false)
    expect(byKey.p95_latency_ms.passed).toBe(false)
  })
})
