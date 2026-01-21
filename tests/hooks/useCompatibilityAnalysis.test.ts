import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCompatibilityAnalysis } from '@/hooks/useCompatibilityAnalysis';
import type { PersonForm } from '@/app/compatibility/lib';

// Mock fetch
global.fetch = vi.fn();

describe('useCompatibilityAnalysis', () => {
  const mockT = (key: string, fallback: string) => fallback;

  const mockPersons: PersonForm[] = [
    {
      name: 'Alice',
      date: '1990-01-01',
      time: '10:00',
      cityQuery: 'Seoul, KR',
      lat: 37.5665,
      lon: 126.978,
      timeZone: 'Asia/Seoul',
      suggestions: [],
      showDropdown: false,
    },
    {
      name: 'Bob',
      date: '1992-05-15',
      time: '14:30',
      cityQuery: 'Tokyo, JP',
      lat: 35.6762,
      lon: 139.6503,
      timeZone: 'Asia/Tokyo',
      relation: 'lover',
      suggestions: [],
      showDropdown: false,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useCompatibilityAnalysis());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.resultText).toBeNull();
    expect(result.current.timing).toBeNull();
    expect(result.current.actionItems).toEqual([]);
    expect(result.current.groupAnalysis).toBeNull();
    expect(result.current.synergyBreakdown).toBeNull();
    expect(result.current.isGroupResult).toBe(false);
  });

  describe('validate', () => {
    it('should return error for less than 2 people', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const error = result.current.validate([mockPersons[0]], 1, mockT);
      expect(error).toBe('Add between 2 and 5 people.');
    });

    it('should return error for more than 5 people', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const manyPersons = Array(6).fill(mockPersons[0]);
      const error = result.current.validate(manyPersons, 6, mockT);
      expect(error).toBe('Add between 2 and 5 people.');
    });

    it('should return error for missing date', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const invalidPersons = [{ ...mockPersons[0], date: '' }, mockPersons[1]];
      const error = result.current.validate(invalidPersons, 2, mockT);
      expect(error).toContain('date and time are required');
    });

    it('should return error for missing time', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const invalidPersons = [{ ...mockPersons[0], time: '' }, mockPersons[1]];
      const error = result.current.validate(invalidPersons, 2, mockT);
      expect(error).toContain('date and time are required');
    });

    it('should return error for missing location', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const invalidPersons = [{ ...mockPersons[0], lat: null }, mockPersons[1]];
      const error = result.current.validate(invalidPersons, 2, mockT);
      expect(error).toContain('select a city from suggestions');
    });

    it('should return error for missing timezone', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const invalidPersons = [{ ...mockPersons[0], timeZone: '' }, mockPersons[1]];
      const error = result.current.validate(invalidPersons, 2, mockT);
      expect(error).toContain('timezone is required');
    });

    it('should return error for missing relation (person 2+)', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const invalidPersons = [mockPersons[0], { ...mockPersons[1], relation: undefined }];
      const error = result.current.validate(invalidPersons, 2, mockT);
      expect(error).toContain('relation to Person 1 is required');
    });

    it('should return error for "other" relation without note', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const invalidPersons = [
        mockPersons[0],
        { ...mockPersons[1], relation: 'other' as const, relationNote: '' },
      ];
      const error = result.current.validate(invalidPersons, 2, mockT);
      expect(error).toContain("add a note for relation 'other'");
    });

    it('should return null for valid data', () => {
      const { result } = renderHook(() => useCompatibilityAnalysis());

      const error = result.current.validate(mockPersons, 2, mockT);
      expect(error).toBeNull();
    });
  });

  describe('analyzeCompatibility', () => {
    it('should set loading state during analysis', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true, json: () => ({ interpretation: 'Good match!' }) }), 100))
      );

      const { result } = renderHook(() => useCompatibilityAnalysis());

      act(() => {
        result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should set result text on successful analysis', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ interpretation: 'Excellent compatibility!' }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.resultText).toBe('Excellent compatibility!');
      expect(result.current.error).toBeNull();
    });

    it('should set timing data when provided', async () => {
      const mockTiming = {
        current_month: {
          branch: '子',
          element: 'Water',
          analysis: 'Good month for relationships',
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          interpretation: 'Good match',
          timing: mockTiming,
        }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.timing).toEqual(mockTiming);
    });

    it('should set action items when provided', async () => {
      const mockActions = [
        'Communicate more openly',
        'Spend quality time together',
      ];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          interpretation: 'Good match',
          action_items: mockActions,
        }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.actionItems).toEqual(mockActions);
    });

    it('should set group analysis for 3+ people', async () => {
      const mockGroupAnalysis = {
        element_distribution: {
          oheng: { Wood: 2, Fire: 1, Earth: 0, Metal: 1, Water: 2 },
          astro: { fire: 1, earth: 2, air: 1, water: 2 },
        },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          interpretation: 'Group compatibility',
          is_group: true,
          group_analysis: mockGroupAnalysis,
        }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.isGroupResult).toBe(true);
      expect(result.current.groupAnalysis).toEqual(mockGroupAnalysis);
    });

    it('should set synergy breakdown when provided', async () => {
      const mockSynergy = {
        overall_score: 85,
        avg_pair_score: 75,
        oheng_bonus: 5,
        astro_bonus: 5,
        best_pair: { pair: 'Alice & Bob', score: 90 },
        weakest_pair: { pair: 'Alice & Charlie', score: 65 },
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          interpretation: 'Good match',
          synergy_breakdown: mockSynergy,
        }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.synergyBreakdown).toEqual(mockSynergy);
    });

    it('should handle API errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.error).toBe('Server error');
      expect(result.current.resultText).toBeNull();
    });

    it('should handle network errors', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('should send correct request body', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({ interpretation: 'Good' }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(fetch).toHaveBeenCalledWith('/api/compatibility', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          persons: [
            {
              name: 'Alice',
              date: '1990-01-01',
              time: '10:00',
              city: 'Seoul, KR',
              latitude: 37.5665,
              longitude: 126.978,
              timeZone: 'Asia/Seoul',
              relationToP1: undefined,
              relationNoteToP1: undefined,
            },
            {
              name: 'Bob',
              date: '1992-05-15',
              time: '14:30',
              city: 'Tokyo, JP',
              latitude: 35.6762,
              longitude: 139.6503,
              timeZone: 'Asia/Tokyo',
              relationToP1: 'lover',
              relationNoteToP1: undefined,
            },
          ],
        }),
      });
    });
  });

  describe('resetResults', () => {
    it('should reset all state to initial values', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        json: async () => ({
          interpretation: 'Good match',
          timing: { current_month: {} },
          action_items: ['item1'],
          is_group: true,
          group_analysis: {},
          synergy_breakdown: {},
        }),
      });

      const { result } = renderHook(() => useCompatibilityAnalysis());

      await act(async () => {
        await result.current.analyzeCompatibility(mockPersons);
      });

      expect(result.current.resultText).toBeTruthy();

      act(() => {
        result.current.resetResults();
      });

      expect(result.current.resultText).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.timing).toBeNull();
      expect(result.current.actionItems).toEqual([]);
      expect(result.current.groupAnalysis).toBeNull();
      expect(result.current.synergyBreakdown).toBeNull();
      expect(result.current.isGroupResult).toBe(false);
    });
  });
});
