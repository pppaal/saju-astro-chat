// tests/lib/cache/redis-session.mega.test.ts
// Comprehensive tests for Redis Session Manager
//
// Aligned with @upstash/redis implementation in src/lib/cache/redis-session.ts

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
  hasTokenEncryptionKey: vi.fn(() => false), // Default to no encryption
}))

import { logger } from '@/lib/logger'

describe('redis-session MEGA', () => {
  const originalEnv = process.env

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      UPSTASH_REDIS_REST_URL: 'https://test.upstash.io',
      UPSTASH_REDIS_REST_TOKEN: 'test-token',
    }
  })

  afterEach(async () => {
    process.env = originalEnv
    const { disconnect } = await import('@/lib/cache/redis-session')
    await disconnect()
  })

  describe('Session Management - Redis Available', () => {
    it('should store session in Redis', async () => {
      const { setSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('user123', { userId: 'user123', name: 'John' })

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith('session:user123', expect.any(String), {
        ex: 24 * 60 * 60,
      })
    })

    it('should retrieve session from Redis', async () => {
      const sessionData = { userId: 'user123', name: 'John' }
      mockRedisInstance.get.mockResolvedValue(JSON.stringify(sessionData))

      const { getSession } = await import('@/lib/cache/redis-session')

      const result = await getSession('user123')

      expect(result).toEqual(sessionData)
      expect(mockRedisInstance.get).toHaveBeenCalledWith('session:user123')
    })

    it('should delete session from Redis', async () => {
      const { deleteSession } = await import('@/lib/cache/redis-session')

      const result = await deleteSession('user123')

      expect(result).toBe(true)
      expect(mockRedisInstance.del).toHaveBeenCalledWith('session:user123')
    })

    it('should extend session TTL in Redis', async () => {
      const { touchSession } = await import('@/lib/cache/redis-session')

      const result = await touchSession('user123', 3600)

      expect(result).toBe(true)
      expect(mockRedisInstance.expire).toHaveBeenCalledWith('session:user123', 3600)
    })

    it('should use custom TTL when provided', async () => {
      const { setSession } = await import('@/lib/cache/redis-session')

      await setSession('user123', { data: 'test' }, 7200)

      expect(mockRedisInstance.set).toHaveBeenCalledWith('session:user123', expect.any(String), {
        ex: 7200,
      })
    })

    it('should return null for non-existent session', async () => {
      mockRedisInstance.get.mockResolvedValue(null)

      const { getSession } = await import('@/lib/cache/redis-session')

      const result = await getSession('nonexistent')

      expect(result).toBeNull()
    })

    it('should get sessions by pattern using scan', async () => {
      mockRedisInstance.scan.mockResolvedValue([
        0,
        ['session:user1', 'session:user2', 'session:admin1'],
      ])

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session')

      const result = await getSessionsByPattern('user*')

      expect(mockRedisInstance.scan).toHaveBeenCalled()
      expect(result).toEqual(['user1', 'user2', 'admin1'])
    })

    it('should count sessions using scan', async () => {
      mockRedisInstance.scan.mockResolvedValue([
        0,
        ['session:user1', 'session:user2', 'session:user3'],
      ])

      const { getSessionCount } = await import('@/lib/cache/redis-session')

      const count = await getSessionCount()

      expect(count).toBe(3)
    })

    it('should clear all sessions', async () => {
      mockRedisInstance.scan.mockResolvedValue([0, ['session:user1', 'session:user2']])
      mockRedisInstance.del.mockResolvedValue(2)

      const { clearAllSessions } = await import('@/lib/cache/redis-session')

      const count = await clearAllSessions()

      expect(count).toBe(2)
      expect(mockRedisInstance.del).toHaveBeenCalledWith('session:user1', 'session:user2')
    })

    it('should perform health check', async () => {
      mockRedisInstance.scan.mockResolvedValue([0, ['session:user1']])
      mockRedisInstance.ping.mockResolvedValue('PONG')

      const { healthCheck } = await import('@/lib/cache/redis-session')

      const health = await healthCheck()

      expect(health.redis).toBe(true)
      expect(health.sessionCount).toBe(1)
      expect(mockRedisInstance.ping).toHaveBeenCalled()
    })

    it('should disconnect gracefully', async () => {
      const { disconnect } = await import('@/lib/cache/redis-session')

      // Upstash HTTP: disconnect just sets client to null (no-op)
      await disconnect()

      // Should not throw
    })
  })

  describe('Session Management - Memory Fallback', () => {
    beforeEach(() => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
    })

    it('should use memory fallback when Upstash not configured', async () => {
      vi.resetModules()
      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      await setSession('user123', { name: 'John' })
      const result = await getSession('user123')

      expect(result).toEqual({ name: 'John' })
    })

    it('should store and retrieve from memory', async () => {
      vi.resetModules()
      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      const sessionData = { userId: '456', role: 'admin' }
      await setSession('admin456', sessionData)

      const result = await getSession('admin456')

      expect(result).toEqual(sessionData)
    })

    it('should delete from memory', async () => {
      vi.resetModules()
      const { setSession, getSession, deleteSession } = await import('@/lib/cache/redis-session')

      await setSession('user123', { data: 'test' })
      await deleteSession('user123')
      const result = await getSession('user123')

      expect(result).toBeNull()
    })

    it('should extend memory session TTL', async () => {
      vi.resetModules()
      const { setSession, touchSession, getSession } = await import('@/lib/cache/redis-session')

      await setSession('user123', { data: 'test' }, 1)
      await touchSession('user123', 3600)

      const result = await getSession('user123')

      expect(result).toEqual({ data: 'test' })
    })

    it('should count memory sessions', async () => {
      vi.resetModules()
      const { setSession, getSessionCount } = await import('@/lib/cache/redis-session')

      await setSession('user1', { data: '1' })
      await setSession('user2', { data: '2' })

      const count = await getSessionCount()

      expect(count).toBeGreaterThanOrEqual(2)
    })

    it('should clear memory sessions', async () => {
      vi.resetModules()
      const { setSession, clearAllSessions, getSession } = await import('@/lib/cache/redis-session')

      await setSession('user1', { data: '1' })
      await setSession('user2', { data: '2' })

      const count = await clearAllSessions()

      expect(count).toBeGreaterThanOrEqual(2)

      const result1 = await getSession('user1')
      const result2 = await getSession('user2')

      expect(result1).toBeNull()
      expect(result2).toBeNull()
    })

    it('should get sessions by pattern from memory', async () => {
      vi.resetModules()
      const { setSession, getSessionsByPattern } = await import('@/lib/cache/redis-session')

      await setSession('user1', { data: '1' })
      await setSession('admin1', { data: '2' })

      const sessions = await getSessionsByPattern()

      expect(sessions.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Redis Error Handling', () => {
    it('should fallback to memory when Redis set fails', async () => {
      mockRedisInstance.set.mockRejectedValue(new Error('Redis connection lost'))

      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('user123', { data: 'test' })
      expect(result).toBe(true)

      // Should be in memory now
      mockRedisInstance.get.mockRejectedValue(new Error('Redis down'))
      const retrieved = await getSession('user123')
      expect(retrieved).toEqual({ data: 'test' })

      expect(logger.warn).toHaveBeenCalledWith(
        '[RedisSession] Redis set failed, falling back to memory:',
        expect.any(Error)
      )
    })

    it('should fallback to memory when Redis get fails', async () => {
      mockRedisInstance.get.mockRejectedValue(new Error('Redis timeout'))

      const { getSession } = await import('@/lib/cache/redis-session')

      await getSession('user123')

      expect(logger.warn).toHaveBeenCalledWith(
        '[RedisSession] Redis get failed, falling back to memory:',
        expect.any(Error)
      )
    })

    it('should handle Redis delete failure gracefully', async () => {
      mockRedisInstance.del.mockRejectedValue(new Error('Redis error'))

      const { deleteSession } = await import('@/lib/cache/redis-session')

      const result = await deleteSession('user123')

      expect(result).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        '[RedisSession] Redis delete failed:',
        expect.any(Error)
      )
    })

    it('should handle Redis expire failure', async () => {
      mockRedisInstance.expire.mockRejectedValue(new Error('Redis error'))

      const { touchSession } = await import('@/lib/cache/redis-session')

      await touchSession('user123')

      expect(logger.warn).toHaveBeenCalledWith(
        '[RedisSession] Redis expire failed:',
        expect.any(Error)
      )
    })

    it('should handle Redis scan failure', async () => {
      mockRedisInstance.scan.mockRejectedValue(new Error('Redis error'))

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session')

      const result = await getSessionsByPattern()

      expect(Array.isArray(result)).toBe(true)
      expect(logger.warn).toHaveBeenCalledWith(
        '[RedisSession] Redis scan failed:',
        expect.any(Error)
      )
    })

    it('should handle health check failure', async () => {
      mockRedisInstance.ping.mockRejectedValue(new Error('Connection refused'))
      mockRedisInstance.scan.mockResolvedValue([0, []])

      const { healthCheck } = await import('@/lib/cache/redis-session')

      const health = await healthCheck()

      expect(health.redis).toBe(false)
    })
  })

  describe('Edge Cases', () => {
    it('should handle storing null values', async () => {
      const { setSession, getSession } = await import('@/lib/cache/redis-session')

      await setSession('null-test', null)
      // Mock get to return what was stored
      mockRedisInstance.get.mockResolvedValueOnce('null')
      const result = await getSession('null-test')

      expect(result).toBeNull()
    })

    it('should handle storing complex objects', async () => {
      const complexData = {
        user: { id: 123, name: 'John' },
        permissions: ['read', 'write'],
        metadata: { created: '2024-01-01', nested: { deep: true } },
      }

      const { setSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('complex', complexData)

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        'session:complex',
        expect.any(String),
        expect.any(Object)
      )
    })

    it('should handle empty session ID', async () => {
      const { setSession } = await import('@/lib/cache/redis-session')

      const result = await setSession('', { data: 'test' })

      expect(result).toBe(true)
    })

    it('should handle very long session IDs', async () => {
      const longId = 'a'.repeat(1000)

      const { setSession } = await import('@/lib/cache/redis-session')

      const result = await setSession(longId, { data: 'test' })

      expect(result).toBe(true)
      expect(mockRedisInstance.set).toHaveBeenCalledWith(
        `session:${longId}`,
        expect.any(String),
        expect.any(Object)
      )
    })

    it('should handle touch on non-existent session in memory', async () => {
      delete process.env.UPSTASH_REDIS_REST_URL
      delete process.env.UPSTASH_REDIS_REST_TOKEN
      vi.resetModules()

      const { touchSession } = await import('@/lib/cache/redis-session')

      const result = await touchSession('nonexistent')

      expect(result).toBe(false)
    })

    it('should clear zero sessions gracefully', async () => {
      mockRedisInstance.scan.mockResolvedValue([0, []])

      const { clearAllSessions } = await import('@/lib/cache/redis-session')

      const count = await clearAllSessions()

      expect(count).toBe(0)
    })
  })
})
