import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCityAutocomplete } from '@/hooks/useCityAutocomplete';
import { searchCities } from '@/lib/cities';
import type { PersonForm } from '@/app/compatibility/lib';

// Mock searchCities
vi.mock('@/lib/cities', () => ({
  searchCities: vi.fn(),
}));

describe('useCityAutocomplete', () => {
  let mockSetPersons: ReturnType<typeof vi.fn>;
  let persons: PersonForm[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockSetPersons = vi.fn((updater) => {
      persons = typeof updater === 'function' ? updater(persons) : updater;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const createMockPerson = (cityQuery = '', lat: number | null = null, lon: number | null = null): PersonForm => ({
    name: '',
    date: '',
    time: '',
    cityQuery,
    lat,
    lon,
    timeZone: 'UTC',
    suggestions: [],
    showDropdown: false,
  });

  it('should not search when query is too short', () => {
    persons = [createMockPerson('S')];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(200);

    expect(searchCities).not.toHaveBeenCalled();
  });

  it('should search cities after debounce delay', async () => {
    const mockCities = [
      { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 },
    ];
    (searchCities as ReturnType<typeof vi.fn>).mockResolvedValue(mockCities);

    persons = [createMockPerson('Seoul')];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(150);

    await waitFor(() => {
      expect(searchCities).toHaveBeenCalledWith('Seoul', { limit: 20 });
    });
  });

  it('should update suggestions state after search', async () => {
    const mockCities = [
      { name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 },
      { name: 'Seongnam', country: 'KR', lat: 37.4386, lon: 127.1378 },
    ];
    (searchCities as ReturnType<typeof vi.fn>).mockResolvedValue(mockCities);

    persons = [createMockPerson('Seo')];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(150);

    await waitFor(() => {
      expect(mockSetPersons).toHaveBeenCalled();
      const updateFn = mockSetPersons.mock.calls[0][0];
      const updated = updateFn(persons);
      expect(updated[0].suggestions).toEqual(mockCities);
      expect(updated[0].showDropdown).toBe(true);
    });
  });

  it('should not search when city is already selected', () => {
    persons = [createMockPerson('Seoul, KR', 37.5665, 126.978)];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(200);

    expect(searchCities).not.toHaveBeenCalled();
  });

  it('should handle search errors gracefully', async () => {
    (searchCities as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

    persons = [createMockPerson('Seoul')];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(150);

    await waitFor(() => {
      expect(mockSetPersons).toHaveBeenCalled();
      const updateFn = mockSetPersons.mock.calls[0][0];
      const updated = updateFn(persons);
      expect(updated[0].suggestions).toEqual([]);
    });
  });

  it('should clear suggestions when query is cleared', () => {
    persons = [createMockPerson('')];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(200);

    expect(mockSetPersons).toHaveBeenCalled();
  });

  it('should debounce multiple searches', async () => {
    const mockCities = [{ name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 }];
    (searchCities as ReturnType<typeof vi.fn>).mockResolvedValue(mockCities);

    persons = [createMockPerson('Se')];
    const { rerender } = renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(50);
    persons = [createMockPerson('Seo')];
    rerender();

    vi.advanceTimersByTime(50);
    persons = [createMockPerson('Seou')];
    rerender();

    vi.advanceTimersByTime(150);

    await waitFor(() => {
      expect(searchCities).toHaveBeenCalledTimes(1);
      expect(searchCities).toHaveBeenCalledWith('Seou', { limit: 20 });
    });
  });

  it('should handle multiple persons independently', async () => {
    const mockCities = [{ name: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978 }];
    (searchCities as ReturnType<typeof vi.fn>).mockResolvedValue(mockCities);

    persons = [
      createMockPerson('Seoul'),
      createMockPerson('Tokyo'),
    ];
    renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    vi.advanceTimersByTime(150);

    await waitFor(() => {
      expect(searchCities).toHaveBeenCalledTimes(2);
      expect(searchCities).toHaveBeenCalledWith('Seoul', { limit: 20 });
      expect(searchCities).toHaveBeenCalledWith('Tokyo', { limit: 20 });
    });
  });

  it('should cleanup timers on unmount', () => {
    persons = [createMockPerson('Seoul')];
    const { unmount } = renderHook(() => useCityAutocomplete(persons, mockSetPersons));

    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
