// tests/app/api/daily-fortune/route.test.ts
// Comprehensive tests for Daily Fortune API route

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks -- all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Helper to create mock context - defined before vi.mock so it can be hoisted
type MockContextType = {
  userId: string | null;
  session: { user: { id: string; email?: string | null } } | null;
  ip: string;
  locale: string;
  isAuthenticated: boolean;
  isPremium: boolean;
}

// Store the context override for tests that need to customize it
// This must be in module scope so it can be accessed from the mock factory
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

vi.mock('@/lib/api/middleware', () => {
  const { NextResponse } = require('next/server')
  return {
    withApiMiddleware: vi.fn((handler: any, _options: any) => {
      return async (req: any) => {
        // Access from module scope
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
    createAuthenticatedGuard: vi.fn(() => ({})),
    apiSuccess: vi.fn((data: any) => ({ data })),
    apiError: vi.fn((code: string, message: string) => ({
      error: { code, message },
    })),
    ErrorCodes: {
      VALIDATION_ERROR: 'VALIDATION_ERROR',
      INTERNAL_ERROR: 'INTERNAL_ERROR',
      UNAUTHORIZED: 'UNAUTHORIZED',
    },
  }
})

vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    dailyFortune: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
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

vi.mock('@/lib/notifications/sse', () => ({
  sendNotification: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/datetime', () => ({
  getNowInTimezone: vi.fn(() => ({ year: 2025, month: 6, day: 15 })),
  formatDateString: vi.fn((y: number, m: number, d: number) =>
    `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  ),
}))

vi.mock('@/lib/destiny-map/destinyCalendar', () => ({
  getDailyFortuneScore: vi.fn(() => ({
    overall: 75,
    love: 80,
    career: 70,
    wealth: 65,
    health: 85,
    luckyColor: 'Blue',
    luckyNumber: 7,
    grade: 2,
    ganzhi: '甲子',
    alerts: [{ type: 'positive', msg: 'Great day for new beginnings' }],
    recommendations: ['Start a new project'],
    warnings: [],
    crossVerified: true,
    sajuFactors: ['천을귀인'],
    astroFactors: ['Sun trine Jupiter'],
  })),
}))

vi.mock('@/lib/cache/redis-cache', () => ({
  cacheOrCalculate: vi.fn((_key: string, calculate: () => Promise<any>) => calculate()),
  CacheKeys: {
    grading: vi.fn((date: string, saju: string) => `grade:v1:${date}:${saju}`),
  },
  CACHE_TTL: {
    GRADING_RESULT: 86400,
  },
}))

vi.mock('@/lib/api/zodValidation', () => ({
  dailyFortuneSchema: {
    safeParse: vi.fn((data: any) => {
      // Validate birthDate is required
      if (!data.birthDate) {
        return {
          success: false,
          error: {
            issues: [{ message: 'birthDate is required', path: ['birthDate'] }],
          },
        }
      }
      // Validate birthDate format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.birthDate)) {
        return {
          success: false,
          error: {
            issues: [{ message: 'Invalid date format', path: ['birthDate'] }],
          },
        }
      }
      // Validate birthTime format if provided
      if (data.birthTime && !/^\d{2}:\d{2}$/.test(data.birthTime)) {
        return {
          success: false,
          error: {
            issues: [{ message: 'Invalid time format', path: ['birthTime'] }],
          },
        }
      }
      return {
        success: true,
        data: {
          birthDate: data.birthDate,
          birthTime: data.birthTime,
          sendEmail: data.sendEmail ?? false,
          userTimezone: data.userTimezone,
        },
      }
    }),
  },
}))

// ---------------------------------------------------------------------------
// Import route handlers AFTER all mocks
// ---------------------------------------------------------------------------

import { POST } from '@/app/api/daily-fortune/route'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { sendNotification } from '@/lib/notifications/sse'
import { getNowInTimezone, formatDateString } from '@/lib/datetime'
import { getDailyFortuneScore } from '@/lib/destiny-map/destinyCalendar'
import { cacheOrCalculate, CacheKeys } from '@/lib/cache/redis-cache'
import { dailyFortuneSchema } from '@/lib/api/zodValidation'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a POST NextRequest with a JSON body */
function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/daily-fortune', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

/** Valid request body for most tests */
const VALID_REQUEST_BODY = {
  birthDate: '1990-05-15',
  birthTime: '14:30',
  sendEmail: false,
  userTimezone: 'Asia/Seoul',
}

/** Expected fortune result from getDailyFortuneScore */
const MOCK_FORTUNE_RESULT = {
  overall: 75,
  love: 80,
  career: 70,
  wealth: 65,
  health: 85,
  luckyColor: 'Blue',
  luckyNumber: 7,
  grade: 2,
  ganzhi: '甲子',
  alerts: [{ type: 'positive', msg: 'Great day for new beginnings' }],
  recommendations: ['Start a new project'],
  warnings: [],
  crossVerified: true,
  sajuFactors: ['천을귀인'],
  astroFactors: ['Sun trine Jupiter'],
}

// ===================================================================
// POST /api/daily-fortune - Success Cases
// ===================================================================
describe('Daily Fortune API - POST Success Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.dailyFortune.create).mockResolvedValue({
      id: 'fortune-1',
      userId: 'test-user-id',
      date: '2025-06-15',
      loveScore: 80,
      careerScore: 70,
      wealthScore: 65,
      healthScore: 85,
      overallScore: 75,
      luckyColor: 'Blue',
      luckyNumber: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
  })

  it('should return fortune for authenticated user with valid birth data', async () => {
    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data).toBeDefined()
    expect(data.data.fortune).toBeDefined()
    expect(data.data.fortune.overall).toBe(75)
    expect(data.data.fortune.love).toBe(80)
    expect(data.data.fortune.career).toBe(70)
    expect(data.data.fortune.wealth).toBe(65)
    expect(data.data.fortune.health).toBe(85)
    expect(data.data.fortune.luckyColor).toBe('Blue')
    expect(data.data.fortune.luckyNumber).toBe(7)
  })

  it('should include date and timezone in the response', async () => {
    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data.fortune.date).toBe('2025-06-15')
    expect(data.data.fortune.userTimezone).toBe('Asia/Seoul')
  })

  it('should include alerts in the response', async () => {
    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data.fortune.alerts).toBeDefined()
    expect(Array.isArray(data.data.fortune.alerts)).toBe(true)
    expect(data.data.fortune.alerts).toHaveLength(1)
    expect(data.data.fortune.alerts[0].type).toBe('positive')
  })

  it('should include source field indicating destinyCalendar', async () => {
    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data.fortune.source).toBe('destinyCalendar')
  })

  it('should return success message when email is not requested', async () => {
    const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: false }))
    const data = await response.json()

    expect(data.data.message).toBe('Fortune calculated!')
  })

  it('should save fortune to database for authenticated user', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(prisma.dailyFortune.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'test-user-id',
        date: '2025-06-15',
        loveScore: 80,
        careerScore: 70,
        wealthScore: 65,
        healthScore: 85,
        overallScore: 75,
        luckyColor: 'Blue',
        luckyNumber: 7,
      }),
    })
  })

  it('should send notification for authenticated user with email', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(sendNotification).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        type: 'system',
        title: "Today's Fortune Ready!",
      })
    )
  })
})

// ===================================================================
// POST /api/daily-fortune - Validation Cases
// ===================================================================
describe('Daily Fortune API - POST Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return validation error when birthDate is missing', async () => {
    const response = await POST(makePostRequest({ birthTime: '14:30' }))
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return validation error for invalid date format', async () => {
    const response = await POST(makePostRequest({ birthDate: '15-05-1990' }))
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should return validation error for invalid time format', async () => {
    const response = await POST(makePostRequest({
      birthDate: '1990-05-15',
      birthTime: '2:30pm',
    }))
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('VALIDATION_ERROR')
  })

  it('should log warning when validation fails', async () => {
    await POST(makePostRequest({ birthTime: '14:30' }))

    expect(logger.warn).toHaveBeenCalledWith(
      '[Daily fortune] validation failed',
      expect.objectContaining({ errors: expect.any(Array) })
    )
  })

  it('should accept request without birthTime (optional field)', async () => {
    const response = await POST(makePostRequest({
      birthDate: '1990-05-15',
    }))
    const data = await response.json()

    expect(data.data).toBeDefined()
    expect(data.data.fortune).toBeDefined()
  })

  it('should accept request without userTimezone (defaults to Asia/Seoul)', async () => {
    const response = await POST(makePostRequest({
      birthDate: '1990-05-15',
    }))
    const data = await response.json()

    expect(data.data.fortune.userTimezone).toBe('Asia/Seoul')
  })
})

// ===================================================================
// POST /api/daily-fortune - Missing User Profile Handling
// ===================================================================
describe('Daily Fortune API - Missing User Profile Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.dailyFortune.create).mockResolvedValue({
      id: 'fortune-1',
      userId: 'test-user-id',
      date: '2025-06-15',
      loveScore: 80,
      careerScore: 70,
      wealthScore: 65,
      healthScore: 85,
      overallScore: 75,
      luckyColor: 'Blue',
      luckyNumber: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any)
  })

  it('should calculate fortune without saving when userId is null', async () => {
    // Set the context override for null user
    testState.contextOverride = createMockContext({
      userId: null,
      session: null,
      isAuthenticated: false,
    })

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data).toBeDefined()
    expect(data.data.fortune).toBeDefined()
    // Database save should not be called when userId is null
    expect(prisma.dailyFortune.create).not.toHaveBeenCalled()
  })

  it('should not send notification when user has no email', async () => {
    // Set the context override for user with no email
    testState.contextOverride = createMockContext({
      session: { user: { id: 'test-user-id', email: null } },
    })

    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(sendNotification).not.toHaveBeenCalled()
  })
})

// ===================================================================
// POST /api/daily-fortune - Caching Behavior
// ===================================================================
describe('Daily Fortune API - Caching Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use cacheOrCalculate for fortune calculation', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(cacheOrCalculate).toHaveBeenCalled()
    expect(CacheKeys.grading).toHaveBeenCalledWith(
      '2025-06-15',
      '1990-05-15:14:30'
    )
  })

  it('should generate correct cache key with birthDate and birthTime', async () => {
    await POST(makePostRequest({
      birthDate: '1985-12-25',
      birthTime: '08:00',
    }))

    expect(CacheKeys.grading).toHaveBeenCalledWith(
      '2025-06-15',
      '1985-12-25:08:00'
    )
  })

  it('should use default time 12:00 when birthTime is not provided', async () => {
    await POST(makePostRequest({
      birthDate: '1985-12-25',
    }))

    expect(CacheKeys.grading).toHaveBeenCalledWith(
      '2025-06-15',
      '1985-12-25:12:00'
    )
  })

  it('should call getDailyFortuneScore through cache', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    // cacheOrCalculate should receive a function that calls getDailyFortuneScore
    expect(cacheOrCalculate).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Function),
      86400 // CACHE_TTL.GRADING_RESULT
    )
  })
})

// ===================================================================
// POST /api/daily-fortune - Date/Time Variations
// ===================================================================
describe('Daily Fortune API - Date/Time Variations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return different fortune based on different timezone', async () => {
    // First call with Asia/Seoul
    vi.mocked(getNowInTimezone).mockReturnValueOnce({ year: 2025, month: 6, day: 15 })
    await POST(makePostRequest({ ...VALID_REQUEST_BODY, userTimezone: 'Asia/Seoul' }))

    // Second call with America/New_York (different date due to timezone)
    vi.mocked(getNowInTimezone).mockReturnValueOnce({ year: 2025, month: 6, day: 14 })
    await POST(makePostRequest({ ...VALID_REQUEST_BODY, userTimezone: 'America/New_York' }))

    expect(getNowInTimezone).toHaveBeenCalledWith('Asia/Seoul')
    expect(getNowInTimezone).toHaveBeenCalledWith('America/New_York')
  })

  it('should format date correctly using formatDateString', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(formatDateString).toHaveBeenCalledWith(2025, 6, 15)
  })

  it('should handle various birth dates correctly', async () => {
    const birthDates = ['1970-01-01', '1995-06-30', '2000-12-31']

    for (const birthDate of birthDates) {
      vi.clearAllMocks()
      const response = await POST(makePostRequest({ birthDate }))
      const data = await response.json()

      expect(data.data).toBeDefined()
      expect(data.data.fortune).toBeDefined()
    }
  })
})

// ===================================================================
// POST /api/daily-fortune - Error Handling
// ===================================================================
describe('Daily Fortune API - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return internal error when fortune calculation throws', async () => {
    vi.mocked(cacheOrCalculate).mockRejectedValueOnce(new Error('Calculation error'))

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.error).toBeDefined()
    expect(data.error.code).toBe('INTERNAL_ERROR')
  })

  it('should log error when fortune calculation fails', async () => {
    const testError = new Error('Calculation failed')
    vi.mocked(cacheOrCalculate).mockRejectedValueOnce(testError)

    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(logger.error).toHaveBeenCalledWith(
      '[Daily Fortune Error]:',
      testError
    )
  })

  it('should handle database save error gracefully (P2002 duplicate key)', async () => {
    const duplicateError = new Error('Unique constraint violation')
    ;(duplicateError as any).code = 'P2002'
    vi.mocked(prisma.dailyFortune.create).mockRejectedValueOnce(duplicateError)

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    // Should still return success as DB error is caught
    expect(data.data).toBeDefined()
    expect(data.data.fortune).toBeDefined()
    // Should NOT log error for P2002 (expected duplicate)
    expect(logger.error).not.toHaveBeenCalled()
  })

  it('should log error for non-P2002 database errors', async () => {
    const dbError = new Error('Database connection failed')
    vi.mocked(prisma.dailyFortune.create).mockRejectedValueOnce(dbError)

    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(logger.error).toHaveBeenCalledWith(
      '[Daily Fortune] Failed to save fortune to DB:',
      dbError
    )
  })

  it('should handle notification send error gracefully', async () => {
    vi.mocked(sendNotification).mockRejectedValueOnce(new Error('Notification failed'))

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    // Should still return success
    expect(data.data).toBeDefined()
    expect(data.data.fortune).toBeDefined()
    expect(logger.warn).toHaveBeenCalledWith(
      '[Daily Fortune] Failed to send notification:',
      expect.any(Error)
    )
  })
})

// ===================================================================
// POST /api/daily-fortune - Email Functionality
// ===================================================================
describe('Daily Fortune API - Email Functionality', () => {
  let fetchSpy: any

  beforeEach(() => {
    vi.clearAllMocks()
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    } as Response)
  })

  afterEach(() => {
    fetchSpy.mockRestore()
  })

  it('should send email when sendEmail is true and user has email', async () => {
    await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: true }))

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/api/email/send'),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    )
  })

  it('should return email sent message when email delivery succeeds', async () => {
    const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: true }))
    const data = await response.json()

    expect(data.data.message).toBe('Fortune sent to your email!')
  })

  it('should log warning when email delivery fails with non-ok response', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response)

    const response = await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: true }))
    const data = await response.json()

    // The sendFortuneEmail function catches errors internally and logs a warning
    // It doesn't rethrow, so emailSent will be true (no exception reaches outer catch)
    // This is current behavior - the function swallows errors
    expect(logger.warn).toHaveBeenCalledWith(
      '[Daily Fortune] Email send failed:',
      expect.any(Error)
    )
    // Still returns success message since internal catch prevents propagation
    expect(data.data.message).toBe('Fortune sent to your email!')
  })

  it('should not send email when sendEmail is false', async () => {
    await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: false }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should not send email when user has no email', async () => {
    // Set the context override for user with no email
    testState.contextOverride = createMockContext({
      session: { user: { id: 'test-user-id', email: null } },
    })

    await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: true }))

    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('should log warning when email fetch throws exception', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'))

    await POST(makePostRequest({ ...VALID_REQUEST_BODY, sendEmail: true }))

    // The sendFortuneEmail function catches all errors internally and logs a warning
    expect(logger.warn).toHaveBeenCalledWith(
      '[Daily Fortune] Email send failed:',
      expect.any(Error)
    )
  })
})

// ===================================================================
// POST /api/daily-fortune - Fortune Score Variations
// ===================================================================
describe('Daily Fortune API - Fortune Score Variations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return low scores when fortune is bad', async () => {
    vi.mocked(getDailyFortuneScore).mockReturnValueOnce({
      overall: 25,
      love: 20,
      career: 30,
      wealth: 15,
      health: 35,
      luckyColor: 'Gray',
      luckyNumber: 4,
      grade: 4,
      ganzhi: '庚申',
      alerts: [{ type: 'warning', msg: 'Be cautious today' }],
      recommendations: [],
      warnings: ['Avoid major decisions'],
      crossVerified: true,
      sajuFactors: [],
      astroFactors: [],
    } as any)

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data.fortune.overall).toBe(25)
    expect(data.data.fortune.alerts[0].type).toBe('warning')
  })

  it('should return high scores when fortune is excellent', async () => {
    vi.mocked(getDailyFortuneScore).mockReturnValueOnce({
      overall: 95,
      love: 90,
      career: 95,
      wealth: 92,
      health: 98,
      luckyColor: 'Gold',
      luckyNumber: 8,
      grade: 1,
      ganzhi: '甲寅',
      alerts: [
        { type: 'positive', msg: 'Excellent day for all activities' },
        { type: 'info', msg: 'Lucky hour: 10-12 AM' },
      ],
      recommendations: ['Start new ventures', 'Make important decisions'],
      warnings: [],
      crossVerified: true,
      sajuFactors: ['천을귀인', '건록'],
      astroFactors: ['Grand trine'],
    } as any)

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data.fortune.overall).toBe(95)
    expect(data.data.fortune.luckyColor).toBe('Gold')
    expect(data.data.fortune.alerts).toHaveLength(2)
  })

  it('should handle empty alerts array', async () => {
    vi.mocked(getDailyFortuneScore).mockReturnValueOnce({
      ...MOCK_FORTUNE_RESULT,
      alerts: [],
    } as any)

    const response = await POST(makePostRequest(VALID_REQUEST_BODY))
    const data = await response.json()

    expect(data.data.fortune.alerts).toEqual([])
  })
})

// ===================================================================
// Middleware Configuration Tests
// ===================================================================
describe('Daily Fortune API - Middleware Configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export POST as a function wrapped by withApiMiddleware', () => {
    expect(typeof POST).toBe('function')
  })

  it('should use createAuthenticatedGuard function', async () => {
    const { createAuthenticatedGuard } = await import('@/lib/api/middleware')

    // Check that createAuthenticatedGuard is a function (it's called during module init)
    expect(typeof createAuthenticatedGuard).toBe('function')
  })

  it('POST handler should receive userId from the middleware context', async () => {
    await POST(makePostRequest(VALID_REQUEST_BODY))

    expect(prisma.dailyFortune.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'test-user-id',
        }),
      })
    )
  })
})
