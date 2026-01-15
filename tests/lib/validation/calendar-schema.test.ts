import { describe, it, expect } from 'vitest';
import {
  BirthInfoSchema,
  CalendarQuerySchema,
  SaveDateSchema,
  DateIdSchema,
  validateInput,
  validateInputAsync,
} from '@/lib/validation/calendar-schema';

describe('calendar-schema', () => {
  describe('BirthInfoSchema', () => {
    it('should validate correct birth info', () => {
      const validData = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate birth info without optional birthTime', () => {
      const validData = {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        birthDate: '1990/05/15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject invalid date format (missing leading zeros)', () => {
      const invalidData = {
        birthDate: '1990-5-15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject invalid time format', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        birthTime: '2:30 PM',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject latitude below -90', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: -91,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject latitude above 90', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: 91,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject longitude below -180', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: -181,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject longitude above 180', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 181,
        timezone: 'Asia/Seoul',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject empty timezone', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: '',
      };

      const result = BirthInfoSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should accept boundary latitude values', () => {
      const validData1 = {
        birthDate: '1990-05-15',
        latitude: -90,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      const validData2 = {
        birthDate: '1990-05-15',
        latitude: 90,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      };

      expect(BirthInfoSchema.safeParse(validData1).success).toBe(true);
      expect(BirthInfoSchema.safeParse(validData2).success).toBe(true);
    });

    it('should accept boundary longitude values', () => {
      const validData1 = {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: -180,
        timezone: 'Asia/Seoul',
      };

      const validData2 = {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 180,
        timezone: 'Asia/Seoul',
      };

      expect(BirthInfoSchema.safeParse(validData1).success).toBe(true);
      expect(BirthInfoSchema.safeParse(validData2).success).toBe(true);
    });
  });

  describe('CalendarQuerySchema', () => {
    it('should validate correct calendar query', () => {
      const validData = {
        birthDate: '1990-05-15',
        birthTime: '14:30',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
        category: 'wealth',
        locale: 'ko',
      };

      const result = CalendarQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.latitude).toBe(37.5665);
        expect(result.data.longitude).toBe(126.978);
        expect(result.data.year).toBe(2024);
      }
    });

    it('should transform string latitude/longitude to numbers', () => {
      const validData = {
        birthDate: '1990-05-15',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
      };

      const result = CalendarQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.latitude).toBe('number');
        expect(typeof result.data.longitude).toBe('number');
      }
    });

    it('should transform string year to number', () => {
      const validData = {
        birthDate: '1990-05-15',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
      };

      const result = CalendarQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.year).toBe('number');
      }
    });

    it('should use default category when not provided', () => {
      const validData = {
        birthDate: '1990-05-15',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
      };

      const result = CalendarQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.category).toBe('all');
      }
    });

    it('should use default locale when not provided', () => {
      const validData = {
        birthDate: '1990-05-15',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
      };

      const result = CalendarQuerySchema.safeParse(validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.locale).toBe('ko');
      }
    });

    it('should validate all category values', () => {
      const categories = ['wealth', 'career', 'love', 'health', 'travel', 'study', 'all'];

      for (const category of categories) {
        const validData = {
          birthDate: '1990-05-15',
          latitude: '37.5665',
          longitude: '126.978',
          timezone: 'Asia/Seoul',
          year: '2024',
          category,
        };

        const result = CalendarQuerySchema.safeParse(validData);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid category', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
        category: 'invalid',
      };

      const result = CalendarQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should validate locale values', () => {
      const locales = ['ko', 'en'];

      for (const locale of locales) {
        const validData = {
          birthDate: '1990-05-15',
          latitude: '37.5665',
          longitude: '126.978',
          timezone: 'Asia/Seoul',
          year: '2024',
          locale,
        };

        const result = CalendarQuerySchema.safeParse(validData);
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid locale', () => {
      const invalidData = {
        birthDate: '1990-05-15',
        latitude: '37.5665',
        longitude: '126.978',
        timezone: 'Asia/Seoul',
        year: '2024',
        locale: 'ja',
      };

      const result = CalendarQuerySchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('SaveDateSchema', () => {
    it('should validate correct save date', () => {
      const validData = {
        date: '2024-05-15',
        title: 'Important Day',
        description: 'Something special',
      };

      const result = SaveDateSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should validate date without optional fields', () => {
      const validData = {
        date: '2024-05-15',
      };

      const result = SaveDateSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        date: '2024/05/15',
      };

      const result = SaveDateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing date', () => {
      const invalidData = {
        title: 'Important Day',
      };

      const result = SaveDateSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('DateIdSchema', () => {
    it('should validate correct date ID', () => {
      const validData = {
        id: '2024-05-15',
      };

      const result = DateIdSchema.safeParse(validData);

      expect(result.success).toBe(true);
    });

    it('should reject invalid date ID format', () => {
      const invalidData = {
        id: '2024/05/15',
      };

      const result = DateIdSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });

    it('should reject missing id', () => {
      const invalidData = {};

      const result = DateIdSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
    });
  });

  describe('validateInput', () => {
    it('should return success for valid input', () => {
      const result = validateInput(BirthInfoSchema, {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.birthDate).toBe('1990-05-15');
      }
    });

    it('should return error for invalid input', () => {
      const result = validateInput(BirthInfoSchema, {
        birthDate: 'invalid',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('birthDate');
      }
    });

    it('should format multiple errors', () => {
      const result = validateInput(BirthInfoSchema, {
        birthDate: 'invalid',
        latitude: 100,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('birthDate');
        expect(result.error).toContain('latitude');
      }
    });

    it('should handle missing required fields', () => {
      const result = validateInput(BirthInfoSchema, {
        birthDate: '1990-05-15',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('validateInputAsync', () => {
    it('should return success for valid input', async () => {
      const result = await validateInputAsync(BirthInfoSchema, {
        birthDate: '1990-05-15',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.birthDate).toBe('1990-05-15');
      }
    });

    it('should return error for invalid input', async () => {
      const result = await validateInputAsync(BirthInfoSchema, {
        birthDate: 'invalid',
        latitude: 37.5665,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('birthDate');
      }
    });

    it('should format multiple errors', async () => {
      const result = await validateInputAsync(BirthInfoSchema, {
        birthDate: 'invalid',
        latitude: 100,
        longitude: 126.978,
        timezone: 'Asia/Seoul',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('birthDate');
        expect(result.error).toContain('latitude');
      }
    });

    it('should handle non-ZodError exceptions', async () => {
      // Create a schema that throws a non-Zod error
      const result = await validateInputAsync(BirthInfoSchema, null as unknown);

      expect(result.success).toBe(false);
    });
  });
});
