import { describe, it, expect } from 'vitest';

describe('isRecord', () => {
  it('should export isRecord function', async () => {
    const { isRecord } = await import('@/lib/api');
    expect(typeof isRecord).toBe('function');
  });

  it('should return true for plain objects', async () => {
    const { isRecord } = await import('@/lib/api');

    expect(isRecord({})).toBe(true);
    expect(isRecord({ key: 'value' })).toBe(true);
    expect(isRecord({ nested: { object: true } })).toBe(true);
  });

  it('should return false for arrays', async () => {
    const { isRecord } = await import('@/lib/api');

    expect(isRecord([])).toBe(false);
    expect(isRecord([1, 2, 3])).toBe(false);
    expect(isRecord(['a', 'b'])).toBe(false);
  });

  it('should return false for null and primitives', async () => {
    const { isRecord } = await import('@/lib/api');

    expect(isRecord(null)).toBe(false);
    expect(isRecord(undefined)).toBe(false);
    expect(isRecord('string')).toBe(false);
    expect(isRecord(123)).toBe(false);
    expect(isRecord(true)).toBe(false);
  });
});

describe('cleanStringArray', () => {
  it('should export cleanStringArray function', async () => {
    const { cleanStringArray } = await import('@/lib/api');
    expect(typeof cleanStringArray).toBe('function');
  });

  it('should clean array of strings', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    expect(cleanStringArray(['a', 'b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should trim whitespace', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    expect(cleanStringArray(['  hello  ', '  world  '])).toEqual(['hello', 'world']);
  });

  it('should filter out empty strings', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    expect(cleanStringArray(['a', '', 'b', '   ', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('should filter out non-strings', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    expect(cleanStringArray(['a', 123, 'b', null, 'c'] as unknown[])).toEqual(['a', 'b', 'c']);
  });

  it('should limit number of items', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    const input = Array(30).fill('item');
    expect(cleanStringArray(input, 5)).toHaveLength(5);
  });

  it('should limit string length', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    expect(cleanStringArray(['hello world'], 10, 5)).toEqual(['hello']);
  });

  it('should return empty array for non-array input', async () => {
    const { cleanStringArray } = await import('@/lib/api');

    expect(cleanStringArray('not an array')).toEqual([]);
    expect(cleanStringArray(null)).toEqual([]);
    expect(cleanStringArray(undefined)).toEqual([]);
  });
});

describe('normalizeMessages', () => {
  it('should export normalizeMessages function', async () => {
    const { normalizeMessages } = await import('@/lib/api');
    expect(typeof normalizeMessages).toBe('function');
  });

  it('should normalize valid messages', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' },
    ];

    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ role: 'user', content: 'Hello' });
    expect(result[1]).toEqual({ role: 'assistant', content: 'Hi there' });
  });

  it('should filter invalid roles', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    const messages = [
      { role: 'user', content: 'Valid' },
      { role: 'invalid', content: 'Invalid role' },
      { role: 'assistant', content: 'Valid' },
    ];

    const result = normalizeMessages(messages);
    expect(result).toHaveLength(2);
  });

  it('should filter empty content', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    const messages = [
      { role: 'user', content: '' },
      { role: 'assistant', content: 'Valid' },
    ];

    const result = normalizeMessages(messages);
    expect(result).toHaveLength(1);
  });

  it('should limit message count', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    const messages = Array(30).fill({ role: 'user', content: 'Test' });
    const result = normalizeMessages(messages, { maxMessages: 5 });
    expect(result).toHaveLength(5);
  });

  it('should truncate content length', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    const messages = [{ role: 'user', content: 'a'.repeat(100) }];
    const result = normalizeMessages(messages, { maxLength: 10 });
    expect(result[0].content).toHaveLength(10);
  });

  it('should return empty array for non-array input', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    expect(normalizeMessages('not an array')).toEqual([]);
    expect(normalizeMessages(null)).toEqual([]);
  });

  it('should accept system role', async () => {
    const { normalizeMessages } = await import('@/lib/api');

    const messages = [{ role: 'system', content: 'System message' }];
    const result = normalizeMessages(messages);
    expect(result).toHaveLength(1);
    expect(result[0].role).toBe('system');
  });
});

describe('sanitizeString', () => {
  it('should export sanitizeString function', async () => {
    const { sanitizeString } = await import('@/lib/api');
    expect(typeof sanitizeString).toBe('function');
  });

  it('should trim and truncate string', async () => {
    const { sanitizeString } = await import('@/lib/api');

    expect(sanitizeString('  hello  ', 10)).toBe('hello');
    expect(sanitizeString('hello world', 5)).toBe('hello');
  });

  it('should return default for non-string', async () => {
    const { sanitizeString } = await import('@/lib/api');

    expect(sanitizeString(123, 10)).toBe('');
    expect(sanitizeString(null, 10)).toBe('');
    expect(sanitizeString(123, 10, 'default')).toBe('default');
  });

  it('should return default for empty string', async () => {
    const { sanitizeString } = await import('@/lib/api');

    expect(sanitizeString('', 10, 'default')).toBe('default');
    expect(sanitizeString('   ', 10, 'default')).toBe('default');
  });
});

describe('sanitizeNumber', () => {
  it('should export sanitizeNumber function', async () => {
    const { sanitizeNumber } = await import('@/lib/api');
    expect(typeof sanitizeNumber).toBe('function');
  });

  it('should clamp number within range', async () => {
    const { sanitizeNumber } = await import('@/lib/api');

    expect(sanitizeNumber(5, 0, 10, 0)).toBe(5);
    expect(sanitizeNumber(-5, 0, 10, 0)).toBe(0);
    expect(sanitizeNumber(15, 0, 10, 0)).toBe(10);
  });

  it('should return default for non-number', async () => {
    const { sanitizeNumber } = await import('@/lib/api');

    expect(sanitizeNumber('5', 0, 10, 0)).toBe(0);
    expect(sanitizeNumber(null, 0, 10, 5)).toBe(5);
    expect(sanitizeNumber(undefined, 0, 10, 5)).toBe(5);
  });

  it('should return default for non-finite numbers', async () => {
    const { sanitizeNumber } = await import('@/lib/api');

    expect(sanitizeNumber(NaN, 0, 10, 5)).toBe(5);
    expect(sanitizeNumber(Infinity, 0, 10, 5)).toBe(5);
    expect(sanitizeNumber(-Infinity, 0, 10, 5)).toBe(5);
  });
});

describe('sanitizeBoolean', () => {
  it('should export sanitizeBoolean function', async () => {
    const { sanitizeBoolean } = await import('@/lib/api');
    expect(typeof sanitizeBoolean).toBe('function');
  });

  it('should return boolean value directly', async () => {
    const { sanitizeBoolean } = await import('@/lib/api');

    expect(sanitizeBoolean(true)).toBe(true);
    expect(sanitizeBoolean(false)).toBe(false);
  });

  it('should return default for non-boolean', async () => {
    const { sanitizeBoolean } = await import('@/lib/api');

    expect(sanitizeBoolean('true')).toBe(false);
    expect(sanitizeBoolean(1)).toBe(false);
    expect(sanitizeBoolean(null)).toBe(false);
    expect(sanitizeBoolean('true', true)).toBe(true);
  });
});

describe('sanitizeHtml', () => {
  it('should export sanitizeHtml function', async () => {
    const { sanitizeHtml } = await import('@/lib/api');
    expect(typeof sanitizeHtml).toBe('function');
  });

  it('should remove script tags', async () => {
    const { sanitizeHtml } = await import('@/lib/api');

    const input = '<script>alert("xss")</script>Hello';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('script');
    expect(result).toContain('Hello');
  });

  it('should remove HTML tags', async () => {
    const { sanitizeHtml } = await import('@/lib/api');

    const input = '<div><p>Hello</p></div>';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('Hello');
  });

  it('should remove dangerous characters', async () => {
    const { sanitizeHtml } = await import('@/lib/api');

    const input = 'Hello < > { }';
    const result = sanitizeHtml(input);
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).not.toContain('{');
    expect(result).not.toContain('}');
  });

  it('should truncate to max length', async () => {
    const { sanitizeHtml } = await import('@/lib/api');

    const input = 'a'.repeat(100);
    const result = sanitizeHtml(input, 10);
    expect(result).toHaveLength(10);
  });

  it('should return default for non-string', async () => {
    const { sanitizeHtml } = await import('@/lib/api');

    expect(sanitizeHtml(123)).toBe('');
    expect(sanitizeHtml(null, 100, 'default')).toBe('default');
  });
});

describe('sanitizeEnum', () => {
  it('should export sanitizeEnum function', async () => {
    const { sanitizeEnum } = await import('@/lib/api');
    expect(typeof sanitizeEnum).toBe('function');
  });

  it('should return value if in allowed list', async () => {
    const { sanitizeEnum } = await import('@/lib/api');

    const allowed = ['red', 'green', 'blue'] as const;
    expect(sanitizeEnum('red', allowed, 'red')).toBe('red');
    expect(sanitizeEnum('green', allowed, 'red')).toBe('green');
  });

  it('should return default if not in allowed list', async () => {
    const { sanitizeEnum } = await import('@/lib/api');

    const allowed = ['red', 'green', 'blue'] as const;
    expect(sanitizeEnum('yellow', allowed, 'red')).toBe('red');
    expect(sanitizeEnum('', allowed, 'blue')).toBe('blue');
  });

  it('should return default for non-string', async () => {
    const { sanitizeEnum } = await import('@/lib/api');

    const allowed = ['a', 'b', 'c'] as const;
    expect(sanitizeEnum(123, allowed, 'a')).toBe('a');
    expect(sanitizeEnum(null, allowed, 'b')).toBe('b');
  });
});
