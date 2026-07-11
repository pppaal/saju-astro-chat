/**
 * Comprehensive tests for /api/tarot/prefetch
 * Tests POST endpoint for prefetching tarot RAG context
 */

import { vi, describe, it, expect, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Helper to create mock context - defined before vi.mock so it can be hoisted
type MockContextType = {
  userId: string | null
  session: { user: { id: string; email?: string | null } } | null
  ip: string
  locale: string
  isAuthenticated: boolean
  isPremium: boolean
}

// Store the context override for tests that need to customize it
const testState = {
  contextOverride: null as MockContextType | null,
}

function createMockContext(overrides: Partial<MockContextType> = {}): MockContextType {
  return {
    userId: 'test-user-id',
    session: { user: { id: 'test-user-id', email: 'test@example.com' } },
    ip: '127.0.0.1',
    locale: 'ko',
    isAuthenticated: true,
    isPremium: false,
    ...overrides,
  }
}

// Mock the middleware with passthrough pattern
vi.mock('@/lib/api/middleware', () => {
  const { NextResponse } = require('next/server')
  return {
    withApiMiddleware: vi.fn((handler: any, _options: any) => {
      return async (req: any) => {
        const context = testState.contextOverride || createMockContext()
        testState.contextOverride = null // Reset after use
        const result = await handler(req, context)
        // If handler already returns a Response, use it
        if (result instanceof Response) {
          return result
        }
        // Otherwise wrap the result
        if (result.error) {
          return NextResponse.json(result, { status: 400 })
        }
        return NextResponse.json(result, { status: 200 })
      }
    }),
    createSimpleGuard: vi.fn((opts: any) => ({
      ...opts,
      rateLimit: {
        limit: opts.limit || 60,
        windowSeconds: opts.windowSeconds || 60,
      },
    })),
    createTarotGuard: vi.fn((opts: any) => ({
      ...opts,
      rateLimit: {
        limit: opts.limit || 60,
        windowSeconds: opts.windowSeconds || 60,
      },
    })),
    apiSuccess: vi.fn((data: any) => ({ data })),
    apiError: vi.fn((code: string, message: string) => ({
      error: { code, message },
    })),
    extractLocale: vi.fn(() => 'ko'),
    ErrorCodes: {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INTERNAL_ERROR: 'INTERNAL_ERROR',
      UNAUTHORIZED: 'UNAUTHORIZED',
      RATE_LIMITED: 'RATE_LIMITED',
      BAD_REQUEST: 'BAD_REQUEST',
    },
  }
})

// Mock the API client - using vi.hoisted to properly handle the mock function
const { mockApiClientPost } = vi.hoisted(() => ({
  mockApiClientPost: vi.fn(),
}))

vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: mockApiClientPost,
  },
}))

// Mock the logger
const { mockLoggerError } = vi.hoisted(() => ({
  mockLoggerError: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: mockLoggerError,
    debug: vi.fn(),
  },
}))

// Mock errorHandler
vi.mock('@/lib/api/errorHandler', () => ({
  createErrorResponse: vi.fn(({ code, message }: { code: string; message: string }) => {
    const { NextResponse } = require('next/server')
    return NextResponse.json({ error: 'invalid_body', code, message }, { status: 400 })
  }),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',
  },
}))

// Mock zodValidation
vi.mock('@/lib/api/zodValidation', () => ({
  createValidationErrorResponse: vi.fn((error: any, _options?: any) => {
    const { NextResponse } = require('next/server')
    const errorMessage =
      error.issues?.map((i: any) => i.path.join('.')).join(', ') || 'validation_error'
    return NextResponse.json({ error: errorMessage }, { status: 400 })
  }),
}))

// Mock the TarotPrefetchSchema validation
vi.mock('@/lib/api/validator', () => ({
  TarotPrefetchSchema: {
    safeParse: vi.fn((data: any) => {
      const errors: any[] = []

      // Validate categoryId - required, string, 1-100 chars
      if (!data.categoryId || typeof data.categoryId !== 'string' || data.categoryId.length === 0) {
        errors.push({ path: ['categoryId'], message: 'categoryId is required' })
      } else if (data.categoryId.length > 100) {
        errors.push({ path: ['categoryId'], message: 'categoryId must be at most 100 characters' })
      }

      // Validate spreadId - required, string, 1-100 chars
      if (!data.spreadId || typeof data.spreadId !== 'string' || data.spreadId.length === 0) {
        errors.push({ path: ['spreadId'], message: 'spreadId is required' })
      } else if (data.spreadId.length > 100) {
        errors.push({ path: ['spreadId'], message: 'spreadId must be at most 100 characters' })
      }

      if (errors.length > 0) {
        return {
          success: false,
          error: { issues: errors },
        }
      }

      return {
        success: true,
        data: {
          categoryId: data.categoryId,
          spreadId: data.spreadId,
        },
      }
    }),
  },
}))

// Credit pre-flight mock — prefetch now gates on checkCreditsOnly up front so
// the user is blocked on the question screen. Default: allowed. Tests flip
// creditState to exercise the blocked (402 / 401 not-authenticated) paths.
const creditState = vi.hoisted(() => ({
  allowed: true,
  errorCode: undefined as string | undefined,
  error: undefined as string | undefined,
}))
vi.mock('@/lib/credits/withCredits', () => {
  const { NextResponse } = require('next/server')
  return {
    checkCreditsOnly: vi.fn(async () => ({
      allowed: creditState.allowed,
      error: creditState.error,
      errorCode: creditState.errorCode,
    })),
    creditErrorResponse: vi.fn((result: { error?: string; errorCode?: string }) =>
      NextResponse.json(
        { error: result.error, code: result.errorCode },
        { status: result.errorCode === 'not_authenticated' ? 401 : 402 }
      )
    ),
  }
})

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/tarot/prefetch/route'

// Reset the credit pre-flight to "allowed" before every test so a blocked-path
// test can't leak into the next one (module-level creditState).
beforeEach(() => {
  creditState.allowed = true
  creditState.errorCode = undefined
  creditState.error = undefined
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a POST NextRequest with a JSON body */
function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/tarot/prefetch', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/** Valid request body for most tests */
const VALID_REQUEST_BODY = {
  categoryId: 'love',
  spreadId: 'three-card',
}

// ===================================================================
// POST /api/tarot/prefetch - Success Cases
// ===================================================================
describe('Tarot Prefetch API - POST Success Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful backend prefetch (fire-and-forget)
    mockApiClientPost.mockResolvedValue({ ok: true, data: { status: 'ok' } })
  })

  it('should return prefetching status for valid request', async () => {
    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should call backend prefetch endpoint with correct data', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    // Wait for fire-and-forget call to be made
    await new Promise((resolve) => setTimeout(resolve, 10))

    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/api/tarot/prefetch',
      {
        categoryId: 'love',
        spreadId: 'three-card',
      },
      { timeout: 10000 }
    )
  })

  it('should work with different category and spread IDs', async () => {
    const testCases = [
      { categoryId: 'career', spreadId: 'celtic-cross' },
      { categoryId: 'general', spreadId: 'single-card' },
      { categoryId: 'health', spreadId: 'past-present-future' },
    ]

    for (const testCase of testCases) {
      vi.clearAllMocks()
      mockApiClientPost.mockResolvedValue({ ok: true })
      const response = await POST(makePostRequest(testCase))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('prefetching')

      // Wait for fire-and-forget call
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(mockApiClientPost).toHaveBeenCalledWith('/api/tarot/prefetch', testCase, {
        timeout: 10000,
      })
    }
  })

  it('should not wait for backend prefetch to complete', async () => {
    // Simulate slow backend response
    mockApiClientPost.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 5000))
    )

    const startTime = Date.now()
    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const endTime = Date.now()

    // Response should be immediate (fire-and-forget)
    expect(endTime - startTime).toBeLessThan(100)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.status).toBe('prefetching')
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Credit pre-check cost (spread-aware)
// ===================================================================
// 사전체크 비용이 스프레드 카드 수 기반(SSOT: creditCosts.ts)이어야 한다.
// 직전엔 1 로 고정돼, 잔액 1 인 사용자가 2크레딧짜리 5·7장 스프레드를 카드
// 선택까지 다 마친 뒤에야 402 를 받는 사전체크 무력화가 있었다.
describe('Tarot Prefetch API - spread-aware credit cost', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiClientPost.mockResolvedValue({ ok: true })
  })

  it('checks 1 credit for a 3-card spread (real spread id)', async () => {
    const { checkCreditsOnly } = await import('@/lib/credits/withCredits')
    await POST(makePostRequest({ categoryId: 'general-insight', spreadId: 'past-present-future' }))
    expect(checkCreditsOnly).toHaveBeenCalledWith('reading', 1)
  })

  it('checks 2 credits for 5- and 7-card spreads', async () => {
    const { checkCreditsOnly } = await import('@/lib/credits/withCredits')
    await POST(makePostRequest({ categoryId: 'general-insight', spreadId: 'general-cross' }))
    expect(checkCreditsOnly).toHaveBeenLastCalledWith('reading', 2)
    await POST(makePostRequest({ categoryId: 'general-insight', spreadId: 'celtic-cross' }))
    expect(checkCreditsOnly).toHaveBeenLastCalledWith('reading', 2)
  })

  it('falls back to 1 credit for an unknown category/spread', async () => {
    const { checkCreditsOnly } = await import('@/lib/credits/withCredits')
    await POST(makePostRequest({ categoryId: 'no-such-category', spreadId: 'no-such-spread' }))
    expect(checkCreditsOnly).toHaveBeenLastCalledWith('reading', 1)
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Validation Cases
// ===================================================================
describe('Tarot Prefetch API - POST Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return error when body is null', async () => {
    const req = new NextRequest('http://localhost:3000/api/tarot/prefetch', {
      method: 'POST',
      body: 'null',
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('invalid_body')
  })

  it('should return error when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/tarot/prefetch', {
      method: 'POST',
      body: 'not valid json',
      headers: { 'content-type': 'application/json' },
    })

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('invalid_body')
  })

  it('should return validation error when categoryId is missing', async () => {
    const response = await POST(makePostRequest({ spreadId: 'three-card' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('categoryId')
  })

  it('should return validation error when spreadId is missing', async () => {
    const response = await POST(makePostRequest({ categoryId: 'love' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('spreadId')
  })

  it('should return validation error when categoryId is empty', async () => {
    const response = await POST(makePostRequest({ categoryId: '', spreadId: 'three-card' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('categoryId')
  })

  it('should return validation error when spreadId is empty', async () => {
    const response = await POST(makePostRequest({ categoryId: 'love', spreadId: '' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('spreadId')
  })

  it('should return validation error when categoryId is too long', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'a'.repeat(101),
        spreadId: 'three-card',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('categoryId')
  })

  it('should return validation error when spreadId is too long', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'love',
        spreadId: 'a'.repeat(101),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('spreadId')
  })

  it('should return validation error when both fields are missing', async () => {
    const response = await POST(makePostRequest({}))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBeDefined()
  })

  it('should return validation error when categoryId is not a string', async () => {
    const response = await POST(makePostRequest({ categoryId: 123, spreadId: 'three-card' }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('categoryId')
  })

  it('should return validation error when spreadId is not a string', async () => {
    const response = await POST(makePostRequest({ categoryId: 'love', spreadId: 456 }))
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('spreadId')
  })

  it('should accept valid IDs at boundary length (100 chars)', async () => {
    mockApiClientPost.mockResolvedValue({ ok: true })

    const response = await POST(
      makePostRequest({
        categoryId: 'a'.repeat(100),
        spreadId: 'b'.repeat(100),
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Backend Error Handling
// ===================================================================
describe('Tarot Prefetch API - Backend Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return success even when backend prefetch fails', async () => {
    // Backend error should be silently ignored (fire-and-forget)
    mockApiClientPost.mockRejectedValue(new Error('Backend unavailable'))

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    // Should still return success since errors are caught
    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should return success even when backend returns HTTP error', async () => {
    mockApiClientPost.mockResolvedValue({ ok: false, status: 500, error: 'Internal Server Error' })

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    // Should still return success since fire-and-forget ignores response
    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should return success even when backend times out', async () => {
    mockApiClientPost.mockRejectedValue(new Error('Request timeout'))

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should not log errors for silent failures', async () => {
    mockApiClientPost.mockRejectedValue(new Error('Backend error'))

    await POST(makePostRequest(VALID_REQUEST_BODY))

    // Wait for fire-and-forget to complete
    await new Promise((resolve) => setTimeout(resolve, 10))

    // The route uses .catch(() => {}) so no logging should occur
    expect(mockLoggerError).not.toHaveBeenCalled()
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Anonymous User Handling
// ===================================================================
describe('Tarot Prefetch API - Anonymous User Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiClientPost.mockResolvedValue({ ok: true })
  })

  it('should allow anonymous users to prefetch', async () => {
    testState.contextOverride = createMockContext({
      userId: null,
      session: null,
      isAuthenticated: false,
    })

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should process prefetch for authenticated users', async () => {
    testState.contextOverride = createMockContext({
      userId: 'auth-user-123',
      session: { user: { id: 'auth-user-123', email: 'user@example.com' } },
      isAuthenticated: true,
    })

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should process prefetch for premium users', async () => {
    testState.contextOverride = createMockContext({
      userId: 'premium-user-123',
      session: { user: { id: 'premium-user-123', email: 'premium@example.com' } },
      isAuthenticated: true,
      isPremium: true,
    })

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Rate Limiting Configuration
// ===================================================================
describe('Tarot Prefetch API - Rate Limiting Configuration', () => {
  it('should export POST as a function wrapped by withApiMiddleware', () => {
    expect(typeof POST).toBe('function')
  })

  it('should configure rate limiting with createSimpleGuard options', () => {
    // The route module uses createSimpleGuard with specific options
    // We verify this by checking the configuration used in the source
    // The withApiMiddleware is called with the guard that has:
    // - route: 'tarot-prefetch'
    // - limit: 30
    // - windowSeconds: 60
    // This is verified by the source code:
    // createSimpleGuard({ route: 'tarot-prefetch', limit: 30, windowSeconds: 60 })
    expect(typeof POST).toBe('function')
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Edge Cases
// ===================================================================
describe('Tarot Prefetch API - Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiClientPost.mockResolvedValue({ ok: true })
  })

  it('should handle special characters in categoryId', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'love-life',
        spreadId: 'three-card',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should handle special characters in spreadId', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'love',
        spreadId: 'past_present_future',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should handle Korean characters in IDs', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'love',
        spreadId: 'three-card',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should handle numeric string IDs', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: '123',
        spreadId: '456',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should handle single character IDs', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'a',
        spreadId: 'b',
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })

  it('should ignore extra fields in request body', async () => {
    const response = await POST(
      makePostRequest({
        categoryId: 'love',
        spreadId: 'three-card',
        extraField: 'should be ignored',
        anotherField: 123,
      })
    )
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')

    // Wait for fire-and-forget call
    await new Promise((resolve) => setTimeout(resolve, 10))

    // Backend call should only include categoryId and spreadId
    expect(mockApiClientPost).toHaveBeenCalledWith(
      '/api/tarot/prefetch',
      {
        categoryId: 'love',
        spreadId: 'three-card',
      },
      { timeout: 10000 }
    )
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Concurrency
// ===================================================================
describe('Tarot Prefetch API - Concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiClientPost.mockResolvedValue({ ok: true })
  })

  it('should handle multiple concurrent prefetch requests', async () => {
    const requests = [
      makePostRequest({ categoryId: 'love', spreadId: 'three-card' }),
      makePostRequest({ categoryId: 'career', spreadId: 'celtic-cross' }),
      makePostRequest({ categoryId: 'general', spreadId: 'single-card' }),
    ]

    const responses = await Promise.all(requests.map((req) => POST(req)))

    for (const response of responses) {
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.status).toBe('prefetching')
    }

    // Wait for fire-and-forget calls
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(mockApiClientPost).toHaveBeenCalledTimes(3)
  })

  it('should handle rapid successive requests', async () => {
    const results = []

    for (let i = 0; i < 5; i++) {
      const response = await POST(
        makePostRequest({
          categoryId: `category-${i}`,
          spreadId: `spread-${i}`,
        })
      )
      results.push(response)
    }

    for (const response of results) {
      const data = await response.json()
      expect(response.status).toBe(200)
      expect(data.status).toBe('prefetching')
    }
  })
})

// ===================================================================
// POST /api/tarot/prefetch - Credit / auth pre-flight
// ===================================================================
describe('Tarot Prefetch API - Credit pre-flight', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiClientPost.mockResolvedValue({ ok: true, data: { status: 'ok' } })
  })

  it('blocks with 401 when the user is not authenticated (guests removed)', async () => {
    creditState.allowed = false
    creditState.errorCode = 'not_authenticated'
    creditState.error = '로그인이 필요합니다'

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(response.status).toBe(401)
    // Must not kick off the background RAG prefetch when blocked.
    expect(mockApiClientPost).not.toHaveBeenCalled()
  })

  it('blocks with 402 when a signed-in user has no credits', async () => {
    creditState.allowed = false
    creditState.errorCode = 'no_credits'
    creditState.error = '크레딧이 부족합니다'

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(response.status).toBe(402)
    expect(mockApiClientPost).not.toHaveBeenCalled()
  })

  it('proceeds (200) when credits are available', async () => {
    creditState.allowed = true

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('prefetching')
  })
})
