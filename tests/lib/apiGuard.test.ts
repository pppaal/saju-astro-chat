// tests/lib/apiGuard.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiGuard } from '@/lib/apiGuard';
import * as rateLimitModule from '@/lib/rateLimit';
import * as requestIpModule from '@/lib/request-ip';

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}));

describe('apiGuard', () => {
  const mockRateLimit = rateLimitModule.rateLimit as ReturnType<typeof vi.fn>;
  const mockGetClientIp = requestIpModule.getClientIp as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockRateLimit.mockResolvedValue({
      allowed: true,
      remaining: 59,
      reset: Date.now() + 60000,
      headers: new Headers({
        'X-RateLimit-Limit': '60',
        'X-RateLimit-Remaining': '59',
      }),
    });
  });

  afterEach(() => {
    delete process.env.TEST_API_TOKEN;
  });

  describe('Token Authentication', () => {
    it('should pass when no token is required', async () => {
      const req = new Request('http://localhost/api/test', {
        headers: new Headers(),
      });

      const result = await apiGuard(req, { path: '/test' });

      expect(result).toHaveProperty('headers');
      expect(result).not.toHaveProperty('status');
    });

    it('should pass when token matches (Bearer format)', async () => {
      process.env.TEST_API_TOKEN = 'secret123';

      const req = new Request('http://localhost/api/test', {
        headers: new Headers({
          'Authorization': 'Bearer secret123',
        }),
      });

      const result = await apiGuard(req, {
        path: '/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      expect(result).toHaveProperty('headers');
      expect(result).not.toHaveProperty('status');
    });

    it('should reject when token does not match', async () => {
      process.env.TEST_API_TOKEN = 'secret123';

      const req = new Request('http://localhost/api/test', {
        headers: new Headers({
          'Authorization': 'Bearer wrong-token',
        }),
      });

      const result = await apiGuard(req, {
        path: '/test',
        requireTokenEnv: 'TEST_API_TOKEN',
      });

      const json = await result.json();
      expect(result.status).toBe(401);
      expect(json).toEqual({ error: 'unauthorized' });
    });
  });

  describe('Rate Limiting', () => {
    it('should apply default rate limit', async () => {
      const req = new Request('http://localhost/api/test', {
        headers: new Headers(),
      });

      await apiGuard(req, { path: '/test' });

      expect(mockRateLimit).toHaveBeenCalledWith('api:/test:127.0.0.1', {
        limit: 60,
        windowSeconds: 60,
      });
    });

    it('should reject when rate limit is exceeded', async () => {
      mockRateLimit.mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: Date.now() + 30000,
        headers: new Headers({
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0',
        }),
      });

      const req = new Request('http://localhost/api/test', {
        headers: new Headers(),
      });

      const result = await apiGuard(req, { path: '/test' });

      const json = await result.json();
      expect(result.status).toBe(429);
      expect(json).toHaveProperty('error', 'rate_limited');
    });
  });
});
