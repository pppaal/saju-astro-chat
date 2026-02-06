/**
 * Comprehensive tests for API Error Handler
 * Tests error codes, multi-language messages, status code mapping, and response formatting
 */

import {
  ErrorCodes,
  createErrorResponse,
  createSuccessResponse,
  withErrorHandler,
  jsonErrorResponse,
  type APIErrorOptions,
} from '@/lib/api/errorHandler'

describe('API Error Handler', () => {
  describe('ErrorCodes', () => {
    it('should have all client error codes', () => {
      expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST')
      expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
      expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
      expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
      expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED')
      expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe('PAYLOAD_TOO_LARGE')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
      expect(ErrorCodes.PAYMENT_REQUIRED).toBe('PAYMENT_REQUIRED')
    })

    it('should have all server error codes', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
      expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE')
      expect(ErrorCodes.BACKEND_ERROR).toBe('BACKEND_ERROR')
      expect(ErrorCodes.TIMEOUT).toBe('TIMEOUT')
      expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR')
      expect(ErrorCodes.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR')
    })

    it('should have all business logic error codes', () => {
      expect(ErrorCodes.INVALID_TOKEN).toBe('INVALID_TOKEN')
      expect(ErrorCodes.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
      expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS')
      expect(ErrorCodes.INVALID_DATE).toBe('INVALID_DATE')
      expect(ErrorCodes.INVALID_TIME).toBe('INVALID_TIME')
      expect(ErrorCodes.INVALID_COORDINATES).toBe('INVALID_COORDINATES')
      expect(ErrorCodes.INVALID_FORMAT).toBe('INVALID_FORMAT')
      expect(ErrorCodes.MISSING_FIELD).toBe('MISSING_FIELD')
    })

    it('should have exactly 22 error codes', () => {
      expect(Object.keys(ErrorCodes)).toHaveLength(22)
    })
  })

  describe('Error Messages (via createErrorResponse)', () => {
    describe('Multi-language Support', () => {
      it('should have messages in all supported languages', async () => {
        const locales = ['en', 'ko', 'ja', 'zh']

        for (const locale of locales) {
          const response = createErrorResponse({
            code: ErrorCodes.BAD_REQUEST,
            locale,
          })
          const data = await response.json()
          expect(data.error.message).toBeDefined()
          expect(data.error.message.length).toBeGreaterThan(0)
        }
      })

      it('should have distinct messages per locale for a given error', async () => {
        const locales = ['en', 'ko', 'ja', 'zh']
        const messages: string[] = []

        for (const locale of locales) {
          const response = createErrorResponse({
            code: ErrorCodes.UNAUTHORIZED,
            locale,
          })
          const data = await response.json()
          messages.push(data.error.message)
        }

        // All messages should be unique
        const uniqueMessages = new Set(messages)
        expect(uniqueMessages.size).toBe(locales.length)
      })

      it('should have non-empty messages for all error codes', async () => {
        const codes = Object.values(ErrorCodes)
        for (const code of codes) {
          const response = createErrorResponse({ code })
          const data = await response.json()
          expect(data.error.message).toBeTruthy()
          expect(data.error.message.length).toBeGreaterThan(0)
        }
      })

      it('should have Korean messages for common errors', async () => {
        const koUnauthorized = await createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          locale: 'ko',
        }).json()
        expect(koUnauthorized.error.message).toContain('로그인')

        const koCredits = await createErrorResponse({
          code: ErrorCodes.INSUFFICIENT_CREDITS,
          locale: 'ko',
        }).json()
        expect(koCredits.error.message).toContain('크레딧')

        const koRateLimit = await createErrorResponse({
          code: ErrorCodes.RATE_LIMITED,
          locale: 'ko',
        }).json()
        expect(koRateLimit.error.message).toContain('요청')
      })
    })

    describe('Error Message Quality', () => {
      it('should have user-friendly English messages', async () => {
        const badRequest = await createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
        }).json()
        expect(badRequest.error.message.toLowerCase()).toContain('request')

        const unauthorized = await createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
        }).json()
        expect(unauthorized.error.message.toLowerCase()).toContain('log in')

        const credits = await createErrorResponse({
          code: ErrorCodes.INSUFFICIENT_CREDITS,
        }).json()
        expect(credits.error.message.toLowerCase()).toContain('credit')
      })

      it('should not expose internal implementation details in English messages', async () => {
        const codes = Object.values(ErrorCodes)
        for (const code of codes) {
          const data = await createErrorResponse({ code }).json()
          const msg = data.error.message.toLowerCase()
          expect(msg).not.toContain('sql')
          expect(msg).not.toContain('prisma')
        }
      })
    })
  })

  describe('Status Code Mapping (via createErrorResponse)', () => {
    it('should map error codes to correct HTTP status', () => {
      expect(createErrorResponse({ code: ErrorCodes.BAD_REQUEST }).status).toBe(400)
      expect(createErrorResponse({ code: ErrorCodes.UNAUTHORIZED }).status).toBe(401)
      expect(createErrorResponse({ code: ErrorCodes.FORBIDDEN }).status).toBe(403)
      expect(createErrorResponse({ code: ErrorCodes.NOT_FOUND }).status).toBe(404)
      expect(createErrorResponse({ code: ErrorCodes.RATE_LIMITED }).status).toBe(429)
      expect(createErrorResponse({ code: ErrorCodes.INTERNAL_ERROR }).status).toBe(500)
    })

    it('should use correct status for validation errors', () => {
      expect(createErrorResponse({ code: ErrorCodes.VALIDATION_ERROR }).status).toBe(422)
      expect(createErrorResponse({ code: ErrorCodes.PAYLOAD_TOO_LARGE }).status).toBe(413)
    })

    it('should use 402 for insufficient credits', () => {
      expect(createErrorResponse({ code: ErrorCodes.INSUFFICIENT_CREDITS }).status).toBe(402)
    })

    it('should use correct status for server errors', () => {
      expect(createErrorResponse({ code: ErrorCodes.SERVICE_UNAVAILABLE }).status).toBe(503)
      expect(createErrorResponse({ code: ErrorCodes.BACKEND_ERROR }).status).toBe(502)
      expect(createErrorResponse({ code: ErrorCodes.TIMEOUT }).status).toBe(504)
      expect(createErrorResponse({ code: ErrorCodes.DATABASE_ERROR }).status).toBe(500)
      expect(createErrorResponse({ code: ErrorCodes.EXTERNAL_API_ERROR }).status).toBe(502)
    })

    it('should use correct status for auth/token errors', () => {
      expect(createErrorResponse({ code: ErrorCodes.INVALID_TOKEN }).status).toBe(401)
      expect(createErrorResponse({ code: ErrorCodes.TOKEN_EXPIRED }).status).toBe(401)
    })

    it('should use 400 for input validation codes', () => {
      expect(createErrorResponse({ code: ErrorCodes.INVALID_DATE }).status).toBe(400)
      expect(createErrorResponse({ code: ErrorCodes.INVALID_TIME }).status).toBe(400)
      expect(createErrorResponse({ code: ErrorCodes.INVALID_COORDINATES }).status).toBe(400)
      expect(createErrorResponse({ code: ErrorCodes.INVALID_FORMAT }).status).toBe(400)
      expect(createErrorResponse({ code: ErrorCodes.MISSING_FIELD }).status).toBe(400)
    })
  })

  describe('createErrorResponse', () => {
    describe('Basic Error Response', () => {
      it('should create error response with code only', () => {
        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
        })

        expect(response.status).toBe(400)
        expect(response.headers.get('Content-Type')).toBe('application/json')
      })

      it('should create error response with custom message', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Email is required',
        })

        expect(response.status).toBe(422)
        const data = await response.json()
        expect(data.error.message).toBe('Email is required')
      })

      it('should include error details in development mode', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        const response = createErrorResponse({
          code: ErrorCodes.VALIDATION_ERROR,
          details: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Too short' },
          ],
        })

        const data = await response.json()

        expect(data.error.code).toBe('VALIDATION_ERROR')
        expect(data.error.details).toHaveLength(2)

        process.env.NODE_ENV = originalEnv
      })
    })

    describe('Language Support', () => {
      it('should return English message by default', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
        })

        const data = await response.json()

        // Default locale is 'en'
        expect(data.error.message).toContain('log in')
      })

      it('should return Korean message when specified', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          locale: 'ko',
        })

        const data = await response.json()

        expect(data.error.message).toContain('로그인')
      })

      it('should return Japanese message when specified', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.INSUFFICIENT_CREDITS,
          locale: 'ja',
        })

        const data = await response.json()

        expect(data.error.message).toContain('クレジット')
      })

      it('should fallback to English for unsupported locale', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          locale: 'unsupported' as any,
        })

        const data = await response.json()

        // Falls back to English
        expect(data.error.message).toContain('Invalid request')
      })
    })

    describe('Custom Messages', () => {
      it('should override default message with custom message', async () => {
        const customMessage = 'Custom error message'

        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          message: customMessage,
        })

        const data = await response.json()

        expect(data.error.message).toBe(customMessage)
      })

      it('should preserve custom message regardless of locale', async () => {
        const customMessage = 'Custom message'

        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message: customMessage,
          locale: 'ko',
        })

        const data = await response.json()

        expect(data.error.message).toBe(customMessage)
      })
    })

    describe('Error Response Format', () => {
      it('should have standard error format with success:false and error object', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
        })

        const data = await response.json()

        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
        expect(data.error.code).toBe('NOT_FOUND')
        expect(data.error.message).toBeDefined()
        expect(data.error.status).toBe(404)
      })

      it('should include details in error object in development mode', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        const details = { userId: '123', reason: 'Invalid credentials' }

        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          details,
        })

        const data = await response.json()

        expect(data.error.details).toEqual(details)

        process.env.NODE_ENV = originalEnv
      })

      it('should not include details in production mode', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'production'

        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          details: { sensitive: 'info' },
        })

        const data = await response.json()

        expect(data.error.details).toBeUndefined()

        process.env.NODE_ENV = originalEnv
      })

      it('should not include details when not provided', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
        })

        const data = await response.json()

        expect(data.error.details).toBeUndefined()
      })
    })

    describe('HTTP Status Codes', () => {
      it('should use correct status for each error type', () => {
        const testCases = [
          { code: ErrorCodes.BAD_REQUEST, status: 400 },
          { code: ErrorCodes.UNAUTHORIZED, status: 401 },
          { code: ErrorCodes.FORBIDDEN, status: 403 },
          { code: ErrorCodes.NOT_FOUND, status: 404 },
          { code: ErrorCodes.RATE_LIMITED, status: 429 },
          { code: ErrorCodes.INTERNAL_ERROR, status: 500 },
        ]

        for (const { code, status } of testCases) {
          const response = createErrorResponse({ code })
          expect(response.status).toBe(status)
        }
      })
    })

    describe('Edge Cases', () => {
      it('should handle unknown error code gracefully', async () => {
        const response = createErrorResponse({
          code: 'unknown_error' as any,
        })

        const data = await response.json()

        expect(response.status).toBe(500)
        expect(data.error.code).toBe('unknown_error')
      })

      it('should handle empty details array in development', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        const response = createErrorResponse({
          code: ErrorCodes.VALIDATION_ERROR,
          details: [],
        })

        const data = await response.json()

        expect(data.error.details).toEqual([])

        process.env.NODE_ENV = originalEnv
      })

      it('should handle null details in development', async () => {
        const originalEnv = process.env.NODE_ENV
        process.env.NODE_ENV = 'development'

        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          details: null as any,
        })

        const data = await response.json()

        // null is falsy, so the `if (details)` check means it won't be included
        expect(data.error.details).toBeUndefined()

        process.env.NODE_ENV = originalEnv
      })
    })
  })

  describe('createSuccessResponse', () => {
    describe('Basic Success Response', () => {
      it('should create success response with data', async () => {
        const payload = { id: '123', name: 'Test' }

        const response = createSuccessResponse(payload)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('application/json')

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data).toEqual(payload)
      })

      it('should create success response with array data', async () => {
        const payload = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ]

        const response = createSuccessResponse(payload)

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data).toEqual(payload)
      })

      it('should create success response with null data', async () => {
        const response = createSuccessResponse(null)

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data).toBeNull()
      })
    })

    describe('Custom Status Codes', () => {
      it('should support 201 Created status', async () => {
        const response = createSuccessResponse({ id: '123' }, { status: 201 })

        expect(response.status).toBe(201)
      })

      it('should support 204 No Content status', () => {
        const response = createSuccessResponse(null, { status: 204 })

        expect(response.status).toBe(204)
      })
    })

    describe('Custom Headers', () => {
      it('should include custom headers', () => {
        const response = createSuccessResponse(
          { data: 'test' },
          {
            headers: {
              'X-Custom-Header': 'custom-value',
              'Cache-Control': 'no-cache',
            },
          }
        )

        expect(response.headers.get('X-Custom-Header')).toBe('custom-value')
        expect(response.headers.get('Cache-Control')).toBe('no-cache')
      })

      it('should preserve Content-Type header', () => {
        const response = createSuccessResponse(
          { data: 'test' },
          {
            headers: {
              'X-Custom': 'value',
            },
          }
        )

        expect(response.headers.get('Content-Type')).toBe('application/json')
      })
    })

    describe('Meta Support', () => {
      it('should include meta when provided', async () => {
        const response = createSuccessResponse({ items: [] }, { meta: { page: 1, total: 100 } })

        const body = await response.json()
        expect(body.meta).toEqual({ page: 1, total: 100 })
      })

      it('should not include meta when not provided', async () => {
        const response = createSuccessResponse({ items: [] })

        const body = await response.json()
        expect(body.meta).toBeUndefined()
      })
    })

    describe('Edge Cases', () => {
      it('should handle empty object', async () => {
        const response = createSuccessResponse({})

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data).toEqual({})
      })

      it('should handle empty array', async () => {
        const response = createSuccessResponse([])

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data).toEqual([])
      })

      it('should handle primitive values', async () => {
        const stringResponse = createSuccessResponse('success')
        const numberResponse = createSuccessResponse(42)
        const booleanResponse = createSuccessResponse(true)

        const stringBody = await stringResponse.json()
        const numberBody = await numberResponse.json()
        const booleanBody = await booleanResponse.json()

        expect(stringBody.success).toBe(true)
        expect(stringBody.data).toBe('success')
        expect(numberBody.data).toBe(42)
        expect(booleanBody.data).toBe(true)
      })

      it('should handle nested objects', async () => {
        const payload = {
          user: {
            id: '123',
            profile: {
              name: 'Test User',
              settings: { theme: 'dark' },
            },
          },
        }

        const response = createSuccessResponse(payload)

        const body = await response.json()
        expect(body.success).toBe(true)
        expect(body.data).toEqual(payload)
      })
    })
  })

  describe('withErrorHandler (deprecated)', () => {
    it('should throw an error when called', () => {
      const handler = async () => new Response('OK')
      expect(() => withErrorHandler(handler, '/test')).toThrow('withErrorHandler is deprecated')
    })
  })

  describe('jsonErrorResponse', () => {
    it('should create a plain Response with error message', async () => {
      const response = jsonErrorResponse('Something went wrong', 500)

      expect(response.status).toBe(500)
      expect(response.headers.get('Content-Type')).toBe('application/json')

      const data = await response.json()
      expect(data.error).toBe('Something went wrong')
    })

    it('should default to 400 status', async () => {
      const response = jsonErrorResponse('Bad input')

      expect(response.status).toBe(400)
    })

    it('should return a plain Response, not NextResponse', () => {
      const response = jsonErrorResponse('error')
      expect(response).toBeInstanceOf(Response)
    })
  })

  describe('Integration Scenarios', () => {
    it('should create consistent error responses across different error types', async () => {
      const errors = [
        ErrorCodes.BAD_REQUEST,
        ErrorCodes.UNAUTHORIZED,
        ErrorCodes.FORBIDDEN,
        ErrorCodes.INSUFFICIENT_CREDITS,
      ]

      for (const code of errors) {
        const response = createErrorResponse({ code })
        const data = await response.json()

        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
        expect(data.error.code).toBe(code)
        expect(data.error.message).toBeDefined()
        expect(data.error.status).toBeDefined()
      }
    })

    it('should handle error-success response pairs', async () => {
      // Error case
      const errorResponse = createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
      })

      expect(errorResponse.status).toBe(401)

      // Success case
      const successResponse = createSuccessResponse({ token: 'abc123' })

      expect(successResponse.status).toBe(200)

      const successData = await successResponse.json()
      expect(successData.success).toBe(true)
      expect(successData.data.token).toBe('abc123')
    })

    it('should support multilingual error reporting', async () => {
      const code = ErrorCodes.INSUFFICIENT_CREDITS

      const enResponse = await createErrorResponse({ code, locale: 'en' }).json()
      const koResponse = await createErrorResponse({ code, locale: 'ko' }).json()
      const jaResponse = await createErrorResponse({ code, locale: 'ja' }).json()

      expect(enResponse.error.message).not.toBe(koResponse.error.message)
      expect(enResponse.error.message).not.toBe(jaResponse.error.message)
      expect(koResponse.error.message).not.toBe(jaResponse.error.message)
    })
  })
})
