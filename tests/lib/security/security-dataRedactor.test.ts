import { describe, it, expect } from 'vitest';

describe('Security Module Exports', () => {
  it('should export DataRedactor class', async () => {
    const { DataRedactor } = await import('@/lib/security');

    expect(DataRedactor).toBeDefined();
    expect(typeof DataRedactor).toBe('function');
  });

  it('should export hashName function', async () => {
    const { hashName } = await import('@/lib/security');
    expect(typeof hashName).toBe('function');
  });

  it('should export maskDisplayName function', async () => {
    const { maskDisplayName } = await import('@/lib/security');
    expect(typeof maskDisplayName).toBe('function');
  });

  it('should export maskTextWithName function', async () => {
    const { maskTextWithName } = await import('@/lib/security');
    expect(typeof maskTextWithName).toBe('function');
  });

  it('should export maskEmail function', async () => {
    const { maskEmail } = await import('@/lib/security');
    expect(typeof maskEmail).toBe('function');
  });

  it('should export maskPayload function', async () => {
    const { maskPayload } = await import('@/lib/security');
    expect(typeof maskPayload).toBe('function');
  });

  it('should export maskAstrologyInput function', async () => {
    const { maskAstrologyInput } = await import('@/lib/security');
    expect(typeof maskAstrologyInput).toBe('function');
  });
});

describe('hashName', () => {
  it('should hash name to 12 character hex string', async () => {
    const { hashName } = await import('@/lib/security');

    const result = hashName('홍길동');
    expect(result).toHaveLength(12);
    expect(result).toMatch(/^[a-f0-9]+$/);
  });

  it('should return "anon" for empty or undefined name', async () => {
    const { hashName } = await import('@/lib/security');

    expect(hashName()).toBe('anon');
    expect(hashName('')).toBe('anon');
    expect(hashName(undefined)).toBe('anon');
  });

  it('should produce consistent hashes', async () => {
    const { hashName } = await import('@/lib/security');

    const hash1 = hashName('John');
    const hash2 = hashName('John');
    expect(hash1).toBe(hash2);
  });

  it('should produce different hashes for different names', async () => {
    const { hashName } = await import('@/lib/security');

    const hash1 = hashName('John');
    const hash2 = hashName('Jane');
    expect(hash1).not.toBe(hash2);
  });
});

describe('maskDisplayName', () => {
  it('should mask name keeping first character', async () => {
    const { maskDisplayName } = await import('@/lib/security');

    expect(maskDisplayName('홍길동')).toBe('홍***');
    expect(maskDisplayName('John')).toBe('J***');
    expect(maskDisplayName('김철수')).toBe('김***');
  });

  it('should return undefined for empty or undefined name', async () => {
    const { maskDisplayName } = await import('@/lib/security');

    expect(maskDisplayName()).toBeUndefined();
    expect(maskDisplayName('')).toBeUndefined();
    expect(maskDisplayName(undefined)).toBeUndefined();
  });

  it('should handle single character names', async () => {
    const { maskDisplayName } = await import('@/lib/security');

    expect(maskDisplayName('A')).toBe('A***');
  });

  it('should handle whitespace-padded names', async () => {
    const { maskDisplayName } = await import('@/lib/security');

    // Implementation trims before slicing first char, so 'J' is extracted
    expect(maskDisplayName('  John  ')).toBe('J***');
  });
});

describe('maskTextWithName', () => {
  it('should mask all occurrences of name in text', async () => {
    const { maskTextWithName } = await import('@/lib/security');

    expect(maskTextWithName('홍길동님 안녕하세요', '홍길동')).toBe('***님 안녕하세요');
    expect(maskTextWithName('Hello John, John is here', 'John')).toBe('Hello ***, *** is here');
  });

  it('should return original text if name is empty', async () => {
    const { maskTextWithName } = await import('@/lib/security');

    expect(maskTextWithName('Hello world', '')).toBe('Hello world');
    expect(maskTextWithName('Hello world', undefined)).toBe('Hello world');
  });

  it('should return original text if text is empty', async () => {
    const { maskTextWithName } = await import('@/lib/security');

    expect(maskTextWithName('', 'John')).toBe('');
  });

  it('should handle special regex characters in name', async () => {
    const { maskTextWithName } = await import('@/lib/security');

    expect(maskTextWithName('Hello John.Doe', 'John.Doe')).toBe('Hello ***');
    expect(maskTextWithName('Test (name)', '(name)')).toBe('Test ***');
  });
});

describe('maskEmail', () => {
  it('should mask email address', async () => {
    const { maskEmail } = await import('@/lib/security');

    expect(maskEmail('user@example.com')).toBe('us***@***');
    expect(maskEmail('test@domain.org')).toBe('te***@***');
    expect(maskEmail('ab@test.com')).toBe('ab***@***');
  });

  it('should return "***@***" for empty or undefined email', async () => {
    const { maskEmail } = await import('@/lib/security');

    expect(maskEmail()).toBe('***@***');
    expect(maskEmail('')).toBe('***@***');
    expect(maskEmail(undefined)).toBe('***@***');
  });

  it('should handle short local parts', async () => {
    const { maskEmail } = await import('@/lib/security');

    expect(maskEmail('a@test.com')).toBe('a***@***');
  });
});

describe('maskPayload', () => {
  it('should mask sensitive fields in payload', async () => {
    const { maskPayload } = await import('@/lib/security');

    const payload = {
      name: 'John Doe',
      birthDate: '1990-01-15',
      birthTime: '12:30',
      email: 'john@example.com',
      latitude: 37.566536,
      longitude: 126.977969,
      city: 'Seoul',
    };

    const result = maskPayload(payload);

    expect(result.name).toBe('J***');
    expect(result.birthDate).toBe('****-**-**');
    expect(result.birthTime).toBe('**:**');
    expect(result.email).toBe('jo***@***');
    expect(result.latitude).toBe('37.567');
    expect(result.longitude).toBe('126.978');
    expect(result.city).toBe('Seoul');
  });

  it('should return masked flag for non-object body', async () => {
    const { maskPayload } = await import('@/lib/security');

    expect(maskPayload(null)).toEqual({ _masked: true });
    expect(maskPayload(undefined)).toEqual({ _masked: true });
    expect(maskPayload('string')).toEqual({ _masked: true });
  });

  it('should handle missing fields gracefully', async () => {
    const { maskPayload } = await import('@/lib/security');

    const payload = { city: 'Seoul' };
    const result = maskPayload(payload);

    expect(result.city).toBe('Seoul');
    expect(result.name).toBeUndefined();
  });

  it('should handle string coordinates', async () => {
    const { maskPayload } = await import('@/lib/security');

    const payload = {
      latitude: '37.566536',
      longitude: '126.977969',
    };

    const result = maskPayload(payload);

    expect(result.latitude).toBe('37.567');
    expect(result.longitude).toBe('126.978');
  });
});

describe('maskAstrologyInput', () => {
  it('should mask astrology input fields', async () => {
    const { maskAstrologyInput } = await import('@/lib/security');

    const input = {
      name: '홍길동',
      birthDate: '1990-01-15',
      birthTime: '12:30',
      latitude: 37.566536,
      longitude: 126.977969,
    };

    const result = maskAstrologyInput(input);

    expect(result.name).toBe('홍***');
    expect(result.birthDate).toBe('****-**-**');
    expect(result.birthTime).toBe('**:**');
    expect(result.latitude).toBe('37.57');
    expect(result.longitude).toBe('126.98');
  });

  it('should return undefined for missing fields', async () => {
    const { maskAstrologyInput } = await import('@/lib/security');

    const input = {};
    const result = maskAstrologyInput(input);

    expect(result.name).toBeUndefined();
    expect(result.birthDate).toBeUndefined();
    expect(result.birthTime).toBeUndefined();
    expect(result.latitude).toBeUndefined();
    expect(result.longitude).toBeUndefined();
  });

  it('should handle empty name', async () => {
    const { maskAstrologyInput } = await import('@/lib/security');

    const input = { name: '' };
    const result = maskAstrologyInput(input);

    // Empty string evaluates to falsy, so returns undefined
    expect(result.name).toBeUndefined();
  });
});

describe('DataRedactor class static methods', () => {
  it('should have all static methods', async () => {
    const { DataRedactor } = await import('@/lib/security');

    expect(typeof DataRedactor.hashName).toBe('function');
    expect(typeof DataRedactor.maskDisplayName).toBe('function');
    expect(typeof DataRedactor.maskTextWithName).toBe('function');
    expect(typeof DataRedactor.maskEmail).toBe('function');
    expect(typeof DataRedactor.maskPayload).toBe('function');
    expect(typeof DataRedactor.maskAstrologyInput).toBe('function');
  });

  it('should produce same results as standalone functions', async () => {
    const { DataRedactor, hashName, maskDisplayName, maskEmail } =
      await import('@/lib/security');

    expect(DataRedactor.hashName('test')).toBe(hashName('test'));
    expect(DataRedactor.maskDisplayName('John')).toBe(maskDisplayName('John'));
    expect(DataRedactor.maskEmail('test@test.com')).toBe(maskEmail('test@test.com'));
  });
});
