// src/hooks/calendar/useMonthNavigation.ts
import { useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

type SlideDirection = 'left' | 'right' | null;

interface UseMonthNavigationReturn {
  currentDate: Date;
  slideDirection: SlideDirection;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  setCurrentDate: (date: Date) => void;
}

/**
 * Hook for calendar month navigation with animation support
 */
export function useMonthNavigation(initialDate = new Date()): UseMonthNavigationReturn {
  const [currentDate, setCurrentDate] = useState(initialDate);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);

  const goToPrevMonth = useCallback(() => {
    setSlideDirection('right');
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() - 1);
      return next;
    });

    // Reset animation after transition
    setTimeout(() => setSlideDirection(null), 300);

    logger.debug('[useMonthNavigation] Navigate to previous month');
  }, []);

  const goToNextMonth = useCallback(() => {
    setSlideDirection('left');
    setCurrentDate((prev) => {
      const next = new Date(prev);
      next.setMonth(prev.getMonth() + 1);
      return next;
    });

    // Reset animation after transition
    setTimeout(() => setSlideDirection(null), 300);

    logger.debug('[useMonthNavigation] Navigate to next month');
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSlideDirection(null);

    logger.debug('[useMonthNavigation] Navigate to today');
  }, []);

  return {
    currentDate,
    slideDirection,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    setCurrentDate,
  };
}
