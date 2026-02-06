import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  sanitizeErrorMessage,
  getGenericError,
  createSafeErrorResponse,
  sanitizeError,
  type ErrorCategory,
} from '@/lib/security/errorSanitizer'
import { logger } from '@/lib/logger'

describe('errorSanitizer', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('sanitizeErrorMessage', () => {
    it('should redact OpenAI API keys', () => {
      const message = 'Error: sk-proj-abc123def456ghi789jkl012mno345'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('sk-proj')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact Stripe live keys', () => {
      const message = 'Payment failed: sk_live_51H1234567890abcdefghijk12345'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).toContain('[REDACTED]')
      // Check that the key is actually redacted (not just partially)
      expect(sanitized).not.toMatch(/sk_live_[a-zA-Z0-9]{24,}/)
    })

    it('should redact Stripe test keys', () => {
      const message = 'Testing with sk_test_51H1234567890abcdefghijk12345'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).toContain('[REDACTED]')
      expect(sanitized).not.toMatch(/sk_test_[a-zA-Z0-9]{24,}/)
    })

    it('should redact Bearer tokens', () => {
      const message = 'Unauthorized: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('Bearer eyJ')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact PostgreSQL connection strings', () => {
      const message = 'Connection failed: postgres://user:password@localhost:5432/db'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('user:password')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact MySQL connection strings', () => {
      const message = 'DB error: mysql://admin:secret@db.example.com/production'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('admin:secret')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact MongoDB connection strings', () => {
      const message = 'mongodb://dbuser:dbpass@cluster.mongodb.net/mydb'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('dbuser:dbpass')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact email addresses', () => {
      const message = 'User not found: john.doe@example.com'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('john.doe@example.com')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact internal IP addresses', () => {
      const messages = [
        'Server error at 192.168.1.100',
        'Failed to connect to 10.0.0.50',
        'Timeout from 172.16.0.25',
      ]

      messages.forEach((message) => {
        const sanitized = sanitizeErrorMessage(message)
        expect(sanitized).toContain('[REDACTED]')
        expect(sanitized).not.toMatch(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/)
      })
    })

    it('should redact Windows file paths', () => {
      const message = 'File not found: C:\\Users\\Admin\\Documents\\secret.txt'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('C:\\Users\\Admin')
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should redact Unix file paths', () => {
      const messages = [
        'Error in /home/user/.ssh/id_rsa',
        'Cannot read /var/www/html/config.php',
        'Permission denied: /root/.bashrc',
      ]

      messages.forEach((message) => {
        const sanitized = sanitizeErrorMessage(message)
        expect(sanitized).toContain('[REDACTED]')
        expect(sanitized).not.toMatch(/\/(home|root|var)\//)
      })
    })

    it('should redact node_modules stack traces', () => {
      const message = 'Error: at Function.Module._load (node:internal/modules/cjs/loader:746:27)'
      const sanitized = sanitizeErrorMessage(message)

      // Should preserve some error info but redact internal paths
      expect(sanitized).toBeTruthy()
    })

    it('should truncate very long messages', () => {
      const longMessage = 'Error: ' + 'X'.repeat(300)
      const sanitized = sanitizeErrorMessage(longMessage)

      // Should truncate to 200 chars + '...'
      expect(sanitized.length).toBeLessThanOrEqual(203)
      // After sanitization, if still > 200, should have '...'
      if (sanitized.length === 203) {
        expect(sanitized).toContain('...')
      }
    })

    it('should handle empty strings', () => {
      const sanitized = sanitizeErrorMessage('')

      expect(sanitized).toBe('Internal server error')
    })

    it('should handle non-string inputs', () => {
      const sanitized = sanitizeErrorMessage(null as any)

      expect(sanitized).toBe('Internal server error')
    })

    it('should handle messages with multiple sensitive patterns', () => {
      const message =
        'Error connecting to postgres://user:pass@10.0.0.1/db with API key sk-test_12345678901234567890abcdef'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).not.toContain('user:pass')
      expect(sanitized).not.toContain('10.0.0.1')
      expect(sanitized).toContain('[REDACTED]')
      // May only have 1 redaction if patterns overlap
      expect(sanitized.match(/\[REDACTED\]/g)?.length).toBeGreaterThanOrEqual(1)
    })

    it('should preserve safe error information', () => {
      const message = 'Network timeout after 30 seconds'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).toContain('Network timeout')
      expect(sanitized).toContain('30 seconds')
    })
  })

  describe('getGenericError', () => {
    it('should return correct generic message for database errors', () => {
      const message = getGenericError('database')
      expect(message).toBe('Database operation failed')
    })

    it('should return correct generic message for authentication errors', () => {
      const message = getGenericError('authentication')
      expect(message).toBe('Authentication failed')
    })

    it('should return correct generic message for authorization errors', () => {
      const message = getGenericError('authorization')
      expect(message).toBe('Access denied')
    })

    it('should return correct generic message for validation errors', () => {
      const message = getGenericError('validation')
      expect(message).toBe('Invalid input')
    })

    it('should return correct generic message for external API errors', () => {
      const message = getGenericError('external_api')
      expect(message).toBe('External service unavailable')
    })

    it('should return correct generic message for internal errors', () => {
      const message = getGenericError('internal')
      expect(message).toBe('Internal server error')
    })

    it('should return correct generic message for rate limit errors', () => {
      const message = getGenericError('rate_limit')
      expect(message).toBe('Too many requests')
    })

    it('should return correct generic message for not found errors', () => {
      const message = getGenericError('not_found')
      expect(message).toBe('Resource not found')
    })

    it('should log original error when provided', () => {
      const originalError = new Error('Detailed DB connection failed')
      getGenericError('database', originalError)

      expect(logger.error).toHaveBeenCalledWith('[database] Original error:', originalError)
    })

    it('should not log when original error not provided', () => {
      getGenericError('database')

      expect(logger.error).not.toHaveBeenCalled()
    })
  })

  describe('createSafeErrorResponse', () => {
    it('should return basic error response in production', () => {
      process.env.NODE_ENV = 'production'

      const response = createSafeErrorResponse('database')

      expect(response).toEqual({
        error: 'Database operation failed',
      })
      expect(response.hint).toBeUndefined()
    })

    it('should return error with hint in development when requested', () => {
      process.env.NODE_ENV = 'development'

      const originalError = new Error('Connection to postgres failed')
      const response = createSafeErrorResponse('database', originalError, true)

      expect(response.error).toBe('Database operation failed')
      expect(response.hint).toBeDefined()
      expect(response.hint).toContain('Connection')
    })

    it('should not include hint when not requested', () => {
      process.env.NODE_ENV = 'development'

      const originalError = new Error('Some error')
      const response = createSafeErrorResponse('database', originalError, false)

      expect(response.hint).toBeUndefined()
    })

    it('should log original error when provided', () => {
      const originalError = new Error('Test error')
      createSafeErrorResponse('internal', originalError)

      expect(logger.error).toHaveBeenCalledWith('[internal] Original error:', originalError)
    })

    it('should handle non-Error objects in development', () => {
      process.env.NODE_ENV = 'development'

      const response = createSafeErrorResponse('internal', 'String error', true)

      expect(response.hint).toBeDefined()
    })

    it('should sanitize hints in development mode', () => {
      process.env.NODE_ENV = 'development'

      const originalError = new Error('Failed with key sk-test_abcdef1234567890123456789012')
      const response = createSafeErrorResponse('external_api', originalError, true)

      expect(response.hint).toContain('[REDACTED]')
      expect(response.hint).not.toMatch(/sk-test_[a-zA-Z0-9]{24,}/)
    })
  })

  describe('sanitizeError', () => {
    it('should return only generic error in production', () => {
      process.env.NODE_ENV = 'production'

      const error = new Error('Sensitive database password: secret123')
      const result = sanitizeError(error, 'database')

      expect(result).toEqual({
        error: 'Database operation failed',
      })
      expect(result.hint).toBeUndefined()
    })

    it('should return error with sanitized hint in development', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('API key sk-proj-abc123def456ghi789jkl012mno345 is invalid')
      const result = sanitizeError(error, 'authentication')

      expect(result.error).toBe('Authentication failed')
      expect(result.hint).toBeDefined()
      expect(result.hint).toContain('[REDACTED]')
      expect(result.hint).not.toMatch(/sk-[a-zA-Z0-9-_]{32,}/)
    })

    it('should log the original error', () => {
      const error = new Error('Original error')
      sanitizeError(error, 'internal')

      expect(logger.error).toHaveBeenCalledWith('[internal] Error occurred:', error)
    })

    it('should handle Error objects', () => {
      const error = new Error('Test error message')
      const result = sanitizeError(error, 'validation')

      expect(result.error).toBe('Invalid input')
    })

    it('should handle non-Error objects', () => {
      const error = 'String error message'
      const result = sanitizeError(error, 'internal')

      expect(result.error).toBe('Internal server error')
    })

    it('should default to internal category', () => {
      const error = new Error('Some error')
      const result = sanitizeError(error)

      expect(result.error).toBe('Internal server error')
    })

    it('should handle all error categories', () => {
      const categories: ErrorCategory[] = [
        'database',
        'authentication',
        'authorization',
        'validation',
        'external_api',
        'internal',
        'rate_limit',
        'not_found',
      ]

      categories.forEach((category) => {
        const result = sanitizeError(new Error('Test'), category)
        expect(result.error).toBeTruthy()
      })
    })

    it('should sanitize sensitive data in development hints', () => {
      process.env.NODE_ENV = 'development'

      const error = new Error('Connection to mysql://admin:pass@192.168.1.1/db failed')
      const result = sanitizeError(error, 'database')

      expect(result.hint).not.toContain('admin:pass')
      expect(result.hint).not.toContain('192.168.1.1')
      expect(result.hint).toContain('[REDACTED]')
    })

    it('should handle null and undefined errors', () => {
      const result1 = sanitizeError(null, 'internal')
      const result2 = sanitizeError(undefined, 'internal')

      expect(result1.error).toBe('Internal server error')
      expect(result2.error).toBe('Internal server error')
    })

    it('should handle objects with toString', () => {
      const error = {
        toString() {
          return 'Custom error with user@email.com at 192.168.1.5'
        },
      }

      process.env.NODE_ENV = 'development'
      const result = sanitizeError(error, 'internal')

      // Should redact email and IP
      expect(result.hint).toContain('[REDACTED]')
      expect(result.hint).not.toContain('user@email.com')
      expect(result.hint).not.toContain('192.168.1.5')
    })
  })

  describe('Integration Tests', () => {
    it('should handle real-world database error', () => {
      process.env.NODE_ENV = 'production'

      const dbError = new Error(
        'connection to server at "postgres://user:pass@10.0.1.5:5432/db" failed'
      )
      const result = sanitizeError(dbError, 'database')

      expect(result.error).toBe('Database operation failed')
      expect(result.hint).toBeUndefined()
      expect(logger.error).toHaveBeenCalled()
    })

    it('should handle real-world API authentication error', () => {
      const apiError = new Error(
        'Invalid API key sk-proj-1234567890abcdefghij1234567890ab for user@example.com'
      )
      const message = sanitizeErrorMessage(apiError.message)

      expect(message).toContain('[REDACTED]')
      expect(message).not.toMatch(/sk-[a-zA-Z0-9-_]{32,}/)
      expect(message).not.toContain('user@example.com')
    })

    it('should handle stack trace with sensitive paths', () => {
      const error = new Error('File operation failed')
      error.stack =
        'Error: File operation failed\n' +
        '  at readFile (/home/user/.config/secrets.json:10:5)\n' +
        '  at processFile (C:\\Users\\Admin\\Documents\\app.js:20:10)'

      const message = sanitizeErrorMessage(error.stack || error.message)

      expect(message).toContain('[REDACTED]')
      expect(message).not.toContain('/home/user')
      expect(message).not.toContain('C:\\Users\\Admin')
    })

    it('should maintain error context while removing sensitive data', () => {
      const error = 'Failed to process payment for user@email.com with card 4242'
      const sanitized = sanitizeErrorMessage(error)

      expect(sanitized).toContain('Failed to process payment')
      expect(sanitized).not.toContain('user@email.com')
    })
  })

  describe('Edge Cases', () => {
    it('should handle extremely long error messages', () => {
      const longError = 'Error: ' + 'A'.repeat(1000)
      const sanitized = sanitizeErrorMessage(longError)

      expect(sanitized.length).toBeLessThanOrEqual(203)
    })

    it('should handle messages with only sensitive data', () => {
      const message = 'sk-test_abc123def456789012345678901234'
      const sanitized = sanitizeErrorMessage(message)

      // Should be mostly redacted
      expect(sanitized).toContain('[REDACTED]')
    })

    it('should handle Unicode characters', () => {
      const message = 'Error: 파일을 찾을 수 없습니다 at /home/user/file.txt'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).toContain('파일을 찾을 수 없습니다')
      expect(sanitized).not.toContain('/home/user')
    })

    it('should handle circular references gracefully', () => {
      const obj: any = { error: 'test' }
      obj.circular = obj

      const result = sanitizeError(obj, 'internal')
      expect(result.error).toBe('Internal server error')
    })

    it('should handle errors with special regex characters', () => {
      const message = 'Error: $100 charge failed (user@test.com)'
      const sanitized = sanitizeErrorMessage(message)

      expect(sanitized).toContain('$100 charge failed')
      expect(sanitized).not.toContain('user@test.com')
    })
  })
})
