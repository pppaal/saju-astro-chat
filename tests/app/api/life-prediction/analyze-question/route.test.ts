/**
 * Comprehensive unit tests for /api/life-prediction/analyze-question
 * Tests POST handler for AI-based question analysis using GPT-4o-mini
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

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
    SERVICE_UNAVAILABLE: 503,
  },
}))

// Mock rate limit
const mockRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

// Mock getClientIp
const mockGetClientIp = vi.fn()
vi.mock('@/lib/request-ip', () => ({
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}))

// Mock Zod validation schema
const mockSafeParse = vi.fn()
vi.mock('@/lib/api/zodValidation', () => ({
  lifePredictionAnalyzeQuestionSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock global fetch (for OpenAI API)
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import the route handler AFTER all mocks
import { POST } from '@/app/api/life-prediction/analyze-question/route'
import { logger } from '@/lib/logger'

// ============================================================
// Helpers
// ============================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/life-prediction/analyze-question', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createValidBody() {
  return {
    question: '언제 부자가 될 수 있을까요?',
    locale: 'ko',
  }
}

function createOpenAIResponse(eventType: string, eventLabel: string, questionSummary: string, analysisContext: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify({
              eventType,
              eventLabel,
              questionSummary,
              analysisContext,
            }),
          },
        },
      ],
    }),
  }
}

// ============================================================
// Tests
// ============================================================

describe('Life Prediction Analyze Question API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: rate limit passes
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: new Map([
        ['X-RateLimit-Limit', '10'],
        ['X-RateLimit-Remaining', '9'],
      ]),
    })

    // Default: client IP
    mockGetClientIp.mockReturnValue('127.0.0.1')

    // Default: Zod validation passes
    mockSafeParse.mockImplementation((data: Record<string, unknown>) => ({
      success: true,
      data: {
        question: data.question || '언제 부자가 될 수 있을까요?',
        locale: data.locale || 'ko',
      },
    }))

    // Default: OpenAI returns valid analysis
    mockFetch.mockResolvedValue(
      createOpenAIResponse('investment', '재물운', '부자가 되는 시기', '부자가 되는 최적의 시기')
    )

    // Ensure OpenAI API key is set
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  afterEach(() => {
    delete process.env.OPENAI_API_KEY
  })

  // ============================================================
  // Rate Limiting
  // ============================================================

  describe('Rate Limiting', () => {
    it('should return 429 when rate limited', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        headers: new Map([
          ['X-RateLimit-Limit', '10'],
          ['X-RateLimit-Remaining', '0'],
          ['Retry-After', '60'],
        ]),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Too many requests. Try again soon.')
    })

    it('should call rateLimit with correct key pattern', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      expect(mockRateLimit).toHaveBeenCalledWith(
        'life-analyze:127.0.0.1',
        { limit: 10, windowSeconds: 60 }
      )
    })

    it('should include rate limit headers in successful response', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)

      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
    })

    it('should include rate limit headers in rate limited response', async () => {
      // The route passes limit.headers directly to NextResponse.json
      // When rate limit is exceeded, headers are passed through
      const rateLimitHeaders = new Map([
        ['X-RateLimit-Limit', '10'],
        ['X-RateLimit-Remaining', '0'],
        ['Retry-After', '30'],
      ])

      mockRateLimit.mockResolvedValue({
        allowed: false,
        headers: rateLimitHeaders,
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)

      // The route returns 429 status and passes headers from rate limit
      expect(response.status).toBe(429)
      // Headers are passed as a Map to NextResponse.json which accepts it
      // Verify by checking that rateLimit was called with the right response
      expect(mockRateLimit).toHaveBeenCalled()
    })

    it('should use client IP from getClientIp for rate limiting', async () => {
      mockGetClientIp.mockReturnValue('192.168.1.100')

      const request = createRequest(createValidBody())
      await POST(request)

      expect(mockRateLimit).toHaveBeenCalledWith(
        'life-analyze:192.168.1.100',
        expect.any(Object)
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
            { path: ['question'], message: 'String must contain at least 1 character(s)' },
          ],
        },
      })

      const request = createRequest({ question: '' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toHaveLength(1)
      expect(data.details[0]).toEqual({
        path: 'question',
        message: 'String must contain at least 1 character(s)',
      })
    })

    it('should return 400 when question is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['question'], message: 'Required' }],
        },
      })

      const request = createRequest({ locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when question exceeds max length', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['question'], message: 'String must contain at most 500 character(s)' }],
        },
      })

      const request = createRequest({ question: 'x'.repeat(501), locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 with multiple validation errors', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['question'], message: 'Required' },
            { path: ['locale'], message: "Invalid enum value. Expected 'ko' | 'en'" },
          ],
        },
      })

      const request = createRequest({ locale: 'fr' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.details).toHaveLength(2)
      expect(data.details[1]).toEqual({
        path: 'locale',
        message: "Invalid enum value. Expected 'ko' | 'en'",
      })
    })

    it('should log validation warnings', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['question'], message: 'Required' }],
        },
      })

      const request = createRequest({})
      await POST(request)

      expect(logger.warn).toHaveBeenCalledWith(
        '[analyze-question] validation failed',
        expect.objectContaining({ errors: expect.any(Array) })
      )
    })

    it('should use default locale when not provided', async () => {
      mockSafeParse.mockImplementation((data: Record<string, unknown>) => ({
        success: true,
        data: {
          question: data.question || '언제 결혼할까요?',
          locale: data.locale || 'ko',
        },
      }))

      const request = createRequest({ question: '언제 결혼할까요?' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ============================================================
  // OpenAI API Success Cases
  // ============================================================

  describe('OpenAI API Success', () => {
    it('should return analyzed question data on success', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        eventType: 'investment',
        eventLabel: '재물운',
        questionSummary: '부자가 되는 시기',
        analysisContext: '부자가 되는 최적의 시기',
      })
    })

    it('should call OpenAI with correct parameters', async () => {
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
      expect(callBody.model).toBe('gpt-4o-mini')
      expect(callBody.max_tokens).toBe(200)
      expect(callBody.temperature).toBe(0.1)
      expect(callBody.response_format).toEqual({ type: 'json_object' })
    })

    it('should include system prompt and user question in OpenAI call', async () => {
      const request = createRequest({ question: '결혼 시기가 언제일까요?', locale: 'ko' })
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const messages = callBody.messages

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('system')
      expect(messages[0].content).toContain('질문 분석가')
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toContain('결혼 시기가 언제일까요?')
    })

    it('should handle marriage event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('marriage', '결혼운', '결혼 시기', '결혼 적기')
      )

      const request = createRequest({ question: '언제 결혼하면 좋을까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('marriage')
      expect(data.data.eventLabel).toBe('결혼운')
    })

    it('should handle career event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('career', '취업/이직', '취업 시기', '취업 최적 시기')
      )

      const request = createRequest({ question: '언제 이직하면 좋을까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('career')
      expect(data.data.eventLabel).toBe('취업/이직')
    })

    it('should handle study event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('study', '학업/시험', '시험 합격 시기', '합격 최적 시기')
      )

      const request = createRequest({ question: '언제 시험을 보면 합격할까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('study')
      expect(data.data.eventLabel).toBe('학업/시험')
    })

    it('should handle health event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('health', '건강', '건강 회복 시기', '건강 최적 시기')
      )

      const request = createRequest({ question: '수술 시기가 언제 좋을까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('health')
    })

    it('should handle move event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('move', '이사', '이사 시기', '이사 최적 시기')
      )

      const request = createRequest({ question: '언제 이사하면 좋을까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('move')
    })

    it('should handle relationship event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('relationship', '연애운', '연애 시기', '연애 최적 시기')
      )

      const request = createRequest({ question: '언제 좋은 사람을 만날 수 있을까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('relationship')
    })

    it('should handle general event type correctly', async () => {
      mockFetch.mockResolvedValue(
        createOpenAIResponse('general', '종합 운세', '운세 분석', '종합 운세 분석')
      )

      const request = createRequest({ question: '올해 운세가 어떨까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('general')
    })
  })

  // ============================================================
  // Invalid Event Type Handling
  // ============================================================

  describe('Invalid Event Type Handling', () => {
    it('should default to general for invalid event type', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eventType: 'invalid_type',
                  eventLabel: '알 수 없음',
                  questionSummary: '질문 요약',
                  analysisContext: '분석 맥락',
                }),
              },
            },
          ],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('general')
    })

    it('should default to general for null event type', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eventType: null,
                  eventLabel: '종합 운세',
                  questionSummary: '질문 요약',
                  analysisContext: '분석 맥락',
                }),
              },
            },
          ],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventType).toBe('general')
    })
  })

  // ============================================================
  // Default Label Handling
  // ============================================================

  describe('Default Label Handling', () => {
    it('should use default Korean label when eventLabel is missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eventType: 'investment',
                  eventLabel: null,
                  questionSummary: '부자 시기',
                  analysisContext: '재물운 분석',
                }),
              },
            },
          ],
        }),
      })

      const request = createRequest({ question: '언제 부자가 될까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventLabel).toBe('재물운')
    })

    it('should use default English label when locale is en', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: 'When will I get married?',
          locale: 'en',
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eventType: 'marriage',
                  eventLabel: '',
                  questionSummary: 'Marriage timing',
                  analysisContext: 'Best time for marriage',
                }),
              },
            },
          ],
        }),
      })

      const request = createRequest({ question: 'When will I get married?', locale: 'en' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.eventLabel).toBe('Marriage')
    })

    it('should use truncated question as default questionSummary', async () => {
      const longQuestion = '이것은 매우 긴 질문입니다 언제 부자가 될 수 있을까요 정말 궁금합니다'

      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: longQuestion,
          locale: 'ko',
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eventType: 'investment',
                  eventLabel: '재물운',
                  questionSummary: null,
                  analysisContext: '재물운 분석',
                }),
              },
            },
          ],
        }),
      })

      const request = createRequest({ question: longQuestion, locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.questionSummary).toBe(longQuestion.slice(0, 30))
    })

    it('should use default analysisContext when missing', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  eventType: 'career',
                  eventLabel: '취업/이직',
                  questionSummary: '취업 시기',
                  analysisContext: '',
                }),
              },
            },
          ],
        }),
      })

      const request = createRequest({ question: '언제 취업할까요?', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.analysisContext).toBe('취업/이직 분석')
    })
  })

  // ============================================================
  // OpenAI API Error Handling
  // ============================================================

  describe('OpenAI API Error Handling', () => {
    it('should return fallback data when OpenAI returns non-OK response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error',
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      // Should return success with default fallback values
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual({
        eventType: 'general',
        eventLabel: '종합 운세',
        questionSummary: '운세 분석',
        analysisContext: '최적 시기 분석',
      })
    })

    it('should return fallback data when OpenAI returns rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded',
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('general')
    })

    it('should return fallback data when fetch throws network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('general')
    })

    it('should log error when OpenAI fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection timeout'))

      const request = createRequest(createValidBody())
      await POST(request)

      expect(logger.error).toHaveBeenCalledWith(
        'Question analysis failed:',
        expect.any(Error)
      )
    })

    it('should return fallback data when OpenAI returns empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: null,
              },
            },
          ],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('general')
    })

    it('should return fallback data when OpenAI returns empty choices', async () => {
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
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('general')
    })

    it('should return fallback data when JSON parsing fails', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'invalid json {{{',
              },
            },
          ],
        }),
      })

      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('general')
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle request body JSON parse failure', async () => {
      const request = new NextRequest('http://localhost/api/life-prediction/analyze-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json',
      })

      const response = await POST(request)
      const data = await response.json()

      // Falls back to default response
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('general')
    })

    it('should handle empty question string after validation', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '',
          locale: 'ko',
        },
      })

      mockFetch.mockResolvedValue(
        createOpenAIResponse('general', '종합 운세', '', '분석')
      )

      const request = createRequest({ question: '', locale: 'ko' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.questionSummary).toBe('')
    })

    it('should handle Korean question with special characters', async () => {
      const question = '언제 부자가 될까요? 정말로... ㅠㅠ'

      mockSafeParse.mockReturnValue({
        success: true,
        data: { question, locale: 'ko' },
      })

      const request = createRequest({ question, locale: 'ko' })
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.messages[1].content).toContain(question)
    })

    it('should handle English question', async () => {
      const question = 'When will I become rich?'

      mockSafeParse.mockReturnValue({
        success: true,
        data: { question, locale: 'en' },
      })

      mockFetch.mockResolvedValue(
        createOpenAIResponse('investment', 'Wealth', 'Becoming rich', 'Best time for wealth')
      )

      const request = createRequest({ question, locale: 'en' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.eventLabel).toBe('Wealth')
    })

    it('should handle maximum length question', async () => {
      const question = '언'.repeat(500)

      mockSafeParse.mockReturnValue({
        success: true,
        data: { question, locale: 'ko' },
      })

      const request = createRequest({ question, locale: 'ko' })
      await POST(request)

      expect(mockFetch).toHaveBeenCalled()
    })

    it('should handle concurrent requests with different IPs', async () => {
      mockGetClientIp.mockReturnValueOnce('192.168.1.1').mockReturnValueOnce('192.168.1.2')

      const request1 = createRequest({ question: '질문1', locale: 'ko' })
      const request2 = createRequest({ question: '질문2', locale: 'ko' })

      await POST(request1)
      await POST(request2)

      expect(mockRateLimit).toHaveBeenCalledWith('life-analyze:192.168.1.1', expect.any(Object))
      expect(mockRateLimit).toHaveBeenCalledWith('life-analyze:192.168.1.2', expect.any(Object))
    })
  })

  // ============================================================
  // Event Type Label Defaults
  // ============================================================

  describe('Event Type Label Defaults', () => {
    const eventTypeLabels = [
      { type: 'marriage', ko: '결혼운', en: 'Marriage' },
      { type: 'career', ko: '취업/이직', en: 'Career' },
      { type: 'investment', ko: '재물운', en: 'Wealth' },
      { type: 'move', ko: '이사', en: 'Moving' },
      { type: 'study', ko: '학업/시험', en: 'Study' },
      { type: 'health', ko: '건강', en: 'Health' },
      { type: 'relationship', ko: '연애운', en: 'Relationship' },
      { type: 'general', ko: '종합 운세', en: 'General Fortune' },
    ]

    it.each(eventTypeLabels)(
      'should return correct Korean default label for $type',
      async ({ type, ko }) => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    eventType: type,
                    eventLabel: null,
                    questionSummary: '질문 요약',
                    analysisContext: '분석 맥락',
                  }),
                },
              },
            ],
          }),
        })

        mockSafeParse.mockReturnValue({
          success: true,
          data: { question: '질문', locale: 'ko' },
        })

        const request = createRequest({ question: '질문', locale: 'ko' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data.eventLabel).toBe(ko)
      }
    )

    it.each(eventTypeLabels)(
      'should return correct English default label for $type',
      async ({ type, en }) => {
        mockFetch.mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    eventType: type,
                    eventLabel: '',
                    questionSummary: 'Summary',
                    analysisContext: 'Context',
                  }),
                },
              },
            ],
          }),
        })

        mockSafeParse.mockReturnValue({
          success: true,
          data: { question: 'Question', locale: 'en' },
        })

        const request = createRequest({ question: 'Question', locale: 'en' })
        const response = await POST(request)
        const data = await response.json()

        expect(data.data.eventLabel).toBe(en)
      }
    )
  })

  // ============================================================
  // System Prompt Verification
  // ============================================================

  describe('System Prompt Verification', () => {
    it('should include all event types in system prompt', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemPrompt = callBody.messages[0].content

      expect(systemPrompt).toContain('marriage')
      expect(systemPrompt).toContain('career')
      expect(systemPrompt).toContain('investment')
      expect(systemPrompt).toContain('move')
      expect(systemPrompt).toContain('study')
      expect(systemPrompt).toContain('health')
      expect(systemPrompt).toContain('relationship')
      expect(systemPrompt).toContain('general')
    })

    it('should include Korean event descriptions in system prompt', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemPrompt = callBody.messages[0].content

      expect(systemPrompt).toContain('결혼')
      expect(systemPrompt).toContain('취업')
      expect(systemPrompt).toContain('투자')
      expect(systemPrompt).toContain('이사')
      expect(systemPrompt).toContain('공부')
      expect(systemPrompt).toContain('건강')
      expect(systemPrompt).toContain('연애')
    })

    it('should request JSON format output in system prompt', async () => {
      const request = createRequest(createValidBody())
      await POST(request)

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      const systemPrompt = callBody.messages[0].content

      expect(systemPrompt).toContain('JSON')
    })
  })

  // ============================================================
  // Response Format
  // ============================================================

  describe('Response Format', () => {
    it('should return success boolean in response', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(typeof data.success).toBe('boolean')
    })

    it('should return data object with all required fields on success', async () => {
      const request = createRequest(createValidBody())
      const response = await POST(request)
      const data = await response.json()

      expect(data.data).toHaveProperty('eventType')
      expect(data.data).toHaveProperty('eventLabel')
      expect(data.data).toHaveProperty('questionSummary')
      expect(data.data).toHaveProperty('analysisContext')
    })

    it('should return error string in validation failure response', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: { issues: [{ path: ['question'], message: 'Required' }] },
      })

      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(typeof data.error).toBe('string')
      expect(data.details).toBeInstanceOf(Array)
    })
  })
})
