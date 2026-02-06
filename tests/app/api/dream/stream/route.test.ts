import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Mock streaming utilities
const mockCreateStreamRoute = vi.fn()

// Store the config passed to createStreamRoute so we can test its behavior
let capturedStreamRouteConfig: any = null

vi.mock('@/lib/streaming', () => ({
  createStreamRoute: (config: any) => {
    capturedStreamRouteConfig = config
    return mockCreateStreamRoute(config)
  },
}))

// Mock middleware
const mockCreatePublicStreamGuard = vi.fn(() => ({
  route: 'dream-stream',
  requireToken: true,
  rateLimit: { limit: 10, windowSeconds: 60 },
  credits: { type: 'reading', amount: 1 },
}))

vi.mock('@/lib/api/middleware', () => ({
  createPublicStreamGuard: (...args: unknown[]) => mockCreatePublicStreamGuard(...args),
}))

// Mock Zod validation schema
const mockDreamStreamSafeParse = vi.fn()

vi.mock('@/lib/api/zodValidation', () => ({
  dreamStreamSchema: {
    safeParse: (...args: unknown[]) => mockDreamStreamSafeParse(...args),
  },
}))

// Mock API utilities
vi.mock('@/lib/api', () => ({
  cleanStringArray: (arr: unknown) => {
    if (!Array.isArray(arr)) return []
    return arr.filter((item): item is string => typeof item === 'string' && item.trim() !== '')
  },
  isRecord: (val: unknown): val is Record<string, unknown> =>
    typeof val === 'object' && val !== null && !Array.isArray(val),
}))

// Mock next-auth
const mockGetServerSession = vi.fn()

vi.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock Prisma
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    reading: {
      create: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock constants
vi.mock('@/lib/constants/api-limits', () => ({
  BODY_LIMITS: {
    STREAM: 50000,
  },
  TEXT_LIMITS: {
    MAX_DREAM_TEXT: 5000,
  },
}))

vi.mock('@/lib/validation/patterns', () => ({
  DATE_RE: /^\d{4}-\d{2}-\d{2}$/,
  TIME_RE: /^\d{2}:\d{2}$/,
  LIMITS: {
    TIMEZONE: 50,
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks - the route module calls createStreamRoute at import time
// ---------------------------------------------------------------------------

// We need to dynamically import to capture the config
let routeModule: any

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_DREAM_STREAM_BODY = {
  dreamText: 'I was flying over the ocean and saw a great whale beneath the waves.',
  symbols: ['flying', 'ocean', 'whale'],
  emotions: ['wonder', 'freedom'],
  themes: ['liberation', 'exploration'],
  context: ['personal growth'],
  locale: 'ko',
  koreanTypes: ['taemong'],
  koreanLucky: ['lucky'],
  chinese: [],
  islamicTypes: [],
  western: [],
  hindu: [],
  japanese: [],
}

const MOCK_SESSION = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
  },
}

const MOCK_CONTEXT = {
  ip: '127.0.0.1',
  locale: 'ko',
  userId: 'user-123',
  session: MOCK_SESSION,
  isAuthenticated: true,
  isPremium: false,
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/dream/stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-public-token': 'valid-token',
    },
  })
}

// ===================================================================
// Tests for Route Configuration
// ===================================================================
describe('Dream Stream API - Route Configuration', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    // Reset modules to re-capture config
    vi.resetModules()

    // Re-mock before importing
    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
    }))

    // Import the route module fresh
    routeModule = await import('@/app/api/dream/stream/route')
  })

  describe('Stream Route Factory Configuration', () => {
    it('should configure route with correct name', () => {
      expect(capturedStreamRouteConfig).not.toBeNull()
      expect(capturedStreamRouteConfig.route).toBe('DreamStream')
    })

    it('should use createPublicStreamGuard with correct options', () => {
      expect(mockCreatePublicStreamGuard).toHaveBeenCalledWith({
        route: 'dream-stream',
        limit: 10,
        windowSeconds: 60,
        requireCredits: true,
        creditType: 'reading',
        creditAmount: 1,
      })
    })

    it('should configure fallback messages for both locales', () => {
      expect(capturedStreamRouteConfig.fallbackMessage).toEqual({
        ko: '일시적으로 꿈 해석 서비스를 이용할 수 없습니다. 잠시 후 다시 시도해주세요.',
        en: 'Dream interpretation service temporarily unavailable. Please try again later.',
      })
    })

    it('should set max body size from BODY_LIMITS.STREAM', () => {
      expect(capturedStreamRouteConfig.maxBodySize).toBe(50000)
    })

    it('should have buildPayload function defined', () => {
      expect(typeof capturedStreamRouteConfig.buildPayload).toBe('function')
    })

    it('should have afterStream function defined', () => {
      expect(typeof capturedStreamRouteConfig.afterStream).toBe('function')
    })
  })
})

// ===================================================================
// Tests for buildPayload Function
// ===================================================================
describe('Dream Stream API - buildPayload Function', () => {
  let buildPayload: (validated: any, context: any, req?: any, rawBody?: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
    }))

    await import('@/app/api/dream/stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Payload Building', () => {
    it('should return correct endpoint', async () => {
      const result = await buildPayload(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(result.endpoint).toBe('/api/dream/interpret-stream')
    })

    it('should include dream text in body', async () => {
      const result = await buildPayload(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(result.body.dream).toBe(VALID_DREAM_STREAM_BODY.dreamText)
    })

    it('should truncate dream text to max length', async () => {
      const longDream = 'A'.repeat(10000)
      const validated = { ...VALID_DREAM_STREAM_BODY, dreamText: longDream }

      const result = await buildPayload(validated, MOCK_CONTEXT)

      expect(result.body.dream.length).toBeLessThanOrEqual(5000)
    })

    it('should include cleaned arrays in body', async () => {
      const result = await buildPayload(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(result.body.symbols).toEqual(VALID_DREAM_STREAM_BODY.symbols)
      expect(result.body.emotions).toEqual(VALID_DREAM_STREAM_BODY.emotions)
      expect(result.body.themes).toEqual(VALID_DREAM_STREAM_BODY.themes)
      expect(result.body.context).toEqual(VALID_DREAM_STREAM_BODY.context)
    })

    it('should use validated locale or context locale', async () => {
      const result = await buildPayload(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(result.body.locale).toBe('ko')
    })

    it('should fallback to context locale when body locale is missing', async () => {
      const bodyWithoutLocale = { ...VALID_DREAM_STREAM_BODY }
      delete (bodyWithoutLocale as any).locale

      const result = await buildPayload(bodyWithoutLocale, MOCK_CONTEXT)

      expect(result.body.locale).toBe('ko')
    })

    it('should include cultural type arrays', async () => {
      const result = await buildPayload(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(result.body.koreanTypes).toEqual(['taemong'])
      expect(result.body.koreanLucky).toEqual(['lucky'])
      expect(result.body.chinese).toEqual([])
      expect(result.body.islamicTypes).toEqual([])
      expect(result.body.western).toEqual([])
      expect(result.body.hindu).toEqual([])
      expect(result.body.japanese).toEqual([])
    })

    it('should sanitize and include birth info when provided', async () => {
      const validatedWithBirth = {
        ...VALID_DREAM_STREAM_BODY,
        birth: {
          date: '1990-05-15',
          time: '10:30',
          timezone: 'Asia/Seoul',
          latitude: 37.5665,
          longitude: 126.978,
          gender: 'male',
        },
      }

      const result = await buildPayload(validatedWithBirth, MOCK_CONTEXT)

      expect(result.body.birth).toEqual({
        date: '1990-05-15',
        time: '10:30',
        timezone: 'Asia/Seoul',
        latitude: 37.5665,
        longitude: 126.978,
        gender: 'male',
      })
    })

    it('should exclude invalid birth date format', async () => {
      const validatedWithInvalidBirth = {
        ...VALID_DREAM_STREAM_BODY,
        birth: {
          date: 'invalid-date',
          time: '10:30',
        },
      }

      const result = await buildPayload(validatedWithInvalidBirth, MOCK_CONTEXT)

      // Date should be undefined due to validation failure
      expect(result.body.birth?.date).toBeUndefined()
    })

    it('should exclude invalid time format', async () => {
      const validatedWithInvalidTime = {
        ...VALID_DREAM_STREAM_BODY,
        birth: {
          date: '1990-05-15',
          time: 'invalid',
        },
      }

      const result = await buildPayload(validatedWithInvalidTime, MOCK_CONTEXT)

      expect(result.body.birth?.time).toBeUndefined()
    })

    it('should clamp latitude to valid range', async () => {
      const validatedWithInvalidLat = {
        ...VALID_DREAM_STREAM_BODY,
        birth: {
          latitude: 100, // Invalid: > 90
          longitude: 0,
        },
      }

      const result = await buildPayload(validatedWithInvalidLat, MOCK_CONTEXT)

      expect(result.body.birth?.latitude).toBeUndefined()
    })

    it('should clamp longitude to valid range', async () => {
      const validatedWithInvalidLon = {
        ...VALID_DREAM_STREAM_BODY,
        birth: {
          latitude: 0,
          longitude: 200, // Invalid: > 180
        },
      }

      const result = await buildPayload(validatedWithInvalidLon, MOCK_CONTEXT)

      expect(result.body.birth?.longitude).toBeUndefined()
    })

    it('should include sajuInfluence when provided as record', async () => {
      const validatedWithSaju = {
        ...VALID_DREAM_STREAM_BODY,
        sajuInfluence: {
          dayStem: '甲',
          dayBranch: '子',
        },
      }

      const result = await buildPayload(validatedWithSaju, MOCK_CONTEXT)

      expect(result.body.sajuInfluence).toEqual({
        dayStem: '甲',
        dayBranch: '子',
      })
    })

    it('should exclude sajuInfluence when not a record', async () => {
      const validatedWithInvalidSaju = {
        ...VALID_DREAM_STREAM_BODY,
        sajuInfluence: 'not an object',
      }

      const result = await buildPayload(validatedWithInvalidSaju, MOCK_CONTEXT)

      expect(result.body.sajuInfluence).toBeUndefined()
    })

    it('should return undefined birth when all fields are invalid', async () => {
      const validatedWithAllInvalid = {
        ...VALID_DREAM_STREAM_BODY,
        birth: {
          date: 'invalid',
          time: 'invalid',
          latitude: NaN,
          longitude: NaN,
        },
      }

      const result = await buildPayload(validatedWithAllInvalid, MOCK_CONTEXT)

      expect(result.body.birth).toBeUndefined()
    })
  })
})

// ===================================================================
// Tests for afterStream Function
// ===================================================================
describe('Dream Stream API - afterStream Function', () => {
  let afterStream: (validated: any, context: any) => Promise<void>
  let prisma: any

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
    }))

    mockGetServerSession.mockResolvedValue(MOCK_SESSION)

    await import('@/app/api/dream/stream/route')
    afterStream = capturedStreamRouteConfig.afterStream

    // Get prisma mock
    prisma = (await import('@/lib/db/prisma')).prisma
  })

  describe('Reading Save', () => {
    it('should save reading for authenticated user', async () => {
      await afterStream(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(prisma.reading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'dream',
        }),
      })
    })

    it('should use session userId when available', async () => {
      mockGetServerSession.mockResolvedValue({ user: { id: 'session-user-456' } })

      await afterStream(VALID_DREAM_STREAM_BODY, { ...MOCK_CONTEXT, userId: 'context-user-123' })

      expect(prisma.reading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'session-user-456',
        }),
      })
    })

    it('should fallback to context userId when session is missing', async () => {
      mockGetServerSession.mockResolvedValue(null)

      await afterStream(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(prisma.reading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
        }),
      })
    })

    it('should not save when no userId is available', async () => {
      mockGetServerSession.mockResolvedValue(null)

      await afterStream(VALID_DREAM_STREAM_BODY, { ...MOCK_CONTEXT, userId: null })

      expect(prisma.reading.create).not.toHaveBeenCalled()
    })

    it('should include symbols in title when available', async () => {
      await afterStream(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(prisma.reading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: expect.stringContaining('flying'),
        }),
      })
    })

    it('should limit title symbols to 5', async () => {
      const manySymbols = {
        ...VALID_DREAM_STREAM_BODY,
        symbols: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'],
      }

      await afterStream(manySymbols, MOCK_CONTEXT)

      const callArgs = (prisma.reading.create as any).mock.calls[0][0]
      const title = callArgs.data.title
      // Should only have first 5 symbols in title
      expect(title.split(',').length).toBeLessThanOrEqual(5)
    })

    it('should use default title when no symbols', async () => {
      const noSymbols = { ...VALID_DREAM_STREAM_BODY, symbols: [] }

      await afterStream(noSymbols, MOCK_CONTEXT)

      expect(prisma.reading.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: '꿈 해석',
        }),
      })
    })

    it('should truncate dream text in content to 500 characters', async () => {
      const longDream = { ...VALID_DREAM_STREAM_BODY, dreamText: 'A'.repeat(1000) }

      await afterStream(longDream, MOCK_CONTEXT)

      const callArgs = (prisma.reading.create as any).mock.calls[0][0]
      const content = JSON.parse(callArgs.data.content)
      expect(content.dreamText.length).toBeLessThanOrEqual(500)
    })

    it('should include all metadata in content JSON', async () => {
      await afterStream(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      const callArgs = (prisma.reading.create as any).mock.calls[0][0]
      const content = JSON.parse(callArgs.data.content)

      expect(content).toEqual(
        expect.objectContaining({
          dreamText: expect.any(String),
          symbols: expect.any(Array),
          emotions: expect.any(Array),
          themes: expect.any(Array),
          context: expect.any(Array),
          koreanTypes: expect.any(Array),
          koreanLucky: expect.any(Array),
        })
      )
    })

    it('should handle save errors gracefully', async () => {
      const logger = (await import('@/lib/logger')).logger
      prisma.reading.create.mockRejectedValue(new Error('Database error'))

      // Should not throw
      await afterStream(VALID_DREAM_STREAM_BODY, MOCK_CONTEXT)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Dream API] Failed to save reading:',
        expect.any(Error)
      )
    })
  })
})

// ===================================================================
// Tests for Validation Schema
// ===================================================================
describe('Dream Stream API - Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Note: The actual schema is mocked, so these tests document expected behavior
  // rather than testing the real schema implementation. Skipped as they require
  // real schema validation which is tested elsewhere.
  describe.skip('dreamStreamSchema - schema validation tests require unmocked schema', () => {
    it('should accept valid dream text', () => {
      // The schema requires min 5 characters, max 5000
    })

    it('should reject dream text shorter than minimum length', () => {
      // The schema requires min 5 characters
    })

    it('should reject dream text longer than maximum length', () => {
      // The schema allows max 5000 characters
    })

    it('should accept valid locale values', () => {
      // ko and en are valid
    })

    it('should reject invalid locale values', () => {
      // Other locales should fail
    })

    it('should validate array fields with max length constraints', () => {
      // symbols, emotions, themes, context have max 50 items
    })

    it('should validate string items in arrays with max length', () => {
      // Each string should be max 120 characters
    })

    it('should validate birth object structure', () => {
      // date, time, timezone, latitude, longitude, gender
    })
  })
})

// ===================================================================
// Tests for sanitizeBirth Function
// ===================================================================
describe('Dream Stream API - sanitizeBirth Function', () => {
  // We test this through buildPayload since sanitizeBirth is internal
  let buildPayload: (validated: any, context: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async () => new Response('stream', { status: 200 })
      },
    }))

    await import('@/app/api/dream/stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Date Validation', () => {
    it('should accept valid date format YYYY-MM-DD', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { date: '2000-12-31' },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.date).toBe('2000-12-31')
    })

    it('should reject invalid date format', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { date: '31-12-2000' },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.date).toBeUndefined()
    })
  })

  describe('Time Validation', () => {
    it('should accept valid time format HH:MM', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { time: '23:59' },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.time).toBe('23:59')
    })

    it('should reject invalid time format', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { time: '11:30:45' },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.time).toBeUndefined()
    })
  })

  describe('Timezone Validation', () => {
    it('should accept valid timezone string', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { timezone: 'Asia/Seoul' },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.timezone).toBe('Asia/Seoul')
    })

    it('should trim and truncate long timezone', async () => {
      const longTimezone = 'A'.repeat(100)
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { timezone: longTimezone },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.timezone.length).toBeLessThanOrEqual(50)
    })
  })

  describe('Coordinate Validation', () => {
    it('should accept latitude in valid range [-90, 90]', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { latitude: 45.5 },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.latitude).toBe(45.5)
    })

    it('should reject latitude outside valid range', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { latitude: 95 },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.latitude).toBeUndefined()
    })

    it('should accept longitude in valid range [-180, 180]', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { longitude: -120.5 },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.longitude).toBe(-120.5)
    })

    it('should reject longitude outside valid range', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { longitude: 200 },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.longitude).toBeUndefined()
    })

    it('should handle NaN coordinates', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { latitude: NaN, longitude: NaN },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.latitude).toBeUndefined()
      expect(result.body.birth?.longitude).toBeUndefined()
    })
  })

  describe('Gender Validation', () => {
    it('should accept valid gender string', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { gender: 'male' },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.gender).toBe('male')
    })

    it('should truncate long gender string', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: { gender: 'A'.repeat(50) },
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth?.gender.length).toBeLessThanOrEqual(20)
    })
  })

  describe('Non-Record Input', () => {
    it('should return undefined for null birth', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: null,
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth).toBeUndefined()
    })

    it('should return undefined for non-object birth', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: 'string',
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth).toBeUndefined()
    })

    it('should return undefined for array birth', async () => {
      const result = await buildPayload(
        {
          ...VALID_DREAM_STREAM_BODY,
          birth: ['array'],
        },
        MOCK_CONTEXT
      )

      expect(result.body.birth).toBeUndefined()
    })
  })
})

// ===================================================================
// Integration-like Tests
// ===================================================================
describe('Dream Stream API - Route Export', () => {
  it('should export POST handler', async () => {
    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: () => async () => new Response('stream', { status: 200 }),
    }))

    const module = await import('@/app/api/dream/stream/route')

    expect(typeof module.POST).toBe('function')
  })

  it('should export dynamic runtime configuration', async () => {
    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: () => async () => new Response('stream', { status: 200 }),
    }))

    const module = await import('@/app/api/dream/stream/route')

    expect(module.dynamic).toBe('force-dynamic')
    expect(module.runtime).toBe('nodejs')
    expect(module.maxDuration).toBe(60)
  })
})
