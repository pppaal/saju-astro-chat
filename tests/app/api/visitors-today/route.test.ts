// tests/app/api/visitors-today/route.test.ts
// Comprehensive tests for Visitors Today API (GET/POST /api/visitors-today)

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}))

vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    UNAUTHORIZED: 401,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  metricsTokenSchema: {
    safeParse: vi.fn((data: { 'x-metrics-token'?: string | null }) => {
      const token = data['x-metrics-token']
      // Reject null tokens but allow undefined/strings
      if (token === null) {
        return { success: false, error: { issues: [{ message: 'Invalid token format' }] } }
      }
      return { success: true, data }
    }),
  },
}))

// Mock Firebase modules
const mockGetApps = vi.fn()
const mockGetApp = vi.fn()
const mockInitializeApp = vi.fn()
const mockGetFirestore = vi.fn()
const mockGetAuth = vi.fn()
const mockSignInAnonymously = vi.fn()
const mockSignInWithCustomToken = vi.fn()
const mockDoc = vi.fn()
const mockGetDoc = vi.fn()
const mockSetDoc = vi.fn()
const mockIncrement = vi.fn()

vi.mock('firebase/app', () => ({
  getApps: () => mockGetApps(),
  getApp: () => mockGetApp(),
  initializeApp: (config: unknown) => mockInitializeApp(config),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: (app: unknown) => mockGetFirestore(app),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDoc: (ref: unknown) => mockGetDoc(ref),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  increment: (n: number) => mockIncrement(n),
}))

vi.mock('firebase/auth', () => ({
  getAuth: (app: unknown) => mockGetAuth(app),
  signInAnonymously: (auth: unknown) => mockSignInAnonymously(auth),
  signInWithCustomToken: (auth: unknown, token: string) => mockSignInWithCustomToken(auth, token),
}))

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { captureServerError } from '@/lib/telemetry'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { logger } from '@/lib/logger'
import { metricsTokenSchema } from '@/lib/api/zodValidation'

// Get typed mocks
const mockRateLimit = vi.mocked(rateLimit)
const mockGetClientIp = vi.mocked(getClientIp)
const mockCaptureServerError = vi.mocked(captureServerError)
const mockCacheGet = vi.mocked(cacheGet)
const mockCacheSet = vi.mocked(cacheSet)
const mockMetricsTokenSchema = vi.mocked(metricsTokenSchema)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createRequest(
  method: 'GET' | 'POST',
  options?: {
    metricsToken?: string
    ip?: string
  }
): NextRequest {
  const headers: Record<string, string> = {}
  if (options?.metricsToken) {
    headers['x-metrics-token'] = options.metricsToken
  }
  return new NextRequest('http://localhost:3000/api/visitors-today', {
    method,
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

// Mock Firestore document data
interface MockDocSnap {
  exists: () => boolean
  data: () => { count: number } | undefined
}

function createMockDocSnap(exists: boolean, count?: number): MockDocSnap {
  return {
    exists: () => exists,
    data: () => (exists ? { count: count ?? 0 } : undefined),
  }
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('/api/visitors-today', () => {
  const DEFAULT_IP = '192.168.1.100'
  const VALID_TOKEN = 'test-metrics-token'

  // Store original env
  const originalEnv = { ...process.env }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Reset environment
    process.env = { ...originalEnv }
    process.env.PUBLIC_METRICS_TOKEN = VALID_TOKEN
    process.env.NEXT_PUBLIC_FIREBASE_CONFIG = JSON.stringify({
      apiKey: 'test-api-key',
      projectId: 'test-project',
    })

    // Default mock implementations
    mockGetClientIp.mockReturnValue(DEFAULT_IP)

    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: makeRateLimitHeaders({
        'X-RateLimit-Limit': '30',
        'X-RateLimit-Remaining': '29',
        'X-RateLimit-Reset': '1700000060',
      }),
    })

    // Firebase mocks
    mockGetApps.mockReturnValue([{ name: 'test-app' }])
    mockGetApp.mockReturnValue({ name: 'test-app' })
    mockGetFirestore.mockReturnValue({ type: 'firestore' })
    mockGetAuth.mockReturnValue({ currentUser: { uid: 'test-user' } })
    mockDoc.mockReturnValue({ path: 'test-doc-path' })
    mockGetDoc.mockResolvedValue(createMockDocSnap(true, 100))
    mockSetDoc.mockResolvedValue(undefined)
    mockIncrement.mockReturnValue({ _increment: 1 })
    mockSignInAnonymously.mockResolvedValue({ user: { uid: 'anon-user' } })

    // Cache mocks
    mockCacheGet.mockResolvedValue(null)
    mockCacheSet.mockResolvedValue(undefined)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  // ===========================================================================
  // GET /api/visitors-today Tests
  // ===========================================================================

  describe('GET /api/visitors-today', () => {
    // -------------------------------------------------------------------------
    // 1. Successful visitor count retrieval
    // -------------------------------------------------------------------------
    it('should return visitor count from Firestore when cache is empty', async () => {
      // Setup: today doc has 150 visitors, total has 5000
      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnap(true, 150)) // today
        .mockResolvedValueOnce(createMockDocSnap(true, 5000)) // total

      // Dynamically import after mocks
      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ count: 150, total: 5000 })
      expect(mockCacheGet).toHaveBeenCalledWith('visitors:stats')
      expect(mockCacheSet).toHaveBeenCalledWith(
        'visitors:stats',
        { count: 150, total: 5000 },
        30
      )
    })

    // -------------------------------------------------------------------------
    // 2. Cached response
    // -------------------------------------------------------------------------
    it('should return cached visitor count when cache hit', async () => {
      mockCacheGet.mockResolvedValue({ count: 200, total: 6000 })

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ count: 200, total: 6000, cached: true })
      // Firestore should NOT be queried
      expect(mockGetDoc).not.toHaveBeenCalled()
      expect(mockCacheSet).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // 3. Documents don't exist (first visitor of the day)
    // -------------------------------------------------------------------------
    it('should return count 0 when Firestore documents do not exist', async () => {
      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnap(false)) // today doesn't exist
        .mockResolvedValueOnce(createMockDocSnap(false)) // total doesn't exist

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ count: 0, total: 0 })
    })

    // -------------------------------------------------------------------------
    // 4. Rate limited (429)
    // -------------------------------------------------------------------------
    it('should return 429 when rate limited', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        headers: makeRateLimitHeaders({
          'X-RateLimit-Limit': '30',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        }),
      })

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data).toEqual({ error: 'Too many requests' })
      expect(mockCacheGet).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // 5. Unauthorized (401) - missing token
    // -------------------------------------------------------------------------
    it('should return 401 when metrics token is missing and token is required', async () => {
      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET') // no token
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    // -------------------------------------------------------------------------
    // 6. Unauthorized (401) - invalid token
    // -------------------------------------------------------------------------
    it('should return 401 when metrics token is invalid', async () => {
      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: 'wrong-token' })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
    })

    // -------------------------------------------------------------------------
    // 7. Allow access when no token is configured
    // -------------------------------------------------------------------------
    it('should allow access when no metrics token is configured in env', async () => {
      // Clear both token env vars
      delete process.env.PUBLIC_METRICS_TOKEN
      delete process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN

      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnap(true, 50))
        .mockResolvedValueOnce(createMockDocSnap(true, 1000))

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET') // no token needed
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ count: 50, total: 1000 })
    })

    // -------------------------------------------------------------------------
    // 8. Graceful fallback when Firebase is not configured
    // -------------------------------------------------------------------------
    it('should return disabled flag when Firebase is not configured', async () => {
      // Clear Firebase config
      delete process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      // Also remove configured token to allow request
      delete process.env.PUBLIC_METRICS_TOKEN

      // Force re-import to trigger initialization without Firebase
      vi.resetModules()
      mockGetApps.mockReturnValue([])

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ count: 0, total: 0, disabled: true })
    })

    // -------------------------------------------------------------------------
    // 9. Internal server error (500)
    // -------------------------------------------------------------------------
    it('should return 500 when an unexpected error occurs', async () => {
      const thrownError = new Error('Firestore connection failed')
      mockCacheGet.mockRejectedValue(thrownError)

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockCaptureServerError).toHaveBeenCalledWith(thrownError, {
        route: '/api/visitors-today',
        method: 'GET',
      })
    })

    // -------------------------------------------------------------------------
    // 10. Includes rate limit headers in response
    // -------------------------------------------------------------------------
    it('should include rate limit headers in successful response', async () => {
      mockCacheGet.mockResolvedValue({ count: 10, total: 100 })

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('30')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('29')
      expect(response.headers.get('X-RateLimit-Reset')).toBe('1700000060')
    })

    // -------------------------------------------------------------------------
    // 11. Rate limit key includes IP
    // -------------------------------------------------------------------------
    it('should call rateLimit with correct key and options', async () => {
      const ip = '10.20.30.40'
      mockGetClientIp.mockReturnValue(ip)
      mockCacheGet.mockResolvedValue({ count: 5, total: 50 })

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      await GET(req)

      expect(mockGetClientIp).toHaveBeenCalledWith(req.headers)
      expect(mockRateLimit).toHaveBeenCalledWith(`visitors:get:${ip}`, {
        limit: 30,
        windowSeconds: 60,
      })
    })

    // -------------------------------------------------------------------------
    // 12. Token validation with NEXT_PUBLIC prefix
    // -------------------------------------------------------------------------
    it('should accept token matching NEXT_PUBLIC_PUBLIC_METRICS_TOKEN', async () => {
      const publicToken = 'public-metrics-token'
      process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN = publicToken
      delete process.env.PUBLIC_METRICS_TOKEN

      mockCacheGet.mockResolvedValue({ count: 25, total: 250 })

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: publicToken })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.count).toBe(25)
    })
  })

  // ===========================================================================
  // POST /api/visitors-today Tests
  // ===========================================================================

  describe('POST /api/visitors-today', () => {
    // -------------------------------------------------------------------------
    // 1. Successful visitor increment
    // -------------------------------------------------------------------------
    it('should increment visitor count and return success', async () => {
      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST', { metricsToken: VALID_TOKEN })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true })
      expect(mockSetDoc).toHaveBeenCalledTimes(2) // today + total
      expect(mockIncrement).toHaveBeenCalledWith(1)
    })

    // -------------------------------------------------------------------------
    // 2. Cache invalidation after POST
    // -------------------------------------------------------------------------
    it('should invalidate cache after successful POST', async () => {
      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST', { metricsToken: VALID_TOKEN })
      await POST(req)

      expect(mockCacheSet).toHaveBeenCalledWith(
        'visitors:stats',
        { invalidated: true },
        1
      )
    })

    // -------------------------------------------------------------------------
    // 3. Rate limited (429) on POST
    // -------------------------------------------------------------------------
    it('should return 429 when POST is rate limited', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        headers: makeRateLimitHeaders({
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '45',
        }),
      })

      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST', { metricsToken: VALID_TOKEN })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data).toEqual({ error: 'Too many requests' })
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // 4. Unauthorized (401) on POST
    // -------------------------------------------------------------------------
    it('should return 401 when POST lacks valid token', async () => {
      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST') // no token
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // 5. Graceful fallback when Firebase disabled
    // -------------------------------------------------------------------------
    it('should return disabled flag when Firebase is not configured on POST', async () => {
      delete process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      delete process.env.PUBLIC_METRICS_TOKEN

      vi.resetModules()
      mockGetApps.mockReturnValue([])

      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST')
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, disabled: true })
      expect(mockSetDoc).not.toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // 6. Internal server error (500) on POST
    // -------------------------------------------------------------------------
    it('should return 500 when Firestore write fails', async () => {
      const thrownError = new Error('Write permission denied')
      mockSetDoc.mockRejectedValue(thrownError)

      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST', { metricsToken: VALID_TOKEN })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockCaptureServerError).toHaveBeenCalledWith(thrownError, {
        route: '/api/visitors-today',
        method: 'POST',
      })
    })

    // -------------------------------------------------------------------------
    // 7. POST rate limit has different limits than GET
    // -------------------------------------------------------------------------
    it('should use different rate limit for POST requests', async () => {
      const ip = '172.16.0.1'
      mockGetClientIp.mockReturnValue(ip)

      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST', { metricsToken: VALID_TOKEN })
      await POST(req)

      expect(mockRateLimit).toHaveBeenCalledWith(`visitors:post:${ip}`, {
        limit: 20,
        windowSeconds: 60,
      })
    })

    // -------------------------------------------------------------------------
    // 8. Rate limit headers included in 429 POST response
    // -------------------------------------------------------------------------
    it('should include rate limit headers in 429 POST response', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        headers: makeRateLimitHeaders({
          'X-RateLimit-Limit': '20',
          'X-RateLimit-Remaining': '0',
          'Retry-After': '30',
        }),
      })

      const { POST } = await import('@/app/api/visitors-today/route')

      const req = createRequest('POST', { metricsToken: VALID_TOKEN })
      const response = await POST(req)

      expect(response.status).toBe(429)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('20')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(response.headers.get('Retry-After')).toBe('30')
    })
  })

  // ===========================================================================
  // Token Validation Tests
  // ===========================================================================

  describe('Token Validation', () => {
    // -------------------------------------------------------------------------
    // 1. Invalid token header format
    // -------------------------------------------------------------------------
    it('should return 401 when token header format is invalid', async () => {
      // Make Zod validation fail
      mockMetricsTokenSchema.safeParse.mockReturnValueOnce({
        success: false,
        error: { issues: [{ message: 'Invalid token format' }] },
      } as never)

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toEqual({ error: 'Unauthorized' })
      expect(logger.warn).toHaveBeenCalledWith(
        '[visitors-today] Invalid token header format'
      )
    })

    // -------------------------------------------------------------------------
    // 2. Either PUBLIC_METRICS_TOKEN or NEXT_PUBLIC works
    // -------------------------------------------------------------------------
    it('should accept token matching either env var', async () => {
      const serverToken = 'server-token'
      const publicToken = 'public-token'
      process.env.PUBLIC_METRICS_TOKEN = serverToken
      process.env.NEXT_PUBLIC_PUBLIC_METRICS_TOKEN = publicToken

      mockCacheGet.mockResolvedValue({ count: 1, total: 1 })

      const { GET } = await import('@/app/api/visitors-today/route')

      // Test server token
      let req = createRequest('GET', { metricsToken: serverToken })
      let response = await GET(req)
      expect(response.status).toBe(200)

      // Test public token
      req = createRequest('GET', { metricsToken: publicToken })
      response = await GET(req)
      expect(response.status).toBe(200)
    })
  })

  // ===========================================================================
  // Firebase Authentication Tests
  // ===========================================================================

  describe('Firebase Authentication', () => {
    // -------------------------------------------------------------------------
    // 1. Anonymous sign-in when no current user
    // -------------------------------------------------------------------------
    it('should sign in anonymously when no current user exists', async () => {
      mockGetAuth.mockReturnValue({ currentUser: null })
      mockSignInAnonymously.mockResolvedValue({ user: { uid: 'anon-123' } })

      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnap(true, 10))
        .mockResolvedValueOnce(createMockDocSnap(true, 100))

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      await GET(req)

      expect(mockSignInAnonymously).toHaveBeenCalled()
    })

    // -------------------------------------------------------------------------
    // 2. Skip auth when user already exists
    // -------------------------------------------------------------------------
    it('should skip authentication when current user exists', async () => {
      mockGetAuth.mockReturnValue({ currentUser: { uid: 'existing-user' } })

      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnap(true, 10))
        .mockResolvedValueOnce(createMockDocSnap(true, 100))

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      await GET(req)

      expect(mockSignInAnonymously).not.toHaveBeenCalled()
      expect(mockSignInWithCustomToken).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    // -------------------------------------------------------------------------
    // 1. Firestore not initialized error
    // -------------------------------------------------------------------------
    it('should handle Firestore not initialized error gracefully', async () => {
      // Simulate db being null through Firebase disabled path
      delete process.env.NEXT_PUBLIC_FIREBASE_CONFIG
      delete process.env.PUBLIC_METRICS_TOKEN
      vi.resetModules()
      mockGetApps.mockReturnValue([])

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET')
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.disabled).toBe(true)
    })

    // -------------------------------------------------------------------------
    // 2. Rate limit error is caught
    // -------------------------------------------------------------------------
    it('should return 500 when rateLimit throws an error', async () => {
      const rateLimitError = new Error('Redis unavailable')
      mockRateLimit.mockRejectedValue(rateLimitError)

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
      expect(mockCaptureServerError).toHaveBeenCalledWith(rateLimitError, {
        route: '/api/visitors-today',
        method: 'GET',
      })
    })

    // -------------------------------------------------------------------------
    // 3. Cache errors don't break the flow (GET)
    // -------------------------------------------------------------------------
    it('should return 500 when cache operations fail', async () => {
      const cacheError = new Error('Cache connection failed')
      mockCacheGet.mockRejectedValue(cacheError)

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      const response = await GET(req)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ error: 'Internal Server Error' })
    })
  })

  // ===========================================================================
  // KST Date Key Tests
  // ===========================================================================

  describe('Date Key Generation', () => {
    // -------------------------------------------------------------------------
    // 1. Uses KST timezone for date key
    // -------------------------------------------------------------------------
    it('should create document with KST date key format', async () => {
      mockGetDoc
        .mockResolvedValueOnce(createMockDocSnap(true, 1))
        .mockResolvedValueOnce(createMockDocSnap(true, 10))

      const { GET } = await import('@/app/api/visitors-today/route')

      const req = createRequest('GET', { metricsToken: VALID_TOKEN })
      await GET(req)

      // Verify doc() was called with a path containing a date format
      expect(mockDoc).toHaveBeenCalled()
      const calls = mockDoc.mock.calls
      // At least one call should have a date-like pattern in the path
      const hasDatePath = calls.some((call) => {
        const path = call[1] as string
        return /visitor_counts\/\d{4}-\d{2}-\d{2}/.test(path)
      })
      expect(hasDatePath).toBe(true)
    })
  })
})
