import {
  validateFields,
  validateDestinyMapInput,
  validateTarotInput,
  validateDreamInput,
  validateBirthData,
  validateCompatibilityInput,
  parseJsonBody,
  Patterns,
  CommonValidators,
} from '@/lib/api/validation';

describe('API Validation - Comprehensive Tests', () => {
  describe('validateFields - Core validation', () => {
    describe('Required fields', () => {
      it('should fail when required field is missing', () => {
        const result = validateFields(
          { name: undefined },
          { name: { required: true } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('name is required');
      });

      it('should fail when required field is null', () => {
        const result = validateFields(
          { name: null },
          { name: { required: true } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('name is required');
      });

      it('should fail when required field is empty string', () => {
        const result = validateFields(
          { name: '' },
          { name: { required: true } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('name is required');
      });

      it('should pass when required field has value', () => {
        const result = validateFields(
          { name: 'John' },
          { name: { required: true } }
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toEqual([]);
      });
    });

    describe('Type validation', () => {
      it('should validate string type', () => {
        const result = validateFields(
          { text: 'hello' },
          { text: { type: 'string' } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for wrong string type', () => {
        const result = validateFields(
          { text: 123 },
          { text: { type: 'string' } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('text must be a string');
      });

      it('should validate number type', () => {
        const result = validateFields(
          { age: 25 },
          { age: { type: 'number' } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for wrong number type', () => {
        const result = validateFields(
          { age: '25' },
          { age: { type: 'number' } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('age must be a number');
      });

      it('should validate boolean type', () => {
        const result = validateFields(
          { active: true },
          { active: { type: 'boolean' } }
        );
        expect(result.valid).toBe(true);
      });

      it('should validate array type', () => {
        const result = validateFields(
          { items: [1, 2, 3] },
          { items: { type: 'array' } }
        );
        expect(result.valid).toBe(true);
      });

      it('should validate object type', () => {
        const result = validateFields(
          { data: { key: 'value' } },
          { data: { type: 'object' } }
        );
        expect(result.valid).toBe(true);
      });
    });

    describe('Numeric range validation', () => {
      it('should validate minimum number', () => {
        const result = validateFields(
          { score: 10 },
          { score: { type: 'number', min: 5 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for number below minimum', () => {
        const result = validateFields(
          { score: 3 },
          { score: { type: 'number', min: 5 } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('score must be at least 5');
      });

      it('should validate maximum number', () => {
        const result = validateFields(
          { score: 90 },
          { score: { type: 'number', max: 100 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for number above maximum', () => {
        const result = validateFields(
          { score: 110 },
          { score: { type: 'number', max: 100 } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('score must be at most 100');
      });

      it('should validate number in range', () => {
        const result = validateFields(
          { score: 50 },
          { score: { type: 'number', min: 0, max: 100 } }
        );
        expect(result.valid).toBe(true);
      });
    });

    describe('String length validation', () => {
      it('should validate minimum length', () => {
        const result = validateFields(
          { password: '12345678' },
          { password: { type: 'string', minLength: 8 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for string below minimum length', () => {
        const result = validateFields(
          { password: '123' },
          { password: { type: 'string', minLength: 8 } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('password must be at least 8 characters');
      });

      it('should validate maximum length', () => {
        const result = validateFields(
          { username: 'john' },
          { username: { type: 'string', maxLength: 20 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for string above maximum length', () => {
        const result = validateFields(
          { username: 'a'.repeat(25) },
          { username: { type: 'string', maxLength: 20 } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('username must be at most 20 characters');
      });
    });

    describe('Pattern validation', () => {
      it('should validate matching pattern', () => {
        const result = validateFields(
          { email: 'test@example.com' },
          { email: { type: 'string', pattern: Patterns.EMAIL } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for non-matching pattern', () => {
        const result = validateFields(
          { email: 'invalid-email' },
          { email: { type: 'string', pattern: Patterns.EMAIL } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('email has invalid format');
      });
    });

    describe('Array validation', () => {
      it('should validate array minimum items', () => {
        const result = validateFields(
          { tags: ['a', 'b', 'c'] },
          { tags: { type: 'array', min: 2 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for array below minimum items', () => {
        const result = validateFields(
          { tags: ['a'] },
          { tags: { type: 'array', min: 2 } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('tags must have at least 2 items');
      });

      it('should validate array maximum items', () => {
        const result = validateFields(
          { tags: ['a', 'b'] },
          { tags: { type: 'array', max: 5 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for array above maximum items', () => {
        const result = validateFields(
          { tags: ['a', 'b', 'c', 'd', 'e', 'f'] },
          { tags: { type: 'array', max: 5 } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('tags must have at most 5 items');
      });
    });

    describe('Enum validation', () => {
      it('should validate enum value', () => {
        const result = validateFields(
          { status: 'active' },
          { status: { enum: ['active', 'inactive', 'pending'] } }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail for invalid enum value', () => {
        const result = validateFields(
          { status: 'deleted' },
          { status: { enum: ['active', 'inactive', 'pending'] } }
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('must be one of: active, inactive, pending');
      });
    });

    describe('Custom validation', () => {
      it('should pass custom validation', () => {
        const result = validateFields(
          { value: 10 },
          {
            value: {
              custom: (v) => (typeof v === 'number' && v % 2 === 0 ? null : 'Must be even'),
            },
          }
        );
        expect(result.valid).toBe(true);
      });

      it('should fail custom validation', () => {
        const result = validateFields(
          { value: 11 },
          {
            value: {
              custom: (v) => (typeof v === 'number' && v % 2 === 0 ? null : 'Must be even'),
            },
          }
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Must be even');
      });
    });

    describe('Skip validation for optional empty fields', () => {
      it('should skip validation when field is undefined and not required', () => {
        const result = validateFields(
          { name: undefined },
          { name: { type: 'string', minLength: 5 } }
        );
        expect(result.valid).toBe(true);
      });

      it('should skip validation when field is null and not required', () => {
        const result = validateFields(
          { name: null },
          { name: { type: 'string', minLength: 5 } }
        );
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Patterns', () => {
    it('should validate email pattern', () => {
      expect(Patterns.EMAIL.test('test@example.com')).toBe(true);
      expect(Patterns.EMAIL.test('invalid')).toBe(false);
    });

    it('should validate date pattern (YYYY-MM-DD)', () => {
      expect(Patterns.DATE.test('2024-01-15')).toBe(true);
      expect(Patterns.DATE.test('2024/01/15')).toBe(false);
      expect(Patterns.DATE.test('invalid')).toBe(false);
    });

    it('should validate time pattern (HH:MM or HH:MM:SS)', () => {
      expect(Patterns.TIME.test('14:30')).toBe(true);
      expect(Patterns.TIME.test('14:30:45')).toBe(true);
      expect(Patterns.TIME.test('25:00')).toBe(true); // Pattern doesn't validate value
      expect(Patterns.TIME.test('14-30')).toBe(false);
    });

    it('should validate timezone pattern', () => {
      expect(Patterns.TIMEZONE.test('Asia/Seoul')).toBe(true);
      expect(Patterns.TIMEZONE.test('America/New_York')).toBe(true);
      expect(Patterns.TIMEZONE.test('UTC+9')).toBe(false);
    });

    it('should validate UUID pattern', () => {
      expect(Patterns.UUID.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(Patterns.UUID.test('invalid-uuid')).toBe(false);
    });

    it('should validate safe text pattern', () => {
      expect(Patterns.SAFE_TEXT.test('Normal text')).toBe(true);
      expect(Patterns.SAFE_TEXT.test('<script>alert("xss")</script>')).toBe(false);
      expect(Patterns.SAFE_TEXT.test('Text with {braces}')).toBe(false);
    });
  });

  describe('CommonValidators', () => {
    it('should validate birth date', () => {
      const result = validateFields(
        { birthDate: '1990-01-15' },
        { birthDate: CommonValidators.birthDate }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid birth date format', () => {
      const result = validateFields(
        { birthDate: '1990/01/15' },
        { birthDate: CommonValidators.birthDate }
      );
      expect(result.valid).toBe(false);
    });

    it('should reject birth year outside range', () => {
      const result = validateFields(
        { birthDate: '1800-01-15' },
        { birthDate: CommonValidators.birthDate }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('1900 and 2100');
    });

    it('should validate birth time', () => {
      const result = validateFields(
        { birthTime: '14:30' },
        { birthTime: CommonValidators.birthTime }
      );
      expect(result.valid).toBe(true);
    });

    it('should validate latitude', () => {
      const result = validateFields(
        { latitude: 37.5665 },
        { latitude: CommonValidators.latitude }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject latitude out of range', () => {
      const result1 = validateFields(
        { latitude: -95 },
        { latitude: CommonValidators.latitude }
      );
      expect(result1.valid).toBe(false);

      const result2 = validateFields(
        { latitude: 95 },
        { latitude: CommonValidators.latitude }
      );
      expect(result2.valid).toBe(false);
    });

    it('should validate longitude', () => {
      const result = validateFields(
        { longitude: 126.978 },
        { longitude: CommonValidators.longitude }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject longitude out of range', () => {
      const result1 = validateFields(
        { longitude: -185 },
        { longitude: CommonValidators.longitude }
      );
      expect(result1.valid).toBe(false);

      const result2 = validateFields(
        { longitude: 185 },
        { longitude: CommonValidators.longitude }
      );
      expect(result2.valid).toBe(false);
    });

    it('should validate language', () => {
      const result = validateFields(
        { language: 'ko' },
        { language: CommonValidators.language }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject invalid language', () => {
      const result = validateFields(
        { language: 'invalid' },
        { language: CommonValidators.language }
      );
      expect(result.valid).toBe(false);
    });

    it('should validate dream text', () => {
      const result = validateFields(
        { dreamText: 'I had a dream about flying over mountains' },
        { dreamText: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(true);
    });

    it('should reject short dream text', () => {
      const result = validateFields(
        { dreamText: 'Short' },
        { dreamText: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(false);
    });

    it('should reject script injection in dream text', () => {
      const result = validateFields(
        { dreamText: 'Dream text with <script>alert("xss")</script>' },
        { dreamText: CommonValidators.dreamText }
      );
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid content');
    });

    it('should validate tarot cards array', () => {
      const result = validateFields(
        { tarotCards: ['card1', 'card2', 'card3'] },
        { tarotCards: CommonValidators.tarotCards }
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('validateDestinyMapInput', () => {
    it('should validate valid destiny map input', () => {
      const result = validateDestinyMapInput({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        theme: 'life',
        lang: 'ko',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject invalid theme', () => {
      const result = validateDestinyMapInput({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        theme: 'invalid',
        lang: 'ko',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateTarotInput', () => {
    it('should validate valid tarot input', () => {
      const result = validateTarotInput({
        category: 'love',
        spreadId: 'three-card',
        cards: ['card1', 'card2', 'card3'],
        language: 'en',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing required fields', () => {
      const result = validateTarotInput({
        category: 'love',
        // Missing spreadId and cards
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject too many cards', () => {
      const result = validateTarotInput({
        category: 'love',
        spreadId: 'celtic-cross',
        cards: Array(15).fill('card'),
        language: 'en',
      });
      expect(result.valid).toBe(false);
    });
  });

  describe('validateDreamInput', () => {
    it('should validate valid dream input', () => {
      const result = validateDreamInput({
        dream: 'I had a dream about flying over mountains',
        locale: 'en',
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing dream text', () => {
      const result = validateDreamInput({
        locale: 'en',
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('dream is required');
    });
  });

  describe('validateBirthData', () => {
    it('should validate complete birth data', () => {
      const result = validateBirthData({
        birthDate: '1990-01-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
        language: 'ko',
      });
      expect(result.valid).toBe(true);
    });

    it('should accumulate multiple errors', () => {
      const result = validateBirthData({
        birthDate: 'invalid',
        birthTime: 'invalid',
        latitude: 'invalid',
        longitude: 'invalid',
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3);
    });
  });

  describe('validateCompatibilityInput', () => {
    const validPerson = {
      birthDate: '1990-01-15',
      birthTime: '14:30',
      latitude: 37.5665,
      longitude: 126.978,
      timezone: 'Asia/Seoul',
      language: 'ko',
    };

    it('should validate valid compatibility input', () => {
      const result = validateCompatibilityInput({
        person1: validPerson,
        person2: { ...validPerson, birthDate: '1995-05-20' },
      });
      expect(result.valid).toBe(true);
    });

    it('should reject missing person1', () => {
      const result = validateCompatibilityInput({
        person2: validPerson,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('person1 is required');
    });

    it('should reject missing person2', () => {
      const result = validateCompatibilityInput({
        person1: validPerson,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('person2 is required');
    });

    it('should prefix errors with person field', () => {
      const result = validateCompatibilityInput({
        person1: { ...validPerson, latitude: 100 },
        person2: { ...validPerson, longitude: 200 },
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.startsWith('person1.'))).toBe(true);
      expect(result.errors.some((e) => e.startsWith('person2.'))).toBe(true);
    });
  });

  describe('parseJsonBody', () => {
    it('should parse valid JSON', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: JSON.stringify({ name: 'John', age: 30 }),
      });

      const result = await parseJsonBody(request);
      expect(result.error).toBeNull();
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });

    it('should reject invalid JSON', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: 'invalid json{',
      });

      const result = await parseJsonBody(request);
      expect(result.error).toBe('Invalid JSON');
      expect(result.data).toBeNull();
    });

    it('should reject too large body', async () => {
      const largeBody = 'x'.repeat(1_000_001);
      const request = new Request('http://localhost', {
        method: 'POST',
        body: largeBody,
      });

      const result = await parseJsonBody(request);
      expect(result.error).toBe('Request body too large');
      expect(result.data).toBeNull();
    });

    it('should handle empty body', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        body: '',
      });

      const result = await parseJsonBody(request);
      expect(result.error).toBe('Invalid JSON');
      expect(result.data).toBeNull();
    });
  });
});
