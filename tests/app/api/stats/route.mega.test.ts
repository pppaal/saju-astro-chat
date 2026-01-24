// tests/app/api/stats/route.mega.test.ts
// Comprehensive tests for Stats API

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies
const mockPrismaUser = {
  count: vi.fn(),
};

const mockPrismaSubscription = {
  count: vi.fn(),
};

const mockPrisma = {
  user: mockPrismaUser,
  subscription: mockPrismaSubscription,
};

vi.mock('@/lib/db/prisma', () => ({
  prisma: mockPrisma,
}));

const mockRateLimit = vi.fn();
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: mockRateLimit,
}));

const mockGetClientIp = vi.fn();
vi.mock('@/lib/request-ip', () => ({
  getClientIp: mockGetClientIp,
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { logger } from '@/lib/logger';

describe('GET /api/stats', () => {
  let GET: (req: NextRequest) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();

    // Reset rate limit mock
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: new Map([
        ['X-RateLimit-Limit', '30'],
        ['X-RateLimit-Remaining', '29'],
      ]),
    });

    mockGetClientIp.mockReturnValue('127.0.0.1');
    mockPrismaUser.count.mockResolvedValue(1000);
    mockPrismaSubscription.count.mockResolvedValue(50);

    // Dynamic import to reset module state (including cache)
    const module = await import('@/app/api/stats/route');
    GET = module.GET;
  });

  afterEach(() => {
    // Clear any timers or pending promises
    vi.clearAllTimers();
  });

  it('should return stats successfully', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.users).toBe(1000);
    expect(data.subscribers).toBe(50);
    expect(data.cached).toBe(false);
  });

  it('should enforce rate limiting', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: new Map([
        ['X-RateLimit-Limit', '30'],
        ['X-RateLimit-Remaining', '0'],
        ['Retry-After', '60'],
      ]),
    });

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Too many requests');
  });

  it('should include rate limit headers', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);

    expect(response.headers.get('X-RateLimit-Limit')).toBe('30');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('29');
  });

  it('should use client IP for rate limiting', async () => {
    mockGetClientIp.mockReturnValue('192.168.1.100');
    const req = new NextRequest('http://localhost:3000/api/stats');

    await GET(req);

    expect(mockGetClientIp).toHaveBeenCalledWith(req.headers);
    expect(mockRateLimit).toHaveBeenCalledWith(
      'stats:192.168.1.100',
      { limit: 30, windowSeconds: 60 }
    );
  });

  it('should query user count from database', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    await GET(req);

    expect(mockPrismaUser.count).toHaveBeenCalled();
  });

  it('should query active and trialing subscriptions', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    await GET(req);

    expect(mockPrismaSubscription.count).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['active', 'trialing'],
        },
      },
    });
  });

  it('should return cached stats on subsequent calls', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');

    // First call - fresh data
    const response1 = await GET(req);
    const data1 = await response1.json();
    expect(data1.cached).toBe(false);
    expect(mockPrismaUser.count).toHaveBeenCalledTimes(1);

    vi.clearAllMocks();

    // Second call - should use cache
    const response2 = await GET(req);
    const data2 = await response2.json();
    expect(data2.cached).toBe(true);
    expect(data2.users).toBe(1000);
    expect(data2.subscribers).toBe(50);
    expect(mockPrismaUser.count).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    mockPrismaUser.count.mockRejectedValue(new Error('Database connection failed'));

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch stats');
    expect(data.details).toBe('Database connection failed');
    expect(data.users).toBe(0);
    expect(data.subscribers).toBe(0);
  });

  it('should log errors when database query fails', async () => {
    const dbError = new Error('Connection timeout');
    mockPrismaUser.count.mockRejectedValue(dbError);

    const req = new NextRequest('http://localhost:3000/api/stats');
    await GET(req);

    expect(logger.error).toHaveBeenCalledWith(
      '[Stats API Error]',
      expect.objectContaining({
        message: 'Connection timeout',
      })
    );
  });

  it('should handle non-Error thrown values', async () => {
    mockPrismaUser.count.mockRejectedValue('String error');

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch stats');
    expect(data.details).toBeUndefined();
  });

  it('should return zero counts on error', async () => {
    mockPrismaUser.count.mockRejectedValue(new Error('Database error'));

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(data.users).toBe(0);
    expect(data.subscribers).toBe(0);
  });

  it('should handle different user counts', async () => {
    mockPrismaUser.count.mockResolvedValue(5000);
    mockPrismaSubscription.count.mockResolvedValue(250);

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(data.users).toBe(5000);
    expect(data.subscribers).toBe(250);
  });

  it('should handle zero users and subscribers', async () => {
    mockPrismaUser.count.mockResolvedValue(0);
    mockPrismaSubscription.count.mockResolvedValue(0);

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(data.users).toBe(0);
    expect(data.subscribers).toBe(0);
    expect(data.cached).toBe(false);
  });

  it('should query both counts in parallel', async () => {
    let userCountResolve: () => void;
    let subscriptionCountResolve: () => void;

    const userCountPromise = new Promise<number>((resolve) => {
      userCountResolve = () => resolve(1000);
    });

    const subscriptionCountPromise = new Promise<number>((resolve) => {
      subscriptionCountResolve = () => resolve(50);
    });

    mockPrismaUser.count.mockReturnValue(userCountPromise);
    mockPrismaSubscription.count.mockReturnValue(subscriptionCountPromise);

    const req = new NextRequest('http://localhost:3000/api/stats');
    const responsePromise = GET(req);

    // Resolve both promises
    userCountResolve!();
    subscriptionCountResolve!();

    const response = await responsePromise;
    const data = await response.json();

    expect(data.users).toBe(1000);
    expect(data.subscribers).toBe(50);
  });

  it('should include retry-after header when rate limited', async () => {
    const rateLimitHeaders = new Headers();
    rateLimitHeaders.set('Retry-After', '30');
    rateLimitHeaders.set('X-RateLimit-Limit', '30');

    mockRateLimit.mockResolvedValue({
      allowed: false,
      headers: rateLimitHeaders,
    });

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);

    expect(response.status).toBe(429);
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('should handle missing rate limit headers gracefully', async () => {
    mockRateLimit.mockResolvedValue({
      allowed: true,
      headers: undefined,
    });

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);

    expect(response.status).toBe(200);
  });

  it('should handle IP from different headers', async () => {
    mockGetClientIp.mockReturnValue('10.0.0.5');

    const req = new NextRequest('http://localhost:3000/api/stats', {
      headers: {
        'x-forwarded-for': '10.0.0.5',
      },
    });

    await GET(req);

    expect(mockGetClientIp).toHaveBeenCalledWith(req.headers);
  });

  it('should only count active and trialing subscriptions', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    await GET(req);

    expect(mockPrismaSubscription.count).toHaveBeenCalledWith({
      where: {
        status: {
          in: ['active', 'trialing'],
        },
      },
    });

    // Verify it doesn't count canceled, expired, etc.
    const callArgs = mockPrismaSubscription.count.mock.calls[0][0];
    expect(callArgs.where.status.in).not.toContain('canceled');
    expect(callArgs.where.status.in).not.toContain('expired');
    expect(callArgs.where.status.in).not.toContain('past_due');
  });

  it('should handle large user counts', async () => {
    mockPrismaUser.count.mockResolvedValue(999999);
    mockPrismaSubscription.count.mockResolvedValue(99999);

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(data.users).toBe(999999);
    expect(data.subscribers).toBe(99999);
  });

  it('should maintain separate rate limits per IP', async () => {
    mockGetClientIp.mockReturnValueOnce('192.168.1.1');
    const req1 = new NextRequest('http://localhost:3000/api/stats');
    await GET(req1);

    expect(mockRateLimit).toHaveBeenCalledWith(
      'stats:192.168.1.1',
      expect.any(Object)
    );

    vi.clearAllMocks();
    mockGetClientIp.mockReturnValueOnce('192.168.1.2');
    const req2 = new NextRequest('http://localhost:3000/api/stats');
    await GET(req2);

    expect(mockRateLimit).toHaveBeenCalledWith(
      'stats:192.168.1.2',
      expect.any(Object)
    );
  });

  it('should use 30 requests per 60 seconds rate limit', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    await GET(req);

    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.any(String),
      { limit: 30, windowSeconds: 60 }
    );
  });

  it('should include all expected fields in success response', async () => {
    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('subscribers');
    expect(data).toHaveProperty('cached');
    expect(typeof data.users).toBe('number');
    expect(typeof data.subscribers).toBe('number');
    expect(typeof data.cached).toBe('boolean');
  });

  it('should include error details in error response', async () => {
    const dbError = new Error('Query timeout');
    mockPrismaUser.count.mockRejectedValue(dbError);

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(data).toHaveProperty('error');
    expect(data).toHaveProperty('details');
    expect(data).toHaveProperty('users');
    expect(data).toHaveProperty('subscribers');
    expect(data.details).toBe('Query timeout');
  });

  it('should handle subscription count failure independently', async () => {
    mockPrismaUser.count.mockResolvedValue(1000);
    mockPrismaSubscription.count.mockRejectedValue(new Error('Subscription query failed'));

    const req = new NextRequest('http://localhost:3000/api/stats');
    const response = await GET(req);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch stats');
  });
});
