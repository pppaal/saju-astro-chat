// tests/lib/env.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock logger before importing env
vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { validateEnv, logEnvValidation } from '@/lib/env';

describe('env module', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateEnv', () => {
    describe('required server environment variables', () => {
      it('should pass when all required env vars are present', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      });

      it('should fail when NEXTAUTH_SECRET is missing', () => {
        process.env.NODE_ENV = 'development';
        delete process.env.NEXTAUTH_SECRET;
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('NEXTAUTH_SECRET');
      });

      it('should fail when DATABASE_URL is missing', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        delete process.env.DATABASE_URL;
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('DATABASE_URL');
      });
    });

    describe('production environment variables', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'production';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'https://example.com';
        process.env.DATABASE_URL = 'postgresql://prod:5432/test';
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      });

      it('should require UPSTASH_REDIS_REST_URL in production', () => {
        delete process.env.UPSTASH_REDIS_REST_URL;
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing).toContain('UPSTASH_REDIS_REST_URL');
      });

      it('should pass when all production env vars are present', () => {
        process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io';
        process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.missing).toHaveLength(0);
      });
    });

    describe('secret length validation', () => {
      it('should fail when NEXTAUTH_SECRET is too short', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'tooshort';
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing.some(m => m.includes('NEXTAUTH_SECRET'))).toBe(true);
      });

      it('should accept NEXTAUTH_SECRET with exactly 32 characters', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

        const result = validateEnv();

        expect(result.missing.some(m => m.includes('NEXTAUTH_SECRET'))).toBe(false);
      });
    });

    describe('recommended environment variables', () => {
      beforeEach(() => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
        process.env.NEXTAUTH_URL = 'http://localhost:3000';
        process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
        process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);
      });

      it('should warn when OPENAI_API_KEY is missing', () => {
        delete process.env.OPENAI_API_KEY;
        process.env.AI_BACKEND_URL = 'http://backend';

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('OPENAI_API_KEY');
      });

      it('should warn when AI_BACKEND_URL is missing', () => {
        process.env.OPENAI_API_KEY = 'sk-test';
        delete process.env.AI_BACKEND_URL;

        const result = validateEnv();

        expect(result.valid).toBe(true);
        expect(result.warnings).toContain('AI_BACKEND_URL');
      });
    });

    describe('edge cases', () => {
      it('should handle completely empty environment', () => {
        process.env = {};

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing.length).toBeGreaterThan(0);
      });

      it('should handle empty string values', () => {
        process.env.NODE_ENV = 'development';
        process.env.NEXTAUTH_SECRET = '';
        process.env.NEXTAUTH_URL = '';
        process.env.DATABASE_URL = '';
        process.env.TOKEN_ENCRYPTION_KEY = '';

        const result = validateEnv();

        expect(result.valid).toBe(false);
        expect(result.missing.length).toBeGreaterThan(0);
      });
    });
  });

  describe('logEnvValidation', () => {
    it('should be callable without errors', () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'a'.repeat(32);
      process.env.NEXTAUTH_URL = 'http://localhost:3000';
      process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
      process.env.TOKEN_ENCRYPTION_KEY = 'b'.repeat(32);

      expect(() => logEnvValidation()).not.toThrow();
    });
  });
});
