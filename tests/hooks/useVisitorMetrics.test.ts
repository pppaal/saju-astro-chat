import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useVisitorMetrics } from '@/hooks/useVisitorMetrics';

// Mock fetch
global.fetch = vi.fn();

describe('useVisitorMetrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with null values', () => {
    const { result } = renderHook(() => useVisitorMetrics());

    expect(result.current.todayVisitors).toBeNull();
    expect(result.current.totalVisitors).toBeNull();
    expect(result.current.totalMembers).toBeNull();
    expect(result.current.visitorError).toBeNull();
  });

  it('should fetch and set visitor metrics', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/metrics/public') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            todayVisitors: 150,
            totalVisitors: 5000,
            totalMembers: 1200,
          }),
        });
      }
      if (url === '/api/metrics/track') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error('Unexpected request'));
    });

    const { result } = renderHook(() => useVisitorMetrics('test-token'));

    await waitFor(() => {
      expect(result.current.todayVisitors).toBe(150);
      expect(result.current.totalVisitors).toBe(5000);
      expect(result.current.totalMembers).toBe(1200);
    });
  });

  it('should track visitor once', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/metrics/public') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            todayVisitors: 150,
            totalVisitors: 5000,
            totalMembers: 1200,
          }),
        });
      }
      if (url === '/api/metrics/track') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error('Unexpected request'));
    });

    renderHook(() => useVisitorMetrics('test-token'));

    await waitFor(() => {
      const postCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call) => call[0] === '/api/metrics/track' && call[1]?.method === 'POST'
      );
      expect(postCalls).toHaveLength(1);
    });
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVisitorMetrics('test-token'));

    await waitFor(() => {
      expect(result.current.visitorError).toBe('Failed to load metrics');
    });
  });

  it('should send metrics token in headers', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/metrics/public') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            todayVisitors: 150,
            totalVisitors: 5000,
            totalMembers: 1200,
          }),
        });
      }
      if (url === '/api/metrics/track') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error('Unexpected request'));
    });

    renderHook(() => useVisitorMetrics('my-secret-token'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/metrics/public',
        expect.objectContaining({
          headers: { Authorization: 'Bearer my-secret-token' },
        })
      );
    });
  });

  it('should handle missing data gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation((url: string) => {
      if (url === '/api/metrics/public') {
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      }
      if (url === '/api/metrics/track') {
        return Promise.resolve({ ok: true });
      }
      return Promise.reject(new Error('Unexpected request'));
    });

    const { result } = renderHook(() => useVisitorMetrics('test-token'));

    await waitFor(() => {
      expect(result.current.todayVisitors).toBeNull();
      expect(result.current.totalVisitors).toBeNull();
      expect(result.current.totalMembers).toBeNull();
    });
  });
});
