/**
 * Comprehensive tests for metrics collection system
 * Covers: counters, timings, gauges, Prometheus format, OTLP format, percentile calculations
 */

import {
  recordCounter,
  recordTiming,
  recordGauge,
  getMetricsSnapshot,
  resetMetrics,
  toPrometheus,
  toOtlp,
} from '@/lib/metrics'

describe('Metrics - Counters', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('Basic Counter Operations', () => {
    it('should record counter with default increment', () => {
      recordCounter('api.requests')
      const snapshot = getMetricsSnapshot()

      expect(snapshot.counters).toHaveLength(1)
      expect(snapshot.counters[0].name).toBe('api.requests')
      expect(snapshot.counters[0].value).toBe(1)
    })

    it('should record counter with custom value', () => {
      recordCounter('api.bytes_sent', 1024)
      const snapshot = getMetricsSnapshot()

      expect(snapshot.counters[0].value).toBe(1024)
    })

    it('should increment existing counter', () => {
      recordCounter('api.requests', 1)
      recordCounter('api.requests', 1)
      recordCounter('api.requests', 1)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].value).toBe(3)
    })

    it('should support negative increments', () => {
      recordCounter('credits.balance', 100)
      recordCounter('credits.balance', -30)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].value).toBe(70)
    })

    it('should support zero increment', () => {
      recordCounter('test.counter', 0)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].value).toBe(0)
    })

    it('should support large values', () => {
      recordCounter('large.counter', 1000000000)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].value).toBe(1000000000)
    })

    it('should support decimal values', () => {
      recordCounter('decimal.counter', 3.14159)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].value).toBeCloseTo(3.14159)
    })
  })

  describe('Counter Labels', () => {
    it('should record counter with single label', () => {
      recordCounter('api.requests', 1, { method: 'GET' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].labels).toEqual({ method: 'GET' })
    })

    it('should record counter with multiple labels', () => {
      recordCounter('api.requests', 1, { method: 'POST', status: 200, endpoint: '/api/test' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].labels).toEqual({
        method: 'POST',
        status: 200,
        endpoint: '/api/test',
      })
    })

    it('should separate counters by labels', () => {
      recordCounter('api.requests', 5, { method: 'GET' })
      recordCounter('api.requests', 3, { method: 'POST' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters).toHaveLength(2)
      expect(snapshot.counters.find((c) => c.labels?.method === 'GET')?.value).toBe(5)
      expect(snapshot.counters.find((c) => c.labels?.method === 'POST')?.value).toBe(3)
    })

    it('should accumulate counters with same labels', () => {
      recordCounter('api.requests', 1, { method: 'GET' })
      recordCounter('api.requests', 1, { method: 'GET' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters).toHaveLength(1)
      expect(snapshot.counters[0].value).toBe(2)
    })

    it('should support boolean labels', () => {
      recordCounter('api.requests', 1, { cached: true })
      recordCounter('api.requests', 2, { cached: false })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters).toHaveLength(2)
    })

    it('should support numeric labels', () => {
      recordCounter('http.status', 1, { code: 200 })
      recordCounter('http.status', 1, { code: 404 })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters).toHaveLength(2)
    })

    it('should handle empty labels', () => {
      recordCounter('test.counter', 1, {})

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].labels).toEqual({})
    })

    it('should handle special characters in label values', () => {
      recordCounter('test.counter', 1, { path: '/api/test?foo=bar&baz=qux' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].labels?.path).toBe('/api/test?foo=bar&baz=qux')
    })
  })

  describe('Multiple Counters', () => {
    it('should track multiple independent counters', () => {
      recordCounter('api.requests', 10)
      recordCounter('db.queries', 5)
      recordCounter('cache.hits', 8)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters).toHaveLength(3)
      expect(snapshot.counters.find((c) => c.name === 'api.requests')?.value).toBe(10)
      expect(snapshot.counters.find((c) => c.name === 'db.queries')?.value).toBe(5)
      expect(snapshot.counters.find((c) => c.name === 'cache.hits')?.value).toBe(8)
    })

    it('should handle rapid concurrent counter updates', () => {
      for (let i = 0; i < 1000; i++) {
        recordCounter('rapid.counter', 1)
      }

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters[0].value).toBe(1000)
    })

    it('should handle many unique label combinations', () => {
      for (let i = 0; i < 100; i++) {
        recordCounter('test.counter', 1, { index: i })
      }

      const snapshot = getMetricsSnapshot()
      expect(snapshot.counters).toHaveLength(100)
    })
  })
})

describe('Metrics - Timings', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('Basic Timing Operations', () => {
    it('should record single timing', () => {
      recordTiming('api.duration', 150)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings).toHaveLength(1)
      expect(snapshot.timings[0].name).toBe('api.duration')
      expect(snapshot.timings[0].count).toBe(1)
      expect(snapshot.timings[0].sum).toBe(150)
      expect(snapshot.timings[0].max).toBe(150)
      expect(snapshot.timings[0].avg).toBe(150)
    })

    it('should accumulate multiple timings', () => {
      recordTiming('api.duration', 100)
      recordTiming('api.duration', 200)
      recordTiming('api.duration', 300)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].count).toBe(3)
      expect(snapshot.timings[0].sum).toBe(600)
      expect(snapshot.timings[0].max).toBe(300)
      expect(snapshot.timings[0].avg).toBe(200)
    })

    it('should track maximum timing', () => {
      recordTiming('api.duration', 50)
      recordTiming('api.duration', 500)
      recordTiming('api.duration', 100)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].max).toBe(500)
    })

    it('should calculate average correctly', () => {
      recordTiming('test.timer', 10)
      recordTiming('test.timer', 20)
      recordTiming('test.timer', 30)
      recordTiming('test.timer', 40)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].avg).toBe(25)
    })

    it('should support zero timing', () => {
      recordTiming('test.timer', 0)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].sum).toBe(0)
      expect(snapshot.timings[0].avg).toBe(0)
    })

    it('should support decimal timings', () => {
      recordTiming('test.timer', 123.456)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].sum).toBeCloseTo(123.456)
    })

    it('should support very large timings', () => {
      recordTiming('slow.operation', 1000000)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].max).toBe(1000000)
    })
  })

  describe('Timing Labels', () => {
    it('should record timing with labels', () => {
      recordTiming('api.duration', 150, { endpoint: '/api/test' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].labels).toEqual({ endpoint: '/api/test' })
    })

    it('should separate timings by labels', () => {
      recordTiming('api.duration', 100, { method: 'GET' })
      recordTiming('api.duration', 200, { method: 'POST' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings).toHaveLength(2)
    })

    it('should accumulate timings with same labels', () => {
      recordTiming('api.duration', 100, { endpoint: '/test' })
      recordTiming('api.duration', 200, { endpoint: '/test' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings).toHaveLength(1)
      expect(snapshot.timings[0].count).toBe(2)
      expect(snapshot.timings[0].avg).toBe(150)
    })
  })

  describe('Percentile Calculations', () => {
    it('should calculate p50 correctly', () => {
      const values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
      values.forEach((v) => recordTiming('test.timer', v))

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p50).toBe(50)
    })

    it('should calculate p95 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      values.forEach((v) => recordTiming('test.timer', v))

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p95).toBe(95)
    })

    it('should calculate p99 correctly', () => {
      const values = Array.from({ length: 100 }, (_, i) => i + 1)
      values.forEach((v) => recordTiming('test.timer', v))

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p99).toBe(99)
    })

    it('should handle single sample percentiles', () => {
      recordTiming('test.timer', 100)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p50).toBe(100)
      expect(snapshot.timings[0].p95).toBe(100)
      expect(snapshot.timings[0].p99).toBe(100)
    })

    it('should handle empty samples', () => {
      // This shouldn't happen in practice, but test edge case
      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings).toHaveLength(0)
    })

    it('should handle percentiles with duplicate values', () => {
      for (let i = 0; i < 10; i++) {
        recordTiming('test.timer', 50)
      }

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p50).toBe(50)
      expect(snapshot.timings[0].p95).toBe(50)
      expect(snapshot.timings[0].p99).toBe(50)
    })

    it('should maintain sample buffer limit', () => {
      // Record more than MAX_SAMPLES (1000)
      for (let i = 0; i < 1500; i++) {
        recordTiming('test.timer', i)
      }

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].count).toBe(1500)
      // Percentiles should still be calculated from available samples
      expect(snapshot.timings[0].p50).toBeGreaterThan(0)
    })

    it('should calculate percentiles with skewed distribution', () => {
      // Most fast, few slow
      for (let i = 0; i < 95; i++) {
        recordTiming('test.timer', 10)
      }
      for (let i = 0; i < 5; i++) {
        recordTiming('test.timer', 1000)
      }

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p50).toBe(10)
      // With 100 samples, p95 index = ceil(95/100 * 100) - 1 = 94
      // sorted[94] = 10 (indices 0-94 are all 10)
      // p99 index = ceil(99/100 * 100) - 1 = 98, sorted[98] = 1000
      expect(snapshot.timings[0].p95).toBe(10)
      expect(snapshot.timings[0].p99).toBe(1000)
    })

    it('should handle decimal percentile results', () => {
      recordTiming('test.timer', 10.5)
      recordTiming('test.timer', 20.7)
      recordTiming('test.timer', 30.3)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].p50).toBeGreaterThan(10)
      expect(snapshot.timings[0].p50).toBeLessThan(30.3)
    })
  })

  describe('Timing Edge Cases', () => {
    it('should handle negative timings', () => {
      recordTiming('test.timer', -10)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].sum).toBe(-10)
    })

    it('should handle mixed positive and negative timings', () => {
      recordTiming('test.timer', 100)
      recordTiming('test.timer', -50)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].sum).toBe(50)
      expect(snapshot.timings[0].avg).toBe(25)
    })

    it('should handle very small timings', () => {
      recordTiming('test.timer', 0.001)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.timings[0].sum).toBeCloseTo(0.001)
    })
  })
})

describe('Metrics - Gauges', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('Basic Gauge Operations', () => {
    it('should record gauge value', () => {
      recordGauge('memory.usage', 1024)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges).toHaveLength(1)
      expect(snapshot.gauges[0].name).toBe('memory.usage')
      expect(snapshot.gauges[0].value).toBe(1024)
    })

    it('should overwrite gauge value', () => {
      recordGauge('memory.usage', 1024)
      recordGauge('memory.usage', 2048)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges).toHaveLength(1)
      expect(snapshot.gauges[0].value).toBe(2048)
    })

    it('should support zero gauge', () => {
      recordGauge('queue.size', 0)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges[0].value).toBe(0)
    })

    it('should support negative gauge', () => {
      recordGauge('temperature', -10)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges[0].value).toBe(-10)
    })

    it('should support decimal gauge', () => {
      recordGauge('cpu.percent', 45.67)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges[0].value).toBeCloseTo(45.67)
    })

    it('should support very large gauge values', () => {
      recordGauge('disk.bytes', 10000000000)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges[0].value).toBe(10000000000)
    })
  })

  describe('Gauge Labels', () => {
    it('should record gauge with labels', () => {
      recordGauge('memory.usage', 1024, { process: 'worker' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges[0].labels).toEqual({ process: 'worker' })
    })

    it('should separate gauges by labels', () => {
      recordGauge('memory.usage', 1024, { process: 'worker1' })
      recordGauge('memory.usage', 2048, { process: 'worker2' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges).toHaveLength(2)
    })

    it('should overwrite gauge with same labels', () => {
      recordGauge('memory.usage', 1024, { process: 'worker' })
      recordGauge('memory.usage', 2048, { process: 'worker' })

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges).toHaveLength(1)
      expect(snapshot.gauges[0].value).toBe(2048)
    })
  })

  describe('Multiple Gauges', () => {
    it('should track multiple independent gauges', () => {
      recordGauge('memory.usage', 1024)
      recordGauge('cpu.percent', 45)
      recordGauge('disk.free', 5000)

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges).toHaveLength(3)
    })

    it('should handle rapid gauge updates', () => {
      for (let i = 0; i < 100; i++) {
        recordGauge('fluctuating.value', i)
      }

      const snapshot = getMetricsSnapshot()
      expect(snapshot.gauges).toHaveLength(1)
      expect(snapshot.gauges[0].value).toBe(99)
    })
  })
})

describe('Metrics - Snapshot', () => {
  beforeEach(() => {
    resetMetrics()
  })

  it('should return empty snapshot initially', () => {
    const snapshot = getMetricsSnapshot()

    expect(snapshot.counters).toHaveLength(0)
    expect(snapshot.timings).toHaveLength(0)
    expect(snapshot.gauges).toHaveLength(0)
  })

  it('should return snapshot with all metric types', () => {
    recordCounter('test.counter', 5)
    recordTiming('test.timer', 100)
    recordGauge('test.gauge', 50)

    const snapshot = getMetricsSnapshot()

    expect(snapshot.counters).toHaveLength(1)
    expect(snapshot.timings).toHaveLength(1)
    expect(snapshot.gauges).toHaveLength(1)
  })

  it('should not mutate internal state', () => {
    recordCounter('test.counter', 5)

    const snapshot1 = getMetricsSnapshot()
    const snapshot2 = getMetricsSnapshot()

    expect(snapshot1).not.toBe(snapshot2)
    expect(snapshot1.counters).toEqual(snapshot2.counters)
  })

  it('should include all timing statistics', () => {
    recordTiming('test.timer', 10)
    recordTiming('test.timer', 20)
    recordTiming('test.timer', 30)

    const snapshot = getMetricsSnapshot()
    const timing = snapshot.timings[0]

    expect(timing).toHaveProperty('count')
    expect(timing).toHaveProperty('sum')
    expect(timing).toHaveProperty('max')
    expect(timing).toHaveProperty('avg')
    expect(timing).toHaveProperty('p50')
    expect(timing).toHaveProperty('p95')
    expect(timing).toHaveProperty('p99')
  })
})

describe('Metrics - Reset', () => {
  it('should clear all metrics', () => {
    recordCounter('test.counter', 5)
    recordTiming('test.timer', 100)
    recordGauge('test.gauge', 50)

    resetMetrics()

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters).toHaveLength(0)
    expect(snapshot.timings).toHaveLength(0)
    expect(snapshot.gauges).toHaveLength(0)
  })

  it('should allow recording after reset', () => {
    recordCounter('test.counter', 5)
    resetMetrics()
    recordCounter('test.counter', 3)

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters[0].value).toBe(3)
  })

  it('should reset multiple times', () => {
    recordCounter('test.counter', 1)
    resetMetrics()
    recordCounter('test.counter', 2)
    resetMetrics()
    recordCounter('test.counter', 3)

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters[0].value).toBe(3)
  })
})

describe('Metrics - Prometheus Format', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('Counter Export', () => {
    it('should export counter in Prometheus format', () => {
      recordCounter('api_requests_total', 10)

      const output = toPrometheus()

      expect(output).toContain('# TYPE api_requests_total counter')
      expect(output).toContain('api_requests_total 10')
    })

    it('should export counter with labels', () => {
      recordCounter('http_requests', 5, { method: 'GET', status: 200 })

      const output = toPrometheus()

      expect(output).toContain('# TYPE http_requests counter')
      expect(output).toContain('http_requests{method="GET",status="200"} 5')
    })

    it('should sort labels alphabetically', () => {
      recordCounter('test', 1, { z: 'last', a: 'first', m: 'middle' })

      const output = toPrometheus()

      expect(output).toContain('{a="first",m="middle",z="last"}')
    })

    it('should handle multiple counters', () => {
      recordCounter('counter1', 10)
      recordCounter('counter2', 20)

      const output = toPrometheus()

      expect(output).toContain('counter1 10')
      expect(output).toContain('counter2 20')
    })
  })

  describe('Gauge Export', () => {
    it('should export gauge in Prometheus format', () => {
      recordGauge('memory_usage_bytes', 1024)

      const output = toPrometheus()

      expect(output).toContain('# TYPE memory_usage_bytes gauge')
      expect(output).toContain('memory_usage_bytes 1024')
    })

    it('should export gauge with labels', () => {
      recordGauge('cpu_percent', 45, { core: 0 })

      const output = toPrometheus()

      expect(output).toContain('{core="0"}')
    })
  })

  describe('Timing Export', () => {
    it('should export timing as summary in Prometheus format', () => {
      recordTiming('api_duration', 100)
      recordTiming('api_duration', 200)

      const output = toPrometheus()

      expect(output).toContain('# TYPE api_duration_seconds summary')
      expect(output).toContain('api_duration_seconds_count 2')
      expect(output).toContain('api_duration_seconds_sum')
      expect(output).toContain('api_duration_seconds_avg')
      expect(output).toContain('api_duration_seconds_max')
      expect(output).toContain('quantile="0.5"')
      expect(output).toContain('quantile="0.95"')
      expect(output).toContain('quantile="0.99"')
    })

    it('should convert milliseconds to seconds', () => {
      recordTiming('test_timer', 1000)

      const output = toPrometheus()

      // 1000ms = 1 second
      expect(output).toContain('_seconds_sum 1.000000')
    })

    it('should export timing with labels', () => {
      recordTiming('api_duration', 150, { endpoint: '/test' })

      const output = toPrometheus()

      expect(output).toContain('endpoint="/test"')
    })
  })

  describe('Combined Export', () => {
    it('should export all metric types', () => {
      recordCounter('requests', 10)
      recordTiming('duration', 100)
      recordGauge('memory', 1024)

      const output = toPrometheus()

      expect(output).toContain('# TYPE requests counter')
      expect(output).toContain('# TYPE duration_seconds summary')
      expect(output).toContain('# TYPE memory gauge')
    })

    it('should produce valid Prometheus text format', () => {
      recordCounter('test_counter', 5, { label: 'value' })
      recordGauge('test_gauge', 10)

      const output = toPrometheus()

      // Should have TYPE declarations and values
      expect(output.split('\n').length).toBeGreaterThan(2)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty metrics', () => {
      const output = toPrometheus()

      expect(output).toBe('')
    })

    it('should handle special characters in label values', () => {
      recordCounter('test', 1, { path: '/api/test?foo=bar' })

      const output = toPrometheus()

      // Should escape quotes
      expect(output).toContain('path="/api/test?foo=bar"')
    })

    it('should handle boolean label values', () => {
      recordCounter('test', 1, { cached: true })

      const output = toPrometheus()

      expect(output).toContain('cached="true"')
    })

    it('should handle numeric label values', () => {
      recordCounter('test', 1, { code: 200 })

      const output = toPrometheus()

      expect(output).toContain('code="200"')
    })
  })
})

describe('Metrics - OTLP Format', () => {
  beforeEach(() => {
    resetMetrics()
  })

  describe('Counter Export', () => {
    it('should export counter in OTLP format', () => {
      recordCounter('api_requests', 10)

      const output = toOtlp()

      expect(output.resourceMetrics).toHaveLength(1)
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics
      const counter = metrics.find((m) => m.name === 'api_requests')

      expect(counter).toBeDefined()
      expect(counter?.type).toBe('counter')
      expect(counter?.value).toBe(10)
    })

    it('should include labels in counter', () => {
      recordCounter('requests', 5, { method: 'GET' })

      const output = toOtlp()
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics
      const counter = metrics.find((m) => m.name === 'requests')

      expect(counter?.labels).toEqual({ method: 'GET' })
    })
  })

  describe('Gauge Export', () => {
    it('should export gauge in OTLP format', () => {
      recordGauge('memory', 1024)

      const output = toOtlp()
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics
      const gauge = metrics.find((m) => m.name === 'memory')

      expect(gauge).toBeDefined()
      expect(gauge?.type).toBe('gauge')
      expect(gauge?.value).toBe(1024)
    })
  })

  describe('Timing Export', () => {
    it('should export timing as summary in OTLP format', () => {
      recordTiming('api_duration', 100)
      recordTiming('api_duration', 200)

      const output = toOtlp()
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics
      const timing = metrics.find((m) => m.name === 'api_duration')

      expect(timing).toBeDefined()
      expect(timing?.type).toBe('summary')
      expect(timing?.count).toBe(2)
      expect(timing?.sum_ms).toBe(300)
      expect(timing?.max_ms).toBe(200)
      expect(timing?.p50_ms).toBeDefined()
      expect(timing?.p95_ms).toBeDefined()
      expect(timing?.p99_ms).toBeDefined()
    })

    it('should use milliseconds in OTLP format', () => {
      recordTiming('test_timer', 1000)

      const output = toOtlp()
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics
      const timing = metrics.find((m) => m.name === 'test_timer')

      // OTLP uses milliseconds, not seconds
      expect(timing?.sum_ms).toBe(1000)
    })
  })

  describe('Combined Export', () => {
    it('should export all metric types in single payload', () => {
      recordCounter('counter', 5)
      recordTiming('timer', 100)
      recordGauge('gauge', 50)

      const output = toOtlp()
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics

      expect(metrics).toHaveLength(3)
      expect(metrics.some((m) => m.type === 'counter')).toBe(true)
      expect(metrics.some((m) => m.type === 'summary')).toBe(true)
      expect(metrics.some((m) => m.type === 'gauge')).toBe(true)
    })

    it('should maintain structure with empty labels', () => {
      recordCounter('test', 1)

      const output = toOtlp()
      const metrics = output.resourceMetrics[0].scopeMetrics[0].metrics

      expect(metrics[0].labels).toEqual({})
    })
  })

  describe('Structure Validation', () => {
    it('should have correct OTLP structure', () => {
      recordCounter('test', 1)

      const output = toOtlp()

      expect(output).toHaveProperty('resourceMetrics')
      expect(output.resourceMetrics).toBeInstanceOf(Array)
      expect(output.resourceMetrics[0]).toHaveProperty('scopeMetrics')
      expect(output.resourceMetrics[0].scopeMetrics[0]).toHaveProperty('metrics')
    })

    it('should be JSON serializable', () => {
      recordCounter('test', 1)
      recordTiming('timer', 100)
      recordGauge('gauge', 50)

      const output = toOtlp()

      expect(() => JSON.stringify(output)).not.toThrow()
      const json = JSON.stringify(output)
      expect(() => JSON.parse(json)).not.toThrow()
    })
  })
})

describe('Metrics - Integration Scenarios', () => {
  beforeEach(() => {
    resetMetrics()
  })

  it('should track HTTP request metrics', () => {
    recordCounter('http.requests', 1, { method: 'GET', status: 200 })
    recordCounter('http.requests', 1, { method: 'POST', status: 201 })
    recordCounter('http.requests', 1, { method: 'GET', status: 404 })
    recordTiming('http.duration', 150, { method: 'GET' })
    recordTiming('http.duration', 200, { method: 'POST' })

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters).toHaveLength(3)
    expect(snapshot.timings).toHaveLength(2)
  })

  it('should track database metrics', () => {
    recordCounter('db.queries', 1, { operation: 'SELECT' })
    recordCounter('db.queries', 1, { operation: 'INSERT' })
    recordTiming('db.query.duration', 50, { operation: 'SELECT' })
    recordGauge('db.connections.active', 5)

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters).toHaveLength(2)
    expect(snapshot.timings).toHaveLength(1)
    expect(snapshot.gauges).toHaveLength(1)
  })

  it('should track cache metrics', () => {
    recordCounter('cache.hits', 10)
    recordCounter('cache.misses', 2)
    recordGauge('cache.size', 150)
    recordTiming('cache.get.duration', 5)

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters).toHaveLength(2)
    expect(snapshot.gauges).toHaveLength(1)
    expect(snapshot.timings).toHaveLength(1)
  })

  it('should handle metrics lifecycle', () => {
    // Record initial metrics
    recordCounter('requests', 100)

    // Get snapshot
    const snapshot1 = getMetricsSnapshot()
    expect(snapshot1.counters[0].value).toBe(100)

    // Record more
    recordCounter('requests', 50)

    // Get updated snapshot
    const snapshot2 = getMetricsSnapshot()
    expect(snapshot2.counters[0].value).toBe(150)

    // Reset
    resetMetrics()

    // Verify reset
    const snapshot3 = getMetricsSnapshot()
    expect(snapshot3.counters).toHaveLength(0)
  })

  it('should handle high-volume metrics', () => {
    const startTime = Date.now()

    // Simulate 10k requests
    for (let i = 0; i < 10000; i++) {
      recordCounter('high.volume', 1)
      recordTiming('high.volume.duration', Math.random() * 100)
    }

    const endTime = Date.now()
    const duration = endTime - startTime

    // Should complete within reasonable time (< 1 second)
    expect(duration).toBeLessThan(1000)

    const snapshot = getMetricsSnapshot()
    expect(snapshot.counters[0].value).toBe(10000)
    expect(snapshot.timings[0].count).toBe(10000)
  })
})

describe('Metrics - Performance', () => {
  beforeEach(() => {
    resetMetrics()
  })

  it('should handle memory efficiently with many label combinations', () => {
    const initialMemory = process.memoryUsage().heapUsed

    // Create 1000 unique label combinations
    for (let i = 0; i < 1000; i++) {
      recordCounter('test', 1, { index: i })
    }

    const finalMemory = process.memoryUsage().heapUsed
    const memoryIncrease = finalMemory - initialMemory

    // Should use < 10MB for 1000 metrics
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
  })

  it('should handle snapshot generation efficiently', () => {
    // Record many metrics
    for (let i = 0; i < 100; i++) {
      recordCounter(`counter${i}`, i)
      recordTiming(`timer${i}`, i * 10)
      recordGauge(`gauge${i}`, i * 5)
    }

    const startTime = Date.now()
    getMetricsSnapshot()
    const duration = Date.now() - startTime

    // Should generate snapshot quickly (< 100ms)
    expect(duration).toBeLessThan(100)
  })

  it('should handle Prometheus export efficiently', () => {
    // Record many metrics
    for (let i = 0; i < 50; i++) {
      recordCounter(`counter${i}`, i)
      recordTiming(`timer${i}`, i * 10)
      recordGauge(`gauge${i}`, i * 5)
    }

    const startTime = Date.now()
    toPrometheus()
    const duration = Date.now() - startTime

    // Should export quickly (< 100ms)
    expect(duration).toBeLessThan(100)
  })
})
