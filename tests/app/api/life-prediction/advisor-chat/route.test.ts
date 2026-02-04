import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

// ============================================================
// Mocks - must be before route import
// ============================================================

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

// Mock next-auth
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}))

// Mock constants
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
    SERVICE_UNAVAILABLE: 503,
  },
}))

// Mock middleware
const mockInitializeApiContext = vi.fn()
vi.mock('@/lib/api/middleware', () => ({
  initializeApiContext: (...args: unknown[]) => mockInitializeApiContext(...args),
  createAuthenticatedGuard: vi.fn(() => ({
    route: 'life-prediction-advisor-chat',
    requireAuth: true,
    rateLimit: { limit: 30, windowSeconds: 60 },
    credits: { type: 'followUp', amount: 1 },
  })),
}))

// Mock apiClient
const mockApiClientPost = vi.fn()
vi.mock('@/lib/api/ApiClient', () => ({
  apiClient: {
    post: (...args: unknown[]) => mockApiClientPost(...args),
    get: vi.fn(),
  },
}))

// Mock Zod validation schema
const mockSafeParse = vi.fn()
vi.mock('@/lib/api/zodValidation', () => ({
  lifePredictionAdvisorChatRequestSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock global fetch (for OpenAI fallback)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import the route handler AFTER all mocks
import { POST } from '@/app/api/life-prediction/advisor-chat/route'

// ============================================================
// Helpers
// ============================================================

const validContext = {
  question: '취업 시기가 언제가 좋을까요?',
  eventType: '취업/이직',
  results: [
    {
      startDate: '2025-06-01',
      endDate: '2025-06-15',
      score: 92,
      grade: 'S',
      reasons: ['Good transit', '좋은 사주 흐름'],
    },
    {
      startDate: '2025-07-01',
      endDate: '2025-07-15',
      score: 78,
      grade: 'A',
      reasons: ['Neutral period'],
    },
  ],
  birthDate: '1990-05-15',
  gender: 'M' as const,
  sipsin: '편관 편인',
  daeun: '甲子',
  yongsin: ['木', '水'],
}

const validHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
  { role: 'user', content: '6월이 좋은 이유가 뭔가요?' },
  { role: 'assistant', content: '6월에는 목성의 기운이 강하게 작용합니다.' },
]

function createValidBody() {
  return {
    message: '더 자세히 알려주세요',
    sessionId: 'session-123',
    context: validContext,
    history: validHistory,
    locale: 'ko' as const,
  }
}

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/life-prediction/advisor-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ============================================================
// Tests
// ============================================================

describe('Life Prediction Advisor Chat API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: middleware passes (authenticated, credits OK)
    mockInitializeApiContext.mockResolvedValue({
      context: {
        userId: 'user-123',
        session: { user: { id: 'user-123', email: 'test@example.com' } },
        ip: '127.0.0.1',
        locale: 'ko',
        isAuthenticated: true,
        isPremium: false,
      },
      error: undefined,
    })

    // Default: Zod validation passes
    mockSafeParse.mockImplementation((data: Record<string, unknown>) => ({
      success: true,
      data: {
        message: data.message || '더 자세히 알려주세요',
        sessionId: data.sessionId || 'session-123',
        context: data.context || validContext,
        history: data.history || validHistory,
        locale: data.locale || 'ko',
      },
    }))

    // Default: backend counseling engine returns success
    mockApiClientPost.mockResolvedValue({
      ok: true,
      status: 200,
      data: {
        status: 'success',
        response: '6월은 목성의 영향으로 취업운이 좋습니다. 적극적으로 지원하세요.',
        session_id: 'session-456',
        phase: 'exploration',
        crisis_detected: false,
        severity: 'low',
        should_continue: true,
        jung_context: {
          archetype: 'hero',
          theme: 'career_growth',
        },
      },
    })

    // Ensure OpenAI key is set for fallback path
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  // ============================================================
  // Authentication & Middleware
  // ============================================================

  describe('Authentication', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockInitializeApiContext.mockResolvedValue({
        context: {
          userId: null,
          session: null,
          ip: '127.0.0.1',
          locale: 'ko',
          isAuthenticated: false,
          isPremium: false,
        },
        error: NextResponse.json(
          { error: 'not_authenticated', code: 'UNAUTHORIZED' },
          { status: 401 }
        ),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBeDefined()
    })

    it('should return 402 when user has insufficient credits', async () => {
      mockInitializeApiContext.mockResolvedValue({
        context: {
          userId: 'user-123',
          session: { user: { id: 'user-123' } },
          ip: '127.0.0.1',
          locale: 'ko',
          isAuthenticated: true,
          isPremium: false,
        },
        error: NextResponse.json(
          {
            error: 'insufficient_credits',
            code: 'PAYMENT_REQUIRED',
            remaining: 0,
            upgradeUrl: '/pricing',
          },
          { status: 402 }
        ),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(402)
      expect(data.error).toContain('insufficient_credits')
    })

    it('should return 429 when rate limited', async () => {
      mockInitializeApiContext.mockResolvedValue({
        context: {
          userId: 'user-123',
          session: { user: { id: 'user-123' } },
          ip: '127.0.0.1',
          locale: 'ko',
          isAuthenticated: true,
          isPremium: false,
        },
        error: NextResponse.json({ error: 'rate_limited' }, { status: 429 }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)

      expect(response.status).toBe(429)
    })

    it('should call initializeApiContext with correct guard options', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      expect(mockInitializeApiContext).toHaveBeenCalledWith(
        request,
        expect.objectContaining({
          route: 'life-prediction-advisor-chat',
          requireAuth: true,
        })
      )
    })
  })

  // ============================================================
  // Input Validation
  // ============================================================

  describe('Input Validation', () => {
    it('should return 400 when Zod validation fails', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['message'], message: 'String must contain at least 1 character(s)' },
            { path: ['context', 'gender'], message: "Invalid enum value. Expected 'M' | 'F'" },
          ],
        },
      })

      const request = createRequest({ message: '', context: { gender: 'X' } })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toHaveLength(2)
      expect(data.details[0]).toEqual({
        path: 'message',
        message: 'String must contain at least 1 character(s)',
      })
      expect(data.details[1]).toEqual({
        path: 'context.gender',
        message: "Invalid enum value. Expected 'M' | 'F'",
      })
    })

    it('should return 400 when message is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['message'], message: 'Required' }],
        },
      })

      const request = createRequest({ context: validContext, history: [], locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when context is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['context'], message: 'Required' }],
        },
      })

      const request = createRequest({ message: 'hello', history: [], locale: 'ko' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when locale is invalid', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['locale'], message: "Invalid enum value. Expected 'ko' | 'en'" }],
        },
      })

      const request = createRequest({ ...createValidBody(), locale: 'fr' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when message exceeds max length', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['message'], message: 'String must contain at most 2000 character(s)' }],
        },
      })

      const request = createRequest({ ...createValidBody(), message: 'x'.repeat(2001) })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when history exceeds max items', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['history'], message: 'Array must contain at most 50 element(s)' }],
        },
      })

      const request = createRequest({
        ...createValidBody(),
        history: new Array(51).fill({ role: 'user', content: 'hi' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  // ============================================================
  // Backend Counseling Engine - Success
  // ============================================================

  describe('Backend Counseling Engine Success', () => {
    it('should return counseling response when backend engine succeeds', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reply).toBe('6월은 목성의 영향으로 취업운이 좋습니다. 적극적으로 지원하세요.')
      expect(data.sessionId).toBe('session-456')
      expect(data.phase).toBe('exploration')
      expect(data.crisisDetected).toBe(false)
      expect(data.severity).toBe('low')
      expect(data.shouldContinue).toBe(true)
      expect(data.jungContext).toEqual({ archetype: 'hero', theme: 'career_growth' })
      expect(data.useBackendEngine).toBe(true)
    })

    it('should call backend counseling engine with correct parameters', async () => {
      const body = createValidBody()
      const request = createRequest(body)
      await POST(request)

      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/api/counseling/chat',
        expect.objectContaining({
          message: '더 자세히 알려주세요',
          session_id: 'session-123',
          saju: expect.objectContaining({
            dayMaster: expect.objectContaining({
              element: expect.any(String),
            }),
            daeun: '甲子',
          }),
        }),
        { timeout: 15000 }
      )
    })

    it('should handle crisis detection in response', async () => {
      mockApiClientPost.mockResolvedValue({
        ok: true,
        status: 200,
        data: {
          status: 'success',
          response: '지금 많이 힘드시군요. 전문 상담을 권해드립니다.',
          session_id: 'session-789',
          phase: 'crisis_intervention',
          crisis_detected: true,
          severity: 'high',
          should_continue: false,
          jung_context: { archetype: 'wounded_healer' },
        },
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.crisisDetected).toBe(true)
      expect(data.severity).toBe('high')
      expect(data.shouldContinue).toBe(false)
      expect(data.phase).toBe('crisis_intervention')
    })

    it('should handle missing sessionId', async () => {
      const body = createValidBody()
      delete (body as Record<string, unknown>).sessionId

      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          message: body.message,
          context: body.context,
          history: body.history,
          locale: body.locale,
        },
      })

      const request = createRequest(body)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  // ============================================================
  // Backend Engine Failure - GPT Fallback
  // ============================================================

  describe('GPT Fallback (Backend Engine Failure)', () => {
    beforeEach(() => {
      // Backend counseling engine fails
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend unavailable'))
        }
        // RAG context call - return fallback
        if (url === '/api/prediction/rag-context') {
          return Promise.resolve({
            ok: true,
            status: 200,
            data: {
              rag_context: {
                sipsin: '편관의 기운이 강합니다',
                timing: '6월이 좋은 시기입니다',
                insights: ['취업운 상승'],
              },
            },
          })
        }
        // Therapeutic questions call
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.resolve({
            ok: true,
            status: 200,
            data: {
              rag_questions: ['어떤 직종에 관심이 있으신가요?'],
            },
          })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })

      // OpenAI returns success
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: '6월 초에는 목성이 사업궁에 위치하여 취업운이 상승합니다.',
              },
            },
          ],
        }),
      })
    })

    it('should fall back to GPT when backend engine fails', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reply).toBe('6월 초에는 목성이 사업궁에 위치하여 취업운이 상승합니다.')
      expect(data.useBackendEngine).toBe(false)
    })

    it('should include ragUsed flag in fallback response', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.ragUsed).toBe(true)
    })

    it('should include therapeuticQuestionsUsed flag in fallback response', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.therapeuticQuestionsUsed).toBe(true)
    })

    it('should call OpenAI with correct model and parameters', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-openai-key',
          }),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.model).toBe('gpt-4o')
      expect(callBody.max_tokens).toBe(1500)
      expect(callBody.temperature).toBe(0.7)
    })

    it('should include system prompt, history, and user message in GPT call', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const messages = callBody.messages

      // System prompt
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toContain('운세 상담사')

      // History messages (2 entries)
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('6월이 좋은 이유가 뭔가요?')
      expect(messages[2].role).toBe('assistant')
      expect(messages[2].content).toBe('6월에는 목성의 기운이 강하게 작용합니다.')

      // Current user message
      expect(messages[3].role).toBe('user')
      expect(messages[3].content).toBe('더 자세히 알려주세요')
    })

    it('should use English system prompt for locale "en"', async () => {
      const body = createValidBody()
      body.locale = 'en'
      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      const request = createRequest(body)
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[0].content).toContain('Fortune advisor')
    })

    it('should use Korean system prompt for locale "ko"', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[0].content).toContain('운세 상담사')
    })
  })

  // ============================================================
  // Backend Engine Non-Success Response
  // ============================================================

  describe('Backend Engine Non-Success Response', () => {
    it('should fall back to GPT when backend returns non-OK response', async () => {
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.resolve({
            ok: false,
            status: 500,
            data: null,
          })
        }
        if (url === '/api/prediction/rag-context') {
          return Promise.resolve({ ok: false, status: 500 })
        }
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'GPT fallback response' } }],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.useBackendEngine).toBe(false)
      expect(data.reply).toBe('GPT fallback response')
    })

    it('should fall back to GPT when backend returns non-success status field', async () => {
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.resolve({
            ok: true,
            status: 200,
            data: {
              status: 'error',
              message: 'Internal engine error',
            },
          })
        }
        if (url === '/api/prediction/rag-context') {
          return Promise.resolve({ ok: false })
        }
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.resolve({ ok: false })
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'GPT after engine status error' } }],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.useBackendEngine).toBe(false)
    })
  })

  // ============================================================
  // RAG Context Fetching
  // ============================================================

  describe('RAG Context Fallback', () => {
    beforeEach(() => {
      // Backend engine fails so we go to GPT fallback
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        if (url === '/api/prediction/rag-context') {
          return Promise.resolve({ ok: false, status: 500 })
        }
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Response with fallback context' } }],
        }),
      })
    })

    it('should use fallback RAG context when backend RAG is unavailable', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle RAG context returning empty insights', async () => {
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        if (url === '/api/prediction/rag-context') {
          return Promise.resolve({
            ok: true,
            status: 200,
            data: { rag_context: {} },
          })
        }
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.resolve({
            ok: true,
            status: 200,
            data: { rag_questions: [] },
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.therapeuticQuestionsUsed).toBe(false)
    })

    it('should handle therapeutic questions returning single question format', async () => {
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        if (url === '/api/prediction/rag-context') {
          return Promise.resolve({ ok: false })
        }
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.resolve({
            ok: true,
            status: 200,
            data: {
              question: '어떤 종류의 일을 찾고 계신가요?',
            },
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.therapeuticQuestionsUsed).toBe(true)
    })
  })

  // ============================================================
  // OpenAI Error Handling (in fallback path)
  // ============================================================

  describe('OpenAI Error Handling', () => {
    beforeEach(() => {
      // Backend engine fails
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        return Promise.resolve({ ok: false })
      })
    })

    it('should return 500 when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('API key not configured')
    })

    it('should return 500 when OpenAI API returns an error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate response')
    })

    it('should return 500 when OpenAI returns HTTP 500', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should return 500 when fetch throws a network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate response')
    })

    it('should handle empty choices from OpenAI', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBe('')
    })

    it('should handle null content from OpenAI', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: null } }],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reply).toBe('')
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle empty history array', async () => {
      const body = createValidBody()
      body.history = []
      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      const request = createRequest(body)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle context without optional sipsin field', async () => {
      const body = createValidBody()
      const contextWithoutSipsin = { ...validContext }
      delete (contextWithoutSipsin as Record<string, unknown>).sipsin
      body.context = contextWithoutSipsin as typeof validContext

      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      const request = createRequest(body)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle context without optional daeun field', async () => {
      const body = createValidBody()
      const contextWithoutDaeun = { ...validContext }
      delete (contextWithoutDaeun as Record<string, unknown>).daeun
      body.context = contextWithoutDaeun as typeof validContext

      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      const request = createRequest(body)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle empty results array in context', async () => {
      const body = createValidBody()
      body.context = { ...validContext, results: [] }

      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      // Backend engine fails to trigger fallback path
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Response with empty results' } }],
        }),
      })

      const request = createRequest(body)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle female gender in context', async () => {
      const body = createValidBody()
      body.context = { ...validContext, gender: 'F' }

      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      // Trigger fallback path
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Response for female user' } }],
        }),
      })

      const request = createRequest(body)
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[0].content).toContain('여성')
    })

    it('should handle request body that fails JSON parse', async () => {
      const request = new NextRequest('http://localhost/api/life-prediction/advisor-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle very long sipsin string for element extraction', async () => {
      const body = createValidBody()
      body.context = { ...validContext, sipsin: '편관 편인 식신 상관' }

      mockSafeParse.mockReturnValue({
        success: true,
        data: body,
      })

      const request = createRequest(body)
      const response = await POST(request)

      expect(response.status).toBe(200)

      // Verify the element is extracted correctly (first word before space)
      expect(mockApiClientPost).toHaveBeenCalledWith(
        '/api/counseling/chat',
        expect.objectContaining({
          saju: expect.objectContaining({
            dayMaster: { element: '편관' },
          }),
        }),
        expect.anything()
      )
    })

    it('should limit results summary to top 5 in fallback path', async () => {
      const body = createValidBody()
      body.context = {
        ...validContext,
        results: Array.from({ length: 10 }, (_, i) => ({
          startDate: `2025-${String(i + 1).padStart(2, '0')}-01`,
          endDate: `2025-${String(i + 1).padStart(2, '0')}-15`,
          score: 90 - i * 5,
          grade: 'A',
          reasons: [`Reason ${i + 1}`],
        })),
      }

      mockSafeParse.mockReturnValue({ success: true, data: body })

      // Trigger fallback
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      })

      const request = createRequest(body)
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemPrompt = callBody.messages[0].content

      // Should contain exactly 5 ranking entries (1위 through 5위)
      expect(systemPrompt).toContain('1위')
      expect(systemPrompt).toContain('5위')
      expect(systemPrompt).not.toContain('6위')
    })

    it('should handle concurrent errors in RAG context and therapeutic questions gracefully', async () => {
      // Backend engine fails
      mockApiClientPost.mockImplementation((url: string) => {
        if (url === '/api/counseling/chat') {
          return Promise.reject(new Error('Backend down'))
        }
        if (url === '/api/prediction/rag-context') {
          return Promise.reject(new Error('RAG service down'))
        }
        if (url === '/api/counseling/therapeutic-questions') {
          return Promise.reject(new Error('Questions service down'))
        }
        return Promise.resolve({ ok: false })
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: 'Resilient response' } }],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.reply).toBe('Resilient response')
    })
  })

  // ============================================================
  // General Error Handling
  // ============================================================

  describe('General Error Handling', () => {
    it('should return 500 on unexpected errors', async () => {
      mockInitializeApiContext.mockRejectedValue(new Error('Unexpected crash'))

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to generate response')
    })

    it('should return 500 when Zod safeParse itself throws', async () => {
      mockSafeParse.mockImplementation(() => {
        throw new Error('Schema compilation error')
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })
})
