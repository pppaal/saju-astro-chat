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
  describe('DEFAULT_TIMEZONE', () => {
    it('should be Asia/Seoul', () => {
      expect(DEFAULT_TIMEZONE).toBe('Asia/Seoul');
    });
  });

  describe('formatDateString', () => {
    it('should format date components to YYYY-MM-DD', () => {
      expect(formatDateString(2024, 1, 15)).toBe('2024-01-15');
      expect(formatDateString(2024, 12, 31)).toBe('2024-12-31');
    });

    it('should pad single digit month and day', () => {
      expect(formatDateString(2024, 1, 1)).toBe('2024-01-01');
      expect(formatDateString(2024, 9, 5)).toBe('2024-09-05');
    });
  });

  describe('isValidTimezone', () => {
    it('should return true for valid timezones', () => {
      expect(isValidTimezone('Asia/Seoul')).toBe(true);
      expect(isValidTimezone('America/New_York')).toBe(true);
      expect(isValidTimezone('Europe/London')).toBe(true);
      expect(isValidTimezone('UTC')).toBe(true);
    });

    it('should return false for invalid timezones', () => {
      expect(isValidTimezone('Invalid/Timezone')).toBe(false);
      expect(isValidTimezone('Not_A_Timezone')).toBe(false);
      expect(isValidTimezone('')).toBe(false);
    });
  });

  describe('getNowInTimezone', () => {
    it('should return year, month, day object', () => {
      const result = getNowInTimezone('Asia/Seoul');
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
      expect(typeof result.year).toBe('number');
      expect(typeof result.month).toBe('number');
      expect(typeof result.day).toBe('number');
    });

    it('should return valid date ranges', () => {
      const result = getNowInTimezone();
      expect(result.year).toBeGreaterThan(2020);
      expect(result.month).toBeGreaterThanOrEqual(1);
      expect(result.month).toBeLessThanOrEqual(12);
      expect(result.day).toBeGreaterThanOrEqual(1);
      expect(result.day).toBeLessThanOrEqual(31);
    });

    it('should use Asia/Seoul as default', () => {
      const withDefault = getNowInTimezone();
      const withSeoul = getNowInTimezone('Asia/Seoul');
      expect(withDefault.year).toBe(withSeoul.year);
      expect(withDefault.month).toBe(withSeoul.month);
      expect(withDefault.day).toBe(withSeoul.day);
    });

    it('should handle invalid timezone gracefully', () => {
      const result = getNowInTimezone('Invalid/Zone');
      expect(result).toHaveProperty('year');
      expect(result).toHaveProperty('month');
      expect(result).toHaveProperty('day');
    });
  });

  describe('getDateInTimezone', () => {
    it('should return YYYY-MM-DD format', () => {
      const result = getDateInTimezone('Asia/Seoul');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle no timezone', () => {
      const result = getDateInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('should handle invalid timezone', () => {
      const result = getDateInTimezone('Invalid/Zone');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('getIsoInTimezone', () => {
    it('should return ISO-like datetime format', () => {
      const result = getIsoInTimezone('Asia/Seoul');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });

    it('should handle no timezone', () => {
      const result = getIsoInTimezone();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
    });
  });
});
