// tests/app/api/metrics/public/route.test.ts
// Comprehensive tests for Public Metrics API (GET /api/metrics/public)

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handler
// ---------------------------------------------------------------------------

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    UNAUTHORIZED: 401,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/metrics/visitor-tracker', () => ({
  getVisitorStats: vi.fn(),
}))

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      count: vi.fn(),
    },
  },
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from '@/app/api/metrics/public/route'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { getVisitorStats } from '@/lib/metrics/visitor-tracker'
import { prisma } from '@/lib/db/prisma'

// Get typed mocks
const mockRateLimit = vi.mocked(rateLimit)
const mockGetClientIp = vi.mocked(getClientIp)
const mockGetVisitorStats = vi.mocked(getVisitorStats)
const mockPrismaUserCount = vi.mocked(prisma.user.count)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createPublicMetricsRequest(overrides?: { authToken?: string | null }): NextRequest {
  const headers: Record<string, string> = {}
  if (overrides?.authToken !== null && overrides?.authToken !== undefined) {
    headers['Authorization'] = `Bearer ${overrides.authToken}`
  }
  return new NextRequest('http://localhost:3000/api/metrics/public', {
    method: 'GET',
    headers,
  })
}

function makeRateLimitHeaders(entries: Record<string, string>): Headers {
  const h = new Headers()
  for (const [key, value] of Object.entries(entries)) {
    h.set(key, value)
  }
  return h
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/metrics/public', () => {
  const DEFAULT_IP = '1.2.3.4'
  const VALID_TOKEN = 'test-metrics-token-123'
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset environment variables
    process.env = { ...originalEnv }
    process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN = VALID_TOKEN

    mockGetClientIp.mockReturnValue(DEFAULT_IP)

    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '59',
        'X-RateLimit-Reset': '1700000060',
      }),
    })

    mockGetVisitorStats.mockResolvedValue({
      todayVisitors: 150,
      totalVisitors: 5000,
    })

    mockPrismaUserCount.mockResolvedValue(1234)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // -------------------------------------------------------------------------
  // 1. Successful metrics retrieval
  // -------------------------------------------------------------------------
  it('should return metrics when authenticated with valid token', async () => {
    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      todayVisitors: 150,
      totalVisitors: 5000,
      totalMembers: 1234,
    })
    expect(mockGetVisitorStats).toHaveBeenCalledTimes(1)
    expect(mockPrismaUserCount).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // 2. Rate limited (429)
  // -------------------------------------------------------------------------
  it('should return 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60',
      }),
    })

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data).toEqual({ error: 'Too many requests' })
    expect(mockGetVisitorStats).not.toHaveBeenCalled()
    expect(mockPrismaUserCount).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 3. Unauthorized - missing token
  // -------------------------------------------------------------------------
  it('should return 401 when no Authorization header is provided', async () => {
    const req = new NextRequest('http://localhost:3000/api/metrics/public', {
      method: 'GET',
    })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
    expect(logger.warn).toHaveBeenCalledWith(
      '[Public Metrics] Auth failed',
      expect.objectContaining({
        hasAuthHeader: false,
        hasToken: false,
      })
    )
    expect(mockGetVisitorStats).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 4. Unauthorized - invalid token
  // -------------------------------------------------------------------------
  it('should return 401 when token does not match', async () => {
    const req = createPublicMetricsRequest({ authToken: 'wrong-token' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
    expect(logger.warn).toHaveBeenCalledWith(
      '[Public Metrics] Auth failed',
      expect.objectContaining({
        hasAuthHeader: true,
        hasToken: true,
        hasExpectedToken: true,
      })
    )
  })

  // -------------------------------------------------------------------------
  // 5. Unauthorized - empty token
  // -------------------------------------------------------------------------
  it('should return 401 when Bearer token is empty', async () => {
    const req = createPublicMetricsRequest({ authToken: '' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
  })

  // -------------------------------------------------------------------------
  // 6. Unauthorized - no expected token configured
  // -------------------------------------------------------------------------
  it('should return 401 when no expected token is configured', async () => {
    delete process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN
    delete process.env.PUBLIC_METRICS_TOKEN
    delete process.env.METRICS_TOKEN

    const req = createPublicMetricsRequest({ authToken: 'any-token' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'Unauthorized' })
    expect(logger.warn).toHaveBeenCalledWith(
      '[Public Metrics] Auth failed',
      expect.objectContaining({
        hasExpectedToken: false,
      })
    )
  })

  // -------------------------------------------------------------------------
  // 7. Fallback tokens - PUBLIC_METRICS_TOKEN
  // -------------------------------------------------------------------------
  it('should accept PUBLIC_METRICS_TOKEN as fallback', async () => {
    delete process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN
    process.env.PUBLIC_METRICS_TOKEN = 'fallback-token'

    const req = createPublicMetricsRequest({ authToken: 'fallback-token' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('todayVisitors')
    expect(data).toHaveProperty('totalVisitors')
    expect(data).toHaveProperty('totalMembers')
  })

  // -------------------------------------------------------------------------
  // 8. Fallback tokens - METRICS_TOKEN
  // -------------------------------------------------------------------------
  it('should accept METRICS_TOKEN as fallback', async () => {
    delete process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN
    delete process.env.PUBLIC_METRICS_TOKEN
    process.env.METRICS_TOKEN = 'metrics-fallback-token'

    const req = createPublicMetricsRequest({ authToken: 'metrics-fallback-token' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('todayVisitors')
  })

  // -------------------------------------------------------------------------
  // 9. Internal server error (500)
  // -------------------------------------------------------------------------
  it('should return 500 when an unexpected error occurs', async () => {
    const thrownError = new Error('Redis connection failed')
    mockRateLimit.mockRejectedValue(thrownError)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Internal server error' })
    expect(logger.error).toHaveBeenCalledWith('[Public Metrics API Error]', thrownError)
  })

  // -------------------------------------------------------------------------
  // 10. Sets rate limit headers on success response
  // -------------------------------------------------------------------------
  it('should include rate limit headers in successful response', async () => {
    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)

    expect(response.status).toBe(200)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1700000060')
  })

  // -------------------------------------------------------------------------
  // 11. Sets rate limit headers on unauthorized response
  // -------------------------------------------------------------------------
  it('should include rate limit headers in 401 response', async () => {
    const req = createPublicMetricsRequest({ authToken: 'wrong-token' })
    const response = await GET(req)

    expect(response.status).toBe(401)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('59')
  })

  // -------------------------------------------------------------------------
  // 12. Rate-limited response carries rate limit headers
  // -------------------------------------------------------------------------
  it('should include rate limit headers in 429 response', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'Retry-After': '55',
      }),
    })

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('60')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('Retry-After')).toBe('55')
  })

  // -------------------------------------------------------------------------
  // 13. Passes correct rate limit key and options
  // -------------------------------------------------------------------------
  it('should call rateLimit with correct key and options', async () => {
    const ip = '10.20.30.40'
    mockGetClientIp.mockReturnValue(ip)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    await GET(req)

    expect(mockGetClientIp).toHaveBeenCalledWith(req.headers)
    expect(mockRateLimit).toHaveBeenCalledWith(`api:metrics/public:${ip}`, {
      limit: 60,
      windowSeconds: 60,
    })
  })

  // -------------------------------------------------------------------------
  // 14. Error response does NOT include rate limit headers
  // -------------------------------------------------------------------------
  it('should not include rate limit headers when an error occurs', async () => {
    mockRateLimit.mockRejectedValue(new Error('boom'))

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)

    expect(response.status).toBe(500)
    expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 15. getVisitorStats error returns 500
  // -------------------------------------------------------------------------
  it('should return 500 if getVisitorStats throws', async () => {
    const err = new Error('getVisitorStats exploded')
    mockGetVisitorStats.mockRejectedValue(err)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Internal server error' })
    expect(logger.error).toHaveBeenCalledWith('[Public Metrics API Error]', err)
  })

  // -------------------------------------------------------------------------
  // 16. Prisma error is handled gracefully (totalMembers = 0)
  // -------------------------------------------------------------------------
  it('should return totalMembers as 0 when prisma.user.count fails', async () => {
    const prismaError = new Error('Database connection failed')
    mockPrismaUserCount.mockRejectedValue(prismaError)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      todayVisitors: 150,
      totalVisitors: 5000,
      totalMembers: 0,
    })
    expect(logger.error).toHaveBeenCalledWith('[Public Metrics] Failed to count users', prismaError)
  })

  // -------------------------------------------------------------------------
  // 17. Response format validation
  // -------------------------------------------------------------------------
  it('should return correct response format with numeric values', async () => {
    mockGetVisitorStats.mockResolvedValue({
      todayVisitors: 42,
      totalVisitors: 9999,
    })
    mockPrismaUserCount.mockResolvedValue(500)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(typeof data.todayVisitors).toBe('number')
    expect(typeof data.totalVisitors).toBe('number')
    expect(typeof data.totalMembers).toBe('number')
    expect(data.todayVisitors).toBe(42)
    expect(data.totalVisitors).toBe(9999)
    expect(data.totalMembers).toBe(500)
  })

  // -------------------------------------------------------------------------
  // 18. Zero values are handled correctly
  // -------------------------------------------------------------------------
  it('should handle zero visitor counts correctly', async () => {
    mockGetVisitorStats.mockResolvedValue({
      todayVisitors: 0,
      totalVisitors: 0,
    })
    mockPrismaUserCount.mockResolvedValue(0)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      todayVisitors: 0,
      totalVisitors: 0,
      totalMembers: 0,
    })
  })

  // -------------------------------------------------------------------------
  // 19. Large numbers are handled correctly
  // -------------------------------------------------------------------------
  it('should handle large visitor counts correctly', async () => {
    mockGetVisitorStats.mockResolvedValue({
      todayVisitors: 1000000,
      totalVisitors: 50000000,
    })
    mockPrismaUserCount.mockResolvedValue(10000000)

    const req = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.todayVisitors).toBe(1000000)
    expect(data.totalVisitors).toBe(50000000)
    expect(data.totalMembers).toBe(10000000)
  })

  // -------------------------------------------------------------------------
  // 20. Token with whitespace is trimmed correctly
  // -------------------------------------------------------------------------
  it('should handle tokens with whitespace correctly', async () => {
    process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN = '  trimmed-token  '

    const req = createPublicMetricsRequest({ authToken: 'trimmed-token' })
    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('todayVisitors')
  })

  // -------------------------------------------------------------------------
  // 21. Authorization header without Bearer prefix
  // -------------------------------------------------------------------------
  it('should handle Authorization header without Bearer prefix', async () => {
    const headers = new Headers()
    headers.set('Authorization', VALID_TOKEN) // No "Bearer " prefix
    const req = new NextRequest('http://localhost:3000/api/metrics/public', {
      method: 'GET',
      headers,
    })
    const response = await GET(req)
    const data = await response.json()

    // Should still work because replace('Bearer ', '') won't change it if no prefix
    expect(response.status).toBe(200)
    expect(data).toHaveProperty('todayVisitors')
  })

  // -------------------------------------------------------------------------
  // 22. Concurrent requests with different IPs
  // -------------------------------------------------------------------------
  it('should use correct IP for rate limiting', async () => {
    const ip1 = '192.168.1.1'
    const ip2 = '192.168.1.2'

    mockGetClientIp.mockReturnValueOnce(ip1).mockReturnValueOnce(ip2)

    const req1 = createPublicMetricsRequest({ authToken: VALID_TOKEN })
    const req2 = createPublicMetricsRequest({ authToken: VALID_TOKEN })

    await GET(req1)
    await GET(req2)

    expect(mockRateLimit).toHaveBeenNthCalledWith(1, `api:metrics/public:${ip1}`, {
      limit: 60,
      windowSeconds: 60,
    })
    expect(mockRateLimit).toHaveBeenNthCalledWith(2, `api:metrics/public:${ip2}`, {
      limit: 60,
      windowSeconds: 60,
    })
  })

  // -------------------------------------------------------------------------
  // 23. Logs warning with diagnostic info on auth failure
  // -------------------------------------------------------------------------
  it('should log diagnostic info when authentication fails', async () => {
    const req = createPublicMetricsRequest({ authToken: 'bad-token' })
    await GET(req)

    expect(logger.warn).toHaveBeenCalledWith(
      '[Public Metrics] Auth failed',
      expect.objectContaining({
        hasAuthHeader: true,
        hasToken: true,
        hasExpectedToken: true,
      })
    )
  })

  // -------------------------------------------------------------------------
  // 24. Token priority - NEXT_PUBLIC_PUBLIC_METRICS_TOKEN takes precedence
  // -------------------------------------------------------------------------
  it('should prioritize NEXT_PUBLIC_PUBLIC_METRICS_TOKEN over other tokens', async () => {
    process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN = 'primary-token'
    process.env.PUBLIC_METRICS_TOKEN = 'secondary-token'
    process.env.METRICS_TOKEN = 'tertiary-token'

    // Primary token should work
    const req1 = createPublicMetricsRequest({ authToken: 'primary-token' })
    const response1 = await GET(req1)
    expect(response1.status).toBe(200)

    // Secondary token should fail
    const req2 = createPublicMetricsRequest({ authToken: 'secondary-token' })
    const response2 = await GET(req2)
    expect(response2.status).toBe(401)
  })
})
