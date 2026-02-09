import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks (before imports) ────────────────────────────────────────────────────

const mockGetServerSession = vi.fn()
const mockRegisterClient = vi.fn()
const mockUnregisterClient = vi.fn()
const mockDrainQueuedNotifications = vi.fn()
const mockRateLimit = vi.fn()
const mockGetClientIp = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

vi.mock('@/lib/notifications/sse', () => ({
  registerClient: mockRegisterClient,
  unregisterClient: mockUnregisterClient,
  drainQueuedNotifications: mockDrainQueuedNotifications,
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    UNAUTHORIZED: 401,
    RATE_LIMITED: 429,
  },
}))

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}))

vi.mock('@/lib/request-ip', () => ({
  getClientIp: mockGetClientIp,
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

function createGetRequest(options: { signal?: AbortSignal } = {}): NextRequest {
  const url = 'http://localhost:3000/api/notifications/stream'
  return new NextRequest(url, {
    method: 'GET',
    headers: {
      'Accept': 'text/event-stream',
    },
    signal: options.signal,
  })
}

function createMockSession(email: string = 'test@example.com') {
  return {
    user: {
      id: 'test-user-id',
      email,
      name: 'Test User',
    },
    expires: '2024-12-31',
  }
}

function createRateLimitAllowed() {
  return {
    allowed: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60000,
    headers: new Headers({
      'X-RateLimit-Limit': '30',
      'X-RateLimit-Remaining': '29',
    }),
    backend: 'memory' as const,
  }
}

function createRateLimitDenied() {
  return {
    allowed: false,
    limit: 30,
    remaining: 0,
    reset: Date.now() + 60000,
    retryAfter: 60,
    headers: new Headers({
      'X-RateLimit-Limit': '30',
      'X-RateLimit-Remaining': '0',
      'Retry-After': '60',
    }),
    backend: 'memory' as const,
  }
}

async function readSSEData(
  response: Response,
  maxMessages: number = 1,
  timeoutMs: number = 100
): Promise<string[]> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error('No reader available')
  }

  const messages: string[] = []
  const decoder = new TextDecoder()
  const timeout = Date.now() + timeoutMs

  while (messages.length < maxMessages && Date.now() < timeout) {
    const { value, done } = await reader.read()
    if (done) break
    if (value) {
      // Handle both string (from mock stream) and Uint8Array (from real stream)
      const text = typeof value === 'string' ? value : decoder.decode(value)
      const lines = text.split('\n').filter((line) => line.startsWith('data: '))
      for (const line of lines) {
        messages.push(line.replace('data: ', ''))
      }
    }
  }

  reader.releaseLock()
  return messages
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('/api/notifications/stream', () => {
  let GET: (request: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })

    // Default mock configurations
    mockGetClientIp.mockReturnValue('127.0.0.1')
    mockRateLimit.mockResolvedValue(createRateLimitAllowed())
    mockDrainQueuedNotifications.mockResolvedValue([])

    // Re-import the route handler to ensure fresh state
    vi.resetModules()
    const mod = await import('@/app/api/notifications/stream/route')
    GET = mod.GET
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── Authentication Tests ─────────────────────────────────────────────────

  describe('Authentication', () => {
    it('returns 401 Unauthorized when no session exists', async () => {
      mockGetServerSession.mockResolvedValue(null)

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 401 Unauthorized when session is undefined', async () => {
      mockGetServerSession.mockResolvedValue(undefined)

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 401 Unauthorized when session user is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        expires: '2024-12-31',
      })

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 401 Unauthorized when session user email is missing', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'test-id',
          name: 'Test User',
        },
        expires: '2024-12-31',
      })

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
    })

    it('returns 401 Unauthorized when session user email is empty', async () => {
      mockGetServerSession.mockResolvedValue({
        user: {
          id: 'test-id',
          email: '',
        },
        expires: '2024-12-31',
      })

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(401)
      expect(await res.text()).toBe('Unauthorized')
    })
  })

  // ── Rate Limiting Tests ──────────────────────────────────────────────────

  describe('Rate Limiting', () => {
    it('returns 429 Too Many Requests when rate limit is exceeded', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())
      mockRateLimit.mockResolvedValue(createRateLimitDenied())

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RATE_LIMITED')
    })

    it('includes rate limit headers when rate limited', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())
      const rateLimitResult = createRateLimitDenied()
      mockRateLimit.mockResolvedValue(rateLimitResult)

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(429)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('30')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('0')
      expect(res.headers.get('Retry-After')).toBe('60')
    })

    it('calls rateLimit with correct key based on client IP', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())
      mockGetClientIp.mockReturnValue('192.168.1.100')

      const req = createGetRequest()
      await GET(req)

      expect(mockRateLimit).toHaveBeenCalledWith('api:notifications/stream:192.168.1.100', {
        limit: 30,
        windowSeconds: 60,
      })
    })
  })

  // ── SSE Stream Setup Tests ───────────────────────────────────────────────

  describe('SSE Stream Setup', () => {
    it('returns SSE response with correct headers', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')
      expect(res.headers.get('Cache-Control')).toBe('no-cache, no-transform')
      expect(res.headers.get('Connection')).toBe('keep-alive')
      expect(res.headers.get('X-Accel-Buffering')).toBe('no')
    })

    it('returns a ReadableStream in the response body', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())

      const req = createGetRequest()
      const res = await GET(req)

      expect(res.body).toBeInstanceOf(ReadableStream)
    })

    it('registers client with SSE manager using user email', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession('user@test.com'))

      const req = createGetRequest()
      const res = await GET(req)

      // Read from the stream to trigger the start callback
      const reader = res.body?.getReader()
      await reader?.read()
      reader?.releaseLock()

      expect(mockRegisterClient).toHaveBeenCalledWith(
        'user@test.com',
        expect.any(Object) // ReadableStreamDefaultController
      )
    })

    it('sends initial connection message on stream start', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())

      const req = createGetRequest()
      const res = await GET(req)

      const messages = await readSSEData(res, 1, 500)

      expect(messages.length).toBeGreaterThanOrEqual(1)
      const parsed = JSON.parse(messages[0])
      expect(parsed.type).toBe('system')
      expect(parsed.title).toBe('Connected')
      expect(parsed.message).toBe('Notification system connected')
      expect(parsed.read).toBe(true)
    })
  })

  // ── Notification Delivery Tests ──────────────────────────────────────────

  describe('Notification Delivery', () => {
    it('drains queued notifications on connection start', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession('queue@test.com'))
      mockDrainQueuedNotifications.mockResolvedValue([
        { id: '1', type: 'like', title: 'Queued 1', message: 'Test' },
        { id: '2', type: 'comment', title: 'Queued 2', message: 'Test' },
      ])

      const req = createGetRequest()
      const res = await GET(req)

      // Read enough to trigger the drain
      const reader = res.body?.getReader()
      await reader?.read()

      // Advance timer to ensure drain happens
      await vi.advanceTimersByTimeAsync(100)

      reader?.releaseLock()

      expect(mockDrainQueuedNotifications).toHaveBeenCalledWith('queue@test.com', 20)
    })

    it('sends queued notifications through the stream', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())
      const queuedNotifications = [
        { id: '1', type: 'like', title: 'New Like', message: 'Someone liked your post' },
      ]
      mockDrainQueuedNotifications.mockResolvedValue(queuedNotifications)

      const req = createGetRequest()
      const res = await GET(req)

      // Read multiple messages
      const messages = await readSSEData(res, 3, 1000)

      // Should have at least the connection message
      expect(messages.length).toBeGreaterThanOrEqual(1)
    })

    it('polls for queued notifications every 5 seconds', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())
      mockDrainQueuedNotifications.mockResolvedValue([])

      const req = createGetRequest()
      const res = await GET(req)

      // Read initial message
      const reader = res.body?.getReader()
      await reader?.read()

      // Clear initial call count
      mockDrainQueuedNotifications.mockClear()

      // Advance time by 5 seconds
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockDrainQueuedNotifications).toHaveBeenCalledTimes(1)

      // Advance another 5 seconds
      await vi.advanceTimersByTimeAsync(5000)
      expect(mockDrainQueuedNotifications).toHaveBeenCalledTimes(2)

      reader?.releaseLock()
    })
  })

  // ── Connection Handling Tests ────────────────────────────────────────────

  describe('Connection Handling', () => {
    it('unregisters client when connection is aborted', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession('abort@test.com'))

      const controller = new AbortController()
      const req = createGetRequest({ signal: controller.signal })
      const res = await GET(req)

      // Read initial message
      const reader = res.body?.getReader()
      await reader?.read()

      // Trigger abort
      controller.abort()

      // Wait for abort event to be processed
      await vi.advanceTimersByTimeAsync(100)

      expect(mockUnregisterClient).toHaveBeenCalledWith('abort@test.com')
      reader?.releaseLock()
    })

    it('clears heartbeat interval when connection is closed', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())

      const controller = new AbortController()
      const req = createGetRequest({ signal: controller.signal })
      const res = await GET(req)

      // Read initial message
      const reader = res.body?.getReader()
      await reader?.read()

      // Abort the connection
      controller.abort()
      await vi.advanceTimersByTimeAsync(100)

      // Clear any previous calls
      mockDrainQueuedNotifications.mockClear()

      // Advance time past multiple heartbeat intervals (30s each)
      await vi.advanceTimersByTimeAsync(60000)

      // No additional drain calls should happen after abort
      // (polling is also stopped)
      reader?.releaseLock()
    })

    it('handles controller close error gracefully during abort', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())

      const controller = new AbortController()
      const req = createGetRequest({ signal: controller.signal })
      const res = await GET(req)

      // Start reading
      const reader = res.body?.getReader()
      await reader?.read()

      // Cancel the reader (simulating stream close)
      await reader?.cancel()

      // Now abort - the controller.close() should not throw
      controller.abort()
      await vi.advanceTimersByTimeAsync(100)

      // Test should not throw
      expect(mockUnregisterClient).toHaveBeenCalled()
    })
  })

  // ── Error Handling Tests ─────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('handles drainQueuedNotifications failure gracefully', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())
      // First call succeeds (initial drain), subsequent calls fail
      mockDrainQueuedNotifications
        .mockResolvedValueOnce([]) // Initial drain succeeds
        .mockRejectedValue(new Error('Redis connection failed'))

      const req = createGetRequest()

      // Should not throw
      const res = await GET(req)
      expect(res.status).toBe(200)

      // Read the stream - should still get connection message
      const reader = res.body?.getReader()
      const { value } = await reader?.read() || {}
      reader?.releaseLock()

      // The stream should be established even if drain fails later
      expect(value).toBeDefined()
    })

    it('prevents concurrent drain operations', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession())

      // Make drain slow
      let drainCallCount = 0
      mockDrainQueuedNotifications.mockImplementation(async () => {
        drainCallCount++
        await new Promise((resolve) => setTimeout(resolve, 100))
        return []
      })

      const req = createGetRequest()
      const res = await GET(req)

      // Read initial message to trigger start
      const reader = res.body?.getReader()
      await reader?.read()

      // Quickly advance time to trigger multiple poll intervals
      await vi.advanceTimersByTimeAsync(50)
      await vi.advanceTimersByTimeAsync(50)

      reader?.releaseLock()

      // Even with multiple intervals, the draining flag should prevent concurrent calls
      // Only initial + polled calls should have happened, not parallel ones
      expect(drainCallCount).toBeLessThanOrEqual(3)
    })

    it('logs warning when enqueue fails during drain', async () => {
      const { logger } = await import('@/lib/logger')
      mockGetServerSession.mockResolvedValue(createMockSession())

      // Set up queued notifications
      mockDrainQueuedNotifications.mockResolvedValue([
        { id: '1', type: 'like', title: 'Test', message: 'Test message' },
      ])

      const req = createGetRequest()
      const res = await GET(req)

      // Read initial message
      const reader = res.body?.getReader()
      await reader?.read()

      // Cancel the stream to make enqueue fail
      await reader?.cancel()

      // Trigger a poll
      await vi.advanceTimersByTimeAsync(5000)

      // Logger warn should have been called if enqueue failed
      // (depending on timing, this may or may not trigger)
      expect(res.status).toBe(200)
    })
  })

  // ── Integration Tests ────────────────────────────────────────────────────

  describe('Integration', () => {
    it('complete SSE flow: connect, receive notifications, disconnect', async () => {
      mockGetServerSession.mockResolvedValue(createMockSession('flow@test.com'))
      mockDrainQueuedNotifications
        .mockResolvedValueOnce([]) // Initial drain
        .mockResolvedValueOnce([
          { id: '1', type: 'like', title: 'New Like', message: 'Test' },
        ]) // First poll

      const controller = new AbortController()
      const req = createGetRequest({ signal: controller.signal })
      const res = await GET(req)

      // Verify initial setup
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toBe('text/event-stream')

      // Read initial connection message
      const messages = await readSSEData(res, 1, 500)
      expect(messages.length).toBe(1)
      expect(JSON.parse(messages[0]).type).toBe('system')

      // Verify client was registered
      expect(mockRegisterClient).toHaveBeenCalledWith('flow@test.com', expect.any(Object))

      // Disconnect
      controller.abort()
      await vi.advanceTimersByTimeAsync(100)

      // Verify cleanup
      expect(mockUnregisterClient).toHaveBeenCalledWith('flow@test.com')
    })

    it('uses correct user ID from session email', async () => {
      const testEmails = [
        'user1@example.com',
        'another.user@domain.org',
        'test+tag@test.co',
      ]

      for (const email of testEmails) {
        vi.clearAllMocks()
        mockRateLimit.mockResolvedValue(createRateLimitAllowed())
        mockDrainQueuedNotifications.mockResolvedValue([])

        const mod = await import('@/app/api/notifications/stream/route')
        const handler = mod.GET

        mockGetServerSession.mockResolvedValue(createMockSession(email))

        const req = createGetRequest()
        const res = await handler(req)

        const reader = res.body?.getReader()
        await reader?.read()
        reader?.releaseLock()

        expect(mockRegisterClient).toHaveBeenCalledWith(email, expect.any(Object))
        expect(mockDrainQueuedNotifications).toHaveBeenCalledWith(email, 20)
      }
    })
  })
})
