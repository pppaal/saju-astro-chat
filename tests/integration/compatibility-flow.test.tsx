import { vi, describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCompatibilityForm } from '@/hooks/useCompatibilityForm';
import { useCompatibilityAnalysis } from '@/hooks/useCompatibilityAnalysis';

// Mock fetch
global.fetch = vi.fn();

describe('Compatibility Flow Integration', () => {
  const mockT = (key: string, fallback: string) => fallback;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should complete full compatibility flow', async () => {
    // Step 1: Initialize form
    const { result: formResult } = renderHook(() => useCompatibilityForm());

    expect(formResult.current.persons).toHaveLength(2);

    // Step 2: Fill in first person
    act(() => {
      formResult.current.updatePerson(0, 'name', 'Alice');
      formResult.current.updatePerson(0, 'date', '1990-01-01');
      formResult.current.updatePerson(0, 'time', '10:00');
    });

    // Step 3: Select city for first person
    act(() => {
      formResult.current.onPickCity(0, {
        name: 'Seoul',
        country: 'KR',
        lat: 37.5665,
        lon: 126.978,
      });
    });

    expect(formResult.current.persons[0].lat).toBe(37.5665);

    // Step 4: Fill in second person
    act(() => {
      formResult.current.updatePerson(1, 'name', 'Bob');
      formResult.current.updatePerson(1, 'date', '1992-05-15');
      formResult.current.updatePerson(1, 'time', '14:30');
      formResult.current.updatePerson(1, 'relation', 'lover');
    });

    act(() => {
      formResult.current.onPickCity(1, {
        name: 'Tokyo',
        country: 'JP',
        lat: 35.6762,
        lon: 139.6503,
      });
    });

    // Step 5: Validate
    const { result: analysisResult } = renderHook(() => useCompatibilityAnalysis());

    const validationError = analysisResult.current.validate(
      formResult.current.persons,
      formResult.current.count,
      mockT
    );

    expect(validationError).toBeNull();

    // Step 6: Analyze
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        interpretation: 'Great compatibility!',
        timing: { current_month: { branch: '子', element: 'Water' } },
        action_items: ['Communicate openly', 'Spend quality time'],
      }),
    });

    await act(async () => {
      await analysisResult.current.analyzeCompatibility(formResult.current.persons);
    });

    expect(analysisResult.current.resultText).toBe('Great compatibility!');
    expect(analysisResult.current.timing).toBeTruthy();
    expect(analysisResult.current.actionItems).toHaveLength(2);
  });

  it('should handle adding third person for group analysis', async () => {
    const { result: formResult } = renderHook(() => useCompatibilityForm());

    // Add third person
    act(() => {
      formResult.current.setCount(3);
    });

    expect(formResult.current.persons).toHaveLength(3);

    // Fill in all three persons
    act(() => {
      // Person 1
      formResult.current.updatePerson(0, 'name', 'Alice');
      formResult.current.updatePerson(0, 'date', '1990-01-01');
      formResult.current.updatePerson(0, 'time', '10:00');
      formResult.current.onPickCity(0, {
        name: 'Seoul',
        country: 'KR',
        lat: 37.5665,
        lon: 126.978,
      });

      // Person 2
      formResult.current.updatePerson(1, 'name', 'Bob');
      formResult.current.updatePerson(1, 'date', '1992-05-15');
      formResult.current.updatePerson(1, 'time', '14:30');
      formResult.current.updatePerson(1, 'relation', 'friend');
      formResult.current.onPickCity(1, {
        name: 'Tokyo',
        country: 'JP',
        lat: 35.6762,
        lon: 139.6503,
      });

      // Person 3
      formResult.current.updatePerson(2, 'name', 'Charlie');
      formResult.current.updatePerson(2, 'date', '1988-03-20');
      formResult.current.updatePerson(2, 'time', '18:00');
      formResult.current.updatePerson(2, 'relation', 'friend');
      formResult.current.onPickCity(2, {
        name: 'London',
        country: 'UK',
        lat: 51.5074,
        lon: -0.1278,
      });
    });

    const { result: analysisResult } = renderHook(() => useCompatibilityAnalysis());

    // Mock group analysis response
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({
        interpretation: 'Group compatibility analysis',
        is_group: true,
        group_analysis: {
          element_distribution: {
            oheng: { Wood: 2, Fire: 1, Earth: 0, Metal: 1, Water: 2 },
            astro: { fire: 1, earth: 2, air: 1, water: 2 },
          },
          group_roles: {
            leader: ['Alice'],
            mediator: ['Bob'],
            creative: ['Charlie'],
          },
        },
        synergy_breakdown: {
          overall_score: 78,
          avg_pair_score: 72,
          best_pair: { pair: 'Alice & Bob', score: 85 },
          weakest_pair: { pair: 'Bob & Charlie', score: 65 },
        },
      }),
    });

    await act(async () => {
      await analysisResult.current.analyzeCompatibility(formResult.current.persons);
    });

    expect(analysisResult.current.isGroupResult).toBe(true);
    expect(analysisResult.current.groupAnalysis).toBeTruthy();
    expect(analysisResult.current.synergyBreakdown?.overall_score).toBe(78);
  });

  it('should handle validation errors', () => {
    const { result: formResult } = renderHook(() => useCompatibilityForm());
    const { result: analysisResult } = renderHook(() => useCompatibilityAnalysis());

    // Try to validate with empty data
    const error = analysisResult.current.validate(
      formResult.current.persons,
      formResult.current.count,
      mockT
    );

    expect(error).toContain('date and time are required');
  });

  it('should allow resetting and starting over', async () => {
    const { result: formResult } = renderHook(() => useCompatibilityForm());
    const { result: analysisResult } = renderHook(() => useCompatibilityAnalysis());

    // Fill in data and analyze
    act(() => {
      formResult.current.updatePerson(0, 'name', 'Alice');
      formResult.current.updatePerson(0, 'date', '1990-01-01');
      formResult.current.updatePerson(0, 'time', '10:00');
      formResult.current.onPickCity(0, {
        name: 'Seoul',
        country: 'KR',
        lat: 37.5665,
        lon: 126.978,
      });

      formResult.current.updatePerson(1, 'name', 'Bob');
      formResult.current.updatePerson(1, 'date', '1992-05-15');
      formResult.current.updatePerson(1, 'time', '14:30');
      formResult.current.updatePerson(1, 'relation', 'lover');
      formResult.current.onPickCity(1, {
        name: 'Tokyo',
        country: 'JP',
        lat: 35.6762,
        lon: 139.6503,
      });
    });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ interpretation: 'Great match!' }),
    });

    await act(async () => {
      await analysisResult.current.analyzeCompatibility(formResult.current.persons);
    });

    expect(analysisResult.current.resultText).toBe('Great match!');

    // Reset
    act(() => {
      analysisResult.current.resetResults();
    });

    expect(analysisResult.current.resultText).toBeNull();
    expect(analysisResult.current.timing).toBeNull();
    expect(analysisResult.current.actionItems).toEqual([]);
  });

  it('should fill from My Circle', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    const savedPerson = {
      name: 'Jane Doe',
      birthDate: '1995-08-20',
      birthTime: '16:00',
      birthCity: 'Paris, FR',
      latitude: 48.8566,
      longitude: 2.3522,
      tzId: 'Europe/Paris',
      relation: 'partner',
    };

    act(() => {
      result.current.fillFromCircle(1, savedPerson);
    });

    expect(result.current.persons[1].name).toBe('Jane Doe');
    expect(result.current.persons[1].date).toBe('1995-08-20');
    expect(result.current.persons[1].time).toBe('16:00');
    expect(result.current.persons[1].cityQuery).toBe('Paris, FR');
    expect(result.current.persons[1].relation).toBe('lover'); // 'partner' maps to 'lover'
  });
});
