import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { requirePublicToken } from '@/lib/auth/publicToken'
import { recordCounter } from '@/lib/metrics'

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

describe('requirePublicToken', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Production Environment', () => {
    it('should fail in production when PUBLIC_API_TOKEN not set', () => {
      delete process.env.PUBLIC_API_TOKEN
      delete process.env.NEXT_PUBLIC_API_TOKEN
      process.env.NODE_ENV = 'production'
      const req = new Request('http://localhost/api/test')
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('not configured')
    })

    it('should record metric when token not configured in production', () => {
      delete process.env.PUBLIC_API_TOKEN
      delete process.env.NEXT_PUBLIC_API_TOKEN
      process.env.NODE_ENV = 'production'
      const req = new Request('http://localhost/api/test')
      requirePublicToken(req)
      expect(recordCounter).toHaveBeenCalledWith('api.auth.misconfig', 1, { env: 'prod' })
    })

    it('should pass in production with valid token', () => {
      process.env.PUBLIC_API_TOKEN = 'prod-secret'
      process.env.NODE_ENV = 'production'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'prod-secret' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
    })
  })

  describe('Development Environment', () => {
    it('should pass in dev mode when PUBLIC_API_TOKEN not set', () => {
      delete process.env.PUBLIC_API_TOKEN
      delete process.env.NEXT_PUBLIC_API_TOKEN
      process.env.NODE_ENV = 'development'
      const req = new Request('http://localhost/api/test')
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
    })

    it('should still validate token in dev mode when token is set', () => {
      process.env.PUBLIC_API_TOKEN = 'dev-secret'
      process.env.NODE_ENV = 'development'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'wrong-token' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
    })
  })

  describe('Token Validation', () => {
    it('should pass when valid token provided', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'secret123' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
      expect(result.reason).toBeUndefined()
    })

    it('should fail when token does not match', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'wrong' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
      expect(result.reason).toContain('Invalid or missing')
    })

    it('should fail when token header is missing', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test')
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
    })

    it('should record metric when token is missing', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test')
      requirePublicToken(req)
      expect(recordCounter).toHaveBeenCalledWith('api.auth.invalid_token', 1, { reason: 'missing' })
    })

    it('should record metric when token mismatches', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'wrong' },
      })
      requirePublicToken(req)
      expect(recordCounter).toHaveBeenCalledWith('api.auth.invalid_token', 1, {
        reason: 'mismatch',
      })
    })
  })

  describe('Alternative Token Environment Variables', () => {
    it('should support NEXT_PUBLIC_API_TOKEN as fallback', () => {
      delete process.env.PUBLIC_API_TOKEN
      process.env.NEXT_PUBLIC_API_TOKEN = 'next-public-secret'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'next-public-secret' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
    })

    it('should prefer PUBLIC_API_TOKEN over NEXT_PUBLIC_API_TOKEN', () => {
      process.env.PUBLIC_API_TOKEN = 'primary-secret'
      process.env.NEXT_PUBLIC_API_TOKEN = 'fallback-secret'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'primary-secret' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty token header', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': '' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
    })

    it('should handle whitespace-only token', () => {
      process.env.PUBLIC_API_TOKEN = 'secret123'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': '   ' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
    })

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(1000)
      process.env.PUBLIC_API_TOKEN = longToken
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': longToken },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
    })

    it('should handle special characters in token', () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:,.<>?'
      process.env.PUBLIC_API_TOKEN = specialToken
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': specialToken },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(true)
    })

    it('should be case-sensitive for token comparison', () => {
      process.env.PUBLIC_API_TOKEN = 'SecretToken'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'secrettoken' },
      })
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
    })
  })

  describe('Return Type Validation', () => {
    it('should return valid: true without reason on success', () => {
      process.env.PUBLIC_API_TOKEN = 'test'
      const req = new Request('http://localhost/api/test', {
        headers: { 'x-api-token': 'test' },
      })
      const result = requirePublicToken(req)
      expect(result).toEqual({ valid: true })
      expect('reason' in result).toBe(false)
    })

    it('should return valid: false with reason on failure', () => {
      process.env.PUBLIC_API_TOKEN = 'test'
      const req = new Request('http://localhost/api/test')
      const result = requirePublicToken(req)
      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(result.reason).toBeDefined()
        expect(typeof result.reason).toBe('string')
      }
    })
  })
})
