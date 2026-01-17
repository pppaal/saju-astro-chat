import { describe, it, expect } from 'vitest';

describe('Datetime Timezone Module', () => {
  it('should export getNowInTimezone function', async () => {
    const { getNowInTimezone } = await import('@/lib/datetime/timezone');
    expect(typeof getNowInTimezone).toBe('function');
  });

  it('should get current time in default timezone', async () => {
    const { getNowInTimezone } = await import('@/lib/datetime/timezone');
    const result = getNowInTimezone();

    // getNowInTimezone returns { year, month, day } only
    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('month');
    expect(result).toHaveProperty('day');
    expect(typeof result.year).toBe('number');
    expect(typeof result.month).toBe('number');
    expect(typeof result.day).toBe('number');
  });

  it('should get current time in specified timezone', async () => {
    const { getNowInTimezone } = await import('@/lib/datetime/timezone');
    const result = getNowInTimezone('America/New_York');

    expect(result).toHaveProperty('year');
    expect(result).toHaveProperty('month');
    expect(typeof result.year).toBe('number');
  });

  it('should export getDateInTimezone function', async () => {
    const { getDateInTimezone } = await import('@/lib/datetime/timezone');
    expect(typeof getDateInTimezone).toBe('function');
  });

  it('should get date string in default timezone', async () => {
    const { getDateInTimezone } = await import('@/lib/datetime/timezone');
    const result = getDateInTimezone();

    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should get date string in specified timezone', async () => {
    const { getDateInTimezone } = await import('@/lib/datetime/timezone');
    const result = getDateInTimezone('Europe/London');

    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should export formatDateString function', async () => {
    const { formatDateString } = await import('@/lib/datetime/timezone');
    expect(typeof formatDateString).toBe('function');
  });

  it('should format date string correctly', async () => {
    const { formatDateString } = await import('@/lib/datetime/timezone');

    expect(formatDateString(2024, 1, 5)).toBe('2024-01-05');
    expect(formatDateString(2024, 12, 25)).toBe('2024-12-25');
    expect(formatDateString(2024, 6, 15)).toBe('2024-06-15');
  });

  it('should pad single digit month and day', async () => {
    const { formatDateString } = await import('@/lib/datetime/timezone');

    expect(formatDateString(2024, 1, 1)).toBe('2024-01-01');
    expect(formatDateString(2024, 9, 9)).toBe('2024-09-09');
  });

  it('should export getIsoInTimezone function', async () => {
    const { getIsoInTimezone } = await import('@/lib/datetime/timezone');
    expect(typeof getIsoInTimezone).toBe('function');
  });

  it('should get ISO string in timezone', async () => {
    const { getIsoInTimezone } = await import('@/lib/datetime/timezone');
    const result = getIsoInTimezone();

    expect(typeof result).toBe('string');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('should export isValidTimezone function', async () => {
    const { isValidTimezone } = await import('@/lib/datetime/timezone');
    expect(typeof isValidTimezone).toBe('function');
  });

  it('should validate correct timezones', async () => {
    const { isValidTimezone } = await import('@/lib/datetime/timezone');

    expect(isValidTimezone('Asia/Seoul')).toBe(true);
    expect(isValidTimezone('America/New_York')).toBe(true);
    expect(isValidTimezone('Europe/London')).toBe(true);
    expect(isValidTimezone('UTC')).toBe(true);
  });

  it('should reject invalid timezones', async () => {
    const { isValidTimezone } = await import('@/lib/datetime/timezone');

    expect(isValidTimezone('Invalid/Timezone')).toBe(false);
    expect(isValidTimezone('NotATimezone')).toBe(false);
    expect(isValidTimezone('')).toBe(false);
  });

  it('should export DEFAULT_TIMEZONE constant', async () => {
    const { DEFAULT_TIMEZONE } = await import('@/lib/datetime/timezone');

    expect(DEFAULT_TIMEZONE).toBeDefined();
    expect(DEFAULT_TIMEZONE).toBe('Asia/Seoul');
  });
});

describe('Datetime Index Exports', () => {
  it('should export all functions from index', async () => {
    const module = await import('@/lib/datetime');

    expect(module.getNowInTimezone).toBeDefined();
    expect(module.getDateInTimezone).toBeDefined();
    expect(module.formatDateString).toBeDefined();
    expect(module.getIsoInTimezone).toBeDefined();
    expect(module.isValidTimezone).toBeDefined();
    expect(module.DEFAULT_TIMEZONE).toBeDefined();
  });
});
