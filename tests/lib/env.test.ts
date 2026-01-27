/**
 * Tests for src/lib/env.ts
 * Tests runtime environment validation and typed env access
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Environment Module', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('env object', () => {
    it('should provide type-safe access to env vars', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const { env } = await import('@/lib/env');

      expect(env.NODE_ENV).toBe('development');
      expect(env.NEXTAUTH_SECRET).toBe('a'.repeat(32));
      expect(env.DATABASE_URL).toBe('postgresql://localhost/test');
    });

    it('should parse NODE_ENV correctly', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ADMIN_API_TOKEN = 'admin-token';
      process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx';
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

      const { env } = await import('@/lib/env');

      expect(env.NODE_ENV).toBe('production');
    });

    it('should default NODE_ENV to development', async () => {
      delete process.env.NODE_ENV;
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const { env } = await import('@/lib/env');

      expect(env.NODE_ENV).toBe('development');
    });

    it('should include optional env vars when present', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.OPENAI_API_KEY = 'sk-test-key';
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token';

      const { env } = await import('@/lib/env');

      expect(env.OPENAI_API_KEY).toBe('sk-test-key');
      expect(env.UPSTASH_REDIS_REST_URL).toBe('https://redis.example.com');
      expect(env.UPSTASH_REDIS_REST_TOKEN).toBe('redis-token');
    });
  });

  describe('isProduction / isDevelopment / isTest', () => {
    it('should export isProduction as true in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.ADMIN_API_TOKEN = 'admin-token';
      process.env.STRIPE_SECRET_KEY = 'sk_test_xxx';
      process.env.STRIPE_WEBHOOK_SECRET = 'whsec_xxx';
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

      const { isProduction, isDevelopment, isTest } = await import('@/lib/env');

      expect(isProduction).toBe(true);
      expect(isDevelopment).toBe(false);
      expect(isTest).toBe(false);
    });

    it('should export isDevelopment as true in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const { isProduction, isDevelopment } = await import('@/lib/env');

      expect(isProduction).toBe(false);
      expect(isDevelopment).toBe(true);
    });

    it('should export isTest as true in test', async () => {
      process.env.NODE_ENV = 'test';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const { isTest } = await import('@/lib/env');

      expect(isTest).toBe(true);
    });
  });

  describe('getRequiredEnv', () => {
    it('should return the value when env var exists', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const { getRequiredEnv } = await import('@/lib/env');

      expect(getRequiredEnv('DATABASE_URL')).toBe('postgresql://localhost/test');
    });

    it('should throw when env var is empty', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      // ADMIN_API_TOKEN is optional and undefined

      const { getRequiredEnv } = await import('@/lib/env');

      expect(() => getRequiredEnv('ADMIN_API_TOKEN')).toThrow('Missing required environment variable');
    });
  });

  describe('getOptionalEnv', () => {
    it('should return value when env var exists', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.OPENAI_API_KEY = 'my-key';

      const { getOptionalEnv } = await import('@/lib/env');

      expect(getOptionalEnv('OPENAI_API_KEY', 'fallback')).toBe('my-key');
    });

    it('should return default when env var is missing', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const { getOptionalEnv } = await import('@/lib/env');

      expect(getOptionalEnv('OPENAI_API_KEY', 'fallback')).toBe('fallback');
    });
  });

  describe('Env type export', () => {
    it('should export Env type (env object is defined)', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = 'postgresql://localhost/test';

      const module = await import('@/lib/env');

      expect(module.env).toBeDefined();
      expect(typeof module.env).toBe('object');
    });
  });

  describe('validation behavior', () => {
    it('should handle invalid DATABASE_URL gracefully in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.DATABASE_URL = '';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { env } = await import('@/lib/env');

      // In development, it should return partial env with defaults
      expect(env).toBeDefined();
      consoleSpy.mockRestore();
    });

    it('should handle short NEXTAUTH_SECRET gracefully in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'short';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { env } = await import('@/lib/env');

      // In development, should still parse with default fallback
      expect(env).toBeDefined();
      consoleSpy.mockRestore();
    });
  });
});
