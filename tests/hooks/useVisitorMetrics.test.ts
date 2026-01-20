import { renderHook, waitFor } from '@testing-library/react';
import { useVisitorMetrics } from '@/hooks/useVisitorMetrics';

// Mock fetch
global.fetch = jest.fn();

describe('useVisitorMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with null values', () => {
    const { result } = renderHook(() => useVisitorMetrics());

    expect(result.current.todayVisitors).toBeNull();
    expect(result.current.totalVisitors).toBeNull();
    expect(result.current.totalMembers).toBeNull();
    expect(result.current.visitorError).toBeNull();
  });

  it('should fetch and set visitor metrics', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 150, total: 5000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: 1200 }),
      });

    const { result } = renderHook(() => useVisitorMetrics('test-token'));

    await waitFor(() => {
      expect(result.current.todayVisitors).toBe(150);
      expect(result.current.totalVisitors).toBe(5000);
      expect(result.current.totalMembers).toBe(1200);
    });
  });

  it('should track visitor once', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true }) // POST track
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 150, total: 5000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: 1200 }),
      });

    renderHook(() => useVisitorMetrics('test-token'));

    await waitFor(() => {
      const postCalls = (global.fetch as jest.Mock).mock.calls.filter(
        call => call[1]?.method === 'POST'
      );
      expect(postCalls).toHaveLength(1);
    });
  });

  it('should handle fetch errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useVisitorMetrics());

    await waitFor(() => {
      expect(result.current.visitorError).toBe('Could not load stats.');
    });
  });

  it('should send metrics token in headers', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ count: 150, total: 5000 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: 1200 }),
      });

    renderHook(() => useVisitorMetrics('my-secret-token'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/visitors-today',
        expect.objectContaining({
          method: 'POST',
          headers: { 'x-metrics-token': 'my-secret-token' },
        })
      );
    });
  });

  it('should handle missing data gracefully', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Empty response
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

    const { result } = renderHook(() => useVisitorMetrics());

    await waitFor(() => {
      expect(result.current.todayVisitors).toBe(0);
      expect(result.current.totalVisitors).toBe(0);
      expect(result.current.totalMembers).toBe(0);
    });
  });
});
