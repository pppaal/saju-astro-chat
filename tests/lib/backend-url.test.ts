// tests/lib/backend-url.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getBackendUrl, pickBackendUrl, getPublicBackendUrl } from '@/lib/backend-url';
import * as loggerModule from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('backend-url', () => {
  const originalEnv = process.env;
  const mockLogger = loggerModule.logger;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.AI_BACKEND_URL;
    delete process.env.BACKEND_AI_URL;
    delete process.env.NEXT_PUBLIC_AI_BACKEND;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getBackendUrl', () => {
    it('should return AI_BACKEND_URL when set', () => {
      process.env.AI_BACKEND_URL = 'https://api.example.com';
      expect(getBackendUrl()).toBe('https://api.example.com');
    });

    it('should fallback to BACKEND_AI_URL', () => {
      process.env.BACKEND_AI_URL = 'https://legacy.example.com';
      expect(getBackendUrl()).toBe('https://legacy.example.com');
    });

    it('should fallback to NEXT_PUBLIC_AI_BACKEND', () => {
      process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public.example.com';
      expect(getBackendUrl()).toBe('https://public.example.com');
    });

    it('should return localhost default when no env set', () => {
      expect(getBackendUrl()).toBe('http://localhost:5000');
    });

    it('should prefer AI_BACKEND_URL over others', () => {
      process.env.AI_BACKEND_URL = 'https://priority.com';
      process.env.BACKEND_AI_URL = 'https://legacy.com';
      process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public.com';
      expect(getBackendUrl()).toBe('https://priority.com');
    });

    it('should warn when using HTTP in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.AI_BACKEND_URL = 'http://insecure.com';
      
      getBackendUrl();
      
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Backend] Using non-HTTPS AI backend in production'
      );
    });

    it('should not warn for HTTPS in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.AI_BACKEND_URL = 'https://secure.com';
      
      getBackendUrl();
      
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('non-HTTPS')
      );
    });

    it('should warn when using deprecated BACKEND_AI_URL', async () => {
      vi.resetModules();
      process.env.BACKEND_AI_URL = 'https://legacy.com';

      const { getBackendUrl } = await import('@/lib/backend-url');
      getBackendUrl();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Backend] BACKEND_AI_URL is deprecated; use AI_BACKEND_URL'
      );
    });

    it('should warn when using public NEXT_PUBLIC_AI_BACKEND', async () => {
      vi.resetModules();
      process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public.com';

      const { getBackendUrl } = await import('@/lib/backend-url');
      getBackendUrl();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[Backend] NEXT_PUBLIC_AI_BACKEND is public; prefer AI_BACKEND_URL for security'
      );
    });

    it('should not warn when AI_BACKEND_URL is set', () => {
      process.env.AI_BACKEND_URL = 'https://proper.com';
      process.env.BACKEND_AI_URL = 'https://legacy.com';
      
      getBackendUrl();
      
      expect(mockLogger.warn).not.toHaveBeenCalledWith(
        expect.stringContaining('deprecated')
      );
    });
  });

  describe('pickBackendUrl (legacy)', () => {
    it('should be an alias for getBackendUrl', () => {
      expect(pickBackendUrl).toBe(getBackendUrl);
    });

    it('should work the same as getBackendUrl', () => {
      process.env.AI_BACKEND_URL = 'https://test.com';
      expect(pickBackendUrl()).toBe('https://test.com');
    });
  });

  describe('getPublicBackendUrl', () => {
    it('should return NEXT_PUBLIC_AI_BACKEND when set', () => {
      process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public.example.com';
      expect(getPublicBackendUrl()).toBe('https://public.example.com');
    });

    it('should return localhost default when not set', () => {
      expect(getPublicBackendUrl()).toBe('http://localhost:5000');
    });

    it('should ignore other backend env vars', () => {
      process.env.AI_BACKEND_URL = 'https://private.com';
      process.env.BACKEND_AI_URL = 'https://legacy.com';
      expect(getPublicBackendUrl()).toBe('http://localhost:5000');
    });

    it('should only use NEXT_PUBLIC_AI_BACKEND', () => {
      process.env.AI_BACKEND_URL = 'https://private.com';
      process.env.NEXT_PUBLIC_AI_BACKEND = 'https://public.com';
      expect(getPublicBackendUrl()).toBe('https://public.com');
    });
  });
});
