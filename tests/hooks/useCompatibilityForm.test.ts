import { renderHook, act } from '@testing-library/react';
import { useCompatibilityForm } from '@/hooks/useCompatibilityForm';

describe('useCompatibilityForm', () => {
  it('should initialize with 2 persons by default', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    expect(result.current.count).toBe(2);
    expect(result.current.persons).toHaveLength(2);
    expect(result.current.persons[0].name).toBe('');
    expect(result.current.persons[1].relation).toBe('lover');
  });

  it('should add persons when count increases', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    act(() => {
      result.current.setCount(4);
    });

    expect(result.current.persons).toHaveLength(4);
    expect(result.current.persons[2].relation).toBe('friend');
    expect(result.current.persons[3].relation).toBe('friend');
  });

  it('should remove persons when count decreases', () => {
    const { result } = renderHook(() => useCompatibilityForm(4));

    act(() => {
      result.current.setCount(2);
    });

    expect(result.current.persons).toHaveLength(2);
  });

  it('should update person field', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    act(() => {
      result.current.updatePerson(0, 'name', 'John');
      result.current.updatePerson(0, 'date', '1990-01-01');
    });

    expect(result.current.persons[0].name).toBe('John');
    expect(result.current.persons[0].date).toBe('1990-01-01');
  });

  it('should fill person from circle data', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    const savedPerson = {
      name: 'Alice',
      birthDate: '1995-05-15',
      birthTime: '14:30',
      birthCity: 'Seoul, KR',
      latitude: 37.5665,
      longitude: 126.9780,
      tzId: 'Asia/Seoul',
      relation: 'partner',
    };

    act(() => {
      result.current.fillFromCircle(1, savedPerson);
    });

    expect(result.current.persons[1].name).toBe('Alice');
    expect(result.current.persons[1].date).toBe('1995-05-15');
    expect(result.current.persons[1].time).toBe('14:30');
    expect(result.current.persons[1].cityQuery).toBe('Seoul, KR');
    expect(result.current.persons[1].lat).toBe(37.5665);
    expect(result.current.persons[1].lon).toBe(126.9780);
    expect(result.current.persons[1].timeZone).toBe('Asia/Seoul');
    expect(result.current.persons[1].relation).toBe('lover'); // 'partner' maps to 'lover'
  });

  it('should pick city and set coordinates', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    const city = {
      name: 'New York',
      country: 'US',
      lat: 40.7128,
      lon: -74.0060,
    };

    act(() => {
      result.current.onPickCity(0, city);
    });

    expect(result.current.persons[0].cityQuery).toBe('New York, US');
    expect(result.current.persons[0].lat).toBe(40.7128);
    expect(result.current.persons[0].lon).toBe(-74.0060);
    expect(result.current.persons[0].showDropdown).toBe(false);
    expect(result.current.persons[0].suggestions).toEqual([]);
  });

  it('should map relations correctly', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    act(() => {
      result.current.fillFromCircle(1, {
        name: 'Bob',
        relation: 'friend',
      });
    });
    expect(result.current.persons[1].relation).toBe('friend');

    act(() => {
      result.current.fillFromCircle(1, {
        name: 'Charlie',
        relation: 'family',
      });
    });
    expect(result.current.persons[1].relation).toBe('other');
  });

  it('should not set relation for person 0', () => {
    const { result } = renderHook(() => useCompatibilityForm());

    act(() => {
      result.current.fillFromCircle(0, {
        name: 'Self',
        relation: 'partner',
      });
    });

    expect(result.current.persons[0].relation).toBeUndefined();
  });
});
