/**
 * Tests for src/lib/api/errorResponse.ts
 * Standardized error response system
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ERROR_CODES,
  validationError,
  missingFieldError,
  invalidFormatError,
  unauthorizedError,
  insufficientCreditsError,
  rateLimitError,
  notFoundError,
  internalError,
  databaseError,
  externalApiError,
  timeoutError,
  invalidDateError,
  invalidTimeError,
  invalidCoordinatesError,
  isErrorResponse,
} from '@/lib/api/errorResponse';

describe('API Error Response System', () => {
  describe('ERROR_CODES', () => {
    it('should have validation error codes', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
      expect(ERROR_CODES.INVALID_INPUT).toBe('INVALID_INPUT');
      expect(ERROR_CODES.MISSING_FIELD).toBe('MISSING_FIELD');
      expect(ERROR_CODES.INVALID_FORMAT).toBe('INVALID_FORMAT');
    });

    it('should have authentication error codes', () => {
      expect(ERROR_CODES.UNAUTHORIZED).toBe('UNAUTHORIZED');
      expect(ERROR_CODES.INVALID_TOKEN).toBe('INVALID_TOKEN');
      expect(ERROR_CODES.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    });

    it('should have permission error codes', () => {
      expect(ERROR_CODES.FORBIDDEN).toBe('FORBIDDEN');
      expect(ERROR_CODES.INSUFFICIENT_CREDITS).toBe('INSUFFICIENT_CREDITS');
      expect(ERROR_CODES.RATE_LIMIT_EXCEEDED).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should have server error codes', () => {
      expect(ERROR_CODES.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
      expect(ERROR_CODES.DATABASE_ERROR).toBe('DATABASE_ERROR');
      expect(ERROR_CODES.EXTERNAL_API_ERROR).toBe('EXTERNAL_API_ERROR');
      expect(ERROR_CODES.TIMEOUT).toBe('TIMEOUT');
    });

    it('should have business logic error codes', () => {
      expect(ERROR_CODES.INVALID_DATE).toBe('INVALID_DATE');
      expect(ERROR_CODES.INVALID_TIME).toBe('INVALID_TIME');
      expect(ERROR_CODES.INVALID_COORDINATES).toBe('INVALID_COORDINATES');
    });
  });

  describe('validationError', () => {
    it('should create validation error response', async () => {
      const response = validationError('Invalid input');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe(ERROR_CODES.VALIDATION_ERROR);
      expect(data.message).toBe('Invalid input');
      expect(data.suggestedAction).toBe('Please check your input and try again');
    });

    it('should include details when provided', async () => {
      const details = { field: 'email', reason: 'Invalid format' };
      const response = validationError('Invalid email', details);
      const data = await response.json();

      expect(data.details).toEqual(details);
    });

    it('should include requestId and timestamp', async () => {
      const response = validationError('Test');
      const data = await response.json();

      expect(data.requestId).toBeDefined();
      expect(data.timestamp).toBeDefined();
      expect(typeof data.requestId).toBe('string');
      expect(typeof data.timestamp).toBe('string');
    });
  });

  describe('missingFieldError', () => {
    it('should create missing field error', async () => {
      const response = missingFieldError('email');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe(ERROR_CODES.MISSING_FIELD);
      expect(data.message).toBe('Missing required field: email');
      expect(data.details?.field).toBe('email');
      expect(data.suggestedAction).toContain('email');
    });
  });

  describe('invalidFormatError', () => {
    it('should create invalid format error', async () => {
      const response = invalidFormatError('birthDate', 'YYYY-MM-DD');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe(ERROR_CODES.INVALID_FORMAT);
      expect(data.message).toContain('birthDate');
      expect(data.details?.field).toBe('birthDate');
      expect(data.details?.expectedFormat).toBe('YYYY-MM-DD');
    });
  });

  describe('unauthorizedError', () => {
    it('should create unauthorized error with default message', async () => {
      const response = unauthorizedError();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.code).toBe(ERROR_CODES.UNAUTHORIZED);
      expect(data.message).toBe('Authentication required');
      expect(data.suggestedAction).toContain('sign in');
    });

    it('should create unauthorized error with custom message', async () => {
      const response = unauthorizedError('Invalid session');
      const data = await response.json();

      expect(data.message).toBe('Invalid session');
    });
  });

  describe('insufficientCreditsError', () => {
    it('should create insufficient credits error', async () => {
      const response = insufficientCreditsError(100, 50);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.code).toBe(ERROR_CODES.INSUFFICIENT_CREDITS);
      expect(data.details?.required).toBe(100);
      expect(data.details?.available).toBe(50);
      expect(data.details?.deficit).toBe(50);
      expect(data.suggestedAction).toContain('credits');
    });
  });

  describe('rateLimitError', () => {
    it('should create rate limit error with retry after', async () => {
      const response = rateLimitError(60);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.code).toBe(ERROR_CODES.RATE_LIMIT_EXCEEDED);
      expect(data.retryAfter).toBe(60);
      expect(data.suggestedAction).toContain('60 seconds');
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('notFoundError', () => {
    it('should create not found error without resource type', async () => {
      const response = notFoundError();
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.code).toBe(ERROR_CODES.NOT_FOUND);
      expect(data.message).toBe('Resource not found');
    });

    it('should create not found error with resource type', async () => {
      const response = notFoundError('User');
      const data = await response.json();

      expect(data.message).toBe('User not found');
      expect(data.details?.resourceType).toBe('User');
    });
  });

  describe('internalError', () => {
    it('should create internal error with default message', async () => {
      const response = internalError();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe(ERROR_CODES.INTERNAL_ERROR);
      expect(data.message).toBe('An unexpected error occurred');
      expect(data.suggestedAction).toContain('try again later');
    });

    it('should create internal error with custom message and details', async () => {
      const details = { error: 'Database connection failed' };
      const response = internalError('Custom error', details);
      const data = await response.json();

      expect(data.message).toBe('Custom error');
      expect(data.details).toEqual(details);
    });
  });

  describe('databaseError', () => {
    it('should create database error', async () => {
      const response = databaseError('user lookup');
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.code).toBe(ERROR_CODES.DATABASE_ERROR);
      expect(data.message).toContain('user lookup');
      expect(data.details?.operation).toBe('user lookup');
    });
  });

  describe('externalApiError', () => {
    it('should create external API error without status code', async () => {
      const response = externalApiError('OpenAI');
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.code).toBe(ERROR_CODES.EXTERNAL_API_ERROR);
      expect(data.message).toContain('OpenAI');
      expect(data.details?.service).toBe('OpenAI');
    });

    it('should create external API error with status code', async () => {
      const response = externalApiError('OpenAI', 503);
      const data = await response.json();

      expect(data.details?.statusCode).toBe(503);
    });
  });

  describe('timeoutError', () => {
    it('should create timeout error', async () => {
      const response = timeoutError('AI generation', 30000);
      const data = await response.json();

      expect(response.status).toBe(408);
      expect(data.code).toBe(ERROR_CODES.TIMEOUT);
      expect(data.message).toContain('AI generation');
      expect(data.details?.operation).toBe('AI generation');
      expect(data.details?.timeoutMs).toBe(30000);
    });
  });

  describe('invalidDateError', () => {
    it('should create invalid date error', async () => {
      const response = invalidDateError('2023-13-45');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe(ERROR_CODES.INVALID_DATE);
      expect(data.details?.date).toBe('2023-13-45');
      expect(data.suggestedAction).toContain('YYYY-MM-DD');
    });
  });

  describe('invalidTimeError', () => {
    it('should create invalid time error', async () => {
      const response = invalidTimeError('25:99');
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe(ERROR_CODES.INVALID_TIME);
      expect(data.details?.time).toBe('25:99');
      expect(data.suggestedAction).toContain('HH:MM');
    });
  });

  describe('invalidCoordinatesError', () => {
    it('should create invalid coordinates error', async () => {
      const response = invalidCoordinatesError(999, -999);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.code).toBe(ERROR_CODES.INVALID_COORDINATES);
      expect(data.details?.latitude).toBe(999);
      expect(data.details?.longitude).toBe(-999);
      expect(data.suggestedAction).toContain('city');
    });

    it('should work without coordinates', async () => {
      const response = invalidCoordinatesError();
      const data = await response.json();

      expect(data.code).toBe(ERROR_CODES.INVALID_COORDINATES);
    });
  });

  describe('isErrorResponse', () => {
    it('should return true for valid error response', () => {
      const errorResponse = {
        code: ERROR_CODES.VALIDATION_ERROR,
        message: 'Test error',
        requestId: 'abc123',
        timestamp: new Date().toISOString(),
      };

      expect(isErrorResponse(errorResponse)).toBe(true);
    });

    it('should return false for non-error response', () => {
      expect(isErrorResponse({ data: 'test' })).toBe(false);
      expect(isErrorResponse(null)).toBe(false);
      expect(isErrorResponse(undefined)).toBe(false);
      expect(isErrorResponse('string')).toBe(false);
      expect(isErrorResponse(123)).toBe(false);
    });

    it('should return false for partial error response', () => {
      expect(isErrorResponse({ code: 'ERROR' })).toBe(false);
      expect(isErrorResponse({ message: 'Error' })).toBe(false);
      expect(isErrorResponse({ requestId: 'abc' })).toBe(false);
    });
  });

  describe('response structure consistency', () => {
    it('should include timestamp in all error responses', async () => {
      const errors = [
        validationError('test'),
        unauthorizedError(),
        notFoundError(),
        internalError(),
      ];

      for (const response of errors) {
        const data = await response.json();
        expect(data.timestamp).toBeDefined();
        expect(typeof data.timestamp).toBe('string');
        // Should be valid ISO string
        expect(new Date(data.timestamp).toISOString()).toBe(data.timestamp);
      }
    });

    it('should include unique requestId in all error responses', async () => {
      const response1 = validationError('test');
      const response2 = validationError('test');

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.requestId).toBeDefined();
      expect(data2.requestId).toBeDefined();
      expect(data1.requestId).not.toBe(data2.requestId);
    });

    it('should always have code, message, requestId, and timestamp', async () => {
      const response = validationError('test');
      const data = await response.json();

      expect(data).toHaveProperty('code');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('requestId');
      expect(data).toHaveProperty('timestamp');
    });
  });

  describe('HTTP status codes', () => {
    it('should use correct status code for each error type', async () => {
      expect(validationError('test').status).toBe(400);
      expect(missingFieldError('test').status).toBe(400);
      expect(invalidFormatError('test', 'format').status).toBe(400);
      expect(unauthorizedError().status).toBe(401);
      expect(insufficientCreditsError(10, 5).status).toBe(403);
      expect(rateLimitError(60).status).toBe(429);
      expect(notFoundError().status).toBe(404);
      expect(internalError().status).toBe(500);
      expect(databaseError('test').status).toBe(500);
      expect(externalApiError('test').status).toBe(502);
      expect(timeoutError('test', 1000).status).toBe(408);
    });
  });
});
