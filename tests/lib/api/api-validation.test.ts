import { describe, it, expect } from 'vitest';

describe('API Validation Module', () => {
  it('should export validateFields function', async () => {
    const { validateFields } = await import('@/lib/api');
    expect(typeof validateFields).toBe('function');
  });

  it('should export validateDestinyMapInput function', async () => {
    const { validateDestinyMapInput } = await import('@/lib/api');
    expect(typeof validateDestinyMapInput).toBe('function');
  });

  it('should export validateTarotInput function', async () => {
    const { validateTarotInput } = await import('@/lib/api');
    expect(typeof validateTarotInput).toBe('function');
  });

  it('should export validateDreamInput function', async () => {
    const { validateDreamInput } = await import('@/lib/api');
    expect(typeof validateDreamInput).toBe('function');
  });

  it('should export parseJsonBody function', async () => {
    const { parseJsonBody } = await import('@/lib/api');
    expect(typeof parseJsonBody).toBe('function');
  });

  it('should export Patterns object', async () => {
    const { Patterns } = await import('@/lib/api');
    expect(Patterns).toBeDefined();
    expect(Patterns.EMAIL).toBeInstanceOf(RegExp);
    expect(Patterns.DATE).toBeInstanceOf(RegExp);
    expect(Patterns.TIME).toBeInstanceOf(RegExp);
    expect(Patterns.UUID).toBeInstanceOf(RegExp);
  });

  it('should export CommonValidators object', async () => {
    const { CommonValidators } = await import('@/lib/api');
    expect(CommonValidators).toBeDefined();
    expect(CommonValidators.birthDate).toBeDefined();
    expect(CommonValidators.latitude).toBeDefined();
    expect(CommonValidators.longitude).toBeDefined();
  });
});

describe('validateFields', () => {
  it('should validate required fields', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ name: '' }, { name: { required: true } });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('name is required');
  });

  it('should pass valid required fields', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ name: 'John' }, { name: { required: true } });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should validate type string', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ name: 123 }, { name: { type: 'string' } });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('must be a string'))).toBe(true);
  });

  it('should validate type number', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ age: 'not a number' }, { age: { type: 'number' } });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('must be a number'))).toBe(true);
  });

  it('should validate number min/max', async () => {
    const { validateFields } = await import('@/lib/api');
    const resultMin = validateFields({ age: 5 }, { age: { type: 'number', min: 10 } });
    expect(resultMin.valid).toBe(false);
    expect(resultMin.errors.some(e => e.includes('at least 10'))).toBe(true);

    const resultMax = validateFields({ age: 150 }, { age: { type: 'number', max: 100 } });
    expect(resultMax.valid).toBe(false);
    expect(resultMax.errors.some(e => e.includes('at most 100'))).toBe(true);
  });

  it('should validate string length', async () => {
    const { validateFields } = await import('@/lib/api');
    const resultMin = validateFields({ name: 'ab' }, { name: { type: 'string', minLength: 3 } });
    expect(resultMin.valid).toBe(false);

    const resultMax = validateFields({ name: 'abcdefghij' }, { name: { type: 'string', maxLength: 5 } });
    expect(resultMax.valid).toBe(false);
  });

  it('should validate pattern', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ email: 'invalid' }, {
      email: { type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('invalid format'))).toBe(true);
  });

  it('should validate enum values', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ status: 'unknown' }, {
      status: { enum: ['active', 'inactive', 'pending'] },
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('must be one of'))).toBe(true);
  });

  it('should support custom validation', async () => {
    const { validateFields } = await import('@/lib/api');
    const result = validateFields({ value: 5 }, {
      value: { custom: (v) => (v as number) < 10 ? 'Value must be at least 10' : null },
    });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Value must be at least 10');
  });
});

describe('Patterns', () => {
  it('should match valid emails', async () => {
    const { Patterns } = await import('@/lib/api');
    expect(Patterns.EMAIL.test('test@example.com')).toBe(true);
    expect(Patterns.EMAIL.test('invalid')).toBe(false);
  });

  it('should match valid dates', async () => {
    const { Patterns } = await import('@/lib/api');
    expect(Patterns.DATE.test('2024-01-15')).toBe(true);
    expect(Patterns.DATE.test('2024/01/15')).toBe(false);
  });

  it('should match valid times', async () => {
    const { Patterns } = await import('@/lib/api');
    expect(Patterns.TIME.test('12:30')).toBe(true);
    expect(Patterns.TIME.test('12:30:45')).toBe(true);
  });

  it('should match valid UUIDs', async () => {
    const { Patterns } = await import('@/lib/api');
    expect(Patterns.UUID.test('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(Patterns.UUID.test('not-a-uuid')).toBe(false);
  });
});

describe('validateDestinyMapInput', () => {
  it('should validate valid destiny map input', async () => {
    const { validateDestinyMapInput } = await import('@/lib/api');
    const result = validateDestinyMapInput({
      birthDate: '1990-01-15',
      birthTime: '12:30',
      latitude: 37.5665,
      longitude: 126.978,
    });
    expect(result.valid).toBe(true);
  });

  it('should reject invalid birth date', async () => {
    const { validateDestinyMapInput } = await import('@/lib/api');
    const result = validateDestinyMapInput({
      birthDate: 'invalid',
      birthTime: '12:30',
      latitude: 37.5665,
      longitude: 126.978,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateTarotInput', () => {
  it('should validate valid tarot input', async () => {
    const { validateTarotInput } = await import('@/lib/api');
    const result = validateTarotInput({
      category: 'love',
      spreadId: 'three-card',
      cards: ['fool', 'magician', 'high-priestess'],
    });
    expect(result.valid).toBe(true);
  });
});

describe('validateDreamInput', () => {
  it('should validate valid dream input', async () => {
    const { validateDreamInput } = await import('@/lib/api');
    const result = validateDreamInput({
      dream: 'I had a dream about flying over mountains and seeing beautiful landscapes below.',
    });
    expect(result.valid).toBe(true);
  });

  it('should reject short dream text', async () => {
    const { validateDreamInput } = await import('@/lib/api');
    const result = validateDreamInput({ dream: 'short' });
    expect(result.valid).toBe(false);
  });
});
