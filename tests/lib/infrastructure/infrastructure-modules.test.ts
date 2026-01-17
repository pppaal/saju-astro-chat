/**
 * @file Tests for infrastructure module exports
 * 커버리지 향상을 위한 infrastructure barrel export 테스트
 */

import { describe, it, expect } from 'vitest';

describe('Infrastructure Module Exports', () => {
  describe('Circuit Breaker exports', () => {
    it('should export isCircuitOpen', async () => {
      const { isCircuitOpen } = await import('@/lib/infrastructure');
      expect(isCircuitOpen).toBeDefined();
      expect(typeof isCircuitOpen).toBe('function');
    });

    it('should export recordSuccess', async () => {
      const { recordSuccess } = await import('@/lib/infrastructure');
      expect(recordSuccess).toBeDefined();
      expect(typeof recordSuccess).toBe('function');
    });

    it('should export recordFailure', async () => {
      const { recordFailure } = await import('@/lib/infrastructure');
      expect(recordFailure).toBeDefined();
      expect(typeof recordFailure).toBe('function');
    });

    it('should export withCircuitBreaker', async () => {
      const { withCircuitBreaker } = await import('@/lib/infrastructure');
      expect(withCircuitBreaker).toBeDefined();
      expect(typeof withCircuitBreaker).toBe('function');
    });

    it('should export getCircuitStatus', async () => {
      const { getCircuitStatus } = await import('@/lib/infrastructure');
      expect(getCircuitStatus).toBeDefined();
      expect(typeof getCircuitStatus).toBe('function');
    });

    it('should export resetAllCircuits', async () => {
      const { resetAllCircuits } = await import('@/lib/infrastructure');
      expect(resetAllCircuits).toBeDefined();
      expect(typeof resetAllCircuits).toBe('function');
    });
  });

  describe('Rate Limiting exports', () => {
    it('should export rateLimit', async () => {
      const { rateLimit } = await import('@/lib/infrastructure');
      expect(rateLimit).toBeDefined();
      expect(typeof rateLimit).toBe('function');
    });
  });

  describe('Metrics exports', () => {
    it('should export recordCounter', async () => {
      const { recordCounter } = await import('@/lib/infrastructure');
      expect(recordCounter).toBeDefined();
      expect(typeof recordCounter).toBe('function');
    });

    it('should export recordTiming', async () => {
      const { recordTiming } = await import('@/lib/infrastructure');
      expect(recordTiming).toBeDefined();
      expect(typeof recordTiming).toBe('function');
    });

    it('should export recordGauge', async () => {
      const { recordGauge } = await import('@/lib/infrastructure');
      expect(recordGauge).toBeDefined();
      expect(typeof recordGauge).toBe('function');
    });

    it('should export getMetricsSnapshot', async () => {
      const { getMetricsSnapshot } = await import('@/lib/infrastructure');
      expect(getMetricsSnapshot).toBeDefined();
      expect(typeof getMetricsSnapshot).toBe('function');
    });

    it('should export resetMetrics', async () => {
      const { resetMetrics } = await import('@/lib/infrastructure');
      expect(resetMetrics).toBeDefined();
      expect(typeof resetMetrics).toBe('function');
    });

    it('should export toPrometheus', async () => {
      const { toPrometheus } = await import('@/lib/infrastructure');
      expect(toPrometheus).toBeDefined();
      expect(typeof toPrometheus).toBe('function');
    });

    it('should export toOtlp', async () => {
      const { toOtlp } = await import('@/lib/infrastructure');
      expect(toOtlp).toBeDefined();
      expect(typeof toOtlp).toBe('function');
    });
  });

  describe('Telemetry exports', () => {
    it('should export captureServerError', async () => {
      const { captureServerError } = await import('@/lib/infrastructure');
      expect(captureServerError).toBeDefined();
      expect(typeof captureServerError).toBe('function');
    });
  });

  describe('Redis Cache exports', () => {
    it('should export cacheGet', async () => {
      const { cacheGet } = await import('@/lib/infrastructure');
      expect(cacheGet).toBeDefined();
      expect(typeof cacheGet).toBe('function');
    });

    it('should export cacheSet', async () => {
      const { cacheSet } = await import('@/lib/infrastructure');
      expect(cacheSet).toBeDefined();
      expect(typeof cacheSet).toBe('function');
    });

    it('should export makeCacheKey', async () => {
      const { makeCacheKey } = await import('@/lib/infrastructure');
      expect(makeCacheKey).toBeDefined();
      expect(typeof makeCacheKey).toBe('function');
    });
  });
});