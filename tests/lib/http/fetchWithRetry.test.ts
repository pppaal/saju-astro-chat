/**
 * Tests for fetchWithRetry in src/lib/http.ts
 * Fetch with retry and exponential backoff
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry, FetchWithRetryError } from '@/lib/http';

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe('fetchWithRetry', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return response on first success', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com/data');

    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should retry on 500 and succeed', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('error', { status: 500, statusText: 'ISE' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 2,
      initialDelayMs: 1,
      maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should retry on 502', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 502, statusText: 'Bad Gateway' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
  });

  it('should retry on 503', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 503, statusText: 'Unavailable' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
  });

  it('should retry on 504', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 504, statusText: 'Timeout' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
  });

  it('should retry on 408', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 408, statusText: 'Request Timeout' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
  });

  it('should retry on 429', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 429, statusText: 'Too Many' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
  });

  it('should NOT retry on 404', async () => {
    fetchSpy.mockResolvedValue(new Response('not found', { status: 404 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 3,
    });

    expect(result.status).toBe(404);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 400', async () => {
    fetchSpy.mockResolvedValue(new Response('bad req', { status: 400 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 3,
    });

    expect(result.status).toBe(400);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('should return last response after exhausting retries', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 500, statusText: 'Error' }));

    // After maxRetries retries, the final attempt returns the response as-is
    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 2, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
  });

  it('should call onRetry with attempt, error, delay', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Error' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const onRetry = vi.fn();

    await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 2, initialDelayMs: 1, maxDelayMs: 5, onRetry,
    });

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error), expect.any(Number));
  });

  it('should retry on network error (fetch reject)', async () => {
    fetchSpy
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should throw non-Error exceptions directly', async () => {
    fetchSpy.mockRejectedValue('string error');

    await expect(
      fetchWithRetry('https://api.example.com', undefined, { maxRetries: 0 })
    ).rejects.toBe('string error');
  });

  it('should use custom retryStatusCodes', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 418, statusText: 'Teapot' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const result = await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 1, retryStatusCodes: [418], initialDelayMs: 1, maxDelayMs: 5,
    });

    expect(result.status).toBe(200);
  });

  it('should pass request init options through', async () => {
    fetchSpy.mockResolvedValue(new Response('ok', { status: 200 }));

    await fetchWithRetry('https://api.example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{"a":1}',
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.example.com',
      expect.objectContaining({ method: 'POST', body: '{"a":1}' })
    );
  });

  it('should respect maxDelayMs cap', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Error' }))
      .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Error' }))
      .mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Error' }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));

    const onRetry = vi.fn();

    await fetchWithRetry('https://api.example.com', undefined, {
      maxRetries: 3, initialDelayMs: 10, maxDelayMs: 20, onRetry,
    });

    // All delay values should be <= maxDelayMs
    for (const call of onRetry.mock.calls) {
      expect(call[2]).toBeLessThanOrEqual(20);
    }
  });

  it('should handle aborted external signal', async () => {
    const controller = new AbortController();
    controller.abort('cancelled');

    fetchSpy.mockRejectedValue(new DOMException('aborted', 'AbortError'));

    try {
      await fetchWithRetry('https://api.example.com', { signal: controller.signal }, {
        maxRetries: 0,
      });
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(FetchWithRetryError);
      expect((err as FetchWithRetryError).message).toContain('Request was cancelled');
    }
  });

  it('should handle maxRetries = 0 (no retries)', async () => {
    fetchSpy.mockResolvedValue(new Response('', { status: 500, statusText: 'Error' }));

    // With maxRetries=0, the single attempt returns the response as-is
    const result = await fetchWithRetry('https://api.example.com', undefined, { maxRetries: 0 });

    expect(result.status).toBe(500);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});

describe('FetchWithRetryError', () => {
  it('should have name FetchWithRetryError', () => {
    const err = new FetchWithRetryError('msg', 1, new Error('inner'));
    expect(err.name).toBe('FetchWithRetryError');
  });

  it('should store attempts', () => {
    const err = new FetchWithRetryError('msg', 3, new Error('inner'));
    expect(err.attempts).toBe(3);
  });

  it('should store lastError', () => {
    const inner = new Error('inner');
    const err = new FetchWithRetryError('msg', 1, inner);
    expect(err.lastError).toBe(inner);
  });

  it('should default isTimeout to false', () => {
    const err = new FetchWithRetryError('msg', 1, new Error('inner'));
    expect(err.isTimeout).toBe(false);
  });

  it('should accept isTimeout=true', () => {
    const err = new FetchWithRetryError('msg', 1, new Error('inner'), true);
    expect(err.isTimeout).toBe(true);
  });
});
