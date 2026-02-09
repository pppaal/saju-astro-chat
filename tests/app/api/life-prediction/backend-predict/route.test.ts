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

// Mock backend-url
vi.mock('@/lib/backend-url', () => ({
  getBackendUrl: vi.fn(() => 'https://test-backend.example.com'),
}))

// Mock prediction (scoreToGrade)
vi.mock('@/lib/prediction', () => ({
  scoreToGrade: vi.fn((score: number) => {
    if (score >= 90) return 'S'
    if (score >= 80) return 'A+'
    if (score >= 70) return 'A'
    if (score >= 60) return 'B'
    if (score >= 50) return 'C'
    return 'D'
  }),
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

// Mock circuit breaker
const mockWithCircuitBreaker = vi.fn()
vi.mock('@/lib/circuitBreaker', () => ({
  withCircuitBreaker: (...args: unknown[]) => mockWithCircuitBreaker(...args),
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
  lifePredictionBackendPredictSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}))

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Import the route handler AFTER all mocks
import { POST } from '@/app/api/life-prediction/backend-predict/route'

// ============================================================
// Helpers
// ============================================================

function createRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/life-prediction/backend-predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validTimingBody = {
  question: '취업 시기',
  birthYear: 1990,
  birthMonth: 5,
  birthDay: 15,
  birthHour: 12,
  gender: 'male',
  type: 'timing',
}

const validForecastBody = {
  ...validTimingBody,
  type: 'forecast',
}

const validLuckBody = {
  ...validTimingBody,
  type: 'luck',
}

// ============================================================
// Tests
// ============================================================

describe('Life Prediction Backend Predict API - POST', () => {
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

    // Default: validation passes
    mockSafeParse.mockImplementation((data: Record<string, unknown>) => ({
      success: true,
      data: {
        question: data.question || '취업 시기',
        birthYear: data.birthYear ?? 1990,
        birthMonth: data.birthMonth ?? 5,
        birthDay: data.birthDay ?? 15,
        birthHour: data.birthHour ?? 12,
        gender: data.gender || 'unknown',
        type: data.type || 'timing',
      },
    }))

    // Default: circuit breaker executes the function directly
    mockWithCircuitBreaker.mockImplementation(
      async (_name: string, fn: () => Promise<unknown>, _fallback: unknown) => {
        const result = await fn()
        return { result, fromFallback: false }
      }
    )

    // Default: backend fetch returns success
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'success',
        event_type: 'career',
        recommendations: [
          {
            start_date: '2025-06-01',
            end_date: '2025-06-15',
            quality: 'excellent',
            quality_display: '최적',
            score: 92,
            reasons: {
              astro: ['Jupiter transit favorable'],
              saju: ['좋은 사주 흐름'],
            },
            advice: '적극적으로 움직이세요',
          },
        ],
        general_advice: '좋은 시기입니다',
        natural_answer: '6월 초가 가장 좋습니다',
        search_period: { start: '2025-01-01', end: '2025-12-31' },
      }),
    })

    // Ensure env var is set for API key
    process.env.ADMIN_API_TOKEN = 'test-admin-token'
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

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe('RATE_LIMITED')
    })

    it('should allow requests within rate limit', async () => {
      const request = createRequest(validTimingBody)
      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockRateLimit).toHaveBeenCalledWith(
        'api:/api/life-prediction/backend-predict:127.0.0.1',
        limit: 10,
        windowSeconds: 60,
      )
    })

    it('should include rate limit headers on successful response', async () => {
      const request = createRequest(validTimingBody)
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
            { path: ['birthYear'], message: 'Expected number' },
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
      expect(data.details[1]).toEqual({ path: 'birthYear', message: 'Expected number' })
    })

    it('should return 400 when question is missing', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['question'], message: 'String must contain at least 1 character(s)' }],
        },
      })

      const request = createRequest({ birthYear: 1990, birthMonth: 5 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when birthYear is out of range', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['birthYear'], message: 'Number must be at most 2100' }],
        },
      })

      const request = createRequest({ ...validTimingBody, birthYear: 3000 })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('validation_failed')
    })

    it('should return 400 when birthMonth is invalid', async () => {
      mockSafeParse.mockReturnValue({
        success: false,
        error: {
          issues: [{ path: ['birthMonth'], message: 'Number must be at most 12' }],
        },
      })

      const request = createRequest({ ...validTimingBody, birthMonth: 13 })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('should return 500 when request body is invalid JSON', async () => {
      const request = new NextRequest('http://localhost/api/life-prediction/backend-predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not-json-at-all',
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })

    it('should use default values for optional fields', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '언제가 좋을까요?',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'unknown',
          type: 'timing',
        },
      })

      const request = createRequest({
        question: '언제가 좋을까요?',
        birthYear: 1990,
        birthMonth: 5,
      })
      const response = await POST(request)

      expect(response.status).toBe(200)
    })
  })

  // ============================================================
  // Endpoint Selection (type routing)
  // ============================================================

  describe('Endpoint Selection by Type', () => {
    it('should call timing endpoint for type "timing"', async () => {
      const request = createRequest(validTimingBody)
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-backend.example.com/api/prediction/timing',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-KEY': 'test-admin-token',
          }),
        })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody).toEqual(
        expect.objectContaining({
          question: '취업 시기',
          year: 1990,
          month: 5,
          day: 15,
          hour: 12,
          gender: 'male',
        })
      )
    })

    it('should call forecast endpoint for type "forecast"', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '올해 운세',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'male',
          type: 'forecast',
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          predictions: {
            current_daeun: { period: '2020-2030' },
            five_year_outlook: [{ year: 2025, score: 75 }],
          },
          ai_interpretation: '좋은 운세입니다',
        }),
      })

      const request = createRequest(validForecastBody)
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-backend.example.com/api/prediction/forecast',
        expect.objectContaining({ method: 'POST' })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.include_timing).toBe(true)
    })

    it('should call luck endpoint for type "luck"', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '운세',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'male',
          type: 'luck',
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          predictions: { five_year_outlook: [] },
        }),
      })

      const request = createRequest(validLuckBody)
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-backend.example.com/api/prediction/luck',
        expect.objectContaining({ method: 'POST' })
      )

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(callBody.years_ahead).toBe(5)
    })

    it('should default to timing endpoint for unknown type', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '질문',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'unknown',
          type: 'unknown_type',
        },
      })

      const request = createRequest({ ...validTimingBody, type: 'unknown_type' })
      await POST(request)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-backend.example.com/api/prediction/timing',
        expect.anything()
      )
    })
  })

  // ============================================================
  // Successful Timing Response
  // ============================================================

  describe('Successful Timing Response', () => {
    it('should transform timing response correctly', async () => {
      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.eventType).toBe('career')
      expect(data.data.optimalPeriods).toHaveLength(1)
      expect(data.data.optimalPeriods[0]).toEqual(
        expect.objectContaining({
          startDate: '2025-06-01',
          endDate: '2025-06-15',
          score: 92,
          rank: 1,
        })
      )
      expect(data.data.optimalPeriods[0].reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Jupiter transit favorable'),
          expect.stringContaining('좋은 사주 흐름'),
          expect.stringContaining('적극적으로 움직이세요'),
        ])
      )
      expect(data.data.generalAdvice).toBe('좋은 시기입니다')
      expect(data.data.naturalAnswer).toBe('6월 초가 가장 좋습니다')
    })

    it('should sort timing recommendations by score descending', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'career',
          recommendations: [
            {
              start_date: '2025-03-01',
              end_date: '2025-03-15',
              quality: 'good',
              quality_display: '좋음',
              score: 70,
              reasons: { astro: ['reason1'], saju: [] },
              advice: 'advice1',
            },
            {
              start_date: '2025-06-01',
              end_date: '2025-06-15',
              quality: 'excellent',
              quality_display: '최적',
              score: 95,
              reasons: { astro: ['reason2'], saju: [] },
              advice: 'advice2',
            },
            {
              start_date: '2025-09-01',
              end_date: '2025-09-15',
              quality: 'fair',
              quality_display: '보통',
              score: 55,
              reasons: { astro: [], saju: ['reason3'] },
              advice: 'advice3',
            },
          ],
          general_advice: '',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.optimalPeriods[0].score).toBe(95)
      expect(data.data.optimalPeriods[1].score).toBe(70)
      expect(data.data.optimalPeriods[2].score).toBe(55)
    })

    it('should limit timing recommendations to top 5', async () => {
      const manyRecommendations = Array.from({ length: 8 }, (_, i) => ({
        start_date: `2025-${String(i + 1).padStart(2, '0')}-01`,
        end_date: `2025-${String(i + 1).padStart(2, '0')}-15`,
        quality: 'good',
        quality_display: '좋음',
        score: 60 + i * 5,
        reasons: { astro: [`reason${i}`], saju: [] },
        advice: `advice${i}`,
      }))

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'general',
          recommendations: manyRecommendations,
          general_advice: '',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.optimalPeriods).toHaveLength(5)
    })
  })

  // ============================================================
  // Successful Forecast Response
  // ============================================================

  describe('Successful Forecast Response', () => {
    it('should transform forecast response correctly', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '올해 운세',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'male',
          type: 'forecast',
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          predictions: {
            current_daeun: { period: '2020-2030', stem: '甲', branch: '子' },
            current_seun: { year: 2025 },
            five_year_outlook: [{ year: 2025, score: 78 }],
            timing_recommendation: { best_month: 6 },
          },
          ai_interpretation: '올해는 좋은 기운이 흐릅니다',
        }),
      })

      const request = createRequest(validForecastBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.predictions).toBeDefined()
      expect(data.data.predictions.current_daeun).toBeDefined()
      expect(data.data.aiInterpretation).toBe('올해는 좋은 기운이 흐릅니다')
    })
  })

  // ============================================================
  // Default Response Transform (non-timing/non-forecast)
  // ============================================================

  describe('Default Response Transform', () => {
    it('should return raw data for luck type without specific transform', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '운세',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'male',
          type: 'luck',
        },
      })

      const rawLuckData = {
        status: 'success',
        yearly_luck: [{ year: 2025, score: 80 }],
        custom_field: 'custom_value',
      }

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => rawLuckData,
      })

      const request = createRequest(validLuckBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // Luck type goes through default transform (passthrough)
      expect(data.data.status).toBe('success')
    })
  })

  // ============================================================
  // Backend Error Handling
  // ============================================================

  describe('Backend Error Handling', () => {
    it('should return 500 when backend returns error status', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
          message: '사주 데이터 분석 실패',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('사주 데이터 분석 실패')
    })

    it('should return default error message when backend error has no message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'error',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('예측 실패')
    })

    it('should handle backend HTTP 401 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid API key',
      })

      // The circuit breaker mock executes the function, which throws
      mockWithCircuitBreaker.mockImplementation(
        async (_name: string, fn: () => Promise<unknown>, fallback: unknown) => {
          try {
            const result = await fn()
            return { result, fromFallback: false }
          } catch {
            return {
              result: typeof fallback === 'function' ? await fallback() : fallback,
              fromFallback: true,
            }
          }
        }
      )

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })

    it('should handle backend HTTP 400 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => 'Invalid parameters',
      })

      mockWithCircuitBreaker.mockImplementation(
        async (_name: string, fn: () => Promise<unknown>, fallback: unknown) => {
          try {
            const result = await fn()
            return { result, fromFallback: false }
          } catch {
            return {
              result: typeof fallback === 'function' ? await fallback() : fallback,
              fromFallback: true,
            }
          }
        }
      )

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })

    it('should handle backend HTTP 503 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
        text: async () => 'Backend down',
      })

      mockWithCircuitBreaker.mockImplementation(
        async (_name: string, fn: () => Promise<unknown>, fallback: unknown) => {
          try {
            const result = await fn()
            return { result, fromFallback: false }
          } catch {
            return {
              result: typeof fallback === 'function' ? await fallback() : fallback,
              fromFallback: true,
            }
          }
        }
      )

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.fallback).toBe(true)
    })

    it('should handle backend HTTP 500 error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server crashed',
      })

      mockWithCircuitBreaker.mockImplementation(
        async (_name: string, fn: () => Promise<unknown>, fallback: unknown) => {
          try {
            const result = await fn()
            return { result, fromFallback: false }
          } catch {
            return {
              result: typeof fallback === 'function' ? await fallback() : fallback,
              fromFallback: true,
            }
          }
        }
      )

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })
  })

  // ============================================================
  // Circuit Breaker Behavior
  // ============================================================

  describe('Circuit Breaker', () => {
    it('should return 503 when circuit breaker returns fallback', async () => {
      mockWithCircuitBreaker.mockResolvedValue({
        result: null,
        fromFallback: true,
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.fallback).toBe(true)
    })

    it('should return 503 when backend returns null', async () => {
      mockWithCircuitBreaker.mockResolvedValue({
        result: null,
        fromFallback: false,
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
    })

    it('should pass circuit breaker options correctly', async () => {
      const request = createRequest(validTimingBody)
      await POST(request)

      expect(mockWithCircuitBreaker).toHaveBeenCalledWith(
        'backend-predict',
        expect.any(Function),
        null,
        { failureThreshold: 3, resetTimeoutMs: 60000 }
      )
    })
  })

  // ============================================================
  // Timeout and Network Errors
  // ============================================================

  describe('Timeout and Network Errors', () => {
    it('should return 503 for timeout error (AbortError)', async () => {
      const abortError = new Error('The operation was aborted')
      abortError.name = 'AbortError'

      mockWithCircuitBreaker.mockRejectedValue(abortError)

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.success).toBe(false)
      expect(data.fallback).toBe(true)
    })

    it('should return 503 for timeout error (TimeoutError)', async () => {
      const timeoutError = new Error('timeout exceeded')
      timeoutError.name = 'TimeoutError'

      mockWithCircuitBreaker.mockRejectedValue(timeoutError)

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })

    it('should return 503 for timeout message in error', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('request timeout after 55000ms'))

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })

    it('should return 503 for ECONNREFUSED error', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:5000'))

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })

    it('should return 503 for "fetch failed" error', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('fetch failed'))

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.fallback).toBe(true)
    })

    it('should return 500 for generic errors', async () => {
      mockWithCircuitBreaker.mockRejectedValue(new Error('Something unexpected'))

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })
  })

  // ============================================================
  // Edge Cases
  // ============================================================

  describe('Edge Cases', () => {
    it('should handle empty recommendations array', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'general',
          recommendations: [],
          general_advice: 'No specific advice',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.optimalPeriods).toHaveLength(0)
    })

    it('should handle missing general_advice and natural_answer', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'career',
          recommendations: [
            {
              start_date: '2025-06-01',
              end_date: '2025-06-15',
              quality: 'good',
              quality_display: '좋음',
              score: 80,
              reasons: { astro: [], saju: [] },
              advice: '',
            },
          ],
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.generalAdvice).toBe('')
      expect(data.data.naturalAnswer).toBe('')
    })

    it('should handle reasons with only astro entries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'career',
          recommendations: [
            {
              start_date: '2025-06-01',
              end_date: '2025-06-15',
              quality: 'good',
              quality_display: '좋음',
              score: 80,
              reasons: { astro: ['Good transit'], saju: [] },
              advice: '',
            },
          ],
          general_advice: '',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.optimalPeriods[0].reasons).toContainEqual(
        expect.stringContaining('Good transit')
      )
    })

    it('should handle reasons with only saju entries', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'career',
          recommendations: [
            {
              start_date: '2025-06-01',
              end_date: '2025-06-15',
              quality: 'good',
              quality_display: '좋음',
              score: 80,
              reasons: { astro: [], saju: ['좋은 사주'] },
              advice: '',
            },
          ],
          general_advice: '',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.optimalPeriods[0].reasons).toContainEqual(
        expect.stringContaining('좋은 사주')
      )
    })

    it('should provide fallback reason when no reasons exist', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          event_type: 'career',
          recommendations: [
            {
              start_date: '2025-06-01',
              end_date: '2025-06-15',
              quality: 'good',
              quality_display: '좋음',
              score: 80,
              reasons: { astro: [], saju: [] },
              advice: '',
            },
          ],
          general_advice: '',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(data.data.optimalPeriods[0].reasons).toContainEqual(
        expect.stringContaining('좋은 시기입니다')
      )
    })

    it('should handle missing event_type gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          recommendations: [
            {
              start_date: '2025-06-01',
              end_date: '2025-06-15',
              quality: 'good',
              quality_display: '좋음',
              score: 80,
              reasons: { astro: ['test'], saju: [] },
              advice: '',
            },
          ],
          general_advice: '',
          natural_answer: '',
        }),
      })

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.eventType).toBe('general')
    })

    it('should handle missing ADMIN_API_TOKEN gracefully', async () => {
      delete process.env.ADMIN_API_TOKEN

      const request = createRequest(validTimingBody)
      const response = await POST(request)

      // Should still work, just logs a warning
      expect(response.status).toBe(200)
    })

    it('should handle non-Error exception in catch block', async () => {
      mockWithCircuitBreaker.mockRejectedValue('string error')

      const request = createRequest(validTimingBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
    })

    it('should handle forecast response with missing ai_interpretation', async () => {
      mockSafeParse.mockReturnValue({
        success: true,
        data: {
          question: '올해 운세',
          birthYear: 1990,
          birthMonth: 5,
          birthDay: 15,
          birthHour: 12,
          gender: 'male',
          type: 'forecast',
        },
      })

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          status: 'success',
          predictions: {
            current_daeun: {},
          },
        }),
      })

      const request = createRequest(validForecastBody)
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.aiInterpretation).toBe('')
    })
  })
})
