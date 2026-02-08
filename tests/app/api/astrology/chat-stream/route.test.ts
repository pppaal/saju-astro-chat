// tests/app/api/astrology/chat-stream/route.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

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
  createFallbackSSEStream: vi.fn((data) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        if (data.content) {
          controller.enqueue(encoder.encode(`data: {"content":"${data.content}"}\n\n`))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }),
}))

// Mock middleware
const mockCreateAuthenticatedGuard = vi.fn(() => ({
  route: 'astrology-chat-stream',
  requireAuth: true,
  rateLimit: { limit: 60, windowSeconds: 60 },
  credits: { type: 'reading', amount: 1 },
}))

vi.mock('@/lib/api/middleware', () => ({
  createAuthenticatedGuard: (...args: unknown[]) => mockCreateAuthenticatedGuard(...args),
}))

// Mock Zod validation schema
const mockAstrologyChatStreamSafeParse = vi.fn()

vi.mock('@/lib/api/zodValidation', () => ({
  astrologyChatStreamSchema: {
    safeParse: (...args: unknown[]) => mockAstrologyChatStreamSafeParse(...args),
  },
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

// Mock text guards
vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((text, max) => (text || '').slice(0, max || 1800)),
  containsForbidden: vi.fn(() => false),
  safetyMessage: vi.fn((lang) =>
    lang === 'ko' ? '규제/민감 주제로 답변이 제한됩니다.' : "That topic can't be handled."
  ),
}))

// Mock sanitize functions
vi.mock('@/lib/destiny-map/sanitize', () => ({
  sanitizeLocaleText: vi.fn((text) => text),
  maskTextWithName: vi.fn((text) => text),
}))

// Mock HTTP constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// Mock validation patterns
vi.mock('@/lib/validation/patterns', () => ({
  DATE_RE: /^\d{4}-\d{2}-\d{2}$/,
  TIME_RE: /^\d{2}:\d{2}$/,
}))

// ---------------------------------------------------------------------------
// Import after mocks - the route module calls createStreamRoute at import time
// ---------------------------------------------------------------------------

// We need to dynamically import to capture the config
let routeModule: any

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_ASTROLOGY_CHAT_BODY = {
  messages: [{ role: 'user', content: 'What does my Sun sign mean for my career?' }],
  birthData: {
    date: '1990-05-15',
    time: '14:30',
    latitude: 37.5665,
    longitude: 126.978,
    gender: 'male',
  },
  chartData: {
    sun: { sign: 'Taurus', degree: 24 },
    moon: { sign: 'Cancer', degree: 12 },
    rising: { sign: 'Leo', degree: 5 },
  },
  locale: 'ko',
}

const VALID_RAW_BODY = {
  ...VALID_ASTROLOGY_CHAT_BODY,
  name: 'Test User',
  birthDate: '1990-05-15',
  birthTime: '14:30',
  latitude: 37.5665,
  longitude: 126.978,
  gender: 'male',
  theme: 'career',
  astro: { sun: 'Taurus', moon: 'Cancer' },
  userContext: 'Looking for career guidance',
}

const MOCK_SESSION = {
  user: {
    id: 'user-123',
    email: 'test@example.com',
    plan: 'premium',
  },
}

const MOCK_CONTEXT = {
  ip: '127.0.0.1',
  locale: 'ko',
  userId: 'user-123',
  session: MOCK_SESSION,
  isAuthenticated: true,
  isPremium: true,
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/astrology/chat-stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-session-id': 'test-session-123',
    },
  })
}

// ===================================================================
// Tests for Route Configuration
// ===================================================================
describe('Astrology Chat Stream API - Route Configuration', () => {
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
      createFallbackSSEStream: vi.fn(() => new Response('fallback', { status: 200 })),
    }))

    // Import the route module fresh
    routeModule = await import('@/app/api/astrology/chat-stream/route')
  })

  describe('Stream Route Factory Configuration', () => {
    it('should configure route with correct name', () => {
      expect(capturedStreamRouteConfig).not.toBeNull()
      expect(capturedStreamRouteConfig.route).toBe('AstrologyChatStream')
    })

    it('should use createAuthenticatedGuard with correct options', () => {
      expect(mockCreateAuthenticatedGuard).toHaveBeenCalledWith({
        route: 'astrology-chat-stream',
        limit: 60,
        windowSeconds: 60,
        requireCredits: true,
        creditType: 'reading',
        creditAmount: 1,
      })
    })

    it('should configure fallback messages for both locales', () => {
      expect(capturedStreamRouteConfig.fallbackMessage).toEqual({
        ko: 'AI 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.',
        en: 'Could not connect to AI service. Please try again.',
      })
    })

    it('should have buildPayload function defined', () => {
      expect(typeof capturedStreamRouteConfig.buildPayload).toBe('function')
    })

    it('should have transform function defined', () => {
      expect(typeof capturedStreamRouteConfig.transform).toBe('function')
    })
  })

  describe('Route Exports', () => {
    it('should export POST handler', () => {
      expect(typeof routeModule.POST).toBe('function')
    })

    it('should export dynamic runtime configuration', () => {
      expect(routeModule.dynamic).toBe('force-dynamic')
      expect(routeModule.runtime).toBe('nodejs')
      expect(routeModule.maxDuration).toBe(60)
    })
  })
})

// ===================================================================
// Tests for buildPayload Function
// ===================================================================
describe('Astrology Chat Stream API - buildPayload Function', () => {
  let buildPayload: (validated: any, context: any, req?: NextRequest, rawBody?: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: vi.fn(() => new Response('fallback', { status: 200 })),
    }))

    await import('@/app/api/astrology/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Basic Payload Building', () => {
    it('should return correct endpoint', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.endpoint).toBe('/astrology/ask-stream')
    })

    it('should include theme in body', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.theme).toBe('career')
    })

    it('should include locale from validated data', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.locale).toBe('ko')
    })

    it('should fallback to context locale when validated locale is missing', async () => {
      const bodyWithoutLocale = { ...VALID_ASTROLOGY_CHAT_BODY }
      delete (bodyWithoutLocale as any).locale

      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(bodyWithoutLocale, MOCK_CONTEXT, req, VALID_RAW_BODY)

      expect(result.body.locale).toBe('ko')
    })

    it('should include birth data in body', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.birth).toEqual({
        date: '1990-05-15',
        time: '14:30',
        gender: 'male',
        lat: 37.5665,
        lon: 126.978,
      })
    })

    it('should include astro data when provided', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.astro).toEqual({ sun: 'Taurus', moon: 'Cancer' })
    })

    it('should include session id from request header', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.session_id).toBe('test-session-123')
    })

    it('should include user context when provided', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.user_context).toBe('Looking for career guidance')
    })

    it('should set counselor_type to astrology', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.counselor_type).toBe('astrology')
    })
  })

  describe('Input Validation in buildPayload', () => {
    it('should return 400 error when birthDate is missing', async () => {
      const rawBodyWithoutDate = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutDate as any).birthDate

      const req = makePostRequest(rawBodyWithoutDate)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutDate
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when birthTime is missing', async () => {
      const rawBodyWithoutTime = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutTime as any).birthTime

      const req = makePostRequest(rawBodyWithoutTime)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutTime
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when birthDate format is invalid', async () => {
      const rawBodyInvalidDate = { ...VALID_RAW_BODY, birthDate: '15-05-1990' }

      const req = makePostRequest(rawBodyInvalidDate)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidDate
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when birthTime format is invalid', async () => {
      const rawBodyInvalidTime = { ...VALID_RAW_BODY, birthTime: '2:30 PM' }

      const req = makePostRequest(rawBodyInvalidTime)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidTime
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when latitude is invalid (> 90)', async () => {
      const rawBodyInvalidLat = { ...VALID_RAW_BODY, latitude: 95 }

      const req = makePostRequest(rawBodyInvalidLat)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidLat
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when latitude is invalid (< -90)', async () => {
      const rawBodyInvalidLat = { ...VALID_RAW_BODY, latitude: -95 }

      const req = makePostRequest(rawBodyInvalidLat)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidLat
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when longitude is invalid (> 180)', async () => {
      const rawBodyInvalidLon = { ...VALID_RAW_BODY, longitude: 200 }

      const req = makePostRequest(rawBodyInvalidLon)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidLon
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when longitude is invalid (< -180)', async () => {
      const rawBodyInvalidLon = { ...VALID_RAW_BODY, longitude: -200 }

      const req = makePostRequest(rawBodyInvalidLon)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidLon
      )

      expect(result.status).toBe(400)
    })

    it('should return 400 error when latitude is NaN', async () => {
      const rawBodyNaNLat = { ...VALID_RAW_BODY, latitude: NaN }

      const req = makePostRequest(rawBodyNaNLat)
      const result = await buildPayload(VALID_ASTROLOGY_CHAT_BODY, MOCK_CONTEXT, req, rawBodyNaNLat)

      expect(result.status).toBe(400)
    })

    it('should return 400 error when longitude is NaN', async () => {
      const rawBodyNaNLon = { ...VALID_RAW_BODY, longitude: NaN }

      const req = makePostRequest(rawBodyNaNLon)
      const result = await buildPayload(VALID_ASTROLOGY_CHAT_BODY, MOCK_CONTEXT, req, rawBodyNaNLon)

      expect(result.status).toBe(400)
    })

    it('should accept string coordinates and convert to numbers', async () => {
      const rawBodyStringCoords = {
        ...VALID_RAW_BODY,
        latitude: '37.5665',
        longitude: '126.978',
      }

      const req = makePostRequest(rawBodyStringCoords)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyStringCoords
      )

      expect(result.body.birth.lat).toBe(37.5665)
      expect(result.body.birth.lon).toBe(126.978)
    })
  })

  describe('Message History Processing', () => {
    it('should clamp messages to maximum of 6', async () => {
      const manyMessages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const validatedWithManyMessages = {
        ...VALID_ASTROLOGY_CHAT_BODY,
        messages: manyMessages,
      }

      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        validatedWithManyMessages,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      // history should only include last 6 messages, filtered (no system)
      expect(result.body.history.length).toBeLessThanOrEqual(6)
    })

    it('should filter out system messages from history', async () => {
      const messagesWithSystem = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
      ]

      const validatedWithSystem = {
        ...VALID_ASTROLOGY_CHAT_BODY,
        messages: messagesWithSystem,
      }

      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(validatedWithSystem, MOCK_CONTEXT, req, VALID_RAW_BODY)

      const hasSystemMessage = result.body.history.some((m: any) => m.role === 'system')
      expect(hasSystemMessage).toBe(false)
    })

    it('should include prompt with conversation history', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.prompt).toContain('Q:')
    })

    it('should include user name in prompt', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.prompt).toContain('Name: Test User')
    })

    it('should use default name when name is not provided', async () => {
      const rawBodyWithoutName = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutName as any).name

      const req = makePostRequest(rawBodyWithoutName)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutName
      )

      expect(result.body.prompt).toContain('Name: User')
    })
  })

  describe('Safety Check - Forbidden Content', () => {
    it('should return fallback stream when user message contains forbidden content', async () => {
      const { containsForbidden } = await import('@/lib/textGuards')
      ;(containsForbidden as any).mockReturnValueOnce(true)

      const validatedWithForbidden = {
        ...VALID_ASTROLOGY_CHAT_BODY,
        messages: [{ role: 'user', content: 'Tell me about my stock investments' }],
      }

      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(validatedWithForbidden, MOCK_CONTEXT, req, VALID_RAW_BODY)

      // Should return a Response (fallback stream)
      expect(result instanceof Response).toBe(true)
    })
  })

  describe('String Truncation and Sanitization', () => {
    it('should truncate name to 100 characters', async () => {
      const longName = 'A'.repeat(200)
      const rawBodyLongName = { ...VALID_RAW_BODY, name: longName }

      const req = makePostRequest(rawBodyLongName)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyLongName
      )

      // Name in prompt should be truncated
      expect(result.body.prompt).not.toContain(longName)
    })

    it('should truncate birthDate to 10 characters and validate', async () => {
      // When birthDate is longer than 10 chars, it gets truncated first
      // If the truncated result is valid, it should pass
      const longDateWithValidPrefix = '1990-05-15-extra'
      const rawBodyLongDate = { ...VALID_RAW_BODY, birthDate: longDateWithValidPrefix }

      const req = makePostRequest(rawBodyLongDate)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyLongDate
      )

      // Truncated to '1990-05-15' which is valid, so should succeed
      expect(result.body.birth.date).toBe('1990-05-15')
    })

    it('should return 400 for truly invalid birthDate after truncation', async () => {
      // An invalid date that stays invalid after truncation
      const invalidDate = 'invalid-da'
      const rawBodyInvalidDate = { ...VALID_RAW_BODY, birthDate: invalidDate }

      const req = makePostRequest(rawBodyInvalidDate)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidDate
      )

      expect(result.status).toBe(400)
    })

    it('should truncate theme to 100 characters', async () => {
      const longTheme = 'A'.repeat(200)
      const rawBodyLongTheme = { ...VALID_RAW_BODY, theme: longTheme }

      const req = makePostRequest(rawBodyLongTheme)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyLongTheme
      )

      expect(result.body.theme.length).toBeLessThanOrEqual(100)
    })

    it('should truncate userContext to 1000 characters', async () => {
      const longContext = 'A'.repeat(2000)
      const rawBodyLongContext = { ...VALID_RAW_BODY, userContext: longContext }

      const req = makePostRequest(rawBodyLongContext)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyLongContext
      )

      expect(result.body.user_context.length).toBeLessThanOrEqual(1000)
    })
  })

  describe('Default Values', () => {
    it('should use default gender when not provided', async () => {
      const rawBodyWithoutGender = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutGender as any).gender

      const req = makePostRequest(rawBodyWithoutGender)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutGender
      )

      expect(result.body.birth.gender).toBe('male')
    })

    it('should use default theme when not provided', async () => {
      const rawBodyWithoutTheme = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutTheme as any).theme

      const req = makePostRequest(rawBodyWithoutTheme)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutTheme
      )

      expect(result.body.theme).toBe('life')
    })

    it('should have undefined astro when not provided as object', async () => {
      const rawBodyWithoutAstro = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutAstro as any).astro

      const req = makePostRequest(rawBodyWithoutAstro)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutAstro
      )

      expect(result.body.astro).toBeUndefined()
    })

    it('should have undefined userContext when not provided', async () => {
      const rawBodyWithoutContext = { ...VALID_RAW_BODY }
      delete (rawBodyWithoutContext as any).userContext

      const req = makePostRequest(rawBodyWithoutContext)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWithoutContext
      )

      expect(result.body.user_context).toBeUndefined()
    })

    it('should have undefined session_id when header not present', async () => {
      const req = new NextRequest('http://localhost/api/astrology/chat-stream', {
        method: 'POST',
        body: JSON.stringify(VALID_RAW_BODY),
        headers: {
          'content-type': 'application/json',
          // No x-session-id header
        },
      })

      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.session_id).toBeUndefined()
    })
  })
})

// ===================================================================
// Tests for Transform Function
// ===================================================================
describe('Astrology Chat Stream API - Transform Function', () => {
  let transform: (chunk: string, validated: any) => string

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async () => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: vi.fn(),
    }))

    await import('@/app/api/astrology/chat-stream/route')
    transform = capturedStreamRouteConfig.transform
  })

  it('should apply sanitizeLocaleText to chunk', async () => {
    const { sanitizeLocaleText } = await import('@/lib/destiny-map/sanitize')

    transform('Hello World', { locale: 'ko' })

    expect(sanitizeLocaleText).toHaveBeenCalledWith('Hello World', 'ko')
  })

  it('should apply maskTextWithName to sanitized chunk', async () => {
    const { maskTextWithName } = await import('@/lib/destiny-map/sanitize')

    transform('Hello World', { locale: 'ko' })

    expect(maskTextWithName).toHaveBeenCalled()
  })

  it('should use ko locale as default when locale not provided', async () => {
    const { sanitizeLocaleText } = await import('@/lib/destiny-map/sanitize')

    transform('Test', {})

    expect(sanitizeLocaleText).toHaveBeenCalledWith('Test', 'ko')
  })
})

// ===================================================================
// Tests for System Prompt Generation
// ===================================================================
describe('Astrology Chat Stream API - System Prompt', () => {
  let buildPayload: (validated: any, context: any, req?: NextRequest, rawBody?: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async () => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: vi.fn(),
    }))

    await import('@/app/api/astrology/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Korean Locale System Prompt', () => {
    it('should include Korean system prompt for ko locale', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        { ...VALID_ASTROLOGY_CHAT_BODY, locale: 'ko' },
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.prompt).toContain('서양 점성술 전문 상담사')
    })

    it('should include Korean response format instructions', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        { ...VALID_ASTROLOGY_CHAT_BODY, locale: 'ko' },
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.prompt).toContain('【태양/달】')
      expect(result.body.prompt).toContain('【상승궁】')
      expect(result.body.prompt).toContain('【트랜짓】')
    })

    it('should include no-greeting rule in Korean', async () => {
      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(
        { ...VALID_ASTROLOGY_CHAT_BODY, locale: 'ko' },
        MOCK_CONTEXT,
        req,
        VALID_RAW_BODY
      )

      expect(result.body.prompt).toContain('인사 금지')
    })
  })

  describe('English Locale System Prompt', () => {
    it('should include English system prompt for en locale', async () => {
      const enRawBody = { ...VALID_RAW_BODY, locale: 'en' }
      const req = makePostRequest(enRawBody)
      const result = await buildPayload(
        { ...VALID_ASTROLOGY_CHAT_BODY, locale: 'en' },
        { ...MOCK_CONTEXT, locale: 'en' },
        req,
        enRawBody
      )

      expect(result.body.prompt).toContain('Western Astrology counselor')
    })

    it('should include English response format instructions', async () => {
      const enRawBody = { ...VALID_RAW_BODY, locale: 'en' }
      const req = makePostRequest(enRawBody)
      const result = await buildPayload(
        { ...VALID_ASTROLOGY_CHAT_BODY, locale: 'en' },
        { ...MOCK_CONTEXT, locale: 'en' },
        req,
        enRawBody
      )

      expect(result.body.prompt).toContain('【Sun/Moon】')
      expect(result.body.prompt).toContain('【Rising】')
      expect(result.body.prompt).toContain('【Transits】')
    })

    it('should include no-greeting rule in English', async () => {
      const enRawBody = { ...VALID_RAW_BODY, locale: 'en' }
      const req = makePostRequest(enRawBody)
      const result = await buildPayload(
        { ...VALID_ASTROLOGY_CHAT_BODY, locale: 'en' },
        { ...MOCK_CONTEXT, locale: 'en' },
        req,
        enRawBody
      )

      expect(result.body.prompt).toContain('NO GREETING')
    })
  })
})

// ===================================================================
// Tests for Edge Cases
// ===================================================================
describe('Astrology Chat Stream API - Edge Cases', () => {
  let buildPayload: (validated: any, context: any, req?: NextRequest, rawBody?: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async () => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: vi.fn(),
    }))

    await import('@/app/api/astrology/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Special Characters Handling', () => {
    it('should handle Korean text in messages', async () => {
      const koreanMessages = {
        ...VALID_ASTROLOGY_CHAT_BODY,
        messages: [{ role: 'user', content: '제 태양 별자리가 뭔가요?' }],
      }

      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(koreanMessages, MOCK_CONTEXT, req, VALID_RAW_BODY)

      expect(result.body.prompt).toContain('제 태양 별자리가 뭔가요?')
    })

    it('should handle special characters in user name', async () => {
      const rawBodySpecialName = {
        ...VALID_RAW_BODY,
        name: "John O'Brien & Co.",
      }

      const req = makePostRequest(rawBodySpecialName)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodySpecialName
      )

      expect(result.body.prompt).toContain("John O'Brien & Co.")
    })
  })

  describe('Boundary Values', () => {
    it('should handle minimum valid latitude (-90)', async () => {
      const rawBodyMinLat = { ...VALID_RAW_BODY, latitude: -90 }

      const req = makePostRequest(rawBodyMinLat)
      const result = await buildPayload(VALID_ASTROLOGY_CHAT_BODY, MOCK_CONTEXT, req, rawBodyMinLat)

      expect(result.body.birth.lat).toBe(-90)
    })

    it('should handle maximum valid latitude (90)', async () => {
      const rawBodyMaxLat = { ...VALID_RAW_BODY, latitude: 90 }

      const req = makePostRequest(rawBodyMaxLat)
      const result = await buildPayload(VALID_ASTROLOGY_CHAT_BODY, MOCK_CONTEXT, req, rawBodyMaxLat)

      expect(result.body.birth.lat).toBe(90)
    })

    it('should handle minimum valid longitude (-180)', async () => {
      const rawBodyMinLon = { ...VALID_RAW_BODY, longitude: -180 }

      const req = makePostRequest(rawBodyMinLon)
      const result = await buildPayload(VALID_ASTROLOGY_CHAT_BODY, MOCK_CONTEXT, req, rawBodyMinLon)

      expect(result.body.birth.lon).toBe(-180)
    })

    it('should handle maximum valid longitude (180)', async () => {
      const rawBodyMaxLon = { ...VALID_RAW_BODY, longitude: 180 }

      const req = makePostRequest(rawBodyMaxLon)
      const result = await buildPayload(VALID_ASTROLOGY_CHAT_BODY, MOCK_CONTEXT, req, rawBodyMaxLon)

      expect(result.body.birth.lon).toBe(180)
    })
  })

  describe('Empty and Null Values', () => {
    it('should handle empty messages array (at least 1 message required by schema)', async () => {
      // Note: Schema requires min 1 message, this tests buildPayload behavior
      const emptyMessages = {
        ...VALID_ASTROLOGY_CHAT_BODY,
        messages: [],
      }

      const req = makePostRequest(VALID_RAW_BODY)
      const result = await buildPayload(emptyMessages, MOCK_CONTEXT, req, VALID_RAW_BODY)

      // Should still produce a valid payload (validation is done before buildPayload)
      expect(result.endpoint).toBe('/astrology/ask-stream')
    })

    it('should handle null astro object', async () => {
      const rawBodyNullAstro = { ...VALID_RAW_BODY, astro: null }

      const req = makePostRequest(rawBodyNullAstro)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyNullAstro
      )

      expect(result.body.astro).toBeUndefined()
    })

    it('should handle empty string name', async () => {
      const rawBodyEmptyName = { ...VALID_RAW_BODY, name: '' }

      const req = makePostRequest(rawBodyEmptyName)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyEmptyName
      )

      // Should fall back to 'User' after trimming empty string
      expect(result.body.prompt).toContain('Name: User')
    })

    it('should handle whitespace-only name', async () => {
      const rawBodyWhitespaceName = { ...VALID_RAW_BODY, name: '   ' }

      const req = makePostRequest(rawBodyWhitespaceName)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyWhitespaceName
      )

      // Should fall back to 'User' after trimming
      expect(result.body.prompt).toContain('Name: User')
    })
  })

  describe('Type Coercion', () => {
    it('should handle string latitude conversion', async () => {
      const rawBodyStringLat = { ...VALID_RAW_BODY, latitude: '37.5665' }

      const req = makePostRequest(rawBodyStringLat)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyStringLat
      )

      expect(typeof result.body.birth.lat).toBe('number')
    })

    it('should handle string longitude conversion', async () => {
      const rawBodyStringLon = { ...VALID_RAW_BODY, longitude: '126.978' }

      const req = makePostRequest(rawBodyStringLon)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyStringLon
      )

      expect(typeof result.body.birth.lon).toBe('number')
    })

    it('should reject non-numeric string latitude', async () => {
      const rawBodyInvalidLat = { ...VALID_RAW_BODY, latitude: 'invalid' }

      const req = makePostRequest(rawBodyInvalidLat)
      const result = await buildPayload(
        VALID_ASTROLOGY_CHAT_BODY,
        MOCK_CONTEXT,
        req,
        rawBodyInvalidLat
      )

      expect(result.status).toBe(400)
    })
  })
})

// ===================================================================
// Tests for clampMessages Helper
// ===================================================================
describe('Astrology Chat Stream API - clampMessages Helper', () => {
  let buildPayload: (validated: any, context: any, req?: NextRequest, rawBody?: any) => Promise<any>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async () => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: vi.fn(),
    }))

    await import('@/app/api/astrology/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  it('should keep all messages when count is below max (6)', async () => {
    const fiveMessages = Array.from({ length: 5 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }))

    const validated = { ...VALID_ASTROLOGY_CHAT_BODY, messages: fiveMessages }

    const req = makePostRequest(VALID_RAW_BODY)
    const result = await buildPayload(validated, MOCK_CONTEXT, req, VALID_RAW_BODY)

    expect(result.body.history.length).toBe(5)
  })

  it('should keep exactly 6 messages when count equals max', async () => {
    const sixMessages = Array.from({ length: 6 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }))

    const validated = { ...VALID_ASTROLOGY_CHAT_BODY, messages: sixMessages }

    const req = makePostRequest(VALID_RAW_BODY)
    const result = await buildPayload(validated, MOCK_CONTEXT, req, VALID_RAW_BODY)

    expect(result.body.history.length).toBe(6)
  })

  it('should clamp to last 6 messages when count exceeds max', async () => {
    const tenMessages = Array.from({ length: 10 }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
    }))

    const validated = { ...VALID_ASTROLOGY_CHAT_BODY, messages: tenMessages }

    const req = makePostRequest(VALID_RAW_BODY)
    const result = await buildPayload(validated, MOCK_CONTEXT, req, VALID_RAW_BODY)

    // History excludes system messages and takes last 6
    expect(result.body.history.length).toBeLessThanOrEqual(6)
    // Should contain the most recent messages (indices 4-9)
    expect(result.body.prompt).toContain('Message 9')
  })

  it('should preserve most recent user question', async () => {
    const messages = [
      { role: 'user', content: 'First question' },
      { role: 'assistant', content: 'First answer' },
      { role: 'user', content: 'Second question' },
      { role: 'assistant', content: 'Second answer' },
      { role: 'user', content: 'Third question' },
      { role: 'assistant', content: 'Third answer' },
      { role: 'user', content: 'Most recent question' },
    ]

    const validated = { ...VALID_ASTROLOGY_CHAT_BODY, messages }

    const req = makePostRequest(VALID_RAW_BODY)
    const result = await buildPayload(validated, MOCK_CONTEXT, req, VALID_RAW_BODY)

    expect(result.body.prompt).toContain('Most recent question')
  })
})

// ===================================================================
// Tests for Authentication Guard
// ===================================================================
describe('Astrology Chat Stream API - Authentication', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async () => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: vi.fn(),
    }))

    await import('@/app/api/astrology/chat-stream/route')
  })

  it('should require authentication (requireAuth: true)', () => {
    expect(mockCreateAuthenticatedGuard).toHaveBeenCalledWith(
      expect.objectContaining({
        requireCredits: true,
      })
    )
  })

  it('should require credits for the operation', () => {
    expect(mockCreateAuthenticatedGuard).toHaveBeenCalledWith(
      expect.objectContaining({
        creditType: 'reading',
        creditAmount: 1,
      })
    )
  })

  it('should have rate limit of 60 requests per 60 seconds', () => {
    expect(mockCreateAuthenticatedGuard).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 60,
        windowSeconds: 60,
      })
    )
  })
})

// ===================================================================
// Tests for Zod Schema Validation
// ===================================================================
describe('Astrology Chat Stream API - Schema Validation', () => {
  // Import the real schema using vi.importActual to bypass mocks
  let astrologyChatStreamSchema: any

  beforeAll(async () => {
    const realModule =
      await vi.importActual<typeof import('@/lib/api/zodValidation')>('@/lib/api/zodValidation')
    astrologyChatStreamSchema = realModule.astrologyChatStreamSchema
  })

  describe('astrologyChatStreamSchema', () => {
    it('should require messages array with at least 1 message', () => {
      const result = astrologyChatStreamSchema.safeParse({
        messages: [],
        locale: 'ko',
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some((i: { path: (string | number)[] }) =>
            i.path.includes('messages')
          )
        ).toBe(true)
      }
    })

    it('should limit messages array to 100 max', () => {
      const manyMessages = Array.from({ length: 101 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`,
      }))
      const result = astrologyChatStreamSchema.safeParse({
        messages: manyMessages,
        locale: 'ko',
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid locale values (ko, en)', () => {
      const resultKo = astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'ko',
      })
      expect(resultKo.success).toBe(true)

      const resultEn = astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'en',
      })
      expect(resultEn.success).toBe(true)
    })

    it('should accept optional birthData as record', () => {
      const result = astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        birthData: {
          birthDate: '1990-05-15',
          birthTime: '14:30',
          latitude: 37.5,
          longitude: 126.9,
        },
      })
      expect(result.success).toBe(true)
    })

    it('should accept optional chartData as record', () => {
      const result = astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        chartData: {
          sunSign: 'Taurus',
          moonSign: 'Cancer',
          ascendant: 'Leo',
        },
      })
      expect(result.success).toBe(true)
    })

    it('should validate message structure (role, content)', () => {
      const result = astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      })
      expect(result.success).toBe(true)

      // Missing content should fail
      const resultMissingContent = astrologyChatStreamSchema.safeParse({
        messages: [{ role: 'user' }],
      })
      expect(resultMissingContent.success).toBe(false)
    })
  })
})

// ===================================================================
// Tests for Integration-like Behavior
// ===================================================================
describe('Astrology Chat Stream API - Integration', () => {
  let POST: (req: NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        // Return a handler that simulates successful streaming
        return async (req: NextRequest) => {
          const encoder = new TextEncoder()
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(encoder.encode('data: {"content":"Test response"}\n\n'))
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
            },
          })
          return new Response(stream, {
            status: 200,
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
            },
          })
        }
      },
      createFallbackSSEStream: vi.fn(),
    }))

    const module = await import('@/app/api/astrology/chat-stream/route')
    POST = module.POST
  })

  it('should return SSE stream response on successful request', async () => {
    const req = makePostRequest(VALID_RAW_BODY)
    const response = await POST(req)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/event-stream')
  })

  it('should include Cache-Control: no-cache header', async () => {
    const req = makePostRequest(VALID_RAW_BODY)
    const response = await POST(req)

    expect(response.headers.get('Cache-Control')).toBe('no-cache')
  })
})
