// tests/lib/api/index.test.ts
import { describe, it, expect } from 'vitest';
import * as apiIndex from '../../../src/lib/api';

describe('lib/api/index - Module Exports', () => {
  describe('Error Handler Exports', () => {
    it('should export createErrorResponse function', () => {
      expect(apiIndex.createErrorResponse).toBeDefined();
      expect(typeof apiIndex.createErrorResponse).toBe('function');
    });

    it('should export createSuccessResponse function', () => {
      expect(apiIndex.createSuccessResponse).toBeDefined();
      expect(typeof apiIndex.createSuccessResponse).toBe('function');
    });

    it('should export withErrorHandler function', () => {
      expect(apiIndex.withErrorHandler).toBeDefined();
      expect(typeof apiIndex.withErrorHandler).toBe('function');
    });

    it('should export ErrorCodes constant', () => {
      expect(apiIndex.ErrorCodes).toBeDefined();
      expect(typeof apiIndex.ErrorCodes).toBe('object');
    });
  });

  describe('Validation Exports', () => {
    it('should export validateFields function', () => {
      expect(apiIndex.validateFields).toBeDefined();
      expect(typeof apiIndex.validateFields).toBe('function');
    });

    it('should export validateDestinyMapInput function', () => {
      expect(apiIndex.validateDestinyMapInput).toBeDefined();
      expect(typeof apiIndex.validateDestinyMapInput).toBe('function');
    });

    it('should export validateTarotInput function', () => {
      expect(apiIndex.validateTarotInput).toBeDefined();
      expect(typeof apiIndex.validateTarotInput).toBe('function');
    });

    it('should export validateDreamInput function', () => {
      expect(apiIndex.validateDreamInput).toBeDefined();
      expect(typeof apiIndex.validateDreamInput).toBe('function');
    });

    it('should export parseJsonBody function', () => {
      expect(apiIndex.parseJsonBody).toBeDefined();
      expect(typeof apiIndex.parseJsonBody).toBe('function');
    });

    it('should export Patterns constant', () => {
      expect(apiIndex.Patterns).toBeDefined();
      expect(typeof apiIndex.Patterns).toBe('object');
    });

    it('should export CommonValidators constant', () => {
      expect(apiIndex.CommonValidators).toBeDefined();
      expect(typeof apiIndex.CommonValidators).toBe('object');
    });
  });

  describe('Zod Schema Exports', () => {
    it('should export LocaleSchema', () => {
      expect(apiIndex.LocaleSchema).toBeDefined();
    });

    it('should export DateStringSchema', () => {
      expect(apiIndex.DateStringSchema).toBeDefined();
    });

    it('should export TimeStringSchema', () => {
      expect(apiIndex.TimeStringSchema).toBeDefined();
    });

    it('should export TimezoneSchema', () => {
      expect(apiIndex.TimezoneSchema).toBeDefined();
    });

    it('should export BirthDataSchema', () => {
      expect(apiIndex.BirthDataSchema).toBeDefined();
    });

    it('should export GenderSchema', () => {
      expect(apiIndex.GenderSchema).toBeDefined();
    });

    it('should export DestinyMapRequestSchema', () => {
      expect(apiIndex.DestinyMapRequestSchema).toBeDefined();
    });

    it('should export TarotInterpretRequestSchema', () => {
      expect(apiIndex.TarotInterpretRequestSchema).toBeDefined();
    });

    it('should export DreamRequestSchema', () => {
      expect(apiIndex.DreamRequestSchema).toBeDefined();
    });

    it('should export IChingReadingRequestSchema', () => {
      expect(apiIndex.IChingReadingRequestSchema).toBeDefined();
    });

    it('should export FeedbackRequestSchema', () => {
      expect(apiIndex.FeedbackRequestSchema).toBeDefined();
    });

    it('should export ConsultationThemeSchema', () => {
      expect(apiIndex.ConsultationThemeSchema).toBeDefined();
    });

    it('should export ApiErrorSchema', () => {
      expect(apiIndex.ApiErrorSchema).toBeDefined();
    });

    it('should export ApiSuccessSchema', () => {
      expect(apiIndex.ApiSuccessSchema).toBeDefined();
    });

    it('should export ApiFailureSchema', () => {
      expect(apiIndex.ApiFailureSchema).toBeDefined();
    });

    it('should export ApiResponseSchema', () => {
      expect(apiIndex.ApiResponseSchema).toBeDefined();
    });

    it('should export parseBody helper', () => {
      expect(apiIndex.parseBody).toBeDefined();
      expect(typeof apiIndex.parseBody).toBe('function');
    });

    it('should export safeParseBody helper', () => {
      expect(apiIndex.safeParseBody).toBeDefined();
      expect(typeof apiIndex.safeParseBody).toBe('function');
    });

    it('should export LIMITS constant', () => {
      expect(apiIndex.LIMITS).toBeDefined();
      expect(typeof apiIndex.LIMITS).toBe('object');
    });
  });

  describe('API Client Exports', () => {
    it('should export apiFetch function', () => {
      expect(apiIndex.apiFetch).toBeDefined();
      expect(typeof apiIndex.apiFetch).toBe('function');
    });

    it('should export ApiClient class', () => {
      expect(apiIndex.ApiClient).toBeDefined();
      expect(typeof apiIndex.ApiClient).toBe('function');
    });

    it('should export apiClient instance', () => {
      expect(apiIndex.apiClient).toBeDefined();
    });

    it('should export createApiClient function', () => {
      expect(apiIndex.createApiClient).toBeDefined();
      expect(typeof apiIndex.createApiClient).toBe('function');
    });
  });

  describe('Sanitizer Exports', () => {
    it('should export isRecord function', () => {
      expect(apiIndex.isRecord).toBeDefined();
      expect(typeof apiIndex.isRecord).toBe('function');
    });

    it('should export cleanStringArray function', () => {
      expect(apiIndex.cleanStringArray).toBeDefined();
      expect(typeof apiIndex.cleanStringArray).toBe('function');
    });

    it('should export normalizeMessages function', () => {
      expect(apiIndex.normalizeMessages).toBeDefined();
      expect(typeof apiIndex.normalizeMessages).toBe('function');
    });

    it('should export sanitizeString function', () => {
      expect(apiIndex.sanitizeString).toBeDefined();
      expect(typeof apiIndex.sanitizeString).toBe('function');
    });

    it('should export sanitizeNumber function', () => {
      expect(apiIndex.sanitizeNumber).toBeDefined();
      expect(typeof apiIndex.sanitizeNumber).toBe('function');
    });

    it('should export sanitizeBoolean function', () => {
      expect(apiIndex.sanitizeBoolean).toBeDefined();
      expect(typeof apiIndex.sanitizeBoolean).toBe('function');
    });

    it('should export sanitizeHtml function', () => {
      expect(apiIndex.sanitizeHtml).toBeDefined();
      expect(typeof apiIndex.sanitizeHtml).toBe('function');
    });

    it('should export sanitizeEnum function', () => {
      expect(apiIndex.sanitizeEnum).toBeDefined();
      expect(typeof apiIndex.sanitizeEnum).toBe('function');
    });
  });

  describe('Module Integrity', () => {
    it('should have no undefined exports', () => {
      const keys = Object.keys(apiIndex);
      keys.forEach(key => {
        expect(apiIndex[key as keyof typeof apiIndex]).toBeDefined();
      });
    });

    it('should export at least 30 items', () => {
      const keys = Object.keys(apiIndex);
      expect(keys.length).toBeGreaterThanOrEqual(30);
    });

    it('should not export internal implementation details', () => {
      const keys = Object.keys(apiIndex);
      const internalPrefixes = ['_', '__'];
      keys.forEach(key => {
        const hasInternalPrefix = internalPrefixes.some(prefix => key.startsWith(prefix));
        expect(hasInternalPrefix).toBe(false);
      });
    });
  });

  describe('Type Exports', () => {
    it('should have ErrorCode type available', () => {
      // Type check - if this compiles, the type is exported
      const _typeCheck: apiIndex.ErrorCode = 'UNAUTHORIZED';
      expect(_typeCheck).toBeDefined();
    });

    it('should have Locale type available', () => {
      const _typeCheck: apiIndex.Locale = 'ko';
      expect(_typeCheck).toBeDefined();
    });

    it('should have Gender type available', () => {
      const _typeCheck: apiIndex.Gender = 'male';
      expect(_typeCheck).toBeDefined();
    });

    it('should have BirthData type available', () => {
      const _typeCheck: apiIndex.BirthData = {
        year: 1990,
        month: 1,
        date: 1,
        hour: 12,
        minute: 0,
        latitude: 37.5,
        longitude: 127.0,
        timezone: 'Asia/Seoul',
      };
      expect(_typeCheck).toBeDefined();
    });
  });
});
