import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Mocks - must be before route import
// ============================================================

// Mock middleware with withApiMiddleware and createAuthenticatedGuard
vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: vi.fn(
    (handler: Function, _options: unknown) =>
      async (req: NextRequest, ...args: unknown[]) => {
        const { initializeApiContext } = await import('@/lib/api/middleware')
        const { context, error } = await (initializeApiContext as Function)(req)
        if (error) return error
        return handler(req, context, ...args)
      }
  ),
  initializeApiContext: vi.fn(),
  createAuthenticatedGuard: vi.fn(() => ({
    route: 'compatibility-chat',
    requireAuth: true,
    rateLimit: { limit: 60, windowSeconds: 60 },
    credits: { type: 'compatibility', amount: 1 },
  })),
  extractLocale: vi.fn(() => 'ko'),
  apiSuccess: vi.fn((data: unknown) => ({ data })),
  apiError: vi.fn((code: string, message?: string) => ({
    error: { code, message },
  })),
  ErrorCodes: {
    BAD_REQUEST: 'BAD_REQUEST',
    UNAUTHORIZED: 'UNAUTHORIZED',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    RATE_LIMITED: 'RATE_LIMITED',
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
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

// Mock streaming
vi.mock('@/lib/streaming', () => ({
  createFallbackSSEStream: vi.fn((data: Record<string, unknown>) => {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }),
}))

// Mock ApiClient
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: vi.fn(),
  },
}))

// Mock text guards
vi.mock('@/lib/textGuards', () => ({
  guardText: vi.fn((value: string, _max?: number) => value?.slice(0, _max) || ''),
  containsForbidden: vi.fn().mockReturnValue(false),
  safetyMessage: vi.fn((lang: string) =>
    lang === 'ko'
      ? '규제/민감 주제로 답변이 제한됩니다.'
      : 'That topic cannot be handled. Please ask about another area.'
  ),
}))

// Mock Zod validation for compatibilityChatRequestSchema
vi.mock('@/lib/api/zodValidation', () => ({
  compatibilityChatRequestSchema: {
    safeParse: vi.fn((data: unknown) => {
      const body = data as Record<string, unknown>
      if (!body || typeof body !== 'object') {
        return {
          success: false,
          error: { issues: [{ path: [], message: 'Expected object' }] },
        }
      }
      if (!body.persons || !Array.isArray(body.persons)) {
        return {
          success: false,
          error: { issues: [{ path: ['persons'], message: 'persons is required' }] },
        }
      }
      if (body.persons.length < 2) {
        return {
          success: false,
          error: { issues: [{ path: ['persons'], message: 'At least 2 persons required' }] },
        }
      }
      if (body.persons.length > 4) {
        return {
          success: false,
          error: { issues: [{ path: ['persons'], message: 'Max 4 persons allowed' }] },
        }
      }
      if (!body.messages || !Array.isArray(body.messages)) {
        return {
          success: false,
          error: { issues: [{ path: ['messages'], message: 'messages must be an array' }] },
        }
      }
      if (body.messages.length > 20) {
        return {
          success: false,
          error: { issues: [{ path: ['messages'], message: 'Max 20 messages allowed' }] },
        }
      }
      if (body.lang && !['ko', 'en', 'ja', 'zh'].includes(body.lang as string)) {
        return {
          success: false,
          error: { issues: [{ path: ['lang'], message: 'Invalid language' }] },
        }
      }
      return {
        success: true,
        data: {
          persons: body.persons,
          compatibilityResult: body.compatibilityResult ?? '',
          messages: body.messages,
          lang: body.lang,
          locale: body.locale,
        },
      }
    }),
  },
  createValidationErrorResponse: vi.fn((zodError: any) => {
    const { NextResponse } = require('next/server')
    const details = (zodError.issues || []).map((e: any) => ({
      path: Array.isArray(e.path) ? e.path.join('.') : String(e.path),
      message: e.message,
    }))
    return NextResponse.json({ error: 'validation_failed', details }, { status: 400 })
  }),
}))

// Mock HTTP constants
vi.mock('@/lib/constants/http', () => ({
  HTTP_STATUS: {
    OK: 200,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    PAYMENT_REQUIRED: 402,
    NOT_FOUND: 404,
    TOO_MANY_REQUESTS: 429,
    SERVER_ERROR: 500,
  },
}))

// ============================================================
// Import route and mocked modules AFTER all mocks
// ============================================================
import { POST } from '@/app/api/compatibility/chat/route'
import { initializeApiContext } from '@/lib/api/middleware'
import { createFallbackSSEStream } from '@/lib/streaming'
import { apiClient } from '@/lib/api/ApiClient'
import { containsForbidden, safetyMessage, guardText } from '@/lib/textGuards'
import { logger } from '@/lib/logger'

// ============================================================
// Helpers
// ============================================================
const defaultContext = {
  userId: 'user-123',
  session: { user: { id: 'user-123', email: 'test@example.com', plan: 'premium' } },
  ip: '127.0.0.1',
  locale: 'ko',
  isAuthenticated: true,
  isPremium: true,
  creditInfo: { remaining: 10 },
}

const validPersons = [
  { name: 'Person 1', date: '1990-01-15', time: '10:30' },
  { name: 'Person 2', date: '1992-05-20', time: '14:00', relation: 'partner' },
]

const validMessages = [{ role: 'user', content: 'How compatible are we?' }]

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/compatibility/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// Helper to consume SSE stream and get all data
async function consumeSSEStream(response: Response): Promise<string[]> {
  const reader = response.body?.getReader()
  if (!reader) return []

  const decoder = new TextDecoder()
  const chunks: string[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(decoder.decode(value, { stream: true }))
  }

  return chunks
}

// ============================================================
// Tests
// ============================================================
describe('Compatibility Chat API - POST /api/compatibility/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: authenticated user with no errors
    vi.mocked(initializeApiContext).mockResolvedValue({
      context: defaultContext,
      error: undefined,
    } as unknown as ReturnType<typeof initializeApiContext>)

    // Default: backend AI responds successfully
    vi.mocked(apiClient.post).mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        data: {
          response: 'AI generated compatibility chat response about your relationship.',
        },
      },
    } as unknown as ReturnType<typeof apiClient.post>)

    // Default: no forbidden content
    vi.mocked(containsForbidden).mockReturnValue(false)
  })

  // ----------------------------------------------------------
  // 1. Authentication Requirements
  // ----------------------------------------------------------
  describe('Authentication Requirements', () => {
    it('should return 401 when user is not authenticated', async () => {
      const errorResponse = NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...defaultContext, userId: null, isAuthenticated: false, session: null },
        error: errorResponse,
      } as unknown as ReturnType<typeof initializeApiContext>)

      const req = createRequest({ persons: validPersons, messages: validMessages })
      const response = await POST(req)

      expect(response.status).toBe(401)
      const data = await response.json()
      expect(data.error).toBe('unauthorized')
    })

    it('should return 429 when rate limited', async () => {
      const rateLimitResponse = NextResponse.json(
        { error: 'rate_limited', retryAfter: 60 },
        { status: 429 }
      )
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: defaultContext,
        error: rateLimitResponse,
      } as unknown as ReturnType<typeof initializeApiContext>)

      const req = createRequest({ persons: validPersons, messages: validMessages })
      const response = await POST(req)

      expect(response.status).toBe(429)
    })

    it('should return 402 when user has insufficient credits', async () => {
      const creditError = NextResponse.json(
        { error: 'insufficient_credits', remaining: 0, upgradeUrl: '/pricing' },
        { status: 402 }
      )
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...defaultContext, creditInfo: { remaining: 0 } },
        error: creditError,
      } as unknown as ReturnType<typeof initializeApiContext>)

      const req = createRequest({ persons: validPersons, messages: validMessages })
      const response = await POST(req)

      expect(response.status).toBe(402)
    })

    it('should proceed when user is authenticated with valid credits', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })

  // ----------------------------------------------------------
  // 2. Validation of Input Data
  // ----------------------------------------------------------
  describe('Validation of Input Data', () => {
    it('should return 400 when persons array is missing', async () => {
      const req = createRequest({ messages: validMessages })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'persons' })])
      )
    })

    it('should return 400 when persons has fewer than 2 entries', async () => {
      const req = createRequest({
        persons: [{ name: 'Only One', date: '1990-01-01', time: '12:00' }],
        messages: validMessages,
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when persons has more than 4 entries', async () => {
      const tooManyPersons = Array.from({ length: 5 }, (_, i) => ({
        name: `Person ${i + 1}`,
        date: '1990-01-01',
        time: '12:00',
      }))
      const req = createRequest({ persons: tooManyPersons, messages: validMessages })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when messages array is missing', async () => {
      const req = createRequest({ persons: validPersons })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when messages exceeds maximum (20)', async () => {
      const tooManyMessages = Array.from({ length: 21 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))
      const req = createRequest({ persons: validPersons, messages: tooManyMessages })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
    })

    it('should return 400 for invalid language value', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        lang: 'invalid-language',
      })
      const response = await POST(req)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should accept valid language values (ko, en)', async () => {
      for (const lang of ['ko', 'en']) {
        vi.clearAllMocks()
        vi.mocked(initializeApiContext).mockResolvedValue({
          context: defaultContext,
          error: undefined,
        } as unknown as ReturnType<typeof initializeApiContext>)
        vi.mocked(apiClient.post).mockResolvedValue({
          ok: true,
          status: 200,
          data: { data: { response: 'OK' } },
        } as unknown as ReturnType<typeof apiClient.post>)

        const req = createRequest({
          persons: validPersons,
          messages: validMessages,
          lang,
        })
        const response = await POST(req)

        expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      }
    })

    it('should accept compatibilityResult as optional string', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        compatibilityResult: 'Previous analysis showed 85% compatibility score.',
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(apiClient.post).toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // 3. Success Cases
  // ----------------------------------------------------------
  describe('Success Cases', () => {
    it('should return SSE stream response on successful request', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.headers.get('Cache-Control')).toBe('no-cache')
      expect(response.headers.get('Connection')).toBe('keep-alive')
    })

    it('should call backend API with correct parameters', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        lang: 'ko',
        compatibilityResult: 'Previous compatibility analysis...',
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/compatibility/chat',
        expect.objectContaining({
          persons: validPersons,
          locale: 'ko',
        }),
        expect.objectContaining({ timeout: 60000 })
      )
    })

    it('should use context.locale when lang is not provided', async () => {
      vi.mocked(initializeApiContext).mockResolvedValue({
        context: { ...defaultContext, locale: 'en' },
        error: undefined,
      } as unknown as ReturnType<typeof initializeApiContext>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/compatibility/chat',
        expect.objectContaining({
          locale: 'en',
        }),
        expect.anything()
      )
    })

    it('should clamp messages to maximum of 6', async () => {
      const manyMessages = Array.from({ length: 10 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }))

      const req = createRequest({
        persons: validPersons,
        messages: manyMessages,
      })
      await POST(req)

      const callArgs = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
      expect((callArgs.history as unknown[]).length).toBeLessThanOrEqual(6)
    })

    it('should handle AI response with nested data structure', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: {
            response: 'Your compatibility is excellent!',
          },
        },
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should handle AI response with flat response field', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          response: 'Direct response text',
        },
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should handle AI response with interpretation field', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          interpretation: 'Interpreted compatibility insight',
        },
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)

      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should format persons info correctly in prompt', async () => {
      const personsWithDetails = [
        { name: 'Alice', date: '1990-05-15', time: '10:30' },
        { name: 'Bob', date: '1988-08-20', time: '14:00', relation: 'spouse' },
      ]

      const req = createRequest({
        persons: personsWithDetails,
        messages: validMessages,
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
      const callArgs = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
      expect(callArgs.prompt).toContain('Alice')
      expect(callArgs.prompt).toContain('Bob')
    })

    it('should include compatibility context in prompt when provided', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        compatibilityResult: 'Previous analysis: 80% match, fire-water elements.',
      })
      await POST(req)

      const callArgs = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
      expect(callArgs.compatibility_context).toBe(
        'Previous analysis: 80% match, fire-water elements.'
      )
    })
  })

  // ----------------------------------------------------------
  // 4. Error Handling
  // ----------------------------------------------------------
  describe('Error Handling', () => {
    it('should return fallback SSE stream when backend returns non-ok status', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 502,
        data: null,
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        lang: 'ko',
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('AI 서버'),
          done: true,
        })
      )
    })

    it('should return English fallback message when lang is en', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: false,
        status: 500,
        data: null,
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        lang: 'en',
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.stringContaining('AI server'),
          done: true,
        })
      )
    })

    it('should return fallback SSE stream when backend fetch throws', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Network error'))

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalled()
      expect(logger.error).toHaveBeenCalled()
    })

    it('should log error when backend fails', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Connection timeout'))

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      await POST(req)

      expect(logger.error).toHaveBeenCalledWith(
        '[Compatibility Chat] Backend error:',
        expect.any(Error)
      )
    })

    it('should return default message when AI response is empty', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: { response: '' },
        },
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        lang: 'ko',
      })
      const response = await POST(req)

      // Should still return SSE stream with fallback message
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })
  })

  // ----------------------------------------------------------
  // 5. Safety Check / Content Filtering
  // ----------------------------------------------------------
  describe('Safety Check', () => {
    it('should return safety message when forbidden content is detected', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'forbidden topic about medical advice' }],
        lang: 'ko',
      })
      await POST(req)

      expect(createFallbackSSEStream).toHaveBeenCalledWith(expect.objectContaining({ done: true }))
      expect(safetyMessage).toHaveBeenCalled()
    })

    it('should call safetyMessage with correct locale', async () => {
      vi.mocked(containsForbidden).mockReturnValue(true)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'sensitive content' }],
        lang: 'en',
      })
      await POST(req)

      expect(safetyMessage).toHaveBeenCalledWith('en')
    })

    it('should NOT trigger safety check for safe content', async () => {
      vi.mocked(containsForbidden).mockReturnValue(false)

      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Normal question about our relationship' }],
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
    })

    it('should only check the last user message for forbidden content', async () => {
      vi.mocked(containsForbidden).mockReturnValue(false)

      const messages = [
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First response' },
        { role: 'user', content: 'Second question' },
      ]

      const req = createRequest({
        persons: validPersons,
        messages,
      })
      await POST(req)

      expect(containsForbidden).toHaveBeenCalledWith('Second question')
    })

    it('should proceed to backend when no user messages exist', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [],
      })
      await POST(req)

      // Should not call containsForbidden since there's no user message
      expect(apiClient.post).toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // 6. Edge Cases
  // ----------------------------------------------------------
  describe('Edge Cases', () => {
    it('should handle empty messages array', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [],
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
    })

    it('should handle 3 persons', async () => {
      const threePersons = [
        { name: 'A', date: '1990-01-01', time: '10:00' },
        { name: 'B', date: '1992-02-02', time: '12:00', relation: 'partner' },
        { name: 'C', date: '1995-03-03', time: '14:00', relation: 'friend' },
      ]

      const req = createRequest({
        persons: threePersons,
        messages: validMessages,
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
    })

    it('should handle 4 persons (maximum allowed)', async () => {
      const fourPersons = [
        { name: 'A', date: '1990-01-01', time: '10:00' },
        { name: 'B', date: '1992-02-02', time: '12:00', relation: 'partner' },
        { name: 'C', date: '1995-03-03', time: '14:00', relation: 'friend' },
        { name: 'D', date: '1998-04-04', time: '16:00', relation: 'family' },
      ]

      const req = createRequest({
        persons: fourPersons,
        messages: validMessages,
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
    })

    it('should handle persons without names', async () => {
      const personsWithoutNames = [
        { date: '1990-01-15', time: '10:30' },
        { date: '1992-05-20', time: '14:00', relation: 'partner' },
      ]

      const req = createRequest({
        persons: personsWithoutNames,
        messages: validMessages,
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
      const callArgs = vi.mocked(apiClient.post).mock.calls[0][1] as Record<string, unknown>
      expect(callArgs.prompt).toContain('Person 1')
      expect(callArgs.prompt).toContain('Person 2')
    })

    it('should truncate history text to 1500 characters', async () => {
      const longMessages = Array.from({ length: 6 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: 'A'.repeat(500),
      }))

      const req = createRequest({
        persons: validPersons,
        messages: longMessages,
      })
      await POST(req)

      // guardText is called to truncate content
      expect(guardText).toHaveBeenCalled()
    })

    it('should use guardText to sanitize user question', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: [{ role: 'user', content: 'Test question with <script>alert()</script>' }],
      })
      await POST(req)

      expect(guardText).toHaveBeenCalled()
    })

    it('should handle very long compatibilityResult by truncating', async () => {
      const longResult = 'A'.repeat(5000)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
        compatibilityResult: longResult,
      })
      await POST(req)

      expect(guardText).toHaveBeenCalledWith(longResult, 2000)
    })

    it('should handle special characters in person names', async () => {
      const personsWithSpecialChars = [
        { name: "O'Brien-Smith", date: '1990-01-15', time: '10:30' },
        { name: 'Kim Jeong-Ho', date: '1992-05-20', time: '14:00', relation: 'partner' },
      ]

      const req = createRequest({
        persons: personsWithSpecialChars,
        messages: validMessages,
      })
      await POST(req)

      expect(apiClient.post).toHaveBeenCalled()
    })

    it('should handle mixed assistant and user messages correctly', async () => {
      const mixedMessages = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'User question 1' },
        { role: 'assistant', content: 'Assistant response 1' },
        { role: 'user', content: 'User question 2' },
      ]

      const req = createRequest({
        persons: validPersons,
        messages: mixedMessages,
      })
      await POST(req)

      // System messages should be filtered out from history text
      expect(apiClient.post).toHaveBeenCalled()
    })
  })

  // ----------------------------------------------------------
  // 7. Stream Response Chunking
  // ----------------------------------------------------------
  describe('Stream Response Chunking', () => {
    it('should return response in chunked SSE format', async () => {
      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)

      expect(response.body).toBeDefined()
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should include [DONE] marker at end of stream', async () => {
      vi.mocked(apiClient.post).mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          data: { response: 'Short response' },
        },
      } as unknown as ReturnType<typeof apiClient.post>)

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      const response = await POST(req)
      const chunks = await consumeSSEStream(response)
      const allData = chunks.join('')

      expect(allData).toContain('[DONE]')
    })
  })

  // ----------------------------------------------------------
  // 8. Logging
  // ----------------------------------------------------------
  describe('Logging', () => {
    it('should log validation failure', async () => {
      const req = createRequest({ messages: validMessages })
      await POST(req)

      expect(logger.warn).toHaveBeenCalledWith(
        '[Compatibility chat] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should log backend errors', async () => {
      vi.mocked(apiClient.post).mockRejectedValue(new Error('Backend unavailable'))

      const req = createRequest({
        persons: validPersons,
        messages: validMessages,
      })
      await POST(req)

      expect(logger.error).toHaveBeenCalled()
    })
  })
})
