import { describe, it, expect } from 'vitest';
import { formatNumber } from '@/utils/numberFormat';

describe('formatNumber', () => {
  it('should format small numbers as is', () => {
    expect(formatNumber(123)).toBe('123');
    expect(formatNumber(999)).toBe('999');
  });

  it('should format thousands with K suffix', () => {
    expect(formatNumber(1000)).toBe('1K');
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(12345)).toBe('12.3K');
  });

  it('should format millions with M suffix', () => {
    expect(formatNumber(1000000)).toBe('1M');
    expect(formatNumber(1500000)).toBe('1.5M');
  });

  it('should handle null values', () => {
    expect(formatNumber(null)).toBe('—');
  });

  it('should handle zero', () => {
    expect(formatNumber(0)).toBe('0');
  });
});
