// tests/contexts/CalendarContext.test.tsx
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CalendarProvider, useCalendarContext } from '@/contexts/CalendarContext';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <CalendarProvider>{children}</CalendarProvider>
);

describe('CalendarContext', () => {
  describe('CalendarProvider', () => {
    it('should provide initial state', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      expect(result.current.selectedDate).toBeNull();
      expect(result.current.selectedDay).toBeNull();
      expect(result.current.activeCategory).toBe('all');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should throw error when used outside provider', () => {
      expect(() => {
        renderHook(() => useCalendarContext());
      }).toThrow('useCalendarContext must be used within CalendarProvider');
    });
  });

  describe('setSelectedDate', () => {
    it('should set selected date', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      const mockDate = {
        date: '2024-01-15',
        grade: 0 as const,
        score: 85,
        categories: ['career' as const],
        title: 'Good Day',
        description: 'A very good day',
        sajuFactors: [],
        astroFactors: [],
        recommendations: [],
        warnings: [],
      };

      act(() => {
        result.current.setSelectedDate(mockDate);
      });

      expect(result.current.selectedDate).toEqual(mockDate);
    });

    it('should clear selected date when set to null', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.setSelectedDate(null);
      });

      expect(result.current.selectedDate).toBeNull();
    });
  });

  describe('setSelectedDay', () => {
    it('should set selected day', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      const testDate = new Date(2024, 0, 15);

      act(() => {
        result.current.setSelectedDay(testDate);
      });

      expect(result.current.selectedDay).toEqual(testDate);
    });
  });

  describe('setActiveCategory', () => {
    it('should set active category', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.setActiveCategory('career');
      });

      expect(result.current.activeCategory).toBe('career');
    });

    it('should set category to all', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.setActiveCategory('wealth');
      });

      act(() => {
        result.current.setActiveCategory('all');
      });

      expect(result.current.activeCategory).toBe('all');
    });
  });

  describe('setBirthInfo', () => {
    it('should set birth info', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      const birthInfo = {
        birthDate: '1990-01-15',
        birthTime: '10:30',
        birthPlace: 'Seoul',
        gender: 'Male' as const,
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      act(() => {
        result.current.setBirthInfo(birthInfo);
      });

      expect(result.current.birthInfo).toEqual(birthInfo);
    });
  });

  describe('setHasBirthInfo', () => {
    it('should set hasBirthInfo flag', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.setHasBirthInfo(true);
      });

      expect(result.current.hasBirthInfo).toBe(true);
    });
  });

  describe('setSubmitting', () => {
    it('should set submitting state', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.setSubmitting(true);
      });

      expect(result.current.submitting).toBe(true);

      act(() => {
        result.current.setSubmitting(false);
      });

      expect(result.current.submitting).toBe(false);
    });
  });

  describe('setTimeUnknown', () => {
    it('should set time unknown flag', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.setTimeUnknown(true);
      });

      expect(result.current.timeUnknown).toBe(true);
    });
  });

  describe('toggleTheme', () => {
    it('should toggle theme', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      const initialTheme = result.current.isDarkTheme;

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.isDarkTheme).toBe(!initialTheme);
    });
  });

  describe('loading state', () => {
    it('should handle loading start', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.loadCalendarStart();
      });

      expect(result.current.loading).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading success', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      const mockData = {
        success: true,
        year: 2024,
        summary: {
          total: 365,
          grade0: 10,
          grade1: 50,
          grade2: 200,
          grade3: 80,
          grade4: 25,
        },
        topDates: [],
        goodDates: [],
        cautionDates: [],
        allDates: [],
      };

      act(() => {
        result.current.loadCalendarStart();
      });

      act(() => {
        result.current.loadCalendarSuccess(mockData, false);
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.data).toEqual(mockData);
      expect(result.current.cacheHit).toBe(false);
    });

    it('should handle loading error', () => {
      const { result } = renderHook(() => useCalendarContext(), { wrapper });

      act(() => {
        result.current.loadCalendarStart();
      });

      act(() => {
        result.current.loadCalendarError('Failed to load calendar');
      });

      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Failed to load calendar');
    });
  });
});
