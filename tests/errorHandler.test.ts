/**
 * API Error Handler 테스트
 * - 에러 코드 분류
 * - 다국어 에러 메시지
 * - 에러 응답 생성
 * - 성공 응답 생성
 */

import { vi, beforeEach } from 'vitest'
import {
  ErrorCodes,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
  jsonErrorResponse,
  type ErrorCode,
} from '@/lib/api/errorHandler'

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
    debug: vi.fn(),
  },
}))

describe('ErrorCodes', () => {
  it('has all client error codes (4xx)', () => {
    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST')
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED')
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe('PAYLOAD_TOO_LARGE')
  })

  it('has all server error codes (5xx)', () => {
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
    expect(ErrorCodes.BACKEND_ERROR).toBe('BACKEND_ERROR')
    expect(ErrorCodes.TIMEOUT).toBe('TIMEOUT')
    expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR')
  })

  it('has all business logic error codes', () => {
    expect(ErrorCodes.INVALID_TOKEN).toBe('INVALID_TOKEN')
    expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
    expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS')
    expect(ErrorCodes.INVALID_DATE).toBe('INVALID_DATE')
    expect(ErrorCodes.INVALID_TIME).toBe('INVALID_TIME')
    expect(ErrorCodes.INVALID_COORDINATES).toBe('INVALID_COORDINATES')
    expect(ErrorCodes.INVALID_FORMAT).toBe('INVALID_FORMAT')
    expect(ErrorCodes.MISSING_FIELD).toBe('MISSING_FIELD')
    expect(ErrorCodes.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR')
  })
})

describe('createErrorResponse', () => {
  it('creates response with correct status code for BAD_REQUEST', async () => {
    const response = createErrorResponse({ code: ErrorCodes.BAD_REQUEST })
    expect(response.status).toBe(400)
  })

  it('creates response with correct status code for UNAUTHORIZED', async () => {
    const response = createErrorResponse({ code: ErrorCodes.UNAUTHORIZED })
    expect(response.status).toBe(401)
  })

  it('creates response with correct status code for FORBIDDEN', async () => {
    const response = createErrorResponse({ code: ErrorCodes.FORBIDDEN })
    expect(response.status).toBe(403)
  })

  it('creates response with correct status code for NOT_FOUND', async () => {
    const response = createErrorResponse({ code: ErrorCodes.NOT_FOUND })
    expect(response.status).toBe(404)
  })

  it('creates response with correct status code for RATE_LIMITED', async () => {
    const response = createErrorResponse({ code: ErrorCodes.RATE_LIMITED })
    expect(response.status).toBe(429)
  })

  it('creates response with correct status code for VALIDATION_ERROR', async () => {
    const response = createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR })
    expect(response.status).toBe(422)
  })

  it('creates response with correct status code for INTERNAL_ERROR', async () => {
    const response = createErrorResponse({ code: ErrorCodes.INTERNAL_ERROR })
    expect(response.status).toBe(500)
  })

  it('creates response with correct status code for SERVICE_UNAVAILABLE', async () => {
    const response = createErrorResponse({ code: ErrorCodes.SERVICE_UNAVAILABLE })
    expect(response.status).toBe(503)
  })

  it('creates response with correct status code for TIMEOUT', async () => {
    const response = createErrorResponse({ code: ErrorCodes.TIMEOUT })
    expect(response.status).toBe(504)
  })

  it('creates response with correct status code for PAYLOAD_TOO_LARGE', async () => {
    const response = createErrorResponse({ code: ErrorCodes.PAYLOAD_TOO_LARGE })
    expect(response.status).toBe(413)
  })

  it('creates response with correct status code for BACKEND_ERROR', async () => {
    const response = createErrorResponse({ code: ErrorCodes.BACKEND_ERROR })
    expect(response.status).toBe(502)
  })

  it('creates response with correct status code for EXTERNAL_API_ERROR', async () => {
    const response = createErrorResponse({ code: ErrorCodes.EXTERNAL_API_ERROR })
    expect(response.status).toBe(502)
  })

  it('creates response with correct status code for INVALID_TOKEN', async () => {
    const response = createErrorResponse({ code: ErrorCodes.INVALID_TOKEN })
    expect(response.status).toBe(401)
  })

  it('creates response with correct status code for TOKEN_EXPIRED', async () => {
    const response = createErrorResponse({ code: ErrorCodes.TOKEN_EXPIRED })
    expect(response.status).toBe(401)
  })

  it('creates response with correct status code for INSUFFICIENT_CREDITS', async () => {
    const response = createErrorResponse({ code: ErrorCodes.INSUFFICIENT_CREDITS })
    expect(response.status).toBe(402)
  })

  it('includes error code and message in response body', async () => {
    const response = createErrorResponse({ code: ErrorCodes.BAD_REQUEST })
    const body = await response.json()

    expect(body.success).toBe(false)
    expect(body.error.code).toBe('BAD_REQUEST')
    expect(body.error.message).toBeTruthy()
    expect(body.error.status).toBe(400)
  })

  it('uses custom message when provided', async () => {
    const customMessage = 'Custom error message'
    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      message: customMessage,
    })
    const body = await response.json()

    expect(body.error.message).toBe(customMessage)
  })

  it('uses Korean message for ko locale', async () => {
    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      locale: 'ko',
    })
    const body = await response.json()

    expect(body.error.message).toContain('잘못된')
  })

  it('uses Japanese message for ja locale', async () => {
    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      locale: 'ja',
    })
    const body = await response.json()

    expect(body.error.message).toContain('リクエスト')
  })

  it('uses Chinese message for zh locale', async () => {
    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      locale: 'zh',
    })
    const body = await response.json()

    expect(body.error.message).toContain('请求')
  })

  it('defaults to English for unknown locale', async () => {
    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      locale: 'unknown',
    })
    const body = await response.json()

    expect(body.error.message).toContain('Invalid')
  })

  it('sets custom headers when provided', async () => {
    const response = createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      headers: { 'Retry-After': '60' },
    })

    expect(response.headers.get('Retry-After')).toBe('60')
  })

  it('always sets Content-Type header', async () => {
    const response = createErrorResponse({ code: ErrorCodes.BAD_REQUEST })
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('captures server error for 5xx errors with originalError', async () => {
    const { captureServerError } = await import('@/lib/telemetry')
    const originalError = new Error('DB connection failed')

    createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      originalError,
      route: '/api/test',
    })

    expect(captureServerError).toHaveBeenCalledWith(
      originalError,
      expect.objectContaining({ route: '/api/test', code: 'INTERNAL_ERROR' })
    )
  })

  it('records counter metric on every error', async () => {
    const { recordCounter } = await import('@/lib/metrics')

    createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      route: '/api/test',
    })

    expect(recordCounter).toHaveBeenCalledWith(
      'api.error',
      1,
      expect.objectContaining({ code: 'BAD_REQUEST', route: '/api/test' })
    )
  })
})

describe('createSuccessResponse', () => {
  it('creates response with success true', async () => {
    const response = createSuccessResponse({ id: 1, name: 'test' })
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.data).toEqual({ id: 1, name: 'test' })
  })

  it('uses default status 200', async () => {
    const response = createSuccessResponse({})
    expect(response.status).toBe(200)
  })

  it('respects custom status', async () => {
    const response = createSuccessResponse({}, { status: 201 })
    expect(response.status).toBe(201)
  })

  it('includes meta when provided', async () => {
    const response = createSuccessResponse({ items: [] }, { meta: { total: 100, page: 1 } })
    const body = await response.json()

    expect(body.meta).toEqual({ total: 100, page: 1 })
  })

  it('sets custom headers', async () => {
    const response = createSuccessResponse({}, { headers: { 'X-Custom': 'value' } })

    expect(response.headers.get('X-Custom')).toBe('value')
  })

  it('always sets Content-Type header', async () => {
    const response = createSuccessResponse({})
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('handles array data', async () => {
    const response = createSuccessResponse([1, 2, 3])
    const body = await response.json()

    expect(body.data).toEqual([1, 2, 3])
  })

  it('handles null data', async () => {
    const response = createSuccessResponse(null)
    const body = await response.json()

    expect(body.data).toBeNull()
  })

  it('handles string data', async () => {
    const response = createSuccessResponse('message')
    const body = await response.json()

    expect(body.data).toBe('message')
  })

  it('does not include meta when not provided', async () => {
    const response = createSuccessResponse({ test: true })
    const body = await response.json()

    expect(body.meta).toBeUndefined()
  })
})

describe('withErrorHandler (deprecated)', () => {
  it('throws deprecation error when called', () => {
    const mockHandler = vi.fn()
    expect(() => withErrorHandler(mockHandler, '/api/test')).toThrow(
      'withErrorHandler is deprecated'
    )
  })
})

describe('jsonErrorResponse', () => {
  it('returns a plain Response with JSON error body', async () => {
    const response = jsonErrorResponse('Something went wrong', 500)
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('Something went wrong')
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('defaults to status 400 when not specified', async () => {
    const response = jsonErrorResponse('Bad input')
    expect(response.status).toBe(400)
  })

  it('returns bare Response, not NextResponse', () => {
    const response = jsonErrorResponse('Error')
    expect(response).toBeInstanceOf(Response)
  })
})

describe('Error Messages: All Locales Coverage', () => {
  const errorCodes: ErrorCode[] = [
    'BAD_REQUEST',
    'UNAUTHORIZED',
    'FORBIDDEN',
    'NOT_FOUND',
    'RATE_LIMITED',
    'VALIDATION_ERROR',
    'PAYLOAD_TOO_LARGE',
    'INTERNAL_ERROR',
    'SERVICE_UNAVAILABLE',
    'BACKEND_ERROR',
    'TIMEOUT',
    'DATABASE_ERROR',
    'EXTERNAL_API_ERROR',
    'INVALID_TOKEN',
    'TOKEN_EXPIRED',
    'INSUFFICIENT_CREDITS',
    'INVALID_DATE',
    'INVALID_TIME',
    'INVALID_COORDINATES',
    'INVALID_FORMAT',
    'MISSING_FIELD',
  ]

  const locales = ['en', 'ko', 'ja', 'zh']

  errorCodes.forEach((code) => {
    locales.forEach((locale) => {
      it(`has ${locale} message for ${code}`, async () => {
        const response = createErrorResponse({ code, locale })
        const body = await response.json()

        expect(body.error.message).toBeTruthy()
        expect(body.error.message.length).toBeGreaterThan(5)
      })
    })
  })
})
