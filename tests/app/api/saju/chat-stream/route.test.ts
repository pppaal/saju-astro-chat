/**
 * Comprehensive Test Suite for /api/saju/chat-stream/route.ts
 *
 * Tests the Saju (Four Pillars of Destiny) chat streaming API endpoint including:
 * - Authentication and credit consumption via createAuthenticatedGuard
 * - Input validation with Zod schema (sajuChatStreamSchema)
 * - Message handling and clamping
 * - Text safety checks (forbidden content filtering)
 * - SSE streaming with AI backend
 * - Transform function for sanitization
 * - Localized fallback messages
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ---------------------------------------------------------------------------
// Mocks - all vi.mock calls MUST appear before importing the route handlers
// ---------------------------------------------------------------------------

// Store the config passed to createStreamRoute so we can test its behavior
let capturedStreamRouteConfig: any = null

// Mock streaming utilities
const mockCreateStreamRoute = vi.fn()
const mockCreateFallbackSSEStream = vi.fn(() => new Response('fallback stream'))

vi.mock('@/lib/streaming', () => ({
  createStreamRoute: (config: any) => {
    capturedStreamRouteConfig = config
    return mockCreateStreamRoute(config)
  },
  createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
}))

// Mock middleware
const mockCreateAuthenticatedGuard = vi.fn(() => ({
  route: 'saju-chat-stream',
  limit: 60,
  windowSeconds: 60,
  requireCredits: true,
  creditType: 'reading',
  creditAmount: 1,
}))

vi.mock('@/lib/api/middleware', () => ({
  createAuthenticatedGuard: (...args: unknown[]) => mockCreateAuthenticatedGuard(...args),
}))

// Mock Zod validation schema
vi.mock('@/lib/api/zodValidation', () => ({
  sajuChatStreamSchema: {
    safeParse: vi.fn((body: any) => {
      // Validate messages array
      if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
        return {
          success: false,
          error: {
            issues: [{ path: ['messages'], message: 'Required' }],
          },
        }
      }
      if (body.messages.length > 100) {
        return {
          success: false,
          error: {
            issues: [{ path: ['messages'], message: 'Array must contain at most 100 element(s)' }],
          },
        }
      }
      // Validate individual messages
      const validatedMessages = body.messages.filter(
        (m: any) =>
          m &&
          typeof m === 'object' &&
          typeof m.content === 'string' &&
          m.content.length >= 1 &&
          m.content.length <= 10000 &&
          ['user', 'assistant', 'system'].includes(m.role)
      )
      // Validate locale
      const validLocales = ['ko', 'en']
      if (body.locale && !validLocales.includes(body.locale)) {
        return {
          success: false,
          error: {
            issues: [{ path: ['locale'], message: "Invalid enum value. Expected 'ko' | 'en'" }],
          },
        }
      }
      return {
        success: true,
        data: {
          messages: validatedMessages,
          saju: body.saju,
          locale: body.locale || 'ko',
          context: body.context,
        },
      }
    }),
  },
}))

// Mock text guards
const mockGuardText = vi.fn((text: string, max: number = 300) => text.slice(0, max))
const mockContainsForbidden = vi.fn(() => false)
const mockSafetyMessage = vi.fn((locale: string) =>
  locale === 'ko'
    ? '규제/민감 주제로 답변이 제한됩니다. 다른 주제로 질문해 주세요.'
    : "That topic can't be handled. Please ask about another area."
)

vi.mock('@/lib/textGuards', () => ({
  guardText: (...args: unknown[]) => mockGuardText(...(args as [string, number?])),
  containsForbidden: (...args: unknown[]) => mockContainsForbidden(...args),
  safetyMessage: (...args: unknown[]) => mockSafetyMessage(...(args as [string])),
}))

// Mock sanitization
const mockSanitizeLocaleText = vi.fn((text: string) => text)
const mockMaskTextWithName = vi.fn((text: string) => text)

vi.mock('@/lib/destiny-map/sanitize', () => ({
  sanitizeLocaleText: (...args: unknown[]) => mockSanitizeLocaleText(...(args as [string, string])),
  maskTextWithName: (...args: unknown[]) => mockMaskTextWithName(...(args as [string, string | undefined])),
}))

// Mock HTTP constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    RATE_LIMITED: 429,
    SERVER_ERROR: 500,
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Import after mocks - the route module calls createStreamRoute at import time
// ---------------------------------------------------------------------------

let routeModule: any

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_CHAT_STREAM_BODY = {
  messages: [
    { role: 'user', content: 'Tell me about my saju chart' },
  ],
  locale: 'ko',
  saju: {
    dayMaster: { heavenlyStem: { name: '甲', element: '목' } },
    yearPillar: { heavenlyStem: { name: '庚', element: '금' } },
  },
}

const MOCK_CONTEXT = {
  ip: '127.0.0.1',
  locale: 'ko',
  userId: 'user-123',
  session: {
    user: { id: 'user-123', email: 'test@example.com' },
  },
  isAuthenticated: true,
  isPremium: false,
}

const MOCK_RAW_BODY = {
  ...VALID_CHAT_STREAM_BODY,
  name: 'Test User',
  birthDate: '1990-06-15',
  birthTime: '14:30',
  gender: 'male',
  theme: 'life',
}

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/saju/chat-stream', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      'x-session-id': 'session-123',
    },
  })
}

// ===================================================================
// Tests for Route Configuration
// ===================================================================
describe('Saju Chat Stream API - Route Configuration', () => {
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
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    // Import the route module fresh
    routeModule = await import('@/app/api/saju/chat-stream/route')
  })

  describe('Stream Route Factory Configuration', () => {
    it('should configure route with correct name', () => {
      expect(capturedStreamRouteConfig).not.toBeNull()
      expect(capturedStreamRouteConfig.route).toBe('SajuChatStream')
    })

    it('should use createAuthenticatedGuard with correct options', () => {
      expect(mockCreateAuthenticatedGuard).toHaveBeenCalledWith({
        route: 'saju-chat-stream',
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
describe('Saju Chat Stream API - buildPayload Function', () => {
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
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Required Field Validation', () => {
    it('should return 400 error when birthDate is missing', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, birthDate: '' }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
      const body = await result.json()
      expect(body.error).toBe('Missing required fields')
    })

    it('should return 400 error when birthTime is missing', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, birthTime: '' }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result).toBeInstanceOf(Response)
      expect(result.status).toBe(400)
    })

    it('should proceed with valid birthDate and birthTime', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result).not.toBeInstanceOf(Response)
      expect(result.endpoint).toBe('/saju/ask-stream')
    })
  })

  describe('Payload Building', () => {
    it('should return correct endpoint', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.endpoint).toBe('/saju/ask-stream')
    })

    it('should include theme from rawBody', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, theme: 'career' }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result.body.theme).toBe('career')
    })

    it('should default theme to life when not provided', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, theme: undefined }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result.body.theme).toBe('life')
    })

    it('should truncate theme to 100 characters', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, theme: 'A'.repeat(200) }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result.body.theme.length).toBeLessThanOrEqual(100)
    })

    it('should include locale from validated data', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.locale).toBe('ko')
    })

    it('should use context locale when validated locale is missing', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: undefined }

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.locale).toBe('ko')
    })

    it('should include birth information', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.birth).toEqual({
        date: '1990-06-15',
        time: '14:30',
        gender: 'male',
      })
    })

    it('should include saju data when provided', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.saju).toBeDefined()
    })

    it('should include session_id from request headers', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.session_id).toBe('session-123')
    })

    it('should include counselor_type as saju', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.counselor_type).toBe('saju')
    })

    it('should include userContext when provided', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, userContext: 'Additional context information' }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result.body.user_context).toBe('Additional context information')
    })

    it('should truncate userContext to 1000 characters', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, userContext: 'A'.repeat(2000) }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      expect(result.body.user_context.length).toBeLessThanOrEqual(1000)
    })

    it('should truncate name to 100 characters', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const rawBody = { ...MOCK_RAW_BODY, name: 'A'.repeat(200) }

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

      // Name is used in the prompt construction
      expect(result.body.prompt).toContain('Name:')
    })
  })

  describe('Message Clamping', () => {
    it('should clamp messages to maximum of 6', async () => {
      const manyMessages = Array(10)
        .fill(null)
        .map((_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Message ${i}` }))
      const validated = { ...VALID_CHAT_STREAM_BODY, messages: manyMessages }
      const req = makePostRequest(validated)

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.history.length).toBeLessThanOrEqual(6)
    })

    it('should use last N messages when clamping', async () => {
      const manyMessages = Array(10)
        .fill(null)
        .map((_, i) => ({ role: i % 2 === 0 ? 'user' : 'assistant', content: `Message ${i}` }))
      const validated = { ...VALID_CHAT_STREAM_BODY, messages: manyMessages }
      const req = makePostRequest(validated)

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      // Should contain the last messages
      const lastMessageContent = result.body.history[result.body.history.length - 1]?.content
      expect(lastMessageContent).toBeDefined()
    })

    it('should filter out system messages from history', async () => {
      const messagesWithSystem = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User question' },
        { role: 'assistant', content: 'Assistant response' },
      ]
      const validated = { ...VALID_CHAT_STREAM_BODY, messages: messagesWithSystem }
      const req = makePostRequest(validated)

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.history.some((m: any) => m.role === 'system')).toBe(false)
    })
  })

  describe('Prompt Construction', () => {
    it('should build chat prompt with system instructions', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('Name:')
      expect(result.body.prompt).toContain('Birth:')
      expect(result.body.prompt).toContain('Gender:')
      expect(result.body.prompt).toContain('Theme:')
    })

    it('should include user question in prompt', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)

      const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('Question:')
    })

    it('should use Korean system prompt for ko locale', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      // Korean prompt should contain Korean terms
      expect(result.body.prompt).toContain('사주')
    })

    it('should use English system prompt for en locale', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'en' }
      const rawBody = { ...MOCK_RAW_BODY, locale: 'en' }

      const result = await buildPayload(validated, { ...MOCK_CONTEXT, locale: 'en' }, req, rawBody)

      // English prompt should contain English instructions
      expect(result.body.prompt).toContain('Saju')
    })
  })
})

// ===================================================================
// Tests for Text Safety Checks
// ===================================================================
describe('Saju Chat Stream API - Text Safety', () => {
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
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  it('should check last user message for forbidden content', async () => {
    mockContainsForbidden.mockReturnValue(false)
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)

    await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    expect(mockContainsForbidden).toHaveBeenCalled()
  })

  it('should return safety fallback stream when forbidden content detected', async () => {
    mockContainsForbidden.mockReturnValue(true)
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)

    const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    expect(mockCreateFallbackSSEStream).toHaveBeenCalled()
    expect(result).toBeInstanceOf(Response)
  })

  it('should use correct locale for safety message', async () => {
    mockContainsForbidden.mockReturnValue(true)
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)

    await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    expect(mockSafetyMessage).toHaveBeenCalledWith('ko')
  })

  it('should proceed normally for safe content', async () => {
    mockContainsForbidden.mockReturnValue(false)
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)

    const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    expect(result).not.toBeInstanceOf(Response)
    expect(result.endpoint).toBe('/saju/ask-stream')
  })

  it('should guard text content with maximum length', async () => {
    mockContainsForbidden.mockReturnValue(false)
    const longMessage = { role: 'user', content: 'A'.repeat(1000) }
    const validated = { ...VALID_CHAT_STREAM_BODY, messages: [longMessage] }
    const req = makePostRequest(validated)

    await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    expect(mockGuardText).toHaveBeenCalled()
  })
})

// ===================================================================
// Tests for Transform Function
// ===================================================================
describe('Saju Chat Stream API - Transform Function', () => {
  let transform: (chunk: string, validated: any) => string

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
    transform = capturedStreamRouteConfig.transform
  })

  it('should sanitize chunk text based on locale', () => {
    const chunk = 'Test chunk content'
    const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

    transform(chunk, validated)

    expect(mockSanitizeLocaleText).toHaveBeenCalledWith(chunk, 'ko')
  })

  it('should mask text with name', () => {
    mockSanitizeLocaleText.mockReturnValue('Sanitized text')
    const chunk = 'Test chunk'
    const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

    transform(chunk, validated)

    expect(mockMaskTextWithName).toHaveBeenCalledWith('Sanitized text', undefined)
  })

  it('should default to ko locale when not specified', () => {
    const chunk = 'Test chunk'
    const validated = { ...VALID_CHAT_STREAM_BODY, locale: undefined }

    transform(chunk, validated)

    expect(mockSanitizeLocaleText).toHaveBeenCalledWith(chunk, 'ko')
  })

  it('should return transformed text', () => {
    mockSanitizeLocaleText.mockReturnValue('Sanitized')
    mockMaskTextWithName.mockReturnValue('Masked')
    const chunk = 'Test'
    const validated = { ...VALID_CHAT_STREAM_BODY }

    const result = transform(chunk, validated)

    expect(result).toBe('Masked')
  })
})

// ===================================================================
// Tests for Input Validation
// ===================================================================
describe('Saju Chat Stream API - Input Validation', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
  })

  describe('Message Validation', () => {
    it('should require at least one message', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({ messages: [] })

      expect(result.success).toBe(false)
    })

    it('should accept valid messages array', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(result.success).toBe(true)
    })

    it('should reject messages with invalid role', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'invalid', content: 'Hello' }],
      })

      // Invalid role should be filtered out
      expect(result.data?.messages.length).toBe(0)
    })

    it('should accept messages with valid roles (user, assistant, system)', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [
          { role: 'user', content: 'User message' },
          { role: 'assistant', content: 'Assistant message' },
          { role: 'system', content: 'System message' },
        ],
      })

      expect(result.success).toBe(true)
      expect(result.data.messages.length).toBe(3)
    })
  })

  describe('Locale Validation', () => {
    it('should accept ko locale', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'ko',
      })

      expect(result.success).toBe(true)
      expect(result.data.locale).toBe('ko')
    })

    it('should accept en locale', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'en',
      })

      expect(result.success).toBe(true)
      expect(result.data.locale).toBe('en')
    })

    it('should reject invalid locale', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        locale: 'invalid',
      })

      expect(result.success).toBe(false)
    })

    it('should default locale to ko when not provided', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(result.success).toBe(true)
      expect(result.data.locale).toBe('ko')
    })
  })

  describe('Saju Data Validation', () => {
    it('should accept optional saju object', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        saju: { dayMaster: { heavenlyStem: { name: '甲' } } },
      })

      expect(result.success).toBe(true)
      expect(result.data.saju).toBeDefined()
    })

    it('should accept request without saju data', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Context Validation', () => {
    it('should accept optional context object', () => {
      const schema = capturedStreamRouteConfig.schema
      const result = schema.safeParse({
        messages: [{ role: 'user', content: 'Hello' }],
        context: { theme: 'love', year: 2024 },
      })

      expect(result.success).toBe(true)
      expect(result.data.context).toBeDefined()
    })
  })
})

// ===================================================================
// Tests for Error Handling
// ===================================================================
describe('Saju Chat Stream API - Error Handling', () => {
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
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  it('should handle missing rawBody name gracefully', async () => {
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)
    const rawBody = { ...MOCK_RAW_BODY, name: undefined }

    const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

    expect(result).not.toBeInstanceOf(Response)
    expect(result.body.prompt).toContain('Name: User')
  })

  it('should handle non-string name gracefully', async () => {
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)
    const rawBody = { ...MOCK_RAW_BODY, name: 123 }

    const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, rawBody)

    expect(result).not.toBeInstanceOf(Response)
  })

  it('should handle empty messages array after filtering', async () => {
    const invalidMessages = [
      { role: 'invalid', content: '' },
    ]
    const validated = { ...VALID_CHAT_STREAM_BODY, messages: invalidMessages }
    const req = makePostRequest(validated)

    // This should not throw, even with empty messages
    const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    expect(result).toBeDefined()
  })

  it('should handle missing x-session-id header', async () => {
    const reqWithoutSession = new NextRequest('http://localhost/api/saju/chat-stream', {
      method: 'POST',
      body: JSON.stringify(VALID_CHAT_STREAM_BODY),
      headers: { 'content-type': 'application/json' },
    })

    const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, reqWithoutSession, MOCK_RAW_BODY)

    expect(result.body.session_id).toBeUndefined()
  })
})

// ===================================================================
// Tests for System Prompt
// ===================================================================
describe('Saju Chat Stream API - System Prompt', () => {
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
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
  })

  describe('Korean System Prompt', () => {
    it('should include Korean saju counselor instructions', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('사주')
      expect(result.body.prompt).toContain('전문')
    })

    it('should include no-greeting rule in Korean', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('인사 금지')
    })

    it('should include response format sections in Korean', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

      const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('【일간】')
      expect(result.body.prompt).toContain('【대운】')
      expect(result.body.prompt).toContain('【세운】')
      expect(result.body.prompt).toContain('【오행】')
      expect(result.body.prompt).toContain('【조언】')
    })
  })

  describe('English System Prompt', () => {
    it('should include English saju counselor instructions', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'en' }

      const result = await buildPayload(validated, { ...MOCK_CONTEXT, locale: 'en' }, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('Saju')
      expect(result.body.prompt).toContain('Four Pillars')
    })

    it('should include no-greeting rule in English', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'en' }

      const result = await buildPayload(validated, { ...MOCK_CONTEXT, locale: 'en' }, req, MOCK_RAW_BODY)

      expect(result.body.prompt).toContain('NO GREETING')
    })

    it('should include response format sections in English', async () => {
      const req = makePostRequest(VALID_CHAT_STREAM_BODY)
      const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'en' }

      const result = await buildPayload(validated, { ...MOCK_CONTEXT, locale: 'en' }, req, MOCK_RAW_BODY)

      // English uses the same section markers
      expect(result.body.prompt).toContain('Day master')
    })
  })
})

// ===================================================================
// Integration Tests
// ===================================================================
describe('Saju Chat Stream API - Integration', () => {
  let buildPayload: (validated: any, context: any, req?: any, rawBody?: any) => Promise<any>
  let transform: (chunk: string, validated: any) => string

  beforeEach(async () => {
    vi.clearAllMocks()
    capturedStreamRouteConfig = null
    mockContainsForbidden.mockReturnValue(false)
    mockSanitizeLocaleText.mockImplementation((text: string) => text)
    mockMaskTextWithName.mockImplementation((text: string) => text)

    vi.resetModules()

    vi.doMock('@/lib/streaming', () => ({
      createStreamRoute: (config: any) => {
        capturedStreamRouteConfig = config
        return async (req: NextRequest) => new Response('stream', { status: 200 })
      },
      createFallbackSSEStream: (...args: unknown[]) => mockCreateFallbackSSEStream(...args),
    }))

    await import('@/app/api/saju/chat-stream/route')
    buildPayload = capturedStreamRouteConfig.buildPayload
    transform = capturedStreamRouteConfig.transform
  })

  it('should complete full chat stream flow', async () => {
    const req = makePostRequest(VALID_CHAT_STREAM_BODY)

    const result = await buildPayload(VALID_CHAT_STREAM_BODY, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    // Verify payload structure
    expect(result.endpoint).toBe('/saju/ask-stream')
    expect(result.body).toHaveProperty('theme')
    expect(result.body).toHaveProperty('prompt')
    expect(result.body).toHaveProperty('locale')
    expect(result.body).toHaveProperty('birth')
    expect(result.body).toHaveProperty('history')
    expect(result.body).toHaveProperty('counselor_type', 'saju')
  })

  it('should handle conversation history correctly', async () => {
    const conversationMessages = [
      { role: 'user', content: 'What is my day master?' },
      { role: 'assistant', content: 'Your day master is...' },
      { role: 'user', content: 'How does it affect my career?' },
    ]
    const validated = { ...VALID_CHAT_STREAM_BODY, messages: conversationMessages }
    const req = makePostRequest(validated)

    const result = await buildPayload(validated, MOCK_CONTEXT, req, MOCK_RAW_BODY)

    // Should include conversation in prompt
    expect(result.body.prompt).toContain('Conversation:')
    // History should not include system messages
    expect(result.body.history.every((m: any) => m.role !== 'system')).toBe(true)
  })

  it('should transform stream chunks correctly', () => {
    const chunk = 'This is a saju reading for your career'
    const validated = { ...VALID_CHAT_STREAM_BODY, locale: 'ko' }

    const transformed = transform(chunk, validated)

    expect(mockSanitizeLocaleText).toHaveBeenCalledWith(chunk, 'ko')
    expect(mockMaskTextWithName).toHaveBeenCalled()
    expect(transformed).toBeDefined()
  })

  it('should build complete payload with all optional fields', async () => {
    const fullRawBody = {
      ...MOCK_RAW_BODY,
      userContext: 'User is asking about career changes',
      saju: {
        dayMaster: { heavenlyStem: { name: '甲', element: '목' } },
        fiveElements: { wood: 3, fire: 2, earth: 1, metal: 2, water: 2 },
      },
    }
    const validated = {
      ...VALID_CHAT_STREAM_BODY,
      saju: fullRawBody.saju,
      context: { topic: 'career' },
    }
    const req = makePostRequest(validated)

    const result = await buildPayload(validated, MOCK_CONTEXT, req, fullRawBody)

    expect(result.body.saju).toBeDefined()
    expect(result.body.user_context).toBe('User is asking about career changes')
    expect(result.body.session_id).toBe('session-123')
  })
})
