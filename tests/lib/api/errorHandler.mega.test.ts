/**
 * API Error Handler MEGA Test Suite
 * Comprehensive testing for centralized error handling
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextResponse } from 'next/server'

// Mock dependencies
vi.mock('@/lib/telemetry', () => ({
  captureServerError: vi.fn(),
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}))

import {
  ErrorCodes,
  createErrorResponse,
  withErrorHandler,
  createSuccessResponse,
  type ErrorCode,
  type APIErrorOptions,
} from '@/lib/api/errorHandler'

describe('errorHandler MEGA - ErrorCodes', () => {
  it('should have BAD_REQUEST code', () => {
    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST')
  })

  it('should have UNAUTHORIZED code', () => {
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
  })

  it('should have FORBIDDEN code', () => {
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
  })

  it('should have NOT_FOUND code', () => {
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
  })

  it('should have RATE_LIMITED code', () => {
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED')
  })

  it('should have VALIDATION_ERROR code', () => {
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
  })

  it('should have PAYLOAD_TOO_LARGE code', () => {
    expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe('PAYLOAD_TOO_LARGE')
  })

  it('should have INTERNAL_ERROR code', () => {
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
  })

  it('should have SERVICE_UNAVAILABLE code', () => {
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
  })

  it('should have BACKEND_ERROR code', () => {
    expect(ErrorCodes.BACKEND_ERROR).toBe('BACKEND_ERROR')
  })

  it('should have TIMEOUT code', () => {
    expect(ErrorCodes.TIMEOUT).toBe('TIMEOUT')
  })

  it('should have DATABASE_ERROR code', () => {
    expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR')
  })

  it('should have EXTERNAL_API_ERROR code', () => {
    expect(ErrorCodes.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR')
  })

  it('should have INVALID_TOKEN code', () => {
    expect(ErrorCodes.INVALID_TOKEN).toBe('INVALID_TOKEN')
  })

  it('should have TOKEN_EXPIRED code', () => {
    expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
  })

  it('should have INSUFFICIENT_CREDITS code', () => {
    expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS')
  })

  it('should have INVALID_DATE code', () => {
    expect(ErrorCodes.INVALID_DATE).toBe('INVALID_DATE')
  })

  it('should have INVALID_TIME code', () => {
    expect(ErrorCodes.INVALID_TIME).toBe('INVALID_TIME')
  })

  it('should have INVALID_COORDINATES code', () => {
    expect(ErrorCodes.INVALID_COORDINATES).toBe('INVALID_COORDINATES')
  })

  it('should have INVALID_FORMAT code', () => {
    expect(ErrorCodes.INVALID_FORMAT).toBe('INVALID_FORMAT')
  })

  it('should have MISSING_FIELD code', () => {
    expect(ErrorCodes.MISSING_FIELD).toBe('MISSING_FIELD')
  })

  it('should have exactly 21 error codes', () => {
    expect(Object.keys(ErrorCodes)).toHaveLength(21)
  })
})

describe('errorHandler MEGA - createErrorResponse', () => {
  describe('Status codes', () => {
    it('should return 400 for BAD_REQUEST', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      expect(response.status).toBe(400)
    })

    it('should return 401 for UNAUTHORIZED', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
      })
      expect(response.status).toBe(401)
    })

    it('should return 403 for FORBIDDEN', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.FORBIDDEN,
      })
      expect(response.status).toBe(403)
    })

    it('should return 404 for NOT_FOUND', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.NOT_FOUND,
      })
      expect(response.status).toBe(404)
    })

    it('should return 429 for RATE_LIMITED', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
      })
      expect(response.status).toBe(429)
    })

    it('should return 422 for VALIDATION_ERROR', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.VALIDATION_ERROR,
      })
      expect(response.status).toBe(422)
    })

    it('should return 413 for PAYLOAD_TOO_LARGE', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.PAYLOAD_TOO_LARGE,
      })
      expect(response.status).toBe(413)
    })

    it('should return 500 for INTERNAL_ERROR', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INTERNAL_ERROR,
      })
      expect(response.status).toBe(500)
    })

    it('should return 503 for SERVICE_UNAVAILABLE', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.SERVICE_UNAVAILABLE,
      })
      expect(response.status).toBe(503)
    })

    it('should return 502 for BACKEND_ERROR', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BACKEND_ERROR,
      })
      expect(response.status).toBe(502)
    })

    it('should return 504 for TIMEOUT', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.TIMEOUT,
      })
      expect(response.status).toBe(504)
    })

    it('should return 500 for DATABASE_ERROR', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.DATABASE_ERROR,
      })
      expect(response.status).toBe(500)
    })

    it('should return 502 for EXTERNAL_API_ERROR', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.EXTERNAL_API_ERROR,
      })
      expect(response.status).toBe(502)
    })

    it('should return 401 for INVALID_TOKEN', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INVALID_TOKEN,
      })
      expect(response.status).toBe(401)
    })

    it('should return 401 for TOKEN_EXPIRED', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.TOKEN_EXPIRED,
      })
      expect(response.status).toBe(401)
    })

    it('should return 402 for INSUFFICIENT_CREDITS', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INSUFFICIENT_CREDITS,
      })
      expect(response.status).toBe(402)
    })

    it('should return 400 for INVALID_DATE', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INVALID_DATE,
      })
      expect(response.status).toBe(400)
    })

    it('should return 400 for INVALID_TIME', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INVALID_TIME,
      })
      expect(response.status).toBe(400)
    })

    it('should return 400 for INVALID_COORDINATES', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INVALID_COORDINATES,
      })
      expect(response.status).toBe(400)
    })

    it('should return 400 for INVALID_FORMAT', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.INVALID_FORMAT,
      })
      expect(response.status).toBe(400)
    })

    it('should return 400 for MISSING_FIELD', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.MISSING_FIELD,
      })
      expect(response.status).toBe(400)
    })
  })

  describe('Localized messages', () => {
    it('should return English message by default', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      const data = await response.json()
      expect(data.error.message).toContain('Invalid request')
    })

    it('should return Korean message for ko locale', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        locale: 'ko',
      })
      const data = await response.json()
      expect(data.error.message).toContain('잘못된 요청')
    })

    it('should return Japanese message for ja locale', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        locale: 'ja',
      })
      const data = await response.json()
      expect(data.error.message).toContain('無効')
    })

    it('should return Chinese message for zh locale', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        locale: 'zh',
      })
      const data = await response.json()
      expect(data.error.message).toContain('无效')
    })

    it('should fallback to English for unknown locale', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        locale: 'xyz',
      })
      const data = await response.json()
      expect(data.error.message).toContain('Invalid request')
    })
  })

  describe('Custom messages', () => {
    it('should use custom message when provided', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        message: 'Custom error message',
      })
      const data = await response.json()
      expect(data.error.message).toBe('Custom error message')
    })

    it('should override localized message with custom message', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        locale: 'ko',
        message: 'Custom message',
      })
      const data = await response.json()
      expect(data.error.message).toBe('Custom message')
    })
  })

  describe('Response structure', () => {
    it('should have success: false', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      const data = await response.json()
      expect(data.success).toBe(false)
    })

    it('should include error code', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      const data = await response.json()
      expect(data.error.code).toBe('BAD_REQUEST')
    })

    it('should include status', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      const data = await response.json()
      expect(data.error.status).toBe(400)
    })

    it('should include message', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      const data = await response.json()
      expect(data.error.message).toBeDefined()
    })
  })

  describe('Development mode details', () => {
    const originalEnv = process.env.NODE_ENV

    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should include details in development', async () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        details: { field: 'email', reason: 'invalid format' },
      })
      const data = await response.json()
      expect(data.error.details).toEqual({ field: 'email', reason: 'invalid format' })
    })

    it('should not include details in production', async () => {
      process.env.NODE_ENV = 'production'
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        details: { sensitive: 'data' },
      })
      const data = await response.json()
      expect(data.error.details).toBeUndefined()
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Headers', () => {
    it('should include custom headers', () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        headers: { 'X-Custom': 'value' },
      })
      expect(response.headers.get('X-Custom')).toBe('value')
    })

    it('should include Content-Type header', () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
      })
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should merge multiple headers', () => {
      const response = createErrorResponse({
        code: ErrorCodes.BAD_REQUEST,
        headers: {
          'X-Header-1': 'value1',
          'X-Header-2': 'value2',
        },
      })
      expect(response.headers.get('X-Header-1')).toBe('value1')
      expect(response.headers.get('X-Header-2')).toBe('value2')
    })
  })

  describe('All error codes with all locales', () => {
    const locales = ['en', 'ko', 'ja', 'zh']
    const codes: ErrorCode[] = [
      // 4xx Client Errors
      ErrorCodes.BAD_REQUEST,
      ErrorCodes.UNAUTHORIZED,
      ErrorCodes.FORBIDDEN,
      ErrorCodes.NOT_FOUND,
      ErrorCodes.RATE_LIMITED,
      ErrorCodes.VALIDATION_ERROR,
      ErrorCodes.PAYLOAD_TOO_LARGE,
      // 5xx Server Errors
      ErrorCodes.INTERNAL_ERROR,
      ErrorCodes.SERVICE_UNAVAILABLE,
      ErrorCodes.BACKEND_ERROR,
      ErrorCodes.TIMEOUT,
      ErrorCodes.DATABASE_ERROR,
      ErrorCodes.EXTERNAL_API_ERROR,
      // Business Logic Errors
      ErrorCodes.INVALID_TOKEN,
      ErrorCodes.TOKEN_EXPIRED,
      ErrorCodes.INSUFFICIENT_CREDITS,
      ErrorCodes.INVALID_DATE,
      ErrorCodes.INVALID_TIME,
      ErrorCodes.INVALID_COORDINATES,
      ErrorCodes.INVALID_FORMAT,
      ErrorCodes.MISSING_FIELD,
    ]

    codes.forEach((code) => {
      locales.forEach((locale) => {
        it(`should handle ${code} with ${locale} locale`, async () => {
          const response = createErrorResponse({ code, locale })
          const data = await response.json()
          expect(data.error.code).toBe(code)
          expect(data.error.message).toBeDefined()
          expect(data.error.message.length).toBeGreaterThan(0)
        })
      })
    })
  })
})

describe('errorHandler MEGA - createSuccessResponse', () => {
  it('should create success response with data', async () => {
    const response = createSuccessResponse({ result: 'test' })
    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.data.result).toBe('test')
  })

  it('should default to 200 status', () => {
    const response = createSuccessResponse({})
    expect(response.status).toBe(200)
  })

  it('should accept custom status', () => {
    const response = createSuccessResponse({}, { status: 201 })
    expect(response.status).toBe(201)
  })

  it('should include custom headers', () => {
    const response = createSuccessResponse(
      {},
      {
        headers: { 'X-Custom': 'value' },
      }
    )
    expect(response.headers.get('X-Custom')).toBe('value')
  })

  it('should include meta if provided', async () => {
    const response = createSuccessResponse(
      { data: 'test' },
      {
        meta: { page: 1, total: 10 },
      }
    )
    const data = await response.json()
    expect(data.meta).toEqual({ page: 1, total: 10 })
  })

  it('should handle null data', async () => {
    const response = createSuccessResponse(null)
    const data = await response.json()
    expect(data.data).toBeNull()
  })

  it('should handle array data', async () => {
    const response = createSuccessResponse([1, 2, 3])
    const data = await response.json()
    expect(data.data).toEqual([1, 2, 3])
  })

  it('should handle string data', async () => {
    const response = createSuccessResponse('hello')
    const data = await response.json()
    expect(data.data).toBe('hello')
  })

  it('should handle number data', async () => {
    const response = createSuccessResponse(42)
    const data = await response.json()
    expect(data.data).toBe(42)
  })

  it('should handle boolean data', async () => {
    const response = createSuccessResponse(true)
    const data = await response.json()
    expect(data.data).toBe(true)
  })

  it('should handle complex nested objects', async () => {
    const complexData = {
      user: {
        name: 'John',
        profile: {
          age: 30,
          hobbies: ['reading', 'coding'],
        },
      },
    }
    const response = createSuccessResponse(complexData)
    const data = await response.json()
    expect(data.data).toEqual(complexData)
  })
})

describe('errorHandler MEGA - withErrorHandler (deprecated)', () => {
  it('should throw an error when called', () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({ success: true }))
    expect(() => withErrorHandler(handler, '/api/test')).toThrow('withErrorHandler is deprecated')
  })

  it('should mention withApiMiddleware in the error message', () => {
    const handler = vi.fn()
    expect(() => withErrorHandler(handler, '/api/test')).toThrow('withApiMiddleware')
  })

  it('should throw regardless of handler or route arguments', () => {
    expect(() => withErrorHandler(async () => new Response('OK'), '/any-route')).toThrow()
    expect(() => withErrorHandler(async () => new Response(''), '')).toThrow()
  })
})
