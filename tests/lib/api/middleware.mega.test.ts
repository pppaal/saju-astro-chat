/**
 * API Middleware MEGA Test Suite
 * Comprehensive testing for API middleware and guards
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  extractLocale,
  initializeApiContext,
  withApiMiddleware,
  parseJsonBody,
  validateRequired,
  apiError,
  apiSuccess,
  createPublicStreamGuard,
  createAuthenticatedGuard,
  createSimpleGuard,
  ErrorCodes,
} from '@/lib/api/middleware';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/authOptions', () => ({
  authOptions: {},
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(),
}));

vi.mock('@/lib/auth/publicToken', () => ({
  requirePublicToken: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/credits', () => ({
  checkAndConsumeCredits: vi.fn(),
}));

import { getServerSession } from 'next-auth';
import { rateLimit } from '@/lib/rateLimit';
import { getClientIp } from '@/lib/request-ip';
import { requirePublicToken } from '@/lib/auth/publicToken';
import { checkAndConsumeCredits } from '@/lib/credits';

// Test constants
const TEST_CONSTANTS = {
  IP: {
    DEFAULT: '127.0.0.1',
    CUSTOM: '192.168.1.1',
  },
  RATE_LIMIT: {
    REMAINING: 10,
    RETRY_AFTER: 30,
    PUBLIC_LIMIT: 30,
    AUTH_LIMIT: 60,
    SIMPLE_LIMIT: 60,
    WINDOW_SECONDS: 60,
  },
  CREDITS: {
    REMAINING: 10,
    AMOUNT: 1,
  },
  USER_ID: 'user-123',
  EMAIL: 'test@example.com',
} as const;

// Mock user session types
type MockSession = {
  user: {
    id: string;
    email?: string;
    plan?: 'free' | 'premium';
  };
};

// Helper functions
const createRequest = (path = '/api/test', init?: RequestInit): NextRequest => {
  return new NextRequest(`http://localhost${path}`, init);
};

const createMockSession = (overrides?: Partial<MockSession['user']>): MockSession => {
  return {
    user: {
      id: TEST_CONSTANTS.USER_ID,
      ...overrides,
    },
  };
};

describe('middleware MEGA - extractLocale', () => {
  it.each([
    ['ko', 'ko-KR,ko;q=0.9', 'Accept-Language'],
    ['ja', 'ja-JP,ja;q=0.9', 'Accept-Language'],
    ['zh', 'zh-CN,zh;q=0.9', 'Accept-Language'],
  ])('should extract %s from %s', (expected, header) => {
    const req = new Request('http://localhost', {
      headers: { 'accept-language': header },
    });
    expect(extractLocale(req)).toBe(expected);
  });

  it('should default to en', () => {
    const req = new Request('http://localhost');
    expect(extractLocale(req)).toBe('en');
  });

  it.each([
    ['ko', '?locale=ko'],
    ['ja', '?locale=ja'],
    ['zh', '?locale=zh'],
  ])('should extract %s from URL query %s', (expected, query) => {
    const req = new Request(`http://localhost${query}`);
    expect(extractLocale(req)).toBe(expected);
  });

  it('should detect first matching locale (ko from header)', () => {
    const req = new Request('http://localhost?locale=ja', {
      headers: { 'accept-language': 'ko-KR' },
    });
    // Current implementation checks ko first, so ko from header is returned
    expect(extractLocale(req)).toBe('ko');
  });

  it('should handle missing Accept-Language header', () => {
    const req = new Request('http://localhost');
    expect(extractLocale(req)).toBe('en');
  });

  it('should handle partial ko in Accept-Language', () => {
    const req = new Request('http://localhost', {
      headers: { 'accept-language': 'en-US,ko;q=0.5' },
    });
    expect(extractLocale(req)).toBe('ko');
  });
});

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClientIp).mockReturnValue(TEST_CONSTANTS.IP.DEFAULT);
  vi.mocked(getServerSession).mockResolvedValue(null);
  vi.mocked(rateLimit).mockResolvedValue({
    allowed: true,
    remaining: TEST_CONSTANTS.RATE_LIMIT.REMAINING
  });
  vi.mocked(requirePublicToken).mockReturnValue({ valid: true });
});

describe('middleware MEGA - initializeApiContext', () => {
  it('should initialize basic context', async () => {
    const req = createRequest();
    const { context } = await initializeApiContext(req);

    expect(context.ip).toBe(TEST_CONSTANTS.IP.DEFAULT);
    expect(context.locale).toBe('en');
    expect(context.isAuthenticated).toBe(false);
  });

  it('should extract IP from headers', async () => {
    vi.mocked(getClientIp).mockReturnValue(TEST_CONSTANTS.IP.CUSTOM);
    const req = createRequest();
    const { context } = await initializeApiContext(req);

    expect(context.ip).toBe(TEST_CONSTANTS.IP.CUSTOM);
  });

  it('should handle unknown IP', async () => {
    vi.mocked(getClientIp).mockReturnValue(null);
    const req = createRequest();
    const { context } = await initializeApiContext(req);

    expect(context.ip).toBe('unknown');
  });

  it('should apply rate limiting', async () => {
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: false,
      retryAfter: TEST_CONSTANTS.RATE_LIMIT.RETRY_AFTER,
      remaining: 0,
    });

    const req = createRequest();
    const { error } = await initializeApiContext(req, {
      rateLimit: { limit: 10, windowSeconds: TEST_CONSTANTS.RATE_LIMIT.WINDOW_SECONDS },
    });

    expect(error).toBeDefined();
    expect(error?.status).toBe(429);
  });

  it('should validate token when required', async () => {
    vi.mocked(requirePublicToken).mockReturnValue({
      valid: false,
      reason: 'Invalid token',
    });

    const req = createRequest();
    const { error } = await initializeApiContext(req, {
      requireToken: true,
    });

    expect(error).toBeDefined();
    expect(error?.status).toBe(401);
  });

  it('should fetch session', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ email: TEST_CONSTANTS.EMAIL })
    );

    const req = createRequest();
    const { context } = await initializeApiContext(req);

    expect(context.userId).toBe(TEST_CONSTANTS.USER_ID);
    expect(context.isAuthenticated).toBe(true);
  });

  it('should detect premium users', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ plan: 'premium' })
    );

    const req = createRequest();
    const { context } = await initializeApiContext(req);

    expect(context.isPremium).toBe(true);
  });

  it('should not consider free users as premium', async () => {
    vi.mocked(getServerSession).mockResolvedValue(
      createMockSession({ plan: 'free' })
    );

    const req = createRequest();
    const { context } = await initializeApiContext(req);

    expect(context.isPremium).toBe(false);
  });

  it('should require auth when specified', async () => {
    const req = createRequest();
    const { error } = await initializeApiContext(req, {
      requireAuth: true,
    });

    expect(error).toBeDefined();
    expect(error?.status).toBe(401);
  });

  it('should check credits when specified', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockSession());
    vi.mocked(checkAndConsumeCredits).mockResolvedValue({
      allowed: true,
      remaining: TEST_CONSTANTS.CREDITS.REMAINING,
    } as any);

    const req = createRequest();
    const { context } = await initializeApiContext(req, {
      credits: { type: 'reading', amount: TEST_CONSTANTS.CREDITS.AMOUNT },
    });

    expect(context.creditInfo?.remaining).toBe(TEST_CONSTANTS.CREDITS.REMAINING);
  });

  it('should fail when credits insufficient', async () => {
    vi.mocked(getServerSession).mockResolvedValue(createMockSession());
    vi.mocked(checkAndConsumeCredits).mockResolvedValue({
      allowed: false,
      error: 'Insufficient credits',
      errorCode: 'insufficient_credits',
      remaining: 0,
    } as any);

    const req = createRequest();
    const { error } = await initializeApiContext(req, {
      credits: { type: 'reading', amount: TEST_CONSTANTS.CREDITS.AMOUNT },
    });

    expect(error).toBeDefined();
  });

  it('should require auth for credits', async () => {
    const req = createRequest();
    const { error } = await initializeApiContext(req, {
      credits: { type: 'reading', amount: TEST_CONSTANTS.CREDITS.AMOUNT },
    });

    expect(error).toBeDefined();
  });
});

describe('middleware MEGA - withApiMiddleware', () => {
  it('should handle successful handler', async () => {
    const handler = vi.fn().mockResolvedValue({
      data: { result: 'success' },
    });

    const wrapped = withApiMiddleware(handler);
    const req = createRequest();
    const response = await wrapped(req);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data.result).toBe('success');
  });

  it('should handle error result', async () => {
    const handler = vi.fn().mockResolvedValue({
      error: {
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'Invalid input',
      },
    });

    const wrapped = withApiMiddleware(handler);
    const req = createRequest();
    const response = await wrapped(req);

    expect(response.status).toBe(422);
  });

  it('should handle thrown errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Test error'));

    const wrapped = withApiMiddleware(handler);
    const req = createRequest();
    const response = await wrapped(req);

    expect(response.status).toBe(500);
  });

  it('should classify timeout errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Request timeout'));

    const wrapped = withApiMiddleware(handler);
    const req = createRequest();
    const response = await wrapped(req);
    const data = await response.json();

    expect(data.error.code).toBe(ErrorCodes.TIMEOUT);
  });

  it('should classify validation errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('validation failed'));

    const wrapped = withApiMiddleware(handler);
    const req = createRequest();
    const response = await wrapped(req);
    const data = await response.json();

    expect(data.error.code).toBe(ErrorCodes.VALIDATION_ERROR);
  });

  it('should pass context to handler', async () => {
    const handler = vi.fn().mockResolvedValue({ data: {} });

    const wrapped = withApiMiddleware(handler);
    const req = createRequest();
    await wrapped(req);

    expect(handler).toHaveBeenCalledWith(
      req,
      expect.objectContaining({
        ip: expect.any(String),
        locale: expect.any(String),
      })
    );
  });
});

describe('middleware MEGA - parseJsonBody', () => {
  it('should parse valid JSON', async () => {
    const req = createRequest('', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    });

    const body = await parseJsonBody(req);
    expect(body).toEqual({ test: 'data' });
  });

  it('should throw for invalid JSON', async () => {
    const req = createRequest('', {
      method: 'POST',
      body: 'invalid json',
    });

    await expect(parseJsonBody(req)).rejects.toThrow('Invalid JSON');
  });

  it('should handle empty object', async () => {
    const req = createRequest('', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const body = await parseJsonBody(req);
    expect(body).toEqual({});
  });

  it('should handle arrays', async () => {
    const req = createRequest('', {
      method: 'POST',
      body: JSON.stringify([1, 2, 3]),
    });

    const body = await parseJsonBody(req);
    expect(body).toEqual([1, 2, 3]);
  });

  it('should handle nested objects', async () => {
    const req = createRequest('', {
      method: 'POST',
      body: JSON.stringify({ nested: { deep: { value: 123 } } }),
    });

    type NestedBody = { nested: { deep: { value: number } } };
    const body = await parseJsonBody<NestedBody>(req);
    expect(body.nested.deep.value).toBe(123);
  });
});

describe('middleware MEGA - validateRequired', () => {
  it('should pass with all required fields', () => {
    const body = { name: 'John', age: 30 };
    const result = validateRequired(body, ['name', 'age']);

    expect(result.valid).toBe(true);
  });

  it('should fail with missing field', () => {
    const body = { name: 'John' };
    const result = validateRequired(body, ['name', 'age']);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.missing).toContain('age');
    }
  });

  it('should fail with null field', () => {
    const body = { name: 'John', age: null };
    const result = validateRequired(body, ['name', 'age']);

    expect(result.valid).toBe(false);
  });

  it('should fail with empty string', () => {
    const body = { name: '' };
    const result = validateRequired(body, ['name']);

    expect(result.valid).toBe(false);
  });

  it('should pass with zero value', () => {
    const body = { count: 0 };
    const result = validateRequired(body, ['count']);

    expect(result.valid).toBe(true);
  });

  it('should pass with false value', () => {
    const body = { enabled: false };
    const result = validateRequired(body, ['enabled']);

    expect(result.valid).toBe(true);
  });

  it('should handle multiple missing fields', () => {
    const body = { name: 'John' };
    const result = validateRequired(body, ['name', 'age', 'email']);

    if (!result.valid) {
      expect(result.missing).toHaveLength(2);
      expect(result.missing).toContain('age');
      expect(result.missing).toContain('email');
    }
  });

  it('should pass with no required fields', () => {
    const body = { name: 'John' };
    const result = validateRequired(body, []);

    expect(result.valid).toBe(true);
  });
});

describe('middleware MEGA - apiError', () => {
  it('should create error result', () => {
    const result = apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid input');

    expect(result.error?.code).toBe(ErrorCodes.VALIDATION_ERROR);
    expect(result.error?.message).toBe('Invalid input');
  });

  it('should include details', () => {
    const result = apiError(ErrorCodes.VALIDATION_ERROR, 'Test', { field: 'email' });

    expect(result.error?.details).toEqual({ field: 'email' });
  });

  it('should work without message', () => {
    const result = apiError(ErrorCodes.NOT_FOUND);

    expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
    expect(result.error?.message).toBeUndefined();
  });

  it('should work without details', () => {
    const result = apiError(ErrorCodes.INTERNAL_ERROR, 'Error');

    expect(result.error?.details).toBeUndefined();
  });
});

describe('middleware MEGA - apiSuccess', () => {
  it('should create success result', () => {
    const result = apiSuccess({ test: 'data' });

    expect(result.data).toEqual({ test: 'data' });
  });

  it('should include custom status', () => {
    const result = apiSuccess({ test: 'data' }, { status: 201 });

    expect(result.status).toBe(201);
  });

  it('should include meta', () => {
    const result = apiSuccess({ test: 'data' }, { meta: { page: 1 } });

    expect(result.meta).toEqual({ page: 1 });
  });

  it('should work with null data', () => {
    const result = apiSuccess(null);

    expect(result.data).toBeNull();
  });

  it('should work with array data', () => {
    const result = apiSuccess([1, 2, 3]);

    expect(result.data).toEqual([1, 2, 3]);
  });
});

describe('middleware MEGA - createPublicStreamGuard', () => {
  it('should create guard with defaults', () => {
    const guard = createPublicStreamGuard({ route: '/api/test' });

    expect(guard.route).toBe('/api/test');
    expect(guard.requireToken).toBe(true);
    expect(guard.rateLimit?.limit).toBe(TEST_CONSTANTS.RATE_LIMIT.PUBLIC_LIMIT);
    expect(guard.rateLimit?.windowSeconds).toBe(TEST_CONSTANTS.RATE_LIMIT.WINDOW_SECONDS);
  });

  it('should accept custom limits', () => {
    const customLimit = 10;
    const customWindow = 30;
    const guard = createPublicStreamGuard({
      route: '/api/test',
      limit: customLimit,
      windowSeconds: customWindow,
    });

    expect(guard.rateLimit?.limit).toBe(customLimit);
    expect(guard.rateLimit?.windowSeconds).toBe(customWindow);
  });

  it('should include credits when required', () => {
    const creditAmount = 2;
    const guard = createPublicStreamGuard({
      route: '/api/test',
      requireCredits: true,
      creditType: 'reading',
      creditAmount,
    });

    expect(guard.credits?.type).toBe('reading');
    expect(guard.credits?.amount).toBe(creditAmount);
  });

  it('should not include credits by default', () => {
    const guard = createPublicStreamGuard({ route: '/api/test' });

    expect(guard.credits).toBeUndefined();
  });
});

describe('middleware MEGA - createAuthenticatedGuard', () => {
  it('should create guard with defaults', () => {
    const guard = createAuthenticatedGuard({ route: '/api/test' });

    expect(guard.route).toBe('/api/test');
    expect(guard.requireAuth).toBe(true);
    expect(guard.rateLimit?.limit).toBe(TEST_CONSTANTS.RATE_LIMIT.AUTH_LIMIT);
    expect(guard.rateLimit?.windowSeconds).toBe(TEST_CONSTANTS.RATE_LIMIT.WINDOW_SECONDS);
  });

  it('should accept custom limits', () => {
    const customLimit = 100;
    const customWindow = 120;
    const guard = createAuthenticatedGuard({
      route: '/api/test',
      limit: customLimit,
      windowSeconds: customWindow,
    });

    expect(guard.rateLimit?.limit).toBe(customLimit);
    expect(guard.rateLimit?.windowSeconds).toBe(customWindow);
  });

  it('should include credits when required', () => {
    const creditAmount = 5;
    const guard = createAuthenticatedGuard({
      route: '/api/test',
      requireCredits: true,
      creditType: 'chat',
      creditAmount,
    });

    expect(guard.credits?.type).toBe('chat');
    expect(guard.credits?.amount).toBe(creditAmount);
  });
});

describe('middleware MEGA - createSimpleGuard', () => {
  it('should create guard with defaults', () => {
    const guard = createSimpleGuard({ route: '/api/test' });

    expect(guard.route).toBe('/api/test');
    expect(guard.rateLimit?.limit).toBe(TEST_CONSTANTS.RATE_LIMIT.SIMPLE_LIMIT);
    expect(guard.rateLimit?.windowSeconds).toBe(TEST_CONSTANTS.RATE_LIMIT.WINDOW_SECONDS);
  });

  it('should accept custom limits', () => {
    const customLimit = 20;
    const customWindow = 30;
    const guard = createSimpleGuard({
      route: '/api/test',
      limit: customLimit,
      windowSeconds: customWindow,
    });

    expect(guard.rateLimit?.limit).toBe(customLimit);
    expect(guard.rateLimit?.windowSeconds).toBe(customWindow);
  });

  it('should not require auth', () => {
    const guard = createSimpleGuard({ route: '/api/test' });

    expect(guard.requireAuth).toBeUndefined();
  });

  it('should not require token', () => {
    const guard = createSimpleGuard({ route: '/api/test' });

    expect(guard.requireToken).toBeUndefined();
  });
});