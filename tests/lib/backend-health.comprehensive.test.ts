/**
 * Comprehensive Tests for Backend Health Check
 * src/lib/backend-health.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  checkBackendHealth,
  callBackendWithFallback,
  getHealthStatus,
  resetHealthStatus,
} from '@/lib/backend-health';

// Mock dependencies
vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
  recordTiming: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { recordCounter, recordTiming } from '@/lib/metrics';
import { logger } from '@/lib/logger';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('backend-health', () => {
  const originalEnv = process.env;
  const BACKEND_URL = 'https://backend.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockFetch.mockReset();
    process.env = { ...originalEnv };
    resetHealthStatus();
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  describe('checkBackendHealth', () => {
    it('should return true on successful health check', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(true);
      expect(recordCounter).toHaveBeenCalledWith('backend.health.success', 1, { backendUrl: BACKEND_URL });
      expect(logger.info).toHaveBeenCalledWith('[Backend] Health check passed');
    });

    it('should return false on failed health check', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(false);
      expect(recordCounter).toHaveBeenCalledWith('backend.health.failure', 1, { backendUrl: BACKEND_URL });
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(false);
      expect(logger.error).toHaveBeenCalled();
    });

    it('should record latency on successful check', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      await checkBackendHealth(BACKEND_URL);

      expect(recordTiming).toHaveBeenCalledWith(
        'backend.health.latency_ms',
        expect.any(Number),
        { backendUrl: BACKEND_URL }
      );
    });

    it('should rate limit health checks', async () => {
      mockFetch.mockResolvedValue({ ok: true });

      // First check
      await checkBackendHealth(BACKEND_URL);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Immediate second check - should use cached result
      const cachedResult = await checkBackendHealth(BACKEND_URL);
      expect(mockFetch).toHaveBeenCalledTimes(1); // No new fetch
      expect(cachedResult).toBe(true);
    });

    it('should open circuit breaker after max failures', async () => {
      mockFetch.mockResolvedValue({ ok: false });

      // Simulate 3 failures
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000); // Advance past rate limit
        await checkBackendHealth(BACKEND_URL);
      }

      const status = getHealthStatus();
      expect(status.healthy).toBe(false);
      expect(status.consecutiveFailures).toBe(3);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPENED')
      );
    });

    it('should skip health check when circuit breaker is open', async () => {
      // Open circuit breaker by simulating failures
      mockFetch.mockResolvedValue({ ok: false });
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      mockFetch.mockClear();

      // Try another check
      const result = await checkBackendHealth(BACKEND_URL);

      expect(result).toBe(false);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker active')
      );
    });

    it('should include ADMIN_API_TOKEN header when set', async () => {
      process.env.ADMIN_API_TOKEN = 'admin-secret-123';
      mockFetch.mockResolvedValueOnce({ ok: true });

      await checkBackendHealth(BACKEND_URL);

      expect(mockFetch).toHaveBeenCalledWith(
        `${BACKEND_URL}/`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-KEY': 'admin-secret-123',
          }),
        })
      );
    });

    it('should timeout after 5 seconds', async () => {
      const controller = new AbortController();
      mockFetch.mockImplementation((url, options) => {
        return new Promise((resolve) => {
          options?.signal?.addEventListener('abort', () => {
            resolve({ ok: false });
          });
        });
      });

      const healthPromise = checkBackendHealth(BACKEND_URL);
      vi.advanceTimersByTime(5001);

      const result = await healthPromise;
      expect(result).toBe(false);
    });
  });

  describe('callBackendWithFallback', () => {
    const fallbackData = { fallback: true, message: 'Using fallback' };

    it('should return backend data on success', async () => {
      // Health check passes
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // health check
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: { result: 'success' } }),
        });

      const result = await callBackendWithFallback(
        BACKEND_URL,
        '/api/test',
        { input: 'data' },
        fallbackData
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
      expect(recordCounter).toHaveBeenCalledWith(
        'backend.call.success',
        1,
        { endpoint: '/api/test' }
      );
    });

    it('should return fallback when backend is unhealthy', async () => {
      // Make backend unhealthy
      mockFetch.mockResolvedValue({ ok: false });
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      const result = await callBackendWithFallback(
        BACKEND_URL,
        '/api/test',
        { input: 'data' },
        fallbackData
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Unhealthy, using fallback')
      );
    });

    it('should return fallback on request failure', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // health check
        .mockRejectedValueOnce(new Error('Request failed'));

      const result = await callBackendWithFallback(
        BACKEND_URL,
        '/api/test',
        { input: 'data' },
        fallbackData
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
      expect(recordCounter).toHaveBeenCalledWith(
        'backend.call.failure',
        1,
        { endpoint: '/api/test' }
      );
    });

    it('should return fallback on non-ok response', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true }) // health check
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await callBackendWithFallback(
        BACKEND_URL,
        '/api/test',
        {},
        fallbackData
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackData);
    });

    it('should record timing on successful call', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'result' }),
        });

      await callBackendWithFallback(BACKEND_URL, '/api/test', {}, fallbackData);

      expect(recordTiming).toHaveBeenCalledWith(
        'backend.call.latency_ms',
        expect.any(Number),
        { endpoint: '/api/test' }
      );
    });

    it('should send correct headers and body', async () => {
      process.env.ADMIN_API_TOKEN = 'secret-token';
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: 'result' }),
        });

      const requestBody = { param1: 'value1', param2: 123 };

      await callBackendWithFallback(
        BACKEND_URL,
        '/api/endpoint',
        requestBody,
        fallbackData
      );

      expect(mockFetch).toHaveBeenLastCalledWith(
        `${BACKEND_URL}/api/endpoint`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-KEY': 'secret-token',
          }),
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should increment failures on request error', async () => {
      mockFetch
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('Error'));

      await callBackendWithFallback(BACKEND_URL, '/api/test', {}, fallbackData);

      const status = getHealthStatus();
      expect(status.consecutiveFailures).toBeGreaterThan(0);
    });
  });

  describe('getHealthStatus', () => {
    it('should return initial healthy status', () => {
      const status = getHealthStatus();

      expect(status.healthy).toBe(true);
      expect(status.lastCheck).toBe(0);
      expect(status.consecutiveFailures).toBe(0);
    });

    it('should return immutable copy', () => {
      const status = getHealthStatus();
      status.healthy = false;
      status.consecutiveFailures = 999;

      const freshStatus = getHealthStatus();
      expect(freshStatus.healthy).toBe(true);
      expect(freshStatus.consecutiveFailures).toBe(0);
    });
  });

  describe('resetHealthStatus', () => {
    it('should reset to healthy state', async () => {
      // Make unhealthy first
      mockFetch.mockResolvedValue({ ok: false });
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(61000);
        await checkBackendHealth(BACKEND_URL);
      }

      expect(getHealthStatus().healthy).toBe(false);

      resetHealthStatus();

      const status = getHealthStatus();
      expect(status.healthy).toBe(true);
      expect(status.lastCheck).toBe(0);
      expect(status.consecutiveFailures).toBe(0);
      expect(logger.info).toHaveBeenCalledWith('[Backend] Health status reset');
    });
  });
});
