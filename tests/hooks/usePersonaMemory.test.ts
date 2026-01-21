/**
 * Tests for usePersonaMemory hook
 * src/hooks/usePersonaMemory.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersonaMemory } from '@/hooks/usePersonaMemory';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePersonaMemory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should return correct initial values', () => {
      const { result } = renderHook(() => usePersonaMemory());

      expect(result.current.memory).toBeNull();
      expect(result.current.isNewUser).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should not auto-fetch by default', () => {
      renderHook(() => usePersonaMemory());

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should auto-fetch when autoFetch is true', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, isNewUser: true }),
      });

      renderHook(() => usePersonaMemory(true));

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/persona-memory');
      });
    });
  });

  describe('fetchMemory', () => {
    it('should fetch memory successfully', async () => {
      const mockMemory = {
        id: '1',
        userId: 'user1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        dominantThemes: ['love', 'career'],
        keyInsights: ['Good compatibility'],
        emotionalTone: 'optimistic',
        growthAreas: ['communication'],
        lastTopics: ['relationships'],
        recurringIssues: [],
        sessionCount: 5,
        birthChart: null,
        sajuProfile: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMemory, isNewUser: false }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.memory).toEqual(mockMemory);
      expect(result.current.isNewUser).toBe(false);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set loading state during fetch', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => usePersonaMemory());

      act(() => {
        result.current.fetchMemory();
      });

      expect(result.current.loading).toBe(true);
    });

    it('should identify new user', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: null, isNewUser: true }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.isNewUser).toBe(true);
    });

    it('should handle API error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.memory).toBeNull();
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.error).toBe('Network failed');
    });

    it('should clear error on successful fetch', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: 'Server error' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ data: null, isNewUser: true }),
        });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.error).toBe('Server error');

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('updateMemory', () => {
    it('should update memory successfully', async () => {
      const initialMemory = {
        id: '1',
        userId: 'user1',
        dominantThemes: ['love'],
        sessionCount: 5,
      };

      const updatedMemory = {
        ...initialMemory,
        dominantThemes: ['love', 'career'],
        sessionCount: 6,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedMemory }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateMemory({ dominantThemes: ['love', 'career'] });
      });

      expect(success).toBe(true);
      expect(result.current.memory).toEqual(updatedMemory);
      expect(result.current.isNewUser).toBe(false);
    });

    it('should send POST request with correct data', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: {} }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.updateMemory({
          dominantThemes: ['test'],
          emotionalTone: 'positive',
        });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/persona-memory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dominantThemes: ['test'],
          emotionalTone: 'positive',
        }),
      });
    });

    it('should handle update error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Update failed' }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateMemory({ dominantThemes: ['test'] });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Update failed');
    });

    it('should handle network error on update', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failed'));

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateMemory({ dominantThemes: ['test'] });
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Network failed');
    });
  });

  describe('addInsight', () => {
    it('should add insight successfully', async () => {
      const updatedMemory = {
        keyInsights: ['New insight'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedMemory }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.addInsight('New insight');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/persona-memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_insight', data: { insight: 'New insight' } }),
      });
    });

    it('should handle add insight error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to add insight' }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.addInsight('New insight');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to add insight');
    });
  });

  describe('addGrowthArea', () => {
    it('should add growth area successfully', async () => {
      const updatedMemory = {
        growthAreas: ['communication', 'patience'],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedMemory }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.addGrowthArea('patience');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/persona-memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'add_growth_area', data: { area: 'patience' } }),
      });
    });

    it('should handle add growth area error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to add growth area' }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.addGrowthArea('patience');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to add growth area');
    });
  });

  describe('updateEmotionalTone', () => {
    it('should update emotional tone successfully', async () => {
      const updatedMemory = {
        emotionalTone: 'optimistic',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: updatedMemory }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEmotionalTone('optimistic');
      });

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('/api/persona-memory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_emotional_tone', data: { tone: 'optimistic' } }),
      });
    });

    it('should handle update emotional tone error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to update tone' }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.updateEmotionalTone('optimistic');
      });

      expect(success).toBe(false);
      expect(result.current.error).toBe('Failed to update tone');
    });
  });

  describe('useCallback stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => usePersonaMemory());

      const initialFetchMemory = result.current.fetchMemory;
      const initialUpdateMemory = result.current.updateMemory;
      const initialAddInsight = result.current.addInsight;
      const initialAddGrowthArea = result.current.addGrowthArea;
      const initialUpdateEmotionalTone = result.current.updateEmotionalTone;

      rerender();

      expect(result.current.fetchMemory).toBe(initialFetchMemory);
      expect(result.current.updateMemory).toBe(initialUpdateMemory);
      expect(result.current.addInsight).toBe(initialAddInsight);
      expect(result.current.addGrowthArea).toBe(initialAddGrowthArea);
      expect(result.current.updateEmotionalTone).toBe(initialUpdateEmotionalTone);
    });
  });

  describe('edge cases', () => {
    it('should handle non-Error thrown', async () => {
      mockFetch.mockRejectedValueOnce('String error');

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.error).toBe('Unknown error');
    });

    it('should handle empty insights array', async () => {
      const memory = {
        id: '1',
        keyInsights: [],
        growthAreas: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: memory, isNewUser: false }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.memory?.keyInsights).toEqual([]);
      expect(result.current.memory?.growthAreas).toEqual([]);
    });

    it('should handle null arrays in memory', async () => {
      const memory = {
        id: '1',
        keyInsights: null,
        growthAreas: null,
        dominantThemes: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: memory, isNewUser: false }),
      });

      const { result } = renderHook(() => usePersonaMemory());

      await act(async () => {
        await result.current.fetchMemory();
      });

      expect(result.current.memory?.keyInsights).toBeNull();
      expect(result.current.memory?.growthAreas).toBeNull();
    });
  });
});
