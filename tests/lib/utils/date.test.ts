import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDateToISO,
  formatDaysArray,
  formatPeriodDates,
  formatCompletePeriod,
  parseISODate,
  isValidISODate,
  formatDateByLocale,
  formatRelativeDate,
  parseDateComponents,
  parseTimeComponents,
  extractBirthYear,
  extractBirthMonth,
  extractBirthDay,
  calculateAge,
  isToday,
  isPast,
  isFuture,
  getDateRange,
  addDays,
  addMonths,
  addYears,
} from '@/lib/utils/date';

describe('date utilities', () => {
  describe('formatDateToISO', () => {
    it('should format Date to ISO date string', () => {
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
      const result = formatDaysArray(dates);
      expect(result).toEqual(['2024-01-01', '2024-06-15', '2024-12-31']);
    });

    it('should return empty array for empty input', () => {
      expect(formatDaysArray([])).toEqual([]);
    });
  });

  describe('formatPeriodDates', () => {
    it('should format period with start and end dates', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-12-31T00:00:00Z'),
      };
      const result = formatPeriodDates(period);
      expect(result).toEqual({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });
    });
  });

  describe('formatCompletePeriod', () => {
    it('should format period without specific days', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-03-31T00:00:00Z'),
        label: 'Q1',
      };
      const result = formatCompletePeriod(period);
      expect(result.startDate).toBe('2024-01-01');
      expect(result.endDate).toBe('2024-03-31');
      expect(result.label).toBe('Q1');
      expect(result.specificDays).toBeUndefined();
    });

    it('should format period with specific days', () => {
      const period = {
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T00:00:00Z'),
        specificDays: [
          new Date('2024-01-10T00:00:00Z'),
          new Date('2024-01-20T00:00:00Z'),
        ],
      };
      const result = formatCompletePeriod(period);
      expect(result.specificDays).toEqual(['2024-01-10', '2024-01-20']);
    });
  });

  describe('parseISODate', () => {
    it('should parse ISO date string to Date', () => {
      const date = parseISODate('2024-06-15');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });
  });

  describe('isValidISODate', () => {
    it('should return true for valid ISO date', () => {
      expect(isValidISODate('2024-01-15')).toBe(true);
      expect(isValidISODate('2024-12-31')).toBe(true);
    });

    it('should return false for non-ISO format', () => {
      expect(isValidISODate('01/15/2024')).toBe(false);
      expect(isValidISODate('2024-1-5')).toBe(false);
      expect(isValidISODate('2024')).toBe(false);
      expect(isValidISODate('abc')).toBe(false);
    });

    it('should return false for invalid date values', () => {
      expect(isValidISODate('2024-13-01')).toBe(false);
      expect(isValidISODate('2024-00-01')).toBe(false);
    });
  });

  describe('formatDateByLocale', () => {
    it('should format date using Korean locale', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const result = formatDateByLocale(date, 'ko');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should format date using English locale', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const result = formatDateByLocale(date, 'en');
      expect(typeof result).toBe('string');
    });

    it('should fall back to en-US for unknown locale', () => {
      const date = new Date('2024-06-15T00:00:00Z');
      const result = formatDateByLocale(date, 'xx');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatRelativeDate', () => {
    it('should return "Today" for today', () => {
      const todayISO = new Date().toISOString().split('T')[0];
      expect(formatRelativeDate(todayISO)).toBe('Today');
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayISO = yesterday.toISOString().split('T')[0];
      expect(formatRelativeDate(yesterdayISO)).toBe('Yesterday');
    });

    it('should return custom labels', () => {
      const todayISO = new Date().toISOString().split('T')[0];
      const result = formatRelativeDate(todayISO, {
        labels: { today: '오늘', yesterday: '어제' },
      });
      expect(result).toBe('오늘');
    });

    it('should return formatted date for older dates', () => {
      const result = formatRelativeDate('2020-01-15');
      expect(typeof result).toBe('string');
      expect(result).not.toBe('Today');
      expect(result).not.toBe('Yesterday');
    });
  });

  describe('parseDateComponents', () => {
    it('should parse date string into components', () => {
      const result = parseDateComponents('2024-06-15');
      expect(result).toEqual({ year: 2024, month: 6, day: 15 });
    });

    it('should handle single-digit months and days', () => {
      const result = parseDateComponents('2024-01-05');
      expect(result).toEqual({ year: 2024, month: 1, day: 5 });
    });
  });

  describe('parseTimeComponents', () => {
    it('should parse time string into components', () => {
      const result = parseTimeComponents('14:30');
      expect(result).toEqual({ hour: 14, minute: 30 });
    });

    it('should handle midnight', () => {
      const result = parseTimeComponents('00:00');
      expect(result).toEqual({ hour: 0, minute: 0 });
    });
  });

  describe('extractBirthYear', () => {
    it('should extract year from date string', () => {
      expect(extractBirthYear('1990-05-15')).toBe(1990);
    });
  });

  describe('extractBirthMonth', () => {
    it('should extract month from date string', () => {
      expect(extractBirthMonth('1990-05-15')).toBe(5);
    });
  });

  describe('extractBirthDay', () => {
    it('should extract day from date string', () => {
      expect(extractBirthDay('1990-05-15')).toBe(15);
    });
  });

  describe('calculateAge', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate age from string date', () => {
      expect(calculateAge('1990-01-01')).toBe(34);
    });

    it('should calculate age from Date object', () => {
      expect(calculateAge(new Date('1990-01-01'))).toBe(34);
    });

    it('should handle birthday not yet passed this year', () => {
      expect(calculateAge('1990-12-25')).toBe(33);
    });

    it('should handle birthday already passed this year', () => {
      expect(calculateAge('1990-03-01')).toBe(34);
    });
  });

  describe('isToday', () => {
    it('should return true for today as Date', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('should return true for today as string', () => {
      const todayISO = new Date().toISOString().split('T')[0];
      expect(isToday(todayISO)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isPast', () => {
    it('should return true for past dates', () => {
      expect(isPast('2020-01-01')).toBe(true);
    });

    it('should return false for future dates', () => {
      expect(isPast('2099-12-31')).toBe(false);
    });
  });

  describe('isFuture', () => {
    it('should return true for future dates', () => {
      expect(isFuture('2099-12-31')).toBe(true);
    });

    it('should return false for past dates', () => {
      expect(isFuture('2020-01-01')).toBe(false);
    });
  });

  describe('getDateRange', () => {
    it('should return array of ISO dates in range', () => {
      const start = new Date('2024-01-01T00:00:00Z');
      const end = new Date('2024-01-05T00:00:00Z');
      const result = getDateRange(start, end);
      expect(result).toHaveLength(5);
      expect(result[0]).toBe('2024-01-01');
      expect(result[4]).toBe('2024-01-05');
    });

    it('should return single element for same start and end', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const result = getDateRange(date, date);
      expect(result).toHaveLength(1);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date('2024-01-01');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(6);
    });

    it('should add negative days', () => {
      const date = new Date('2024-01-10');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(5);
    });

    it('should not mutate original date', () => {
      const date = new Date('2024-01-01');
      const original = date.getTime();
      addDays(date, 5);
      expect(date.getTime()).toBe(original);
    });
  });

  describe('addMonths', () => {
    it('should add positive months', () => {
      const date = new Date('2024-01-15');
      const result = addMonths(date, 3);
      expect(result.getMonth()).toBe(3); // April
    });

    it('should add negative months', () => {
      const date = new Date('2024-06-15');
      const result = addMonths(date, -3);
      expect(result.getMonth()).toBe(2); // March
    });

    it('should not mutate original date', () => {
      const date = new Date('2024-01-15');
      const original = date.getTime();
      addMonths(date, 3);
      expect(date.getTime()).toBe(original);
    });
  });

  describe('addYears', () => {
    it('should add positive years', () => {
      const date = new Date('2024-06-15');
      const result = addYears(date, 2);
      expect(result.getFullYear()).toBe(2026);
    });

    it('should add negative years', () => {
      const date = new Date('2024-06-15');
      const result = addYears(date, -5);
      expect(result.getFullYear()).toBe(2019);
    });

    it('should not mutate original date', () => {
      const date = new Date('2024-06-15');
      const original = date.getTime();
      addYears(date, 2);
      expect(date.getTime()).toBe(original);
    });
  });
});
