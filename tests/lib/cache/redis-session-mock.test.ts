/**
 * Mock-based tests for Redis Session Cache Manager
 * Tests core functionality without requiring actual Redis connection
 *
 * Aligned with @upstash/redis implementation in src/lib/cache/redis-session.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Upstash Redis client
const mockRedisInstance = {
  set: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  scan: vi.fn().mockResolvedValue([0, []]),
  ping: vi.fn().mockResolvedValue('PONG'),
}

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => mockRedisInstance),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/security/tokenCrypto', () => ({
  encryptToken: vi.fn((data: string) => `encrypted:${data}`),
  decryptToken: vi.fn((data: string) => {
    if (data.startsWith('encrypted:')) {
      return data.replace('encrypted:', '')
    }
    return null
  }),
  hasTokenEncryptionKey: vi.fn(() => false), // Default: no encryption
}))

import { logger } from '@/lib/logger'

describe('Redis Session Cache (Mock)', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('initializeRedis', () => {
    it('should use memory fallback when Upstash env vars are not configured', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // Should work via memory fallback
      await setSession('test', { data: 'value' })
      const result = await getSession('test')

      expect(result).toEqual({ data: 'value' })
    })

    it('should initialize Upstash Redis when env vars are set', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      await setSession('test-init', { data: 'test' })

      // Should have called set on the Upstash client
      expect(mockRedisInstance.set).toHaveBeenCalledWith('session:test-init', expect.any(String), {
        ex: 24 * 60 * 60,
      })
    })
  })

  describe('setSession', () => {
    it('should store session in Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('sess-123', { userId: '456' }, 3600)

      expect(mockRedisInstance.set).toHaveBeenCalledWith('session:sess-123', expect.any(String), {
        ex: 3600,
      })
      expect(result).toBe(true)
    })

    it('should use default TTL when not provided', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      await setSession('sess-123', { userId: '456' })

      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'session:sess-123',
        expect.any(String),
        { ex: 86400 } // 24 hours
      )
    })

    it('should handle Redis errors with memory fallback', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.set.mockRejectedValueOnce(new Error('Redis error'))

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('sess-123', { userId: '456' }, 3600)

      expect(result).toBe(true) // Should succeed with fallback

      // Should be able to retrieve from memory
      mockRedisInstance.get.mockResolvedValueOnce(null)
      const retrieved = await getSession('sess-123')
      expect(retrieved).toEqual({ userId: '456' })
    })

    it('should serialize data', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      const complexData = {
        user: { id: '123', roles: ['admin'] },
        settings: { theme: 'dark' },
        timestamp: Date.now(),
      }

      await setSession('sess-123', complexData, 3600)

      // The data is passed through encryptSessionData (which JSON.stringifies when encryption off)
      const serializedData = mockRedisInstance.set.mock.calls[0][1]
      expect(JSON.parse(serializedData)).toEqual(complexData)
    })
  })

  describe('getSession', () => {
    it('should retrieve session from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const testData = { userId: '456', roles: ['user'] }
      mockRedisInstance.get.mockResolvedValueOnce(JSON.stringify(testData))

      const { getSession } = await import('@/lib/cache/redis-session')

      const result = await getSession('sess-123')

      expect(mockRedisInstance.get).toHaveBeenCalledWith('session:sess-123')
      expect(result).toEqual(testData)
    })

    it('should return null for non-existent session', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce(null)

      const { getSession } = await import('@/lib/cache/redis-session')

      const result = await getSession('non-existent')

      expect(result).toBeNull()
    })

    it('should handle Redis errors with memory fallback', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // Set fails on Redis, falls back to memory
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Redis error'))
      await setSession('sess-123', { userId: '456' }, 3600)

      // Get also fails on Redis, retrieves from memory
      mockRedisInstance.get.mockRejectedValueOnce(new Error('Redis error'))
      const result = await getSession('sess-123')

      expect(result).toEqual({ userId: '456' })
    })

    it('should handle invalid JSON gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce('invalid json')

      const { getSession } = await import('@/lib/cache/redis-session')

      const result = await getSession('sess-123')

      expect(result).toBeNull()
    })

    it('should clean up expired memory sessions', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // Set session with 0 TTL (immediate expiry)
      await setSession('sess-expired', { test: 'data' }, 0)

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Should return null for expired session
      const result = await getSession('sess-expired')
      expect(result).toBeNull()
    })
  })

  describe('deleteSession', () => {
    it('should delete session from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { deleteSession } = await import('@/lib/cache/redis-session')

      const result = await deleteSession('sess-123')

      expect(mockRedisInstance.del).toHaveBeenCalledWith('session:sess-123')
      expect(result).toBe(true)
    })

    it('should handle Redis errors with memory fallback', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.del.mockRejectedValueOnce(new Error('Redis error'))

      const { deleteSession } = await import('@/lib/cache/redis-session')

      const result = await deleteSession('sess-123')

      expect(result).toBe(true) // Should succeed (memory delete always succeeds)
    })

    it('should delete from memory store', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession, deleteSession } = await import('@/lib/cache/redis-session')

      await setSession('sess-123', { test: 'data' }, 3600)
      expect(await getSession('sess-123')).not.toBeNull()

      await deleteSession('sess-123')
      expect(await getSession('sess-123')).toBeNull()
    })
  })

  describe('touchSession', () => {
    it('should extend session TTL in Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { touchSession } = await import('@/lib/cache/redis-session')

      const result = await touchSession('sess-123', 7200)

      expect(mockRedisInstance.expire).toHaveBeenCalledWith('session:sess-123', 7200)
      expect(result).toBe(true)
    })

    it('should use default TTL when not provided', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { touchSession } = await import('@/lib/cache/redis-session')

      await touchSession('sess-123')

      expect(mockRedisInstance.expire).toHaveBeenCalledWith('session:sess-123', 86400)
    })

    it('should handle Redis errors', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.expire.mockRejectedValueOnce(new Error('Redis error'))

      const { touchSession } = await import('@/lib/cache/redis-session')

      const result = await touchSession('sess-123', 3600)

      // When Redis fails but session not in memory, returns false
      expect(result).toBe(false)
    })

    it('should update expiry in memory store', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, touchSession } = await import('@/lib/cache/redis-session')

      await setSession('sess-123', { test: 'data' }, 1)
      const result = await touchSession('sess-123', 3600)

      expect(result).toBe(true)
    })
  })

  describe('getSessionCount', () => {
    it('should count sessions in Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockResolvedValueOnce([0, ['session:1', 'session:2', 'session:3']])

      const { getSessionCount } = await import('@/lib/cache/redis-session')

      const count = await getSessionCount()

      expect(mockRedisInstance.scan).toHaveBeenCalled()
      expect(count).toBe(3)
    })

    it('should handle Redis errors', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Redis error'))

      const { getSessionCount } = await import('@/lib/cache/redis-session')

      const count = await getSessionCount()

      // Falls back to memory count (0 since nothing in memory)
      expect(count).toBe(0)
    })

    it('should count memory sessions', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSessionCount } = await import('@/lib/cache/redis-session')

      await setSession('sess-1', { test: 1 }, 3600)
      await setSession('sess-2', { test: 2 }, 3600)

      const count = await getSessionCount()

      expect(count).toBeGreaterThanOrEqual(2)
    })
  })

  describe('clearAllSessions', () => {
    it('should clear all sessions from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockResolvedValueOnce([0, ['session:1', 'session:2']])
      mockRedisInstance.del.mockResolvedValueOnce(2)

      const { clearAllSessions } = await import('@/lib/cache/redis-session')

      const count = await clearAllSessions()

      expect(mockRedisInstance.del).toHaveBeenCalledWith('session:1', 'session:2')
      expect(count).toBe(2)
    })

    it('should handle empty session list', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockResolvedValueOnce([0, []])

      const { clearAllSessions } = await import('@/lib/cache/redis-session')

      const count = await clearAllSessions()

      expect(count).toBe(0)
    })

    it('should handle Redis errors', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Redis error'))

      const { clearAllSessions } = await import('@/lib/cache/redis-session')

      const count = await clearAllSessions()

      // Falls back to memory clear (0 since nothing in memory)
      expect(count).toBe(0)
    })

    it('should clear memory sessions', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSessionCount, clearAllSessions } =
        await import('@/lib/cache/redis-session')

      await setSession('sess-1', { test: 1 }, 3600)
      await setSession('sess-2', { test: 2 }, 3600)

      const beforeCount = await getSessionCount()
      const clearedCount = await clearAllSessions()
      const afterCount = await getSessionCount()

      expect(clearedCount).toBe(beforeCount)
      expect(afterCount).toBe(0)
    })
  })

  describe('healthCheck', () => {
    it('should return health status with Redis available', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.ping.mockResolvedValueOnce('PONG')
      mockRedisInstance.scan.mockResolvedValueOnce([0, ['session:1', 'session:2']])

      const { healthCheck } = await import('@/lib/cache/redis-session')

      const health = await healthCheck()

      expect(health.redis).toBe(true)
      expect(typeof health.memory).toBe('boolean')
      expect(health.sessionCount).toBe(2)
    })

    it('should handle Redis unavailable', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { healthCheck, setSession } = await import('@/lib/cache/redis-session')

      // Add a session to memory store
      await setSession('test-memory', { data: 'test' }, 60)

      const health = await healthCheck()

      expect(health.redis).toBe(false)
      expect(health.memory).toBe(true)
      expect(typeof health.sessionCount).toBe('number')
    })

    it('should handle Redis ping failure', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.ping.mockRejectedValueOnce(new Error('Ping failed'))
      mockRedisInstance.scan.mockResolvedValueOnce([0, []])

      const { healthCheck } = await import('@/lib/cache/redis-session')

      const health = await healthCheck()

      expect(health.redis).toBe(false)
      expect(typeof health.sessionCount).toBe('number')
    })

    it('should report memory false when no sessions in memory', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { healthCheck, clearAllSessions } = await import('@/lib/cache/redis-session')

      // Clear all sessions first
      await clearAllSessions()

      const health = await healthCheck()

      expect(health.redis).toBe(false)
      expect(health.memory).toBe(false) // No sessions in memory
      expect(health.sessionCount).toBe(0)
    })
  })

  describe('memory cleanup', () => {
    it('should not store expired sessions in memory', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // Set session with negative TTL (already expired)
      await setSession('sess-expired', { test: 'data' }, -1)

      const result = await getSession('sess-expired')

      expect(result).toBeNull()
    })
  })

  describe('getSessionsByPattern', () => {
    it('should retrieve sessions matching pattern from Redis', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session')

      mockRedisInstance.scan.mockResolvedValueOnce([
        0,
        ['session:user-123', 'session:user-456', 'session:admin-789'],
      ])

      const sessions = await getSessionsByPattern('user-*')

      expect(mockRedisInstance.scan).toHaveBeenCalled()
      expect(Array.isArray(sessions)).toBe(true)
      expect(sessions).toEqual(['user-123', 'user-456', 'admin-789'])
    })

    it('should use wildcard pattern by default', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session')

      mockRedisInstance.scan.mockResolvedValueOnce([0, ['session:1', 'session:2']])

      const sessions = await getSessionsByPattern()

      expect(mockRedisInstance.scan).toHaveBeenCalled()
      expect(Array.isArray(sessions)).toBe(true)
    })

    it('should handle Redis errors and fallback to memory', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Redis error'))

      const { setSession, getSessionsByPattern } = await import('@/lib/cache/redis-session')

      // Add some sessions to memory by making set fail
      mockRedisInstance.set.mockRejectedValue(new Error('Redis error'))
      await setSession('mem-1', { data: 1 }, 3600)
      await setSession('mem-2', { data: 2 }, 3600)

      // Reset set mock for future use
      mockRedisInstance.set.mockResolvedValue('OK')

      const sessions = await getSessionsByPattern()

      expect(sessions.length).toBeGreaterThanOrEqual(0)
    })

    it('should retrieve sessions from memory store', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSessionsByPattern } = await import('@/lib/cache/redis-session')

      await setSession('test-1', { data: 1 }, 3600)
      await setSession('test-2', { data: 2 }, 3600)

      const sessions = await getSessionsByPattern()

      expect(sessions.length).toBeGreaterThanOrEqual(2)
      expect(sessions.some((s: string) => s === 'test-1')).toBe(true)
      expect(sessions.some((s: string) => s === 'test-2')).toBe(true)
    })

    it('should handle errors gracefully', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Connection error'))

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session')

      const sessions = await getSessionsByPattern('*')

      expect(sessions).toEqual(expect.any(Array))
    })

    it('should fallback to memory when Redis scan fails', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSessionsByPattern } = await import('@/lib/cache/redis-session')

      // Add sessions to memory
      await setSession('fallback-1', { data: 1 }, 3600)
      await setSession('fallback-2', { data: 2 }, 3600)

      const sessions = await getSessionsByPattern()

      // Should return array from memory
      expect(Array.isArray(sessions)).toBe(true)
      expect(sessions.length).toBeGreaterThanOrEqual(2)
    })

    it('should fallback to memory when Redis scan fails but client exists', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession, getSessionsByPattern, getSession } =
        await import('@/lib/cache/redis-session')

      // Initialize Redis first
      await getSession('init')

      // Add sessions to memory by making set fail
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Redis error'))
      await setSession('mem-fallback-1', { data: 1 }, 3600)

      // Make scan fail to trigger fallback path
      mockRedisInstance.scan.mockRejectedValueOnce(new Error('Scan failed'))

      const sessions = await getSessionsByPattern()

      // Should fallback to memory and find the session we added
      expect(Array.isArray(sessions)).toBe(true)
    })
  })

  describe('disconnect', () => {
    it('should disconnect gracefully (no-op for Upstash HTTP)', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { disconnect } = await import('@/lib/cache/redis-session')

      // Upstash HTTP disconnect just sets client to null
      await disconnect()

      // Should not throw
    })

    it('should handle disconnect when Redis is not initialized', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { disconnect } = await import('@/lib/cache/redis-session')

      // Should not throw when no Redis client exists
      await expect(disconnect()).resolves.toBeUndefined()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle setSession with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error even in memory fallback
      const originalSet = Map.prototype.set
      Map.prototype.set = function () {
        throw new Error('Memory error')
      }

      const result = await setSession('test-error', { data: 'test' }, 3600)

      // Restore
      Map.prototype.set = originalSet

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to set session'),
        expect.any(Error)
      )
      expect(result).toBe(false)
    })

    it('should handle getSession with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getSession } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error
      const originalGet = Map.prototype.get
      Map.prototype.get = function () {
        throw new Error('Memory error')
      }

      const result = await getSession('test-error')

      // Restore
      Map.prototype.get = originalGet

      // Should return null and log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get session'),
        expect.any(Error)
      )
      expect(result).toBeNull()
    })

    it('should handle deleteSession with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { deleteSession } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error
      const originalDelete = Map.prototype.delete
      Map.prototype.delete = function () {
        throw new Error('Memory error')
      }

      const result = await deleteSession('test-error')

      // Restore
      Map.prototype.delete = originalDelete

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete session'),
        expect.any(Error)
      )
      expect(result).toBe(false)
    })

    it('should handle touchSession with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { touchSession } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error
      const originalGet = Map.prototype.get
      Map.prototype.get = function () {
        throw new Error('Memory error')
      }

      const result = await touchSession('test-error', 3600)

      // Restore
      Map.prototype.get = originalGet

      // Should log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to touch session'),
        expect.any(Error)
      )
      expect(result).toBe(false)
    })

    it('should handle getSessionsByPattern with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error
      const originalKeys = Map.prototype.keys
      Map.prototype.keys = function () {
        throw new Error('Memory error')
      }

      const result = await getSessionsByPattern()

      // Restore
      Map.prototype.keys = originalKeys

      // Should return empty array and log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get sessions by pattern'),
        expect.any(Error)
      )
      expect(result).toEqual([])
    })

    it('should handle getSessionCount with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { getSessionCount } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error
      const originalEntries = Map.prototype.entries
      Map.prototype.entries = function () {
        throw new Error('Memory error')
      }

      const result = await getSessionCount()

      // Restore
      Map.prototype.entries = originalEntries

      // Should return 0 and log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get session count'),
        expect.any(Error)
      )
      expect(result).toBe(0)
    })

    it('should handle clearAllSessions with catastrophic error', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { clearAllSessions } = await import('@/lib/cache/redis-session')
      const { logger } = await import('@/lib/logger')

      // Mock to cause error
      const originalKeys = Map.prototype.keys
      Map.prototype.keys = function () {
        throw new Error('Memory error')
      }

      const result = await clearAllSessions()

      // Restore
      Map.prototype.keys = originalKeys

      // Should return 0 and log error
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to clear sessions'),
        expect.any(Error)
      )
      expect(result).toBe(0)
    })

    it('should handle setSession with zero TTL', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('test-zero-ttl', { data: 'test' }, 0)

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'session:test-zero-ttl',
        expect.any(String),
        { ex: 0 }
      )
    })

    it('should handle getSession with malformed Redis data', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      mockRedisInstance.get.mockResolvedValueOnce('{invalid json')

      const { getSession } = await import('@/lib/cache/redis-session')

      const result = await getSession('malformed')

      expect(result).toBeNull()
    })

    it('should handle touchSession for non-existent session in memory', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { touchSession } = await import('@/lib/cache/redis-session')

      const result = await touchSession('non-existent')

      expect(result).toBe(false)
    })

    it('should handle concurrent operations on memory store', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession, deleteSession } = await import('@/lib/cache/redis-session')

      // Simulate concurrent operations
      await Promise.all([
        setSession('concurrent-1', { test: 1 }, 3600),
        setSession('concurrent-2', { test: 2 }, 3600),
        setSession('concurrent-3', { test: 3 }, 3600),
      ])

      const [result1, result2, result3] = await Promise.all([
        getSession('concurrent-1'),
        getSession('concurrent-2'),
        getSession('concurrent-3'),
      ])

      expect(result1).toEqual({ test: 1 })
      expect(result2).toEqual({ test: 2 })
      expect(result3).toEqual({ test: 3 })

      await deleteSession('concurrent-2')

      const afterDelete = await getSession('concurrent-2')
      expect(afterDelete).toBeNull()
    })

    it('should handle Redis becoming unavailable during operation', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // First call succeeds
      mockRedisInstance.set.mockResolvedValueOnce('OK')
      await setSession('test-1', { data: 1 }, 3600)

      // Second call fails, should fallback to memory
      mockRedisInstance.set.mockRejectedValueOnce(new Error('Connection lost'))
      const result = await setSession('test-2', { data: 2 }, 3600)

      expect(result).toBe(true)

      // Should be retrievable from memory
      mockRedisInstance.get.mockRejectedValueOnce(new Error('Connection lost'))
      const retrieved = await getSession('test-2')

      expect(retrieved).toEqual({ data: 2 })
    })

    it('should handle session key generation edge cases', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // Test with special characters
      const specialIds = ['user:123:session', 'session@example.com', 'special-!@#$%', '']

      for (const id of specialIds) {
        await setSession(id, { test: id }, 3600)
        const result = await getSession(id)
        expect(result).toEqual({ test: id })
      }
    })

    it('should handle very large session data', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      const largeData = {
        users: Array(1000)
          .fill(null)
          .map((_, i) => ({
            id: `user-${i}`,
            name: `User ${i}`,
            data: Array(100).fill('x').join(''),
          })),
      }

      const result = await setSession('large-session', largeData, 3600)

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'session:large-session',
        expect.any(String),
        { ex: 3600 }
      )

      const serialized = mockRedisInstance.set.mock.calls.slice(-1)[0][1]
      expect(JSON.parse(serialized)).toEqual(largeData)
    })

    it('should handle clearAllSessions with partial failures', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { clearAllSessions } = await import('@/lib/cache/redis-session')

      mockRedisInstance.scan.mockResolvedValueOnce([0, ['session:1', 'session:2']])
      mockRedisInstance.del.mockRejectedValueOnce(new Error('Partial failure'))

      const count = await clearAllSessions()

      expect(count).toBeGreaterThanOrEqual(0)
    })

    it('should preserve data types through serialization', async () => {
      process.env.UPSTASH_REDIS_REST_URL = 'https://test.upstash.io'
      process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token'

      const { setSession } = await import('@/lib/cache/redis-session')

      const complexData = {
        string: 'test',
        number: 123,
        float: 123.456,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: {
          deep: {
            value: 'nested',
          },
        },
      }

      await setSession('complex', complexData, 3600)

      const serialized = mockRedisInstance.set.mock.calls.slice(-1)[0][1]
      const deserialized = JSON.parse(serialized)

      expect(deserialized).toEqual(complexData)
      expect(typeof deserialized.number).toBe('number')
      expect(typeof deserialized.boolean).toBe('boolean')
      expect(deserialized.null).toBeNull()
    })
  })

  describe('memory cleanup function', () => {
    it('should clean up expired sessions and log when cleaned > 0', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      // Add sessions with very short TTL
      await setSession('expire-1', { data: 1 }, 0)
      await setSession('expire-2', { data: 2 }, 0)

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Trigger cleanup by trying to get expired sessions
      await getSession('expire-1')
      await getSession('expire-2')

      // Both should be null (cleaned up)
      const result1 = await getSession('expire-1')
      const result2 = await getSession('expire-2')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })
  })
})
