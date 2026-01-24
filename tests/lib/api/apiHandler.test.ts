/**
 * API Handler Tests
 * API 핸들러 래퍼 테스트
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { z } from 'zod';
import { withApiHandler, withAuth, withRateLimit, withPublicApi } from '@/lib/api/apiHandler';

// Mock dependencies
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('@/lib/api/errorResponse', () => ({
  createSuccessResponse: vi.fn((data) => ({
    json: async () => ({ success: true, data }),
    status: 200,
  })),
  unauthorizedError: vi.fn((message) => ({
    json: async () => ({ success: false, error: message }),
    status: 401,
  })),
  rateLimitError: vi.fn((retryAfter) => ({
    json: async () => ({ success: false, error: 'Rate limit exceeded' }),
    status: 429,
    headers: { 'Retry-After': String(retryAfter) },
  })),
  internalError: vi.fn((message) => ({
    json: async () => ({ success: false, error: message || 'Internal server error' }),
    status: 500,
  })),
  validationError: vi.fn((message, details) => ({
    json: async () => ({ success: false, error: message, ...details }),
    status: 400,
  })),
}));

vi.mock('@/lib/api/zodValidation', () => ({
  validateRequestBody: vi.fn(),
}));

import { rateLimit } from '@/lib/rateLimit';
import { getServerSession } from 'next-auth';
import { validateRequestBody } from '@/lib/api/zodValidation';
import {
  createSuccessResponse,
  unauthorizedError,
  rateLimitError,
  internalError,
  validationError,
} from '@/lib/api/errorResponse';

describe('ApiHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit allowed
    (rateLimit as Mock).mockResolvedValue({
      allowed: true,
      headers: new Map(),
    });
    // Default: no session
    (getServerSession as Mock).mockResolvedValue(null);
    // Default: validation success
    (validateRequestBody as Mock).mockResolvedValue({
      success: true,
      data: {},
    });
  });

  // Helper to create mock Request
  const createMockRequest = (options: {
    method?: string;
    url?: string;
    body?: unknown;
    headers?: Record<string, string>;
  } = {}) => {
    const { method = 'POST', url = 'http://localhost/api/test', body, headers = {} } = options;
    return new Request(url, {
      method,
      headers: new Headers(headers),
      body: body ? JSON.stringify(body) : undefined,
    });
  };

  describe('withApiHandler', () => {
    describe('basic functionality', () => {
      it('should execute handler and return success response', async () => {
        const handler = vi.fn().mockResolvedValue({ message: 'success' });
        const wrappedHandler = withApiHandler({}, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(handler).toHaveBeenCalled();
        expect(createSuccessResponse).toHaveBeenCalledWith({ message: 'success' });
      });

      it('should pass context to handler', async () => {
        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({}, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        const context = handler.mock.calls[0][0];
        expect(context).toHaveProperty('body');
        expect(context).toHaveProperty('query');
        expect(context).toHaveProperty('request');
        expect(context).toHaveProperty('session');
        expect(context).toHaveProperty('ip');
      });

      it('should include IP address in context', async () => {
        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({}, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        const context = handler.mock.calls[0][0];
        expect(context.ip).toBe('127.0.0.1');
      });
    });

    describe('rate limiting', () => {
      it('should apply rate limiting when configured', async () => {
        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler(
          {
            rateLimit: { key: 'test', limit: 10, windowSeconds: 60 },
          },
          handler
        );
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(rateLimit).toHaveBeenCalledWith('test:127.0.0.1', {
          limit: 10,
          windowSeconds: 60,
        });
      });

      it('should return rate limit error when limit exceeded', async () => {
        (rateLimit as Mock).mockResolvedValue({
          allowed: false,
          retryAfter: 30,
          headers: new Map(),
        });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler(
          {
            rateLimit: { key: 'test', limit: 10, windowSeconds: 60 },
          },
          handler
        );
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(rateLimitError).toHaveBeenCalledWith(30);
        expect(handler).not.toHaveBeenCalled();
      });

      it('should use default retry after of 60 when not provided', async () => {
        (rateLimit as Mock).mockResolvedValue({
          allowed: false,
          headers: new Map(),
        });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler(
          {
            rateLimit: { key: 'test', limit: 10, windowSeconds: 60 },
          },
          handler
        );
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(rateLimitError).toHaveBeenCalledWith(60);
      });
    });

    describe('authentication', () => {
      it('should require auth when requireAuth is true', async () => {
        (getServerSession as Mock).mockResolvedValue(null);

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ requireAuth: true }, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(unauthorizedError).toHaveBeenCalledWith(
          'You must be logged in to access this resource'
        );
        expect(handler).not.toHaveBeenCalled();
      });

      it('should allow authenticated requests', async () => {
        (getServerSession as Mock).mockResolvedValue({
          user: { id: 'user-123', email: 'test@example.com' },
        });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ requireAuth: true }, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(handler).toHaveBeenCalled();
      });

      it('should pass session to handler context', async () => {
        const mockSession = { user: { id: 'user-123' } };
        (getServerSession as Mock).mockResolvedValue(mockSession);

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({}, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        const context = handler.mock.calls[0][0];
        expect(context.session).toEqual(mockSession);
      });
    });

    describe('body validation', () => {
      it('should validate request body with provided schema', async () => {
        const schema = z.object({ name: z.string() });
        (validateRequestBody as Mock).mockResolvedValue({
          success: true,
          data: { name: 'test' },
        });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ bodySchema: schema }, handler);
        const request = createMockRequest({ body: { name: 'test' } });

        await wrappedHandler(request);

        expect(validateRequestBody).toHaveBeenCalled();
        expect(handler).toHaveBeenCalled();
      });

      it('should return validation error for invalid body', async () => {
        const schema = z.object({ name: z.string() });
        (validateRequestBody as Mock).mockResolvedValue({
          success: false,
          errors: [{ path: 'name', message: 'Required' }],
        });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ bodySchema: schema }, handler);
        const request = createMockRequest({ body: {} });

        await wrappedHandler(request);

        expect(validationError).toHaveBeenCalledWith('Request validation failed', {
          errors: [{ path: 'name', message: 'Required' }],
        });
        expect(handler).not.toHaveBeenCalled();
      });

      it('should pass validated body to handler', async () => {
        const schema = z.object({ name: z.string() });
        (validateRequestBody as Mock).mockResolvedValue({
          success: true,
          data: { name: 'validated-name' },
        });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ bodySchema: schema }, handler);
        const request = createMockRequest({ body: { name: 'test' } });

        await wrappedHandler(request);

        const context = handler.mock.calls[0][0];
        expect(context.body).toEqual({ name: 'validated-name' });
      });
    });

    describe('query validation', () => {
      it('should validate query parameters with provided schema', async () => {
        const schema = z.object({ page: z.string() });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ querySchema: schema }, handler);
        const request = createMockRequest({ url: 'http://localhost/api/test?page=1' });

        await wrappedHandler(request);

        expect(handler).toHaveBeenCalled();
      });

      it('should return validation error for invalid query params', async () => {
        const schema = z.object({ page: z.number() });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ querySchema: schema }, handler);
        const request = createMockRequest({ url: 'http://localhost/api/test?page=invalid' });

        await wrappedHandler(request);

        expect(validationError).toHaveBeenCalled();
        expect(handler).not.toHaveBeenCalled();
      });

      it('should pass validated query to handler', async () => {
        const schema = z.object({ page: z.string().optional() });

        const handler = vi.fn().mockResolvedValue({});
        const wrappedHandler = withApiHandler({ querySchema: schema }, handler);
        const request = createMockRequest({ url: 'http://localhost/api/test?page=5' });

        await wrappedHandler(request);

        const context = handler.mock.calls[0][0];
        expect(context.query).toEqual({ page: '5' });
      });
    });

    describe('error handling', () => {
      it('should catch and handle Error instances', async () => {
        const handler = vi.fn().mockRejectedValue(new Error('Something went wrong'));
        const wrappedHandler = withApiHandler({}, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(internalError).toHaveBeenCalledWith('Something went wrong', expect.anything());
      });

      it('should handle non-Error exceptions', async () => {
        const handler = vi.fn().mockRejectedValue('string error');
        const wrappedHandler = withApiHandler({}, handler);
        const request = createMockRequest();

        await wrappedHandler(request);

        expect(internalError).toHaveBeenCalledWith();
      });
    });
  });

  describe('withAuth', () => {
    it('should create handler with requireAuth: true', async () => {
      (getServerSession as Mock).mockResolvedValue(null);

      const handler = vi.fn().mockResolvedValue({});
      const wrappedHandler = withAuth({}, handler);
      const request = createMockRequest();

      await wrappedHandler(request);

      expect(unauthorizedError).toHaveBeenCalled();
    });

    it('should pass other options through', async () => {
      (getServerSession as Mock).mockResolvedValue({ user: { id: '123' } });

      const handler = vi.fn().mockResolvedValue({});
      const wrappedHandler = withAuth(
        {
          rateLimit: { key: 'auth-test', limit: 5, windowSeconds: 30 },
        },
        handler
      );
      const request = createMockRequest();

      await wrappedHandler(request);

      expect(rateLimit).toHaveBeenCalledWith('auth-test:127.0.0.1', {
        limit: 5,
        windowSeconds: 30,
      });
    });
  });

  describe('withRateLimit', () => {
    it('should create handler with rate limiting', async () => {
      const handler = vi.fn().mockResolvedValue({});
      const wrappedHandler = withRateLimit(
        { key: 'rate-test', limit: 20, windowSeconds: 120 },
        handler
      );
      const request = createMockRequest();

      await wrappedHandler(request);

      expect(rateLimit).toHaveBeenCalledWith('rate-test:127.0.0.1', {
        limit: 20,
        windowSeconds: 120,
      });
    });
  });

  describe('withPublicApi', () => {
    it('should apply default rate limiting', async () => {
      const handler = vi.fn().mockResolvedValue({});
      const wrappedHandler = withPublicApi({}, handler);
      const request = createMockRequest();

      await wrappedHandler(request);

      expect(rateLimit).toHaveBeenCalledWith('public-api:127.0.0.1', {
        limit: 60,
        windowSeconds: 60,
      });
    });

    it('should allow custom rate limiting', async () => {
      const handler = vi.fn().mockResolvedValue({});
      const wrappedHandler = withPublicApi(
        {
          rateLimit: { key: 'custom-public', limit: 100, windowSeconds: 30 },
        },
        handler
      );
      const request = createMockRequest();

      await wrappedHandler(request);

      expect(rateLimit).toHaveBeenCalledWith('custom-public:127.0.0.1', {
        limit: 100,
        windowSeconds: 30,
      });
    });

    it('should not require authentication', async () => {
      (getServerSession as Mock).mockResolvedValue(null);

      const handler = vi.fn().mockResolvedValue({});
      const wrappedHandler = withPublicApi({}, handler);
      const request = createMockRequest();

      await wrappedHandler(request);

      expect(handler).toHaveBeenCalled();
      expect(unauthorizedError).not.toHaveBeenCalled();
    });
  });
});
