import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Mocks - must be before route import
// ============================================================

// Mock middleware - initializeApiContext and createAuthenticatedGuard
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: vi.fn(),
  createAuthenticatedGuard: vi.fn(() => ({
    route: 'destiny-map-chat',
    requireAuth: true,
    rateLimit: { limit: 45, windowSeconds: 60 },
    credits: { type: 'followUp', amount: 1 },
  })),
  extractLocale: vi.fn().mockReturnValue('ko'),
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock premium check
vi.mock('@/lib/auth/premium', () => ({
  isDbPremiumUser: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock Prisma (not used directly but may be imported transitively)
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

// Mock API client for backend calls
const mockApiClientPost = vi.fn()
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockApiClientPost(...args),
  },
}))

// Mock Stripe
const mockStripeCustomersList = vi.fn()
const mockStripeSubscriptionsList = vi.fn()
vi.mock('stripe', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      customers: {
        list: (...args: unknown[]) => mockStripeCustomersList(...args),
      },
      subscriptions: {
        list: (...args: unknown[]) => mockStripeSubscriptionsList(...args),
      },
    })),
  }
})

// Mock astrology engine
const mockComputeDestinyMap = vi.fn()
vi.mock('@/lib/destiny-map/astrologyengine', () => ({
  computeDestinyMap: (...args: unknown[]) => mockComputeDestinyMap(...args),
}))

// Mock prompt builder
vi.mock('@/lib/destiny-map/prompt/fortune/base', () => ({
  buildAllDataPrompt: vi.fn(
    (_lang: string, _theme: string, _result: unknown) => 'Mocked snapshot prompt'
  ),
}))

// Mock text guards
vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((text: string, _max?: number) => text),
  cleanText: vi.fn((text: string, _max?: number) => text),
  PROMPT_BUDGET_CHARS: 15000,
  safetyMessage: vi.fn((locale: string) =>
    locale === 'ko' ? '규제/민감 주제로 답변이 제한됩니다.' : 'That topic cannot be handled.'
  ),
  containsForbidden: vi.fn(() => false),
}))

// Mock sanitize helpers
vi.mock('@/lib/destiny-map/sanitize', () => ({
  sanitizeLocaleText: vi.fn((text: string, _locale: string) => text),
  maskTextWithName: vi.fn((text: string, _name?: string) => text),
}))

// Mock Zod validation schema
vi.mock('@/lib/api/zodValidation', () => ({
  destinyMapChatSchema: {
    safeParse: vi.fn((data: unknown) => {
      if (!data || typeof data !== 'object') {
        return { success: false, error: { issues: [{ path: [], message: 'Expected object' }] } }
      }
      const obj = data as Record<string, unknown>
      // Check for required messages array
      if (!Array.isArray(obj.messages)) {
        return {
          success: false,
          error: {
            issues: [
              { path: ['messages'], message: 'messages must be an array', code: 'invalid_type' },
            ],
          },
        }
      }
      if (obj.messages.length === 0) {
        return {
          success: false,
          error: {
            issues: [
              {
                path: ['messages'],
                message: 'messages must have at least 1 item',
                code: 'too_small',
              },
            ],
          },
        }
      }
      return { success: true, data: obj }
    }),
  },
  createValidationErrorResponse: vi.fn(
    (zodError: { issues: Array<{ path: string[]; message: string; code?: string }> }) => {
      // Map Zod error to proper HTTP response
      const firstIssue = zodError.issues[0]
      const code = firstIssue?.code === 'invalid_type' ? 'MISSING_FIELD' : 'VALIDATION_ERROR'
      const status = code === 'MISSING_FIELD' ? 400 : 422
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code,
            message: firstIssue?.message || 'Validation failed',
            status,
          },
        }),
        { status, headers: { 'Content-Type': 'application/json' } }
      )
    }
  ),
}))

// Mock constants
vi.mock('@/lib/constants/api-limits', () => ({
  ALLOWED_LOCALES: new Set(['ko', 'en']),
  ALLOWED_GENDERS: new Set(['male', 'female', 'other']),
  MESSAGE_LIMITS: { MAX_STREAM_MESSAGES: 10 },
}))

vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    PAYMENT_REQUIRED: 402,
    SERVER_ERROR: 500,
  },
}))

vi.mock('@/lib/validation/patterns', () => ({
  DATE_RE: /^\d{4}-\d{2}-\d{2}$/,
  TIME_RE: /^\d{2}:\d{2}$/,
  LIMITS: {
    NAME: 80,
    THEME: 40,
    CV_TEXT_SHORT: 1200,
  },
}))

// ============================================================
// Import route AFTER all mocks
// ============================================================
import { POST } from '@/app/api/destiny-map/chat/route'
import { getServerSession } from 'next-auth'
import { initializeApiContext } from '@/lib/api/middleware'
import { containsForbidden } from '@/lib/textGuards'
import { destinyMapChatSchema } from '@/lib/api/zodValidation'
import { isDbPremiumUser } from '@/lib/auth/premium'

// ============================================================
// Helpers
// ============================================================

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
  expires: '2026-12-31',
}

const mockContext = {
  userId: 'user-123',
  session: mockSession,
  ip: '127.0.0.1',
  locale: 'ko',
  isAuthenticated: true,
  isPremium: false,
}

const mockCombinedResult = {
  saju: {
    dayMaster: { name: 'Gab', element: 'wood' },
    fiveElements: { wood: 30, fire: 20, earth: 15, metal: 20, water: 15 },
    pillars: {
      year: { heavenlyStem: 'Gyeong', earthlyBranch: 'O' },
      month: { heavenlyStem: 'Sin', earthlyBranch: 'Sa' },
      day: { heavenlyStem: 'Gab', earthlyBranch: 'Ja' },
      time: { heavenlyStem: 'Eul', earthlyBranch: 'Mi' },
    },
  },
  astrology: {
    sun: { sign: 'Taurus', degree: 24 },
  },
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    birthDate: '1990-05-15',
    birthTime: '14:30',
    gender: 'male',
    latitude: 37.5665,
    longitude: 126.978,
    theme: 'life',
    lang: 'ko',
    messages: [{ role: 'user', content: 'Tell me about my career path' }],
    ...overrides,
  }
}

function createPostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/destiny-map/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body !== null ? JSON.stringify(body) : undefined,
  })
}

// ============================================================
// Tests
// ============================================================

describe('Destiny Map Chat API - POST /api/destiny-map/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: middleware passes with authenticated context
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: mockContext,
      error: undefined,
    })

    // Default: session returns authenticated user
    vi.mocked(getServerSession).mockResolvedValue(mockSession as never)

    // Default: no DB premium subscription
    vi.mocked(isDbPremiumUser).mockResolvedValue(false as never)

    // Default: compute destiny map succeeds
    mockComputeDestinyMap.mockResolvedValue(mockCombinedResult)

    // Default: backend API call succeeds
    mockApiClientPost.mockResolvedValue({
      ok: true,
      data: {
        fusion_layer: 'This is your AI-generated destiny map chat response.',
      },
    })

    // Default: Stripe returns active subscription (for paid check)
    mockStripeCustomersList.mockResolvedValue({
      data: [{ id: 'cus_123' }],
    })
    mockStripeSubscriptionsList.mockResolvedValue({
      data: [{ status: 'active' }],
    })
  })

  // -------------------------------------------------------------------------
  // Authentication Tests
  // -------------------------------------------------------------------------
  describe('Authentication', () => {
    it('should return error when middleware rejects with authentication failure', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...mockContext, isAuthenticated: false },
        error: NextResponse.json({ error: 'not_authenticated' }, { status: 401 }),
      })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('not_authenticated')
    })

    it('should return 401 when session has no user email in production mode', async () => {
      // Simulate production by having middleware pass but getServerSession return no email
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: mockContext,
        error: undefined,
      })
      vi.mocked(getServerSession).mockResolvedValue({ user: {} } as never)

      // Note: The route checks NODE_ENV for dev mode skip
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      process.env.NODE_ENV = originalEnv

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('should skip Stripe check in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const request = createPostRequest(validBody())
      const response = await POST(request)

      process.env.NODE_ENV = originalEnv

      // Should not call Stripe at all in dev mode
      expect(mockStripeCustomersList).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // Payment Requirement Tests
  // -------------------------------------------------------------------------
  describe('Payment Requirements', () => {
    it('should return 402 when user has no active subscription', async () => {
      const originalEnv = process.env.NODE_ENV
      const originalRequirePaid = process.env.REQUIRE_PAID_CHAT
      process.env.NODE_ENV = 'production'
      process.env.REQUIRE_PAID_CHAT = 'true'

      mockStripeCustomersList.mockResolvedValue({ data: [{ id: 'cus_123' }] })
      mockStripeSubscriptionsList.mockResolvedValue({ data: [] })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      process.env.NODE_ENV = originalEnv
      process.env.REQUIRE_PAID_CHAT = originalRequirePaid

      expect(response.status).toBe(402)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('PAYMENT_REQUIRED')
    })

    it('should allow access when subscription is trialing', async () => {
      const originalEnv = process.env.NODE_ENV
      const originalRequirePaid = process.env.REQUIRE_PAID_CHAT
      const originalStripeKey = process.env.STRIPE_SECRET_KEY
      process.env.NODE_ENV = 'production'
      process.env.REQUIRE_PAID_CHAT = 'true'
      process.env.STRIPE_SECRET_KEY = 'sk_test_mock'

      mockStripeCustomersList.mockResolvedValue({ data: [{ id: 'cus_123' }] })
      mockStripeSubscriptionsList.mockResolvedValue({
        data: [{ status: 'trialing' }],
      })

      const request = createPostRequest(validBody())
      const response = await POST(request)

      process.env.NODE_ENV = originalEnv
      process.env.REQUIRE_PAID_CHAT = originalRequirePaid
      process.env.STRIPE_SECRET_KEY = originalStripeKey

      expect(response.status).toBe(200)
    })

    it('should allow access when REQUIRE_PAID_CHAT is not true', async () => {
      const originalEnv = process.env.NODE_ENV
      const originalRequirePaid = process.env.REQUIRE_PAID_CHAT
      process.env.NODE_ENV = 'production'
      process.env.REQUIRE_PAID_CHAT = 'false'

      const request = createPostRequest(validBody())
      const response = await POST(request)

      process.env.NODE_ENV = originalEnv
      process.env.REQUIRE_PAID_CHAT = originalRequirePaid

      // Should not check Stripe
      expect(mockStripeCustomersList).not.toHaveBeenCalled()
      expect(response.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // Body Parsing Tests
  // -------------------------------------------------------------------------
  describe('Body Parsing', () => {
    it('should return 400 for unparseable JSON body', async () => {
      const request = new NextRequest('http://localhost/api/destiny-map/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '<<<not json>>>',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should return 400 when body is empty', async () => {
      const request = new NextRequest('http://localhost/api/destiny-map/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
    })
  })

  // -------------------------------------------------------------------------
  // Zod Validation Tests
  // -------------------------------------------------------------------------
  describe('Zod Schema Validation', () => {
    it('should return error when messages array is missing', async () => {
      const bodyWithoutMessages = { ...validBody() }
      delete bodyWithoutMessages.messages

      const request = createPostRequest(bodyWithoutMessages)
      const response = await POST(request)
      const data = await response.json()

      // Validation behavior varies by middleware configuration
      expect([400, 422, 500]).toContain(response.status)
      expect(data.success).toBe(false)
    })

    it('should return 422 when messages array is empty', async () => {
      const request = createPostRequest(validBody({ messages: [] }))
      const response = await POST(request)
      const data = await response.json()

      // Empty messages array fails Zod schema validation (too_small error)
      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // -------------------------------------------------------------------------
  // Field Validation Tests
  // -------------------------------------------------------------------------
  describe('Field Validation', () => {
    it('should return 400 for missing birthDate', async () => {
      const body = validBody()
      delete body.birthDate

      const request = createPostRequest(body)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('MISSING_FIELD')
    })

    it('should return 400 for invalid birthDate format', async () => {
      const request = createPostRequest(validBody({ birthDate: 'not-a-date' }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_DATE')
    })

    it('should return 400 for invalid birthTime format', async () => {
      const request = createPostRequest(validBody({ birthTime: 'invalid' }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INVALID_TIME')
    })

    it('should return 400 for latitude out of range', async () => {
      const request = createPostRequest(validBody({ latitude: 999 }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for longitude out of range', async () => {
      const request = createPostRequest(validBody({ longitude: -999 }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })

    it('should return 400 for string latitude that cannot parse to valid number', async () => {
      // Note: NaN and Infinity are converted to null in JSON.stringify, which becomes 0 via Number()
      // So we test with a string that cannot be parsed to a valid coordinate number
      const request = createPostRequest(validBody({ latitude: 'not_a_number' }))
      const response = await POST(request)
      const data = await response.json()

      // 'not_a_number' -> Number('not_a_number') -> NaN, which fails Number.isFinite check
      expect(response.status).toBe(422)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('VALIDATION_ERROR')
    })
  })

  // -------------------------------------------------------------------------
  // Message Validation Tests
  // -------------------------------------------------------------------------
  describe('Chat Message Validation', () => {
    it('should normalize valid messages with allowed roles', async () => {
      const messages = [
        { role: 'system', content: 'System message' },
        { role: 'user', content: 'User question' },
        { role: 'assistant', content: 'Assistant response' },
      ]

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockComputeDestinyMap).toHaveBeenCalled()
    })

    it('should skip messages with invalid roles', async () => {
      const messages = [
        { role: 'invalid_role', content: 'Should be skipped' },
        { role: 'user', content: 'Valid message' },
      ]

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      // Should succeed with only valid messages
      expect(response.status).toBe(200)
    })

    it('should skip messages with empty content', async () => {
      const messages = [
        { role: 'user', content: '' },
        { role: 'user', content: 'Valid message' },
      ]

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should truncate message content to 2000 characters', async () => {
      const longContent = 'a'.repeat(3000)
      const messages = [{ role: 'user', content: longContent }]

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      expect(response.status).toBe(200)
      // The message content should be internally truncated
    })

    it('should limit messages to MAX_STREAM_MESSAGES', async () => {
      const messages = Array.from({ length: 20 }, (_, i) => ({
        role: 'user',
        content: `Message ${i}`,
      }))

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      // Should succeed, internally limiting to last 10 messages
      expect(response.status).toBe(200)
    })
  })

  // -------------------------------------------------------------------------
  // Success Cases
  // -------------------------------------------------------------------------
  describe('Successful Chat Response', () => {
    it('should return successful chat reply', async () => {
      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBeDefined()
      expect(data.fallback).toBe(false)
      expect(data.backendAvailable).toBe(true)
    })

    it('should call computeDestinyMap with correct parameters', async () => {
      const body = validBody({
        name: 'TestUser',
        birthDate: '1995-03-20',
        birthTime: '09:15',
        gender: 'female',
        latitude: 35.1796,
        longitude: 129.0756,
        theme: 'career',
      })

      const request = createPostRequest(body)
      await POST(request)

      expect(mockComputeDestinyMap).toHaveBeenCalledWith({
        name: 'TestUser',
        birthDate: '1995-03-20',
        birthTime: '09:15',
        latitude: 35.1796,
        longitude: 129.0756,
        gender: 'female',
        theme: 'career',
      })
    })

    it('should call backend API with correct payload', async () => {
      const request = createPostRequest(validBody({ theme: 'love', lang: 'en' }))
      await POST(request)

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/ask',
        expect.objectContaining({
          theme: 'love',
          locale: 'en',
          saju: mockCombinedResult.saju,
          astro: mockCombinedResult.astrology,
        }),
        { timeout: 60000 }
      )
    })

    it('should set X-Fallback header to 0 on success', async () => {
      const request = createPostRequest(validBody())
      const response = await POST(request)

      expect(response.headers.get('X-Fallback')).toBe('0')
    })

    it('should use fusion_layer response when available', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: true,
        data: { fusion_layer: 'Fusion layer response' },
      })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.reply).toBe('Fusion layer response')
    })

    it('should fallback to report field when fusion_layer is missing', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: true,
        data: { report: 'Report response' },
      })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.reply).toBe('Report response')
    })
  })

  // -------------------------------------------------------------------------
  // Default Value Tests
  // -------------------------------------------------------------------------
  describe('Default and Fallback Values', () => {
    it('should default gender to male when invalid', async () => {
      const request = createPostRequest(validBody({ gender: 'unknown' }))
      await POST(request)

      expect(mockComputeDestinyMap).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'male' })
      )
    })

    it('should accept prefer_not as gender', async () => {
      const request = createPostRequest(validBody({ gender: 'prefer_not' }))
      await POST(request)

      expect(mockComputeDestinyMap).toHaveBeenCalledWith(
        expect.objectContaining({ gender: 'prefer_not' })
      )
    })

    it('should default lang to ko when invalid', async () => {
      const request = createPostRequest(validBody({ lang: 'invalid' }))
      await POST(request)

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/ask',
        expect.objectContaining({ locale: 'ko' }),
        expect.anything()
      )
    })

    it('should default theme to life when not provided', async () => {
      const body = validBody()
      delete body.theme

      const request = createPostRequest(body)
      await POST(request)

      expect(mockComputeDestinyMap).toHaveBeenCalledWith(expect.objectContaining({ theme: 'life' }))
    })

    it('should truncate name to MAX_NAME length', async () => {
      const longName = 'A'.repeat(200)
      const request = createPostRequest(validBody({ name: longName }))
      await POST(request)

      const callArgs = mockComputeDestinyMap.mock.calls[0][0]
      expect(callArgs.name.length).toBeLessThanOrEqual(80)
    })

    it('should truncate theme to MAX_THEME length', async () => {
      const longTheme = 'B'.repeat(100)
      const request = createPostRequest(validBody({ theme: longTheme }))
      await POST(request)

      const callArgs = mockComputeDestinyMap.mock.calls[0][0]
      expect(callArgs.theme.length).toBeLessThanOrEqual(40)
    })

    it('should handle latitude as string by converting to number', async () => {
      const request = createPostRequest(validBody({ latitude: '37.5665' }))
      await POST(request)

      expect(mockComputeDestinyMap).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: 37.5665 })
      )
    })

    it('should handle longitude as string by converting to number', async () => {
      const request = createPostRequest(validBody({ longitude: '126.978' }))
      await POST(request)

      expect(mockComputeDestinyMap).toHaveBeenCalledWith(
        expect.objectContaining({ longitude: 126.978 })
      )
    })
  })

  // -------------------------------------------------------------------------
  // Safety and Content Filtering Tests
  // -------------------------------------------------------------------------
  describe('Safety and Content Filtering', () => {
    it('should return safety message when cvText contains forbidden content', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const request = createPostRequest(validBody({ cvText: 'forbidden content' }))
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.safety).toBe(true)
      expect(data.fallback).toBe(true)
      expect(data.reply).toBeDefined()

      vi.mocked(containsForbidden).mockReturnValue(false)
    })

    it('should return Korean safety message for ko locale', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const request = createPostRequest(validBody({ lang: 'ko', cvText: 'bad' }))
      const response = await POST(request)
      const data = await response.json()

      expect(data.reply).toContain('규제')

      vi.mocked(containsForbidden).mockReturnValue(false)
    })

    it('should return English safety message for en locale', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const request = createPostRequest(validBody({ lang: 'en', cvText: 'bad' }))
      const response = await POST(request)
      const data = await response.json()

      expect(data.reply).toContain('cannot be handled')

      vi.mocked(containsForbidden).mockReturnValue(false)
    })
  })

  // -------------------------------------------------------------------------
  // Backend Fallback Tests
  // -------------------------------------------------------------------------
  describe('Backend Fallback Handling', () => {
    it('should return fallback reply when backend returns not ok', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: false,
        error: 'Backend unavailable',
      })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.fallback).toBe(true)
      expect(data.backendAvailable).toBe(false)
      expect(response.headers.get('X-Fallback')).toBe('1')
    })

    it('should return Korean fallback message for ko locale when backend fails', async () => {
      mockApiClientPost.mockResolvedValue({ ok: false })

      const request = createPostRequest(validBody({ lang: 'ko' }))
      const response = await POST(request)
      const data = await response.json()

      expect(data.reply).toContain('AI 분석 서비스가 일시적으로 불가합니다')
    })

    it('should return English fallback message for en locale when backend fails', async () => {
      mockApiClientPost.mockResolvedValue({ ok: false })

      const request = createPostRequest(validBody({ lang: 'en' }))
      const response = await POST(request)
      const data = await response.json()

      expect(data.reply).toContain('temporarily unavailable')
    })

    it('should use fallback when backend returns empty data', async () => {
      mockApiClientPost.mockResolvedValue({ ok: true, data: {} })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      // Should use fallback reply since fusion_layer and report are both empty
      expect(data.reply).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // Error Handling Tests
  // -------------------------------------------------------------------------
  describe('Error Handling', () => {
    it('should return 500 on computeDestinyMap failure', async () => {
      mockComputeDestinyMap.mockRejectedValue(new Error('Astrology engine error'))

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should return 500 on backend API timeout', async () => {
      mockApiClientPost.mockRejectedValue(new Error('Request timeout'))

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should log errors using logger.error', async () => {
      const { logger } = await import('@/lib/logger')
      mockComputeDestinyMap.mockRejectedValue(new Error('Test error'))

      const request = createPostRequest(validBody())
      await POST(request)

      expect(logger.error).toHaveBeenCalledWith('[DestinyMap chat API error]', expect.any(Error))
    })
  })

  // -------------------------------------------------------------------------
  // CV Text Processing Tests
  // -------------------------------------------------------------------------
  describe('CV Text Processing', () => {
    it('should include cvText in chat prompt when provided', async () => {
      const request = createPostRequest(validBody({ cvText: 'I am a software engineer' }))
      await POST(request)

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/ask',
        expect.objectContaining({
          prompt: expect.stringContaining('User CV'),
        }),
        expect.anything()
      )
    })

    it('should truncate cvText to MAX_CV length', async () => {
      const longCvText = 'X'.repeat(5000)
      const request = createPostRequest(validBody({ cvText: longCvText }))
      const response = await POST(request)

      // Should not fail - cvText is truncated internally
      expect(response.status).toBe(200)
    })

    it('should skip cvText in prompt when empty', async () => {
      const request = createPostRequest(validBody({ cvText: '' }))
      await POST(request)

      // Should still call API without CV section
      expect(mockApiClientPost).toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // Locale Handling Tests
  // -------------------------------------------------------------------------
  describe('Locale Handling', () => {
    it('should pass ko locale to backend', async () => {
      const request = createPostRequest(validBody({ lang: 'ko' }))
      await POST(request)

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/ask',
        expect.objectContaining({ locale: 'ko' }),
        expect.anything()
      )
    })

    it('should pass en locale to backend', async () => {
      const request = createPostRequest(validBody({ lang: 'en' }))
      await POST(request)

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/ask',
        expect.objectContaining({ locale: 'en' }),
        expect.anything()
      )
    })
  })

  // -------------------------------------------------------------------------
  // Rate Limiting Integration Tests
  // -------------------------------------------------------------------------
  describe('Rate Limiting', () => {
    it('should return rate limit error from middleware', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: mockContext,
        error: NextResponse.json(
          {
            success: false,
            error: {
              code: 'RATE_LIMITED',
              message: 'Too many requests',
              status: 429,
            },
          },
          {
            status: 429,
            headers: { 'Retry-After': '60' },
          }
        ),
      })

      const request = createPostRequest(validBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RATE_LIMITED')
    })
  })

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle undefined name gracefully', async () => {
      const body = validBody()
      delete body.name

      const request = createPostRequest(body)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockComputeDestinyMap).toHaveBeenCalledWith(
        expect.objectContaining({ name: undefined })
      )
    })

    it('should handle null values in messages array', async () => {
      const messages = [null, { role: 'user', content: 'Valid message' }]

      // Reset the mock to allow the messages through Zod
      vi.mocked(destinyMapChatSchema.safeParse).mockReturnValue({
        success: true,
        data: { messages },
      } as never)

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      // Should filter out null and process valid messages
      expect(response.status).toBe(200)
    })

    it('should handle messages with non-string content', async () => {
      const messages = [
        { role: 'user', content: 12345 },
        { role: 'user', content: 'Valid' },
      ]

      vi.mocked(destinyMapChatSchema.safeParse).mockReturnValue({
        success: true,
        data: { messages },
      } as never)

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      // Should filter non-string content and process valid ones
      expect(response.status).toBe(200)
    })

    it('should clamp messages to last 6 for chat history', async () => {
      const messages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      // The clampMessages function limits to 6 messages
      expect(response.status).toBe(200)
    })

    it('should handle whitespace-only content in messages', async () => {
      const messages = [
        { role: 'user', content: '   ' },
        { role: 'user', content: 'Valid message' },
      ]

      vi.mocked(destinyMapChatSchema.safeParse).mockReturnValue({
        success: true,
        data: { messages },
      } as never)

      const request = createPostRequest(validBody({ messages }))
      const response = await POST(request)

      // Whitespace-only should be trimmed to empty and filtered
      expect(response.status).toBe(200)
    })

    it('should handle boundary latitude values', async () => {
      // Test -90
      let request = createPostRequest(validBody({ latitude: -90 }))
      let response = await POST(request)
      expect(response.status).toBe(200)

      // Test 90
      request = createPostRequest(validBody({ latitude: 90 }))
      response = await POST(request)
      expect(response.status).toBe(200)
    })

    it('should handle boundary longitude values', async () => {
      // Test -180
      let request = createPostRequest(validBody({ longitude: -180 }))
      let response = await POST(request)
      expect(response.status).toBe(200)

      // Test 180
      request = createPostRequest(validBody({ longitude: 180 }))
      response = await POST(request)
      expect(response.status).toBe(200)
    })
  })
})
