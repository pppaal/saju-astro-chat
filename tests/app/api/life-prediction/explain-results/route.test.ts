/**
 * Comprehensive unit tests for /api/life-prediction/explain-results
 * Tests POST handler for AI-based results explanation using RAG context
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
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

// Mock backend-url
vi.mock('@/lib/backend-url', () => ({
  getBackendUrl: vi.fn(() => 'https://test-backend.example.com'),
}))

// Mock rate limit
const mockRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

// Mock request-ip
vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
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

// Mock Zod validation schema
const mockSafeParse = vi.fn()
vi.mock('@/lib/api/zodValidation', () => ({
  lifePredictionExplainResultsSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import the route handler AFTER all mocks
import { POST } from '@/app/api/life-prediction/explain-results/route'
import { logger } from '@/lib/logger'

// ============================================================
// Helpers
// ============================================================

const validOptimalPeriods = [
  {
    startDate: '2025-06-01',
    endDate: '2025-06-15',
    score: 92,
    grade: 'S',
    reasons: ['정재운 - investment에 유리', '건록 - 에너지 상승기', '대운 제왕'],
  },
  {
    startDate: '2025-07-01',
    endDate: '2025-07-15',
    score: 78,
    grade: 'A',
    reasons: ['식신 - 창의력 상승', '未-午 육합 → 화 기운 생성'],
  },
]

const validRequestBody = {
  question: '취업 시기가 언제가 좋을까요?',
  eventType: 'career',
  eventLabel: '취업/이직',
  optimalPeriods: validOptimalPeriods,
  sipsin: '정관',
  useRag: true,
}

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/life-prediction/explain-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const mockOpenAIResponse = {
  periods: [
    {
      reasons: [
        '💰 안정적인 수입과 재물이 들어오는 시기',
        '🔥 활력이 넘치고 무엇이든 시작하기 좋은 때',
        '👑 인생의 전성기, 큰 결실을 맺을 수 있는 시기',
      ],
      summary: '취업 성공률이 가장 높은 최고의 시기입니다.',
    },
    {
      reasons: [
        '✨ 열정과 추진력이 결합되어 목표 달성에 유리',
        '🌟 창의적인 아이디어가 샘솟는 시기',
      ],
      summary: '적극적인 구직 활동이 좋은 결과를 가져옵니다.',
    },
  ],
  overallAdvice:
    '6월 초가 가장 좋은 시기입니다. 적극적으로 지원하시고 면접 준비를 철저히 해두세요.',
}

// ============================================================
// Tests
// ============================================================

describe('Life Prediction Explain Results API - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default: rate limit allows requests
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: new Headers([
        ['X-RateLimit-Limit', '10'],
        ['X-RateLimit-Remaining', '9'],
      ]),
    })

    // Default: Zod validation passes
    mockSafeParse.mockImplementation((data: Record<string, unknown>) => ({
      success: true,
      data: {
        question: data.question || '취업 시기가 언제가 좋을까요?',
        eventType: data.eventType || 'career',
        eventLabel: data.eventLabel || '취업/이직',
        optimalPeriods: data.optimalPeriods || validOptimalPeriods,
        sipsin: data.sipsin,
        useRag: data.useRag ?? true,
      },
    }))

    // Default: Backend RAG context fetch returns success
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/prediction/rag-context')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            rag_context: {
              sipsin: '정관은 직장운과 안정을 나타냅니다.',
              timing: '6월은 목기운이 강해 취업에 좋습니다.',
              query_result: '커리어 관련 길일이 많습니다.',
            },
          }),
        })
      }
      // OpenAI API call
      if (url.includes('api.openai.com')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            choices: [
              {
                message: {
                  content: JSON.stringify(mockOpenAIResponse),
                },
              },
            ],
          }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    // Ensure env var is set for API key
    process.env.OPENAI_API_KEY = 'test-openai-key'
  })

  // ============================================================
  // Rate Limiting
  // ============================================================

  describe('Rate Limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        headers: new Headers([
          ['Retry-After', '60'],
          ['X-RateLimit-Remaining', '0'],
        ]),
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RATE_LIMITED')
    })

    it('should allow requests within rate limit', async () => {
      const request = createRequest(validRequestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRateLimit).toHaveBeenCalledWith(
        'api:/api/life-prediction/explain-results:127.0.0.1',
        { limit: 10, windowSeconds: 60 }
      )
    })

    it('should include rate limit headers on successful response', async () => {
      const request = createRequest(validRequestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(response.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('9')
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
            { path: ['question'], message: 'Required' },
            { path: ['optimalPeriods'], message: 'Array must contain at least 1 element(s)' },
          ],
        },
      })

      const request = createRequest({})
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('validation_failed')
      expect(data.details).toHaveLength(2)
      expect(data.details[0]).toEqual({ path: 'question', message: 'Required' })
      expect(data.details[1]).toEqual({
        path: 'optimalPeriods',
        message: 'Array must contain at least 1 element(s)',
      })
    })

    it('should return 400 when question is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['question'], message: 'String must contain at least 1 character(s)' }],
        },
      })

      const request = createRequest({ eventType: 'career' })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
      expect(logger.warn).toHaveBeenCalledWith(
        '[explain-results] validation failed',
        expect.any(Object)
      )
    })

    it('should return 400 when question exceeds max length', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['question'], message: 'String must contain at most 500 character(s)' },
          ],
        },
      })

      const request = createRequest({ ...validRequestBody, question: 'x'.repeat(501) })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when eventType is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['eventType'], message: 'Required' }],
        },
      })

      const request = createRequest({ question: 'test' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when eventLabel is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['eventLabel'], message: 'Required' }],
        },
      })

      const request = createRequest({ question: 'test', eventType: 'career' })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when optimalPeriods is empty', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['optimalPeriods'], message: 'Array must contain at least 1 element(s)' },
          ],
        },
      })

      const request = createRequest({ ...validRequestBody, optimalPeriods: [] })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when optimalPeriods exceeds max items', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [
            { path: ['optimalPeriods'], message: 'Array must contain at most 20 element(s)' },
          ],
        },
      })

      const request = createRequest({
        ...validRequestBody,
        optimalPeriods: new Array(21).fill(validOptimalPeriods[0]),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when period score is out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['optimalPeriods', '0', 'score'], message: 'Number must be at most 100' }],
        },
      })

      const invalidPeriods = [{ ...validOptimalPeriods[0], score: 150 }]
      const request = createRequest({ ...validRequestBody, optimalPeriods: invalidPeriods })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 400 when period is missing startDate', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['optimalPeriods', '0', 'startDate'], message: 'Required' }],
        },
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should handle validation when sipsin exceeds max length', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['sipsin'], message: 'String must contain at most 200 character(s)' }],
        },
      })

      const request = createRequest({ ...validRequestBody, sipsin: 'x'.repeat(201) })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  // ============================================================
  // Successful Explanation Response
  // ============================================================

  describe('Successful Explanation Response', () => {
    it('should return explained periods with AI-generated reasons', async () => {
      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.periods).toHaveLength(2)
      expect(data.data.periods[0].reasons).toEqual(mockOpenAIResponse.periods[0].reasons)
      expect(data.data.periods[0].summary).toBe(mockOpenAIResponse.periods[0].summary)
    })

    it('should preserve original period metadata', async () => {
      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.periods[0].startDate).toBe('2025-06-01')
      expect(data.data.periods[0].endDate).toBe('2025-06-15')
      expect(data.data.periods[0].score).toBe(92)
      expect(data.data.periods[0].grade).toBe('S')
    })

    it('should return overall advice from AI', async () => {
      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.overallAdvice).toBe(mockOpenAIResponse.overallAdvice)
    })

    it('should call OpenAI with correct parameters', async () => {
      const request = createRequest(validRequestBody)
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

      // Find the OpenAI API call
      const openAiCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('api.openai.com')
      )
      expect(openAiCall).toBeDefined()

      const callBody = JSON.parse(openAiCall![1].body)
      expect(callBody.model).toBe('gpt-4o-mini')
      expect(callBody.max_tokens).toBe(1000)
      expect(callBody.temperature).toBe(0.3)
      expect(callBody.response_format).toEqual({ type: 'json_object' })
    })

    it('should include system prompt for saju explanation', async () => {
      const request = createRequest(validRequestBody)
      await POST(request)

      const openAiCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('api.openai.com')
      )
      const callBody = JSON.parse(openAiCall![1].body)

      expect(callBody.messages[0].role).toBe('system')
      expect(callBody.messages[0].content).toContain('사주/점성술 전문가')
    })

    it('should include user message with question and periods', async () => {
      const request = createRequest(validRequestBody)
      await POST(request)

      const openAiCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('api.openai.com')
      )
      const callBody = JSON.parse(openAiCall![1].body)

      expect(callBody.messages[1].role).toBe('user')
      expect(callBody.messages[1].content).toContain('취업 시기가 언제가 좋을까요?')
      expect(callBody.messages[1].content).toContain('취업/이직')
      expect(callBody.messages[1].content).toContain('2025-06-01')
      expect(callBody.messages[1].content).toContain('92점')
    })
  })

  // ============================================================
  // RAG Context Integration
  // ============================================================

  describe('RAG Context Integration', () => {
    it('should fetch RAG context when useRag is true', async () => {
      const request = createRequest(validRequestBody)
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-backend.example.com/api/prediction/rag-context',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"sipsin":"정관"'),
        })
      )
    })

    it('should include RAG context in OpenAI prompt', async () => {
      const request = createRequest(validRequestBody)
      await POST(request)

      const openAiCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('api.openai.com')
      )
      const callBody = JSON.parse(openAiCall![1].body)

      expect(callBody.messages[1].content).toContain('참고 지식 (RAG)')
      expect(callBody.messages[1].content).toContain('정관은 직장운과 안정을 나타냅니다')
    })

    it('should skip RAG context when useRag is false', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, useRag: false },
      })

      const request = createRequest({ ...validRequestBody, useRag: false })
      await POST(request)

      // RAG context should not be fetched
      const ragCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('/api/prediction/rag-context')
      )
      expect(ragCall).toBeUndefined()
    })

    it('should handle RAG context fetch failure gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: false,
            status: 500,
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify(mockOpenAIResponse) } }],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[explain-results] RAG context fetch failed'),
        expect.anything()
      )
    })

    it('should handle RAG context network error gracefully', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.reject(new Error('Network error'))
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify(mockOpenAIResponse) } }],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('[explain-results] RAG context error'),
        expect.any(Error)
      )
    })

    it('should handle empty RAG context response', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify(mockOpenAIResponse) } }],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should pass eventType to RAG context API', async () => {
      const request = createRequest(validRequestBody)
      await POST(request)

      const ragCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('/api/prediction/rag-context')
      )
      const ragBody = JSON.parse(ragCall![1].body)

      expect(ragBody.event_type).toBe('career')
    })
  })

  // ============================================================
  // OpenAI Error Handling
  // ============================================================

  describe('OpenAI Error Handling', () => {
    it('should return fallback response when OpenAI returns an error', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: false,
            status: 429,
            text: async () => 'Rate limit exceeded',
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      // Should still return success with fallback data
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Fallback uses original reasons
      expect(data.data.periods[0].reasons).toEqual(validOptimalPeriods[0].reasons)
      expect(data.data.periods[0].summary).toContain('등급 추천 시기')
    })

    it('should return fallback response when OpenAI returns empty content', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: null } }],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(logger.error).toHaveBeenCalledWith(
        'Result explanation failed:',
        expect.any(Error)
      )
    })

    it('should return fallback response when OpenAI returns invalid JSON', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: 'not valid json' } }],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.overallAdvice).toBe('분석 결과를 확인해보세요.')
    })

    it('should return fallback response when OpenAI network fails', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.reject(new Error('Network error'))
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should return fallback response when OpenAI returns HTTP 500', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: false,
            status: 500,
            text: async () => 'Internal server error',
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ============================================================
  // Fallback Response Handling
  // ============================================================

  describe('Fallback Response Handling', () => {
    it('should use original reasons when AI does not provide them', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      periods: [
                        { summary: 'Test summary only' }, // No reasons provided
                      ],
                      overallAdvice: 'Test advice',
                    }),
                  },
                },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      // Should use original reasons from validOptimalPeriods
      expect(data.data.periods[0].reasons).toEqual(validOptimalPeriods[0].reasons)
    })

    it('should generate default summary when AI does not provide one', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      periods: [
                        { reasons: ['Test reason'] }, // No summary provided
                      ],
                      overallAdvice: 'Test advice',
                    }),
                  },
                },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.periods[0].summary).toBe('S등급 추천 시기')
    })

    it('should generate default overall advice when AI does not provide one', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      periods: mockOpenAIResponse.periods,
                      // No overallAdvice provided
                    }),
                  },
                },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.overallAdvice).toBe('취업/이직에 좋은 시기를 찾았습니다.')
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle single period', async () => {
      const singlePeriod = [validOptimalPeriods[0]]
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, optimalPeriods: singlePeriod },
      })

      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      periods: [mockOpenAIResponse.periods[0]],
                      overallAdvice: 'Single period advice',
                    }),
                  },
                },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest({ ...validRequestBody, optimalPeriods: singlePeriod })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.periods).toHaveLength(1)
    })

    it('should handle request without sipsin', async () => {
      const requestWithoutSipsin = { ...validRequestBody }
      delete (requestWithoutSipsin as Record<string, unknown>).sipsin

      mockSafeParse.mockReturnValue({
        success: true,
        data: requestWithoutSipsin,
      })

      const request = createRequest(requestWithoutSipsin)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle empty reasons array in period', async () => {
      const periodsWithEmptyReasons = [
        { ...validOptimalPeriods[0], reasons: [] },
      ]
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, optimalPeriods: periodsWithEmptyReasons },
      })

      const request = createRequest({
        ...validRequestBody,
        optimalPeriods: periodsWithEmptyReasons,
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle very long reason strings', async () => {
      const periodsWithLongReasons = [
        {
          ...validOptimalPeriods[0],
          reasons: ['x'.repeat(400), '매우 긴 설명입니다.'.repeat(20)],
        },
      ]
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, optimalPeriods: periodsWithLongReasons },
      })

      const request = createRequest({
        ...validRequestBody,
        optimalPeriods: periodsWithLongReasons,
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should return error response when request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/life-prediction/explain-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-valid-json',
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('INTERNAL_ERROR')
    })

    it('should handle minimum valid score (0)', async () => {
      const periodsWithMinScore = [{ ...validOptimalPeriods[0], score: 0, grade: 'F' }]
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, optimalPeriods: periodsWithMinScore },
      })

      const request = createRequest({
        ...validRequestBody,
        optimalPeriods: periodsWithMinScore,
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle maximum valid score (100)', async () => {
      const periodsWithMaxScore = [{ ...validOptimalPeriods[0], score: 100, grade: 'SSS' }]
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, optimalPeriods: periodsWithMaxScore },
      })

      const request = createRequest({
        ...validRequestBody,
        optimalPeriods: periodsWithMaxScore,
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should limit RAG context to 1000 characters in prompt', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              rag_context: {
                sipsin: 'x'.repeat(500),
                timing: 'y'.repeat(500),
                query_result: 'z'.repeat(500), // Total 1500+ chars
              },
            }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [{ message: { content: JSON.stringify(mockOpenAIResponse) } }],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      await POST(request)

      const openAiCall = mockFetch.mock.calls.find((call) =>
        (call[0] as string).includes('api.openai.com')
      )
      const callBody = JSON.parse(openAiCall![1].body)
      const userContent = callBody.messages[1].content

      // Should be truncated - RAG context portion should be limited
      const ragSection = userContent.split('**참고 지식 (RAG):**')[1]
      if (ragSection) {
        const ragContent = ragSection.split('\n')[1]
        // The slice(0, 1000) happens on the joined content
        expect(ragContent.length).toBeLessThanOrEqual(1000)
      }
    })

    it('should handle AI returning more periods than provided', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      periods: [
                        mockOpenAIResponse.periods[0],
                        mockOpenAIResponse.periods[1],
                        { reasons: ['Extra period'], summary: 'Extra' },
                        { reasons: ['Extra period 2'], summary: 'Extra 2' },
                      ],
                      overallAdvice: 'Test',
                    }),
                  },
                },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      // Should only return periods matching input count
      expect(data.data.periods).toHaveLength(2)
    })

    it('should handle AI returning fewer periods than provided', async () => {
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/api/prediction/rag-context')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({ rag_context: {} }),
          })
        }
        if (url.includes('api.openai.com')) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => ({
              choices: [
                {
                  message: {
                    content: JSON.stringify({
                      periods: [mockOpenAIResponse.periods[0]], // Only 1 period
                      overallAdvice: 'Test',
                    }),
                  },
                },
              ],
            }),
          })
        }
        return Promise.resolve({ ok: false })
      })

      const request = createRequest(validRequestBody)
      const response = await POST(request)
      const data = await response.json()

      // Should still return all periods with fallback for missing ones
      expect(data.data.periods).toHaveLength(2)
      expect(data.data.periods[0].reasons).toEqual(mockOpenAIResponse.periods[0].reasons)
      expect(data.data.periods[1].reasons).toEqual(validOptimalPeriods[1].reasons)
    })
  })

  // ============================================================
  // Different Event Types
  // ============================================================

  describe('Different Event Types', () => {
    const eventTypes = [
      { type: 'marriage', label: '결혼' },
      { type: 'career', label: '취업/이직' },
      { type: 'investment', label: '투자' },
      { type: 'move', label: '이사' },
      { type: 'health', label: '건강' },
      { type: 'study', label: '학업' },
    ]

    for (const { type, label } of eventTypes) {
      it(`should handle ${type} event type correctly`, async () => {
        mockSafeParse.mockReturnValue({
          success: true,
          data: {
            ...validRequestBody,
            eventType: type,
            eventLabel: label,
          },
        })

        const request = createRequest({
          ...validRequestBody,
          eventType: type,
          eventLabel: label,
        })
        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })
    }
  })

  // ============================================================
  // Locale Handling
  // ============================================================

  describe('Locale Handling', () => {
    it('should handle Korean locale (default)', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, locale: 'ko' },
      })

      const request = createRequest({ ...validRequestBody, locale: 'ko' })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle English locale', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: { ...validRequestBody, locale: 'en' },
      })

      const request = createRequest({ ...validRequestBody, locale: 'en' })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })

    it('should handle missing locale (defaults to undefined)', async () => {
      const requestWithoutLocale = { ...validRequestBody }
      delete (requestWithoutLocale as Record<string, unknown>).locale

      mockSafeParse.mockReturnValue({
        success: true,
        data: requestWithoutLocale,
      })

      const request = createRequest(requestWithoutLocale)
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })
})
