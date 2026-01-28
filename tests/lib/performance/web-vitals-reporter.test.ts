/**
 * Tests for src/lib/performance/web-vitals-reporter.ts
 * 웹 바이탈 리포터 테스트
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock web-vitals module
vi.mock('web-vitals', () => ({
  onCLS: vi.fn(),
  onFID: vi.fn(),
  onFCP: vi.fn(),
  onLCP: vi.fn(),
  onTTFB: vi.fn(),
  onINP: vi.fn(),
}));

import { reportWebVitals, PerformanceMonitor } from '@/lib/performance/web-vitals-reporter';
import { logger } from '@/lib/logger';

describe('web-vitals-reporter', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('reportWebVitals', () => {
    const makeMetric = (name: string, value: number, rating = 'good') => ({
      name,
      value,
      rating,
      id: 'test-id',
      navigationType: 'navigate',
      entries: [],
      delta: value,
    });

    it('should log in development mode', () => {
      process.env.NODE_ENV = 'development';
      const metric = makeMetric('LCP', 2000);
      reportWebVitals(metric as any);
      expect(logger.debug).toHaveBeenCalled();
    });

    it('should not log in production mode via debug', () => {
      process.env.NODE_ENV = 'production';
      const metric = makeMetric('LCP', 2000);
      reportWebVitals(metric as any);
      expect(logger.debug).not.toHaveBeenCalled();
    });

    it('should warn on poor metrics in production', () => {
      process.env.NODE_ENV = 'production';
      const metric = makeMetric('LCP', 5000, 'poor');
      reportWebVitals(metric as any);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Poor Web Vital'),
        expect.any(Object)
      );
    });

    it('should not warn on good metrics in production', () => {
      process.env.NODE_ENV = 'production';
      const metric = makeMetric('LCP', 1000, 'good');
      reportWebVitals(metric as any);
      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('PerformanceMonitor', () => {
    it('should return null for getDuration with unknown mark', () => {
      const result = PerformanceMonitor.getDuration('nonexistent');
      expect(result).toBeNull();
    });

    it('should handle mark when performance is undefined', () => {
      const origPerf = globalThis.performance;
      // @ts-expect-error - temporarily remove performance
      delete globalThis.performance;
      expect(() => PerformanceMonitor.mark('test')).not.toThrow();
      globalThis.performance = origPerf;
    });

    it('should handle measure when performance is undefined', () => {
      const origPerf = globalThis.performance;
      // @ts-expect-error - temporarily remove performance
      delete globalThis.performance;
      const result = PerformanceMonitor.measure('test');
      expect(result).toBeNull();
      globalThis.performance = origPerf;
    });

    it('should handle reportResourceTiming when performance is undefined', () => {
      const origPerf = globalThis.performance;
      // @ts-expect-error - temporarily remove performance
      delete globalThis.performance;
      expect(() => PerformanceMonitor.reportResourceTiming()).not.toThrow();
      globalThis.performance = origPerf;
    });
  });
});
