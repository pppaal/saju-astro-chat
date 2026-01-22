/**
 * Comprehensive tests for src/lib/apiGuard.ts
 * Tests API guard middleware with token and rate limiting
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGuard } from '@/lib/apiGuard';

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}));

import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';

describe('apiGuard', () => {
  const createRequest = (options: {
    authorization?: string;
    apiKey?: string;
    url?: string;
  } = {}): Request => {
    const headers = new Headers();
    if (options.authorization) {
      headers.set('authorization', options.authorization);
    }
    if (options.apiKey) {
      headers.set('x-api-key', options.apiKey);
    }
    return new Request(options.url || 'https://example.com/api/test', {
      method: 'POST',
      headers,
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PUBLIC_API_TOKEN;
    delete process.env.PRIVATE_API_TOKEN;

    // Default mock implementations
    vi.mocked(getClientIp).mockReturnValue('127.0.0.1');
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 59,
      reset: 60,
      headers: new Headers(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rate limiting', () => {
    it('should allow request when rate limit is not exceeded', async () => {
      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result).toHaveProperty('headers');
      expect(result).not.toHaveProperty('status');
    });

    it('should call rateLimit with correct path and IP', async () => {
      vi.mocked(getClientIp).mockReturnValue('192.168.1.1');
      const req = createRequest();

      await apiGuard(req, { path: '/test' });

      expect(rateLimit).toHaveBeenCalledWith(
        'api:/test:192.168.1.1',
        expect.objectContaining({ limit: 60, windowSeconds: 60 })
      );
    });

    it('should use default limit of 60 requests', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test' });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 60 })
      );
    });

    it('should use default window of 60 seconds', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test' });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ windowSeconds: 60 })
      );
    });

    it('should use custom limit when provided', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test', limit: 100 });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should use custom window when provided', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test', windowSeconds: 300 });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ windowSeconds: 300 })
      );
    });

    it('should return 429 when rate limit exceeded', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 60,
        headers: new Headers({ 'X-RateLimit-Remaining': '0' }),
      });

      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result.status).toBe(429);
      const json = await result.json();
      expect(json.error).toBe('rate_limited');
      expect(json.retryAfter).toBe(60);
    });

    it('should include rate limit headers in 429 response', async () => {
      const rateLimitHeaders = new Headers({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': '1234567890',
      });

      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 60,
        headers: rateLimitHeaders,
      });

      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result.headers.get('X-RateLimit-Limit')).toBe('60');
      expect(result.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(result.headers.get('X-RateLimit-Reset')).toBe('1234567890');
    });

    it('should return headers on success', async () => {
      const successHeaders = new Headers({
        'X-RateLimit-Remaining': '59',
      });

      vi.mocked(rateLimit).mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: 60,
        headers: successHeaders,
      });

      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result.headers.get('X-RateLimit-Remaining')).toBe('59');
    });
  });

  describe('Token authentication', () => {
    it('should allow request when no token required', async () => {
      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result).toHaveProperty('headers');
    });

    it('should allow request when token env var not set', async () => {
      const req = createRequest();
      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should validate Bearer token when env var is set', async () => {
      process.env.PUBLIC_API_TOKEN = 'secret-token-123';
      const req = createRequest({ authorization: 'Bearer secret-token-123' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should reject invalid Bearer token', async () => {
      process.env.PUBLIC_API_TOKEN = 'secret-token-123';
      const req = createRequest({ authorization: 'Bearer wrong-token' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
      const json = await result.json();
      expect(json.error).toBe('unauthorized');
    });

    it('should validate X-API-Key header', async () => {
      process.env.PUBLIC_API_TOKEN = 'api-key-123';
      const req = createRequest({ apiKey: 'api-key-123' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should reject invalid X-API-Key', async () => {
      process.env.PUBLIC_API_TOKEN = 'api-key-123';
      const req = createRequest({ apiKey: 'wrong-key' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
    });

    it('should reject request with no token when required', async () => {
      process.env.PUBLIC_API_TOKEN = 'secret-token';
      const req = createRequest();

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
    });

    it('should handle Bearer with different casing', async () => {
      process.env.PUBLIC_API_TOKEN = 'token-123';
      const req = createRequest({ authorization: 'BEARER token-123' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should handle bearer with lowercase', async () => {
      process.env.PUBLIC_API_TOKEN = 'token-123';
      const req = createRequest({ authorization: 'bearer token-123' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should trim whitespace from Bearer token', async () => {
      process.env.PUBLIC_API_TOKEN = 'token-123';
      const req = createRequest({ authorization: 'Bearer   token-123   ' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should prefer Bearer token over X-API-Key', async () => {
      process.env.PUBLIC_API_TOKEN = 'correct-token';
      const req = createRequest({
        authorization: 'Bearer correct-token',
        apiKey: 'wrong-key',
      });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should fallback to X-API-Key when no Bearer token', async () => {
      process.env.PUBLIC_API_TOKEN = 'api-key';
      const req = createRequest({ apiKey: 'api-key' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should work with different env var names', async () => {
      process.env.PRIVATE_API_TOKEN = 'private-token';
      const req = createRequest({ authorization: 'Bearer private-token' });

      const result = await apiGuard(req, {
        path: '/test',
        requireTokenEnv: 'PRIVATE_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
    });
  });

  describe('IP extraction', () => {
    it('should get client IP from headers', async () => {
      vi.mocked(getClientIp).mockReturnValue('192.168.1.100');
      const req = createRequest();

      await apiGuard(req, { path: '/test' });

      expect(getClientIp).toHaveBeenCalledWith(req.headers);
      expect(rateLimit).toHaveBeenCalledWith(
        expect.stringContaining('192.168.1.100'),
        expect.any(Object)
      );
    });

    it('should handle different IP addresses', async () => {
      const ips = [
        '127.0.0.1',
        '192.168.1.1',
        '10.0.0.1',
        '172.16.0.1',
        '203.0.113.1',
        '2001:db8::1',
      ];

      for (const ip of ips) {
        vi.mocked(getClientIp).mockReturnValue(ip);
        const req = createRequest();

        await apiGuard(req, { path: '/test' });

        expect(rateLimit).toHaveBeenCalledWith(
          expect.stringContaining(ip),
          expect.any(Object)
        );
      }
    });
  });

  describe('Path-based rate limiting', () => {
    it('should create separate rate limit keys for different paths', async () => {
      vi.mocked(getClientIp).mockReturnValue('127.0.0.1');

      const paths = ['/api/v1', '/api/v2', '/test', '/production'];

      for (const path of paths) {
        const req = createRequest();
        await apiGuard(req, { path });

        expect(rateLimit).toHaveBeenCalledWith(
          `api:${path}:127.0.0.1`,
          expect.any(Object)
        );
      }
    });

    it('should handle paths with special characters', async () => {
      vi.mocked(getClientIp).mockReturnValue('127.0.0.1');
      const req = createRequest();

      await apiGuard(req, { path: '/api/test-endpoint_v2' });

      expect(rateLimit).toHaveBeenCalledWith(
        'api:/api/test-endpoint_v2:127.0.0.1',
        expect.any(Object)
      );
    });

    it('should handle empty path', async () => {
      vi.mocked(getClientIp).mockReturnValue('127.0.0.1');
      const req = createRequest();

      await apiGuard(req, { path: '' });

      expect(rateLimit).toHaveBeenCalledWith('api::127.0.0.1', expect.any(Object));
    });
  });

  describe('Combined authentication and rate limiting', () => {
    it('should check token before rate limiting', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest({ authorization: 'Bearer wrong' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
      expect(rateLimit).not.toHaveBeenCalled();
    });

    it('should check rate limit after successful token validation', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest({ authorization: 'Bearer token' });

      await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(rateLimit).toHaveBeenCalled();
    });

    it('should return 429 even with valid token when rate limited', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 60,
        headers: new Headers(),
      });

      const req = createRequest({ authorization: 'Bearer token' });
      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(429);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty authorization header', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest({ authorization: '' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
    });

    it('should handle authorization header without Bearer prefix', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest({ authorization: 'token' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
    });

    it('should handle Bearer with no token', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest({ authorization: 'Bearer' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
    });

    it('should handle Bearer with only whitespace', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest({ authorization: 'Bearer    ' });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result.status).toBe(401);
    });

    it('should handle very long tokens', async () => {
      const longToken = 'a'.repeat(1000);
      process.env.PUBLIC_API_TOKEN = longToken;
      const req = createRequest({ authorization: `Bearer ${longToken}` });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should handle tokens with special characters', async () => {
      process.env.PUBLIC_API_TOKEN = 'token!@#$%^&*()_+-=[]{}|;:,.<>?';
      const req = createRequest({
        authorization: 'Bearer token!@#$%^&*()_+-=[]{}|;:,.<>?',
      });

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('headers');
    });

    it('should handle zero rate limit', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test', limit: 0 });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 0 })
      );
    });

    it('should handle very high rate limit', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test', limit: 1000000 });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 1000000 })
      );
    });

    it('should handle very short window', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test', windowSeconds: 1 });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ windowSeconds: 1 })
      );
    });

    it('should handle very long window', async () => {
      const req = createRequest();
      await apiGuard(req, { path: '/test', windowSeconds: 86400 });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ windowSeconds: 86400 })
      );
    });
  });

  describe('Return value structure', () => {
    it('should return object with headers on success', async () => {
      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result).toHaveProperty('headers');
      expect(result.headers).toBeInstanceOf(Headers);
    });

    it('should return NextResponse on token failure', async () => {
      process.env.PUBLIC_API_TOKEN = 'token';
      const req = createRequest();

      const result = await apiGuard(req, { path: '/test', requireTokenEnv: 'PUBLIC_API_TOKEN' });

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('json');
    });

    it('should return NextResponse on rate limit failure', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: 60,
        headers: new Headers(),
      });

      const req = createRequest();
      const result = await apiGuard(req, { path: '/test' });

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('json');
    });
  });

  describe('Real-world scenarios', () => {
    it('should handle authenticated streaming endpoint', async () => {
      process.env.STREAM_API_TOKEN = 'stream-token';
      vi.mocked(getClientIp).mockReturnValue('203.0.113.1');

      const req = createRequest({ authorization: 'Bearer stream-token' });

      const result = await apiGuard(req, {
        path: '/api/stream',
        limit: 10,
        windowSeconds: 60,
        requireTokenEnv: 'STREAM_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
      expect(rateLimit).toHaveBeenCalledWith(
        'api:/api/stream:203.0.113.1',
        expect.objectContaining({ limit: 10, windowSeconds: 60 })
      );
    });

    it('should handle public endpoint with higher rate limit', async () => {
      const req = createRequest();

      await apiGuard(req, {
        path: '/api/public',
        limit: 100,
        windowSeconds: 60,
      });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 100 })
      );
    });

    it('should handle premium endpoint with lower rate limit', async () => {
      process.env.PREMIUM_API_TOKEN = 'premium-token';
      const req = createRequest({ authorization: 'Bearer premium-token' });

      await apiGuard(req, {
        path: '/api/premium',
        limit: 1000,
        windowSeconds: 60,
        requireTokenEnv: 'PREMIUM_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
    });

    it('should handle burst protection with short window', async () => {
      const req = createRequest();

      await apiGuard(req, {
        path: '/api/burst',
        limit: 5,
        windowSeconds: 10,
      });

      expect(rateLimit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 5, windowSeconds: 10 })
      );
    });
  });
});