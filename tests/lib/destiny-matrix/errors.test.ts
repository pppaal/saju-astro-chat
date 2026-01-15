import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ErrorCodes,
  ErrorMessages,
  DestinyMatrixError,
  createValidationError,
  createMissingFieldError,
  createCalculationError,
  wrapError,
  safeExecute,
  safeExecuteSync,
  type ErrorCode,
  type ErrorResponse,
} from '@/lib/destiny-matrix/errors';

describe('Destiny Matrix Errors', () => {
  describe('ErrorCodes', () => {
    it('should have all validation error codes (1xxx)', () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe('DFM_1000');
      expect(ErrorCodes.MISSING_REQUIRED_FIELD).toBe('DFM_1001');
      expect(ErrorCodes.INVALID_FIELD_VALUE).toBe('DFM_1002');
      expect(ErrorCodes.INVALID_ELEMENT).toBe('DFM_1003');
      expect(ErrorCodes.INVALID_SIBSIN).toBe('DFM_1004');
      expect(ErrorCodes.INVALID_GEOKGUK).toBe('DFM_1005');
      expect(ErrorCodes.INVALID_PLANET).toBe('DFM_1006');
      expect(ErrorCodes.INVALID_HOUSE).toBe('DFM_1007');
      expect(ErrorCodes.INVALID_TRANSIT).toBe('DFM_1008');
      expect(ErrorCodes.INVALID_SHINSAL).toBe('DFM_1009');
    });

    it('should have all calculation error codes (2xxx)', () => {
      expect(ErrorCodes.CALCULATION_ERROR).toBe('DFM_2000');
      expect(ErrorCodes.LAYER_CALCULATION_FAILED).toBe('DFM_2001');
      expect(ErrorCodes.WEIGHT_CALCULATION_FAILED).toBe('DFM_2002');
      expect(ErrorCodes.INSIGHT_GENERATION_FAILED).toBe('DFM_2003');
      expect(ErrorCodes.REPORT_GENERATION_FAILED).toBe('DFM_2004');
    });

    it('should have all data error codes (3xxx)', () => {
      expect(ErrorCodes.DATA_NOT_FOUND).toBe('DFM_3000');
      expect(ErrorCodes.MATRIX_DATA_MISSING).toBe('DFM_3001');
      expect(ErrorCodes.LAYER_DATA_MISSING).toBe('DFM_3002');
    });

    it('should have all system error codes (9xxx)', () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe('DFM_9000');
      expect(ErrorCodes.UNKNOWN_ERROR).toBe('DFM_9999');
    });
  });

  describe('ErrorMessages', () => {
    it('should have bilingual messages for all error codes', () => {
      const allCodes = Object.values(ErrorCodes) as ErrorCode[];

      allCodes.forEach(code => {
        expect(ErrorMessages[code]).toBeDefined();
        expect(ErrorMessages[code].ko).toBeTruthy();
        expect(ErrorMessages[code].en).toBeTruthy();
      });
    });

    it('should have proper Korean messages', () => {
      expect(ErrorMessages['DFM_1000'].ko).toBe('입력 데이터 검증에 실패했습니다.');
      expect(ErrorMessages['DFM_1001'].ko).toBe('필수 필드가 누락되었습니다.');
      expect(ErrorMessages['DFM_2000'].ko).toBe('계산 중 오류가 발생했습니다.');
      expect(ErrorMessages['DFM_3000'].ko).toBe('데이터를 찾을 수 없습니다.');
      expect(ErrorMessages['DFM_9999'].ko).toBe('알 수 없는 오류가 발생했습니다.');
    });

    it('should have proper English messages', () => {
      expect(ErrorMessages['DFM_1000'].en).toBe('Input validation failed.');
      expect(ErrorMessages['DFM_1001'].en).toBe('Required field is missing.');
      expect(ErrorMessages['DFM_2000'].en).toBe('Calculation error occurred.');
      expect(ErrorMessages['DFM_3000'].en).toBe('Data not found.');
      expect(ErrorMessages['DFM_9999'].en).toBe('Unknown error occurred.');
    });

    it('should cover validation-specific messages', () => {
      expect(ErrorMessages['DFM_1003'].ko).toContain('오행');
      expect(ErrorMessages['DFM_1003'].en).toContain('element');
      expect(ErrorMessages['DFM_1007'].ko).toContain('하우스');
      expect(ErrorMessages['DFM_1007'].en).toContain('house');
    });
  });

  describe('DestinyMatrixError', () => {
    it('should create error with code only', () => {
      const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(DestinyMatrixError);
      expect(error.name).toBe('DestinyMatrixError');
      expect(error.code).toBe('DFM_1000');
      expect(error.message).toBe('입력 데이터 검증에 실패했습니다.');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should create error with custom message', () => {
      const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
        message: 'Custom error message'
      });

      expect(error.message).toBe('Custom error message');
    });

    it('should create error with field', () => {
      const error = new DestinyMatrixError(ErrorCodes.INVALID_FIELD_VALUE, {
        field: 'birthDate'
      });

      expect(error.field).toBe('birthDate');
    });

    it('should create error with details', () => {
      const details = { expected: 'number', received: 'string' };
      const error = new DestinyMatrixError(ErrorCodes.INVALID_FIELD_VALUE, {
        details
      });

      expect(error.details).toEqual(details);
    });

    it('should use English message when lang is en', () => {
      const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
        lang: 'en'
      });

      expect(error.message).toBe('Input validation failed.');
    });

    it('should use Korean message when lang is ko', () => {
      const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
        lang: 'ko'
      });

      expect(error.message).toBe('입력 데이터 검증에 실패했습니다.');
    });

    it('should fallback to unknown error message for invalid code', () => {
      const error = new DestinyMatrixError('INVALID_CODE' as ErrorCode);

      expect(error.message).toBe('알 수 없는 오류가 발생했습니다.');
    });

    describe('toJSON', () => {
      it('should convert to proper JSON format', () => {
        const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {
          field: 'birthDate',
          details: { reason: 'invalid format' }
        });

        const json = error.toJSON();

        expect(json.success).toBe(false);
        expect(json.error.code).toBe('DFM_1000');
        expect(json.error.message).toBe('입력 데이터 검증에 실패했습니다.');
        expect(json.error.field).toBe('birthDate');
        expect(json.error.details).toEqual({ reason: 'invalid format' });
        expect(json.error.timestamp).toBeDefined();
      });

      it('should include ISO timestamp', () => {
        const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);
        const json = error.toJSON();

        expect(json.error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      });
    });

    describe('getHttpStatus', () => {
      it('should return 400 for validation errors (1xxx)', () => {
        const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);
        expect(error.getHttpStatus()).toBe(400);

        const error2 = new DestinyMatrixError(ErrorCodes.INVALID_ELEMENT);
        expect(error2.getHttpStatus()).toBe(400);
      });

      it('should return 422 for calculation errors (2xxx)', () => {
        const error = new DestinyMatrixError(ErrorCodes.CALCULATION_ERROR);
        expect(error.getHttpStatus()).toBe(422);

        const error2 = new DestinyMatrixError(ErrorCodes.LAYER_CALCULATION_FAILED);
        expect(error2.getHttpStatus()).toBe(422);
      });

      it('should return 404 for data errors (3xxx)', () => {
        const error = new DestinyMatrixError(ErrorCodes.DATA_NOT_FOUND);
        expect(error.getHttpStatus()).toBe(404);

        const error2 = new DestinyMatrixError(ErrorCodes.MATRIX_DATA_MISSING);
        expect(error2.getHttpStatus()).toBe(404);
      });

      it('should return 500 for system errors (9xxx)', () => {
        const error = new DestinyMatrixError(ErrorCodes.INTERNAL_ERROR);
        expect(error.getHttpStatus()).toBe(500);

        const error2 = new DestinyMatrixError(ErrorCodes.UNKNOWN_ERROR);
        expect(error2.getHttpStatus()).toBe(500);
      });
    });
  });

  describe('Helper Functions', () => {
    describe('createValidationError', () => {
      it('should create validation error with field', () => {
        const error = createValidationError('email');

        expect(error.code).toBe(ErrorCodes.INVALID_FIELD_VALUE);
        expect(error.field).toBe('email');
      });

      it('should include details', () => {
        const error = createValidationError('age', { min: 0, max: 120 });

        expect(error.details).toEqual({ min: 0, max: 120 });
      });

      it('should support English language', () => {
        const error = createValidationError('name', undefined, 'en');

        expect(error.message).toBe('Field value is invalid.');
      });
    });

    describe('createMissingFieldError', () => {
      it('should create missing field error in Korean', () => {
        const error = createMissingFieldError('birthDate', 'ko');

        expect(error.code).toBe(ErrorCodes.MISSING_REQUIRED_FIELD);
        expect(error.field).toBe('birthDate');
        expect(error.message).toBe("필수 필드 'birthDate'가 누락되었습니다.");
      });

      it('should create missing field error in English', () => {
        const error = createMissingFieldError('birthDate', 'en');

        expect(error.message).toBe("Required field 'birthDate' is missing.");
      });
    });

    describe('createCalculationError', () => {
      it('should create calculation error with layer', () => {
        const error = createCalculationError(3);

        expect(error.code).toBe(ErrorCodes.LAYER_CALCULATION_FAILED);
        expect(error.field).toBe('layer3');
      });

      it('should include details', () => {
        const error = createCalculationError(5, { input: 'invalid' });

        expect(error.details).toEqual({ input: 'invalid' });
      });

      it('should support English language', () => {
        const error = createCalculationError(7, undefined, 'en');

        expect(error.message).toBe('Layer calculation failed.');
      });
    });
  });

  describe('Error Wrapping', () => {
    describe('wrapError', () => {
      it('should return DestinyMatrixError as-is', () => {
        const original = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);
        const wrapped = wrapError(original);

        expect(wrapped).toBe(original);
      });

      it('should wrap standard Error', () => {
        const original = new Error('Something went wrong');
        const wrapped = wrapError(original);

        expect(wrapped).toBeInstanceOf(DestinyMatrixError);
        expect(wrapped.code).toBe(ErrorCodes.INTERNAL_ERROR);
        expect(wrapped.message).toBe('Something went wrong');
        expect(wrapped.details).toHaveProperty('originalError', 'Error');
      });

      it('should wrap non-Error values', () => {
        const wrapped = wrapError('string error');

        expect(wrapped).toBeInstanceOf(DestinyMatrixError);
        expect(wrapped.code).toBe(ErrorCodes.UNKNOWN_ERROR);
        expect(wrapped.details).toBe('string error');
      });

      it('should wrap null/undefined', () => {
        const wrappedNull = wrapError(null);
        const wrappedUndefined = wrapError(undefined);

        expect(wrappedNull.code).toBe(ErrorCodes.UNKNOWN_ERROR);
        expect(wrappedUndefined.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      });

      it('should use English language', () => {
        const wrapped = wrapError(new Error('test'), 'en');

        expect(wrapped.message).toBe('test');
      });
    });

    describe('safeExecute', () => {
      it('should return success result for successful sync function', async () => {
        const result = await safeExecute(() => 42);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(42);
        }
      });

      it('should return success result for successful async function', async () => {
        const result = await safeExecute(async () => {
          await Promise.resolve();
          return 'async result';
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe('async result');
        }
      });

      it('should return error response for DestinyMatrixError', async () => {
        const result = await safeExecute(() => {
          throw new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('DFM_1000');
        }
      });

      it('should return error response for generic Error', async () => {
        const result = await safeExecute(() => {
          throw new Error('Generic error');
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
        }
      });

      it('should use custom error code', async () => {
        const result = await safeExecute(
          () => { throw new Error('test'); },
          ErrorCodes.CALCULATION_ERROR
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('DFM_2000');
        }
      });

      it('should use specified language', async () => {
        const result = await safeExecute(
          () => { throw new Error('test'); },
          ErrorCodes.CALCULATION_ERROR,
          'en'
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.message).toBe('Calculation error occurred.');
        }
      });
    });

    describe('safeExecuteSync', () => {
      it('should return success result for successful function', () => {
        const result = safeExecuteSync(() => 42);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(42);
        }
      });

      it('should return error response for DestinyMatrixError', () => {
        const result = safeExecuteSync(() => {
          throw new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('DFM_1000');
        }
      });

      it('should return error response for generic Error', () => {
        const result = safeExecuteSync(() => {
          throw new Error('Sync error');
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe(ErrorCodes.INTERNAL_ERROR);
        }
      });

      it('should use custom error code', () => {
        const result = safeExecuteSync(
          () => { throw new Error('test'); },
          ErrorCodes.LAYER_CALCULATION_FAILED
        );

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('DFM_2001');
        }
      });

      it('should handle non-Error throws', () => {
        const result = safeExecuteSync(() => {
          throw 'string error';
        });

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.details).toBe('string error');
        }
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty options', () => {
      const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR, {});

      expect(error.message).toBe('입력 데이터 검증에 실패했습니다.');
      expect(error.field).toBeUndefined();
      expect(error.details).toBeUndefined();
    });

    it('should handle prototype chain correctly', () => {
      const error = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof DestinyMatrixError).toBe(true);
      expect(Object.getPrototypeOf(error)).toBe(DestinyMatrixError.prototype);
    });

    it('should generate unique timestamps', async () => {
      const error1 = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);
      await new Promise(resolve => setTimeout(resolve, 10));
      const error2 = new DestinyMatrixError(ErrorCodes.VALIDATION_ERROR);

      expect(error1.timestamp.getTime()).toBeLessThan(error2.timestamp.getTime());
    });
  });
});
