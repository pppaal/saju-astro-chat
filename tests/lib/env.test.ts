/**
 * Tests for src/lib/env.ts
 * Tests runtime environment validation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock logger before importing env module
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Environment Validation', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // Reset environment to clean state
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('validateEnv', () => {
    it('should return valid when all required env vars are present', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should return invalid when required env vars are missing', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_URL;
      delete process.env.DATABASE_URL;
      delete process.env.TOKEN_ENCRYPTION_KEY;

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('NEXTAUTH_SECRET');
      expect(result.missing).toContain('NEXTAUTH_URL');
      expect(result.missing).toContain('DATABASE_URL');
      expect(result.missing).toContain('TOKEN_ENCRYPTION_KEY');
    });

    it('should require Redis env vars in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'https://example.com';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing).toContain('UPSTASH_REDIS_REST_URL');
      expect(result.missing).toContain('UPSTASH_REDIS_REST_TOKEN');
    });

    it('should not require Redis env vars in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(true);
      expect(result.missing).not.toContain('UPSTASH_REDIS_REST_URL');
    });

    it('should warn about missing recommended env vars', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      delete process.env.OPENAI_API_KEY;
      delete process.env.AI_BACKEND_URL;

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.warnings).toContain('OPENAI_API_KEY');
      expect(result.warnings).toContain('AI_BACKEND_URL');
    });

    it('should validate NEXTAUTH_SECRET minimum length', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'short';
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing.some(m => m.includes('NEXTAUTH_SECRET') && m.includes('32'))).toBe(true);
    });

    it('should validate TOKEN_ENCRYPTION_KEY minimum length', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'short';

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing.some(m => m.includes('TOKEN_ENCRYPTION_KEY') && m.includes('32'))).toBe(true);
    });

    it('should require HTTPS for NEXTAUTH_URL in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://example.com';  // http instead of https
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(false);
      expect(result.missing.some(m => m.includes('NEXTAUTH_URL') && m.includes('HTTPS'))).toBe(true);
    });

    it('should allow HTTPS NEXTAUTH_URL in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'https://example.com';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      process.env.UPSTASH_REDIS_REST_URL = 'https://redis.example.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

      const { validateEnv } = await import('@/lib/env');
      const result = validateEnv();

      expect(result.valid).toBe(true);
    });
  });

  describe('logEnvValidation', () => {
    it('should log success when valid', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.AI_BACKEND_URL = 'http://localhost:8000';

      const { logger } = await import('@/lib/logger');
      const { logEnvValidation } = await import('@/lib/env');

      logEnvValidation();

      expect(logger.info).toHaveBeenCalledWith('[env] Environment validation passed');
    });

    it('should log warnings for missing recommended vars', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      delete process.env.OPENAI_API_KEY;
      delete process.env.AI_BACKEND_URL;

      const { logger } = await import('@/lib/logger');
      const { logEnvValidation } = await import('@/lib/env');

      logEnvValidation();

      expect(logger.warn).toHaveBeenCalled();
    });

    it('should log error when required vars missing', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.DATABASE_URL;

      const { logger } = await import('@/lib/logger');
      const { logEnvValidation } = await import('@/lib/env');

      logEnvValidation();

      expect(logger.error).toHaveBeenCalled();
    });

    it('should throw in production when required vars missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_URL;
      delete process.env.DATABASE_URL;
      delete process.env.TOKEN_ENCRYPTION_KEY;

      const { logEnvValidation } = await import('@/lib/env');

      expect(() => logEnvValidation()).toThrow('Missing required environment variables');
    });
  });

  describe('env object', () => {
    it('should provide type-safe access to env vars', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';
      process.env.NEXTAUTH_URL = 'http://test.com';
      process.env.DATABASE_URL = 'postgresql://test';
      process.env.ADMIN_API_TOKEN = 'admin-token';
      process.env.PUBLIC_API_TOKEN = 'public-token';
      process.env.AI_BACKEND_URL = 'http://ai.test.com';
      process.env.OPENAI_API_KEY = 'openai-key';
      process.env.UPSTASH_REDIS_REST_URL = 'http://redis.test.com';
      process.env.UPSTASH_REDIS_REST_TOKEN = 'redis-token';
      process.env.TOKEN_ENCRYPTION_KEY = 'encryption-key';

      const { env } = await import('@/lib/env');

      expect(env.NEXTAUTH_SECRET).toBe('test-secret');
      expect(env.NEXTAUTH_URL).toBe('http://test.com');
      expect(env.DATABASE_URL).toBe('postgresql://test');
      expect(env.ADMIN_API_TOKEN).toBe('admin-token');
      expect(env.PUBLIC_API_TOKEN).toBe('public-token');
      expect(env.AI_BACKEND_URL).toBe('http://ai.test.com');
      expect(env.OPENAI_API_KEY).toBe('openai-key');
      expect(env.UPSTASH_REDIS_REST_URL).toBe('http://redis.test.com');
      expect(env.UPSTASH_REDIS_REST_TOKEN).toBe('redis-token');
      expect(env.TOKEN_ENCRYPTION_KEY).toBe('encryption-key');
    });

    it('should provide default values for missing env vars', async () => {
      delete process.env.NEXTAUTH_SECRET;
      delete process.env.NEXTAUTH_URL;
      delete process.env.DATABASE_URL;
      delete process.env.ADMIN_API_TOKEN;
      delete process.env.PUBLIC_API_TOKEN;
      delete process.env.AI_BACKEND_URL;
      delete process.env.OPENAI_API_KEY;
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
      delete process.env.TOKEN_ENCRYPTION_KEY;
      delete process.env.NEXT_PUBLIC_AI_BACKEND;

      const { env } = await import('@/lib/env');

      expect(env.NEXTAUTH_SECRET).toBe('');
      expect(env.NEXTAUTH_URL).toBe('http://localhost:3000');
      expect(env.DATABASE_URL).toBe('');
      expect(env.ADMIN_API_TOKEN).toBe('');
      expect(env.PUBLIC_API_TOKEN).toBe('');
      expect(env.AI_BACKEND_URL).toBe('');
      expect(env.OPENAI_API_KEY).toBe('');
      expect(env.UPSTASH_REDIS_REST_URL).toBe('');
      expect(env.UPSTASH_REDIS_REST_TOKEN).toBe('');
      expect(env.TOKEN_ENCRYPTION_KEY).toBe('');
    });

    it('should correctly detect production environment', async () => {
      process.env.NODE_ENV = 'production';

      const { env } = await import('@/lib/env');

      expect(env.isProduction).toBe(true);
      expect(env.isDevelopment).toBe(false);
    });

    it('should correctly detect development environment', async () => {
      process.env.NODE_ENV = 'development';

      const { env } = await import('@/lib/env');

      expect(env.isProduction).toBe(false);
      expect(env.isDevelopment).toBe(true);
    });

    it('should use NEXT_PUBLIC_AI_BACKEND as fallback for AI_BACKEND_URL', async () => {
      delete process.env.AI_BACKEND_URL;
      process.env.NEXT_PUBLIC_AI_BACKEND = 'http://public-ai.test.com';

      const { env } = await import('@/lib/env');

      expect(env.AI_BACKEND_URL).toBe('http://public-ai.test.com');
    });
  });
});
