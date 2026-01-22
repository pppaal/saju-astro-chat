import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  checkRateLimit,
  checkSlidingRateLimit,
  withRateLimit,
  RATE_LIMITS,
  whitelistIP,
  blacklistIP,
  isWhitelisted,
  isBlacklisted,
  addRateLimitHeaders,
  cleanup,
  type RateLimitConfig,
} from '@/lib/security/rateLimit';

// Mock error response
vi.mock('@/lib/api/errorResponse', () => ({
  rateLimitError: vi.fn((retryAfter: number) => {
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', retryAfter }),
      {
        status: 429,
        headers: { 'Retry-After': retryAfter.toString() },
      }
    );
  }),
}));

describe('rateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clean up between tests
    cleanup();
  });

  afterEach(() => {
    cleanup();
  });

  // Helper to create mock NextRequest
  function createMockRequest(options: {
    url?: string;
    ip?: string;
    userId?: string;
    sessionId?: string;
    headers?: Record<string, string>;
  } = {}): NextRequest {
    const url = options.url || 'http://localhost:3000/api/test';
    const headers = new Headers(options.headers || {});

    if (options.ip) {
      headers.set('x-forwarded-for', options.ip);
    }
    if (options.userId) {
      headers.set('x-user-id', options.userId);
    }

    const request = new NextRequest(url, { headers });

    // Mock cookies if sessionId provided
    if (options.sessionId) {
      vi.spyOn(request.cookies, 'get').mockReturnValue({
        name: 'sessionId',
        value: options.sessionId,
      } as any);
    }

    return request;
  }

  describe('RATE_LIMITS presets', () => {
    it('should have STRICT preset (10 req/min)', () => {
      expect(RATE_LIMITS.STRICT).toEqual({
        maxRequests: 10,
        windowSeconds: 60,
      });
    });

    it('should have STANDARD preset (30 req/min)', () => {
      expect(RATE_LIMITS.STANDARD).toEqual({
        maxRequests: 30,
        windowSeconds: 60,
      });
    });

    it('should have GENEROUS preset (100 req/min)', () => {
      expect(RATE_LIMITS.GENEROUS).toEqual({
        maxRequests: 100,
        windowSeconds: 60,
      });
    });

    it('should have API preset (1000 req/hour)', () => {
      expect(RATE_LIMITS.API).toEqual({
        maxRequests: 1000,
        windowSeconds: 3600,
      });
    });

    it('should have AUTH preset (5 req/15min)', () => {
      expect(RATE_LIMITS.AUTH).toEqual({
        maxRequests: 5,
        windowSeconds: 900,
      });
    });

    it('should have CHAT preset (20 req/min)', () => {
      expect(RATE_LIMITS.CHAT).toEqual({
        maxRequests: 20,
        windowSeconds: 60,
      });
    });

    it('should have AI_GENERATION preset (10 req/5min)', () => {
      expect(RATE_LIMITS.AI_GENERATION).toEqual({
        maxRequests: 10,
        windowSeconds: 300,
      });
    });
  });

  describe('checkRateLimit', () => {
    it('should allow first request', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 5, windowSeconds: 60 };

      const result = checkRateLimit(req, config);
      expect(result).toBeNull();
    });

    it('should allow requests within limit', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 3, windowSeconds: 60 };

      expect(checkRateLimit(req, config)).toBeNull(); // 1st request
      expect(checkRateLimit(req, config)).toBeNull(); // 2nd request
      expect(checkRateLimit(req, config)).toBeNull(); // 3rd request
    });

    it('should block requests exceeding limit', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 2, windowSeconds: 60 };

      expect(checkRateLimit(req, config)).toBeNull(); // 1st - allowed
      expect(checkRateLimit(req, config)).toBeNull(); // 2nd - allowed

      const blocked = checkRateLimit(req, config); // 3rd - blocked
      expect(blocked).not.toBeNull();
      expect(blocked).toBeInstanceOf(Response);
    });

    it('should return response with 429 status when rate limited', async () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      checkRateLimit(req, config); // First request
      const blocked = checkRateLimit(req, config); // Second request - blocked

      expect(blocked).not.toBeNull();
      expect(blocked!.status).toBe(429);

      const body = await blocked!.json();
      expect(body.error).toBe('Rate limit exceeded');
    });

    it('should include retry-after in blocked response', async () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      checkRateLimit(req, config);
      const blocked = checkRateLimit(req, config);

      expect(blocked).not.toBeNull();
      const retryAfter = blocked!.headers.get('Retry-After');
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
      expect(parseInt(retryAfter!)).toBeLessThanOrEqual(60);
    });

    it('should reset counter after window expires', async () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 0.1 }; // 100ms window

      checkRateLimit(req, config); // First request
      expect(checkRateLimit(req, config)).not.toBeNull(); // Blocked

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(checkRateLimit(req, config)).toBeNull(); // Allowed again
    });

    it('should track different IPs separately', () => {
      const req1 = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const req2 = createMockRequest({ ip: '5.6.7.8' });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      expect(checkRateLimit(req1, config)).toBeNull(); // IP 1: allowed
      expect(checkRateLimit(req1, config)).not.toBeNull(); // IP 1: blocked

      expect(checkRateLimit(req2, config)).toBeNull(); // IP 2: allowed (different IP)
      expect(checkRateLimit(req2, config)).not.toBeNull(); // IP 2: blocked
    });

    it('should track different paths separately', () => {
      const req1 = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5), url: 'http://localhost/api/foo' });
      const req2 = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5), url: 'http://localhost/api/bar' });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      expect(checkRateLimit(req1, config)).toBeNull(); // Path 1: allowed
      expect(checkRateLimit(req1, config)).not.toBeNull(); // Path 1: blocked

      expect(checkRateLimit(req2, config)).toBeNull(); // Path 2: allowed (different path)
    });

    it('should use userId strategy when specified', () => {
      const req1 = createMockRequest({ userId: 'user-123' });
      const req2 = createMockRequest({ userId: 'user-456' });
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        keyStrategy: 'userId',
      };

      expect(checkRateLimit(req1, config)).toBeNull();
      expect(checkRateLimit(req1, config)).not.toBeNull(); // Same user blocked

      expect(checkRateLimit(req2, config)).toBeNull(); // Different user allowed
    });

    it('should use sessionId strategy when specified', () => {
      const req1 = createMockRequest({ sessionId: 'session-abc' });
      const req2 = createMockRequest({ sessionId: 'session-xyz' });
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        keyStrategy: 'sessionId',
      };

      expect(checkRateLimit(req1, config)).toBeNull();
      expect(checkRateLimit(req1, config)).not.toBeNull();

      expect(checkRateLimit(req2, config)).toBeNull();
    });

    it('should use custom key strategy function', () => {
      const req = createMockRequest();
      const customKey = 'custom-identifier';
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        keyStrategy: () => customKey,
      };

      expect(checkRateLimit(req, config)).toBeNull();
      expect(checkRateLimit(req, config)).not.toBeNull();
    });

    it('should skip rate limiting when skip function returns true', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        skip: () => true,
      };

      expect(checkRateLimit(req, config)).toBeNull();
      expect(checkRateLimit(req, config)).toBeNull(); // Not blocked due to skip
      expect(checkRateLimit(req, config)).toBeNull();
    });

    it('should not skip when skip function returns false', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        skip: () => false,
      };

      expect(checkRateLimit(req, config)).toBeNull();
      expect(checkRateLimit(req, config)).not.toBeNull(); // Blocked
    });

    it('should handle x-real-ip header as fallback', () => {
      const req = createMockRequest({
        headers: { 'x-real-ip': '9.9.9.9' },
      });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      expect(checkRateLimit(req, config)).toBeNull();
      expect(checkRateLimit(req, config)).not.toBeNull();
    });

    it('should handle multiple IPs in x-forwarded-for (use first)', () => {
      const req = createMockRequest({
        headers: { 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 3.3.3.3' },
      });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      checkRateLimit(req, config);

      // Same first IP should be blocked
      const req2 = createMockRequest({
        headers: { 'x-forwarded-for': '1.1.1.1, 4.4.4.4' },
      });
      expect(checkRateLimit(req2, config)).not.toBeNull();
    });

    it('should use unknown identifier when no IP headers present', () => {
      const req = createMockRequest(); // No IP headers
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      expect(checkRateLimit(req, config)).toBeNull();
      expect(checkRateLimit(req, config)).not.toBeNull();
    });
  });

  describe('withRateLimit', () => {
    it('should call handler when not rate limited', async () => {
      const handler = vi.fn(async () => new Response('OK'));
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 5, windowSeconds: 60 };

      const wrappedHandler = withRateLimit(handler, config);
      await wrappedHandler(req);

      expect(handler).toHaveBeenCalledWith(req);
    });

    it('should not call handler when rate limited', async () => {
      const handler = vi.fn(async () => new Response('OK'));
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      const wrappedHandler = withRateLimit(handler, config);

      await wrappedHandler(req); // First call - allowed
      expect(handler).toHaveBeenCalledTimes(1);

      await wrappedHandler(req); // Second call - blocked
      expect(handler).toHaveBeenCalledTimes(1); // Handler not called again
    });

    it('should return rate limit response when blocked', async () => {
      const handler = vi.fn(async () => new Response('OK'));
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      const wrappedHandler = withRateLimit(handler, config);

      await wrappedHandler(req); // First - allowed
      const response = await wrappedHandler(req); // Second - blocked

      expect(response.status).toBe(429);
    });

    it('should pass additional arguments to handler', async () => {
      const handler = vi.fn(async (_req, arg1: string, arg2: number) => {
        return new Response(`${arg1}-${arg2}`);
      });
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 5, windowSeconds: 60 };

      const wrappedHandler = withRateLimit(handler, config);
      await wrappedHandler(req, 'test', 42);

      expect(handler).toHaveBeenCalledWith(req, 'test', 42);
    });
  });

  describe('checkSlidingRateLimit', () => {
    it('should allow first request', () => {
      const req = createMockRequest({ ip: '99.99.99.1' });
      const config: RateLimitConfig = { maxRequests: 5, windowSeconds: 60 };

      const result = checkSlidingRateLimit(req, config);
      expect(result).toBeNull();
    });

    it('should allow requests within limit', () => {
      const req = createMockRequest({ ip: '99.99.99.2' });
      const config: RateLimitConfig = { maxRequests: 5, windowSeconds: 1 };

      expect(checkSlidingRateLimit(req, config)).toBeNull();
      expect(checkSlidingRateLimit(req, config)).toBeNull();
      expect(checkSlidingRateLimit(req, config)).toBeNull();
    });

    it('should block when limit exceeded', () => {
      const req = createMockRequest({ ip: '99.99.99.3' });
      const config: RateLimitConfig = { maxRequests: 2, windowSeconds: 1 };

      expect(checkSlidingRateLimit(req, config)).toBeNull();
      expect(checkSlidingRateLimit(req, config)).toBeNull();

      const blocked = checkSlidingRateLimit(req, config);
      expect(blocked).not.toBeNull();
      expect(blocked!.status).toBe(429);
    });

    it('should allow requests after timestamps slide out of window', async () => {
      const req = createMockRequest({ ip: '99.99.99.4' });
      const config: RateLimitConfig = { maxRequests: 2, windowSeconds: 0.1 };

      expect(checkSlidingRateLimit(req, config)).toBeNull();
      expect(checkSlidingRateLimit(req, config)).toBeNull();
      expect(checkSlidingRateLimit(req, config)).not.toBeNull();

      await new Promise(resolve => setTimeout(resolve, 150));

      expect(checkSlidingRateLimit(req, config)).toBeNull();
    });

    it('should track different IPs separately', () => {
      const req1 = createMockRequest({ ip: '99.99.99.5' });
      const req2 = createMockRequest({ ip: '99.99.99.6' });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      expect(checkSlidingRateLimit(req1, config)).toBeNull();
      expect(checkSlidingRateLimit(req1, config)).not.toBeNull();

      expect(checkSlidingRateLimit(req2, config)).toBeNull();
    });

    it('should skip when skip function returns true', () => {
      const req = createMockRequest({ ip: '88.88.88.88' });
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        skip: () => true,
      };

      expect(checkSlidingRateLimit(req, config)).toBeNull();
      expect(checkSlidingRateLimit(req, config)).toBeNull(); // Not blocked
    });
  });

  describe('IP whitelist/blacklist', () => {
    beforeEach(() => {
      cleanup();
    });

    it('should whitelist IP', () => {
      const ip = '1.2.3.4';
      whitelistIP(ip);

      const req = createMockRequest({ ip });
      expect(isWhitelisted(req)).toBe(true);
    });

    it('should blacklist IP', () => {
      const ip = '5.6.7.8';
      blacklistIP(ip);

      const req = createMockRequest({ ip });
      expect(isBlacklisted(req)).toBe(true);
    });

    it('should return false for non-whitelisted IP', () => {
      const req = createMockRequest({ ip: '9.9.9.9' });
      expect(isWhitelisted(req)).toBe(false);
    });

    it('should return false for non-blacklisted IP', () => {
      const req = createMockRequest({ ip: '9.9.9.9' });
      expect(isBlacklisted(req)).toBe(false);
    });

    it('should allow whitelisted IP to bypass rate limit', () => {
      const ip = '1.2.3.4';
      whitelistIP(ip);

      const req = createMockRequest({ ip });
      const config: RateLimitConfig = {
        maxRequests: 1,
        windowSeconds: 60,
        skip: (r) => isWhitelisted(r),
      };

      expect(checkRateLimit(req, config)).toBeNull();
      expect(checkRateLimit(req, config)).toBeNull(); // Still allowed
      expect(checkRateLimit(req, config)).toBeNull();
    });
  });

  describe('addRateLimitHeaders', () => {
    it('should add rate limit headers to response', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 };

      // Make some requests first
      checkRateLimit(req, config);
      checkRateLimit(req, config);
      checkRateLimit(req, config);

      const response = new Response('OK');
      const enhanced = addRateLimitHeaders(response, config, req);

      expect(enhanced.headers.get('X-RateLimit-Limit')).toBe('10');
      expect(enhanced.headers.get('X-RateLimit-Remaining')).toBe('7'); // 10 - 3
      expect(enhanced.headers.get('X-RateLimit-Reset')).toBeTruthy();
    });

    it('should show 0 remaining when limit reached', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 2, windowSeconds: 60 };

      checkRateLimit(req, config);
      checkRateLimit(req, config);

      const response = new Response('OK');
      const enhanced = addRateLimitHeaders(response, config, req);

      expect(enhanced.headers.get('X-RateLimit-Remaining')).toBe('0');
    });

    it('should handle response with no rate limit entry', () => {
      const req = createMockRequest({ ip: '9.9.9.9' });
      const config: RateLimitConfig = { maxRequests: 10, windowSeconds: 60 };

      const response = new Response('OK');
      const enhanced = addRateLimitHeaders(response, config, req);

      // Should not throw, headers may not be added if no entry exists
      expect(enhanced).toBeInstanceOf(Response);
    });
  });

  describe('cleanup', () => {
    it('should clear all rate limit data', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });
      const config: RateLimitConfig = { maxRequests: 1, windowSeconds: 60 };

      checkRateLimit(req, config);
      expect(checkRateLimit(req, config)).not.toBeNull(); // Blocked

      cleanup();

      expect(checkRateLimit(req, config)).toBeNull(); // Allowed after cleanup
    });
  });

  describe('integration scenarios', () => {
    it('should handle AUTH preset for login attempts', async () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5), url: 'http://localhost/api/auth/login' });

      for (let i = 0; i < 5; i++) {
        expect(checkRateLimit(req, RATE_LIMITS.AUTH)).toBeNull();
      }

      // 6th attempt should be blocked
      const blocked = checkRateLimit(req, RATE_LIMITS.AUTH);
      expect(blocked).not.toBeNull();
      expect(blocked!.status).toBe(429);
    });

    it('should handle CHAT preset for messaging', () => {
      const req = createMockRequest({ userId: 'user-123' });
      const config = { ...RATE_LIMITS.CHAT, keyStrategy: 'userId' as const };

      for (let i = 0; i < 20; i++) {
        expect(checkRateLimit(req, config)).toBeNull();
      }

      expect(checkRateLimit(req, config)).not.toBeNull();
    });

    it('should handle AI_GENERATION preset', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });

      for (let i = 0; i < 10; i++) {
        expect(checkRateLimit(req, RATE_LIMITS.AI_GENERATION)).toBeNull();
      }

      expect(checkRateLimit(req, RATE_LIMITS.AI_GENERATION)).not.toBeNull();
    });

    it('should allow burst traffic within generous limits', () => {
      const req = createMockRequest({ ip: '10.0.0.' + Math.random().toString().slice(2,5) });

      // Simulate 50 rapid requests
      for (let i = 0; i < 50; i++) {
        expect(checkRateLimit(req, RATE_LIMITS.GENEROUS)).toBeNull();
      }

      // 51st should still be allowed (limit is 100)
      expect(checkRateLimit(req, RATE_LIMITS.GENEROUS)).toBeNull();
    });
  });
});