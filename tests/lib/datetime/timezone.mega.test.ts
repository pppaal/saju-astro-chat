/**
 * Comprehensive tests for src/lib/datetime/timezone.ts
 * Tests timezone utility functions
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getNowInTimezone,
  getDateInTimezone,
  formatDateString,
  getIsoInTimezone,
  isValidTimezone,
  DEFAULT_TIMEZONE,
} from '@/lib/datetime/timezone';

describe('timezone utilities', () => {
  const TIMEZONES = [
    'Asia/Seoul',
    'America/New_York',
    'Europe/London',
    'UTC',
    'Asia/Tokyo',
    'America/Los_Angeles',
    'Australia/Sydney',
  ];

  describe('getNowInTimezone', () => {
    it('should return date components', () => {
      const result = getNowInTimezone('Asia/Seoul');
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
      expect(typeof result.year).toBe('number');
      expect(typeof result.month).toBe('number');
      expect(typeof result.day).toBe('number');
    });

    it('should return valid year range', () => {
      const result = getNowInTimezone('Asia/Seoul');
      expect(result.year).toBeGreaterThanOrEqual(2020);
      expect(result.year).toBeLessThanOrEqual(2100);
    });

    it('should return valid month range', () => {
      const result = getNowInTimezone('Asia/Seoul');
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
    });

    it('should return valid day range', () => {
      const result = getNowInTimezone('Asia/Seoul');
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
    });

    it('should use Asia/Seoul as default timezone', () => {
      const withDefault = getNowInTimezone();
      const withExplicit = getNowInTimezone('Asia/Seoul');
      expect(withDefault).toEqual(withExplicit);
    });

    TIMEZONES.forEach((tz) => {
      it(`should work with timezone: ${tz}`, () => {
        const result = getNowInTimezone(tz);
        expect(result.year).toBeGreaterThan(2020);
        expect(result.month).toBeGreaterThanOrEqual(1);
        expect(result.month).toBeLessThanOrEqual(12);
        expect(result.day).toBeGreaterThanOrEqual(1);
        expect(result.day).toBeLessThanOrEqual(31);
      });
    });

    it('should fallback to Asia/Seoul on invalid timezone', () => {
      const result = getNowInTimezone('Invalid/Timezone');
      const seoul = getNowInTimezone('Asia/Seoul');
      expect(result).toEqual(seoul);
    });

    it('should handle UTC', () => {
      const result = getNowInTimezone('UTC');
      expect(result.year).toBeGreaterThan(2020);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeGreaterThanOrEqual(1);
    });

    it('should handle GMT', () => {
      const result = getNowInTimezone('GMT');
      expect(result.year).toBeGreaterThan(2020);
    });

    it('should handle different date boundaries', () => {
      // Test at different times of day (some timezones may be different day)
      const tokyo = getNowInTimezone('Asia/Tokyo');
      const ny = getNowInTimezone('America/New_York');

      // Both should be valid dates, though may differ by a day
      expect(Math.abs(tokyo.day - ny.day)).toBeLessThanOrEqual(2);
    });

    it('should return integers for all components', () => {
      const result = getNowInTimezone('Asia/Seoul');
      expect(Number.isInteger(result.year)).toBe(true);
      expect(Number.isInteger(result.month)).toBe(true);
      expect(Number.isInteger(result.day)).toBe(true);
    });

    it('should handle edge case timezones', () => {
      const zones = [
        'Pacific/Kiritimati', // UTC+14
        'Pacific/Niue', // UTC-11
        'America/Argentina/Buenos_Aires',
        'Asia/Kolkata',
        'Africa/Cairo',
      ];

      zones.forEach((tz) => {
        const result = getNowInTimezone(tz);
        expect(result.year).toBeGreaterThan(2020);
        expect(result.month).toBeGreaterThanOrEqual(1);
        expect(result.month).toBeLessThanOrEqual(12);
      });
    });

    it('should be consistent when called multiple times', () => {
      const result1 = getNowInTimezone('Asia/Seoul');
      const result2 = getNowInTimezone('Asia/Seoul');

      // Should be same or differ by at most 1 day (if crossing midnight)
      expect(Math.abs(result1.day - result2.day)).toBeLessThanOrEqual(1);
      expect(Math.abs(result1.month - result2.month)).toBeLessThanOrEqual(1);
    });
  });

  describe('getDateInTimezone', () => {
    it('should return date string in YYYY-MM-DD format', () => {
      const result = getDateInTimezone('Asia/Seoul');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should return ISO format slice without timezone', () => {
      const result = getDateInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.length).toBe(10);
    });

    it('should return valid date string', () => {
      const result = getDateInTimezone('Asia/Seoul');
      const date = new Date(result);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    TIMEZONES.forEach((tz) => {
      it(`should work with timezone: ${tz}`, () => {
        const result = getDateInTimezone(tz);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        const date = new Date(result);
        expect(date.toString()).not.toBe('Invalid Date');
      });
    });

    it('should fallback to ISO on invalid timezone', () => {
      const result = getDateInTimezone('Invalid/Timezone');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should have zero-padded month and day', () => {
      const result = getDateInTimezone('Asia/Seoul');
      const parts = result.split('-');
      expect(parts[1].length).toBe(2); // month
      expect(parts[2].length).toBe(2); // day
    });

    it('should handle UTC', () => {
      const result = getDateInTimezone('UTC');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle GMT', () => {
      const result = getDateInTimezone('GMT');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should be consistent with getNowInTimezone', () => {
      const dateStr = getDateInTimezone('Asia/Seoul');
      const components = getNowInTimezone('Asia/Seoul');
      const expected = formatDateString(components.year, components.month, components.day);
      expect(dateStr).toBe(expected);
    });

    it('should handle different timezones returning different dates', () => {
      // At certain times, timezones can be on different days
      const tokyo = getDateInTimezone('Asia/Tokyo');
      const samoa = getDateInTimezone('Pacific/Samoa');

      // Both should be valid dates
      expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(samoa).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle empty string as undefined', () => {
      const result = getDateInTimezone(undefined);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('formatDateString', () => {
    it('should format date components to YYYY-MM-DD', () => {
      const result = formatDateString(2024, 1, 15);
      expect(result).toBe('2024-01-15');
    });

    it('should zero-pad single digit month', () => {
      const result = formatDateString(2024, 3, 20);
      expect(result).toBe('2024-03-20');
    });

    it('should zero-pad single digit day', () => {
      const result = formatDateString(2024, 12, 5);
      expect(result).toBe('2024-12-05');
    });

    it('should handle double digit month and day', () => {
      const result = formatDateString(2024, 11, 25);
      expect(result).toBe('2024-11-25');
    });

    it('should handle leap year dates', () => {
      const result = formatDateString(2024, 2, 29);
      expect(result).toBe('2024-02-29');
    });

    it('should handle year boundaries', () => {
      expect(formatDateString(1900, 1, 1)).toBe('1900-01-01');
      expect(formatDateString(2100, 12, 31)).toBe('2100-12-31');
    });

    it('should handle all months', () => {
      for (let month = 1; month <= 12; month++) {
        const result = formatDateString(2024, month, 15);
        const monthStr = String(month).padStart(2, '0');
        expect(result).toBe(`2024-${monthStr}-15`);
      }
    });

    it('should handle all days in a month', () => {
      for (let day = 1; day <= 31; day++) {
        const result = formatDateString(2024, 1, day);
        const dayStr = String(day).padStart(2, '0');
        expect(result).toBe(`2024-01-${dayStr}`);
      }
    });

    it('should handle different years', () => {
      expect(formatDateString(2020, 6, 15)).toBe('2020-06-15');
      expect(formatDateString(2021, 6, 15)).toBe('2021-06-15');
      expect(formatDateString(2022, 6, 15)).toBe('2022-06-15');
      expect(formatDateString(2023, 6, 15)).toBe('2023-06-15');
      expect(formatDateString(2024, 6, 15)).toBe('2024-06-15');
    });

    it('should always return 10 character string', () => {
      expect(formatDateString(2024, 1, 1).length).toBe(10);
      expect(formatDateString(2024, 12, 31).length).toBe(10);
      expect(formatDateString(2024, 6, 15).length).toBe(10);
    });

    it('should handle edge case dates', () => {
      expect(formatDateString(2000, 2, 29)).toBe('2000-02-29'); // Leap year
      expect(formatDateString(2024, 12, 31)).toBe('2024-12-31'); // Year end
      expect(formatDateString(2025, 1, 1)).toBe('2025-01-01'); // Year start
    });
  });

  describe('getIsoInTimezone', () => {
    it('should return ISO datetime string', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('should use Asia/Seoul as default', () => {
      const withDefault = getIsoInTimezone();
      const withExplicit = getIsoInTimezone('Asia/Seoul');
      // Should be very close in time (within a second)
      expect(withDefault.slice(0, 16)).toBe(withExplicit.slice(0, 16));
    });

    it('should include time components', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      const parts = result.split('T');
      expect(parts.length).toBe(2);
      expect(parts[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(parts[1]).toMatch(/^\d{2}:\d{2}:\d{2}$/);
    });

    TIMEZONES.forEach((tz) => {
      it(`should work with timezone: ${tz}`, () => {
        const result = getIsoInTimezone(tz);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
      });
    });

    it('should have valid hour range (0-23)', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      const timePart = result.split('T')[1];
      const hour = parseInt(timePart.split(':')[0], 10);
      expect(hour).toBeGreaterThanOrEqual(0);
      expect(hour).toBeLessThanOrEqual(23);
    });

    it('should have valid minute range (0-59)', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      const timePart = result.split('T')[1];
      const minute = parseInt(timePart.split(':')[1], 10);
      expect(minute).toBeGreaterThanOrEqual(0);
      expect(minute).toBeLessThanOrEqual(59);
    });

    it('should have valid second range (0-59)', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      const timePart = result.split('T')[1];
      const second = parseInt(timePart.split(':')[2], 10);
      expect(second).toBeGreaterThanOrEqual(0);
      expect(second).toBeLessThanOrEqual(59);
    });

    it('should fallback to ISO on invalid timezone', () => {
      const result = getIsoInTimezone('Invalid/Timezone');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('should be parseable as Date', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      const date = new Date(result);
      expect(date.toString()).not.toBe('Invalid Date');
    });

    it('should have zero-padded components', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      const [datePart, timePart] = result.split('T');

      // Check date parts
      const [year, month, day] = datePart.split('-');
      expect(month.length).toBe(2);
      expect(day.length).toBe(2);

      // Check time parts
      const [hour, minute, second] = timePart.split(':');
      expect(hour.length).toBe(2);
      expect(minute.length).toBe(2);
      expect(second.length).toBe(2);
    });

    it('should always return 19 character string', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      expect(result.length).toBe(19);
    });

    it('should handle UTC correctly', () => {
      const result = getIsoInTimezone('UTC');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });
  });

  describe('isValidTimezone', () => {
    describe('Valid timezones', () => {
      const validTimezones = [
        'Asia/Seoul',
        'America/New_York',
        'Europe/London',
        'UTC',
        'GMT',
        'Asia/Tokyo',
        'Europe/Paris',
        'America/Los_Angeles',
        'Australia/Sydney',
        'Asia/Shanghai',
        'America/Chicago',
        'Europe/Berlin',
        'Asia/Dubai',
        'America/Sao_Paulo',
        'Africa/Cairo',
        'Pacific/Auckland',
        'Asia/Kolkata',
        'America/Toronto',
        'Europe/Moscow',
        'Asia/Singapore',
      ];

      validTimezones.forEach((tz) => {
        it(`should return true for ${tz}`, () => {
          expect(isValidTimezone(tz)).toBe(true);
        });
      });
    });

    describe('Invalid timezones', () => {
      const invalidTimezones = [
        'Invalid/Timezone',
        'Asia/Invalid',
        'NotATimezone',
        'KST',
        'PST',
        'EST',
        'Asia Seoul',
        'Asia/Seoul/Extra',
        '',
        ' ',
        'undefined',
        'null',
      ];

      invalidTimezones.forEach((tz) => {
        it(`should return false for ${tz}`, () => {
          expect(isValidTimezone(tz)).toBe(false);
        });
      });
    });

    it('should handle case sensitivity', () => {
      expect(isValidTimezone('Asia/Seoul')).toBe(true);
      expect(isValidTimezone('asia/seoul')).toBe(false);
      expect(isValidTimezone('ASIA/SEOUL')).toBe(false);
    });

    it('should handle timezone with underscores', () => {
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('America/Los_Angeles')).toBe(true);
    });

    it('should handle timezone with multiple slashes', () => {
      expect(isValidTimezone('America/Indiana/Indianapolis')).toBe(true);
      expect(isValidTimezone('America/Argentina/Buenos_Aires')).toBe(true);
      expect(isValidTimezone('America/Kentucky/Louisville')).toBe(true);
    });

    it('should handle UTC variations', () => {
      expect(isValidTimezone('UTC')).toBe(true);
      expect(isValidTimezone('GMT')).toBe(true);
    });

    it('should reject common abbreviations', () => {
      expect(isValidTimezone('KST')).toBe(false);
      expect(isValidTimezone('JST')).toBe(false);
      expect(isValidTimezone('PDT')).toBe(false);
      expect(isValidTimezone('EDT')).toBe(false);
    });

    it('should handle empty and whitespace strings', () => {
      expect(isValidTimezone('')).toBe(false);
      expect(isValidTimezone(' ')).toBe(false);
      expect(isValidTimezone('  ')).toBe(false);
    });

    it('should handle special characters', () => {
      expect(isValidTimezone('Asia/Seoul!')).toBe(false);
      expect(isValidTimezone('Asia/Seoul?')).toBe(false);
      expect(isValidTimezone('Asia/Seoul#')).toBe(false);
    });

    it('should handle numeric strings', () => {
      expect(isValidTimezone('123')).toBe(false);
      expect(isValidTimezone('+09:00')).toBe(false);
      expect(isValidTimezone('UTC+9')).toBe(false);
    });
  });

  describe('DEFAULT_TIMEZONE constant', () => {
    it('should be defined', () => {
      expect(DEFAULT_TIMEZONE).toBeDefined();
    });

    it('should be Asia/Seoul', () => {
      expect(DEFAULT_TIMEZONE).toBe('Asia/Seoul');
    });

    it('should be a valid timezone', () => {
      expect(isValidTimezone(DEFAULT_TIMEZONE)).toBe(true);
    });

    it('should be a string', () => {
      expect(typeof DEFAULT_TIMEZONE).toBe('string');
    });
  });

  describe('Integration tests', () => {
    it('should have consistent date across all functions', () => {
      const tz = 'Asia/Seoul';
      const components = getNowInTimezone(tz);
      const dateStr = getDateInTimezone(tz);
      const formatted = formatDateString(components.year, components.month, components.day);

      expect(dateStr).toBe(formatted);
    });

    it('should have consistent datetime', () => {
      const tz = 'Asia/Seoul';
      const dateStr = getDateInTimezone(tz);
      const isoStr = getIsoInTimezone(tz);

      expect(isoStr.startsWith(dateStr)).toBe(true);
    });

    it('should handle timezone transitions', () => {
      // Test with timezones that have different dates at the same moment
      const tokyo = getDateInTimezone('Asia/Tokyo');
      const samoa = getDateInTimezone('Pacific/Samoa');

      expect(tokyo).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(samoa).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle all valid timezones consistently', () => {
      TIMEZONES.forEach((tz) => {
        const components = getNowInTimezone(tz);
        const dateStr = getDateInTimezone(tz);
        const isoStr = getIsoInTimezone(tz);
        const formatted = formatDateString(components.year, components.month, components.day);

        expect(dateStr).toBe(formatted);
        expect(isoStr.startsWith(dateStr)).toBe(true);
        expect(isValidTimezone(tz)).toBe(true);
      });
    });
  });
});