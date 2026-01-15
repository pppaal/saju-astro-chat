// tests/hooks/calendar/useMonthNavigation.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMonthNavigation } from '@/hooks/calendar/useMonthNavigation';

describe('useMonthNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with current date', () => {
      const { result } = renderHook(() => useMonthNavigation());

      expect(result.current.currentDate).toBeInstanceOf(Date);
      expect(result.current.slideDirection).toBeNull();
    });

    it('should initialize with custom date', () => {
      const customDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(customDate));

      expect(result.current.currentDate.getFullYear()).toBe(2024);
      expect(result.current.currentDate.getMonth()).toBe(5); // June is month 5 (0-indexed)
    });
  });

  describe('goToPrevMonth', () => {
    it('should navigate to previous month', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToPrevMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(4); // May
      expect(result.current.currentDate.getFullYear()).toBe(2024);
      expect(result.current.slideDirection).toBe('right');
    });

    it('should handle year boundary - January to December', () => {
      const initialDate = new Date('2024-01-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToPrevMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(11); // December
      expect(result.current.currentDate.getFullYear()).toBe(2023);
    });

    it('should clear slide direction after animation', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToPrevMonth();
      });

      expect(result.current.slideDirection).toBe('right');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.slideDirection).toBeNull();
    });
  });

  describe('goToNextMonth', () => {
    it('should navigate to next month', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(6); // July
      expect(result.current.currentDate.getFullYear()).toBe(2024);
      expect(result.current.slideDirection).toBe('left');
    });

    it('should handle year boundary - December to January', () => {
      const initialDate = new Date('2024-12-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(0); // January
      expect(result.current.currentDate.getFullYear()).toBe(2025);
    });

    it('should clear slide direction after animation', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.slideDirection).toBe('left');

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.slideDirection).toBeNull();
    });
  });

  describe('goToToday', () => {
    it('should navigate to current month', () => {
      const pastDate = new Date('2020-01-15');
      const { result } = renderHook(() => useMonthNavigation(pastDate));

      const today = new Date();

      act(() => {
        result.current.goToToday();
      });

      expect(result.current.currentDate.getMonth()).toBe(today.getMonth());
      expect(result.current.currentDate.getFullYear()).toBe(today.getFullYear());
    });

    it('should not set slide direction', () => {
      const pastDate = new Date('2020-01-15');
      const { result } = renderHook(() => useMonthNavigation(pastDate));

      act(() => {
        result.current.goToToday();
      });

      expect(result.current.slideDirection).toBeNull();
    });
  });

  describe('setCurrentDate', () => {
    it('should allow manual date setting', () => {
      const { result } = renderHook(() => useMonthNavigation());

      const newDate = new Date('2025-12-25');

      act(() => {
        result.current.setCurrentDate(newDate);
      });

      expect(result.current.currentDate.getFullYear()).toBe(2025);
      expect(result.current.currentDate.getMonth()).toBe(11); // December
    });

    it('should not set slide direction on manual date change', () => {
      const { result } = renderHook(() => useMonthNavigation());

      const newDate = new Date('2025-12-25');

      act(() => {
        result.current.setCurrentDate(newDate);
      });

      expect(result.current.slideDirection).toBeNull();
    });
  });

  describe('sequential navigation', () => {
    it('should handle multiple prev month navigations', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToPrevMonth();
        result.current.goToPrevMonth();
        result.current.goToPrevMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(2); // March
      expect(result.current.currentDate.getFullYear()).toBe(2024);
    });

    it('should handle multiple next month navigations', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth();
        result.current.goToNextMonth();
        result.current.goToNextMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(8); // September
      expect(result.current.currentDate.getFullYear()).toBe(2024);
    });

    it('should handle mixed navigation', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth(); // July
        result.current.goToNextMonth(); // August
        result.current.goToPrevMonth(); // July
        result.current.goToPrevMonth(); // June
      });

      expect(result.current.currentDate.getMonth()).toBe(5); // Back to June
      expect(result.current.currentDate.getFullYear()).toBe(2024);
    });
  });

  describe('edge cases', () => {
    it('should handle leap year February to March', () => {
      const leapYearFeb = new Date('2024-02-29'); // 2024 is a leap year
      const { result } = renderHook(() => useMonthNavigation(leapYearFeb));

      act(() => {
        result.current.goToNextMonth();
      });

      expect(result.current.currentDate.getMonth()).toBe(2); // March
      expect(result.current.currentDate.getFullYear()).toBe(2024);
    });

    it('should handle navigation across multiple years', () => {
      const initialDate = new Date('2024-11-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth(); // Dec 2024
        result.current.goToNextMonth(); // Jan 2025
        result.current.goToNextMonth(); // Feb 2025
      });

      expect(result.current.currentDate.getMonth()).toBe(1); // February
      expect(result.current.currentDate.getFullYear()).toBe(2025);
    });

    it('should handle rapid navigation', () => {
      const initialDate = new Date('2024-06-15');
      const { result } = renderHook(() => useMonthNavigation(initialDate));

      act(() => {
        result.current.goToNextMonth();
        result.current.goToNextMonth();
        result.current.goToNextMonth();
      });

      // Should still be able to navigate even if animation hasn't cleared
      expect(result.current.currentDate.getMonth()).toBe(8); // September
    });
  });

  describe('cleanup', () => {
    it('should clean up timeout on unmount', () => {
      const { result, unmount } = renderHook(() => useMonthNavigation());

      act(() => {
        result.current.goToNextMonth();
      });

      // Unmount before timeout completes
      unmount();

      // Advance timers - should not cause errors
      act(() => {
        vi.advanceTimersByTime(300);
      });
    });
  });
});
