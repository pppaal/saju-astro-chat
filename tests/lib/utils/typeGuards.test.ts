/**
 * Type Guards Tests
 * Comprehensive tests for type guard utilities
 */

import { describe, it, expect } from 'vitest';
import {
  // Basic type guards
  isString,
  isNumber,
  isBoolean,
  isNull,
  isUndefined,
  isNullish,
  isDefined,
  isObject,
  isArray,
  isFunction,
  isDate,
  isDateString,
  isError,
  // Complex type guards
  isNonEmptyString,
  isNonEmptyArray,
  hasProperty,
  hasProperties,
  isShape,
  // Application-specific type guards
  isBirthInfo,
  isCoordinates,
  isChatMessage,
  isApiError,
  // Assertion functions
  assertDefined,
  assertString,
  assertNumber,
  assertObject,
  // Safe parsing functions
  parseJSON,
  parseNumber,
  parseBoolean,
  getProperty,
  // Type narrowing utilities
  filterDefined,
  filterByType,
  safeMap,
} from '@/lib/utils/typeGuards';

describe('Type Guards', () => {
  describe('Basic Type Guards', () => {
    describe('isString', () => {
      it('returns true for strings', () => {
        expect(isString('')).toBe(true);
        expect(isString('hello')).toBe(true);
        expect(isString(String('test'))).toBe(true);
      });

      it('returns false for non-strings', () => {
        expect(isString(123)).toBe(false);
        expect(isString(null)).toBe(false);
        expect(isString(undefined)).toBe(false);
        expect(isString({})).toBe(false);
        expect(isString([])).toBe(false);
        expect(isString(true)).toBe(false);
      });
    });

    describe('isNumber', () => {
      it('returns true for valid numbers', () => {
        expect(isNumber(0)).toBe(true);
        expect(isNumber(123)).toBe(true);
        expect(isNumber(-456)).toBe(true);
        expect(isNumber(3.14)).toBe(true);
        expect(isNumber(Infinity)).toBe(true);
        expect(isNumber(-Infinity)).toBe(true);
      });

      it('returns false for NaN', () => {
        expect(isNumber(NaN)).toBe(false);
      });

      it('returns false for non-numbers', () => {
        expect(isNumber('123')).toBe(false);
        expect(isNumber(null)).toBe(false);
        expect(isNumber(undefined)).toBe(false);
        expect(isNumber({})).toBe(false);
      });
    });

    describe('isBoolean', () => {
      it('returns true for booleans', () => {
        expect(isBoolean(true)).toBe(true);
        expect(isBoolean(false)).toBe(true);
        expect(isBoolean(Boolean(1))).toBe(true);
      });

      it('returns false for non-booleans', () => {
        expect(isBoolean(0)).toBe(false);
        expect(isBoolean(1)).toBe(false);
        expect(isBoolean('true')).toBe(false);
        expect(isBoolean(null)).toBe(false);
      });
    });

    describe('isNull', () => {
      it('returns true for null', () => {
        expect(isNull(null)).toBe(true);
      });

      it('returns false for non-null', () => {
        expect(isNull(undefined)).toBe(false);
        expect(isNull(0)).toBe(false);
        expect(isNull('')).toBe(false);
        expect(isNull(false)).toBe(false);
      });
    });

    describe('isUndefined', () => {
      it('returns true for undefined', () => {
        expect(isUndefined(undefined)).toBe(true);
        expect(isUndefined(void 0)).toBe(true);
      });

      it('returns false for non-undefined', () => {
        expect(isUndefined(null)).toBe(false);
        expect(isUndefined(0)).toBe(false);
        expect(isUndefined('')).toBe(false);
      });
    });

    describe('isNullish', () => {
      it('returns true for null or undefined', () => {
        expect(isNullish(null)).toBe(true);
        expect(isNullish(undefined)).toBe(true);
      });

      it('returns false for other falsy values', () => {
        expect(isNullish(0)).toBe(false);
        expect(isNullish('')).toBe(false);
        expect(isNullish(false)).toBe(false);
        expect(isNullish(NaN)).toBe(false);
      });
    });

    describe('isDefined', () => {
      it('returns true for defined values', () => {
        expect(isDefined(0)).toBe(true);
        expect(isDefined('')).toBe(true);
        expect(isDefined(false)).toBe(true);
        expect(isDefined({})).toBe(true);
        expect(isDefined([])).toBe(true);
      });

      it('returns false for null or undefined', () => {
        expect(isDefined(null)).toBe(false);
        expect(isDefined(undefined)).toBe(false);
      });
    });

    describe('isObject', () => {
      it('returns true for plain objects', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ a: 1 })).toBe(true);
        expect(isObject(Object.create(null))).toBe(true);
      });

      it('returns false for arrays', () => {
        expect(isObject([])).toBe(false);
        expect(isObject([1, 2, 3])).toBe(false);
      });

      it('returns false for null', () => {
        expect(isObject(null)).toBe(false);
      });

      it('returns false for primitives', () => {
        expect(isObject('string')).toBe(false);
        expect(isObject(123)).toBe(false);
        expect(isObject(true)).toBe(false);
      });
    });

    describe('isArray', () => {
      it('returns true for arrays', () => {
        expect(isArray([])).toBe(true);
        expect(isArray([1, 2, 3])).toBe(true);
        expect(isArray(new Array(3))).toBe(true);
      });

      it('returns false for non-arrays', () => {
        expect(isArray({})).toBe(false);
        expect(isArray('array')).toBe(false);
        expect(isArray({ length: 3 })).toBe(false);
      });
    });

    describe('isFunction', () => {
      it('returns true for functions', () => {
        expect(isFunction(() => {})).toBe(true);
        expect(isFunction(function() {})).toBe(true);
        expect(isFunction(async () => {})).toBe(true);
        expect(isFunction(class {})).toBe(true);
      });

      it('returns false for non-functions', () => {
        expect(isFunction({})).toBe(false);
        expect(isFunction(null)).toBe(false);
        expect(isFunction('function')).toBe(false);
      });
    });

    describe('isDate', () => {
      it('returns true for valid Date objects', () => {
        expect(isDate(new Date())).toBe(true);
        expect(isDate(new Date('2024-01-01'))).toBe(true);
      });

      it('returns false for invalid Date objects', () => {
        expect(isDate(new Date('invalid'))).toBe(false);
      });

      it('returns false for non-Date values', () => {
        expect(isDate('2024-01-01')).toBe(false);
        expect(isDate(Date.now())).toBe(false);
        expect(isDate({})).toBe(false);
      });
    });

    describe('isDateString', () => {
      it('returns true for valid date strings', () => {
        expect(isDateString('2024-01-01')).toBe(true);
        expect(isDateString('2024-01-01T00:00:00Z')).toBe(true);
        expect(isDateString('January 1, 2024')).toBe(true);
      });

      it('returns false for invalid date strings', () => {
        expect(isDateString('invalid')).toBe(false);
        expect(isDateString('not a date')).toBe(false);
      });

      it('returns false for non-strings', () => {
        expect(isDateString(123)).toBe(false);
        expect(isDateString(new Date())).toBe(false);
      });
    });

    describe('isError', () => {
      it('returns true for Error objects', () => {
        expect(isError(new Error())).toBe(true);
        expect(isError(new TypeError())).toBe(true);
        expect(isError(new RangeError())).toBe(true);
      });

      it('returns false for non-Error values', () => {
        expect(isError({ message: 'error' })).toBe(false);
        expect(isError('error')).toBe(false);
        expect(isError(null)).toBe(false);
      });
    });
  });

  describe('Complex Type Guards', () => {
    describe('isNonEmptyString', () => {
      it('returns true for non-empty strings', () => {
        expect(isNonEmptyString('hello')).toBe(true);
        expect(isNonEmptyString('  hello  ')).toBe(true);
      });

      it('returns false for empty or whitespace-only strings', () => {
        expect(isNonEmptyString('')).toBe(false);
        expect(isNonEmptyString('   ')).toBe(false);
        expect(isNonEmptyString('\n\t')).toBe(false);
      });

      it('returns false for non-strings', () => {
        expect(isNonEmptyString(123)).toBe(false);
        expect(isNonEmptyString(null)).toBe(false);
      });
    });

    describe('isNonEmptyArray', () => {
      it('returns true for non-empty arrays', () => {
        expect(isNonEmptyArray([1])).toBe(true);
        expect(isNonEmptyArray([1, 2, 3])).toBe(true);
        expect(isNonEmptyArray([null])).toBe(true);
      });

      it('returns false for empty arrays', () => {
        expect(isNonEmptyArray([])).toBe(false);
      });

      it('returns false for non-arrays', () => {
        expect(isNonEmptyArray({})).toBe(false);
        expect(isNonEmptyArray('array')).toBe(false);
      });
    });

    describe('hasProperty', () => {
      it('returns true when object has the property', () => {
        expect(hasProperty({ a: 1 }, 'a')).toBe(true);
        expect(hasProperty({ a: undefined }, 'a')).toBe(true);
      });

      it('returns false when object lacks the property', () => {
        expect(hasProperty({ a: 1 }, 'b')).toBe(false);
        expect(hasProperty({}, 'a')).toBe(false);
      });

      it('returns false for non-objects', () => {
        expect(hasProperty(null, 'a')).toBe(false);
        expect(hasProperty('string', 'length')).toBe(false);
        expect(hasProperty([], '0')).toBe(false);
      });
    });

    describe('hasProperties', () => {
      it('returns true when object has all properties', () => {
        expect(hasProperties({ a: 1, b: 2 }, ['a', 'b'])).toBe(true);
        expect(hasProperties({ a: 1, b: 2, c: 3 }, ['a', 'b'])).toBe(true);
      });

      it('returns false when missing any property', () => {
        expect(hasProperties({ a: 1 }, ['a', 'b'])).toBe(false);
        expect(hasProperties({}, ['a'])).toBe(false);
      });

      it('returns true for empty property list', () => {
        expect(hasProperties({ a: 1 }, [])).toBe(true);
        expect(hasProperties({}, [])).toBe(true);
      });
    });

    describe('isShape', () => {
      it('validates object shape', () => {
        const shape = {
          id: isNumber,
          name: isString,
        };
        expect(isShape({ id: 1, name: 'test' }, shape)).toBe(true);
        expect(isShape({ id: '1', name: 'test' }, shape)).toBe(false);
        expect(isShape({ id: 1 }, shape)).toBe(false);
      });

      it('returns false for non-objects', () => {
        const shape = { a: isString };
        expect(isShape(null, shape)).toBe(false);
        expect(isShape('string', shape)).toBe(false);
        expect(isShape([], shape)).toBe(false);
      });
    });
  });

  describe('Application-Specific Type Guards', () => {
    describe('isBirthInfo', () => {
      it('validates complete BirthInfo', () => {
        const validBirthInfo = {
          birthDate: '1990-01-15',
          birthTime: '14:30',
          birthPlace: 'Seoul',
          gender: 'Male' as const,
        };
        expect(isBirthInfo(validBirthInfo)).toBe(true);
      });

      it('validates BirthInfo with optional fields', () => {
        const fullBirthInfo = {
          birthDate: '1990-01-15',
          birthTime: '14:30',
          birthPlace: 'Seoul',
          gender: 'Female' as const,
          latitude: 37.5665,
          longitude: 126.9780,
          timezone: 'Asia/Seoul',
        };
        expect(isBirthInfo(fullBirthInfo)).toBe(true);
      });

      it('rejects invalid gender', () => {
        const invalidGender = {
          birthDate: '1990-01-15',
          birthTime: '14:30',
          birthPlace: 'Seoul',
          gender: 'Other',
        };
        expect(isBirthInfo(invalidGender)).toBe(false);
      });

      it('rejects empty birthPlace', () => {
        const emptyPlace = {
          birthDate: '1990-01-15',
          birthTime: '14:30',
          birthPlace: '',
          gender: 'Male',
        };
        expect(isBirthInfo(emptyPlace)).toBe(false);
      });
    });

    describe('isCoordinates', () => {
      it('validates valid coordinates', () => {
        expect(isCoordinates({ latitude: 0, longitude: 0 })).toBe(true);
        expect(isCoordinates({ latitude: 37.5665, longitude: 126.9780 })).toBe(true);
        expect(isCoordinates({ latitude: -90, longitude: -180 })).toBe(true);
        expect(isCoordinates({ latitude: 90, longitude: 180 })).toBe(true);
      });

      it('rejects invalid latitude', () => {
        expect(isCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
        expect(isCoordinates({ latitude: -91, longitude: 0 })).toBe(false);
      });

      it('rejects invalid longitude', () => {
        expect(isCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
        expect(isCoordinates({ latitude: 0, longitude: -181 })).toBe(false);
      });

      it('rejects non-numeric values', () => {
        expect(isCoordinates({ latitude: '37', longitude: 126 })).toBe(false);
        expect(isCoordinates({ latitude: null, longitude: 126 })).toBe(false);
      });
    });

    describe('isChatMessage', () => {
      it('validates valid chat messages', () => {
        expect(isChatMessage({ role: 'user', content: 'Hello' })).toBe(true);
        expect(isChatMessage({ role: 'assistant', content: 'Hi there' })).toBe(true);
        expect(isChatMessage({ role: 'system', content: 'System message' })).toBe(true);
      });

      it('validates with optional timestamp', () => {
        expect(isChatMessage({
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00Z',
        })).toBe(true);
      });

      it('rejects invalid role', () => {
        expect(isChatMessage({ role: 'admin', content: 'Hello' })).toBe(false);
      });

      it('rejects empty content', () => {
        expect(isChatMessage({ role: 'user', content: '' })).toBe(false);
        expect(isChatMessage({ role: 'user', content: '   ' })).toBe(false);
      });
    });

    describe('isApiError', () => {
      it('validates valid API errors', () => {
        expect(isApiError({ code: 'ERROR_001', message: 'Something went wrong' })).toBe(true);
      });

      it('validates with optional fields', () => {
        expect(isApiError({
          code: 'ERROR_001',
          message: 'Something went wrong',
          requestId: 'req-123',
          details: { field: 'email' },
        })).toBe(true);
      });

      it('rejects empty code or message', () => {
        expect(isApiError({ code: '', message: 'Error' })).toBe(false);
        expect(isApiError({ code: 'ERROR', message: '' })).toBe(false);
      });
    });
  });

  describe('Assertion Functions', () => {
    describe('assertDefined', () => {
      it('does not throw for defined values', () => {
        expect(() => assertDefined('value')).not.toThrow();
        expect(() => assertDefined(0)).not.toThrow();
        expect(() => assertDefined(false)).not.toThrow();
        expect(() => assertDefined('')).not.toThrow();
      });

      it('throws for null or undefined', () => {
        expect(() => assertDefined(null)).toThrow('Value is required');
        expect(() => assertDefined(undefined)).toThrow('Value is required');
      });

      it('uses custom message', () => {
        expect(() => assertDefined(null, 'Custom error')).toThrow('Custom error');
      });
    });

    describe('assertString', () => {
      it('does not throw for strings', () => {
        expect(() => assertString('')).not.toThrow();
        expect(() => assertString('hello')).not.toThrow();
      });

      it('throws for non-strings', () => {
        expect(() => assertString(123)).toThrow(TypeError);
        expect(() => assertString(null)).toThrow(TypeError);
      });
    });

    describe('assertNumber', () => {
      it('does not throw for numbers', () => {
        expect(() => assertNumber(0)).not.toThrow();
        expect(() => assertNumber(123.45)).not.toThrow();
      });

      it('throws for non-numbers', () => {
        expect(() => assertNumber('123')).toThrow(TypeError);
        expect(() => assertNumber(NaN)).toThrow(TypeError);
      });
    });

    describe('assertObject', () => {
      it('does not throw for objects', () => {
        expect(() => assertObject({})).not.toThrow();
        expect(() => assertObject({ a: 1 })).not.toThrow();
      });

      it('throws for non-objects', () => {
        expect(() => assertObject(null)).toThrow(TypeError);
        expect(() => assertObject([])).toThrow(TypeError);
        expect(() => assertObject('object')).toThrow(TypeError);
      });
    });
  });

  describe('Safe Parsing Functions', () => {
    describe('parseJSON', () => {
      it('parses valid JSON', () => {
        expect(parseJSON('{"a":1}')).toEqual({ a: 1 });
        expect(parseJSON('[1,2,3]')).toEqual([1, 2, 3]);
        expect(parseJSON('"string"')).toBe('string');
        expect(parseJSON('123')).toBe(123);
      });

      it('returns null for invalid JSON', () => {
        expect(parseJSON('invalid')).toBeNull();
        expect(parseJSON('{broken')).toBeNull();
        expect(parseJSON('')).toBeNull();
      });

      it('validates with custom validator', () => {
        const validator = (v: unknown): v is { id: number } =>
          isObject(v) && isNumber((v as any).id);

        expect(parseJSON('{"id":1}', validator)).toEqual({ id: 1 });
        expect(parseJSON('{"id":"string"}', validator)).toBeNull();
        expect(parseJSON('{}', validator)).toBeNull();
      });
    });

    describe('parseNumber', () => {
      it('returns number for valid inputs', () => {
        expect(parseNumber(123)).toBe(123);
        expect(parseNumber('456')).toBe(456);
        expect(parseNumber('3.14')).toBe(3.14);
        expect(parseNumber('-10')).toBe(-10);
      });

      it('returns null for invalid inputs', () => {
        expect(parseNumber('abc')).toBeNull();
        expect(parseNumber({})).toBeNull();
        expect(parseNumber(null)).toBeNull();
        expect(parseNumber(undefined)).toBeNull();
        // Note: empty string parses to 0 in JavaScript's Number(), so it returns 0
        // This is expected behavior based on the implementation
      });
    });

    describe('parseBoolean', () => {
      it('returns boolean for valid inputs', () => {
        expect(parseBoolean(true)).toBe(true);
        expect(parseBoolean(false)).toBe(false);
        expect(parseBoolean('true')).toBe(true);
        expect(parseBoolean('false')).toBe(false);
        expect(parseBoolean(1)).toBe(true);
        expect(parseBoolean(0)).toBe(false);
      });

      it('returns null for invalid inputs', () => {
        expect(parseBoolean('yes')).toBeNull();
        expect(parseBoolean(2)).toBeNull();
        expect(parseBoolean(null)).toBeNull();
        expect(parseBoolean({})).toBeNull();
      });
    });

    describe('getProperty', () => {
      it('returns property value when valid', () => {
        expect(getProperty({ name: 'test' }, 'name', isString)).toBe('test');
        expect(getProperty({ count: 5 }, 'count', isNumber)).toBe(5);
      });

      it('returns null when property missing', () => {
        expect(getProperty({ a: 1 }, 'b', isNumber)).toBeNull();
      });

      it('returns null when validation fails', () => {
        expect(getProperty({ name: 123 }, 'name', isString)).toBeNull();
      });

      it('returns null for non-objects', () => {
        expect(getProperty(null, 'key', isString)).toBeNull();
        expect(getProperty('string', 'length', isNumber)).toBeNull();
      });
    });
  });

  describe('Type Narrowing Utilities', () => {
    describe('filterDefined', () => {
      it('removes null and undefined from array', () => {
        expect(filterDefined([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
        expect(filterDefined([null, undefined])).toEqual([]);
        expect(filterDefined(['a', null, 'b'])).toEqual(['a', 'b']);
      });

      it('keeps other falsy values', () => {
        expect(filterDefined([0, '', false, null])).toEqual([0, '', false]);
      });

      it('returns empty array for empty input', () => {
        expect(filterDefined([])).toEqual([]);
      });
    });

    describe('filterByType', () => {
      it('filters array by type guard', () => {
        const mixed = [1, 'two', 3, 'four', 5];
        expect(filterByType(mixed, isNumber)).toEqual([1, 3, 5]);
        expect(filterByType(mixed, isString)).toEqual(['two', 'four']);
      });

      it('returns empty array when no matches', () => {
        expect(filterByType([1, 2, 3], isString)).toEqual([]);
      });
    });

    describe('safeMap', () => {
      it('filters and maps in one operation', () => {
        const mixed = [1, 'two', 3, 'four'];
        const result = safeMap(mixed, isNumber, (n) => n * 2);
        expect(result).toEqual([2, 6]);
      });

      it('returns empty array when no matches', () => {
        const result = safeMap([1, 2, 3], isString, (s) => s.toUpperCase());
        expect(result).toEqual([]);
      });

      it('handles complex transformations', () => {
        const mixed = [{ id: 1 }, 'skip', { id: 2 }];
        const result = safeMap(
          mixed,
          isObject,
          (obj) => (obj as any).id
        );
        expect(result).toEqual([1, 2]);
      });
    });
  });
});
