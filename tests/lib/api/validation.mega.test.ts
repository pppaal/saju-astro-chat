/**
 * API Validation MEGA Test Suite
 * Comprehensive testing for all validation functions
 */
import { describe, it, expect } from 'vitest';
import {
  validateFields,
  Patterns,
  CommonValidators,
  validateDestinyMapInput,
  validateTarotInput,
  validateDreamInput,
  validateBirthData,
  validateCompatibilityInput,
  parseJsonBody,
  type ValidationResult,
  type FieldRule,
} from '@/lib/api/validation';

// Test data constants
const TEST_DATA = {
  VALID: {
    STRING: 'test',
    NUMBER: 25,
    BOOLEAN: true,
    ARRAY: [1, 2, 3],
    OBJECT: { key: 'value' },
  },
  INVALID: {
    EMPTY_STRING: '',
    NULL: null,
    UNDEFINED: undefined,
  },
} as const;

// Helper function for cleaner test assertions
const expectValid = (result: ValidationResult) => {
  expect(result.valid).toBe(true);
};

const expectInvalid = (result: ValidationResult, errorContains?: string) => {
  expect(result.valid).toBe(false);
  if (errorContains) {
    expect(result.errors[0]).toContain(errorContains);
  }
};

describe('validation MEGA - validateFields', () => {
  describe('Required field validation', () => {
    it('should pass when required field is present', () => {
      const result = validateFields(
        { name: TEST_DATA.VALID.STRING },
        { name: { required: true } }
      );
      expectValid(result);
    });

    it.each([
      ['missing', {}, 'name is required'],
      ['null', { name: TEST_DATA.INVALID.NULL }, undefined],
      ['undefined', { name: TEST_DATA.INVALID.UNDEFINED }, undefined],
      ['empty string', { name: TEST_DATA.INVALID.EMPTY_STRING }, undefined],
    ])('should fail when required field is %s', (_, data, errorMsg) => {
      const result = validateFields(data, { name: { required: true } });
      expectInvalid(result, errorMsg);
    });

    it('should pass when optional field is missing', () => {
      const result = validateFields(
        {},
        { name: { required: false } }
      );
      expectValid(result);
    });
  });

  describe('Type validation', () => {
    it.each([
      ['string', 'name', TEST_DATA.VALID.STRING, 'string'],
      ['number', 'age', TEST_DATA.VALID.NUMBER, 'number'],
      ['boolean', 'active', TEST_DATA.VALID.BOOLEAN, 'boolean'],
      ['array', 'items', TEST_DATA.VALID.ARRAY, 'array'],
      ['object', 'data', TEST_DATA.VALID.OBJECT, 'object'],
    ])('should validate %s type', (_, fieldName, value, type) => {
      const result = validateFields(
        { [fieldName]: value },
        { [fieldName]: { type: type as any } }
      );
      expectValid(result);
    });

    it.each([
      ['string', 'name', 123, 'must be a string'],
      ['number', 'age', '25', 'must be a number'],
      ['boolean', 'active', 1, 'must be a boolean'],
      ['array', 'items', 'not array', 'must be a array'],
      ['object', 'data', 'not object', 'must be a object'],
    ])('should fail for wrong %s type', (_, fieldName, value, errorMsg) => {
      const result = validateFields(
        { [fieldName]: value },
        { [fieldName]: { type: _ as any } }
      );
      expectInvalid(result, errorMsg);
    });
  });

  describe('Number range validation', () => {
    it.each([
      ['in range', 'age', 25, 0, 100],
      ['equals min', 'age', 0, 0, undefined],
      ['equals max', 'age', 100, undefined, 100],
      ['negative range', 'temp', -5, -10, 0],
      ['decimal', 'price', 9.99, 0, 100],
    ])('should pass when number is %s', (_, field, value, min, max) => {
      const result = validateFields(
        { [field]: value },
        { [field]: { type: 'number', ...(min !== undefined && { min }), ...(max !== undefined && { max }) } }
      );
      expectValid(result);
    });

    it.each([
      ['below min', 'age', -5, 0, undefined, 'must be at least 0'],
      ['above max', 'age', 150, undefined, 100, 'must be at most 100'],
    ])('should fail when number is %s', (_, field, value, min, max, errorMsg) => {
      const result = validateFields(
        { [field]: value },
        { [field]: { type: 'number', ...(min !== undefined && { min }), ...(max !== undefined && { max }) } }
      );
      expectInvalid(result, errorMsg);
    });
  });

  describe('String length validation', () => {
    it.each([
      ['in range', 'hello', { minLength: 1, maxLength: 10 }, true],
      ['equals min', 'abc', { minLength: 3 }, true],
      ['equals max', 'abc', { maxLength: 3 }, true],
      ['too short', 'hi', { minLength: 3 }, false],
      ['too long', 'verylongname', { maxLength: 5 }, false],
      ['empty with minLength', '', { minLength: 1 }, false],
    ])('should handle string %s', (_, value, constraints, expected) => {
      const result = validateFields(
        { name: value },
        { name: { type: 'string', ...constraints } }
      );
      expect(result.valid).toBe(expected);
    });
  });

  describe('Pattern validation', () => {
    const EMAIL_PATTERN = /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/;
    const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

    it.each([
      ['valid email', 'email', 'test@example.com', EMAIL_PATTERN, true],
      ['invalid email', 'email', 'invalid-email', EMAIL_PATTERN, false],
      ['valid date', 'date', '2024-01-15', DATE_PATTERN, true],
      ['invalid date', 'date', '15/01/2024', DATE_PATTERN, false],
    ])('should handle %s', (_, field, value, pattern, expected) => {
      const result = validateFields(
        { [field]: value },
        { [field]: { type: 'string', pattern } }
      );
      expect(result.valid).toBe(expected);
    });
  });

  describe('Array length validation', () => {
    it.each([
      ['in range', [1, 2, 3], { min: 1, max: 10 }, true],
      ['equals min', [1], { min: 1 }, true],
      ['equals max', [1, 2, 3], { max: 3 }, true],
      ['too short', [], { min: 1 }, false],
      ['too long', [1, 2, 3, 4, 5, 6], { max: 5 }, false],
    ])('should handle array %s', (_, value, constraints, expected) => {
      const result = validateFields(
        { items: value },
        { items: { type: 'array', ...constraints } }
      );
      expect(result.valid).toBe(expected);
    });
  });

  describe('Enum validation', () => {
    const STRING_ENUM = ['active', 'inactive', 'pending'];
    const NUMBER_ENUM = [1, 2, 3];

    it.each([
      ['valid string', 'status', 'active', STRING_ENUM, true],
      ['invalid string', 'status', 'deleted', STRING_ENUM, false],
      ['valid number', 'priority', 1, NUMBER_ENUM, true],
      ['case sensitive', 'status', 'Active', ['active', 'inactive'], false],
    ])('should handle %s', (_, field, value, enumValues, expected) => {
      const result = validateFields(
        { [field]: value },
        { [field]: { enum: enumValues } }
      );
      expect(result.valid).toBe(expected);
    });
  });

  describe('Custom validation', () => {
    it('should pass when custom validation returns null', () => {
      const result = validateFields(
        { age: 25 },
        { age: { custom: (value) => value === 25 ? null : 'must be 25' } }
      );
      expect(result.valid).toBe(true);
    });

    it('should fail when custom validation returns error', () => {
      const result = validateFields(
        { age: 30 },
        { age: { custom: (value) => value === 25 ? null : 'must be 25' } }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toBe('must be 25');
    });

    it('should allow complex custom logic', () => {
      const result = validateFields(
        { password: 'Test123!' },
        {
          password: {
            custom: (value) => {
              if (typeof value !== 'string') return 'must be string';
              if (!/[A-Z]/.test(value)) return 'must contain uppercase';
              if (!/[0-9]/.test(value)) return 'must contain number';
              return null;
            }
          }
        }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Multiple field validation', () => {
    it('should validate multiple fields', () => {
      const result = validateFields(
        { name: 'John', age: 25 },
        {
          name: { required: true, type: 'string' },
          age: { required: true, type: 'number' }
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should collect all errors', () => {
      const result = validateFields(
        { name: '', age: 'invalid' },
        {
          name: { required: true },
          age: { required: true, type: 'number' }
        }
      );
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should skip validation for undefined optional fields', () => {
      const result = validateFields(
        { name: 'John' },
        {
          name: { required: true },
          age: { type: 'number' }
        }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('Combined validations', () => {
    it('should apply all validations in order', () => {
      const result = validateFields(
        { email: 'test@example.com' },
        {
          email: {
            required: true,
            type: 'string',
            minLength: 5,
            maxLength: 100,
            pattern: /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/
          }
        }
      );
      expect(result.valid).toBe(true);
    });

    it('should stop at first type error', () => {
      const result = validateFields(
        { email: 123 },
        {
          email: {
            type: 'string',
            minLength: 5,
            pattern: /^.+@.+$/
          }
        }
      );
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('must be a string');
    });
  });
});

describe('validation MEGA - Patterns', () => {
  describe('EMAIL pattern', () => {
    it.each([
      ['test@example.com', true],
      ['user.name@domain.com', true],
      ['user+tag@domain.co.uk', true],
      ['test123@test-domain.org', true],
      ['invalid', false],
      ['@example.com', false],
      ['test@', false],
      ['test @example.com', false],
      ['test@example', false],
    ])('should test email: %s', (email, expected) => {
      expect(Patterns.EMAIL.test(email)).toBe(expected);
    });
  });

  describe('DATE pattern', () => {
    it.each([
      ['2024-01-01', true],
      ['2024-12-31', true],
      ['1900-01-01', true],
      ['2100-12-31', true],
      ['2024-1-1', false],
      ['24-01-01', false],
      ['2024/01/01', false],
      ['01-01-2024', false],
    ])('should test date: %s', (date, expected) => {
      expect(Patterns.DATE.test(date)).toBe(expected);
    });
  });

  describe('TIME pattern', () => {
    it.each([
      ['14:30', true],
      ['00:00', true],
      ['23:59', true],
      ['14:30:00', true],
      ['00:00:00', true],
      ['23:59:59', true],
      ['1:30', false],
      ['14:5', false],
    ])('should test time: %s', (time, expected) => {
      expect(Patterns.TIME.test(time)).toBe(expected);
    });
  });

  describe('TIMEZONE pattern', () => {
    it.each([
      ['America/New_York', true],
      ['Europe/London', true],
      ['Asia/Seoul', true],
      ['UTC', true],
      ['GMT+9', false],
      ['UTC+09:00', false],
      ['Asia Seoul', false],
      ['America New York', false],
    ])('should test timezone: %s', (tz, expected) => {
      expect(Patterns.TIMEZONE.test(tz)).toBe(expected);
    });
  });

  describe('UUID pattern', () => {
    it.each([
      ['123e4567-e89b-12d3-a456-426614174000', true],
      ['a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', true],
      ['ABCDEF01-2345-6789-ABCD-EF0123456789', true],
      ['123', false],
      ['123e4567-e89b-12d3-a456', false],
      ['not-a-uuid', false],
    ])('should test UUID: %s', (uuid, expected) => {
      expect(Patterns.UUID.test(uuid)).toBe(expected);
    });
  });

  describe('SAFE_TEXT pattern', () => {
    it.each([
      ['Hello World', true],
      ['Test 123', true],
      ['안녕하세요', true],
      ['Test@Email.com', true],
      ['<script>alert(1)</script>', false],
      ['Hello {world}', false],
      ['Test < value', false],
      ['Test > value', false],
    ])('should test safe text: "%s"', (text, expected) => {
      expect(Patterns.SAFE_TEXT.test(text)).toBe(expected);
    });
  });
});

describe('validation MEGA - CommonValidators', () => {
  it.each([
    ['birthDate', { required: true }],
    ['birthTime', { required: true }],
    ['latitude', { min: -90, max: 90 }],
    ['longitude', { min: -180, max: 180 }],
    ['timezone', {}],
    ['language', { enum: ['en', 'ko'] }],
    ['dreamText', { minLength: 10, maxLength: 10000 }],
    ['tarotCards', { min: 1, max: 10 }],
  ])('should have %s validator with correct properties', (validatorName, props) => {
    const validator = CommonValidators[validatorName as keyof typeof CommonValidators];
    expect(validator).toBeDefined();

    if ('required' in props) {
      expect(validator.required).toBe(props.required);
    }
    if ('min' in props) {
      expect(validator.min).toBe(props.min);
    }
    if ('max' in props) {
      expect(validator.max).toBe(props.max);
    }
    if ('minLength' in props) {
      expect(validator.minLength).toBe(props.minLength);
    }
    if ('maxLength' in props) {
      expect(validator.maxLength).toBe(props.maxLength);
    }
    if ('enum' in props) {
      props.enum.forEach((val: string) => {
        expect(validator.enum).toContain(val);
      });
    }
  });
});

describe('validation MEGA - validateDestinyMapInput', () => {
  it('should pass with valid data', () => {
    const result = validateDestinyMapInput({
      birthDate: '1990-01-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.9780,
      theme: 'life',
      lang: 'ko',
    });
    expect(result.valid).toBe(true);
  });

  it('should fail with missing birthDate', () => {
    const result = validateDestinyMapInput({
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.9780,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('birthDate'))).toBe(true);
  });

  it('should fail with invalid theme', () => {
    const result = validateDestinyMapInput({
      birthDate: '1990-01-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.9780,
      theme: 'invalid',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validation MEGA - validateTarotInput', () => {
  it('should pass with valid data', () => {
    const result = validateTarotInput({
      category: 'love',
      spreadId: 'three-card',
      cards: [1, 2, 3],
      language: 'en',
    });
    expect(result.valid).toBe(true);
  });

  it('should fail with missing category', () => {
    const result = validateTarotInput({
      spreadId: 'three-card',
      cards: [1, 2, 3],
    });
    expect(result.valid).toBe(false);
  });

  it('should fail with too many cards', () => {
    const result = validateTarotInput({
      category: 'love',
      spreadId: 'three-card',
      cards: Array.from({ length: 15 }, (_, i) => i),
    });
    expect(result.valid).toBe(false);
  });
});

describe('validation MEGA - validateDreamInput', () => {
  it('should pass with valid data', () => {
    const result = validateDreamInput({
      dream: 'I dreamed about flying in the sky',
      locale: 'en',
    });
    expect(result.valid).toBe(true);
  });

  it('should fail with short dream', () => {
    const result = validateDreamInput({
      dream: 'short',
      locale: 'en',
    });
    expect(result.valid).toBe(false);
  });

  it('should fail with XSS attempt', () => {
    const result = validateDreamInput({
      dream: 'I dreamed about <script>alert(1)</script> something',
      locale: 'en',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validation MEGA - validateBirthData', () => {
  it('should pass with complete data', () => {
    const result = validateBirthData({
      birthDate: '1990-01-15',
      birthTime: '14:30:00',
      latitude: 37.5665,
      longitude: 126.9780,
      timezone: 'Asia/Seoul',
      language: 'ko',
    });
    expect(result.valid).toBe(true);
  });

  it('should fail with invalid latitude', () => {
    const result = validateBirthData({
      birthDate: '1990-01-15',
      birthTime: '14:30',
      latitude: 100,
      longitude: 126.9780,
    });
    expect(result.valid).toBe(false);
  });

  it('should fail with invalid longitude', () => {
    const result = validateBirthData({
      birthDate: '1990-01-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 200,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validation MEGA - validateCompatibilityInput', () => {
  it('should pass with two valid persons', () => {
    const result = validateCompatibilityInput({
      person1: {
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
      },
      person2: {
        birthDate: '1992-05-20',
        birthTime: '10:00',
        latitude: 37.5665,
        longitude: 126.9780,
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should fail with missing person1', () => {
    const result = validateCompatibilityInput({
      person2: {
        birthDate: '1992-05-20',
        birthTime: '10:00',
        latitude: 37.5665,
        longitude: 126.9780,
      },
    });
    expect(result.valid).toBe(false);
  });

  it('should prefix person1 errors', () => {
    const result = validateCompatibilityInput({
      person1: {
        birthDate: 'invalid',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.9780,
      },
      person2: {
        birthDate: '1992-05-20',
        birthTime: '10:00',
        latitude: 37.5665,
        longitude: 126.9780,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('person1.'))).toBe(true);
  });
});

describe('validation MEGA - parseJsonBody', () => {
  it('should parse valid JSON', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify({ name: 'test' }),
    });
    const result = await parseJsonBody(request);
    expect(result.data).toEqual({ name: 'test' });
    expect(result.error).toBeNull();
  });

  it('should return error for invalid JSON', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: 'invalid json',
    });
    const result = await parseJsonBody(request);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Invalid JSON');
  });

  it('should return error for too large body', async () => {
    const largeBody = 'a'.repeat(1_000_001);
    const request = new Request('http://localhost', {
      method: 'POST',
      body: largeBody,
    });
    const result = await parseJsonBody(request);
    expect(result.data).toBeNull();
    expect(result.error).toBe('Request body too large');
  });

  it('should handle empty body', async () => {
    const request = new Request('http://localhost', {
      method: 'POST',
      body: '',
    });
    const result = await parseJsonBody(request);
    expect(result.error).toBe('Invalid JSON');
  });

  it('should handle complex nested objects', async () => {
    const data = {
      person: {
        name: 'John',
        age: 30,
        address: {
          city: 'Seoul',
          country: 'Korea',
        },
      },
    };
    const request = new Request('http://localhost', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const result = await parseJsonBody(request);
    expect(result.data).toEqual(data);
  });
});
