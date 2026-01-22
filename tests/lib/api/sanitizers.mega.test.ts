/**
 * API Sanitizers MEGA Test Suite
 * Comprehensive testing for all sanitization functions
 */
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
  type ChatMessage,
  type ChatRole,
} from '@/lib/api/sanitizers';

describe('sanitizers MEGA - isRecord', () => {
  it.each([
    ['plain object', {}, true],
    ['object with properties', { foo: 'bar' }, true],
    ['nested object', { nested: { deep: 'value' } }, true],
    ['object with null value', { value: null }, true],
    ['object with array value', { arr: [1, 2] }, true],
    ['Date object', new Date(), true], // Date IS an object
    ['RegExp', /test/, true], // RegExp IS an object
  ])('should return true for %s', (_, input, expected) => {
    expect(isRecord(input)).toBe(expected);
  });

  it.each([
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty array', [], false],
    ['array with elements', [1, 2, 3], false],
    ['string', 'test', false],
    ['number', 123, false],
    ['boolean true', true, false],
    ['boolean false', false, false],
  ])('should return false for %s', (_, input, expected) => {
    expect(isRecord(input)).toBe(expected);
  });
});

describe('sanitizers MEGA - cleanStringArray', () => {
  describe('Basic functionality', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['object', {}],
      ['string', 'string'],
      ['number', 123],
    ])('should return empty array for non-array: %s', (_, input) => {
      expect(cleanStringArray(input as any)).toEqual([]);
    });

    it.each([
      ['clean strings', ['foo', 'bar'], ['foo', 'bar']],
      ['trim strings', ['  foo  ', '  bar  '], ['foo', 'bar']],
      ['remove empty', ['foo', '', 'bar'], ['foo', 'bar']],
      ['remove whitespace-only', ['foo', '   ', 'bar'], ['foo', 'bar']],
      ['skip non-strings', ['foo', 123, 'bar', null, 'baz'], ['foo', 'bar', 'baz']],
    ])('should handle %s', (_, input, expected) => {
      expect(cleanStringArray(input as any)).toEqual(expected);
    });
  });

  describe('Length limits', () => {
    it('should enforce default maxLen of 60', () => {
      const longString = 'a'.repeat(100);
      expect(cleanStringArray([longString])[0]).toHaveLength(60);
    });

    it('should enforce custom maxLen', () => {
      const longString = 'a'.repeat(100);
      expect(cleanStringArray([longString], 20, 10)[0]).toHaveLength(10);
    });

    it('should not truncate strings under maxLen', () => {
      expect(cleanStringArray(['short'], 20, 10)[0]).toBe('short');
    });

    it('should enforce default maxItems of 20', () => {
      const arr = Array.from({ length: 30 }, (_, i) => `item${i}`);
      expect(cleanStringArray(arr)).toHaveLength(20);
    });

    it('should enforce custom maxItems', () => {
      const arr = Array.from({ length: 30 }, (_, i) => `item${i}`);
      expect(cleanStringArray(arr, 5, 60)).toHaveLength(5);
    });

    it('should not limit arrays under maxItems', () => {
      const arr = ['a', 'b', 'c'];
      expect(cleanStringArray(arr, 10, 60)).toHaveLength(3);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty array', () => {
      expect(cleanStringArray([])).toEqual([]);
    });

    it('should handle array with all non-strings', () => {
      expect(cleanStringArray([1, 2, null, undefined, {}])).toEqual([]);
    });

    it('should handle array with all empty strings', () => {
      expect(cleanStringArray(['', '   ', '\t', '\n'])).toEqual([]);
    });

    it('should handle mixed content', () => {
      expect(cleanStringArray([
        'valid',
        '',
        123,
        'another',
        null,
        '  trimmed  ',
        undefined,
      ])).toEqual(['valid', 'another', 'trimmed']);
    });

    it('should handle maxItems of 0', () => {
      expect(cleanStringArray(['a', 'b'], 0, 60)).toEqual([]);
    });

    it('should handle maxLen of 0', () => {
      expect(cleanStringArray(['test'], 20, 0)).toEqual(['']);
    });

    it('should handle maxLen of 1', () => {
      expect(cleanStringArray(['test'], 20, 1)[0]).toBe('t');
    });
  });

  describe('Unicode and special characters', () => {
    it('should preserve emoji', () => {
      expect(cleanStringArray(['Hello 😀'])[0]).toBe('Hello 😀');
    });

    it('should preserve Korean', () => {
      expect(cleanStringArray(['안녕하세요'])[0]).toBe('안녕하세요');
    });

    it('should preserve Chinese', () => {
      expect(cleanStringArray(['你好'])[0]).toBe('你好');
    });

    it('should preserve Japanese', () => {
      expect(cleanStringArray(['こんにちは'])[0]).toBe('こんにちは');
    });

    it('should handle mixed unicode', () => {
      expect(cleanStringArray(['안녕 😀 world'])[0]).toBe('안녕 😀 world');
    });
  });
});

describe('sanitizers MEGA - normalizeMessages', () => {
  describe('Basic functionality', () => {
    it('should return empty array for non-array input', () => {
      expect(normalizeMessages(null)).toEqual([]);
      expect(normalizeMessages(undefined)).toEqual([]);
      expect(normalizeMessages({})).toEqual([]);
      expect(normalizeMessages('string')).toEqual([]);
    });

    it('should normalize valid message', () => {
      const result = normalizeMessages([{ role: 'user', content: 'Hello' }]);
      expect(result).toEqual([{ role: 'user', content: 'Hello' }]);
    });

    it('should normalize multiple messages', () => {
      const result = normalizeMessages([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there' },
      ]);
      expect(result).toHaveLength(2);
    });

    it('should trim content', () => {
      const result = normalizeMessages([{ role: 'user', content: '  Hello  ' }]);
      expect(result[0].content).toBe('Hello');
    });

    it('should skip invalid roles', () => {
      const result = normalizeMessages([
        { role: 'user', content: 'valid' },
        { role: 'invalid', content: 'skipped' },
      ]);
      expect(result).toHaveLength(1);
    });

    it('should skip empty content', () => {
      const result = normalizeMessages([
        { role: 'user', content: 'valid' },
        { role: 'user', content: '' },
      ]);
      expect(result).toHaveLength(1);
    });

    it('should skip whitespace-only content', () => {
      const result = normalizeMessages([
        { role: 'user', content: 'valid' },
        { role: 'user', content: '   ' },
      ]);
      expect(result).toHaveLength(1);
    });
  });

  describe('Role validation', () => {
    it('should accept user role', () => {
      const result = normalizeMessages([{ role: 'user', content: 'test' }]);
      expect(result[0].role).toBe('user');
    });

    it('should accept assistant role', () => {
      const result = normalizeMessages([{ role: 'assistant', content: 'test' }]);
      expect(result[0].role).toBe('assistant');
    });

    it('should accept system role', () => {
      const result = normalizeMessages([{ role: 'system', content: 'test' }]);
      expect(result[0].role).toBe('system');
    });

    it('should reject unknown role', () => {
      const result = normalizeMessages([{ role: 'admin', content: 'test' }] as any);
      expect(result).toHaveLength(0);
    });

    it('should reject number role', () => {
      const result = normalizeMessages([{ role: 123, content: 'test' }] as any);
      expect(result).toHaveLength(0);
    });

    it('should reject null role', () => {
      const result = normalizeMessages([{ role: null, content: 'test' }] as any);
      expect(result).toHaveLength(0);
    });
  });

  describe('Content validation', () => {
    it('should skip non-string content', () => {
      const result = normalizeMessages([
        { role: 'user', content: 123 },
        { role: 'user', content: null },
        { role: 'user', content: undefined },
      ] as any);
      expect(result).toHaveLength(0);
    });

    it('should skip object content', () => {
      const result = normalizeMessages([{ role: 'user', content: {} }] as any);
      expect(result).toHaveLength(0);
    });

    it('should skip array content', () => {
      const result = normalizeMessages([{ role: 'user', content: [] }] as any);
      expect(result).toHaveLength(0);
    });
  });

  describe('Limits and options', () => {
    it('should enforce default maxMessages of 20', () => {
      const messages = Array.from({ length: 30 }, (_, i) => ({
        role: 'user' as ChatRole,
        content: `msg${i}`,
      }));
      const result = normalizeMessages(messages);
      expect(result).toHaveLength(20);
    });

    it('should keep last N messages', () => {
      const messages = [
        { role: 'user', content: 'msg0' },
        { role: 'user', content: 'msg1' },
        { role: 'user', content: 'msg2' },
      ];
      const result = normalizeMessages(messages, { maxMessages: 2 });
      expect(result).toHaveLength(2);
      expect(result[0].content).toBe('msg1');
      expect(result[1].content).toBe('msg2');
    });

    it('should enforce default maxLength of 2000', () => {
      const longContent = 'a'.repeat(3000);
      const result = normalizeMessages([{ role: 'user', content: longContent }]);
      expect(result[0].content).toHaveLength(2000);
    });

    it('should enforce custom maxLength', () => {
      const longContent = 'a'.repeat(3000);
      const result = normalizeMessages(
        [{ role: 'user', content: longContent }],
        { maxLength: 100 }
      );
      expect(result[0].content).toHaveLength(100);
    });

    it('should use custom allowedRoles', () => {
      const customRoles = new Set<ChatRole>(['user']);
      const result = normalizeMessages(
        [
          { role: 'user', content: 'allowed' },
          { role: 'assistant', content: 'not allowed' },
        ],
        { allowedRoles: customRoles }
      );
      expect(result).toHaveLength(1);
      expect(result[0].role).toBe('user');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty array', () => {
      expect(normalizeMessages([])).toEqual([]);
    });

    it('should skip non-object messages', () => {
      const result = normalizeMessages([
        'string',
        123,
        null,
        undefined,
        { role: 'user', content: 'valid' },
      ] as any);
      expect(result).toHaveLength(1);
    });

    it('should handle array of arrays', () => {
      const result = normalizeMessages([[], []] as any);
      expect(result).toEqual([]);
    });

    it('should handle maxMessages of 0', () => {
      const result = normalizeMessages(
        [{ role: 'user', content: 'test' }],
        { maxMessages: 0 }
      );
      expect(result).toEqual([]);
    });

    it('should handle maxLength of 0', () => {
      const result = normalizeMessages(
        [{ role: 'user', content: 'test' }],
        { maxLength: 0 }
      );
      expect(result).toEqual([]);
    });
  });
});

describe('sanitizers MEGA - sanitizeString', () => {
  it('should return string unchanged if under limit', () => {
    expect(sanitizeString('hello', 10)).toBe('hello');
  });

  it('should truncate string at maxLen', () => {
    expect(sanitizeString('hello world', 5)).toBe('hello');
  });

  it('should trim whitespace', () => {
    expect(sanitizeString('  hello  ', 10)).toBe('hello');
  });

  it('should return default for non-string', () => {
    expect(sanitizeString(123, 10)).toBe('');
    expect(sanitizeString(null, 10)).toBe('');
    expect(sanitizeString(undefined, 10)).toBe('');
    expect(sanitizeString({}, 10)).toBe('');
  });

  it('should use custom default value', () => {
    expect(sanitizeString(123, 10, 'default')).toBe('default');
  });

  it('should return default for empty string', () => {
    expect(sanitizeString('', 10)).toBe('');
  });

  it('should return default for whitespace-only', () => {
    expect(sanitizeString('   ', 10)).toBe('');
  });

  it('should handle maxLen of 0', () => {
    expect(sanitizeString('hello', 0)).toBe('');
  });

  it('should handle maxLen of 1', () => {
    expect(sanitizeString('hello', 1)).toBe('h');
  });

  it('should handle very long maxLen', () => {
    const str = 'hello';
    expect(sanitizeString(str, 10000)).toBe('hello');
  });

  it('should preserve unicode', () => {
    expect(sanitizeString('안녕 😀', 10)).toBe('안녕 😀');
  });

  describe('Various inputs', () => {
    it('should handle boolean', () => {
      expect(sanitizeString(true, 10)).toBe('');
    });

    it('should handle array', () => {
      expect(sanitizeString([], 10)).toBe('');
    });

    it('should handle object', () => {
      expect(sanitizeString({}, 10)).toBe('');
    });
  });
});

describe('sanitizers MEGA - sanitizeNumber', () => {
  it('should return number within range', () => {
    expect(sanitizeNumber(5, 0, 10, 0)).toBe(5);
  });

  it('should clamp to min', () => {
    expect(sanitizeNumber(-5, 0, 10, 0)).toBe(0);
  });

  it('should clamp to max', () => {
    expect(sanitizeNumber(15, 0, 10, 0)).toBe(10);
  });

  it('should return default for non-number', () => {
    expect(sanitizeNumber('5', 0, 10, 0)).toBe(0);
    expect(sanitizeNumber(null, 0, 10, 0)).toBe(0);
    expect(sanitizeNumber(undefined, 0, 10, 0)).toBe(0);
  });

  it('should return default for NaN', () => {
    expect(sanitizeNumber(NaN, 0, 10, 0)).toBe(0);
  });

  it('should return default for Infinity', () => {
    expect(sanitizeNumber(Infinity, 0, 10, 0)).toBe(0);
  });

  it('should return default for -Infinity', () => {
    expect(sanitizeNumber(-Infinity, 0, 10, 0)).toBe(0);
  });

  it('should handle negative ranges', () => {
    expect(sanitizeNumber(-5, -10, -1, 0)).toBe(-5);
  });

  it('should clamp negative to min', () => {
    expect(sanitizeNumber(-15, -10, -1, 0)).toBe(-10);
  });

  it('should clamp negative to max', () => {
    expect(sanitizeNumber(5, -10, -1, 0)).toBe(-1);
  });

  it('should handle decimal numbers', () => {
    expect(sanitizeNumber(5.5, 0, 10, 0)).toBe(5.5);
  });

  it('should clamp decimals', () => {
    expect(sanitizeNumber(10.5, 0, 10, 0)).toBe(10);
  });

  it('should handle very large numbers', () => {
    expect(sanitizeNumber(1e10, 0, 1e9, 0)).toBe(1e9);
  });

  it('should handle very small numbers', () => {
    expect(sanitizeNumber(1e-10, 0, 1, 0)).toBe(1e-10);
  });

  it('should use custom default', () => {
    expect(sanitizeNumber('invalid', 0, 10, 5)).toBe(5);
  });

  describe('Edge cases', () => {
    it('should handle min equals max', () => {
      expect(sanitizeNumber(5, 10, 10, 0)).toBe(10);
    });

    it('should handle exactly at min', () => {
      expect(sanitizeNumber(0, 0, 10, 5)).toBe(0);
    });

    it('should handle exactly at max', () => {
      expect(sanitizeNumber(10, 0, 10, 5)).toBe(10);
    });

    it('should handle zero', () => {
      expect(sanitizeNumber(0, -10, 10, 5)).toBe(0);
    });
  });
});

describe('sanitizers MEGA - sanitizeBoolean', () => {
  it('should return true for true', () => {
    expect(sanitizeBoolean(true)).toBe(true);
  });

  it('should return false for false', () => {
    expect(sanitizeBoolean(false)).toBe(false);
  });

  it('should return default false for non-boolean', () => {
    expect(sanitizeBoolean('true')).toBe(false);
    expect(sanitizeBoolean(1)).toBe(false);
    expect(sanitizeBoolean(0)).toBe(false);
    expect(sanitizeBoolean(null)).toBe(false);
    expect(sanitizeBoolean(undefined)).toBe(false);
  });

  it('should use custom default', () => {
    expect(sanitizeBoolean('invalid', true)).toBe(true);
  });

  it('should not coerce strings', () => {
    expect(sanitizeBoolean('true', false)).toBe(false);
    expect(sanitizeBoolean('false', true)).toBe(true);
  });

  it('should not coerce numbers', () => {
    expect(sanitizeBoolean(1, false)).toBe(false);
    expect(sanitizeBoolean(0, true)).toBe(true);
  });

  it('should handle object', () => {
    expect(sanitizeBoolean({}, false)).toBe(false);
  });

  it('should handle array', () => {
    expect(sanitizeBoolean([], false)).toBe(false);
  });
});

describe('sanitizers MEGA - sanitizeHtml', () => {
  it('should remove script tags', () => {
    const result = sanitizeHtml('<script>alert(1)</script>Hello');
    expect(result).toBe('Hello');
  });

  it('should remove HTML tags', () => {
    const result = sanitizeHtml('<div>Hello</div>');
    expect(result).toBe('Hello');
  });

  it('should remove dangerous characters', () => {
    expect(sanitizeHtml('Hello < world')).toBe('Hello  world');
    expect(sanitizeHtml('Hello > world')).toBe('Hello  world');
    expect(sanitizeHtml('Hello { world')).toBe('Hello  world');
    expect(sanitizeHtml('Hello } world')).toBe('Hello  world');
  });

  it('should trim result', () => {
    expect(sanitizeHtml('  <div>Hello</div>  ')).toBe('Hello');
  });

  it('should enforce default maxLen of 10000', () => {
    const long = 'a'.repeat(15000);
    expect(sanitizeHtml(long)).toHaveLength(10000);
  });

  it('should enforce custom maxLen', () => {
    const long = 'a'.repeat(1000);
    expect(sanitizeHtml(long, 100)).toHaveLength(100);
  });

  it('should return default for non-string', () => {
    expect(sanitizeHtml(123)).toBe('');
    expect(sanitizeHtml(null)).toBe('');
    expect(sanitizeHtml(undefined)).toBe('');
  });

  it('should use custom default', () => {
    expect(sanitizeHtml(123, 1000, 'default')).toBe('default');
  });

  it('should handle multiple script tags', () => {
    const result = sanitizeHtml('<script>1</script>Text<script>2</script>');
    expect(result).toBe('Text');
  });

  it('should handle nested HTML', () => {
    const result = sanitizeHtml('<div><p><span>Text</span></p></div>');
    expect(result).toBe('Text');
  });

  it('should handle mixed dangerous content', () => {
    const result = sanitizeHtml('<div>{<script>alert(1)</script>}</div>');
    expect(result).toBe('');
  });

  it('should preserve safe text', () => {
    expect(sanitizeHtml('Hello World')).toBe('Hello World');
  });

  it('should preserve unicode', () => {
    expect(sanitizeHtml('안녕하세요 😀')).toBe('안녕하세요 😀');
  });

  describe('XSS patterns', () => {
    it('should handle img tags', () => {
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">')).toBe('');
    });

    it('should handle iframe', () => {
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe('');
    });

    it('should handle object tags', () => {
      expect(sanitizeHtml('<object data="evil"></object>')).toBe('');
    });

    it('should handle style tags', () => {
      expect(sanitizeHtml('<style>body{display:none}</style>')).toBe('');
    });
  });
});

describe('sanitizers MEGA - sanitizeEnum', () => {
  const SIZES = ['small', 'medium', 'large'] as const;
  type Size = (typeof SIZES)[number];

  it('should return valid enum value', () => {
    expect(sanitizeEnum<Size>('small', SIZES, 'medium')).toBe('small');
  });

  it('should return default for invalid value', () => {
    expect(sanitizeEnum<Size>('xlarge', SIZES, 'medium')).toBe('medium');
  });

  it('should return default for non-string', () => {
    expect(sanitizeEnum<Size>(123 as any, SIZES, 'medium')).toBe('medium');
    expect(sanitizeEnum<Size>(null as any, SIZES, 'medium')).toBe('medium');
    expect(sanitizeEnum<Size>(undefined as any, SIZES, 'medium')).toBe('medium');
  });

  it('should be case sensitive', () => {
    expect(sanitizeEnum<Size>('Small', SIZES, 'medium')).toBe('medium');
  });

  it('should handle empty allowed array', () => {
    expect(sanitizeEnum('test', [] as const, 'default')).toBe('default');
  });

  it('should handle single value array', () => {
    const single = ['only'] as const;
    expect(sanitizeEnum('only', single, 'only')).toBe('only');
  });

  describe('Different enum types', () => {
    it('should work with roles', () => {
      const ROLES = ['user', 'admin', 'guest'] as const;
      type Role = (typeof ROLES)[number];
      expect(sanitizeEnum<Role>('admin', ROLES, 'guest')).toBe('admin');
      expect(sanitizeEnum<Role>('superadmin', ROLES, 'guest')).toBe('guest');
    });

    it('should work with status', () => {
      const STATUS = ['pending', 'active', 'inactive'] as const;
      type Status = (typeof STATUS)[number];
      expect(sanitizeEnum<Status>('active', STATUS, 'pending')).toBe('active');
      expect(sanitizeEnum<Status>('deleted', STATUS, 'pending')).toBe('pending');
    });

    it('should work with numbers as strings', () => {
      const NUMS = ['1', '2', '3'] as const;
      type Num = (typeof NUMS)[number];
      expect(sanitizeEnum<Num>('2', NUMS, '1')).toBe('2');
      expect(sanitizeEnum<Num>('4', NUMS, '1')).toBe('1');
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string in allowed', () => {
      const VALS = ['', 'value'] as const;
      type Val = (typeof VALS)[number];
      expect(sanitizeEnum<Val>('', VALS, 'value')).toBe('');
    });

    it('should handle whitespace value', () => {
      expect(sanitizeEnum<Size>('  small  ', SIZES, 'medium')).toBe('medium');
    });

    it('should handle boolean input', () => {
      expect(sanitizeEnum<Size>(true as any, SIZES, 'medium')).toBe('medium');
    });

    it('should handle object input', () => {
      expect(sanitizeEnum<Size>({} as any, SIZES, 'medium')).toBe('medium');
    });

    it('should handle array input', () => {
      expect(sanitizeEnum<Size>([] as any, SIZES, 'medium')).toBe('medium');
    });
  });
});
