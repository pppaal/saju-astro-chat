// tests/app/api/health/redis/route.mega.test.ts
// Comprehensive tests for Redis Health Check API

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies BEFORE imports
vi.mock('@/lib/cache/redis-session', () => ({
  healthCheck: vi.fn(),
}));

vi.mock('@/lib/cache/redis-rate-limit', () => ({
  rateLimitHealthCheck: vi.fn(),
}));

vi.mock('@/lib/cache/redis-cache', () => ({
  getCacheInfo: vi.fn(),
}));

vi.mock('@/lib/api/middleware', () => ({
  withApiMiddleware: (handler: Function) => async (req: NextRequest) => {
    const result = await handler(req);
    return NextResponse.json(result);
  },
  apiSuccess: (data: unknown) => ({ success: true, data }),
}));

import { GET } from '@/app/api/health/redis/route';
import { healthCheck as sessionHealthCheck } from '@/lib/cache/redis-session';
import { rateLimitHealthCheck } from '@/lib/cache/redis-rate-limit';
import { getCacheInfo } from '@/lib/cache/redis-cache';

const mockSessionHealthCheck = vi.mocked(sessionHealthCheck);
const mockRateLimitHealthCheck = vi.mocked(rateLimitHealthCheck);
const mockGetCacheInfo = vi.mocked(getCacheInfo);

describe('GET /api/health/redis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return healthy status when Redis is available', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 42,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ some: 'info' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.overall.status).toBe('healthy');
    expect(data.data.overall.redisAvailable).toBe(true);
    expect(data.data.session.redis).toBe(true);
    expect(data.data.rateLimit.redis).toBe(true);
  });

  it('should return healthy status when Upstash is available', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: false,
      memory: true,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: false,
      upstash: true,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.overall.status).toBe('healthy');
  });

  it('should return degraded status when only memory fallback is active', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: false,
      memory: true,
      sessionCount: 5,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: false,
      upstash: false,
      memory: true,
    });

    mockGetCacheInfo.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.overall.status).toBe('degraded');
    expect(data.data.overall.fallbackActive).toBe(true);
  });

  it('should include session information', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 123,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.session).toEqual({
      redis: true,
      memory: false,
      sessionCount: 123,
    });
  });

  it('should include rate limit information', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: false,
      upstash: true,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.rateLimit).toEqual({
      redis: false,
      upstash: true,
      memory: false,
    });
  });

  it('should mark cache as available when getCacheInfo returns data', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ key: 'value' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.cache.info).toBe('available');
  });

  it('should mark cache as unavailable when getCacheInfo returns null', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.cache.info).toBe('unavailable');
  });

  it('should include timestamp in response', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const beforeTime = new Date().toISOString();
    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();
    const afterTime = new Date().toISOString();

    expect(data.data.timestamp).toBeDefined();
    expect(data.data.timestamp >= beforeTime).toBe(true);
    expect(data.data.timestamp <= afterTime).toBe(true);
  });

  it('should call all health check functions in parallel', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    await GET(req);

    expect(mockSessionHealthCheck).toHaveBeenCalled();
    expect(mockRateLimitHealthCheck).toHaveBeenCalled();
    expect(mockGetCacheInfo).toHaveBeenCalled();
  });

  it('should handle zero session count', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 0,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.session.sessionCount).toBe(0);
  });

  it('should handle high session count', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 99999,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.session.sessionCount).toBe(99999);
  });

  it('should return healthy when both Redis and Upstash are available', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 10,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: true,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.overall.status).toBe('healthy');
  });

  it('should return degraded when all systems are down', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: false,
      memory: false,
      sessionCount: 0,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: false,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.overall.status).toBe('degraded');
  });

  it('should set redisAvailable based on session health', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: false,
      memory: true,
      sessionCount: 5,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: true,
      upstash: false,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue({ info: 'data' });

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.overall.redisAvailable).toBe(false);
  });

  it('should set fallbackActive when memory fallback is used', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: false,
      memory: true,
      sessionCount: 5,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: false,
      upstash: false,
      memory: true,
    });

    mockGetCacheInfo.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.overall.fallbackActive).toBe(true);
  });

  it('should handle mixed health states', async () => {
    mockSessionHealthCheck.mockResolvedValue({
      redis: true,
      memory: false,
      sessionCount: 20,
    });

    mockRateLimitHealthCheck.mockResolvedValue({
      redis: false,
      upstash: true,
      memory: false,
    });

    mockGetCacheInfo.mockResolvedValue(null);

    const req = new NextRequest('http://localhost:3000/api/health/redis');

    const response = await GET(req);
    const data = await response.json();

    expect(data.data.overall.status).toBe('healthy');
    expect(data.data.session.redis).toBe(true);
    expect(data.data.rateLimit.redis).toBe(false);
    expect(data.data.rateLimit.upstash).toBe(true);
  });
});
