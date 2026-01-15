// tests/lib/api/sanitizers.test.ts
import { describe, it, expect } from 'vitest';
import {
  isRecord,
  cleanStringArray,
  normalizeMessages,
  sanitizeString,
  sanitizeNumber,
  sanitizeBoolean,
  sanitizeHtml,
  sanitizeEnum,
} from '@/lib/api/sanitizers';

describe('isRecord', () => {
  it('should return true for plain objects', () => {
    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: 'value' })).toBe(true);
  });

  it('should return false for non-objects', () => {
    expect(isRecord(null)).toBe(false);
    expect(isRecord([])).toBe(false);
  });
});

describe('cleanStringArray', () => {
  it('should clean array of strings', () => {
    const result = cleanStringArray(['  hello  ', 'world']);
    expect(result).toEqual(['hello', 'world']);
  });

  it('should handle non-arrays', () => {
    expect(cleanStringArray(null)).toEqual([]);
  });

  it('should limit array size', () => {
    const large = Array(30).fill('item');
    const result = cleanStringArray(large, 10);
    expect(result).toHaveLength(10);
  });

  it('should filter out non-strings', () => {
    const mixed = ['valid', 123, null, 'also valid'];
    const result = cleanStringArray(mixed);
    expect(result).toEqual(['valid', 'also valid']);
  });
});

describe('sanitizeString', () => {
  it('should trim and limit strings', () => {
    expect(sanitizeString('  hello  ', 10)).toBe('hello');
    expect(sanitizeString('a'.repeat(100), 10)).toBe('a'.repeat(10));
  });

  it('should return default for non-strings', () => {
    expect(sanitizeString(123, 10, 'default')).toBe('default');
  });
});

describe('sanitizeNumber', () => {
  it('should clamp numbers within range', () => {
    expect(sanitizeNumber(5, 0, 10, 0)).toBe(5);
    expect(sanitizeNumber(-5, 0, 10, 0)).toBe(0);
    expect(sanitizeNumber(15, 0, 10, 0)).toBe(10);
  });

  it('should return default for non-numbers', () => {
    expect(sanitizeNumber('5', 0, 10, 0)).toBe(0);
  });
});

describe('sanitizeBoolean', () => {
  it('should pass through booleans', () => {
    expect(sanitizeBoolean(true)).toBe(true);
    expect(sanitizeBoolean(false)).toBe(false);
  });

  it('should return default for non-booleans', () => {
    expect(sanitizeBoolean('true', false)).toBe(false);
  });
});

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const html = '<script>alert("xss")</script>Hello';
    expect(sanitizeHtml(html)).toBe('Hello');
  });

  it('should remove HTML tags', () => {
    const html = '<div>Hello <span>World</span></div>';
    expect(sanitizeHtml(html)).toBe('Hello World');
  });

  it('should limit length', () => {
    const long = 'a'.repeat(20000);
    const result = sanitizeHtml(long, 100);
    expect(result).toHaveLength(100);
  });
});

describe('sanitizeEnum', () => {
  const colors = ['red', 'green', 'blue'] as const;

  it('should return valid enum values', () => {
    expect(sanitizeEnum('red', colors, 'red')).toBe('red');
  });

  it('should return default for invalid values', () => {
    expect(sanitizeEnum('yellow', colors, 'red')).toBe('red');
  });
});
