/**
 * CSRF Protection Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateOrigin, csrfGuard } from '@/lib/security/csrf';

describe('CSRF Protection', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateOrigin', () => {
    it('should allow all requests in development mode', () => {
      process.env.NODE_ENV = 'development';
      const headers = new Headers();
      headers.set('host', 'localhost:3000');
      expect(validateOrigin(headers)).toBe(true);
    });

    it('should deny requests without origin/referer in production', () => {
      process.env.NODE_ENV = 'production';
      const headers = new Headers();
      expect(validateOrigin(headers)).toBe(false);
    });

    it('should allow requests with valid origin matching base URL', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const headers = new Headers();
      headers.set('origin', 'https://example.com');

      expect(validateOrigin(headers)).toBe(true);
    });

    it('should deny requests with mismatched origin', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const headers = new Headers();
      headers.set('origin', 'https://evil.com');

      expect(validateOrigin(headers)).toBe(false);
    });

    it('should allow requests from additional allowed origins', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';
      process.env.ALLOWED_ORIGINS = 'https://partner.com, https://cdn.example.com';

      const headers = new Headers();
      headers.set('origin', 'https://partner.com');

      expect(validateOrigin(headers)).toBe(true);
    });

    it('should allow requests with valid referer when origin is missing', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const headers = new Headers();
      headers.set('referer', 'https://example.com/some-page');

      expect(validateOrigin(headers)).toBe(true);
    });

    it('should deny requests with invalid referer', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const headers = new Headers();
      headers.set('referer', 'https://evil.com/phishing');

      expect(validateOrigin(headers)).toBe(false);
    });

    it('should handle malformed referer URLs gracefully', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'https://example.com';

      const headers = new Headers();
      headers.set('referer', 'not-a-valid-url');

      expect(validateOrigin(headers)).toBe(false);
    });

    it('should handle malformed base URL gracefully', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_BASE_URL = 'not-a-valid-url';

      const headers = new Headers();
      headers.set('origin', 'https://example.com');

      expect(validateOrigin(headers)).toBe(false);
    });

    it('should trim whitespace from additional origins', () => {
      process.env.NODE_ENV = 'production';
      process.env.ALLOWED_ORIGINS = '  https://partner.com  ,  https://cdn.example.com  ';

      const headers = new Headers();
      headers.set('origin', 'https://partner.com');

      expect(validateOrigin(headers)).toBe(true);
    });
  });

  describe('csrfGuard', () => {
    it('should return null for valid requests', () => {
      process.env.NODE_ENV = 'development';
      const headers = new Headers();
      headers.set('host', 'localhost:3000');

      const result = csrfGuard(headers);
      expect(result).toBeNull();
    });

    it('should return 403 Response for invalid requests', () => {
      process.env.NODE_ENV = 'production';
      const headers = new Headers();

      const result = csrfGuard(headers);
      expect(result).toBeInstanceOf(Response);
      expect(result?.status).toBe(403);
    });

    it('should return JSON error message for invalid requests', async () => {
      process.env.NODE_ENV = 'production';
      const headers = new Headers();

      const result = csrfGuard(headers);
      expect(result).not.toBeNull();

      const body = await result!.json();
      expect(body).toEqual({ error: 'csrf_validation_failed' });
    });

    it('should set correct content-type header', () => {
      process.env.NODE_ENV = 'production';
      const headers = new Headers();

      const result = csrfGuard(headers);
      expect(result?.headers.get('Content-Type')).toBe('application/json');
    });
  });
});
