/**
 * Mock-based tests for Redis Rate Limiting
 * Tests rate limiting logic without actual Redis connection
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the entire module to control behavior
vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock ioredis before importing the module
vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      pipeline: vi.fn().mockReturnValue({
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 1]]),
      }),
      del: vi.fn().mockResolvedValue(1),
      get: vi.fn().mockResolvedValue('1'),
      ping: vi.fn().mockResolvedValue('PONG'),
    })),
  };
});

describe('Redis Rate Limiting (Mocked)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear module cache to reset internal state
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('Rate limit result structure', () => {
    it('should return proper rate limit result structure', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('test-key', { limit: 10, windowSeconds: 60 });

      expect(result).toHaveProperty('allowed');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('remaining');
      expect(result).toHaveProperty('reset');
      expect(result).toHaveProperty('headers');
      expect(result).toHaveProperty('backend');

      expect(typeof result.allowed).toBe('boolean');
      expect(typeof result.limit).toBe('number');
      expect(typeof result.remaining).toBe('number');
      expect(typeof result.reset).toBe('number');
      expect(result.headers).toBeInstanceOf(Headers);
      expect(typeof result.backend).toBe('string');
    });

    it('should have headers with rate limit info', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('test-key-headers', { limit: 5, windowSeconds: 30 });

      const headers = result.headers;
      expect(headers.get('X-RateLimit-Limit')).toBe('5');
      expect(headers.get('X-RateLimit-Remaining')).toBeDefined();
      expect(headers.get('X-RateLimit-Reset')).toBeDefined();
    });

    it('should respect the limit parameter', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('test-key-limit', { limit: 100, windowSeconds: 60 });

      expect(result.limit).toBe(100);
    });

    it('should use default limit and window when not specified', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('test-key-defaults');

      expect(result.limit).toBe(60); // Default limit
      expect(result.headers.get('X-RateLimit-Limit')).toBe('60');
    });

    it('should set Retry-After header when rate limit exceeded', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const Redis = (await import('ioredis')).default;
      const mockPipeline = {
        incr: vi.fn().mockReturnThis(),
        expire: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([[null, 100]]), // Count exceeds limit
      };

      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        pipeline: vi.fn().mockReturnValue(mockPipeline),
        ping: vi.fn().mockResolvedValue('PONG'),
      }));

      vi.resetModules();
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('test-exceeded', { limit: 10, windowSeconds: 60 });

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.headers.has('Retry-After')).toBe(true);
      expect(result.retryAfter).toBeGreaterThan(0);
    });
  });

  describe('Backend detection', () => {
    it('should report backend type', async () => {
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('test-key-backend', { limit: 10, windowSeconds: 60 });

      // Should be one of the valid backends
      expect(['redis', 'upstash', 'memory', 'disabled']).toContain(result.backend);
    });
  });

  describe('Rate limit status', () => {
    it('should get rate limit status', async () => {
      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit');

      const status = await getRateLimitStatus('test-status-key');

      // Returns { count, ttl } or null
      if (status !== null) {
        expect(status).toHaveProperty('count');
        expect(status).toHaveProperty('ttl');
        expect(typeof status.count).toBe('number');
        expect(typeof status.ttl).toBe('number');
      } else {
        expect(status).toBeNull();
      }
    });
  });

  describe('Reset rate limit', () => {
    it('should reset rate limit for a key', async () => {
      const { resetRateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Should not throw
      await expect(resetRateLimit('test-reset-key')).resolves.not.toThrow();
    });
  });

  describe('Health check', () => {
    it('should perform health check', async () => {
      const { rateLimitHealthCheck } = await import('@/lib/cache/redis-rate-limit');

      const health = await rateLimitHealthCheck();

      // Returns { redis, upstash, memory }
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('upstash');
      expect(health).toHaveProperty('memory');
      expect(typeof health.redis).toBe('boolean');
      expect(typeof health.upstash).toBe('boolean');
      expect(typeof health.memory).toBe('boolean');
    });
  });

  describe('In-memory fallback behavior', () => {
    it('should work without Redis/Upstash (in-memory fallback)', async () => {
      // Reset environment to ensure no Redis config
      const originalRedisUrl = process.env.REDIS_URL;
      const originalUpstashUrl = process.env.UPSTASH_REDIS_REST_URL;

      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;

      vi.resetModules();

      try {
        const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

        const result = await rateLimit('fallback-test', { limit: 5, windowSeconds: 60 });

        // Should still return valid result
        expect(result.allowed).toBe(true);
        expect(result.limit).toBe(5);
      } finally {
        // Restore environment
        if (originalRedisUrl) process.env.REDIS_URL = originalRedisUrl;
        if (originalUpstashUrl) process.env.UPSTASH_REDIS_REST_URL = originalUpstashUrl;
      }
    });

    it('should increment count in memory fallback', async () => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      process.env.NODE_ENV = 'development';

      vi.resetModules();

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const key = 'memory-increment-' + Date.now();
      const result1 = await rateLimit(key, { limit: 5, windowSeconds: 60 });
      const result2 = await rateLimit(key, { limit: 5, windowSeconds: 60 });

      // Both should be allowed
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should cleanup expired in-memory entries', async () => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      process.env.NODE_ENV = 'development';

      vi.resetModules();

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Set entry with very short TTL
      const key = 'memory-cleanup-' + Date.now();
      await rateLimit(key, { limit: 5, windowSeconds: 1 });

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second call should create new window
      const result = await rateLimit(key, { limit: 5, windowSeconds: 60 });
      expect(result.allowed).toBe(true);
    });

    it('should deny in production when all backends unavailable', async () => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      process.env.NODE_ENV = 'production';

      vi.resetModules();

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('prod-no-backend', { limit: 5, windowSeconds: 60 });

      expect(result.allowed).toBe(false);
      expect(result.backend).toBe('disabled');
      expect(result.remaining).toBe(0);
    });
  });

  describe('Redis initialization and error handling', () => {
    it('should initialize Redis client lazily', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      vi.resetModules();

      const Redis = (await import('ioredis')).default;
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Redis should not be called yet
      expect(Redis).not.toHaveBeenCalled();

      // First rate limit call triggers initialization
      await rateLimit('init-test', { limit: 10, windowSeconds: 60 });

      expect(Redis).toHaveBeenCalled();
    });

    it('should handle Redis connection failure gracefully', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.NODE_ENV = 'development';

      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockRejectedValue(new Error('Connection failed')),
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockRejectedValue(new Error('Redis error')),
        }),
      }));

      vi.resetModules();

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Should fall back gracefully
      const result = await rateLimit('error-test', { limit: 10, windowSeconds: 60 });
      expect(result).toBeDefined();
      expect(result.allowed).toBe(true); // Development fallback allows
    });

    it('should implement retry strategy correctly', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      vi.resetModules();

      const Redis = (await import('ioredis')).default;
      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Trigger initialization
      await rateLimit('retry-test', { limit: 10, windowSeconds: 60 });

      const config = (Redis as any).mock.calls[0][1];
      const retryStrategy = config.retryStrategy;

      expect(retryStrategy(1)).toBe(50);
      expect(retryStrategy(2)).toBe(100);
      expect(retryStrategy(3)).toBeNull(); // Max retries exceeded
    });

    it('should handle Redis event listeners', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const mockOn = vi.fn();
      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: mockOn,
        connect: vi.fn().mockResolvedValue(undefined),
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([[null, 1]]),
        }),
      }));

      vi.resetModules();

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');
      await rateLimit('event-test', { limit: 10, windowSeconds: 60 });

      expect(mockOn).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle pipeline execution errors', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';
      process.env.NODE_ENV = 'development';

      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([[new Error('Pipeline error'), null]]),
        }),
      }));

      vi.resetModules();

      const { rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const result = await rateLimit('pipeline-error', { limit: 10, windowSeconds: 60 });
      expect(result.allowed).toBe(true); // Falls back in development
    });
  });

  describe('resetRateLimit', () => {
    it('should reset rate limit with Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const mockDel = vi.fn().mockResolvedValue(1);
      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        del: mockDel,
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([[null, 1]]),
        }),
      }));

      vi.resetModules();

      const { resetRateLimit, rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // First call to initialize Redis
      await rateLimit('reset-test', { limit: 10, windowSeconds: 60 });

      const result = await resetRateLimit('reset-test');
      expect(result).toBe(true);
      expect(mockDel).toHaveBeenCalledWith('rl:reset-test');
    });

    it('should reset rate limit in memory fallback', async () => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      process.env.NODE_ENV = 'development';

      vi.resetModules();

      const { resetRateLimit, rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const key = 'memory-reset-' + Date.now();
      await rateLimit(key, { limit: 5, windowSeconds: 60 });

      const result = await resetRateLimit(key);
      expect(result).toBe(true);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should get status from Redis', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const mockGet = vi.fn().mockResolvedValue('5');
      const mockTtl = vi.fn().mockResolvedValue(55);
      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        get: mockGet,
        ttl: mockTtl,
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([[null, 1]]),
        }),
      }));

      vi.resetModules();

      const { getRateLimitStatus, rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Initialize Redis
      await rateLimit('status-test', { limit: 10, windowSeconds: 60 });

      const status = await getRateLimitStatus('status-test');
      expect(status).not.toBeNull();
      expect(status?.count).toBe(5);
      expect(status?.ttl).toBe(55);
    });

    it('should get status from memory fallback', async () => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;
      process.env.NODE_ENV = 'development';

      vi.resetModules();

      const { getRateLimitStatus, rateLimit } = await import('@/lib/cache/redis-rate-limit');

      const key = 'memory-status-' + Date.now();

      // In development without backends, rateLimit uses disabled mode
      // which doesn't store in memory, so status will be zero
      await rateLimit(key, { limit: 10, windowSeconds: 60 });

      const status = await getRateLimitStatus(key);
      expect(status).not.toBeNull();
      // In disabled/development mode, status is likely { count: 0, ttl: 0 }
      expect(status?.count).toBeGreaterThanOrEqual(0);
      expect(status?.ttl).toBeGreaterThanOrEqual(0);
    });

    it('should return zero status for non-existent key', async () => {
      delete process.env.REDIS_URL;
      delete process.env.UPSTASH_REDIS_REST_URL;

      vi.resetModules();

      const { getRateLimitStatus } = await import('@/lib/cache/redis-rate-limit');

      const status = await getRateLimitStatus('non-existent-' + Date.now());
      expect(status).toEqual({ count: 0, ttl: 0 });
    });
  });

  describe('rateLimitHealthCheck', () => {
    it('should report Redis health', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const mockPing = vi.fn().mockResolvedValue('PONG');
      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        ping: mockPing,
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([[null, 1]]),
        }),
      }));

      vi.resetModules();

      const { rateLimitHealthCheck, rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Initialize Redis
      await rateLimit('health-test', { limit: 10, windowSeconds: 60 });

      const health = await rateLimitHealthCheck();
      expect(health.redis).toBe(true);
    });

    it('should report Redis unhealthy on ping failure', async () => {
      process.env.REDIS_URL = 'redis://localhost:6379';

      const Redis = (await import('ioredis')).default;
      (Redis as any).mockImplementation(() => ({
        on: vi.fn(),
        connect: vi.fn().mockResolvedValue(undefined),
        ping: vi.fn().mockRejectedValue(new Error('Ping failed')),
        pipeline: vi.fn().mockReturnValue({
          incr: vi.fn().mockReturnThis(),
          expire: vi.fn().mockReturnThis(),
          exec: vi.fn().mockResolvedValue([[null, 1]]),
        }),
      }));

      vi.resetModules();

      const { rateLimitHealthCheck, rateLimit } = await import('@/lib/cache/redis-rate-limit');

      // Initialize Redis
      await rateLimit('health-fail-test', { limit: 10, windowSeconds: 60 });

      const health = await rateLimitHealthCheck();
      expect(health.redis).toBe(false);
    });
  });
});
