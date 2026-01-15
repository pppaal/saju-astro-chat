// tests/reducers/all-reducers.test.ts
/**
 * Tests for all reducer modules
 * Validates reducer exports and structure
 */
import { describe, it, expect } from 'vitest';

describe('All Reducers Tests', () => {
  describe('Calendar Reducer', () => {
    it('should export calendarReducer and initialState', async () => {
      const module = await import('@/reducers/calendarReducer');

      expect(module.calendarReducer).toBeDefined();
      expect(module.initialCalendarState).toBeDefined();
      expect(typeof module.calendarReducer).toBe('function');
      expect(typeof module.initialCalendarState).toBe('object');
    });

    it('should have correct initial state structure', async () => {
      const { initialCalendarState } = await import('@/reducers/calendarReducer');

      expect(initialCalendarState).toHaveProperty('loading');
      expect(initialCalendarState).toHaveProperty('data');
      expect(initialCalendarState.loading).toBe(false);
      expect(initialCalendarState.data).toBeNull();
    });

    it('should handle LOAD_START action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer');

      const newState = calendarReducer(initialCalendarState, { type: 'LOAD_START' });

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });

    it('should handle LOAD_SUCCESS action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer');

      const mockData = {
        allDates: [],
        importantDates: [],
        year: 2024,
        month: 1,
      };

      const newState = calendarReducer(initialCalendarState, {
        type: 'LOAD_SUCCESS',
        payload: mockData,
      });

      expect(newState.loading).toBe(false);
      expect(newState.data).toEqual(mockData);
      expect(newState.error).toBeNull();
    });

    it('should handle LOAD_ERROR action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer');

      const errorMessage = 'Failed to load calendar data';

      const newState = calendarReducer(initialCalendarState, {
        type: 'LOAD_ERROR',
        payload: errorMessage,
      });

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe(errorMessage);
    });

    it('should handle SELECT_DATE action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer');

      const mockDate = {
        date: '2024-01-15',
        score: 75,
        grade: 1,
        factors: [],
      };

      const newState = calendarReducer(initialCalendarState, {
        type: 'SELECT_DATE',
        payload: mockDate,
      });

      expect(newState.selectedDate).toEqual(mockDate);
    });

    it('should handle SET_BIRTH_INFO action', async () => {
      const { calendarReducer, initialCalendarState } = await import('@/reducers/calendarReducer');

      const mockBirthInfo = {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
        timezone: 'Asia/Seoul',
      };

      const newState = calendarReducer(initialCalendarState, {
        type: 'SET_BIRTH_INFO',
        payload: mockBirthInfo,
      });

      expect(newState.birthInfo).toEqual(mockBirthInfo);
      expect(newState.hasBirthInfo).toBe(true);
    });
  });

  describe('Reducer Summary', () => {
    it('should have all reducer modules', async () => {
      const reducers = await Promise.all([
        import('@/reducers/calendarReducer'),
      ]);

      expect(reducers.length).toBe(1);
      reducers.forEach((reducer) => {
        expect(reducer).toBeDefined();
        expect(Object.keys(reducer).length).toBeGreaterThan(0);
      });
    });
  });
});
