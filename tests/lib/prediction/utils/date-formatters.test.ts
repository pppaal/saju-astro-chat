/**
 * Tests for src/lib/prediction/utils/date-formatters.ts
 * 날짜 포맷 유틸리티 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  formatDateToISO,
  formatDaysArray,
  formatPeriodDates,
  formatCompletePeriod,
  parseISODate,
  isValidISODate,
  formatDateByLocale,
  parseDateComponents,
  parseTimeComponents,
  extractBirthYear,
  extractBirthMonth,
  extractBirthDay,
} from '@/lib/prediction/utils/date-formatters';

describe('date-formatters', () => {
  describe('formatDateToISO', () => {
    it('should format date to YYYY-MM-DD', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      expect(formatDateToISO(date)).toBe('2024-03-15');
    });

    it('should handle start of year', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      expect(formatDateToISO(date)).toBe('2024-01-01');
    });

    it('should handle end of year', () => {
      const date = new Date('2024-12-31T23:59:59Z');
      expect(formatDateToISO(date)).toBe('2024-12-31');
    });
  });

  describe('formatDaysArray', () => {
    it('should format array of dates to ISO strings', () => {
      const dates = [
        new Date('2024-01-01T00:00:00Z'),
        new Date('2024-06-15T00:00:00Z'),
        new Date('2024-12-31T00:00:00Z'),
      ];

      expect(formatDaysArray(dates)).toEqual(['2024-01-01', '2024-06-15', '2024-12-31']);
    });

    it('should return empty array for empty input', () => {
      expect(formatDaysArray([])).toEqual([]);
    });
  });

  describe('formatPeriodDates', () => {
    it('should format start and end dates', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-12-31T00:00:00Z'),
      };

      expect(formatPeriodDates(period)).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });
  });

  describe('formatCompletePeriod', () => {
    it('should format period with specific days', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T00:00:00Z'),
        specificDays: [
          new Date('2024-01-10T00:00:00Z'),
          new Date('2024-01-20T00:00:00Z'),
        ],
        label: 'January',
      };

      const result = formatCompletePeriod(period);

      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-01-31');
      expect(result.specificDays).toEqual(['2024-01-10', '2024-01-20']);
      expect(result.label).toBe('January');
    });

    it('should handle period without specific days', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T00:00:00Z'),
      };

      const result = formatCompletePeriod(period);

      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-01-31');
      expect(result.specificDays).toBeUndefined();
    });

    it('should preserve extra properties', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T00:00:00Z'),
        category: 'good',
        score: 85,
      };

      const result = formatCompletePeriod(period);

      expect((result as any).category).toBe('good');
      expect((result as any).score).toBe(85);
    });
  });

  describe('parseISODate', () => {
    it('should parse ISO date string to Date', () => {
      const date = parseISODate('2024-03-15');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });
  });

  describe('isValidISODate', () => {
    it('should return true for valid ISO date', () => {
      expect(isValidISODate('2024-03-15')).toBe(true);
    });

    it('should return true for leap year date', () => {
      expect(isValidISODate('2024-02-29')).toBe(true);
    });

    it('should return false for invalid format', () => {
      expect(isValidISODate('March 15, 2024')).toBe(false);
    });

    it('should return false for invalid date', () => {
      expect(isValidISODate('2024-13-01')).toBe(false);
    });

    it('should return false for partial format', () => {
      expect(isValidISODate('2024-03')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidISODate('')).toBe(false);
    });
  });

  describe('formatDateByLocale', () => {
    it('should format date for Korean locale', () => {
      const date = new Date('2024-03-15T00:00:00Z');
      const result = formatDateByLocale(date, 'ko');
      // Korean locale uses YYYY. MM. DD. format
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should format date for English locale', () => {
      const date = new Date('2024-03-15T00:00:00Z');
      const result = formatDateByLocale(date, 'en');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should treat non-ko locales as English', () => {
      const date = new Date('2024-03-15T00:00:00Z');
      const enResult = formatDateByLocale(date, 'en');
      const frResult = formatDateByLocale(date, 'fr');
      // Both should use en-US locale
      expect(enResult).toBe(frResult);
    });
  });

  describe('parseDateComponents', () => {
    it('should parse YYYY-MM-DD into components', () => {
      const result = parseDateComponents('2024-03-15');

      expect(result).toEqual({ year: 2024, month: 3, day: 15 });
    });

    it('should handle single digit months/days', () => {
      const result = parseDateComponents('2024-01-05');

      expect(result).toEqual({ year: 2024, month: 1, day: 5 });
    });
  });

  describe('parseTimeComponents', () => {
    it('should parse HH:MM into components', () => {
      const result = parseTimeComponents('14:30');

      expect(result).toEqual({ hour: 14, minute: 30 });
    });

    it('should handle midnight', () => {
      const result = parseTimeComponents('00:00');

      expect(result).toEqual({ hour: 0, minute: 0 });
    });

    it('should handle end of day', () => {
      const result = parseTimeComponents('23:59');

      expect(result).toEqual({ hour: 23, minute: 59 });
    });
  });

  describe('extractBirthYear', () => {
    it('should extract year from date string', () => {
      expect(extractBirthYear('1990-05-15')).toBe(1990);
    });

    it('should handle different years', () => {
      expect(extractBirthYear('2024-01-01')).toBe(2024);
      expect(extractBirthYear('1900-12-31')).toBe(1900);
    });
  });

  describe('extractBirthMonth', () => {
    it('should extract month from date string', () => {
      expect(extractBirthMonth('1990-05-15')).toBe(5);
    });

    it('should handle all months', () => {
      expect(extractBirthMonth('2024-01-01')).toBe(1);
      expect(extractBirthMonth('2024-12-31')).toBe(12);
    });
  });

  describe('extractBirthDay', () => {
    it('should extract day from date string', () => {
      expect(extractBirthDay('1990-05-15')).toBe(15);
    });

    it('should handle first and last days', () => {
      expect(extractBirthDay('2024-01-01')).toBe(1);
      expect(extractBirthDay('2024-01-31')).toBe(31);
    });
  });
});
