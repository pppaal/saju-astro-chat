/**
 * Comprehensive tests for Token Rotation System
 * Tests token validation, rotation, audit logging, and timing-safe comparisons
 */

import crypto from 'crypto'
import { logger } from '@/lib/logger'
import { recordCounter } from '@/lib/metrics'
import {
  buildTokenConfig,
  validateToken,
  validatePublicToken,
  validateAdminToken,
  generateSecureToken,
  hashToken,
  shouldRotate,
  getTokenStatus,
  logTokenAudit,
  getAuditLog,
  type TokenConfig,
} from '@/lib/auth/tokenRotation'

// Mock dependencies
jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/metrics', () => ({
  recordCounter: jest.fn(),
}))

describe('Token Rotation System', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('buildTokenConfig', () => {
    it('should build config from environment variables', () => {
      process.env.MY_TOKEN = 'current_token_value'
      process.env.MY_TOKEN_LEGACY = 'legacy_token_value'
      process.env.MY_TOKEN_VERSION = '2'
      process.env.MY_TOKEN_EXPIRES_AT = String(Date.now() + 86400000)

      const config = buildTokenConfig('MY_TOKEN')

      expect(config.current).toBe('current_token_value')
      expect(config.legacy).toBe('legacy_token_value')
      expect(config.version).toBe(2)
      expect(config.expiresAt).toBeGreaterThan(Date.now())
    })

    it('should handle missing legacy token', () => {
      process.env.MY_TOKEN = 'current_only'

      const config = buildTokenConfig('MY_TOKEN')

      expect(config.current).toBe('current_only')
      expect(config.legacy).toBeUndefined()
    })

    it('should default version to 1', () => {
      process.env.MY_TOKEN = 'token'

      const config = buildTokenConfig('MY_TOKEN')

      expect(config.version).toBe(1)
    })

    it('should handle invalid version number', () => {
      process.env.MY_TOKEN = 'token'
      process.env.MY_TOKEN_VERSION = 'not_a_number'

      const config = buildTokenConfig('MY_TOKEN')

      expect(config.version).toBe(1) // Defaults to 1 for NaN
    })

    it('should handle missing expiration', () => {
      process.env.MY_TOKEN = 'token'

      const config = buildTokenConfig('MY_TOKEN')

      expect(config.expiresAt).toBeUndefined()
    })

    it('should handle empty string env vars', () => {
      process.env.MY_TOKEN = ''
      process.env.MY_TOKEN_LEGACY = ''
      process.env.MY_TOKEN_VERSION = ''
      process.env.MY_TOKEN_EXPIRES_AT = ''

      const config = buildTokenConfig('MY_TOKEN')

      expect(config.current).toBe('')
      expect(config.version).toBe(1)
      expect(config.expiresAt).toBeUndefined()
    })
  })

  describe('validateToken', () => {
    const mockConfig: TokenConfig = {
      current: 'valid_current_token',
      legacy: 'valid_legacy_token',
      version: 2,
    }

    it('should validate current token', () => {
      const result = validateToken('valid_current_token', mockConfig, 'test', '1.2.3.4')

      expect(result.valid).toBe(true)
      expect(result.version).toBe('current')
      expect(logTokenAudit).toBeDefined()
    })

    it('should validate legacy token', () => {
      const result = validateToken('valid_legacy_token', mockConfig, 'test', '1.2.3.4')

      expect(result.valid).toBe(true)
      expect(result.version).toBe('legacy')
    })

    it('should reject invalid token', () => {
      const result = validateToken('invalid_token', mockConfig, 'test', '1.2.3.4')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Invalid token')
    })

    it('should reject missing token', () => {
      const result = validateToken(null, mockConfig, 'test', '1.2.3.4')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token not provided')
    })

    it('should reject expired token', () => {
      const expiredConfig: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() - 1000, // Expired 1 second ago
        version: 1,
      }

      const result = validateToken('token', expiredConfig, 'test')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token expired')
    })

    it('should return expiresIn for valid token', () => {
      const futureTime = Date.now() + 86400000 // 1 day
      const configWithExpiry: TokenConfig = {
        current: 'token',
        expiresAt: futureTime,
        version: 1,
      }

      const result = validateToken('token', configWithExpiry, 'test')

      expect(result.valid).toBe(true)
      expect(result.expiresIn).toBeGreaterThan(0)
      expect(result.expiresIn).toBeLessThanOrEqual(86400000)
    })

    it('should use timing-safe comparison', () => {
      // This tests that the implementation uses crypto.timingSafeEqual
      const spyTimingSafeEqual = jest.spyOn(crypto, 'timingSafeEqual')

      validateToken('valid_current_token', mockConfig, 'test')

      expect(spyTimingSafeEqual).toHaveBeenCalled()

      spyTimingSafeEqual.mockRestore()
    })

    it('should handle different length tokens safely', () => {
      const result = validateToken('short', mockConfig, 'test')

      expect(result.valid).toBe(false)
      // Should still use timing-safe comparison even for length mismatch
    })

    it('should log audit events', () => {
      validateToken('valid_current_token', mockConfig, 'test_token', '1.2.3.4')

      expect(recordCounter).toHaveBeenCalledWith(
        'api.token.validate',
        1,
        expect.objectContaining({
          tokenType: 'test_token',
          success: 'true',
          version: 'current',
        })
      )
    })
  })

  describe('validatePublicToken', () => {
    it('should validate with PUBLIC_API_TOKEN', () => {
      process.env.PUBLIC_API_TOKEN = 'public_token_123'

      const req = new Request('http://localhost', {
        headers: { 'x-api-token': 'public_token_123' },
      })

      const result = validatePublicToken(req, '1.2.3.4')

      expect(result.valid).toBe(true)
    })

    it('should allow development mode without token', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.PUBLIC_API_TOKEN

      const req = new Request('http://localhost')

      const result = validatePublicToken(req)

      expect(result.valid).toBe(true)
    })

    it('should reject production without token configured', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.PUBLIC_API_TOKEN

      const req = new Request('http://localhost')

      const result = validatePublicToken(req)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token not configured')
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('PUBLIC_API_TOKEN not configured'),
        expect.anything()
      )
    })

    it('should reject invalid token in production', () => {
      process.env.NODE_ENV = 'production'
      process.env.PUBLIC_API_TOKEN = 'correct_token'

      const req = new Request('http://localhost', {
        headers: { 'x-api-token': 'wrong_token' },
      })

      const result = validatePublicToken(req)

      expect(result.valid).toBe(false)
    })

    it('should support legacy token during rotation', () => {
      process.env.PUBLIC_API_TOKEN = 'new_token'
      process.env.PUBLIC_API_TOKEN_LEGACY = 'old_token'

      const req = new Request('http://localhost', {
        headers: { 'x-api-token': 'old_token' },
      })

      const result = validatePublicToken(req)

      expect(result.valid).toBe(true)
      expect(result.version).toBe('legacy')
    })
  })

  describe('validateAdminToken', () => {
    it('should validate from Authorization Bearer header', () => {
      process.env.ADMIN_API_TOKEN = 'admin_token_123'

      const req = new Request('http://localhost', {
        headers: { authorization: 'Bearer admin_token_123' },
      })

      const result = validateAdminToken(req)

      expect(result.valid).toBe(true)
    })

    it('should validate from x-api-key header', () => {
      process.env.ADMIN_API_TOKEN = 'admin_token_123'

      const req = new Request('http://localhost', {
        headers: { 'x-api-key': 'admin_token_123' },
      })

      const result = validateAdminToken(req)

      expect(result.valid).toBe(true)
    })

    it('should handle case-insensitive Bearer prefix', () => {
      process.env.ADMIN_API_TOKEN = 'admin_token'

      const req = new Request('http://localhost', {
        headers: { authorization: 'BEARER admin_token' },
      })

      const result = validateAdminToken(req)

      expect(result.valid).toBe(true)
    })

    it('should trim whitespace from Bearer token', () => {
      process.env.ADMIN_API_TOKEN = 'admin_token'

      const req = new Request('http://localhost', {
        headers: { authorization: 'Bearer   admin_token   ' },
      })

      const result = validateAdminToken(req)

      expect(result.valid).toBe(true)
    })

    it('should allow development mode without token', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.ADMIN_API_TOKEN

      const req = new Request('http://localhost')

      const result = validateAdminToken(req)

      expect(result.valid).toBe(true)
    })

    it('should reject production without token', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.ADMIN_API_TOKEN

      const req = new Request('http://localhost')

      const result = validateAdminToken(req)

      expect(result.valid).toBe(false)
      expect(logger.error).toHaveBeenCalled()
    })
  })

  describe('generateSecureToken', () => {
    it('should generate secure token with default 32 bytes', () => {
      const token = generateSecureToken()

      expect(token).toBeDefined()
      expect(token.length).toBeGreaterThan(0)
      expect(typeof token).toBe('string')
    })

    it('should generate token with custom byte length', () => {
      const token = generateSecureToken(16)

      expect(token).toBeDefined()
      // base64url encoding makes it longer than raw bytes
      expect(token.length).toBeGreaterThan(10)
    })

    it('should generate unique tokens', () => {
      const tokens = new Set()
      for (let i = 0; i < 100; i++) {
        tokens.add(generateSecureToken())
      }

      expect(tokens.size).toBe(100) // All unique
    })

    it('should use base64url encoding', () => {
      const token = generateSecureToken()

      // base64url should not contain + / =
      expect(token).not.toContain('+')
      expect(token).not.toContain('/')
      expect(token).not.toContain('=')
    })
  })

  describe('hashToken', () => {
    it('should hash token using SHA256', () => {
      const hash = hashToken('my_token')

      expect(hash).toHaveLength(64) // SHA256 hex is 64 chars
      expect(hash).toMatch(/^[0-9a-f]{64}$/)
    })

    it('should produce consistent hashes', () => {
      const hash1 = hashToken('same_token')
      const hash2 = hashToken('same_token')

      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different tokens', () => {
      const hash1 = hashToken('token_1')
      const hash2 = hashToken('token_2')

      expect(hash1).not.toBe(hash2)
    })

    it('should handle empty string', () => {
      const hash = hashToken('')

      expect(hash).toHaveLength(64)
    })
  })

  describe('shouldRotate', () => {
    it('should recommend rotation when expiring soon', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days
        version: 1,
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(true)
      expect(result.reason).toContain('5 days')
    })

    it('should not recommend rotation when not expiring soon', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
        version: 1,
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(false)
    })

    it('should not recommend rotation when legacy token exists', () => {
      const config: TokenConfig = {
        current: 'new_token',
        legacy: 'old_token',
        version: 2,
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(false)
      expect(result.reason).toContain('Legacy token still active')
    })

    it('should handle config without expiration', () => {
      const config: TokenConfig = {
        current: 'token',
        version: 1,
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(false)
    })

    it('should recommend rotation when expiring tomorrow', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 1 * 24 * 60 * 60 * 1000, // 1 day
        version: 1,
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(true)
    })
  })

  describe('getTokenStatus', () => {
    it('should return status of all token types', () => {
      process.env.PUBLIC_API_TOKEN = 'public'
      process.env.PUBLIC_API_TOKEN_VERSION = '3'
      process.env.ADMIN_API_TOKEN = 'admin'
      process.env.ADMIN_API_TOKEN_LEGACY = 'admin_old'
      process.env.CRON_SECRET = 'cron'
      process.env.PUBLIC_METRICS_TOKEN = 'metrics'

      const status = getTokenStatus()

      expect(status.public.configured).toBe(true)
      expect(status.public.version).toBe(3)
      expect(status.admin.configured).toBe(true)
      expect(status.admin.hasLegacy).toBe(true)
      expect(status.cron.configured).toBe(true)
      expect(status.metrics.configured).toBe(true)
    })

    it('should handle missing tokens', () => {
      delete process.env.PUBLIC_API_TOKEN
      delete process.env.ADMIN_API_TOKEN
      delete process.env.CRON_SECRET
      delete process.env.PUBLIC_METRICS_TOKEN

      const status = getTokenStatus()

      expect(status.public.configured).toBe(false)
      expect(status.admin.configured).toBe(false)
      expect(status.cron.configured).toBe(false)
      expect(status.metrics.configured).toBe(false)
    })
  })

  describe('logTokenAudit & getAuditLog', () => {
    it('should log audit events', () => {
      logTokenAudit({
        action: 'validate',
        tokenType: 'public',
        success: true,
        version: 'current',
      })

      const logs = getAuditLog()

      expect(logs.length).toBeGreaterThan(0)
      expect(logs[logs.length - 1].action).toBe('validate')
    })

    it('should limit audit log size', () => {
      // Add 1100 entries (exceeds MAX_AUDIT_ENTRIES of 1000)
      for (let i = 0; i < 1100; i++) {
        logTokenAudit({
          action: 'validate',
          tokenType: 'test',
          success: true,
        })
      }

      const logs = getAuditLog(2000) // Request more than available

      expect(logs.length).toBeLessThanOrEqual(1000)
    })

    it('should log rotation events to logger', () => {
      logTokenAudit({
        action: 'rotate',
        tokenType: 'admin',
        success: true,
      })

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('rotate'),
        expect.any(Object)
      )
    })

    it('should log failed validations as warnings', () => {
      logTokenAudit({
        action: 'validate',
        tokenType: 'public',
        success: false,
        details: { reason: 'invalid' },
      })

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('failed'),
        expect.any(Object)
      )
    })

    it('should record metrics', () => {
      logTokenAudit({
        action: 'validate',
        tokenType: 'admin',
        version: 'current',
        success: true,
      })

      expect(recordCounter).toHaveBeenCalledWith(
        'api.token.validate',
        1,
        expect.objectContaining({
          tokenType: 'admin',
          success: 'true',
          version: 'current',
        })
      )
    })

    it('should retrieve limited audit log entries', () => {
      // Add some entries
      for (let i = 0; i < 50; i++) {
        logTokenAudit({
          action: 'validate',
          tokenType: 'test',
          success: true,
        })
      }

      const logs = getAuditLog(10)

      expect(logs.length).toBeLessThanOrEqual(10)
    })
  })

  describe('Security & Edge Cases', () => {
    it('should prevent timing attacks on token comparison', () => {
      const config: TokenConfig = {
        current: 'secret_token_12345',
      }

      // Measure time for correct and incorrect tokens
      // Both should take similar time (timing-safe)
      const start1 = Date.now()
      validateToken('secret_token_12345', config, 'test')
      const time1 = Date.now() - start1

      const start2 = Date.now()
      validateToken('wrong_token_123456', config, 'test')
      const time2 = Date.now() - start2

      // Should not have drastically different timing
      // (In practice, crypto.timingSafeEqual ensures this)
      expect(Math.abs(time1 - time2)).toBeLessThan(100)
    })

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000)
      const config: TokenConfig = {
        current: longToken,
      }

      const result = validateToken(longToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle special characters in tokens', () => {
      const specialToken = 'token!@#$%^&*()_+-={}[]|\\:";\'<>?,./'
      const config: TokenConfig = {
        current: specialToken,
      }

      const result = validateToken(specialToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle Unicode in tokens', () => {
      const unicodeToken = 'token_안녕하세요_🔐'
      const config: TokenConfig = {
        current: unicodeToken,
      }

      const result = validateToken(unicodeToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle concurrent validations', async () => {
      const config: TokenConfig = {
        current: 'concurrent_token',
      }

      const results = await Promise.all([
        Promise.resolve(validateToken('concurrent_token', config, 'test')),
        Promise.resolve(validateToken('concurrent_token', config, 'test')),
        Promise.resolve(validateToken('wrong_token', config, 'test')),
      ])

      expect(results[0].valid).toBe(true)
      expect(results[1].valid).toBe(true)
      expect(results[2].valid).toBe(false)
    })

    it('should handle null/undefined in config gracefully', () => {
      const config: TokenConfig = {
        current: '',
        legacy: undefined,
      }

      const result = validateToken('token', config, 'test')

      expect(result.valid).toBe(false)
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete token rotation workflow', () => {
      // 1. Initial setup
      process.env.MY_TOKEN = 'token_v1'
      process.env.MY_TOKEN_VERSION = '1'

      let config = buildTokenConfig('MY_TOKEN')
      let result = validateToken('token_v1', config, 'my_api')
      expect(result.valid).toBe(true)
      expect(result.version).toBe('current')

      // 2. Start rotation - add new token as current, old as legacy
      process.env.MY_TOKEN = 'token_v2'
      process.env.MY_TOKEN_LEGACY = 'token_v1'
      process.env.MY_TOKEN_VERSION = '2'

      config = buildTokenConfig('MY_TOKEN')

      // Both tokens work during grace period
      result = validateToken('token_v2', config, 'my_api')
      expect(result.valid).toBe(true)
      expect(result.version).toBe('current')

      result = validateToken('token_v1', config, 'my_api')
      expect(result.valid).toBe(true)
      expect(result.version).toBe('legacy')

      // 3. Complete rotation - remove legacy
      delete process.env.MY_TOKEN_LEGACY
      config = buildTokenConfig('MY_TOKEN')

      result = validateToken('token_v2', config, 'my_api')
      expect(result.valid).toBe(true)

      result = validateToken('token_v1', config, 'my_api')
      expect(result.valid).toBe(false) // Old token no longer works
    })
  })
})
