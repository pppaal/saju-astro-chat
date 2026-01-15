// tests/hooks/calendar/useCalendarData.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useCalendarData } from '@/hooks/calendar/useCalendarData';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('useCalendarData', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCalendarData());

    expect(result.current.data).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.cacheHit).toBe(false);
    expect(typeof result.current.fetchCalendar).toBe('function');
  });

  it('should fetch calendar data successfully', async () => {
    const mockData = {
      success: true,
      year: 2024,
      allDates: [
        { date: '2024-01-01', grade: 0, score: 85, categories: ['wealth'], title: 'Test', description: 'Test desc', sajuFactors: [], astroFactors: [], recommendations: [], warnings: [] }
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useCalendarData());

    const birthInfo = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Seoul',
      gender: 'Male' as const,
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
    };

    act(() => {
      result.current.fetchCalendar(birthInfo, 2024, 'all', 'ko');
    });

    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    const { result } = renderHook(() => useCalendarData());

    const birthInfo = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Seoul',
      gender: 'Male' as const,
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
    };

    act(() => {
      result.current.fetchCalendar(birthInfo, 2024, 'all', 'ko');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toContain('500');
  });

  it('should detect cache hits', async () => {
    const mockData = {
      success: true,
      year: 2024,
      cached: true,
      allDates: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockData,
    });

    const { result } = renderHook(() => useCalendarData());

    const birthInfo = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Seoul',
      gender: 'Male' as const,
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
    };

    act(() => {
      result.current.fetchCalendar(birthInfo, 2024, 'all', 'ko');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.cacheHit).toBe(true);
  });

  it('should abort previous request when new request is made', async () => {
    const mockData1 = { success: true, year: 2024, allDates: [] };
    const mockData2 = { success: true, year: 2025, allDates: [] };

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return mockData1;
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockData2,
      });

    const { result } = renderHook(() => useCalendarData());

    const birthInfo = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Seoul',
      gender: 'Male' as const,
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
    };

    // Start first request
    act(() => {
      result.current.fetchCalendar(birthInfo, 2024, 'all', 'ko');
    });

    // Immediately start second request (should abort first)
    act(() => {
      result.current.fetchCalendar(birthInfo, 2025, 'all', 'ko');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Should have data from second request
    expect(result.current.data?.year).toBe(2025);
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCalendarData());

    const birthInfo = {
      birthDate: '1990-01-01',
      birthTime: '12:00',
      birthPlace: 'Seoul',
      gender: 'Male' as const,
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
    };

    act(() => {
      result.current.fetchCalendar(birthInfo, 2024, 'all', 'ko');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  it('should use default birthTime when not provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, year: 2024, allDates: [] }),
    });

    const { result } = renderHook(() => useCalendarData());

    const birthInfo = {
      birthDate: '1990-01-01',
      birthTime: '',
      birthPlace: 'Seoul',
      gender: 'Male' as const,
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
    };

    act(() => {
      result.current.fetchCalendar(birthInfo, 2024, 'all', 'ko');
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Check that fetch was called with default time '12:00'
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('birthTime=12%3A00'),
      expect.any(Object)
    );
  });
});
