// tests/app/api/metrics/track/route.test.ts
// Comprehensive tests for Visitor Tracking API (POST /api/metrics/track)

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import crypto from 'crypto'

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
  HTTP_STATUS: { OK: 200, RATE_LIMITED: 429, SERVER_ERROR: 500 },
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/metrics/visitor-tracker', () => ({
  trackVisitor: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/metrics/track/route'
import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { trackVisitor } from '@/lib/metrics/visitor-tracker'

// Get typed mocks
const mockRateLimit = vi.mocked(rateLimit)
const mockGetClientIp = vi.mocked(getClientIp)
const mockTrackVisitor = vi.mocked(trackVisitor)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTrackRequest(overrides?: {
  userAgent?: string | null
}): NextRequest {
  const headers: Record<string, string> = {}
  if (overrides?.userAgent !== null) {
    headers['user-agent'] = overrides?.userAgent ?? 'Mozilla/5.0 TestBrowser'
  }
  return new NextRequest('http://localhost:3000/api/metrics/track', {
    method: 'POST',
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

function expectedVisitorHash(ip: string, userAgent: string): string {
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/metrics/track', () => {
  const DEFAULT_IP = '1.2.3.4'
  const DEFAULT_UA = 'Mozilla/5.0 TestBrowser'

  beforeEach(() => {
    vi.clearAllMocks()

    mockGetClientIp.mockReturnValue(DEFAULT_IP)

    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '9',
        'X-RateLimit-Reset': '1700000060',
      }),
    })

    mockTrackVisitor.mockReturnValue(undefined)
  })

  // -------------------------------------------------------------------------
  // 1. Successful tracking
  // -------------------------------------------------------------------------
  it('should return success when tracking a visitor', async () => {
    const req = createTrackRequest()
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })
    expect(mockTrackVisitor).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // 2. Rate limited (429)
  // -------------------------------------------------------------------------
  it('should return 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'Retry-After': '60',
      }),
    })

    const req = createTrackRequest()
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(429)
    expect(data.success).toBe(false)
    expect(data.error.code).toBe('RATE_LIMITED')
    expect(mockTrackVisitor).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // 3. Handles unknown / missing user-agent
  // -------------------------------------------------------------------------
  it('should fall back to "unknown" when user-agent header is absent', async () => {
    // Create a request with NO user-agent header at all
    const req = new NextRequest('http://localhost:3000/api/metrics/track', {
      method: 'POST',
      // intentionally no headers
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({ success: true })

    const expectedHash = expectedVisitorHash(DEFAULT_IP, 'unknown')
    expect(mockTrackVisitor).toHaveBeenCalledWith(expectedHash)
  })

  // -------------------------------------------------------------------------
  // 4. Internal server error (500)
  // -------------------------------------------------------------------------
  it('should return 500 when an unexpected error occurs', async () => {
    const thrownError = new Error('Redis connection failed')
    mockTrackVisitor.mockImplementation(() => {
      throw thrownError
    })

    const req = createTrackRequest()
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Internal server error' })
    expect(logger.error).toHaveBeenCalledWith('[Track Visitor API Error]', thrownError)
    expect(mockTrackVisitor).toHaveBeenCalledTimes(1)
  })

  // -------------------------------------------------------------------------
  // 5. Creates correct visitor hash from ip + user-agent
  // -------------------------------------------------------------------------
  it('should create the correct SHA-256 visitor hash from ip:userAgent', async () => {
    const ip = '203.0.113.42'
    const ua = 'CustomAgent/1.0'
    mockGetClientIp.mockReturnValue(ip)

    const req = createTrackRequest({ userAgent: ua })
    await POST(req)

    const expected = expectedVisitorHash(ip, ua)
    expect(mockTrackVisitor).toHaveBeenCalledWith(expected)

    // Sanity-check: the hash must be a 64-character hex string (SHA-256)
    const actualArg = mockTrackVisitor.mock.calls[0][0] as string
    expect(actualArg).toMatch(/^[a-f0-9]{64}$/)
    expect(actualArg).toBe(expected)
  })

  // -------------------------------------------------------------------------
  // 6. Sets rate limit headers on success response
  // -------------------------------------------------------------------------
  it('should include rate limit headers in successful response', async () => {
    const req = createTrackRequest()
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    expect(response.headers.get('X-RateLimit-Reset')).toBe('1700000060')
  })

  // -------------------------------------------------------------------------
  // 7. Passes correct rate limit key and options
  // -------------------------------------------------------------------------
  it('should call rateLimit with correct key and options', async () => {
    const ip = '10.20.30.40'
    mockGetClientIp.mockReturnValue(ip)

    const req = createTrackRequest()
    await POST(req)

    expect(mockGetClientIp).toHaveBeenCalledWith(req.headers)
    expect(mockRateLimit).toHaveBeenCalledWith(`api:metrics/track:${ip}`, {
      limit: 10,
      windowSeconds: 60,
    })
  })

  // -------------------------------------------------------------------------
  // 8. Rate-limited response carries rate limit headers
  // -------------------------------------------------------------------------
  it('should include rate limit headers in 429 response', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '10',
        'X-RateLimit-Remaining': '0',
        'Retry-After': '55',
      }),
    })

    const req = createTrackRequest()
    const response = await POST(req)

    expect(response.status).toBe(429)
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
    expect(response.headers.get('Retry-After')).toBe('55')
  })

  // -------------------------------------------------------------------------
  // 9. Error response does NOT include rate limit headers
  // -------------------------------------------------------------------------
  it('should not include rate limit headers when an error occurs', async () => {
    mockRateLimit.mockRejectedValue(new Error('boom'))

    const req = createTrackRequest()
    const response = await POST(req)

    expect(response.status).toBe(500)
    expect(response.headers.get('X-RateLimit-Limit')).toBeNull()
    expect(response.headers.get('X-RateLimit-Remaining')).toBeNull()
  })

  // -------------------------------------------------------------------------
  // 10. trackVisitor error is caught by outer try/catch
  // -------------------------------------------------------------------------
  it('should return 500 if trackVisitor throws', async () => {
    const err = new Error('trackVisitor exploded')
    mockTrackVisitor.mockImplementation(() => {
      throw err
    })

    const req = createTrackRequest()
    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Internal server error' })
    expect(logger.error).toHaveBeenCalledWith(
      '[Track Visitor API Error]',
      err
    )
  })

  // -------------------------------------------------------------------------
  // 11. Different IPs produce different visitor hashes
  // -------------------------------------------------------------------------
  it('should produce different hashes for different IPs with the same user-agent', async () => {
    const ua = 'SharedBrowser/1.0'

    // First request with IP A
    mockGetClientIp.mockReturnValue('1.1.1.1')
    await POST(createTrackRequest({ userAgent: ua }))

    // Second request with IP B
    mockGetClientIp.mockReturnValue('2.2.2.2')
    await POST(createTrackRequest({ userAgent: ua }))

    const hashA = mockTrackVisitor.mock.calls[0][0] as string
    const hashB = mockTrackVisitor.mock.calls[1][0] as string

    expect(hashA).not.toBe(hashB)
    expect(hashA).toBe(expectedVisitorHash('1.1.1.1', ua))
    expect(hashB).toBe(expectedVisitorHash('2.2.2.2', ua))
  })

  // -------------------------------------------------------------------------
  // 12. Different user-agents produce different visitor hashes
  // -------------------------------------------------------------------------
  it('should produce different hashes for different user-agents with the same IP', async () => {
    mockGetClientIp.mockReturnValue('9.9.9.9')

    await POST(createTrackRequest({ userAgent: 'BrowserA/1.0' }))
    await POST(createTrackRequest({ userAgent: 'BrowserB/2.0' }))

    const hashA = mockTrackVisitor.mock.calls[0][0] as string
    const hashB = mockTrackVisitor.mock.calls[1][0] as string

    expect(hashA).not.toBe(hashB)
    expect(hashA).toBe(expectedVisitorHash('9.9.9.9', 'BrowserA/1.0'))
    expect(hashB).toBe(expectedVisitorHash('9.9.9.9', 'BrowserB/2.0'))
  })
})
