// tests/lib/api/validation.test.ts
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
} from '@/lib/api/validation';

describe('validateFields', () => {
  it('should pass when required field is present', () => {
    const data = { name: 'John' };
    const rules = { name: { required: true } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('should fail when required field is missing', () => {
    const data = {};
    const rules = { name: { required: true } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name is required');
  });

  it('should validate string type', () => {
    const data = { name: 'John' };
    const rules = { name: { type: 'string' as const } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should fail for wrong type', () => {
    const data = { name: 123 };
    const rules = { name: { type: 'string' as const } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name must be a string');
  });

  it('should validate number range', () => {
    const data = { age: 25 };
    const rules = { age: { min: 18, max: 100 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should fail when number is below min', () => {
    const data = { age: 10 };
    const rules = { age: { min: 18 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
  });

  it('should validate string length', () => {
    const data = { name: 'John' };
    const rules = { name: { minLength: 3, maxLength: 10 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should fail when string is too short', () => {
    const data = { name: 'Jo' };
    const rules = { name: { minLength: 3 } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(false);
  });

  it('should validate pattern', () => {
    const data = { email: 'test@example.com' };
    const rules = { email: { pattern: /^[^@]+@[^@]+\.[^@]+$/ } };
    const result = validateFields(data, rules);
    
    expect(result.valid).toBe(true);
  });

  it('should collect multiple errors', () => {
    const data = { name: '', age: 10 };
    const rules = {
      name: { required: true },
      age: { required: true, min: 18 }
    };
    const result = validateFields(data, rules);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(1);
  });

  it('should validate array type', () => {
    const data = { items: [1, 2, 3] };
    const rules = { items: { type: 'array' as const } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(true);
  });

  it('should validate array min length', () => {
    const data = { items: [1] };
    const rules = { items: { type: 'array' as const, min: 3 } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('items must have at least 3 items');
  });

  it('should validate array max length', () => {
    const data = { items: [1, 2, 3, 4, 5, 6] };
    const rules = { items: { type: 'array' as const, max: 5 } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('items must have at most 5 items');
  });

  it('should validate enum values', () => {
    const data = { status: 'active' };
    const rules = { status: { enum: ['active', 'inactive'] } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(true);
  });

  it('should fail for invalid enum value', () => {
    const data = { status: 'unknown' };
    const rules = { status: { enum: ['active', 'inactive'] } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('status must be one of: active, inactive');
  });

  it('should run custom validators', () => {
    const data = { code: 'ABC' };
    const rules = {
      code: {
        custom: (value: unknown) => {
          if (typeof value === 'string' && !/^\d+$/.test(value)) {
            return 'code must contain only digits';
          }
          return null;
        },
      },
    };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('code must contain only digits');
  });

  it('should skip validation for undefined optional fields', () => {
    const data = { name: 'John' };
    const rules = {
      name: { required: true },
      nickname: { type: 'string' as const, minLength: 3 },
    };
    const result = validateFields(data as Record<string, unknown>, rules);
    expect(result.valid).toBe(true);
  });

  it('should validate number max', () => {
    const data = { score: 150 };
    const rules = { score: { type: 'number' as const, max: 100 } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('score must be at most 100');
  });

  it('should validate string maxLength', () => {
    const data = { username: 'verylongusernamethatexceedslimit' };
    const rules = { username: { type: 'string' as const, maxLength: 20 } };
    const result = validateFields(data, rules);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('username must be at most 20 characters');
  });
});

describe('Patterns', () => {
  it('should validate email format', () => {
    expect(Patterns.EMAIL.test('test@example.com')).toBe(true);
    expect(Patterns.EMAIL.test('invalid')).toBe(false);
    expect(Patterns.EMAIL.test('user@domain')).toBe(false);
  });

  it('should validate date format', () => {
    expect(Patterns.DATE.test('2024-01-15')).toBe(true);
    expect(Patterns.DATE.test('2024/01/15')).toBe(false);
    expect(Patterns.DATE.test('01-15-2024')).toBe(false);
  });

  it('should validate time format', () => {
    expect(Patterns.TIME.test('14:30')).toBe(true);
    expect(Patterns.TIME.test('14:30:45')).toBe(true);
    expect(Patterns.TIME.test('2:30 PM')).toBe(false);
  });

  it('should validate timezone format', () => {
    expect(Patterns.TIMEZONE.test('Asia/Seoul')).toBe(true);
    expect(Patterns.TIMEZONE.test('America/New_York')).toBe(true);
    expect(Patterns.TIMEZONE.test('Invalid Timezone!')).toBe(false);
  });

  it('should validate UUID format', () => {
    expect(Patterns.UUID.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(Patterns.UUID.test('not-a-uuid')).toBe(false);
  });

  it('should detect unsafe text', () => {
    expect(Patterns.SAFE_TEXT.test('Hello World')).toBe(true);
    expect(Patterns.SAFE_TEXT.test('<script>alert(1)</script>')).toBe(false);
    expect(Patterns.SAFE_TEXT.test('test{injection}')).toBe(false);
  });
});

describe('CommonValidators', () => {
  describe('birthDate', () => {
    it('should accept valid birth dates', () => {
      const result = validateFields(
        { birthDate: '1990-05-15' },
        { birthDate: CommonValidators.birthDate }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject birth dates before 1900', () => {
      const result = validateFields(
        { birthDate: '1850-05-15' },
        { birthDate: CommonValidators.birthDate }
      );
      expect(result.valid).toBe(false);
    });

    it('should reject birth dates after 2100', () => {
      const result = validateFields(
        { birthDate: '2150-05-15' },
        { birthDate: CommonValidators.birthDate }
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('latitude', () => {
    it('should accept valid latitude', () => {
      const result = validateFields(
        { latitude: 37.5665 },
        { latitude: CommonValidators.latitude }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject latitude below -90', () => {
      const result = validateFields(
        { latitude: -100 },
        { latitude: CommonValidators.latitude }
      );
      expect(result.valid).toBe(false);
    });

    it('should reject latitude above 90', () => {
      const result = validateFields(
        { latitude: 100 },
        { latitude: CommonValidators.latitude }
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('longitude', () => {
    it('should accept valid longitude', () => {
      const result = validateFields(
        { longitude: 126.978 },
        { longitude: CommonValidators.longitude }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject longitude outside range', () => {
      const result = validateFields(
        { longitude: 200 },
        { longitude: CommonValidators.longitude }
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('dreamText', () => {
    it('should accept valid dream text', () => {
      const result = validateFields(
        { dreamText: 'I had a dream about flying over mountains and seeing beautiful landscapes.' },
        { dreamText: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject too short dream text', () => {
      const result = validateFields(
        { dreamText: 'short' },
        { dreamText: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(false);
    });

    it('should reject script injection', () => {
      const result = validateFields(
        { dreamText: 'I had a dream <script>alert("xss")</script> about flying.' },
        { dreamText: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(false);
    });
  });
});

describe('validateDestinyMapInput', () => {
  it('should accept valid destiny map input', () => {
    const result = validateDestinyMapInput({
      birthDate: '1990-05-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
      theme: 'love',
      lang: 'ko',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid theme', () => {
    const result = validateDestinyMapInput({
      birthDate: '1990-05-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
      theme: 'invalid_theme',
      lang: 'ko',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateTarotInput', () => {
  it('should accept valid tarot input', () => {
    const result = validateTarotInput({
      category: 'love',
      spreadId: 'three-card',
      cards: [1, 2, 3],
      language: 'ko',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject missing category', () => {
    const result = validateTarotInput({
      spreadId: 'three-card',
      cards: [1, 2, 3],
    });
    expect(result.valid).toBe(false);
  });

  it('should reject too many cards', () => {
    const result = validateTarotInput({
      category: 'love',
      spreadId: 'full-spread',
      cards: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateDreamInput', () => {
  it('should accept valid dream input', () => {
    const result = validateDreamInput({
      dream: 'I dreamed about flying over the mountains and seeing beautiful scenery.',
      locale: 'ko',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject short dream text', () => {
    const result = validateDreamInput({
      dream: 'Hi',
      locale: 'ko',
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateBirthData', () => {
  it('should accept valid birth data', () => {
    const result = validateBirthData({
      birthDate: '1990-05-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: 'Asia/Seoul',
      language: 'ko',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid birth date', () => {
    const result = validateBirthData({
      birthDate: 'not-a-date',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateCompatibilityInput', () => {
  it('should accept valid compatibility input', () => {
    const result = validateCompatibilityInput({
      person1: {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
      },
      person2: {
        birthDate: '1992-08-20',
        birthTime: '10:00',
        latitude: 37.5665,
        longitude: 126.978,
      },
    });
    expect(result.valid).toBe(true);
  });

  it('should reject missing person1', () => {
    const result = validateCompatibilityInput({
      person2: {
        birthDate: '1992-08-20',
        birthTime: '10:00',
        latitude: 37.5665,
        longitude: 126.978,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('person1 is required');
  });

  it('should prefix errors with person identifier', () => {
    const result = validateCompatibilityInput({
      person1: {
        birthDate: 'invalid',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
      },
      person2: {
        birthDate: '1992-08-20',
        birthTime: '10:00',
        latitude: 37.5665,
        longitude: 126.978,
      },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.startsWith('person1.'))).toBe(true);
  });
});

describe('parseJsonBody', () => {
  it('should parse valid JSON', async () => {
    const body = JSON.stringify({ name: 'John', age: 25 });
    const request = new Request('http://test.com', {
      method: 'POST',
      body,
    });

    const result = await parseJsonBody(request);
    expect(result.error).toBeNull();
    expect(result.data).toEqual({ name: 'John', age: 25 });
  });

  it('should return error for invalid JSON', async () => {
    const request = new Request('http://test.com', {
      method: 'POST',
      body: 'not valid json',
    });

    const result = await parseJsonBody(request);
    expect(result.error).toBe('Invalid JSON');
    expect(result.data).toBeNull();
  });

  it('should reject body exceeding size limit', async () => {
    const largeBody = 'x'.repeat(1_000_001);
    const request = new Request('http://test.com', {
      method: 'POST',
      body: largeBody,
    });

    const result = await parseJsonBody(request);
    expect(result.error).toBe('Request body too large');
    expect(result.data).toBeNull();
  });
});
