// tests/reducers/calendarReducer.test.ts
import { describe, it, expect } from 'vitest';
import { calendarReducer, initialCalendarState as initialState, type CalendarState, type CalendarAction } from '@/reducers/calendarReducer';

describe('calendarReducer', () => {
  describe('LOAD_START', () => {
    it('should set loading to true and clear error', () => {
      const state: CalendarState = {
        ...initialState,
        error: 'Previous error',
        loading: false,
      };

      const action: CalendarAction = { type: 'LOAD_START' };
      const newState = calendarReducer(state, action);

      expect(newState.loading).toBe(true);
      expect(newState.error).toBeNull();
    });
  });

  describe('LOAD_SUCCESS', () => {
    it('should set data and stop loading', () => {
      const mockData = {
        success: true,
        year: 2024,
        allDates: [],
      };

      const action: CalendarAction = {
        type: 'LOAD_SUCCESS',
        payload: { data: mockData, cached: false },
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.loading).toBe(false);
      expect(newState.data).toEqual(mockData);
      expect(newState.error).toBeNull();
    });

    it('should mark cache hit when payload indicates cached data', () => {
      const mockData = {
        allDates: [],
        importantDates: [],
        yearSummary: {
          bestDays: 0,
          goodDays: 0,
          normalDays: 0,
          badDays: 0,
          worstDays: 0,
          avgScore: 0,
        },
      };

      const action: CalendarAction = {
        type: 'LOAD_SUCCESS',
        payload: mockData,
        cached: true,
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.cacheHit).toBe(true);
    });
  });

  describe('LOAD_ERROR', () => {
    it('should set error and stop loading', () => {
      const state: CalendarState = {
        ...initialState,
        loading: true,
      };

      const action: CalendarAction = {
        type: 'LOAD_ERROR',
        payload: 'Network error',
      };

      const newState = calendarReducer(state, action);

      expect(newState.loading).toBe(false);
      expect(newState.error).toBe('Network error');
      expect(newState.data).toBeNull();
    });
  });

  describe('SELECT_DATE', () => {
    it('should set selected date and day', () => {
      const mockDate = {
        date: '2024-01-15',
        grade: 1 as const,
        score: 75,
        categories: ['wealth' as const],
        title: 'Good day',
        description: 'Test description',
        sajuFactors: ['Factor 1'],
        astroFactors: ['Factor 2'],
        recommendations: ['Rec 1'],
        warnings: ['Warning 1'],
      };

      const action: CalendarAction = {
        type: 'SELECT_DATE',
        payload: mockDate,
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.selectedDate).toEqual(mockDate);
      expect(newState.selectedDay).toEqual(new Date('2024-01-15'));
    });

    it('should handle null selection', () => {
      const state: CalendarState = {
        ...initialState,
        selectedDate: {
          date: '2024-01-15',
          grade: 1,
          score: 75,
          categories: ['wealth'],
          title: 'Good day',
          description: 'Test',
          sajuFactors: [],
          astroFactors: [],
          recommendations: [],
          warnings: [],
        },
        selectedDay: new Date('2024-01-15'),
      };

      const action: CalendarAction = {
        type: 'SELECT_DATE',
        payload: null,
      };

      const newState = calendarReducer(state, action);

      expect(newState.selectedDate).toBeNull();
      expect(newState.selectedDay).toBeNull();
    });
  });

  describe('SET_CATEGORY', () => {
    it('should update active category', () => {
      const action: CalendarAction = {
        type: 'SET_CATEGORY',
        payload: 'wealth',
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.activeCategory).toBe('wealth');
    });
  });

  describe('SET_BIRTH_INFO', () => {
    it('should set birth info and mark as having birth info', () => {
      const birthInfo = {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
        timezone: 'Asia/Seoul',
      };

      const action: CalendarAction = {
        type: 'SET_BIRTH_INFO',
        payload: birthInfo,
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.birthInfo).toEqual(birthInfo);
      expect(newState.hasBirthInfo).toBe(true);
    });
  });

  describe('TOGGLE_THEME', () => {
    it('should toggle theme from light to dark', () => {
      const state: CalendarState = {
        ...initialState,
        theme: 'light',
      };

      const action: CalendarAction = { type: 'TOGGLE_THEME' };
      const newState = calendarReducer(state, action);

      expect(newState.theme).toBe('dark');
    });

    it('should toggle theme from dark to light', () => {
      const state: CalendarState = {
        ...initialState,
        theme: 'dark',
      };

      const action: CalendarAction = { type: 'TOGGLE_THEME' };
      const newState = calendarReducer(state, action);

      expect(newState.theme).toBe('light');
    });
  });

  describe('SET_SLIDE_DIRECTION', () => {
    it('should set slide direction', () => {
      const action: CalendarAction = {
        type: 'SET_SLIDE_DIRECTION',
        payload: 'left',
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.slideDirection).toBe('left');
    });

    it('should handle null slide direction', () => {
      const state: CalendarState = {
        ...initialState,
        slideDirection: 'left',
      };

      const action: CalendarAction = {
        type: 'SET_SLIDE_DIRECTION',
        payload: null,
      };

      const newState = calendarReducer(state, action);

      expect(newState.slideDirection).toBeNull();
    });
  });

  describe('ADD_SAVED_DATE', () => {
    it('should add date to saved dates set', () => {
      const action: CalendarAction = {
        type: 'ADD_SAVED_DATE',
        payload: '2024-01-15',
      };

      const newState = calendarReducer(initialState, action);

      expect(newState.savedDates.has('2024-01-15')).toBe(true);
    });

    it('should not duplicate saved dates', () => {
      const state: CalendarState = {
        ...initialState,
        savedDates: new Set(['2024-01-15']),
      };

      const action: CalendarAction = {
        type: 'ADD_SAVED_DATE',
        payload: '2024-01-15',
      };

      const newState = calendarReducer(state, action);

      expect(newState.savedDates.size).toBe(1);
      expect(newState.savedDates.has('2024-01-15')).toBe(true);
    });
  });

  describe('REMOVE_SAVED_DATE', () => {
    it('should remove date from saved dates set', () => {
      const state: CalendarState = {
        ...initialState,
        savedDates: new Set(['2024-01-15', '2024-01-20']),
      };

      const action: CalendarAction = {
        type: 'REMOVE_SAVED_DATE',
        payload: '2024-01-15',
      };

      const newState = calendarReducer(state, action);

      expect(newState.savedDates.has('2024-01-15')).toBe(false);
      expect(newState.savedDates.has('2024-01-20')).toBe(true);
      expect(newState.savedDates.size).toBe(1);
    });

    it('should handle removing non-existent date', () => {
      const state: CalendarState = {
        ...initialState,
        savedDates: new Set(['2024-01-15']),
      };

      const action: CalendarAction = {
        type: 'REMOVE_SAVED_DATE',
        payload: '2024-01-20',
      };

      const newState = calendarReducer(state, action);

      expect(newState.savedDates.size).toBe(1);
      expect(newState.savedDates.has('2024-01-15')).toBe(true);
    });
  });

  describe('Complex state transitions', () => {
    it('should handle multiple actions in sequence', () => {
      let state = initialState;

      // Set birth info
      state = calendarReducer(state, {
        type: 'SET_BIRTH_INFO',
        payload: {
          birthDate: '1990-01-15',
          birthTime: '14:30',
          latitude: 37.5665,
          longitude: 126.9780,
          timezone: 'Asia/Seoul',
        },
      });

      expect(state.hasBirthInfo).toBe(true);

      // Start loading
      state = calendarReducer(state, { type: 'LOAD_START' });
      expect(state.loading).toBe(true);

      // Load success
      state = calendarReducer(state, {
        type: 'LOAD_SUCCESS',
        payload: {
          allDates: [],
          importantDates: [],
          yearSummary: {
            bestDays: 0,
            goodDays: 0,
            normalDays: 0,
            badDays: 0,
            worstDays: 0,
            avgScore: 0,
          },
        },
      });

      expect(state.loading).toBe(false);
      expect(state.data).toBeDefined();

      // Select category
      state = calendarReducer(state, {
        type: 'SET_CATEGORY',
        payload: 'wealth',
      });

      expect(state.activeCategory).toBe('wealth');

      // Add saved date
      state = calendarReducer(state, {
        type: 'ADD_SAVED_DATE',
        payload: '2024-01-15',
      });

      expect(state.savedDates.has('2024-01-15')).toBe(true);
    });
  });

  describe('Edge cases', () => {
    it('should handle unknown action type gracefully', () => {
      const unknownAction = { type: 'UNKNOWN_ACTION' } as any;
      const newState = calendarReducer(initialState, unknownAction);

      expect(newState).toEqual(initialState);
    });

    it('should preserve immutability - not mutate original state', () => {
      const originalState = { ...initialState };
      const action: CalendarAction = {
        type: 'SET_CATEGORY',
        payload: 'wealth',
      };

      calendarReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should create new Set instance for savedDates', () => {
      const state1 = calendarReducer(initialState, {
        type: 'ADD_SAVED_DATE',
        payload: '2024-01-15',
      });

      const state2 = calendarReducer(state1, {
        type: 'ADD_SAVED_DATE',
        payload: '2024-01-20',
      });

      expect(state1.savedDates).not.toBe(state2.savedDates);
      expect(state1.savedDates.size).toBe(1);
      expect(state2.savedDates.size).toBe(2);
    });
  });
});
