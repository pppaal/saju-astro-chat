import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkBackendHealth,
  callBackendWithFallback,
  getHealthStatus,
  resetHealthStatus,
} from '@/lib/backend-health';

// Mock fetch globally
global.fetch = vi.fn();

// Mock metrics and logger
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

describe('Backend Health Check', () => {
  const mockBackendUrl = 'https://api.example.com';

  beforeEach(() => {
    vi.clearAllMocks();
    resetHealthStatus();
    vi.useFakeTimers({ now: Date.now() });
    // Ensure clean fetch mock state
    (global.fetch as any).mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
    resetHealthStatus();
  });

  describe('checkBackendHealth', () => {
    it('should return true on successful health check', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBackendUrl}/`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should return false on failed health check', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(false);
    });

    it('should update health status on success', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkBackendHealth(mockBackendUrl);

      const status = getHealthStatus();
      expect(status.healthy).toBe(true);
      expect(status.consecutiveFailures).toBe(0);
      expect(status.lastCheck).toBeGreaterThan(0);
    });

    it('should increment failures on error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await checkBackendHealth(mockBackendUrl);

      const status = getHealthStatus();
      expect(status.consecutiveFailures).toBe(1);
    });

    it('should open circuit after MAX_FAILURES (3) failures', async () => {
      // Simulate 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
        await checkBackendHealth(mockBackendUrl);
        vi.advanceTimersByTime(60001); // Advance past rate limit
      }

      const status = getHealthStatus();
      expect(status.consecutiveFailures).toBe(3);
      expect(status.healthy).toBe(false);
    });

    it('should skip health check when circuit is open', async () => {
      // Open circuit with 3 failures
      for (let i = 0; i < 3; i++) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
        await checkBackendHealth(mockBackendUrl);
        vi.advanceTimersByTime(60001); // Advance past rate limit
      }

      vi.clearAllMocks();
      vi.advanceTimersByTime(60000); // 1 minute (less than circuit break duration)

      // Try to check again - should skip due to circuit breaker
      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled(); // Circuit breaker prevents call
    });

    it('should allow retry after CIRCUIT_BREAK_DURATION (5 minutes)', async () => {
      // Open circuit
      for (let i = 0; i < 3; i++) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
        await checkBackendHealth(mockBackendUrl);
        vi.advanceTimersByTime(60001); // Advance past rate limit
      }

      vi.clearAllMocks();
      vi.advanceTimersByTime(300001); // 5 minutes + 1ms

      // Should allow retry now
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('should rate limit health checks (60 second interval)', async () => {
      // First check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      vi.clearAllMocks();
      vi.advanceTimersByTime(30000); // 30 seconds (less than interval)

      // Second check should use cached result
      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should allow health check after interval passes', async () => {
      // First check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      vi.clearAllMocks();
      vi.advanceTimersByTime(60001); // 60 seconds + 1ms

      // Second check should actually check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkBackendHealth(mockBackendUrl);

      expect(global.fetch).toHaveBeenCalled();
    });

    it('should reset failures on successful check', async () => {
      // Fail twice (with time advance between to bypass rate limit)
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      await checkBackendHealth(mockBackendUrl);
      vi.advanceTimersByTime(60001);

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });
      await checkBackendHealth(mockBackendUrl);

      expect(getHealthStatus().consecutiveFailures).toBe(2);

      // Now succeed
      vi.advanceTimersByTime(60001);
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      expect(getHealthStatus().consecutiveFailures).toBe(0);
      expect(getHealthStatus().healthy).toBe(true);
    });

    it('should handle timeout with AbortController', async () => {
      (global.fetch as any).mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(false);
    });

    it('should include API token in headers if available', async () => {
      process.env.ADMIN_API_TOKEN = 'test-token-123';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkBackendHealth(mockBackendUrl);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-KEY': 'test-token-123',
          }),
        })
      );

      delete process.env.ADMIN_API_TOKEN;
    });

    it('should not include API token if not set', async () => {
      delete process.env.ADMIN_API_TOKEN;

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkBackendHealth(mockBackendUrl);

      const calls = (global.fetch as any).mock.calls[0];
      expect(calls[1].headers['X-API-KEY']).toBeUndefined();
    });
  });

  describe('callBackendWithFallback', () => {
    const endpoint = '/predict';
    const requestBody = { input: 'test' };
    const fallbackResponse = { result: 'fallback' };

    it('should return fallback when backend is unhealthy', async () => {
      // Make backend unhealthy
      for (let i = 0; i < 3; i++) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
        await checkBackendHealth(mockBackendUrl);
      }

      vi.advanceTimersByTime(60001);
      vi.clearAllMocks();

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackResponse);
    });

    it('should make request when backend is healthy', async () => {
      // Make backend healthy first - this sets lastCheck
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Don't advance time - health check will use cached healthy state
      // Mock the actual API call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { result: 'success' } }),
      });

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ result: 'success' });
    });

    it('should extract data from response wrapper', async () => {
      // Make backend healthy first
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Don't advance time - use cached healthy status
      // Mock the actual call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: { nested: 'value' } }),
      });

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.data).toEqual({ nested: 'value' });
    });

    it('should return direct response if no data wrapper', async () => {
      // Make backend healthy first
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Don't advance time - use cached healthy status
      // Mock the actual call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ result: 'direct' }),
      });

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.data).toEqual({ result: 'direct' });
    });

    it('should send correct POST request', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: {} }),
        });

      vi.advanceTimersByTime(60001);

      await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${mockBackendUrl}${endpoint}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(requestBody),
        })
      );
    });

    it('should handle non-200 response', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
        });

      vi.advanceTimersByTime(60001);

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackResponse);
    });

    it('should handle network error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockRejectedValueOnce(new Error('Network error'));

      vi.advanceTimersByTime(60001);

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackResponse);
    });

    it('should increment failure count on error', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockRejectedValueOnce(new Error('Error'));

      vi.advanceTimersByTime(60001);

      const initialStatus = getHealthStatus();

      await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      const newStatus = getHealthStatus();
      expect(newStatus.consecutiveFailures).toBe(initialStatus.consecutiveFailures + 1);
    });

    it('should open circuit after MAX_FAILURES in callBackend', async () => {
      // Make backend healthy first
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Simulate 3 failures through callBackendWithFallback
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(60001);

        // Each call: health check uses cache (healthy), actual call fails
        (global.fetch as any).mockRejectedValueOnce(new Error('Error'));

        await callBackendWithFallback(
          mockBackendUrl,
          endpoint,
          requestBody,
          fallbackResponse
        );
      }

      const status = getHealthStatus();
      expect(status.healthy).toBe(false);
    });

    it('should include API token in request headers', async () => {
      process.env.ADMIN_API_TOKEN = 'test-api-key';

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ data: {} }),
        });

      vi.advanceTimersByTime(60001);

      await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      const postCall = (global.fetch as any).mock.calls.find((call: any) =>
        call[0].includes(endpoint)
      );
      expect(postCall[1].headers['X-API-KEY']).toBe('test-api-key');

      delete process.env.ADMIN_API_TOKEN;
    });
  });

  describe('getHealthStatus', () => {
    it('should return current health status', () => {
      const status = getHealthStatus();

      expect(status).toHaveProperty('healthy');
      expect(status).toHaveProperty('lastCheck');
      expect(status).toHaveProperty('consecutiveFailures');
    });

    it('should return a copy, not the original', () => {
      const status1 = getHealthStatus();
      const status2 = getHealthStatus();

      expect(status1).toEqual(status2);
      expect(status1).not.toBe(status2); // Different object references
    });

    it('should reflect changes after health checks', async () => {
      const before = getHealthStatus();
      expect(before.lastCheck).toBe(0);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkBackendHealth(mockBackendUrl);

      const after = getHealthStatus();
      expect(after.lastCheck).toBeGreaterThan(before.lastCheck);
    });
  });

  describe('resetHealthStatus', () => {
    it('should reset to initial healthy state', async () => {
      // Make unhealthy (with time advance between to bypass rate limit)
      for (let i = 0; i < 3; i++) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 500,
        });
        await checkBackendHealth(mockBackendUrl);
        vi.advanceTimersByTime(60001);
      }

      expect(getHealthStatus().healthy).toBe(false);

      // Reset
      resetHealthStatus();

      const status = getHealthStatus();
      expect(status.healthy).toBe(true);
      expect(status.lastCheck).toBe(0);
      expect(status.consecutiveFailures).toBe(0);
    });

    it('should allow immediate health check after reset', async () => {
      // Do a health check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Reset
      resetHealthStatus();
      vi.clearAllMocks();

      // Should allow immediate check (no rate limiting)
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    const endpoint = '/predict';
    const requestBody = { input: 'test' };
    const fallbackResponse = { result: 'fallback' };

    it('should handle very long response times (AbortController timeout)', async () => {
      // Mock fetch to throw AbortError (simulating timeout)
      (global.fetch as any).mockRejectedValueOnce(
        new DOMException('The operation was aborted', 'AbortError')
      );

      const result = await checkBackendHealth(mockBackendUrl);

      expect(result).toBe(false);
    });

    it('should handle malformed JSON response', async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => {
            throw new Error('Invalid JSON');
          },
        });

      vi.advanceTimersByTime(60001);

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(false);
      expect(result.data).toEqual(fallbackResponse);
    });

    it('should handle empty response body', async () => {
      // Make backend healthy first
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Don't advance time - use cached healthy status
      // Mock the actual call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({}),
      });

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({});
    });

    it('should handle null response data', async () => {
      // Make backend healthy first
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });
      await checkBackendHealth(mockBackendUrl);

      // Don't advance time - use cached healthy status
      // Mock the actual call
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: null }),
      });

      const result = await callBackendWithFallback(
        mockBackendUrl,
        endpoint,
        requestBody,
        fallbackResponse
      );

      expect(result.success).toBe(true);
      // When response is { data: null }, the wrapper is returned as-is
      expect(result.data).toEqual({ data: null });
    });

    it('should handle different backend URLs', async () => {
      const url1 = 'https://api1.example.com';
      const url2 = 'https://api2.example.com';

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkBackendHealth(url1);

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      vi.advanceTimersByTime(60001);

      await checkBackendHealth(url2);

      expect(global.fetch).toHaveBeenCalledWith(`${url1}/`, expect.any(Object));
      expect(global.fetch).toHaveBeenCalledWith(`${url2}/`, expect.any(Object));
    });

    it('should handle sequential health checks with caching', async () => {
      // First check
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result1 = await checkBackendHealth(mockBackendUrl);
      expect(result1).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second check immediately after (should use cache)
      const result2 = await checkBackendHealth(mockBackendUrl);
      expect(result2).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No additional call

      // Third check immediately after (should use cache)
      const result3 = await checkBackendHealth(mockBackendUrl);
      expect(result3).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still no additional call
    });
  });
});
