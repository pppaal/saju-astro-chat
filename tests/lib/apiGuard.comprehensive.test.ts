/**
 * Comprehensive Tests for API Guard
 * src/lib/apiGuard.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGuard } from '@/lib/apiGuard';

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '192.168.1.1'),
}));

import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';

const mockRateLimit = vi.mocked(rateLimit);
const mockGetClientIp = vi.mocked(getClientIp);

describe('apiGuard', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('rate limiting', () => {
    it('should allow request within rate limit', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers({
          'X-RateLimit-Remaining': '59',
        }),
      });

      const req = new Request('https://example.com/api/test');
      const result = await apiGuard(req, { path: '/api/test' });

      expect(result).toHaveProperty('headers');
      expect(result).not.toHaveProperty('status');
    });

    it('should reject request exceeding rate limit', async () => {
      const resetTime = Date.now() + 60000;
      mockRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: resetTime,
        headers: new Headers({
          'X-RateLimit-Remaining': '0',
          'Retry-After': '60',
        }),
      });

      const req = new Request('https://example.com/api/test');
      const result = await apiGuard(req, { path: '/api/test' });

      expect(result.status).toBe(429);
      const body = await result.json();
      expect(body.error).toBe('rate_limited');
      expect(body.retryAfter).toBe(resetTime);
    });

    it('should use custom rate limit settings', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 99,
        reset: Date.now() + 120000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test');
      await apiGuard(req, {
        path: '/api/test',
        limit: 100,
        windowSeconds: 120,
      });

      expect(mockRateLimit).toHaveBeenCalledWith(
        'api:/api/test:192.168.1.1',
        { limit: 100, windowSeconds: 120 }
      );
    });

    it('should use default rate limit values', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test');
      await apiGuard(req, { path: '/api/test' });

      expect(mockRateLimit).toHaveBeenCalledWith(
        'api:/api/test:192.168.1.1',
        { limit: 60, windowSeconds: 60 }
      );
    });

    it('should include IP in rate limit key', async () => {
      mockGetClientIp.mockReturnValue('10.0.0.5');
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test');
      await apiGuard(req, { path: '/api/special' });

      expect(mockRateLimit).toHaveBeenCalledWith(
        'api:/api/special:10.0.0.5',
        expect.any(Object)
      );
    });
  });

  describe('token authentication', () => {
    it('should pass when no token required', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test');
      const result = await apiGuard(req, { path: '/api/test' });

      expect(result).toHaveProperty('headers');
    });

    it('should pass when token matches Bearer format', async () => {
      process.env.TEST_API_TOKEN = 'secret-token-123';
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test', {
        headers: {
          authorization: 'Bearer secret-token-123',
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
    });

    it('should pass when token matches x-api-key header', async () => {
      process.env.TEST_API_TOKEN = 'secret-token-123';
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test', {
        headers: {
          'x-api-key': 'secret-token-123',
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
    });

    it('should reject unauthorized request', async () => {
      process.env.TEST_API_TOKEN = 'secret-token-123';

      const req = new Request('https://example.com/api/test', {
        headers: {
          authorization: 'Bearer wrong-token',
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result.status).toBe(401);
      const body = await result.json();
      expect(body.error).toBe('unauthorized');
    });

    it('should reject request without any token', async () => {
      process.env.TEST_API_TOKEN = 'secret-token-123';

      const req = new Request('https://example.com/api/test');
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result.status).toBe(401);
    });

    it('should skip token check when env var not set', async () => {
      delete process.env.OPTIONAL_TOKEN;
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test');
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'OPTIONAL_TOKEN',
      });

      // Should not fail even without token
      expect(result).toHaveProperty('headers');
    });

    it('should handle bearer token case insensitively', async () => {
      process.env.TEST_API_TOKEN = 'secret-token';
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test', {
        headers: {
          authorization: 'BEARER secret-token',
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
    });
  });

  describe('response headers', () => {
    it('should include rate limit headers in response', async () => {
      const mockHeaders = new Headers({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '59',
        'X-RateLimit-Reset': '1700000000',
      });

      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: 1700000000,
        headers: mockHeaders,
      });

      const req = new Request('https://example.com/api/test');
      const result = await apiGuard(req, { path: '/api/test' });

      expect(result.headers).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle empty authorization header', async () => {
      process.env.TEST_API_TOKEN = 'secret-token';

      const req = new Request('https://example.com/api/test', {
        headers: {
          authorization: '',
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result.status).toBe(401);
    });

    it('should handle malformed bearer token', async () => {
      process.env.TEST_API_TOKEN = 'secret-token';

      const req = new Request('https://example.com/api/test', {
        headers: {
          authorization: 'Bearer', // No token after Bearer
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result.status).toBe(401);
    });

    it('should prefer authorization header over x-api-key', async () => {
      process.env.TEST_API_TOKEN = 'correct-token';
      mockRateLimit.mockResolvedValue({
        allowed: true,
        remaining: 59,
        reset: Date.now() + 60000,
        headers: new Headers(),
      });

      const req = new Request('https://example.com/api/test', {
        headers: {
          authorization: 'Bearer correct-token',
          'x-api-key': 'wrong-token',
        },
      });
      const result = await apiGuard(req, {
        path: '/api/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
    });
  });
});
