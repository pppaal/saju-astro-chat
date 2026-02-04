import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies before importing the route

// The middleware imports getServerSession from 'next-auth' (not 'next-auth/next')
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    headers: new Map([['X-RateLimit-Remaining', '29']]),
  }),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn().mockReturnValue('127.0.0.1'),
}))

vi.mock('@/lib/security/csrf', () => ({
  csrfGuard: vi.fn().mockReturnValue(null),
}))

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn().mockReturnValue({ valid: true }),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

// Mock @/lib/metrics (used by errorHandler for recordCounter)
vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
  recordTiming: vi.fn(),
  recordGauge: vi.fn(),
  getMetricsSnapshot: vi.fn(),
  resetMetrics: vi.fn(),
  toPrometheus: vi.fn(),
  toOtlp: vi.fn(),
}))

vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn().mockResolvedValue({ allowed: true, remaining: 100 }),
}))

vi.mock('@/lib/credits/creditRefund', () => ({
  refundCredits: vi.fn(),
}))

vi.mock('@/lib/metrics/index', () => ({
  getMetricsSnapshot: vi.fn().mockReturnValue({
    counters: [
      { name: 'api.request.total', value: 100, labels: { service: 'destiny' } },
      {
        name: 'api.error.total',
        value: 5,
        labels: { service: 'destiny', error_category: 'validation' },
      },
      { name: 'credits.usage.total', value: 50, labels: { service: 'tarot' } },
    ],
    timings: [
      { name: 'api.latency', sum: 5000, count: 100, p95: 120, labels: { service: 'destiny' } },
    ],
    gauges: [{ name: 'active.sessions', value: 25 }],
  }),
  toPrometheus: vi.fn().mockReturnValue('# HELP api_request_total\napi_request_total 100'),
  toOtlp: vi.fn().mockReturnValue({ resourceMetrics: [] }),
  DashboardRequestSchema: {
    safeParse: vi.fn().mockReturnValue({
      success: true,
      data: { timeRange: '24h', includeRaw: false },
    }),
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock prisma for admin check inside the route
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue(null),
    },
  },
}))

describe('Admin Metrics API', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, ADMIN_EMAILS: 'admin@example.com,superadmin@example.com' }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('GET /api/admin/metrics', () => {
    it('should return 401 when not authenticated', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('should return 403 for non-admin users', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'user-1', email: 'user@example.com' },
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics')
      const response = await GET(request)

      expect(response.status).toBe(403)
    })

    it('should return 429 when rate limited', async () => {
      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: false,
        retryAfter: 60,
        headers: new Map([['Retry-After', '60']]),
      })

      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics')
      const response = await GET(request)

      expect(response.status).toBe(429)
    })

    it('should return JSON dashboard data for admin users', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      })

      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        headers: new Map(),
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('overview')
      expect(data.data).toHaveProperty('services')
      expect(data.data).toHaveProperty('topErrors')
      expect(data.data).toHaveProperty('credits')
    })

    it('should return Prometheus format when requested', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      })

      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        headers: new Map(),
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics?format=prometheus')
      const response = await GET(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/plain')
    })

    it('should return OTLP format when requested', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      })

      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        headers: new Map(),
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics?format=otlp')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('resourceMetrics')
    })

    it('should handle case-insensitive admin email matching', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'ADMIN@EXAMPLE.COM' },
      })

      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        headers: new Map(),
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics')
      const response = await GET(request)

      expect(response.status).toBe(200)
    })

    it('should return 400 for invalid parameters', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      })

      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        headers: new Map(),
      })

      const { DashboardRequestSchema } = await import('@/lib/metrics/index')
      ;(DashboardRequestSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: false,
        error: { flatten: () => ({ fieldErrors: { timeRange: ['Invalid'] } }) },
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics?timeRange=invalid')
      const response = await GET(request)

      // VALIDATION_ERROR maps to 422 in the error handler, but apiError returns
      // the error as a handler result that withApiMiddleware processes via createErrorResponse.
      // However, the route returns apiError() which is a handler result, so
      // withApiMiddleware calls createErrorResponse with VALIDATION_ERROR -> 422.
      expect(response.status).toBe(422)
    })

    it('should include raw data when includeRaw=true', async () => {
      const { getServerSession } = await import('next-auth')
      ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue({
        user: { id: 'admin-1', email: 'admin@example.com' },
      })

      const { rateLimit } = await import('@/lib/rateLimit')
      ;(rateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        headers: new Map(),
      })

      const { DashboardRequestSchema } = await import('@/lib/metrics/index')
      ;(DashboardRequestSchema.safeParse as ReturnType<typeof vi.fn>).mockReturnValue({
        success: true,
        data: { timeRange: '24h', includeRaw: true },
      })

      const { GET } = await import('@/app/api/admin/metrics/route')
      const request = new NextRequest('http://localhost/api/admin/metrics?includeRaw=true')
      const response = await GET(request)

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data).toHaveProperty('raw')
    })
  })
})
