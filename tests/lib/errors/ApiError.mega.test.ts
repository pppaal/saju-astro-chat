/**
 * Comprehensive tests for src/lib/errors/ApiError.ts
 * Tests ApiError class and error handling utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ApiError,
  ErrorCodes,
  errorResponse,
  successResponse,
  handleApiError,
  type ErrorCode,
} from '@/lib/errors/ApiError';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ErrorCodes', () => {
  it('should have all error codes defined', () => {
    expect(ErrorCodes.INVALID_BODY).toBe('invalid_body');
    expect(ErrorCodes.MISSING_FIELDS).toBe('missing_fields');
    expect(ErrorCodes.INVALID_DATE).toBe('invalid_date');
    expect(ErrorCodes.INVALID_TIME).toBe('invalid_time');
    expect(ErrorCodes.INVALID_LATITUDE).toBe('invalid_latitude');
    expect(ErrorCodes.INVALID_LONGITUDE).toBe('invalid_longitude');
    expect(ErrorCodes.INVALID_TIMEZONE).toBe('invalid_timezone');
    expect(ErrorCodes.VALIDATION_FAILED).toBe('validation_failed');
    expect(ErrorCodes.UNAUTHORIZED).toBe('unauthorized');
    expect(ErrorCodes.NOT_AUTHENTICATED).toBe('not_authenticated');
    expect(ErrorCodes.FORBIDDEN).toBe('forbidden');
    expect(ErrorCodes.INSUFFICIENT_CREDITS).toBe('insufficient_credits');
    expect(ErrorCodes.NOT_FOUND).toBe('not_found');
    expect(ErrorCodes.RESOURCE_NOT_FOUND).toBe('resource_not_found');
    expect(ErrorCodes.RATE_LIMITED).toBe('rate_limited');
    expect(ErrorCodes.TOO_MANY_REQUESTS).toBe('too_many_requests');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('internal_error');
    expect(ErrorCodes.SERVER_ERROR).toBe('server_error');
    expect(ErrorCodes.AI_SERVICE_ERROR).toBe('ai_service_error');
    expect(ErrorCodes.DATABASE_ERROR).toBe('database_error');
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('service_unavailable');
  });

  it('should have 21 error codes', () => {
    const codes = Object.keys(ErrorCodes);
    expect(codes.length).toBe(21);
  });

  it('should have unique error code values', () => {
    const values = Object.values(ErrorCodes);
    const uniqueValues = new Set(values);
    expect(values.length).toBe(uniqueValues.size);
  });

  it('should follow snake_case naming convention', () => {
    const values = Object.values(ErrorCodes);
    values.forEach((value) => {
      expect(value).toMatch(/^[a-z_]+$/);
    });
  });
});

describe('ApiError class', () => {
  describe('Constructor', () => {
    it('should create ApiError with code and status', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
      expect(error.code).toBe(ErrorCodes.INVALID_BODY);
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });

    it('should create ApiError with details', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400, details);
      expect(error.details).toEqual(details);
    });

    it('should default statusCode to 400', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      expect(error.statusCode).toBe(400);
    });

    it('should be instanceof Error', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      expect(error instanceof Error).toBe(true);
    });

    it('should have message equal to code', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      expect(error.message).toBe(ErrorCodes.INVALID_BODY);
    });

    it('should handle all error codes', () => {
      Object.values(ErrorCodes).forEach((code) => {
        const error = new ApiError(code as ErrorCode);
        expect(error.code).toBe(code);
      });
    });

    it('should handle various status codes', () => {
      const statusCodes = [400, 401, 403, 404, 429, 500, 503];
      statusCodes.forEach((status) => {
        const error = new ApiError(ErrorCodes.INTERNAL_ERROR, status);
        expect(error.statusCode).toBe(status);
      });
    });

    it('should handle different detail types', () => {
      const detailTypes = [
        'string detail',
        { object: 'detail' },
        ['array', 'detail'],
        123,
        true,
        null,
      ];

      detailTypes.forEach((detail) => {
        const error = new ApiError(ErrorCodes.INTERNAL_ERROR, 400, detail);
        expect(error.details).toEqual(detail);
      });
    });
  });

  describe('getMessage', () => {
    it('should return English message by default', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      const message = error.getMessage();
      expect(message).toBe('Invalid request body');
    });

    it('should return English message when lang is "en"', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      const message = error.getMessage('en');
      expect(message).toBe('Invalid request body');
    });

    it('should return Korean message when lang is "ko"', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      const message = error.getMessage('ko');
      expect(message).toBe('요청 본문이 올바르지 않습니다');
    });

    it('should return messages for all error codes in English', () => {
      Object.values(ErrorCodes).forEach((code) => {
        const error = new ApiError(code as ErrorCode);
        const message = error.getMessage('en');
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      });
    });

    it('should return messages for all error codes in Korean', () => {
      Object.values(ErrorCodes).forEach((code) => {
        const error = new ApiError(code as ErrorCode);
        const message = error.getMessage('ko');
        expect(message).toBeTruthy();
        expect(typeof message).toBe('string');
      });
    });

    it('should return code if message not found', () => {
      const error = new ApiError('unknown_code' as ErrorCode);
      const message = error.getMessage();
      expect(message).toBe('unknown_code');
    });
  });

  describe('toResponse', () => {
    it('should return NextResponse', async () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
      const response = error.toResponse();
      expect(response).toBeDefined();
      expect(response.status).toBe(400);
    });

    it('should have correct status code', () => {
      const error = new ApiError(ErrorCodes.UNAUTHORIZED, 401);
      const response = error.toResponse();
      expect(response.status).toBe(401);
    });

    it('should return JSON with error and message', async () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
      const response = error.toResponse();
      const json = await response.json();
      expect(json).toHaveProperty('error');
      expect(json).toHaveProperty('message');
    });

    it('should include details when provided', async () => {
      const details = { field: 'email' };
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400, details);
      const response = error.toResponse();
      const json = await response.json();
      expect(json).toHaveProperty('details');
      expect(json.details).toEqual(details);
    });

    it('should not include details when not provided', async () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
      const response = error.toResponse();
      const json = await response.json();
      expect(json).not.toHaveProperty('details');
    });

    it('should use English messages by default', async () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      const response = error.toResponse();
      const json = await response.json();
      expect(json.message).toBe('Invalid request body');
    });

    it('should use Korean messages when specified', async () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      const response = error.toResponse('ko');
      const json = await response.json();
      expect(json.message).toBe('요청 본문이 올바르지 않습니다');
    });

    it('should include custom headers', () => {
      const error = new ApiError(ErrorCodes.RATE_LIMITED, 429);
      const headers = { 'Retry-After': '60' };
      const response = error.toResponse('en', headers);
      expect(response.headers.get('Retry-After')).toBe('60');
    });

    it('should include multiple custom headers', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY);
      const headers = {
        'X-Custom-1': 'value1',
        'X-Custom-2': 'value2',
      };
      const response = error.toResponse('en', headers);
      expect(response.headers.get('X-Custom-1')).toBe('value1');
      expect(response.headers.get('X-Custom-2')).toBe('value2');
    });
  });

  describe('Factory methods', () => {
    describe('badRequest', () => {
      it('should create 400 error with default code', () => {
        const error = ApiError.badRequest();
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe(ErrorCodes.INVALID_BODY);
      });

      it('should create 400 error with custom code', () => {
        const error = ApiError.badRequest(ErrorCodes.MISSING_FIELDS);
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe(ErrorCodes.MISSING_FIELDS);
      });

      it('should include details', () => {
        const details = { field: 'name' };
        const error = ApiError.badRequest(ErrorCodes.INVALID_BODY, details);
        expect(error.details).toEqual(details);
      });
    });

    describe('unauthorized', () => {
      it('should create 401 error', () => {
        const error = ApiError.unauthorized();
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe(ErrorCodes.UNAUTHORIZED);
      });

      it('should accept custom code', () => {
        const error = ApiError.unauthorized(ErrorCodes.NOT_AUTHENTICATED);
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe(ErrorCodes.NOT_AUTHENTICATED);
      });
    });

    describe('forbidden', () => {
      it('should create 403 error', () => {
        const error = ApiError.forbidden();
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe(ErrorCodes.FORBIDDEN);
      });

      it('should accept custom code', () => {
        const error = ApiError.forbidden(ErrorCodes.INSUFFICIENT_CREDITS);
        expect(error.statusCode).toBe(403);
        expect(error.code).toBe(ErrorCodes.INSUFFICIENT_CREDITS);
      });
    });

    describe('notFound', () => {
      it('should create 404 error', () => {
        const error = ApiError.notFound();
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe(ErrorCodes.NOT_FOUND);
      });

      it('should accept custom code', () => {
        const error = ApiError.notFound(ErrorCodes.RESOURCE_NOT_FOUND);
        expect(error.statusCode).toBe(404);
        expect(error.code).toBe(ErrorCodes.RESOURCE_NOT_FOUND);
      });
    });

    describe('rateLimited', () => {
      it('should create 429 error', () => {
        const error = ApiError.rateLimited();
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe(ErrorCodes.RATE_LIMITED);
      });
    });

    describe('internal', () => {
      it('should create 500 error', () => {
        const error = ApiError.internal();
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe(ErrorCodes.INTERNAL_ERROR);
      });

      it('should accept custom code', () => {
        const error = ApiError.internal(ErrorCodes.DATABASE_ERROR);
        expect(error.statusCode).toBe(500);
        expect(error.code).toBe(ErrorCodes.DATABASE_ERROR);
      });

      it('should include details', () => {
        const details = { message: 'Connection failed' };
        const error = ApiError.internal(ErrorCodes.DATABASE_ERROR, details);
        expect(error.details).toEqual(details);
      });
    });

    describe('serviceUnavailable', () => {
      it('should create 503 error', () => {
        const error = ApiError.serviceUnavailable();
        expect(error.statusCode).toBe(503);
        expect(error.code).toBe(ErrorCodes.SERVICE_UNAVAILABLE);
      });
    });
  });
});

describe('errorResponse function', () => {
  it('should create error response with code and status', async () => {
    const response = errorResponse(ErrorCodes.INVALID_BODY, 400);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ErrorCodes.INVALID_BODY);
  });

  it('should default to 400 status', async () => {
    const response = errorResponse(ErrorCodes.INVALID_BODY);
    expect(response.status).toBe(400);
  });

  it('should default to English messages', async () => {
    const response = errorResponse(ErrorCodes.INVALID_BODY);
    const json = await response.json();
    expect(json.message).toBe('Invalid request body');
  });

  it('should support Korean messages', async () => {
    const response = errorResponse(ErrorCodes.INVALID_BODY, 400, 'ko');
    const json = await response.json();
    expect(json.message).toBe('요청 본문이 올바르지 않습니다');
  });

  it('should include custom headers', () => {
    const headers = { 'X-Custom': 'value' };
    const response = errorResponse(ErrorCodes.INVALID_BODY, 400, 'en', headers);
    expect(response.headers.get('X-Custom')).toBe('value');
  });

  it('should work for all error codes', async () => {
    for (const code of Object.values(ErrorCodes)) {
      const response = errorResponse(code as ErrorCode);
      const json = await response.json();
      expect(json.error).toBe(code);
    }
  });
});

describe('successResponse function', () => {
  it('should create success response with data', async () => {
    const data = { result: 'success' };
    const response = successResponse(data);
    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(data);
  });

  it('should default to 200 status', () => {
    const response = successResponse({ data: 'test' });
    expect(response.status).toBe(200);
  });

  it('should accept custom status code', () => {
    const response = successResponse({ data: 'test' }, 201);
    expect(response.status).toBe(201);
  });

  it('should include custom headers', () => {
    const headers = { 'X-Custom': 'value' };
    const response = successResponse({ data: 'test' }, 200, headers);
    expect(response.headers.get('X-Custom')).toBe('value');
  });

  it('should handle different data types', async () => {
    const testData = [
      { string: 'test' },
      { array: [1, 2, 3] },
      { number: 123 },
      { boolean: true },
      { nested: { deep: { value: 'nested' } } },
    ];

    for (const data of testData) {
      const response = successResponse(data);
      const json = await response.json();
      expect(json).toEqual(data);
    }
  });
});

describe('handleApiError function', () => {
  it('should handle ApiError instances', async () => {
    const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
    const response = handleApiError(error);
    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toBe(ErrorCodes.INVALID_BODY);
  });

  it('should handle standard Error instances', async () => {
    const error = new Error('Test error');
    const response = handleApiError(error);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe(ErrorCodes.INTERNAL_ERROR);
  });

  it('should handle unknown errors', async () => {
    const error = 'string error';
    const response = handleApiError(error);
    expect(response.status).toBe(500);
    const json = await response.json();
    expect(json.error).toBe(ErrorCodes.INTERNAL_ERROR);
  });

  it('should support Korean messages', async () => {
    const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
    const response = handleApiError(error, 'ko');
    const json = await response.json();
    expect(json.message).toBe('요청 본문이 올바르지 않습니다');
  });

  it('should use default message for Error instances', async () => {
    const error = new Error('Custom message');
    const response = handleApiError(error, 'en', 'Default message');
    const json = await response.json();
    expect(json.details).toBe('Default message');
  });

  it('should include error message in details for Error instances', async () => {
    const error = new Error('Custom error message');
    const response = handleApiError(error);
    const json = await response.json();
    expect(json.details).toBe('Custom error message');
  });

  it('should handle null errors', async () => {
    const response = handleApiError(null);
    expect(response.status).toBe(500);
  });

  it('should handle undefined errors', async () => {
    const response = handleApiError(undefined);
    expect(response.status).toBe(500);
  });

  it('should handle numeric errors', async () => {
    const response = handleApiError(123);
    expect(response.status).toBe(500);
  });

  it('should handle boolean errors', async () => {
    const response = handleApiError(false);
    expect(response.status).toBe(500);
  });

  it('should handle object errors', async () => {
    const response = handleApiError({ message: 'error' });
    expect(response.status).toBe(500);
  });
});

describe('Integration tests', () => {
  it('should create and handle errors consistently', async () => {
    const error = ApiError.badRequest(ErrorCodes.MISSING_FIELDS);
    const response1 = error.toResponse('en');
    const response2 = handleApiError(error, 'en');

    const json1 = await response1.json();
    const json2 = await response2.json();

    expect(json1).toEqual(json2);
  });

  it('should work with all factory methods', async () => {
    const errors = [
      ApiError.badRequest(),
      ApiError.unauthorized(),
      ApiError.forbidden(),
      ApiError.notFound(),
      ApiError.rateLimited(),
      ApiError.internal(),
      ApiError.serviceUnavailable(),
    ];

    for (const error of errors) {
      const response = error.toResponse();
      const json = await response.json();
      expect(json).toHaveProperty('error');
      expect(json).toHaveProperty('message');
    }
  });

  it('should maintain error code through conversions', async () => {
    const originalCode = ErrorCodes.INSUFFICIENT_CREDITS;
    const error = new ApiError(originalCode, 403);
    const response = handleApiError(error);
    const json = await response.json();
    expect(json.error).toBe(originalCode);
  });
});

describe('Edge cases', () => {
  it('should handle very long error details', () => {
    const longDetails = 'x'.repeat(10000);
    const error = new ApiError(ErrorCodes.INTERNAL_ERROR, 500, longDetails);
    expect(error.details).toBe(longDetails);
  });

  it('should handle circular reference in details', () => {
    const circular: any = { name: 'test' };
    circular.self = circular;
    expect(() => {
      new ApiError(ErrorCodes.INTERNAL_ERROR, 500, circular);
    }).not.toThrow();
  });

  it('should handle special characters in details', async () => {
    const details = { message: '<script>alert("xss")</script>' };
    const error = new ApiError(ErrorCodes.INTERNAL_ERROR, 500, details);
    const response = error.toResponse();
    const json = await response.json();
    expect(json.details).toEqual(details);
  });

  it('should handle Unicode in error messages', async () => {
    const error = new ApiError(ErrorCodes.INVALID_BODY);
    const response = error.toResponse('ko');
    const json = await response.json();
    expect(json.message).toContain('올바르지');
  });
});