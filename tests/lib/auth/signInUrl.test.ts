import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildSignInUrl, DEFAULT_SIGNIN_PATH } from '@/lib/auth/signInUrl';

describe('signInUrl', () => {
  describe('DEFAULT_SIGNIN_PATH', () => {
    it('should be /auth/signin', () => {
      expect(DEFAULT_SIGNIN_PATH).toBe('/auth/signin');
    });
  });

  describe('buildSignInUrl', () => {
    const originalWindow = global.window;

    afterEach(() => {
      global.window = originalWindow;
    });

    it('should return default path when no callback', () => {
      // @ts-ignore - mock window as undefined
      delete global.window;
      const result = buildSignInUrl();
      expect(result).toBe(DEFAULT_SIGNIN_PATH);
    });

    it('should build URL with callback', () => {
      const result = buildSignInUrl('/dashboard');
      expect(result).toContain(DEFAULT_SIGNIN_PATH);
      expect(result).toContain('callbackUrl=');
      // authRefresh is inside the encoded callbackUrl
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain('authRefresh=1');
    });

    it('should handle absolute URLs', () => {
      const result = buildSignInUrl('https://example.com/page');
      expect(result).toContain('callbackUrl=');
      // authRefresh is inside the encoded callbackUrl
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain('authRefresh=1');
    });

    it('should preserve existing query params', () => {
      const result = buildSignInUrl('/page?foo=bar');
      // foo=bar is inside the encoded callbackUrl
      const decoded = decodeURIComponent(result);
      expect(decoded).toContain('foo=bar');
      expect(decoded).toContain('authRefresh=1');
    });

    it('should not duplicate authRefresh param', () => {
      const result = buildSignInUrl('/page?authRefresh=1');
      const decoded = decodeURIComponent(result);
      const matches = decoded.match(/authRefresh/g);
      expect(matches?.length).toBe(1);
    });

    it('should encode callback URL', () => {
      const result = buildSignInUrl('/path with spaces');
      // Spaces are double-encoded: first to %20, then %20 becomes %2520 in callbackUrl param
      expect(result).toContain('%2520'); // Double-encoded space
    });
  });
});
