/**
 * Mock-based tests for Redis Cache utilities
 * Tests cache operations without actual Redis connection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock redis client
const mockRedisClient = {
  connect: vi.fn().mockResolvedValue(undefined),
  on: vi.fn(),
  get: vi.fn().mockResolvedValue(null),
  setEx: vi.fn().mockResolvedValue('OK'),
  del: vi.fn().mockResolvedValue(1),
  mGet: vi.fn().mockResolvedValue([]),
  keys: vi.fn().mockResolvedValue([]),
  info: vi.fn().mockResolvedValue('# Stats\r\ntotal_commands_processed:1000'),
};

vi.mock('redis', () => ({
  createClient: vi.fn(() => mockRedisClient),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Redis Cache Utilities (Mocked)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('CACHE_TTL constants', () => {
    it('should export all cache TTL values', async () => {
      const { CACHE_TTL } = await import('@/lib/cache/redis-cache');

      expect(CACHE_TTL.SAJU_RESULT).toBe(60 * 60 * 24 * 7); // 7 days
      expect(CACHE_TTL.TAROT_READING).toBe(60 * 60 * 24); // 1 day
      expect(CACHE_TTL.DESTINY_MAP).toBe(60 * 60 * 24 * 3); // 3 days
      expect(CACHE_TTL.GRADING_RESULT).toBe(60 * 60 * 24); // 1 day
      expect(CACHE_TTL.CALENDAR_DATA).toBe(60 * 60 * 24); // 1 day
      expect(CACHE_TTL.COMPATIBILITY).toBe(60 * 60 * 24 * 7); // 7 days
    });
  });

  describe('CacheKeys generators', () => {
    it('should generate saju cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.saju('1990-01-01', '12:00', 'M');
      expect(key).toBe('saju:1990-01-01:12:00:M');
    });

    it('should generate tarot cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.tarot('user123', 'What is my future?', 'celtic-cross');
      expect(key).toContain('tarot:user123:');
      expect(key).toContain(':celtic-cross');
    });

    it('should generate destiny map cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.destinyMap('1990-01-01', '12:00');
      expect(key).toBe('destiny:1990-01-01:12:00');
    });

    it('should generate grading cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.grading('2024-01-01', 'saju-data-string');
      expect(key).toContain('grade:2024-01-01:');
    });

    it('should generate calendar cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.calendar(2024, 1, 'user123');
      expect(key).toBe('cal:2024:1:user123');
    });

    it('should generate yearly calendar cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.yearlyCalendar('1990-01-01', '12:00', 'M', 2024);
      expect(key).toBe('yearly:v2:1990-01-01:12:00:M:2024');

      const keyWithCategory = CacheKeys.yearlyCalendar('1990-01-01', '12:00', 'M', 2024, 'health');
      expect(keyWithCategory).toBe('yearly:v2:1990-01-01:12:00:M:2024:health');
    });

    it('should generate compatibility cache key', async () => {
      const { CacheKeys } = await import('@/lib/cache/redis-cache');

      const key = CacheKeys.compatibility('person1', 'person2');
      expect(key).toBe('compat:person1:person2');
    });
  });

  describe('cacheGet', () => {
    it('should get cached data from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ result: 'success' }));

      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet<{ result: string }>('test-key');

      expect(mockRedisClient.get).toHaveBeenCalledWith('test-key');
      expect(result).toEqual({ result: 'success' });
    });

    it('should return null when Redis not configured', async () => {
      delete process.env.REDIS_URL;

      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('test-key');

      expect(result).toBeNull();
    });

    it('should return null when key not found', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce(null);

      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('non-existent');

      expect(result).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockRejectedValueOnce(new Error('Redis error'));

      const { logger } = await import('@/lib/logger');
      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('error-key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('[Redis] Get error', expect.any(Object));
    });

    it('should handle invalid JSON gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce('invalid json');

      const { logger } = await import('@/lib/logger');
      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('invalid-json');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('cacheSet', () => {
    it('should set data in Redis with TTL', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      const result = await cacheSet('test-key', { data: 'value' }, 3600);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ data: 'value' })
      );
      expect(result).toBe(true);
    });

    it('should use default TTL when not provided', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      await cacheSet('test-key', { data: 'value' });

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600, // Default TTL
        expect.any(String)
      );
    });

    it('should return false when Redis not configured', async () => {
      delete process.env.REDIS_URL;

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      const result = await cacheSet('test-key', { data: 'value' });

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.setEx.mockRejectedValueOnce(new Error('Redis error'));

      const { logger } = await import('@/lib/logger');
      const { cacheSet } = await import('@/lib/cache/redis-cache');

      const result = await cacheSet('error-key', { data: 'value' });

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('[Redis] Set error', expect.any(Object));
    });

    it('should serialize complex objects correctly', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      const complexData = {
        string: 'test',
        number: 123,
        nested: { deep: { value: 'nested' } },
        array: [1, 2, 3],
      };

      await cacheSet('complex', complexData, 3600);

      const serialized = (mockRedisClient.setEx as any).mock.calls[0][2];
      expect(JSON.parse(serialized)).toEqual(complexData);
    });
  });

  describe('cacheDel', () => {
    it('should delete key from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheDel } = await import('@/lib/cache/redis-cache');

      const result = await cacheDel('test-key');

      expect(mockRedisClient.del).toHaveBeenCalledWith('test-key');
      expect(result).toBe(true);
    });

    it('should return false when Redis not configured', async () => {
      delete process.env.REDIS_URL;

      const { cacheDel } = await import('@/lib/cache/redis-cache');

      const result = await cacheDel('test-key');

      expect(result).toBe(false);
    });

    it('should handle Redis errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.del.mockRejectedValueOnce(new Error('Redis error'));

      const { logger } = await import('@/lib/logger');
      const { cacheDel } = await import('@/lib/cache/redis-cache');

      const result = await cacheDel('error-key');

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalledWith('[Redis] Delete error', expect.any(Object));
    });
  });

  describe('cacheOrCalculate', () => {
    it('should return cached value when available', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify({ cached: true }));

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache');

      const calculate = vi.fn().mockResolvedValue({ calculated: true });
      const result = await cacheOrCalculate('test-key', calculate, 3600);

      expect(result).toEqual({ cached: true });
      expect(calculate).not.toHaveBeenCalled();
    });

    it('should calculate and cache when not in cache', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce(null); // Not in cache

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache');

      const calculate = vi.fn().mockResolvedValue({ calculated: true });
      const result = await cacheOrCalculate('test-key', calculate, 3600);

      expect(result).toEqual({ calculated: true });
      expect(calculate).toHaveBeenCalled();

      // Wait for background cache set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600,
        JSON.stringify({ calculated: true })
      );
    });

    it('should handle cache set failure gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce(null);
      mockRedisClient.setEx.mockRejectedValueOnce(new Error('Set failed'));

      const { logger } = await import('@/lib/logger');
      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache');

      const calculate = vi.fn().mockResolvedValue({ calculated: true });
      const result = await cacheOrCalculate('test-key', calculate, 3600);

      expect(result).toEqual({ calculated: true });

      // Wait for background cache set error handling
      await new Promise(resolve => setTimeout(resolve, 100));

      // The error is logged as "[Redis] Set error" by cacheSet
      expect(logger.error).toHaveBeenCalledWith(
        '[Redis] Set error',
        expect.any(Object)
      );
    });

    it('should use default TTL when not provided', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.get.mockResolvedValueOnce(null);

      const { cacheOrCalculate } = await import('@/lib/cache/redis-cache');

      const calculate = vi.fn().mockResolvedValue({ data: 'test' });
      await cacheOrCalculate('test-key', calculate);

      // Wait for background cache set
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'test-key',
        3600, // Default TTL
        expect.any(String)
      );
    });
  });

  describe('cacheGetMany', () => {
    it('should get multiple keys from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.mGet.mockResolvedValueOnce([
        JSON.stringify({ id: 1 }),
        JSON.stringify({ id: 2 }),
        null,
      ]);

      const { cacheGetMany } = await import('@/lib/cache/redis-cache');

      const results = await cacheGetMany<{ id: number }>(['key1', 'key2', 'key3']);

      expect(mockRedisClient.mGet).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(results).toEqual([{ id: 1 }, { id: 2 }, null]);
    });

    it('should return all nulls when Redis not configured', async () => {
      delete process.env.REDIS_URL;

      const { cacheGetMany } = await import('@/lib/cache/redis-cache');

      const results = await cacheGetMany(['key1', 'key2', 'key3']);

      expect(results).toEqual([null, null, null]);
    });

    it('should handle Redis errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.mGet.mockRejectedValueOnce(new Error('Redis error'));

      const { logger } = await import('@/lib/logger');
      const { cacheGetMany } = await import('@/lib/cache/redis-cache');

      const results = await cacheGetMany(['key1', 'key2']);

      expect(results).toEqual([null, null]);
      expect(logger.error).toHaveBeenCalledWith('[Redis] Batch get error', expect.any(Object));
    });

    it('should handle empty keys array', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.mGet.mockResolvedValueOnce([]);

      const { cacheGetMany } = await import('@/lib/cache/redis-cache');

      const results = await cacheGetMany([]);

      expect(results).toEqual([]);
    });
  });

  describe('clearCacheByPattern', () => {
    it('should clear all keys matching pattern', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.keys.mockResolvedValueOnce(['key1', 'key2', 'key3']);
      mockRedisClient.del.mockResolvedValueOnce(3);

      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache');

      const count = await clearCacheByPattern('test:*');

      expect(mockRedisClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockRedisClient.del).toHaveBeenCalledWith(['key1', 'key2', 'key3']);
      expect(count).toBe(3);
    });

    it('should return 0 when no keys match pattern', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.keys.mockResolvedValueOnce([]);

      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache');

      const count = await clearCacheByPattern('non-existent:*');

      expect(count).toBe(0);
      expect(mockRedisClient.del).not.toHaveBeenCalled();
    });

    it('should return 0 when Redis not configured', async () => {
      delete process.env.REDIS_URL;

      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache');

      const count = await clearCacheByPattern('test:*');

      expect(count).toBe(0);
    });

    it('should handle Redis errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.keys.mockRejectedValueOnce(new Error('Redis error'));

      const { logger } = await import('@/lib/logger');
      const { clearCacheByPattern } = await import('@/lib/cache/redis-cache');

      const count = await clearCacheByPattern('test:*');

      expect(count).toBe(0);
      expect(logger.error).toHaveBeenCalledWith('[Redis] Clear pattern error', expect.any(Object));
    });
  });

  describe('getCacheInfo', () => {
    it('should get Redis cache statistics', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.info.mockResolvedValueOnce('# Stats\r\ntotal_commands_processed:5000');

      const { getCacheInfo } = await import('@/lib/cache/redis-cache');

      const info = await getCacheInfo();

      expect(mockRedisClient.info).toHaveBeenCalledWith('stats');
      expect(info).toContain('total_commands_processed:5000');
    });

    it('should return null when Redis not configured', async () => {
      delete process.env.REDIS_URL;

      const { getCacheInfo } = await import('@/lib/cache/redis-cache');

      const info = await getCacheInfo();

      expect(info).toBeNull();
    });

    it('should handle Redis errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.info.mockRejectedValueOnce(new Error('Redis error'));

      const { logger } = await import('@/lib/logger');
      const { getCacheInfo } = await import('@/lib/cache/redis-cache');

      const info = await getCacheInfo();

      expect(info).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('[Redis] Info error', expect.any(Object));
    });
  });

  describe('Redis client initialization', () => {
    it('should initialize Redis client lazily', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { createClient } = await import('redis');

      // Import but don't call any functions yet
      await import('@/lib/cache/redis-cache');

      // Client should not be created yet
      expect(createClient).not.toHaveBeenCalled();
    });

    it('should handle connection errors gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      mockRedisClient.connect.mockRejectedValueOnce(new Error('Connection failed'));

      const { logger } = await import('@/lib/logger');
      const { cacheGet } = await import('@/lib/cache/redis-cache');

      const result = await cacheGet('test-key');

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('[Redis] Failed to connect', expect.any(Object));
    });

    it('should handle Redis error events', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { logger } = await import('@/lib/logger');
      const { cacheGet } = await import('@/lib/cache/redis-cache');

      // Trigger initialization
      await cacheGet('test-key');

      // Get the error event handler
      const errorHandler = (mockRedisClient.on as any).mock.calls.find(
        (call: any[]) => call[0] === 'error'
      )?.[1];

      // Simulate error event
      if (errorHandler) {
        errorHandler(new Error('Redis runtime error'));
      }

      expect(logger.error).toHaveBeenCalledWith(
        '[Redis] Connection error',
        expect.objectContaining({ error: expect.any(Error) })
      );
    });

    it('should reuse existing client on subsequent calls', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { createClient } = await import('redis');
      const { cacheGet } = await import('@/lib/cache/redis-cache');

      // First call
      await cacheGet('key1');
      const firstCallCount = (createClient as any).mock.calls.length;

      // Second call
      await cacheGet('key2');
      const secondCallCount = (createClient as any).mock.calls.length;

      // Should only create client once
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle null values correctly', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet, cacheGet } = await import('@/lib/cache/redis-cache');

      await cacheSet('null-key', null, 3600);

      const serialized = (mockRedisClient.setEx as any).mock.calls[0][2];
      expect(serialized).toBe('null');

      mockRedisClient.get.mockResolvedValueOnce('null');
      const result = await cacheGet('null-key');

      expect(result).toBeNull();
    });

    it('should handle undefined values by converting to null', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      await cacheSet('undefined-key', undefined, 3600);

      // JSON.stringify(undefined) returns undefined, but setEx should still be called
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it('should handle very large data correctly', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet } = await import('@/lib/cache/redis-cache');

      const largeData = {
        items: Array(1000).fill(null).map((_, i) => ({
          id: i,
          data: 'x'.repeat(100),
        })),
      };

      const result = await cacheSet('large-key', largeData, 3600);

      expect(result).toBe(true);
      const serialized = (mockRedisClient.setEx as any).mock.calls[0][2];
      expect(JSON.parse(serialized)).toEqual(largeData);
    });

    it('should handle special characters in keys', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet, cacheGet } = await import('@/lib/cache/redis-cache');

      const specialKeys = [
        'key:with:colons',
        'key/with/slashes',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key@with@at',
      ];

      for (const key of specialKeys) {
        await cacheSet(key, { test: key }, 3600);
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          key,
          3600,
          expect.any(String)
        );
      }
    });

    it('should handle concurrent operations', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const { cacheSet, cacheGet } = await import('@/lib/cache/redis-cache');

      // Simulate concurrent operations
      await Promise.all([
        cacheSet('concurrent-1', { id: 1 }, 3600),
        cacheSet('concurrent-2', { id: 2 }, 3600),
        cacheSet('concurrent-3', { id: 3 }, 3600),
        cacheGet('concurrent-read-1'),
        cacheGet('concurrent-read-2'),
      ]);

      expect(mockRedisClient.setEx).toHaveBeenCalledTimes(3);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(2);
    });
  });
});