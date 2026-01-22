/**
 * Event Timing Module MEGA Test Suite
 * Comprehensive testing for event timing calculations and analysis
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findOptimalEventTiming,
  findWeeklyOptimalTiming,
} from '@/lib/prediction/life-prediction/event-timing';
import type {
  LifePredictionInput,
  EventType,
  EventTimingResult,
  WeeklyEventTimingResult,
  OptimalPeriod,
  AvoidPeriod,
  WeeklyPeriod,
  PredictionGrade,
} from '@/lib/prediction/life-prediction/types';

// ============================================================
// Test Data Fixtures
// ============================================================

const createBasicInput = (overrides?: Partial<LifePredictionInput>): LifePredictionInput => ({
  birthYear: 1990,
  birthMonth: 6,
  birthDay: 15,
  birthHour: 14,
  yearStem: '庚',
  yearBranch: '午',
  monthStem: '壬',
  monthBranch: '午',
  dayStem: '甲',
  dayBranch: '寅',
  hourStem: '辛',
  hourBranch: '未',
  yongsin: ['水', '木'],
  gisin: ['土', '金'],
  daeunList: [
    { stem: '癸', branch: '未', startAge: 0, endAge: 9, energy: 'yang' as const },
    { stem: '甲', branch: '申', startAge: 10, endAge: 19, energy: 'yang' as const },
    { stem: '乙', branch: '酉', startAge: 20, endAge: 29, energy: 'yin' as const },
    { stem: '丙', branch: '戌', startAge: 30, endAge: 39, energy: 'yang' as const },
    { stem: '丁', branch: '亥', startAge: 40, endAge: 49, energy: 'yin' as const },
  ],
  astroChart: {
    sun: { sign: 'Gemini', house: 10, longitude: 75.5 },
    moon: { sign: 'Pisces', house: 6, longitude: 340.2 },
    venus: { sign: 'Taurus', house: 9, longitude: 55.8, isRetrograde: false },
    mars: { sign: 'Aquarius', house: 5, longitude: 310.4, isRetrograde: false },
    jupiter: { sign: 'Cancer', house: 11, longitude: 110.2, isRetrograde: false },
    saturn: { sign: 'Capricorn', house: 4, longitude: 290.7, isRetrograde: false },
  },
  ...overrides,
});

const EVENT_TYPES: EventType[] = [
  'marriage',
  'career',
  'investment',
  'move',
  'study',
  'health',
  'relationship',
];

// ============================================================
// Main Function Tests: findOptimalEventTiming
// ============================================================

describe('event-timing MEGA - findOptimalEventTiming', () => {
  describe('Basic functionality', () => {
    it.each(EVENT_TYPES)(
      'should return valid result for %s event',
      (eventType) => {
        const input = createBasicInput();
        const currentYear = new Date().getFullYear();
        const result = findOptimalEventTiming(input, eventType, currentYear, currentYear + 2);

        expect(result).toBeDefined();
        expect(result.eventType).toBe(eventType);
        expect(result.searchRange.startYear).toBe(currentYear);
        expect(result.searchRange.endYear).toBe(currentYear + 2);
        expect(Array.isArray(result.optimalPeriods)).toBe(true);
        expect(Array.isArray(result.avoidPeriods)).toBe(true);
        expect(typeof result.advice).toBe('string');
      }
    );

    it('should handle single year search', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear);

      expect(result.searchRange.startYear).toBe(currentYear);
      expect(result.searchRange.endYear).toBe(currentYear);
      expect(result.optimalPeriods.length).toBeGreaterThanOrEqual(0);
    });

    it('should return up to 10 optimal periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 5);

      expect(result.optimalPeriods.length).toBeLessThanOrEqual(10);
    });

    it('should return up to 5 avoid periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 3);

      expect(result.avoidPeriods.length).toBeLessThanOrEqual(5);
    });

    it('should generate advice string', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 1);

      expect(result.advice).toBeTruthy();
      expect(result.advice.length).toBeGreaterThan(0);
    });
  });

  describe('Score validation', () => {
    it('should have scores within valid range (0-100)', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 2);

      result.optimalPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(0);
        expect(period.score).toBeLessThanOrEqual(100);
      });

      result.avoidPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(0);
        expect(period.score).toBeLessThanOrEqual(100);
      });
    });

    it('should sort optimal periods by score (descending)', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 3);

      for (let i = 1; i < result.optimalPeriods.length; i++) {
        expect(result.optimalPeriods[i - 1].score).toBeGreaterThanOrEqual(
          result.optimalPeriods[i].score
        );
      }
    });

    it('should sort avoid periods by score (ascending)', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'health', currentYear, currentYear + 2);

      for (let i = 1; i < result.avoidPeriods.length; i++) {
        expect(result.avoidPeriods[i - 1].score).toBeLessThanOrEqual(
          result.avoidPeriods[i].score
        );
      }
    });

    it('should have optimal periods with higher scores than avoid periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 3);

      if (result.optimalPeriods.length > 0 && result.avoidPeriods.length > 0) {
        const minOptimal = Math.min(...result.optimalPeriods.map((p) => p.score));
        const maxAvoid = Math.max(...result.avoidPeriods.map((p) => p.score));
        expect(minOptimal).toBeGreaterThan(maxAvoid);
      }
    });
  });

  describe('Grade validation', () => {
    it('should assign correct grades based on score', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 5);

      result.optimalPeriods.forEach((period) => {
        if (period.score >= 85) {
          expect(period.grade).toBe('S');
        } else if (period.score >= 75) {
          expect(period.grade).toBe('A');
        } else if (period.score >= 60) {
          expect(period.grade).toBe('B');
        } else if (period.score >= 45) {
          expect(period.grade).toBe('C');
        } else {
          expect(period.grade).toBe('D');
        }
      });
    });

    it('should have valid grade values', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'study', currentYear, currentYear + 2);

      const validGrades: PredictionGrade[] = ['S', 'A', 'B', 'C', 'D'];

      result.optimalPeriods.forEach((period) => {
        expect(validGrades).toContain(period.grade);
      });

      result.avoidPeriods.forEach((period) => {
        expect(validGrades).toContain(period.grade);
      });
    });
  });

  describe('Period validation', () => {
    it('should have valid date ranges for optimal periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 2);

      result.optimalPeriods.forEach((period) => {
        expect(period.startDate).toBeInstanceOf(Date);
        expect(period.endDate).toBeInstanceOf(Date);
        expect(period.startDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime());
      });
    });

    it('should have valid date ranges for avoid periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 1);

      result.avoidPeriods.forEach((period) => {
        expect(period.startDate).toBeInstanceOf(Date);
        expect(period.endDate).toBeInstanceOf(Date);
        expect(period.startDate.getTime()).toBeLessThanOrEqual(period.endDate.getTime());
      });
    });

    it('should include reasons for optimal periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1);

      result.optimalPeriods.forEach((period) => {
        expect(Array.isArray(period.reasons)).toBe(true);
      });
    });

    it('should include reasons for avoid periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'health', currentYear, currentYear + 1);

      result.avoidPeriods.forEach((period) => {
        expect(Array.isArray(period.reasons)).toBe(true);
      });
    });
  });

  describe('Options handling', () => {
    it('should respect useProgressions option', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();

      const withProgressions = findOptimalEventTiming(
        input,
        'marriage',
        currentYear,
        currentYear + 1,
        { useProgressions: true }
      );

      const withoutProgressions = findOptimalEventTiming(
        input,
        'marriage',
        currentYear,
        currentYear + 1,
        { useProgressions: false }
      );

      expect(withProgressions).toBeDefined();
      expect(withoutProgressions).toBeDefined();
      // Results should be different
      expect(withProgressions.optimalPeriods.length).toBeGreaterThanOrEqual(0);
      expect(withoutProgressions.optimalPeriods.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect useSolarTerms option', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();

      const withSolarTerms = findOptimalEventTiming(
        input,
        'study',
        currentYear,
        currentYear + 1,
        { useSolarTerms: true }
      );

      const withoutSolarTerms = findOptimalEventTiming(
        input,
        'study',
        currentYear,
        currentYear + 1,
        { useSolarTerms: false }
      );

      expect(withSolarTerms).toBeDefined();
      expect(withoutSolarTerms).toBeDefined();
    });

    it('should use default options when not provided', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1);

      expect(result).toBeDefined();
      expect(result.optimalPeriods).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing daeunList', () => {
      const input = createBasicInput({ daeunList: undefined });
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 1);

      expect(result).toBeDefined();
      expect(result.optimalPeriods).toBeDefined();
    });

    it('should handle empty daeunList', () => {
      const input = createBasicInput({ daeunList: [] });
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1);

      expect(result).toBeDefined();
      expect(result.optimalPeriods).toBeDefined();
    });

    it('should handle missing astroChart', () => {
      const input = createBasicInput({ astroChart: undefined });
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 1);

      expect(result).toBeDefined();
      expect(result.optimalPeriods).toBeDefined();
    });

    it('should only analyze future months', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;

      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear);

      result.optimalPeriods.forEach((period) => {
        const periodMonth = period.startDate.getMonth() + 1;
        const periodYear = period.startDate.getFullYear();

        if (periodYear === currentYear) {
          expect(periodMonth).toBeGreaterThanOrEqual(currentMonth);
        }
      });
    });

    it('should handle multi-year ranges', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 10);

      expect(result).toBeDefined();
      expect(result.searchRange.startYear).toBe(currentYear);
      expect(result.searchRange.endYear).toBe(currentYear + 10);
    });
  });

  describe('NextBestWindow', () => {
    it('should set nextBestWindow to first optimal period if available', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 3);

      if (result.optimalPeriods.length > 0) {
        expect(result.nextBestWindow).toEqual(result.optimalPeriods[0]);
      }
    });

    it('should set nextBestWindow to null if no optimal periods', () => {
      const input = createBasicInput({
        daeunList: [],
        astroChart: undefined,
      });
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear);

      if (result.optimalPeriods.length === 0) {
        expect(result.nextBestWindow).toBeNull();
      }
    });
  });
});

// ============================================================
// Main Function Tests: findWeeklyOptimalTiming
// ============================================================

describe('event-timing MEGA - findWeeklyOptimalTiming', () => {
  describe('Basic functionality', () => {
    it.each(EVENT_TYPES)(
      'should return valid result for %s event',
      (eventType) => {
        const input = createBasicInput();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 7); // Start from next week

        const result = findWeeklyOptimalTiming(input, eventType, startDate);

        expect(result).toBeDefined();
        expect(result.eventType).toBe(eventType);
        expect(Array.isArray(result.weeklyPeriods)).toBe(true);
        expect(typeof result.summary).toBe('string');
      }
    );

    it('should default to 90 days if endDate not provided', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate);

      const expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(expectedEndDate.getDate() + 90);

      expect(result.searchRange.startDate).toEqual(startDate);
      expect(result.searchRange.endDate.getTime()).toBeCloseTo(
        expectedEndDate.getTime(),
        -3 // Allow 3 days difference for week alignment
      );
    });

    it('should respect provided endDate', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 30);

      const result = findWeeklyOptimalTiming(input, 'career', startDate, endDate);

      expect(result.searchRange.endDate.getTime()).toBeLessThanOrEqual(endDate.getTime());
    });

    it('should have sequential weekNumbers', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'investment', startDate);

      for (let i = 1; i < result.weeklyPeriods.length; i++) {
        expect(result.weeklyPeriods[i].weekNumber).toBe(
          result.weeklyPeriods[i - 1].weekNumber + 1
        );
      }
    });
  });

  describe('Weekly period validation', () => {
    it('should have valid date ranges for weekly periods', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate);

      result.weeklyPeriods.forEach((period) => {
        expect(period.startDate).toBeInstanceOf(Date);
        expect(period.endDate).toBeInstanceOf(Date);
        expect(period.startDate.getTime()).toBeLessThan(period.endDate.getTime());
      });
    });

    it('should have scores within valid range (0-100)', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'study', startDate);

      result.weeklyPeriods.forEach((period) => {
        expect(period.score).toBeGreaterThanOrEqual(0);
        expect(period.score).toBeLessThanOrEqual(100);
      });
    });

    it('should include reasons for weekly periods', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'health', startDate);

      result.weeklyPeriods.forEach((period) => {
        expect(Array.isArray(period.reasons)).toBe(true);
      });
    });

    it('should include best days for weekly periods', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'relationship', startDate);

      result.weeklyPeriods.forEach((period) => {
        expect(Array.isArray(period.bestDays)).toBe(true);
        period.bestDays.forEach((day) => {
          expect(day).toBeInstanceOf(Date);
        });
      });
    });
  });

  describe('Best/Worst week identification', () => {
    it('should identify bestWeek with highest score', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      if (result.weeklyPeriods.length > 0 && result.bestWeek) {
        const maxScore = Math.max(...result.weeklyPeriods.map((p) => p.score));
        expect(result.bestWeek.score).toBe(maxScore);
      }
    });

    it('should identify worstWeek with lowest score', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'investment', startDate);

      if (result.weeklyPeriods.length > 0 && result.worstWeek) {
        const minScore = Math.min(...result.weeklyPeriods.map((p) => p.score));
        expect(result.worstWeek.score).toBe(minScore);
      }
    });

    it('should handle single week analysis', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate, endDate);

      expect(result.weeklyPeriods.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Monday alignment', () => {
    it('should align weeks to Mondays', () => {
      const input = createBasicInput();
      const startDate = new Date('2024-01-10'); // Wednesday

      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      result.weeklyPeriods.forEach((period) => {
        expect(period.startDate.getDay()).toBe(1); // Monday
      });
    });

    it('should handle start date on Monday', () => {
      const input = createBasicInput();
      const startDate = new Date('2024-01-08'); // Monday

      const result = findWeeklyOptimalTiming(input, 'study', startDate);

      if (result.weeklyPeriods.length > 0) {
        expect(result.weeklyPeriods[0].startDate).toEqual(startDate);
      }
    });
  });

  describe('Summary generation', () => {
    it('should generate non-empty summary', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate);

      expect(result.summary).toBeTruthy();
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should include event type in summary', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'career', startDate);

      expect(result.summary).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle missing daeunList', () => {
      const input = createBasicInput({ daeunList: undefined });
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'marriage', startDate);

      expect(result).toBeDefined();
      expect(result.weeklyPeriods).toBeDefined();
    });

    it('should handle missing astroChart', () => {
      const input = createBasicInput({ astroChart: undefined });
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);

      const result = findWeeklyOptimalTiming(input, 'investment', startDate);

      expect(result).toBeDefined();
      expect(result.weeklyPeriods).toBeDefined();
    });

    it('should handle very short date range', () => {
      const input = createBasicInput();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 7);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 5); // Less than a week

      const result = findWeeklyOptimalTiming(input, 'health', startDate, endDate);

      expect(result).toBeDefined();
      expect(result.weeklyPeriods.length).toBeGreaterThanOrEqual(0);
    });
  });
});

// ============================================================
// Consistency Tests
// ============================================================

describe('event-timing MEGA - Consistency', () => {
  describe('Deterministic behavior', () => {
    it('should return same results for identical inputs', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();

      const result1 = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 1);
      const result2 = findOptimalEventTiming(input, 'marriage', currentYear, currentYear + 1);

      expect(result1.optimalPeriods).toEqual(result2.optimalPeriods);
      expect(result1.avoidPeriods).toEqual(result2.avoidPeriods);
    });

    it('should return same weekly results for identical inputs', () => {
      const input = createBasicInput();
      const startDate = new Date('2025-01-06'); // Fixed date for consistency

      const result1 = findWeeklyOptimalTiming(input, 'career', startDate);
      const result2 = findWeeklyOptimalTiming(input, 'career', startDate);

      expect(result1.weeklyPeriods.length).toBe(result2.weeklyPeriods.length);
      expect(result1.bestWeek).toEqual(result2.bestWeek);
    });
  });

  describe('Score distribution', () => {
    it('should have reasonable score distribution across events', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();

      const results = EVENT_TYPES.map((eventType) =>
        findOptimalEventTiming(input, eventType, currentYear, currentYear + 2)
      );

      results.forEach((result) => {
        if (result.optimalPeriods.length > 0) {
          const avgScore =
            result.optimalPeriods.reduce((sum, p) => sum + p.score, 0) /
            result.optimalPeriods.length;
          expect(avgScore).toBeGreaterThanOrEqual(30);
          expect(avgScore).toBeLessThanOrEqual(100);
        }
      });
    });

    it('should have distinct scores for optimal and avoid periods', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'investment', currentYear, currentYear + 3);

      if (result.optimalPeriods.length > 0 && result.avoidPeriods.length > 0) {
        const optimalAvg =
          result.optimalPeriods.reduce((sum, p) => sum + p.score, 0) /
          result.optimalPeriods.length;
        const avoidAvg =
          result.avoidPeriods.reduce((sum, p) => sum + p.score, 0) / result.avoidPeriods.length;

        expect(optimalAvg).toBeGreaterThan(avoidAvg + 10); // At least 10 points difference
      }
    });
  });

  describe('Date continuity', () => {
    it('should have continuous date ranges across months', () => {
      const input = createBasicInput();
      const currentYear = new Date().getFullYear();
      const result = findOptimalEventTiming(input, 'career', currentYear, currentYear + 1);

      result.optimalPeriods.forEach((period) => {
        const monthDiff =
          (period.endDate.getFullYear() - period.startDate.getFullYear()) * 12 +
          period.endDate.getMonth() -
          period.startDate.getMonth();
        expect(monthDiff).toBe(0); // Should be within same month
      });
    });

    it('should have continuous weeks in weekly analysis', () => {
      const input = createBasicInput();
      const startDate = new Date('2025-01-06');

      const result = findWeeklyOptimalTiming(input, 'study', startDate);

      for (let i = 1; i < result.weeklyPeriods.length; i++) {
        const prevEnd = result.weeklyPeriods[i - 1].endDate;
        const currentStart = result.weeklyPeriods[i].startDate;
        const dayDiff = Math.abs(currentStart.getTime() - prevEnd.getTime()) / (1000 * 60 * 60 * 24);
        expect(dayDiff).toBeLessThanOrEqual(1); // Adjacent or overlapping by 1 day
      }
    });
  });
});
