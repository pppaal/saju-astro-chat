/**
 * Comprehensive tests for API Error Handler
 * Tests error codes, multi-language messages, status code mapping, and response formatting
 */

import {
  ErrorCodes,
  ERROR_MESSAGES,
  STATUS_CODES,
  createErrorResponse,
  createSuccessResponse,
  type APIErrorOptions,
} from '@/lib/api/errorHandler'

describe('API Error Handler', () => {
  describe('ErrorCodes', () => {
    it('should have all standard error codes', () => {
      expect(ErrorCodes.BAD_REQUEST).toBe('bad_request')
      expect(ErrorCodes.UNAUTHORIZED).toBe('unauthorized')
      expect(ErrorCodes.FORBIDDEN).toBe('forbidden')
      expect(ErrorCodes.NOT_FOUND).toBe('not_found')
      expect(ErrorCodes.RATE_LIMIT).toBe('rate_limit_exceeded')
      expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe('payload_too_large')
      expect(ErrorCodes.VALIDATION_ERROR).toBe('validation_error')
      expect(ErrorCodes.INTERNAL_ERROR).toBe('internal_error')
    })

    it('should have credit-specific error codes', () => {
      expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe('insufficient_credits')
      expect(ErrorCodes.COMPATIBILITY_LIMIT).toBe('compatibility_limit_exceeded')
      expect(ErrorCodes.FOLLOWUP_LIMIT).toBe('followup_limit_exceeded')
    })

    it('should have feature-specific error codes', () => {
      expect(ErrorCodes.FEATURE_NOT_AVAILABLE).toBe('feature_not_available')
      expect(ErrorCodes.UPGRADE_REQUIRED).toBe('upgrade_required')
    })
  })

  describe('ERROR_MESSAGES', () => {
    describe('Multi-language Support', () => {
      it('should have messages in all supported languages', () => {
        const languages = ['en', 'ko', 'ja', 'zh']

        for (const lang of languages) {
          expect(ERROR_MESSAGES[lang]).toBeDefined()
          expect(ERROR_MESSAGES[lang][ErrorCodes.BAD_REQUEST]).toBeDefined()
          expect(ERROR_MESSAGES[lang][ErrorCodes.UNAUTHORIZED]).toBeDefined()
          expect(ERROR_MESSAGES[lang][ErrorCodes.INSUFFICIENT_CREDITS]).toBeDefined()
        }
      })

      it('should have consistent error codes across languages', () => {
        const enCodes = Object.keys(ERROR_MESSAGES.en)
        const koCodes = Object.keys(ERROR_MESSAGES.ko)
        const jaCodes = Object.keys(ERROR_MESSAGES.ja)
        const zhCodes = Object.keys(ERROR_MESSAGES.zh)

        expect(enCodes.sort()).toEqual(koCodes.sort())
        expect(enCodes.sort()).toEqual(jaCodes.sort())
        expect(enCodes.sort()).toEqual(zhCodes.sort())
      })

      it('should have non-empty messages', () => {
        for (const lang of ['en', 'ko', 'ja', 'zh']) {
          const messages = ERROR_MESSAGES[lang]
          for (const [code, message] of Object.entries(messages)) {
            expect(message).toBeTruthy()
            expect(message.length).toBeGreaterThan(0)
          }
        }
      })

      it('should have Korean messages for common errors', () => {
        expect(ERROR_MESSAGES.ko[ErrorCodes.UNAUTHORIZED]).toContain('인증')
        expect(ERROR_MESSAGES.ko[ErrorCodes.INSUFFICIENT_CREDITS]).toContain('크레딧')
        expect(ERROR_MESSAGES.ko[ErrorCodes.RATE_LIMIT]).toContain('제한')
      })
    })

    describe('Error Message Quality', () => {
      it('should have user-friendly English messages', () => {
        expect(ERROR_MESSAGES.en[ErrorCodes.BAD_REQUEST]).toContain('request')
        expect(ERROR_MESSAGES.en[ErrorCodes.UNAUTHORIZED]).toContain('authorized')
        expect(ERROR_MESSAGES.en[ErrorCodes.INSUFFICIENT_CREDITS]).toContain('credit')
      })

      it('should not expose internal details', () => {
        for (const lang of ['en', 'ko', 'ja', 'zh']) {
          const messages = Object.values(ERROR_MESSAGES[lang])
          for (const message of messages) {
            expect(message.toLowerCase()).not.toContain('database')
            expect(message.toLowerCase()).not.toContain('sql')
            expect(message.toLowerCase()).not.toContain('prisma')
          }
        }
      })
    })
  })

  describe('STATUS_CODES', () => {
    it('should map error codes to correct HTTP status', () => {
      expect(STATUS_CODES[ErrorCodes.BAD_REQUEST]).toBe(400)
      expect(STATUS_CODES[ErrorCodes.UNAUTHORIZED]).toBe(401)
      expect(STATUS_CODES[ErrorCodes.FORBIDDEN]).toBe(403)
      expect(STATUS_CODES[ErrorCodes.NOT_FOUND]).toBe(404)
      expect(STATUS_CODES[ErrorCodes.RATE_LIMIT]).toBe(429)
      expect(STATUS_CODES[ErrorCodes.INTERNAL_ERROR]).toBe(500)
    })

    it('should use 400 for validation errors', () => {
      expect(STATUS_CODES[ErrorCodes.VALIDATION_ERROR]).toBe(400)
      expect(STATUS_CODES[ErrorCodes.PAYLOAD_TOO_LARGE]).toBe(413)
    })

    it('should use 402 for payment required errors', () => {
      expect(STATUS_CODES[ErrorCodes.INSUFFICIENT_CREDITS]).toBe(402)
      expect(STATUS_CODES[ErrorCodes.UPGRADE_REQUIRED]).toBe(402)
    })

    it('should use 403 for feature restrictions', () => {
      expect(STATUS_CODES[ErrorCodes.FEATURE_NOT_AVAILABLE]).toBe(403)
      expect(STATUS_CODES[ErrorCodes.COMPATIBILITY_LIMIT]).toBe(403)
      expect(STATUS_CODES[ErrorCodes.FOLLOWUP_LIMIT]).toBe(403)
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

      it('should create error response with custom message', () => {
        const response = createErrorResponse({
          code: ErrorCodes.VALIDATION_ERROR,
          message: 'Email is required',
        })

        expect(response.status).toBe(400)
      })

      it('should include error details', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.VALIDATION_ERROR,
          details: [
            { field: 'email', message: 'Invalid email format' },
            { field: 'password', message: 'Too short' },
          ],
        })

        const data = await response.json()

        expect(data.error).toBe('validation_error')
        expect(data.details).toHaveLength(2)
      })
    })

    describe('Language Support', () => {
      it('should return English message by default', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
        })

        const data = await response.json()

        expect(data.message).toBe(ERROR_MESSAGES.en[ErrorCodes.UNAUTHORIZED])
      })

      it('should return Korean message when specified', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          locale: 'ko',
        })

        const data = await response.json()

        expect(data.message).toBe(ERROR_MESSAGES.ko[ErrorCodes.UNAUTHORIZED])
      })

      it('should return Japanese message when specified', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.INSUFFICIENT_CREDITS,
          locale: 'ja',
        })

        const data = await response.json()

        expect(data.message).toBe(ERROR_MESSAGES.ja[ErrorCodes.INSUFFICIENT_CREDITS])
      })

      it('should fallback to English for unsupported locale', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          locale: 'unsupported' as any,
        })

        const data = await response.json()

        expect(data.message).toBe(ERROR_MESSAGES.en[ErrorCodes.BAD_REQUEST])
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

        expect(data.message).toBe(customMessage)
      })

      it('should preserve custom message regardless of locale', async () => {
        const customMessage = 'Custom message'

        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          message: customMessage,
          locale: 'ko',
        })

        const data = await response.json()

        expect(data.message).toBe(customMessage)
      })
    })

    describe('Error Response Format', () => {
      it('should have standard error format', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.NOT_FOUND,
        })

        const data = await response.json()

        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('message')
        expect(data.error).toBe('not_found')
      })

      it('should include details when provided', async () => {
        const details = { userId: '123', reason: 'Invalid credentials' }

        const response = createErrorResponse({
          code: ErrorCodes.UNAUTHORIZED,
          details,
        })

        const data = await response.json()

        expect(data.details).toEqual(details)
      })

      it('should not include details when not provided', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
        })

        const data = await response.json()

        expect(data.details).toBeUndefined()
      })
    })

    describe('HTTP Status Codes', () => {
      it('should use correct status for each error type', () => {
        const testCases = [
          { code: ErrorCodes.BAD_REQUEST, status: 400 },
          { code: ErrorCodes.UNAUTHORIZED, status: 401 },
          { code: ErrorCodes.FORBIDDEN, status: 403 },
          { code: ErrorCodes.NOT_FOUND, status: 404 },
          { code: ErrorCodes.RATE_LIMIT, status: 429 },
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
        expect(data.error).toBe('unknown_error')
      })

      it('should handle empty details array', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.VALIDATION_ERROR,
          details: [],
        })

        const data = await response.json()

        expect(data.details).toEqual([])
      })

      it('should handle null details', async () => {
        const response = createErrorResponse({
          code: ErrorCodes.BAD_REQUEST,
          details: null as any,
        })

        const data = await response.json()

        expect(data.details).toBeNull()
      })
    })
  })

  describe('createSuccessResponse', () => {
    describe('Basic Success Response', () => {
      it('should create success response with data', async () => {
        const data = { id: '123', name: 'Test' }

        const response = createSuccessResponse(data)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('application/json')

        const body = await response.json()
        expect(body).toEqual(data)
      })

      it('should create success response with array data', async () => {
        const data = [
          { id: '1', name: 'Item 1' },
          { id: '2', name: 'Item 2' },
        ]

        const response = createSuccessResponse(data)

        const body = await response.json()
        expect(body).toEqual(data)
      })

      it('should create success response with null data', async () => {
        const response = createSuccessResponse(null)

        const body = await response.json()
        expect(body).toBeNull()
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

    describe('Edge Cases', () => {
      it('should handle empty object', async () => {
        const response = createSuccessResponse({})

        const body = await response.json()
        expect(body).toEqual({})
      })

      it('should handle empty array', async () => {
        const response = createSuccessResponse([])

        const body = await response.json()
        expect(body).toEqual([])
      })

      it('should handle primitive values', async () => {
        const stringResponse = createSuccessResponse('success')
        const numberResponse = createSuccessResponse(42)
        const booleanResponse = createSuccessResponse(true)

        expect(await stringResponse.json()).toBe('success')
        expect(await numberResponse.json()).toBe(42)
        expect(await booleanResponse.json()).toBe(true)
      })

      it('should handle nested objects', async () => {
        const data = {
          user: {
            id: '123',
            profile: {
              name: 'Test User',
              settings: { theme: 'dark' },
            },
          },
        }

        const response = createSuccessResponse(data)

        const body = await response.json()
        expect(body).toEqual(data)
      })
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

        expect(data).toHaveProperty('error')
        expect(data).toHaveProperty('message')
        expect(data.error).toBe(code)
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
      expect(successData.token).toBe('abc123')
    })

    it('should support multilingual error reporting', async () => {
      const code = ErrorCodes.INSUFFICIENT_CREDITS

      const enResponse = await createErrorResponse({ code, locale: 'en' }).json()
      const koResponse = await createErrorResponse({ code, locale: 'ko' }).json()
      const jaResponse = await createErrorResponse({ code, locale: 'ja' }).json()

      expect(enResponse.message).not.toBe(koResponse.message)
      expect(enResponse.message).not.toBe(jaResponse.message)
      expect(koResponse.message).not.toBe(jaResponse.message)
    })
  })
})
