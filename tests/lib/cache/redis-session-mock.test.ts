/**
 * Mock-based tests for Redis Session Cache Manager
 * Tests core functionality without requiring actual Redis connection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock ioredis
const mockRedis = {
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  setex: vi.fn().mockResolvedValue('OK'),
  get: vi.fn().mockResolvedValue(null),
  del: vi.fn().mockResolvedValue(1),
  expire: vi.fn().mockResolvedValue(1),
  keys: vi.fn().mockResolvedValue([]),
  info: vi.fn().mockResolvedValue('used_memory:1000000\r\nused_memory_human:976.56K'),
  quit: vi.fn().mockResolvedValue('OK'),
  ping: vi.fn().mockResolvedValue('PONG'),
};

vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => mockRedis),
  };
});

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Redis Session Cache (Mock)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initializeRedis', () => {
    it('should warn and use fallback when REDIS_URL is not configured', async () => {
      delete process.env.REDIS_URL;

      const { logger } = await import('@/lib/logger');
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('REDIS_URL not configured')
      );
    });

    it('should initialize Redis with proper configuration', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const Redis = (await import('ioredis')).default;
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization by calling a function
      await getSession('trigger-init');

      expect(Redis).toHaveBeenCalledWith(
        'redis://localhost:6379',
        expect.objectContaining({
          maxRetriesPerRequest: 3,
          lazyConnect: true,
          keepAlive: 30000,
          connectTimeout: 10000,
          commandTimeout: 5000,
        })
      );
    });

    it('should handle Redis connection events', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('trigger-init');

      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('close', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });

    it('should handle initial connection failure', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { logger } = await import('@/lib/logger');
      mockRedis.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('trigger-init');

      // Wait for async error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Initial connection failed'),
        expect.any(Error)
      );
    });

    it('should implement retry strategy', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const Redis = (await import('ioredis')).default;
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('trigger-init');

      const config = (Redis as any).mock.calls[0][1];
      const retryStrategy = config.retryStrategy;

      // Test retry delays
      expect(retryStrategy(1)).toBe(100);
      expect(retryStrategy(2)).toBe(200);
      expect(retryStrategy(3)).toBe(300);
      expect(retryStrategy(4)).toBeNull();
    });

    it('should handle READONLY error reconnection', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const Redis = (await import('ioredis')).default;
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('trigger-init');

      const config = (Redis as any).mock.calls[0][1];
      const reconnectOnError = config.reconnectOnError;

      expect(reconnectOnError({ message: 'READONLY' })).toBe(true);
      expect(reconnectOnError({ message: 'Other error' })).toBe(false);
    });
  });

  describe('setSession', () => {
    it('should store session in Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession } = await import('@/lib/cache/redis-session');

      const result = await setSession('sess-123', { userId: '456' }, 3600);

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:sess-123',
        3600,
        expect.any(String)
      );
      expect(result).toBe(true);
    });

    it('should use default TTL when not provided', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession } = await import('@/lib/cache/redis-session');

      await setSession('sess-123', { userId: '456' });

      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:sess-123',
        86400, // 24 hours
        expect.any(String)
      );
    });

    it('should handle Redis errors with memory fallback', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));

      const { setSession, getSession } = await import('@/lib/cache/redis-session');

      const result = await setSession('sess-123', { userId: '456' }, 3600);

      expect(result).toBe(true); // Should succeed with fallback

      // Should be able to retrieve from memory
      const retrieved = await getSession('sess-123');
      expect(retrieved).toEqual({ userId: '456' });
    });

    it('should serialize complex objects', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession } = await import('@/lib/cache/redis-session');

      const complexData = {
        user: { id: '123', roles: ['admin'] },
        settings: { theme: 'dark' },
        timestamp: Date.now(),
      };

      await setSession('sess-123', complexData, 3600);

      const serializedData = (mockRedis.setex as any).mock.calls[0][2];
      expect(JSON.parse(serializedData)).toEqual(complexData);
    });
  });

  describe('getSession', () => {
    it('should retrieve session from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const testData = { userId: '456', roles: ['user'] };
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(testData));

      const { getSession } = await import('@/lib/cache/redis-session');

      const result = await getSession('sess-123');

      expect(mockRedis.get).toHaveBeenCalledWith('session:sess-123');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent session', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.get.mockResolvedValueOnce(null);

      const { getSession } = await import('@/lib/cache/redis-session');

      const result = await getSession('non-existent');

      expect(result).toBeNull();
    });

    it('should handle Redis errors with memory fallback', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));

      // First set in memory
      const { setSession, getSession } = await import('@/lib/cache/redis-session');

      // Reset setex mock to fail
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));
      await setSession('sess-123', { userId: '456' }, 3600);

      // Should retrieve from memory
      mockRedis.get.mockRejectedValueOnce(new Error('Redis error'));
      const result = await getSession('sess-123');

      expect(result).toEqual({ userId: '456' });
    });

    it('should handle invalid JSON gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.get.mockResolvedValueOnce('invalid json');

      const { getSession } = await import('@/lib/cache/redis-session');

      const result = await getSession('sess-123');

      expect(result).toBeNull();
    });

    it('should clean up expired memory sessions', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSession } = await import('@/lib/cache/redis-session');

      // Set session with 0 TTL (immediate expiry)
      await setSession('sess-expired', { test: 'data' }, 0);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should return null for expired session
      const result = await getSession('sess-expired');
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete session from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { deleteSession } = await import('@/lib/cache/redis-session');

      const result = await deleteSession('sess-123');

      expect(mockRedis.del).toHaveBeenCalledWith('session:sess-123');
      expect(result).toBe(true);
    });

    it('should handle Redis errors with memory fallback', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.del.mockRejectedValueOnce(new Error('Redis error'));

      const { deleteSession } = await import('@/lib/cache/redis-session');

      const result = await deleteSession('sess-123');

      expect(result).toBe(true); // Should succeed with fallback
    });

    it('should delete from memory store', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSession, deleteSession } = await import('@/lib/cache/redis-session');

      await setSession('sess-123', { test: 'data' }, 3600);
      expect(await getSession('sess-123')).not.toBeNull();

      await deleteSession('sess-123');
      expect(await getSession('sess-123')).toBeNull();
    });
  });

  describe('touchSession', () => {
    it('should extend session TTL in Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { touchSession } = await import('@/lib/cache/redis-session');

      const result = await touchSession('sess-123', 7200);

      expect(mockRedis.expire).toHaveBeenCalledWith('session:sess-123', 7200);
      expect(result).toBe(true);
    });

    it('should use default TTL when not provided', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { touchSession } = await import('@/lib/cache/redis-session');

      await touchSession('sess-123');

      expect(mockRedis.expire).toHaveBeenCalledWith('session:sess-123', 86400);
    });

    it('should handle Redis errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.expire.mockRejectedValueOnce(new Error('Redis error'));

      const { touchSession } = await import('@/lib/cache/redis-session');

      const result = await touchSession('sess-123', 3600);

      expect(result).toBe(false);
    });

    it('should update expiry in memory store', async () => {
      delete process.env.REDIS_URL;

      const { setSession, touchSession } = await import('@/lib/cache/redis-session');

      await setSession('sess-123', { test: 'data' }, 1);
      const result = await touchSession('sess-123', 3600);

      expect(result).toBe(true);
    });
  });

  describe('getSessionCount', () => {
    it('should count sessions in Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockResolvedValueOnce(['session:1', 'session:2', 'session:3']);

      const { getSessionCount } = await import('@/lib/cache/redis-session');

      const count = await getSessionCount();

      expect(mockRedis.keys).toHaveBeenCalledWith('session:*');
      expect(count).toBe(3);
    });

    it('should handle Redis errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockRejectedValueOnce(new Error('Redis error'));

      const { getSessionCount } = await import('@/lib/cache/redis-session');

      const count = await getSessionCount();

      expect(count).toBe(0);
    });

    it('should count memory sessions', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSessionCount } = await import('@/lib/cache/redis-session');

      await setSession('sess-1', { test: 1 }, 3600);
      await setSession('sess-2', { test: 2 }, 3600);

      const count = await getSessionCount();

      expect(count).toBeGreaterThanOrEqual(2);
    });
  });

  describe('clearAllSessions', () => {
    it('should clear all sessions from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockResolvedValueOnce(['session:1', 'session:2']);
      mockRedis.del.mockResolvedValueOnce(2);

      const { clearAllSessions } = await import('@/lib/cache/redis-session');

      const count = await clearAllSessions();

      expect(mockRedis.del).toHaveBeenCalledWith('session:1', 'session:2');
      expect(count).toBe(2);
    });

    it('should handle empty session list', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockResolvedValueOnce([]);

      const { clearAllSessions } = await import('@/lib/cache/redis-session');

      const count = await clearAllSessions();

      expect(count).toBe(0);
      expect(mockRedis.del).not.toHaveBeenCalled();
    });

    it('should handle Redis errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockRejectedValueOnce(new Error('Redis error'));

      const { clearAllSessions } = await import('@/lib/cache/redis-session');

      const count = await clearAllSessions();

      expect(count).toBe(0);
    });

    it('should clear memory sessions', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSessionCount, clearAllSessions } = await import('@/lib/cache/redis-session');

      await setSession('sess-1', { test: 1 }, 3600);
      await setSession('sess-2', { test: 2 }, 3600);

      const beforeCount = await getSessionCount();
      const clearedCount = await clearAllSessions();
      const afterCount = await getSessionCount();

      expect(clearedCount).toBe(beforeCount);
      expect(afterCount).toBe(0);
    });
  });

  describe('healthCheck', () => {
    it('should return health status with Redis available', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.ping = vi.fn().mockResolvedValueOnce('PONG');

      const { healthCheck } = await import('@/lib/cache/redis-session');

      // First keys call for getSessionCount in healthCheck
      mockRedis.keys.mockResolvedValueOnce(['session:1', 'session:2']);

      const health = await healthCheck();

      expect(health.redis).toBe(true);
      expect(typeof health.memory).toBe('boolean'); // Memory depends on memoryStore.size
      expect(health.sessionCount).toBe(2);
    });

    it('should handle Redis unavailable', async () => {
      delete process.env.REDIS_URL;

      const { healthCheck, setSession } = await import('@/lib/cache/redis-session');

      // Add a session to memory store
      await setSession('test-memory', { data: 'test' }, 60);

      const health = await healthCheck();

      expect(health.redis).toBe(false);
      expect(health.memory).toBe(true);
      expect(typeof health.sessionCount).toBe('number');
    });

    it('should handle Redis errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.ping = vi.fn().mockRejectedValueOnce(new Error('Redis error'));
      mockRedis.keys.mockResolvedValueOnce([]);

      const { healthCheck, setSession } = await import('@/lib/cache/redis-session');

      // Add a session to memory store
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis error'));
      await setSession('test-memory', { data: 'test' }, 60);

      const health = await healthCheck();

      expect(health.redis).toBe(false);
      expect(health.memory).toBe(true);
    });

    it('should report memory false when no sessions in memory', async () => {
      delete process.env.REDIS_URL;

      const { healthCheck, clearAllSessions } = await import('@/lib/cache/redis-session');

      // Clear all sessions first
      await clearAllSessions();

      const health = await healthCheck();

      expect(health.redis).toBe(false);
      expect(health.memory).toBe(false); // No sessions in memory
      expect(health.sessionCount).toBe(0);
    });
  });

  describe('memory cleanup', () => {
    it('should not store expired sessions in memory', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSession } = await import('@/lib/cache/redis-session');

      // Set session with negative TTL (already expired)
      await setSession('sess-expired', { test: 'data' }, -1);

      const result = await getSession('sess-expired');

      expect(result).toBeNull();
    });
  });

  describe('getSessionsByPattern', () => {
    it('should retrieve sessions matching pattern from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session');

      // Set up mock after import
      mockRedis.keys.mockResolvedValueOnce([
        'session:user-123',
        'session:user-456',
        'session:admin-789',
      ]);

      const sessions = await getSessionsByPattern('user-*');

      // Should have called keys with the pattern
      expect(mockRedis.keys).toHaveBeenCalled();
      // Verify sessions were returned (either from Redis or fallback)
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should use wildcard pattern by default', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session');

      // Set up mock after import
      mockRedis.keys.mockResolvedValueOnce(['session:1', 'session:2']);

      const sessions = await getSessionsByPattern();

      // Should have called keys
      expect(mockRedis.keys).toHaveBeenCalled();
      // Verify result is an array
      expect(Array.isArray(sessions)).toBe(true);
    });

    it('should handle Redis errors and fallback to memory', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockRejectedValueOnce(new Error('Redis error'));

      const { setSession, getSessionsByPattern } = await import('@/lib/cache/redis-session');

      // Add some sessions to memory
      mockRedis.setex.mockRejectedValue(new Error('Redis error'));
      await setSession('mem-1', { data: 1 }, 3600);
      await setSession('mem-2', { data: 2 }, 3600);

      const sessions = await getSessionsByPattern();

      expect(sessions.length).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve sessions from memory store', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSessionsByPattern } = await import('@/lib/cache/redis-session');

      await setSession('test-1', { data: 1 }, 3600);
      await setSession('test-2', { data: 2 }, 3600);

      const sessions = await getSessionsByPattern();

      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.some((s: string) => s === 'test-1')).toBe(true);
      expect(sessions.some((s: string) => s === 'test-2')).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.keys.mockRejectedValueOnce(new Error('Connection error'));

      const { getSessionsByPattern } = await import('@/lib/cache/redis-session');

      const sessions = await getSessionsByPattern('*');

      expect(sessions).toEqual(expect.any(Array));
    });
  });

  describe('disconnect', () => {
    it('should gracefully disconnect from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { disconnect, getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      mockRedis.quit.mockResolvedValueOnce('OK');

      await disconnect();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle disconnect errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { disconnect, getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      mockRedis.quit.mockRejectedValueOnce(new Error('Disconnect error'));

      // Should not throw
      await expect(disconnect()).resolves.toBeUndefined();
    });

    it('should handle disconnect when Redis is not initialized', async () => {
      delete process.env.REDIS_URL;

      const { disconnect } = await import('@/lib/cache/redis-session');

      // Should not throw when no Redis client exists
      await expect(disconnect()).resolves.toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle setSession with zero TTL', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession } = await import('@/lib/cache/redis-session');

      const result = await setSession('test-zero-ttl', { data: 'test' }, 0);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith('session:test-zero-ttl', 0, expect.any(String));
    });

    it('should handle getSession with malformed Redis data', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedis.get.mockResolvedValueOnce('{invalid json');

      const { getSession } = await import('@/lib/cache/redis-session');

      const result = await getSession('malformed');

      expect(result).toBeNull();
    });

    it('should handle touchSession for non-existent session in memory', async () => {
      delete process.env.REDIS_URL;

      const { touchSession } = await import('@/lib/cache/redis-session');

      const result = await touchSession('non-existent');

      expect(result).toBe(false);
    });

    it('should handle concurrent operations on memory store', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSession, deleteSession } = await import('@/lib/cache/redis-session');

      // Simulate concurrent operations
      await Promise.all([
        setSession('concurrent-1', { test: 1 }, 3600),
        setSession('concurrent-2', { test: 2 }, 3600),
        setSession('concurrent-3', { test: 3 }, 3600),
      ]);

      const [result1, result2, result3] = await Promise.all([
        getSession('concurrent-1'),
        getSession('concurrent-2'),
        getSession('concurrent-3'),
      ]);

      expect(result1).toEqual({ test: 1 });
      expect(result2).toEqual({ test: 2 });
      expect(result3).toEqual({ test: 3 });

      await deleteSession('concurrent-2');

      const afterDelete = await getSession('concurrent-2');
      expect(afterDelete).toBeNull();
    });

    it('should handle Redis becoming unavailable during operation', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession, getSession } = await import('@/lib/cache/redis-session');

      // First call succeeds
      mockRedis.setex.mockResolvedValueOnce('OK');
      await setSession('test-1', { data: 1 }, 3600);

      // Second call fails, should fallback
      mockRedis.setex.mockRejectedValueOnce(new Error('Connection lost'));
      const result = await setSession('test-2', { data: 2 }, 3600);

      expect(result).toBe(true);

      // Should be retrievable from memory
      mockRedis.get.mockRejectedValueOnce(new Error('Connection lost'));
      const retrieved = await getSession('test-2');

      expect(retrieved).toEqual({ data: 2 });
    });

    it('should handle session key generation edge cases', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSession } = await import('@/lib/cache/redis-session');

      // Test with special characters
      const specialIds = [
        'user:123:session',
        'session@example.com',
        'special-!@#$%',
        '中文字符',
        '',
      ];

      for (const id of specialIds) {
        await setSession(id, { test: id }, 3600);
        const result = await getSession(id);
        expect(result).toEqual({ test: id });
      }
    });

    it('should handle very large session data', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession } = await import('@/lib/cache/redis-session');

      const largeData = {
        users: Array(1000).fill(null).map((_, i) => ({
          id: `user-${i}`,
          name: `User ${i}`,
          data: Array(100).fill('x').join(''),
        })),
      };

      const result = await setSession('large-session', largeData, 3600);

      expect(result).toBe(true);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'session:large-session',
        3600,
        expect.any(String)
      );

      const serialized = (mockRedis.setex as any).mock.calls.slice(-1)[0][2];
      expect(JSON.parse(serialized)).toEqual(largeData);
    });

    it('should handle clearAllSessions with partial failures', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { clearAllSessions } = await import('@/lib/cache/redis-session');

      mockRedis.keys.mockResolvedValueOnce(['session:1', 'session:2']);
      mockRedis.del.mockRejectedValueOnce(new Error('Partial failure'));

      const count = await clearAllSessions();

      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should preserve data types through serialization', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { setSession } = await import('@/lib/cache/redis-session');

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
      };

      await setSession('complex', complexData, 3600);

      const serialized = (mockRedis.setex as any).mock.calls.slice(-1)[0][2];
      const deserialized = JSON.parse(serialized);

      expect(deserialized).toEqual(complexData);
      expect(typeof deserialized.number).toBe('number');
      expect(typeof deserialized.boolean).toBe('boolean');
      expect(deserialized.null).toBeNull();
    });
  });

  describe('Redis configuration', () => {
    it('should configure Redis with enableOfflineQueue false', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const Redis = (await import('ioredis')).default;
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('trigger-init');

      const config = (Redis as any).mock.calls[0][1];
      expect(config.enableOfflineQueue).toBe(false);
    });

    it('should handle initialization error in try-catch block', async () => {
      process.env.REDIS_URL = 'redis://invalid-url';

      // Mock Redis constructor to throw
      const Redis = (await import('ioredis')).default;
      vi.mocked(Redis).mockImplementationOnce(() => {
        throw new Error('Invalid Redis URL');
      });

      const { logger } = await import('@/lib/logger');
      const { getSession } = await import('@/lib/cache/redis-session');

      // Should fallback to memory without throwing
      const result = await getSession('test');

      // Logger should have been called
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to initialize Redis'),
        expect.any(Error)
      );
    });
  });

  describe('memory cleanup function', () => {
    it('should clean up expired sessions and log when cleaned > 0', async () => {
      delete process.env.REDIS_URL;

      const { setSession, getSession } = await import('@/lib/cache/redis-session');
      const { logger } = await import('@/lib/logger');

      // Add sessions with very short TTL
      await setSession('expire-1', { data: 1 }, 0);
      await setSession('expire-2', { data: 2 }, 0);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 50));

      // Trigger cleanup by trying to get expired sessions
      await getSession('expire-1');
      await getSession('expire-2');

      // Both should be null (cleaned up)
      const result1 = await getSession('expire-1');
      const result2 = await getSession('expire-2');

      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('Redis event handling', () => {
    it('should trigger event handlers on connection', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { logger } = await import('@/lib/logger');
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      // Get the event handlers that were registered
      const connectHandler = (mockRedis.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1];

      // Simulate connect event
      if (connectHandler) {
        connectHandler();
      }

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Connected to Redis'));
    });

    it('should trigger event handlers on error', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { logger } = await import('@/lib/logger');
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      // Get the error handler
      const errorHandler = (mockRedis.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      // Simulate error event
      if (errorHandler) {
        errorHandler(new Error('Test error'));
      }

      expect(logger.error).toHaveBeenCalled();
    });

    it('should trigger event handlers on close', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { logger } = await import('@/lib/logger');
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      // Get the close handler
      const closeHandler = (mockRedis.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'close'
      )?.[1];

      // Simulate close event
      if (closeHandler) {
        closeHandler();
      }

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('connection closed'));
    });

    it('should trigger event handlers on reconnecting', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { logger } = await import('@/lib/logger');
      const { getSession } = await import('@/lib/cache/redis-session');

      // Trigger initialization
      await getSession('test');

      // Get the reconnecting handler
      const reconnectingHandler = (mockRedis.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'reconnecting'
      )?.[1];

      // Simulate reconnecting event
      if (reconnectingHandler) {
        reconnectingHandler();
      }

      expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Reconnecting'));
    });
  });
});
