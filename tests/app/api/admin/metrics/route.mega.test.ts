// tests/app/api/admin/metrics/route.mega.test.ts
// Comprehensive tests for Admin Metrics Dashboard API

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from '@/app/api/admin/metrics/route';

// Mock dependencies
vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/rateLimit', () => ({
  rateLimit: vi.fn(),
}));

vi.mock('@/lib/request-ip', () => ({
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/metrics/index', () => ({
  getMetricsSnapshot: vi.fn(),
  toPrometheus: vi.fn(),
  toOtlp: vi.fn(),
  DashboardRequestSchema: {
    safeParse: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import { getServerSession } from 'next-auth/next';
import { rateLimit } from '@/lib/rateLimit';
import {
  getMetricsSnapshot,
  toPrometheus,
  toOtlp,
  DashboardRequestSchema,
} from '@/lib/metrics/index';
import { logger } from '@/lib/logger';

describe('GET /api/admin/metrics', () => {
  const mockMetricsSnapshot = {
    counters: [
      { name: 'api.request.total', value: 1000, labels: { service: 'tarot' } },
      { name: 'api.error.total', value: 10, labels: { service: 'tarot', error_category: 'VALIDATION' } },
      { name: 'credits.usage.total', value: 500, labels: { service: 'tarot' } },
    ],
    timings: [
      { name: 'api.latency', sum: 5000, count: 100, p95: 75, labels: { service: 'tarot' } },
    ],
    gauges: [
      { name: 'session.active', value: 25 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();

    // Setup default environment
    process.env.ADMIN_EMAILS = 'admin@example.com,superadmin@test.com';

    // Default rate limit - allowed
    vi.mocked(rateLimit).mockResolvedValue({
      allowed: true,
      remaining: 29,
      reset: Date.now() + 60000,
      limit: 30,
      headers: new Headers(),
    });

    // Default validation - success
    vi.mocked(DashboardRequestSchema.safeParse).mockReturnValue({
      success: true,
      data: { timeRange: '24h', includeRaw: false },
    });

    // Default metrics snapshot
    vi.mocked(getMetricsSnapshot).mockReturnValue(mockMetricsSnapshot);
  });

  afterEach(() => {
    delete process.env.ADMIN_EMAILS;
  });

  describe('Authentication & Authorization', () => {
    it('should reject unauthenticated requests', async () => {
      vi.mocked(getServerSession).mockResolvedValue(null);

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject requests without email', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123' },
        expires: '2024-12-31',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should reject non-admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'user@example.com' },
        expires: '2024-12-31',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
      expect(logger.warn).toHaveBeenCalledWith(
        '[Metrics] Unauthorized access attempt',
        { email: 'user@example.com' }
      );
    });

    it('should allow admin users', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);

      expect(response.status).toBe(200);
    });

    it('should be case-insensitive for admin emails', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'ADMIN@EXAMPLE.COM' },
        expires: '2024-12-31',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);

      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
    });

    it('should enforce rate limits', async () => {
      vi.mocked(rateLimit).mockResolvedValue({
        allowed: false,
        remaining: 0,
        reset: Date.now() + 60000,
        limit: 30,
        headers: new Headers({ 'X-RateLimit-Remaining': '0' }),
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Too many requests');
    });

    it('should include rate limit headers in response', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);

      expect(response.status).toBe(200);
    });
  });

  describe('Format Support', () => {
    beforeEach(() => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
    });

    it('should return JSON format by default', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
      expect(data.data.overview).toBeDefined();
    });

    it('should return Prometheus format', async () => {
      vi.mocked(toPrometheus).mockReturnValue('# HELP metrics\nmetric_name 123\n');

      const req = new NextRequest('http://localhost:3000/api/admin/metrics?format=prometheus');
      const response = await GET(req);
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(text).toContain('# HELP');
      expect(toPrometheus).toHaveBeenCalled();
    });

    it('should return OTLP format', async () => {
      vi.mocked(toOtlp).mockReturnValue({
        resourceMetrics: [],
        schemaUrl: 'https://opentelemetry.io/schemas/1.20.0',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics?format=otlp');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.resourceMetrics).toBeDefined();
      expect(toOtlp).toHaveBeenCalled();
    });
  });

  describe('Query Parameters', () => {
    beforeEach(() => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
    });

    it('should accept timeRange parameter', async () => {
      vi.mocked(DashboardRequestSchema.safeParse).mockReturnValue({
        success: true,
        data: { timeRange: '7d', includeRaw: false },
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics?timeRange=7d');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timeRange).toBe('7d');
    });

    it('should default to 24h timeRange', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.timeRange).toBe('24h');
    });

    it('should include raw data when requested', async () => {
      vi.mocked(DashboardRequestSchema.safeParse).mockReturnValue({
        success: true,
        data: { timeRange: '24h', includeRaw: true },
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics?includeRaw=true');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.raw).toBeDefined();
      expect(data.raw.counters).toBeDefined();
    });

    it('should not include raw data by default', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.raw).toBeUndefined();
    });

    it('should validate parameters', async () => {
      vi.mocked(DashboardRequestSchema.safeParse).mockReturnValue({
        success: false,
        error: {
          flatten: () => ({ fieldErrors: {}, formErrors: ['Invalid timeRange'] }),
        },
      } as never);

      const req = new NextRequest('http://localhost:3000/api/admin/metrics?timeRange=invalid');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid parameters');
    });
  });

  describe('Dashboard Summary', () => {
    beforeEach(() => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
    });

    it('should generate dashboard summary', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.overview).toBeDefined();
      expect(data.data.overview.totalRequests).toBe(1000);
      expect(data.data.overview.errorRate).toBeGreaterThanOrEqual(0);
      expect(data.data.overview.avgLatencyMs).toBeGreaterThanOrEqual(0);
    });

    it('should include service breakdown', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.services).toBeDefined();
      expect(data.data.services.tarot).toBeDefined();
      expect(data.data.services.tarot.requests).toBe(1000);
      expect(data.data.services.tarot.errors).toBe(10);
    });

    it('should calculate error rates correctly', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.overview.errorRate).toBe(1); // 10 / 1000 * 100 = 1%
    });

    it('should include top errors', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.topErrors).toBeDefined();
      expect(Array.isArray(data.data.topErrors)).toBe(true);
    });

    it('should include credit usage', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.credits).toBeDefined();
      expect(data.data.credits.totalUsed).toBe(500);
      expect(data.data.credits.byService.tarot).toBe(500);
    });

    it('should include timestamp', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.timestamp).toBeDefined();
      expect(data.data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle p95 latency', async () => {
      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.overview.p95LatencyMs).toBe(75);
      expect(data.data.services.tarot.p95LatencyMs).toBe(75);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
    });

    it('should handle empty metrics', async () => {
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [],
        timings: [],
        gauges: [],
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.overview.totalRequests).toBe(0);
      expect(data.data.overview.errorRate).toBe(0);
    });

    it('should handle missing ADMIN_EMAILS env', async () => {
      delete process.env.ADMIN_EMAILS;

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Forbidden');
    });

    it('should handle errors gracefully', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
      vi.mocked(getMetricsSnapshot).mockImplementation(() => {
        throw new Error('Metrics system error');
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(logger.error).toHaveBeenCalledWith(
        '[Metrics API Error]',
        expect.any(Error)
      );
    });

    it('should filter out unknown services', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 100, labels: { service: 'unknown' } },
          { name: 'api.request.total', value: 200, labels: { service: 'tarot' } },
        ],
        timings: [],
        gauges: [],
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(data.data.services.unknown).toBeUndefined();
      expect(data.data.services.tarot).toBeDefined();
    });

    it('should handle multiple services', async () => {
      process.env.ADMIN_EMAILS = 'admin@example.com';
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: '123', email: 'admin@example.com' },
        expires: '2024-12-31',
      });
      vi.mocked(getMetricsSnapshot).mockReturnValue({
        counters: [
          { name: 'api.request.total', value: 100, labels: { service: 'tarot' } },
          { name: 'api.request.total', value: 200, labels: { service: 'astrology' } },
          { name: 'api.request.total', value: 300, labels: { service: 'saju' } },
        ],
        timings: [],
        gauges: [],
      });

      const req = new NextRequest('http://localhost:3000/api/admin/metrics');
      const response = await GET(req);
      const data = await response.json();

      expect(Object.keys(data.data.services)).toHaveLength(3);
      expect(data.data.services.tarot.requests).toBe(100);
      expect(data.data.services.astrology.requests).toBe(200);
      expect(data.data.services.saju.requests).toBe(300);
    });
  });
});
