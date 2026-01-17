import { describe, it, expect } from 'vitest';

describe('Validation Patterns', () => {
  it('should export DATE_RE pattern', async () => {
    const { DATE_RE } = await import('@/lib/validation');

    expect(DATE_RE).toBeDefined();
    expect(DATE_RE instanceof RegExp).toBe(true);
  });

  it('should export TIME_RE pattern', async () => {
    const { TIME_RE } = await import('@/lib/validation');

    expect(TIME_RE).toBeDefined();
    expect(TIME_RE instanceof RegExp).toBe(true);
  });

  it('should export TIMEZONE_RE pattern', async () => {
    const { TIMEZONE_RE } = await import('@/lib/validation');

    expect(TIMEZONE_RE).toBeDefined();
    expect(TIMEZONE_RE instanceof RegExp).toBe(true);
  });

  it('should export EMAIL_RE pattern', async () => {
    const { EMAIL_RE } = await import('@/lib/validation');

    expect(EMAIL_RE).toBeDefined();
    expect(EMAIL_RE instanceof RegExp).toBe(true);
  });

  it('should match valid dates with DATE_RE', async () => {
    const { DATE_RE } = await import('@/lib/validation');

    expect(DATE_RE.test('2024-01-15')).toBe(true);
    expect(DATE_RE.test('2024-12-31')).toBe(true);
    expect(DATE_RE.test('1990-06-25')).toBe(true);
  });

  it('should reject invalid dates with DATE_RE', async () => {
    const { DATE_RE } = await import('@/lib/validation');

    expect(DATE_RE.test('2024/01/15')).toBe(false);
    expect(DATE_RE.test('15-01-2024')).toBe(false);
    expect(DATE_RE.test('2024-1-15')).toBe(false);
  });

  it('should match valid times with TIME_RE', async () => {
    const { TIME_RE } = await import('@/lib/validation');

    expect(TIME_RE.test('12:30')).toBe(true);
    expect(TIME_RE.test('00:00')).toBe(true);
    expect(TIME_RE.test('23:59')).toBe(true);
  });

  it('should reject invalid times with TIME_RE', async () => {
    const { TIME_RE } = await import('@/lib/validation');

    expect(TIME_RE.test('12:30:00')).toBe(false);
    expect(TIME_RE.test('1:30')).toBe(false);
    expect(TIME_RE.test('12-30')).toBe(false);
  });

  it('should match valid emails with EMAIL_RE', async () => {
    const { EMAIL_RE } = await import('@/lib/validation');

    expect(EMAIL_RE.test('test@example.com')).toBe(true);
    expect(EMAIL_RE.test('user.name@domain.co.kr')).toBe(true);
    expect(EMAIL_RE.test('hello@test.org')).toBe(true);
  });

  it('should reject invalid emails with EMAIL_RE', async () => {
    const { EMAIL_RE } = await import('@/lib/validation');

    expect(EMAIL_RE.test('invalid')).toBe(false);
    expect(EMAIL_RE.test('@domain.com')).toBe(false);
    expect(EMAIL_RE.test('user@')).toBe(false);
  });
});

describe('Validation Limits', () => {
  it('should export LIMITS object', async () => {
    const { LIMITS } = await import('@/lib/validation');

    expect(LIMITS).toBeDefined();
    expect(typeof LIMITS).toBe('object');
  });

  it('should have name limits', async () => {
    const { LIMITS } = await import('@/lib/validation');

    expect(LIMITS.NAME).toBe(80);
    expect(LIMITS.NAME_LONG).toBe(120);
  });

  it('should have location limits', async () => {
    const { LIMITS } = await import('@/lib/validation');

    expect(LIMITS.CITY).toBe(120);
    expect(LIMITS.TIMEZONE).toBe(80);
    expect(LIMITS.PLACE).toBe(64);
  });

  it('should have content limits', async () => {
    const { LIMITS } = await import('@/lib/validation');

    expect(LIMITS.MESSAGE).toBe(2000);
    expect(LIMITS.PROMPT).toBe(2000);
    expect(LIMITS.QUESTION).toBe(600);
  });

  it('should have message limits', async () => {
    const { LIMITS } = await import('@/lib/validation');

    expect(LIMITS.MAX_MESSAGES).toBe(20);
    expect(LIMITS.MAX_MESSAGES_SHORT).toBe(10);
  });

  it('should have coordinate limits', async () => {
    const { LIMITS } = await import('@/lib/validation');

    expect(LIMITS.LATITUDE).toEqual({ min: -90, max: 90 });
    expect(LIMITS.LONGITUDE).toEqual({ min: -180, max: 180 });
  });
});

describe('isValidDate', () => {
  it('should export isValidDate function', async () => {
    const { isValidDate } = await import('@/lib/validation');
    expect(typeof isValidDate).toBe('function');
  });

  it('should return true for valid dates', async () => {
    const { isValidDate } = await import('@/lib/validation');

    expect(isValidDate('2024-01-15')).toBe(true);
    expect(isValidDate('2024-12-31')).toBe(true);
    expect(isValidDate('1990-06-25')).toBe(true);
  });

  it('should return false for invalid dates', async () => {
    const { isValidDate } = await import('@/lib/validation');

    expect(isValidDate('2024/01/15')).toBe(false);
    expect(isValidDate('invalid')).toBe(false);
    expect(isValidDate('')).toBe(false);
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
  });

  it('should return false for invalid date values', async () => {
    const { isValidDate } = await import('@/lib/validation');

    expect(isValidDate('2024-13-01')).toBe(false);
    expect(isValidDate('2024-00-15')).toBe(false);
  });
});

describe('isValidTime', () => {
  it('should export isValidTime function', async () => {
    const { isValidTime } = await import('@/lib/validation');
    expect(typeof isValidTime).toBe('function');
  });

  it('should return true for valid times', async () => {
    const { isValidTime } = await import('@/lib/validation');

    expect(isValidTime('12:30')).toBe(true);
    expect(isValidTime('00:00')).toBe(true);
    expect(isValidTime('23:59')).toBe(true);
  });

  it('should return false for invalid times', async () => {
    const { isValidTime } = await import('@/lib/validation');

    expect(isValidTime('12:30:00')).toBe(false);
    expect(isValidTime('1:30')).toBe(false);
    expect(isValidTime('')).toBe(false);
    expect(isValidTime(null)).toBe(false);
    expect(isValidTime(undefined)).toBe(false);
  });
});

describe('isValidLatitude', () => {
  it('should export isValidLatitude function', async () => {
    const { isValidLatitude } = await import('@/lib/validation');
    expect(typeof isValidLatitude).toBe('function');
  });

  it('should return true for valid latitudes', async () => {
    const { isValidLatitude } = await import('@/lib/validation');

    expect(isValidLatitude(0)).toBe(true);
    expect(isValidLatitude(37.5665)).toBe(true);
    expect(isValidLatitude(-90)).toBe(true);
    expect(isValidLatitude(90)).toBe(true);
  });

  it('should return false for invalid latitudes', async () => {
    const { isValidLatitude } = await import('@/lib/validation');

    expect(isValidLatitude(91)).toBe(false);
    expect(isValidLatitude(-91)).toBe(false);
    expect(isValidLatitude(null)).toBe(false);
    expect(isValidLatitude(undefined)).toBe(false);
    expect(isValidLatitude(NaN)).toBe(false);
    expect(isValidLatitude(Infinity)).toBe(false);
  });
});

describe('isValidLongitude', () => {
  it('should export isValidLongitude function', async () => {
    const { isValidLongitude } = await import('@/lib/validation');
    expect(typeof isValidLongitude).toBe('function');
  });

  it('should return true for valid longitudes', async () => {
    const { isValidLongitude } = await import('@/lib/validation');

    expect(isValidLongitude(0)).toBe(true);
    expect(isValidLongitude(126.978)).toBe(true);
    expect(isValidLongitude(-180)).toBe(true);
    expect(isValidLongitude(180)).toBe(true);
  });

  it('should return false for invalid longitudes', async () => {
    const { isValidLongitude } = await import('@/lib/validation');

    expect(isValidLongitude(181)).toBe(false);
    expect(isValidLongitude(-181)).toBe(false);
    expect(isValidLongitude(null)).toBe(false);
    expect(isValidLongitude(undefined)).toBe(false);
  });
});

describe('isValidCoordinates', () => {
  it('should export isValidCoordinates function', async () => {
    const { isValidCoordinates } = await import('@/lib/validation');
    expect(typeof isValidCoordinates).toBe('function');
  });

  it('should return true for valid coordinates', async () => {
    const { isValidCoordinates } = await import('@/lib/validation');

    expect(isValidCoordinates(37.5665, 126.978)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
  });

  it('should return false for invalid coordinates', async () => {
    const { isValidCoordinates } = await import('@/lib/validation');

    expect(isValidCoordinates(91, 0)).toBe(false);
    expect(isValidCoordinates(0, 181)).toBe(false);
    expect(isValidCoordinates(null, 0)).toBe(false);
    expect(isValidCoordinates(0, null)).toBe(false);
  });
});

describe('isWithinLimit', () => {
  it('should export isWithinLimit function', async () => {
    const { isWithinLimit } = await import('@/lib/validation');
    expect(typeof isWithinLimit).toBe('function');
  });

  it('should return true for strings within limit', async () => {
    const { isWithinLimit } = await import('@/lib/validation');

    expect(isWithinLimit('hello', 10)).toBe(true);
    expect(isWithinLimit('exact', 5)).toBe(true);
    expect(isWithinLimit('', 10)).toBe(true);
  });

  it('should return false for strings exceeding limit', async () => {
    const { isWithinLimit } = await import('@/lib/validation');

    expect(isWithinLimit('toolongstring', 5)).toBe(false);
  });

  it('should return true for null or undefined', async () => {
    const { isWithinLimit } = await import('@/lib/validation');

    expect(isWithinLimit(null, 10)).toBe(true);
    expect(isWithinLimit(undefined, 10)).toBe(true);
  });
});

describe('isRequired', () => {
  it('should export isRequired function', async () => {
    const { isRequired } = await import('@/lib/validation');
    expect(typeof isRequired).toBe('function');
  });

  it('should return true for non-empty strings', async () => {
    const { isRequired } = await import('@/lib/validation');

    expect(isRequired('hello')).toBe(true);
    expect(isRequired('   text   ')).toBe(true);
  });

  it('should return false for empty or whitespace strings', async () => {
    const { isRequired } = await import('@/lib/validation');

    expect(isRequired('')).toBe(false);
    expect(isRequired('   ')).toBe(false);
    expect(isRequired(null)).toBe(false);
    expect(isRequired(undefined)).toBe(false);
  });
});

describe('truncate', () => {
  it('should export truncate function', async () => {
    const { truncate } = await import('@/lib/validation');
    expect(typeof truncate).toBe('function');
  });

  it('should return original string if within limit', async () => {
    const { truncate } = await import('@/lib/validation');

    expect(truncate('hello', 10)).toBe('hello');
    expect(truncate('exact', 5)).toBe('exact');
  });

  it('should truncate string if exceeds limit', async () => {
    const { truncate } = await import('@/lib/validation');

    expect(truncate('hello world', 5)).toBe('hello');
    expect(truncate('testing', 4)).toBe('test');
  });
});

describe('validateBirthInfo', () => {
  it('should export validateBirthInfo function', async () => {
    const { validateBirthInfo } = await import('@/lib/validation');
    expect(typeof validateBirthInfo).toBe('function');
  });

  it('should validate correct birth info', async () => {
    const { validateBirthInfo } = await import('@/lib/validation');

    const result = validateBirthInfo({
      birthDate: '1990-01-15',
      birthTime: '12:30',
      latitude: 37.5665,
      longitude: 126.978,
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for invalid birth info', async () => {
    const { validateBirthInfo } = await import('@/lib/validation');

    const result = validateBirthInfo({
      birthDate: 'invalid',
      birthTime: 'invalid',
      latitude: 91,
      longitude: 181,
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should return errors for missing required fields', async () => {
    const { validateBirthInfo } = await import('@/lib/validation');

    const result = validateBirthInfo({});

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(4);
  });
});

describe('validateProfile', () => {
  it('should export validateProfile function', async () => {
    const { validateProfile } = await import('@/lib/validation');
    expect(typeof validateProfile).toBe('function');
  });

  it('should validate correct profile', async () => {
    const { validateProfile } = await import('@/lib/validation');

    const result = validateProfile({
      name: 'John',
      birthDate: '1990-01-15',
      birthTime: '12:30',
      latitude: 37.5665,
      longitude: 126.978,
      city: 'Seoul',
      timezone: 'Asia/Seoul',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return errors for too long fields', async () => {
    const { validateProfile, LIMITS } = await import('@/lib/validation');

    const result = validateProfile({
      name: 'a'.repeat(LIMITS.NAME + 1),
      birthDate: '1990-01-15',
      birthTime: '12:30',
      latitude: 37.5665,
      longitude: 126.978,
      city: 'b'.repeat(LIMITS.CITY + 1),
      timezone: 'c'.repeat(LIMITS.TIMEZONE + 1),
    });

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });
});

describe('validateMessages', () => {
  it('should export validateMessages function', async () => {
    const { validateMessages } = await import('@/lib/validation');
    expect(typeof validateMessages).toBe('function');
  });

  it('should validate correct messages', async () => {
    const { validateMessages } = await import('@/lib/validation');

    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];

    const result = validateMessages(messages);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should return error if messages is not array', async () => {
    const { validateMessages } = await import('@/lib/validation');

    const result = validateMessages('not an array');

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Messages must be an array');
  });

  it('should return error if too many messages', async () => {
    const { validateMessages } = await import('@/lib/validation');

    const messages = Array(25).fill({ role: 'user', content: 'Hi' });
    const result = validateMessages(messages);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too many messages'))).toBe(true);
  });

  it('should return error if message content too long', async () => {
    const { validateMessages, LIMITS } = await import('@/lib/validation');

    const messages = [{ role: 'user', content: 'a'.repeat(LIMITS.MESSAGE + 1) }];
    const result = validateMessages(messages);

    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('too long'))).toBe(true);
  });
});
