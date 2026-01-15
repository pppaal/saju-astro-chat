// tests/hooks/calendar/useSavedDates.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSavedDates } from '@/hooks/calendar/useSavedDates';

// Mock fetch
global.fetch = vi.fn();

const userId = 'user-123';

describe('useSavedDates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with empty saved dates', () => {
      const { result } = renderHook(() => useSavedDates());

      expect(result.current.savedDates).toBeInstanceOf(Set);
      expect(result.current.savedDates.size).toBe(0);
      expect(result.current.saving).toBe(false);
      expect(result.current.saveMsg).toBeNull();
    });
  });

  describe('isSaved', () => {
    it('should return false for unsaved date', () => {
      const { result } = renderHook(() => useSavedDates());

      expect(result.current.isSaved('2024-01-15')).toBe(false);
    });

    it('should return true for saved date', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.isSaved('2024-01-15')).toBe(true);
    });
  });

  describe('toggleSave - saving', () => {
    it('should save a date successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.savedDates.has('2024-01-15')).toBe(true);
      expect(result.current.saveMsg).toContain('저장');
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/calendar/save',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('2024-01-15'),
        })
      );
    });

    it('should set saving state during save operation', async () => {
      let resolveFetch: any;
      (global.fetch as any).mockReturnValueOnce(
        new Promise((resolve) => {
          resolveFetch = resolve;
        })
      );

      const { result } = renderHook(() => useSavedDates());

      act(() => {
        result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.saving).toBe(true);

      await act(async () => {
        resolveFetch({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      await waitFor(() => {
        expect(result.current.saving).toBe(false);
      });
    });

    it('should handle save error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.savedDates.has('2024-01-15')).toBe(false);
      expect(result.current.saveMsg).toContain('실패');
    });

    it('should handle non-ok response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.savedDates.has('2024-01-15')).toBe(false);
      expect(result.current.saveMsg).toContain('실패');
    });
  });

  describe('toggleSave - unsaving', () => {
    it('should unsave a date successfully', async () => {
      // First save
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.savedDates.has('2024-01-15')).toBe(true);

      // Then unsave
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.savedDates.has('2024-01-15')).toBe(false);
      expect(result.current.saveMsg).toContain('취소');
      expect(global.fetch).toHaveBeenLastCalledWith(
        '/api/calendar/save',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });

    it('should handle unsave error', async () => {
      // First save
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      // Then fail to unsave
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.savedDates.has('2024-01-15')).toBe(true);
      expect(result.current.saveMsg).toContain('실패');
    });
  });

  describe('message timeout', () => {
    it('should clear save message after timeout', async () => {
      vi.useFakeTimers();

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      expect(result.current.saveMsg).toBeTruthy();

      // Fast-forward 3 seconds
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });

      expect(result.current.saveMsg).toBeNull();

      vi.useRealTimers();
    });
  });

  describe('concurrent operations', () => {
    it('should handle multiple save operations', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await Promise.all([
          result.current.toggleSave('2024-01-15', userId),
          result.current.toggleSave('2024-01-20', userId),
          result.current.toggleSave('2024-01-25', userId),
        ]);
      });

      expect(result.current.savedDates.size).toBe(3);
      expect(result.current.savedDates.has('2024-01-15')).toBe(true);
      expect(result.current.savedDates.has('2024-01-20')).toBe(true);
      expect(result.current.savedDates.has('2024-01-25')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle date string formats', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15', userId);
      });

      // The exact same string used in toggleSave should be saved
      expect(result.current.savedDates.has('2024-01-15')).toBe(true);
    });

    it('should handle timestamp-like dates', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const { result } = renderHook(() => useSavedDates());

      await act(async () => {
        await result.current.toggleSave('2024-01-15T00:00:00Z', userId);
      });

      expect(result.current.savedDates.has('2024-01-15T00:00:00Z')).toBe(true);
    });
  });
});
