/**
 * API Error Response MEGA Test Suite
 * Comprehensive testing for standardized error responses
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ERROR_CODES,
  createErrorResponse,
  createSuccessResponse,
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
  withErrorHandling,
  isErrorResponse,
  type ErrorCode,
} from '@/lib/api/errorResponse';

describe('errorResponse MEGA - ERROR_CODES', () => {
  it.each([
    'VALIDATION_ERROR', 'INVALID_INPUT', 'MISSING_FIELD', 'INVALID_FORMAT',
    'UNAUTHORIZED', 'INVALID_TOKEN', 'TOKEN_EXPIRED', 'FORBIDDEN',
    'INSUFFICIENT_CREDITS', 'RATE_LIMIT_EXCEEDED', 'NOT_FOUND', 'RESOURCE_NOT_FOUND',
    'INTERNAL_ERROR', 'DATABASE_ERROR', 'EXTERNAL_API_ERROR', 'TIMEOUT',
    'INVALID_DATE', 'INVALID_TIME', 'INVALID_COORDINATES', 'PROFILE_NOT_COMPLETE',
  ])('should have %s', (code) => {
    expect(ERROR_CODES[code as ErrorCode]).toBe(code);
  });
});

describe('errorResponse MEGA - createErrorResponse', () => {
  it('should create error with all required fields', async () => {
    const response = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test error',
      status: 400,
    });
    const data = await response.json();

    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Test error');
    expect(data.requestId).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it('should generate unique requestId', async () => {
    const response1 = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Error 1',
      status: 400,
    });
    const response2 = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Error 2',
      status: 400,
    });

    const data1 = await response1.json();
    const data2 = await response2.json();

    expect(data1.requestId).not.toBe(data2.requestId);
  });

  it('should accept custom requestId', async () => {
    const response = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test',
      status: 400,
      requestId: 'custom-id-123',
    });
    const data = await response.json();

    expect(data.requestId).toBe('custom-id-123');
  });

  it('should include details when provided', async () => {
    const response = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test',
      status: 400,
      details: { field: 'email', reason: 'invalid' },
    });
    const data = await response.json();

    expect(data.details).toEqual({ field: 'email', reason: 'invalid' });
  });

  it('should include suggestedAction when provided', async () => {
    const response = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test',
      status: 400,
      suggestedAction: 'Please check your input',
    });
    const data = await response.json();

    expect(data.suggestedAction).toBe('Please check your input');
  });

  it('should include retryAfter when provided', async () => {
    const response = createErrorResponse({
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests',
      status: 429,
      retryAfter: 60,
    });
    const data = await response.json();

    expect(data.retryAfter).toBe(60);
  });

  it('should set Retry-After header when retryAfter provided', () => {
    const response = createErrorResponse({
      code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
      message: 'Too many requests',
      status: 429,
      retryAfter: 120,
    });

    expect(response.headers.get('Retry-After')).toBe('120');
  });

  it('should have Content-Type application/json', () => {
    const response = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test',
      status: 400,
    });

    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  it('should generate valid ISO timestamp', async () => {
    const before = new Date();
    const response = createErrorResponse({
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test',
      status: 400,
    });
    const after = new Date();
    const data = await response.json();

    const timestamp = new Date(data.timestamp);
    expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it('should use correct status code', () => {
    const response = createErrorResponse({
      code: ERROR_CODES.NOT_FOUND,
      message: 'Not found',
      status: 404,
    });

    expect(response.status).toBe(404);
  });

  describe('All status codes', () => {
    it.each([
      [400, 'Bad Request'],
      [401, 'Unauthorized'],
      [403, 'Forbidden'],
      [404, 'Not Found'],
      [408, 'Timeout'],
      [413, 'Payload Too Large'],
      [422, 'Unprocessable Entity'],
      [429, 'Too Many Requests'],
      [500, 'Internal Server Error'],
      [502, 'Bad Gateway'],
      [503, 'Service Unavailable'],
      [504, 'Gateway Timeout'],
    ])('should support %i - %s', (status, desc) => {
      const response = createErrorResponse({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Test',
        status,
      });
      expect(response.status).toBe(status);
    });
  });
});

describe('errorResponse MEGA - createSuccessResponse', () => {
  it('should create success response with data', async () => {
    const response = createSuccessResponse({ result: 'test' });
    const data = await response.json();

    expect(data.data).toEqual({ result: 'test' });
    expect(data.requestId).toBeDefined();
    expect(data.timestamp).toBeDefined();
  });

  it('should default to 200 status', () => {
    const response = createSuccessResponse({});
    expect(response.status).toBe(200);
  });

  it('should accept custom status', () => {
    const response = createSuccessResponse({}, { status: 201 });
    expect(response.status).toBe(201);
  });

  it('should accept custom requestId', async () => {
    const response = createSuccessResponse({}, { requestId: 'custom-123' });
    const data = await response.json();

    expect(data.requestId).toBe('custom-123');
  });

  it('should handle null data', async () => {
    const response = createSuccessResponse(null);
    const data = await response.json();

    expect(data.data).toBeNull();
  });

  it('should handle array data', async () => {
    const response = createSuccessResponse([1, 2, 3]);
    const data = await response.json();

    expect(data.data).toEqual([1, 2, 3]);
  });

  it('should handle string data', async () => {
    const response = createSuccessResponse('hello');
    const data = await response.json();

    expect(data.data).toBe('hello');
  });

  it('should handle complex nested data', async () => {
    const complexData = {
      user: { id: 1, profile: { name: 'John', settings: { theme: 'dark' } } },
    };
    const response = createSuccessResponse(complexData);
    const data = await response.json();

    expect(data.data).toEqual(complexData);
  });
});

describe('errorResponse MEGA - validationError', () => {
  it('should create 400 validation error', async () => {
    const response = validationError('Invalid input');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
    expect(data.message).toBe('Invalid input');
  });

  it('should include suggestedAction', async () => {
    const response = validationError('Test');
    const data = await response.json();

    expect(data.suggestedAction).toContain('check your input');
  });

  it('should include details', async () => {
    const response = validationError('Test', { field: 'email' });
    const data = await response.json();

    expect(data.details).toEqual({ field: 'email' });
  });
});

describe('errorResponse MEGA - missingFieldError', () => {
  it('should create missing field error', async () => {
    const response = missingFieldError('email');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('MISSING_FIELD');
    expect(data.message).toContain('email');
  });

  it('should include field in details', async () => {
    const response = missingFieldError('password');
    const data = await response.json();

    expect(data.details.field).toBe('password');
  });

  it('should include suggestedAction', async () => {
    const response = missingFieldError('username');
    const data = await response.json();

    expect(data.suggestedAction).toContain('username');
  });
});

describe('errorResponse MEGA - invalidFormatError', () => {
  it('should create invalid format error', async () => {
    const response = invalidFormatError('birthDate', 'YYYY-MM-DD');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_FORMAT');
    expect(data.message).toContain('birthDate');
  });

  it('should include field and format in details', async () => {
    const response = invalidFormatError('birthDate', 'YYYY-MM-DD');
    const data = await response.json();

    expect(data.details.field).toBe('birthDate');
    expect(data.details.expectedFormat).toBe('YYYY-MM-DD');
  });

  it('should include format in suggestedAction', async () => {
    const response = invalidFormatError('time', 'HH:MM');
    const data = await response.json();

    expect(data.suggestedAction).toContain('HH:MM');
  });
});

describe('errorResponse MEGA - unauthorizedError', () => {
  it('should create 401 error', async () => {
    const response = unauthorizedError();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.code).toBe('UNAUTHORIZED');
  });

  it('should use default message', async () => {
    const response = unauthorizedError();
    const data = await response.json();

    expect(data.message).toBe('Authentication required');
  });

  it('should accept custom message', async () => {
    const response = unauthorizedError('Invalid credentials');
    const data = await response.json();

    expect(data.message).toBe('Invalid credentials');
  });

  it('should include suggestedAction', async () => {
    const response = unauthorizedError();
    const data = await response.json();

    expect(data.suggestedAction).toContain('sign in');
  });
});

describe('errorResponse MEGA - insufficientCreditsError', () => {
  it('should create 403 error', async () => {
    const response = insufficientCreditsError(10, 5);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.code).toBe('INSUFFICIENT_CREDITS');
  });

  it('should include required and available in details', async () => {
    const response = insufficientCreditsError(100, 50);
    const data = await response.json();

    expect(data.details.required).toBe(100);
    expect(data.details.available).toBe(50);
    expect(data.details.deficit).toBe(50);
  });

  it('should calculate deficit correctly', async () => {
    const response = insufficientCreditsError(20, 5);
    const data = await response.json();

    expect(data.details.deficit).toBe(15);
  });
});

describe('errorResponse MEGA - rateLimitError', () => {
  it('should create 429 error', async () => {
    const response = rateLimitError(60);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should include retryAfter', async () => {
    const response = rateLimitError(120);
    const data = await response.json();

    expect(data.retryAfter).toBe(120);
  });

  it('should set Retry-After header', () => {
    const response = rateLimitError(30);
    expect(response.headers.get('Retry-After')).toBe('30');
  });

  it('should include seconds in suggestedAction', async () => {
    const response = rateLimitError(45);
    const data = await response.json();

    expect(data.suggestedAction).toContain('45');
  });
});

describe('errorResponse MEGA - notFoundError', () => {
  it('should create 404 error', async () => {
    const response = notFoundError();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.code).toBe('NOT_FOUND');
  });

  it('should use default message', async () => {
    const response = notFoundError();
    const data = await response.json();

    expect(data.message).toBe('Resource not found');
  });

  it('should include resourceType in message', async () => {
    const response = notFoundError('User');
    const data = await response.json();

    expect(data.message).toBe('User not found');
  });

  it('should include resourceType in details', async () => {
    const response = notFoundError('Profile');
    const data = await response.json();

    expect(data.details.resourceType).toBe('Profile');
  });

  it('should not include details when no resourceType', async () => {
    const response = notFoundError();
    const data = await response.json();

    expect(data.details).toBeUndefined();
  });
});

describe('errorResponse MEGA - internalError', () => {
  it('should create 500 error', async () => {
    const response = internalError();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
  });

  it('should use default message', async () => {
    const response = internalError();
    const data = await response.json();

    expect(data.message).toBe('An unexpected error occurred');
  });

  it('should accept custom message', async () => {
    const response = internalError('Custom error');
    const data = await response.json();

    expect(data.message).toBe('Custom error');
  });

  it('should include details', async () => {
    const response = internalError('Error', { code: 'ERR_001' });
    const data = await response.json();

    expect(data.details).toEqual({ code: 'ERR_001' });
  });
});

describe('errorResponse MEGA - databaseError', () => {
  it('should create 500 error', async () => {
    const response = databaseError('user fetch');
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.code).toBe('DATABASE_ERROR');
  });

  it('should include operation in message', async () => {
    const response = databaseError('profile update');
    const data = await response.json();

    expect(data.message).toContain('profile update');
  });

  it('should include operation in details', async () => {
    const response = databaseError('data deletion');
    const data = await response.json();

    expect(data.details.operation).toBe('data deletion');
  });
});

describe('errorResponse MEGA - externalApiError', () => {
  it('should create 502 error', async () => {
    const response = externalApiError('OpenAI');
    const data = await response.json();

    expect(response.status).toBe(502);
    expect(data.code).toBe('EXTERNAL_API_ERROR');
  });

  it('should include service in message', async () => {
    const response = externalApiError('Payment Gateway');
    const data = await response.json();

    expect(data.message).toContain('Payment Gateway');
  });

  it('should include statusCode in details', async () => {
    const response = externalApiError('API', 503);
    const data = await response.json();

    expect(data.details.service).toBe('API');
    expect(data.details.statusCode).toBe(503);
  });
});

describe('errorResponse MEGA - timeoutError', () => {
  it('should create 408 error', async () => {
    const response = timeoutError('AI generation', 30000);
    const data = await response.json();

    expect(response.status).toBe(408);
    expect(data.code).toBe('TIMEOUT');
  });

  it('should include operation in message', async () => {
    const response = timeoutError('data fetch', 5000);
    const data = await response.json();

    expect(data.message).toContain('data fetch');
  });

  it('should include timeout in details', async () => {
    const response = timeoutError('request', 10000);
    const data = await response.json();

    expect(data.details.operation).toBe('request');
    expect(data.details.timeoutMs).toBe(10000);
  });
});

describe('errorResponse MEGA - invalidDateError', () => {
  it('should create 400 error', async () => {
    const response = invalidDateError('2024-13-01');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_DATE');
  });

  it('should include date in details', async () => {
    const response = invalidDateError('invalid-date');
    const data = await response.json();

    expect(data.details.date).toBe('invalid-date');
  });

  it('should suggest format in suggestedAction', async () => {
    const response = invalidDateError('2024-1-1');
    const data = await response.json();

    expect(data.suggestedAction).toContain('YYYY-MM-DD');
  });
});

describe('errorResponse MEGA - invalidTimeError', () => {
  it('should create 400 error', async () => {
    const response = invalidTimeError('25:00');
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_TIME');
  });

  it('should include time in details', async () => {
    const response = invalidTimeError('invalid-time');
    const data = await response.json();

    expect(data.details.time).toBe('invalid-time');
  });

  it('should suggest format in suggestedAction', async () => {
    const response = invalidTimeError('1:30');
    const data = await response.json();

    expect(data.suggestedAction).toContain('HH:MM');
  });
});

describe('errorResponse MEGA - invalidCoordinatesError', () => {
  it('should create 400 error', async () => {
    const response = invalidCoordinatesError(100, 200);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.code).toBe('INVALID_COORDINATES');
  });

  it('should include coordinates in details', async () => {
    const response = invalidCoordinatesError(91, -181);
    const data = await response.json();

    expect(data.details.latitude).toBe(91);
    expect(data.details.longitude).toBe(-181);
  });

  it('should work without coordinates', async () => {
    const response = invalidCoordinatesError();
    const data = await response.json();

    expect(data.details.latitude).toBeUndefined();
    expect(data.details.longitude).toBeUndefined();
  });
});

describe('errorResponse MEGA - withErrorHandling', () => {
  it('should pass through successful responses', async () => {
    const handler = vi.fn().mockResolvedValue(createSuccessResponse({ test: 'data' }));
    const wrapped = withErrorHandling(handler);

    const result = await wrapped();
    const data = await result.json();

    expect(data.data.test).toBe('data');
  });

  it('should catch and convert errors', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('Test error'));
    const wrapped = withErrorHandling(handler);

    const result = await wrapped();
    const data = await result.json();

    expect(result.status).toBe(500);
    expect(data.code).toBe('INTERNAL_ERROR');
    expect(data.message).toBe('Test error');
  });

  it('should include stack in development', async () => {
    process.env.NODE_ENV = 'development';
    const error = new Error('Test');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = withErrorHandling(handler);

    const result = await wrapped();
    const data = await result.json();

    expect(data.details.stack).toBeDefined();
  });

  it('should not include stack in production', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new Error('Test');
    const handler = vi.fn().mockRejectedValue(error);
    const wrapped = withErrorHandling(handler);

    const result = await wrapped();
    const data = await result.json();

    expect(data.details?.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('should handle non-Error objects', async () => {
    const handler = vi.fn().mockRejectedValue('string error');
    const wrapped = withErrorHandling(handler);

    const result = await wrapped();

    expect(result.status).toBe(500);
  });
});

describe('errorResponse MEGA - isErrorResponse', () => {
  it('should return true for error response', () => {
    const errorData = {
      code: ERROR_CODES.VALIDATION_ERROR,
      message: 'Test',
      requestId: '123',
    };

    expect(isErrorResponse(errorData)).toBe(true);
  });

  it('should return false for success response', () => {
    const successData = {
      data: { test: 'value' },
      requestId: '123',
    };

    expect(isErrorResponse(successData)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isErrorResponse(undefined)).toBe(false);
  });

  it('should return false for string', () => {
    expect(isErrorResponse('error')).toBe(false);
  });

  it('should return false for number', () => {
    expect(isErrorResponse(123)).toBe(false);
  });

  it('should return false for object missing code', () => {
    expect(isErrorResponse({ message: 'test', requestId: '123' })).toBe(false);
  });

  it('should return false for object missing message', () => {
    expect(isErrorResponse({ code: 'TEST', requestId: '123' })).toBe(false);
  });

  it('should return false for object missing requestId', () => {
    expect(isErrorResponse({ code: 'TEST', message: 'test' })).toBe(false);
  });
});
