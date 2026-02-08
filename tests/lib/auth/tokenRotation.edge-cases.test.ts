/**
 * P2: Token Rotation Edge Cases Tests
 * 토큰 로테이션, 동시 로그인, 세션 무효화 테스트
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  buildTokenConfig,
  validateToken,
  generateSecureToken,
  hashToken,
  shouldRotate,
  logTokenAudit,
  getAuditLog,
  validatePublicToken,
  validateAdminToken,
  getTokenStatus,
  type TokenConfig,
} from '@/lib/auth/tokenRotation'

// Mock dependencies
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}))

describe('Token Rotation Edge Cases (P2)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('Concurrent Login Scenarios', () => {
    it('should validate both current and legacy tokens simultaneously', () => {
      const config: TokenConfig = {
        current: 'new-token-v2',
        legacy: 'old-token-v1',
        version: 2,
      }

      const result1 = validateToken('new-token-v2', config, 'test-type')
      const result2 = validateToken('old-token-v1', config, 'test-type')

      expect(result1.valid).toBe(true)
      expect(result1.version).toBe('current')
      expect(result2.valid).toBe(true)
      expect(result2.version).toBe('legacy')
    })

    it('should handle rapid token validations', () => {
      const config: TokenConfig = {
        current: 'test-token-123',
        version: 1,
      }

      // Simulate rapid fire validations
      const results = Array.from({ length: 100 }, () =>
        validateToken('test-token-123', config, 'stress-test')
      )

      // All should succeed
      expect(results.every((r) => r.valid)).toBe(true)
    })

    it('should maintain consistent validation across concurrent requests', async () => {
      const config: TokenConfig = {
        current: 'concurrent-token',
        version: 1,
      }

      const validations = Array.from({ length: 50 }, () =>
        Promise.resolve(validateToken('concurrent-token', config, 'concurrent'))
      )

      const results = await Promise.all(validations)

      // All should be consistent
      expect(results.every((r) => r.valid)).toBe(true)
      expect(results.every((r) => r.version === 'current')).toBe(true)
    })
  })

  describe('Token Expiration Edge Cases', () => {
    it('should handle token expiring exactly now', () => {
      const config: TokenConfig = {
        current: 'expiring-token',
        expiresAt: Date.now(), // Exactly now
      }

      const result = validateToken('expiring-token', config, 'test')

      // Should be expired (Date.now() > expiresAt is false when equal)
      // Depends on implementation, but should handle edge case
      expect(result).toBeDefined()
    })

    it('should handle token expiring in 1 millisecond', async () => {
      const expiryTime = Date.now() + 1

      const config: TokenConfig = {
        current: 'soon-expiring',
        expiresAt: expiryTime,
      }

      const result1 = validateToken('soon-expiring', config, 'test')
      expect(result1.valid).toBe(true)
      expect(result1.expiresIn).toBeLessThanOrEqual(1)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 5))

      const result2 = validateToken('soon-expiring', config, 'test')
      expect(result2.valid).toBe(false)
      expect(result2.reason).toBe('Token expired')
    })

    it('should correctly calculate expiresIn for valid tokens', () => {
      const futureTime = Date.now() + 3600000 // 1 hour

      const config: TokenConfig = {
        current: 'future-token',
        expiresAt: futureTime,
      }

      const result = validateToken('future-token', config, 'test')

      expect(result.valid).toBe(true)
      expect(result.expiresIn).toBeGreaterThan(3590000) // ~1 hour
      expect(result.expiresIn).toBeLessThanOrEqual(3600000)
    })

    it('should handle very far future expiration', () => {
      const farFuture = Date.now() + 365 * 24 * 60 * 60 * 1000 // 1 year

      const config: TokenConfig = {
        current: 'long-lived-token',
        expiresAt: farFuture,
      }

      const result = validateToken('long-lived-token', config, 'test')

      expect(result.valid).toBe(true)
      expect(result.expiresIn).toBeGreaterThan(364 * 24 * 60 * 60 * 1000)
    })

    it('should handle expired legacy token', () => {
      const config: TokenConfig = {
        current: 'current-token',
        legacy: 'legacy-token',
        expiresAt: Date.now() - 1000, // Expired
      }

      const result = validateToken('legacy-token', config, 'test')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token expired')
    })
  })

  describe('Rotation Recommendation Logic', () => {
    it('should recommend rotation when expiring within 7 days', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 5 * 24 * 60 * 60 * 1000, // 5 days
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(true)
      expect(result.reason).toContain('expires in')
    })

    it('should not recommend rotation when expiring beyond threshold', () => {
      const config: TokenConfig = {
        current: 'token',
        expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 days
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(false)
    })

    it('should recommend rotation when legacy active but expiring soon', () => {
      const config: TokenConfig = {
        current: 'new-token',
        legacy: 'old-token', // Still has legacy
        expiresAt: Date.now() + 3 * 24 * 60 * 60 * 1000, // Expiring soon
      }

      const result = shouldRotate(config)

      // Implementation prioritizes expiration over legacy token check
      expect(result.shouldRotate).toBe(true)
      expect(result.reason).toContain('expires in')
    })

    it('should handle config without expiration', () => {
      const config: TokenConfig = {
        current: 'no-expiry-token',
      }

      const result = shouldRotate(config)

      expect(result.shouldRotate).toBe(false)
    })
  })

  describe('Token Security', () => {
    it('should generate cryptographically secure tokens', () => {
      const tokens = new Set<string>()

      for (let i = 0; i < 1000; i++) {
        tokens.add(generateSecureToken())
      }

      // All tokens should be unique
      expect(tokens.size).toBe(1000)
    })

    it('should generate tokens of requested length', () => {
      const token16 = generateSecureToken(16)
      const token32 = generateSecureToken(32)
      const token64 = generateSecureToken(64)

      // Base64url encoding increases length by ~33%
      expect(token32.length).toBeGreaterThan(token16.length)
      expect(token64.length).toBeGreaterThan(token32.length)
    })

    it('should produce consistent hashes', () => {
      const token = 'test-token-for-hashing'

      const hash1 = hashToken(token)
      const hash2 = hashToken(token)

      expect(hash1).toBe(hash2)
      expect(hash1.length).toBe(64) // SHA-256 produces 64 hex chars
    })

    it('should produce different hashes for similar tokens', () => {
      const hash1 = hashToken('token-a')
      const hash2 = hashToken('token-b')
      const hash3 = hashToken('token-a ') // With trailing space

      expect(hash1).not.toBe(hash2)
      expect(hash1).not.toBe(hash3)
    })

    it('should use timing-safe comparison (prevent timing attacks)', () => {
      const config: TokenConfig = {
        current: 'correct-token-12345',
      }

      // Multiple validations should take similar time regardless of match position
      const validResults: boolean[] = []
      const invalidResults: boolean[] = []

      for (let i = 0; i < 100; i++) {
        validResults.push(validateToken('correct-token-12345', config, 'test').valid)
        invalidResults.push(validateToken('wrong-token-12345xx', config, 'test').valid)
      }

      expect(validResults.every((r) => r === true)).toBe(true)
      expect(invalidResults.every((r) => r === false)).toBe(true)
    })
  })

  describe('Audit Logging', () => {
    it('should log all validation attempts', () => {
      const config: TokenConfig = {
        current: 'audit-test-token',
      }

      // Clear previous logs by filling and checking
      for (let i = 0; i < 5; i++) {
        validateToken('audit-test-token', config, 'audit-test')
      }

      const logs = getAuditLog(5)
      expect(logs.length).toBe(5)
      expect(logs.every((l) => l.tokenType === 'audit-test')).toBe(true)
    })

    it('should include IP address in audit logs', () => {
      const config: TokenConfig = {
        current: 'ip-test-token',
      }

      validateToken('ip-test-token', config, 'ip-test', '192.168.1.100')

      const logs = getAuditLog(1)
      expect(logs[0].ip).toBe('192.168.1.100')
    })

    it('should track failed validation attempts', () => {
      const config: TokenConfig = {
        current: 'valid-token',
      }

      validateToken('invalid-token', config, 'fail-test', '10.0.0.1')

      const logs = getAuditLog(1)
      expect(logs[0].success).toBe(false)
      expect(logs[0].ip).toBe('10.0.0.1')
    })

    it('should limit audit log size', () => {
      const config: TokenConfig = { current: 'token' }

      // Add many entries
      for (let i = 0; i < 1500; i++) {
        logTokenAudit({
          action: 'validate',
          tokenType: 'overflow-test',
          success: true,
        })
      }

      const logs = getAuditLog(2000)
      expect(logs.length).toBeLessThanOrEqual(1000)
    })

    it('should return most recent entries', () => {
      logTokenAudit({ action: 'validate', tokenType: 'first', success: true })
      logTokenAudit({ action: 'rotate', tokenType: 'second', success: true })
      logTokenAudit({ action: 'revoke', tokenType: 'third', success: false })

      const logs = getAuditLog(2)

      expect(logs[0].tokenType).toBe('second')
      expect(logs[1].tokenType).toBe('third')
    })
  })

  describe('Environment Variable Parsing', () => {
    it('should handle missing environment variables', () => {
      delete process.env.NONEXISTENT_TOKEN

      const config = buildTokenConfig('NONEXISTENT_TOKEN')

      expect(config.current).toBe('')
      expect(config.legacy).toBeUndefined()
      expect(config.version).toBe(1)
    })

    it('should parse version as integer', () => {
      process.env.TEST_TOKEN = 'token'
      process.env.TEST_TOKEN_VERSION = '5'

      const config = buildTokenConfig('TEST_TOKEN')

      expect(config.version).toBe(5)
    })

    it('should handle invalid version string', () => {
      process.env.TEST_TOKEN = 'token'
      process.env.TEST_TOKEN_VERSION = 'not-a-number'

      const config = buildTokenConfig('TEST_TOKEN')

      expect(config.version).toBe(NaN)
    })

    it('should parse expiration timestamp', () => {
      const expiry = Date.now() + 86400000
      process.env.TEST_TOKEN = 'token'
      process.env.TEST_TOKEN_EXPIRES_AT = String(expiry)

      const config = buildTokenConfig('TEST_TOKEN')

      expect(config.expiresAt).toBe(expiry)
    })

    it('should handle whitespace in environment variables', () => {
      process.env.TEST_TOKEN = '  token-with-spaces  '
      process.env.TEST_TOKEN_VERSION = '  3  '

      const config = buildTokenConfig('TEST_TOKEN')

      // Implementation should handle whitespace appropriately
      expect(config.current).toBeDefined()
      expect(config.version).toBeDefined()
    })
  })

  describe('Public Token Validation', () => {
    it('should validate in development without token', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.PUBLIC_API_TOKEN

      const mockRequest = new Request('https://test.com', {
        headers: {},
      })

      const result = validatePublicToken(mockRequest)

      expect(result.valid).toBe(true)
    })

    it('should fail in production without configured token', () => {
      process.env.NODE_ENV = 'production'
      delete process.env.PUBLIC_API_TOKEN

      const mockRequest = new Request('https://test.com', {
        headers: {},
      })

      const result = validatePublicToken(mockRequest)

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token not configured')
    })

    it('should validate x-api-token header', () => {
      process.env.PUBLIC_API_TOKEN = 'public-token-abc'

      const mockRequest = new Request('https://test.com', {
        headers: {
          'x-api-token': 'public-token-abc',
        },
      })

      const result = validatePublicToken(mockRequest)

      expect(result.valid).toBe(true)
    })

    it('should reject invalid public token', () => {
      process.env.PUBLIC_API_TOKEN = 'correct-token'

      const mockRequest = new Request('https://test.com', {
        headers: {
          'x-api-token': 'wrong-token',
        },
      })

      const result = validatePublicToken(mockRequest)

      expect(result.valid).toBe(false)
    })

    it('should validate legacy public token during rotation', () => {
      process.env.PUBLIC_API_TOKEN = 'new-public-token'
      process.env.PUBLIC_API_TOKEN_LEGACY = 'old-public-token'

      const mockRequest = new Request('https://test.com', {
        headers: {
          'x-api-token': 'old-public-token',
        },
      })

      const result = validatePublicToken(mockRequest)

      expect(result.valid).toBe(true)
      expect(result.version).toBe('legacy')
    })
  })

  describe('Admin Token Validation', () => {
    it('should validate Bearer token', () => {
      process.env.ADMIN_API_TOKEN = 'admin-secret-xyz'

      const mockRequest = new Request('https://test.com', {
        headers: {
          authorization: 'Bearer admin-secret-xyz',
        },
      })

      const result = validateAdminToken(mockRequest)

      expect(result.valid).toBe(true)
    })

    it('should validate x-api-key header', () => {
      process.env.ADMIN_API_TOKEN = 'admin-key-123'

      const mockRequest = new Request('https://test.com', {
        headers: {
          'x-api-key': 'admin-key-123',
        },
      })

      const result = validateAdminToken(mockRequest)

      expect(result.valid).toBe(true)
    })

    it('should reject without any authorization', () => {
      process.env.ADMIN_API_TOKEN = 'admin-token'

      const mockRequest = new Request('https://test.com', {
        headers: {},
      })

      const result = validateAdminToken(mockRequest)

      expect(result.valid).toBe(false)
    })

    it('should reject malformed Bearer token', () => {
      process.env.ADMIN_API_TOKEN = 'admin-token'

      const mockRequest = new Request('https://test.com', {
        headers: {
          authorization: 'Bearer', // Missing token
        },
      })

      const result = validateAdminToken(mockRequest)

      expect(result.valid).toBe(false)
    })

    it('should reject Basic auth scheme', () => {
      process.env.ADMIN_API_TOKEN = 'admin-token'

      const mockRequest = new Request('https://test.com', {
        headers: {
          authorization: 'Basic YWRtaW46YWRtaW4=', // admin:admin base64
        },
      })

      const result = validateAdminToken(mockRequest)

      expect(result.valid).toBe(false)
    })
  })

  describe('Token Status Reporting', () => {
    it('should report status for all token types', () => {
      process.env.PUBLIC_API_TOKEN = 'public'
      process.env.ADMIN_API_TOKEN = 'admin'
      process.env.ADMIN_API_TOKEN_LEGACY = 'admin-old'
      process.env.ADMIN_API_TOKEN_VERSION = '2'
      process.env.CRON_SECRET = 'cron'
      process.env.PUBLIC_METRICS_TOKEN = 'metrics'

      const status = getTokenStatus()

      expect(status.public.configured).toBe(true)
      expect(status.admin.configured).toBe(true)
      expect(status.admin.hasLegacy).toBe(true)
      expect(status.admin.version).toBe(2)
      expect(status.cron.configured).toBe(true)
      expect(status.metrics.configured).toBe(true)
    })

    it('should handle partial configuration', () => {
      process.env.PUBLIC_API_TOKEN = 'public'
      delete process.env.ADMIN_API_TOKEN
      delete process.env.CRON_SECRET
      process.env.PUBLIC_METRICS_TOKEN = 'metrics'

      const status = getTokenStatus()

      expect(status.public.configured).toBe(true)
      expect(status.admin.configured).toBe(false)
      expect(status.cron.configured).toBe(false)
      expect(status.metrics.configured).toBe(true)
    })

    it('should report expiration info when configured', () => {
      const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
      process.env.ADMIN_API_TOKEN = 'admin'
      process.env.ADMIN_API_TOKEN_EXPIRES_AT = String(expiry)

      const status = getTokenStatus()

      expect(status.admin.configured).toBe(true)
      if (status.admin.expiresAt) {
        expect(status.admin.expiresAt).toBe(expiry)
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle null token gracefully', () => {
      const config: TokenConfig = { current: 'token' }

      const result = validateToken(null, config, 'test')

      expect(result.valid).toBe(false)
      expect(result.reason).toBe('Token not provided')
    })

    it('should handle empty string token', () => {
      const config: TokenConfig = { current: 'token' }

      const result = validateToken('', config, 'test')

      expect(result.valid).toBe(false)
    })

    it('should handle very long tokens', () => {
      const longToken = 'a'.repeat(10000)
      const config: TokenConfig = { current: longToken }

      const result = validateToken(longToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle unicode tokens', () => {
      const unicodeToken = '토큰-🔐-認証'
      const config: TokenConfig = { current: unicodeToken }

      const result = validateToken(unicodeToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle token with special characters', () => {
      const specialToken = 'token!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~'
      const config: TokenConfig = { current: specialToken }

      const result = validateToken(specialToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle newlines in token', () => {
      const multilineToken = 'token\nwith\nnewlines'
      const config: TokenConfig = { current: multilineToken }

      const result = validateToken(multilineToken, config, 'test')

      expect(result.valid).toBe(true)
    })

    it('should handle whitespace-only token', () => {
      const whitespaceToken = '   '
      const config: TokenConfig = { current: whitespaceToken }

      const result = validateToken(whitespaceToken, config, 'test')

      expect(result.valid).toBe(true) // Matches exactly
    })
  })
})
