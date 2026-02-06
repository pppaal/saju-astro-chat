/**
 * Comprehensive Unit Tests for Admin Metrics SLA API
 *
 * Tests for GET /api/admin/metrics/sla
 * This route returns SLA compliance status including:
 * - p95 latency (threshold: 700ms)
 * - Error rate (threshold: 0.5%)
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all mocks must be declared BEFORE the route import
// ---------------------------------------------------------------------------

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn((handler: any, _options: any) => {
    return async (req: any) => {
      const context = {
        userId: 'test-user-id',
        session: { user: { id: 'test-user-id', email: 'test@example.com' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
      }
      const result = await handler(req, context)
      if (result instanceof Response) return result
      if (result?.error) {
        const statusMap: Record<string, number> = {
          FORBIDDEN: 403,
          VALIDATION_ERROR: 422,
          INTERNAL_ERROR: 500,
          UNAUTHORIZED: 401,
        }
        return NextResponse.json(
          { success: false, error: result.error },
          { status: statusMap[result.error.code] || 500 }
        )
      }
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    }
  }),
  createAuthenticatedGuard: vi.fn(() => ({})),
  apiSuccess: vi.fn((data: any) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({ error: { code, message } })),
  ErrorCodes: {
    FORBIDDEN: 'FORBIDDEN',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth/admin', () => ({
  isAdminUser: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/metrics', () => ({
  getMetricsSnapshot: vi.fn(),
  recordCounter: vi.fn(),
  recordTiming: vi.fn(),
  recordGauge: vi.fn(),
  resetMetrics: vi.fn(),
  toPrometheus: vi.fn(),
  toOtlp: vi.fn(),
}))

vi.mock('@/lib/metrics/schema', () => ({
  SLA_THRESHOLDS: {
    P95_LATENCY_MS: 700,
    ERROR_RATE_PERCENT: 0.5,
    TEST_COVERAGE_PERCENT: 60,
  },
}))

// ---------------------------------------------------------------------------
// Import route handler AFTER all mocks are declared
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/admin/metrics/sla/route'
import { isAdminUser } from '@/lib/auth/admin'
import { logger } from '@/lib/logger'
import { getMetricsSnapshot } from '@/lib/metrics'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(): NextRequest {
  const url = new URL('http://localhost:3000/api/admin/metrics/sla')
  return new NextRequest(url.toString())
}

function createMockMetricsSnapshot(options: {
  p95Values?: number[]
  totalRequests?: number
  totalErrors?: number
}) {
  const { p95Values = [100], totalRequests = 1000, totalErrors = 2 } = options

  return {
    counters: [
      { name: 'api.request.total', value: totalRequests, labels: {} },
      { name: 'api.error.total', value: totalErrors, labels: {} },
    ],
    timings: p95Values.map((p95, index) => ({
      name: index === 0 ? 'api.request.duration' : 'http.request.duration',
      sum: p95 * 100,
      count: 100,
      p95: p95,
      max: p95 * 1.5,
      avg: p95 * 0.8,
      labels: {},
    })),
    gauges: [{ name: 'active.sessions', value: 25 }],
  }
}

function setupHealthyMetrics() {
  vi.mocked(getMetricsSnapshot).mockReturnValue(
    createMockMetricsSnapshot({
      p95Values: [300, 400], // Well below 700ms threshold
      totalRequests: 10000,
      totalErrors: 10, // 0.1% error rate, well below 0.5%
    })
  )
}

function setupDegradedMetrics() {
  vi.mocked(getMetricsSnapshot).mockReturnValue(
    createMockMetricsSnapshot({
      p95Values: [750], // Between 700ms and 840ms (700 * 1.2), so warning
      totalRequests: 10000,
      totalErrors: 10, // 0.1% error rate, well below 0.5%
    })
  )
}

function setupCriticalLatencyMetrics() {
  vi.mocked(getMetricsSnapshot).mockReturnValue(
    createMockMetricsSnapshot({
      p95Values: [1000], // Above 840ms (700 * 1.2), so fail
      totalRequests: 10000,
      totalErrors: 10,
    })
  )
}

function setupCriticalErrorRateMetrics() {
  vi.mocked(getMetricsSnapshot).mockReturnValue(
    createMockMetricsSnapshot({
      p95Values: [300],
      totalRequests: 1000,
      totalErrors: 15, // 1.5% error rate, above 0.5% * 2 = 1%, so fail
    })
  )
}

function setupWarningErrorRateMetrics() {
  vi.mocked(getMetricsSnapshot).mockReturnValue(
    createMockMetricsSnapshot({
      p95Values: [300],
      totalRequests: 1000,
      totalErrors: 7, // 0.7% error rate, between 0.5% and 1%, so warning
    })
  )
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('GET /api/admin/metrics/sla', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isAdminUser).mockResolvedValue(true)
    setupHealthyMetrics()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  // =========================================================================
  // Authentication & Authorization Tests
  // =========================================================================
  describe('Authentication & Authorization', () => {
    it('should return 401 when no session or userId is present', async () => {
      const { withApiMiddleware } = await import('@/lib/api/middleware')
      vi.mocked(withApiMiddleware).mockImplementationOnce((handler: any) => {
        return async (req: any) => {
          const context = {
            userId: null,
            session: null,
            ip: '127.0.0.1',
            locale: 'ko',
            isAuthenticated: false,
          }
          const result = await handler(req, context)
          if (result?.error) {
            return NextResponse.json(
              { success: false, error: result.error },
              { status: result.error.code === 'UNAUTHORIZED' ? 401 : 500 }
            )
          }
          return NextResponse.json({ success: true, data: result.data }, { status: 200 })
        }
      })

      // Re-import to use updated mock
      vi.resetModules()
      const { GET: freshGET } = await import('@/app/api/admin/metrics/sla/route')

      const req = makeRequest()
      const response = await freshGET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should return 403 when user is not admin', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('FORBIDDEN')
      expect(logger.warn).toHaveBeenCalledWith(
        '[SLA] Unauthorized access attempt',
        expect.objectContaining({
          email: 'test@example.com',
          userId: 'test-user-id',
        })
      )
    })

    it('should allow access when user is admin', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(true)

      const req = makeRequest()
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(isAdminUser).toHaveBeenCalledWith('test-user-id')
    })

    it('should call isAdminUser with correct userId', async () => {
      const req = makeRequest()
      await GET(req)

      expect(isAdminUser).toHaveBeenCalledWith('test-user-id')
    })
  })

  // =========================================================================
  // SLA Status Tests - Healthy
  // =========================================================================
  describe('SLA Status - Healthy', () => {
    it('should return healthy status when all metrics are within thresholds', async () => {
      setupHealthyMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      // Response structure: { success: true, data: { data: report } }
      const report = data.data.data

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(report.overallStatus).toBe('healthy')
      expect(report.summary.passed).toBe(2)
      expect(report.summary.warnings).toBe(0)
      expect(report.summary.failed).toBe(0)
    })

    it('should correctly calculate p95 latency as pass when below threshold', async () => {
      setupHealthyMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric).toBeDefined()
      expect(p95Metric.status).toBe('pass')
      expect(p95Metric.threshold).toBe(700)
      expect(p95Metric.unit).toBe('ms')
      expect(p95Metric.message).toContain('is within threshold')
    })

    it('should correctly calculate error rate as pass when below threshold', async () => {
      setupHealthyMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric).toBeDefined()
      expect(errorRateMetric.status).toBe('pass')
      expect(errorRateMetric.threshold).toBe(0.5)
      expect(errorRateMetric.unit).toBe('%')
      expect(errorRateMetric.message).toContain('is within threshold')
    })
  })

  // =========================================================================
  // SLA Status Tests - Degraded (Warnings)
  // =========================================================================
  describe('SLA Status - Degraded', () => {
    it('should return degraded status when p95 latency is in warning range', async () => {
      setupDegradedMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data

      expect(response.status).toBe(200)
      expect(report.overallStatus).toBe('degraded')
      expect(report.summary.warnings).toBeGreaterThan(0)
      expect(report.summary.failed).toBe(0)
    })

    it('should return degraded status when error rate is in warning range', async () => {
      setupWarningErrorRateMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data

      expect(response.status).toBe(200)
      expect(report.overallStatus).toBe('degraded')

      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.status).toBe('warning')
    })

    it('should log warning when SLA is degraded', async () => {
      setupDegradedMetrics()

      const req = makeRequest()
      await GET(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[SLA] SLA violation detected',
        expect.objectContaining({
          status: 'degraded',
          violations: expect.any(Array),
        })
      )
    })
  })

  // =========================================================================
  // SLA Status Tests - Critical (Failures)
  // =========================================================================
  describe('SLA Status - Critical', () => {
    it('should return critical status when p95 latency exceeds failure threshold', async () => {
      setupCriticalLatencyMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data

      expect(response.status).toBe(200)
      expect(report.overallStatus).toBe('critical')
      expect(report.summary.failed).toBeGreaterThan(0)

      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.status).toBe('fail')
      expect(p95Metric.message).toContain('exceeds')
    })

    it('should return critical status when error rate exceeds failure threshold', async () => {
      setupCriticalErrorRateMetrics()

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data

      expect(response.status).toBe(200)
      expect(report.overallStatus).toBe('critical')

      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.status).toBe('fail')
    })

    it('should log warning when SLA is critical', async () => {
      setupCriticalLatencyMetrics()

      const req = makeRequest()
      await GET(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[SLA] SLA violation detected',
        expect.objectContaining({
          status: 'critical',
        })
      )
    })
  })

  // =========================================================================
  // Response Structure Tests
  // =========================================================================
  describe('Response Structure', () => {
    it('should include timestamp in response', async () => {
      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      expect(report.timestamp).toBeDefined()
      expect(new Date(report.timestamp).getTime()).not.toBeNaN()
    })

    it('should include overallStatus in response', async () => {
      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      expect(report.overallStatus).toBeDefined()
      expect(['healthy', 'degraded', 'critical']).toContain(report.overallStatus)
    })

    it('should include metrics array with correct structure', async () => {
      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      expect(Array.isArray(report.metrics)).toBe(true)
      expect(report.metrics.length).toBe(2) // p95_latency and error_rate

      for (const metric of report.metrics) {
        expect(metric).toHaveProperty('metric')
        expect(metric).toHaveProperty('current')
        expect(metric).toHaveProperty('threshold')
        expect(metric).toHaveProperty('unit')
        expect(metric).toHaveProperty('status')
        expect(metric).toHaveProperty('message')
      }
    })

    it('should include summary with correct counts', async () => {
      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      expect(report.summary).toBeDefined()
      expect(report.summary).toHaveProperty('totalChecks')
      expect(report.summary).toHaveProperty('passed')
      expect(report.summary).toHaveProperty('warnings')
      expect(report.summary).toHaveProperty('failed')
      expect(report.summary.totalChecks).toBe(2)
      expect(
        report.summary.passed + report.summary.warnings + report.summary.failed
      ).toBe(report.summary.totalChecks)
    })

    it('should return success: true for valid requests', async () => {
      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.success).toBe(true)
    })

    it('should return success: false for error responses', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.success).toBe(false)
    })
  })

  // =========================================================================
  // Edge Cases
  // =========================================================================
  describe('Edge Cases', () => {
    it('should handle empty metrics snapshot gracefully', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [],
        timings: [],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data

      expect(response.status).toBe(200)
      expect(report.overallStatus).toBe('healthy')

      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.current).toBe(0)

      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.current).toBe(0)
    })

    it('should handle zero total requests gracefully', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue(
        createMockMetricsSnapshot({
          p95Values: [100],
          totalRequests: 0,
          totalErrors: 0,
        })
      )

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data

      expect(response.status).toBe(200)
      // When totalRequests is 0, error rate should be 0 (not NaN)
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.current).toBe(0)
    })

    it('should use max p95 when multiple timing metrics exist', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 5, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 10000, count: 100, p95: 200, max: 300, avg: 100, labels: {} },
          { name: 'http.request.duration', sum: 50000, count: 100, p95: 600, max: 800, avg: 500, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      // Should use max of all p95 values: 600
      expect(p95Metric.current).toBe(600)
    })

    it('should exclude external/openai latency metrics from SLA calculation', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 5, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 10000, count: 100, p95: 200, max: 300, avg: 100, labels: {} },
          { name: 'external.openai.duration', sum: 500000, count: 100, p95: 5000, max: 8000, avg: 5000, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      // Should only use api.request.duration, not external.openai.duration
      expect(p95Metric.current).toBe(200)
    })

    it('should handle timings with zero p95 values', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 5, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 0, count: 0, p95: 0, max: 0, avg: 0, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.current).toBe(0)
      expect(p95Metric.status).toBe('pass') // 0 is below threshold
    })

    it('should round p95 latency to integer', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 5, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 10000, count: 100, p95: 123.456, max: 200, avg: 100, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.current).toBe(123) // Rounded
    })

    it('should format error rate to 3 decimal places', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue(
        createMockMetricsSnapshot({
          p95Values: [100],
          totalRequests: 30000,
          totalErrors: 1, // 0.00333...%
        })
      )

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(typeof errorRateMetric.current).toBe('number')
      // Check it's properly formatted
      const decimalPlaces = errorRateMetric.current.toString().split('.')[1]?.length || 0
      expect(decimalPlaces).toBeLessThanOrEqual(3)
    })
  })

  // =========================================================================
  // Error Handling Tests
  // =========================================================================
  describe('Error Handling', () => {
    it('should handle getMetricsSnapshot throwing an error', async () => {
      vi.mocked(getMetricsSnapshot).mockImplementation(() => {
        throw new Error('Metrics service unavailable')
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
      expect(logger.error).toHaveBeenCalledWith('[SLA API Error]', expect.any(Error))
    })

    it('should handle isAdminUser throwing an error', async () => {
      vi.mocked(isAdminUser).mockRejectedValue(new Error('Database connection failed'))

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should include error code and message in error responses', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.error).toHaveProperty('code')
      expect(data.error).toHaveProperty('message')
    })
  })

  // =========================================================================
  // Boundary Tests
  // =========================================================================
  describe('Boundary Tests', () => {
    it('should mark p95 latency as pass when exactly at threshold', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 1, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 70000, count: 100, p95: 700, max: 800, avg: 600, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.status).toBe('pass') // 700ms is exactly the threshold
    })

    it('should mark p95 latency as warning when just above threshold', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 1, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 70100, count: 100, p95: 701, max: 800, avg: 600, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.status).toBe('warning') // 701ms is just above 700ms
    })

    it('should mark p95 latency as fail when above warning threshold (700 * 1.2 = 840)', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 1, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 84100, count: 100, p95: 841, max: 900, avg: 700, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const p95Metric = report.metrics.find((m: any) => m.metric === 'p95_latency')
      expect(p95Metric.status).toBe('fail') // 841ms is above 840ms (700 * 1.2)
    })

    it('should mark error rate as pass when exactly at threshold', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue(
        createMockMetricsSnapshot({
          p95Values: [100],
          totalRequests: 1000,
          totalErrors: 5, // Exactly 0.5%
        })
      )

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.status).toBe('pass')
    })

    it('should mark error rate as warning when just above threshold', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue(
        createMockMetricsSnapshot({
          p95Values: [100],
          totalRequests: 1000,
          totalErrors: 6, // 0.6%, just above 0.5%
        })
      )

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.status).toBe('warning')
    })

    it('should mark error rate as fail when above double threshold (0.5 * 2 = 1.0)', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue(
        createMockMetricsSnapshot({
          p95Values: [100],
          totalRequests: 1000,
          totalErrors: 11, // 1.1%, above 1.0%
        })
      )

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.status).toBe('fail')
    })
  })

  // =========================================================================
  // Metric Counter Filtering Tests
  // =========================================================================
  describe('Metric Counter Filtering', () => {
    it('should include all API request metrics in total requests', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 100, labels: {} },
          { name: 'http.request.total', value: 200, labels: {} },
          { name: 'destiny.report.total', value: 50, labels: {} },
          { name: 'tarot.reading.total', value: 30, labels: {} },
          { name: 'dream.analysis.total', value: 20, labels: {} },
          { name: 'astrology.chart.total', value: 10, labels: {} },
          { name: 'api.error.total', value: 2, labels: {} },
          { name: 'unrelated.metric', value: 9999, labels: {} },
        ],
        timings: [
          { name: 'api.request.duration', sum: 10000, count: 100, p95: 100, max: 200, avg: 100, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      // Total = 100 + 200 + 50 + 30 + 20 + 10 = 410
      // Error rate = 2 / 410 * 100 = 0.488%
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.current).toBeCloseTo(0.488, 2)
    })

    it('should only include api.error.total in error count', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 1000, labels: {} },
          { name: 'api.error.total', value: 5, labels: {} },
          { name: 'other.error.total', value: 100, labels: {} }, // Should be ignored
        ],
        timings: [
          { name: 'api.request.duration', sum: 10000, count: 100, p95: 100, max: 200, avg: 100, labels: {} },
        ],
        gauges: [],
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      const report = data.data.data
      // Error rate = 5 / 1000 * 100 = 0.5%
      const errorRateMetric = report.metrics.find((m: any) => m.metric === 'error_rate')
      expect(errorRateMetric.current).toBe(0.5)
    })
  })

  // =========================================================================
  // Security Tests
  // =========================================================================
  describe('Security', () => {
    it('should log unauthorized access attempts with user details', async () => {
      vi.mocked(isAdminUser).mockResolvedValue(false)

      const req = makeRequest()
      await GET(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[SLA] Unauthorized access attempt',
        expect.objectContaining({
          email: 'test@example.com',
          userId: 'test-user-id',
        })
      )
    })

    it('should not expose sensitive information in error responses', async () => {
      vi.mocked(getMetricsSnapshot).mockImplementation(() => {
        throw new Error('Database credentials invalid')
      })

      const req = makeRequest()
      const response = await GET(req)
      const data = await response.json()

      expect(data.error.message).toBe('Internal server error')
      expect(data.error.message).not.toContain('credentials')
      expect(data.error.message).not.toContain('Database')
    })
  })

  // =========================================================================
  // Concurrent Request Handling
  // =========================================================================
  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 5 }, () => makeRequest())

      const responses = await Promise.all(requests.map((req) => GET(req)))

      responses.forEach((response) => {
        expect(response.status).toBe(200)
      })
    })
  })
})
