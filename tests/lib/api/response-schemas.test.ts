import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';
import {
  SuccessResponseSchema,
  ErrorResponseSchema,
  ApiResponseSchema,
  CreditInfoSchema,
  CreditErrorResponseSchema,
  PremiumTierSchema,
  UserPlanInfoSchema,
  RateLimitErrorResponseSchema,
  RateLimitHeadersSchema,
  DreamAnalysisResponseSchema,
  TarotReadingResponseSchema,
  CompatibilityResponseSchema,
  SSEDataSchema,
  SSEErrorSchema,
  ValidationErrorResponseSchema,
  UnauthorizedResponseSchema,
  ForbiddenResponseSchema,
  validateSuccessResponse,
  validateErrorResponse,
  safeValidateResponse,
  createValidatedSuccessResponse,
  createValidatedErrorResponse,
  isSuccessResponse,
  isErrorResponse,
  isCreditError,
  ResponseSchemas,
} from '@/lib/api/response-schemas';

describe('SuccessResponseSchema', () => {
  it('should validate a correct success response', () => {
    const schema = SuccessResponseSchema(z.object({ name: z.string() }));
    const result = schema.safeParse({
      success: true,
      data: { name: 'test' },
    });
    expect(result.success).toBe(true);
  });

  it('should accept optional meta', () => {
    const schema = SuccessResponseSchema(z.string());
    const result = schema.safeParse({
      success: true,
      data: 'hello',
      meta: { timestamp: '2024-01-01T00:00:00Z', requestId: 'abc' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject when success is false', () => {
    const schema = SuccessResponseSchema(z.string());
    const result = schema.safeParse({
      success: false,
      data: 'hello',
    });
    expect(result.success).toBe(false);
  });

  it('should reject when data doesnt match schema', () => {
    const schema = SuccessResponseSchema(z.number());
    const result = schema.safeParse({
      success: true,
      data: 'not a number',
    });
    expect(result.success).toBe(false);
  });
});

describe('ErrorResponseSchema', () => {
  it('should validate a correct error response', () => {
    const result = ErrorResponseSchema.safeParse({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        status: 404,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject status below 400', () => {
    const result = ErrorResponseSchema.safeParse({
      success: false,
      error: {
        code: 'OK',
        message: 'Success',
        status: 200,
      },
    });
    expect(result.success).toBe(false);
  });

  it('should reject status above 599', () => {
    const result = ErrorResponseSchema.safeParse({
      success: false,
      error: {
        code: 'UNKNOWN',
        message: 'Unknown',
        status: 600,
      },
    });
    expect(result.success).toBe(false);
  });

  it('should accept optional details', () => {
    const result = ErrorResponseSchema.safeParse({
      success: false,
      error: {
        code: 'ERROR',
        message: 'Error',
        status: 500,
        details: { extra: 'info' },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('ApiResponseSchema', () => {
  it('should accept success response', () => {
    const schema = ApiResponseSchema(z.string());
    const result = schema.safeParse({
      success: true,
      data: 'hello',
    });
    expect(result.success).toBe(true);
  });

  it('should accept error response', () => {
    const schema = ApiResponseSchema(z.string());
    const result = schema.safeParse({
      success: false,
      error: { code: 'ERR', message: 'msg', status: 500 },
    });
    expect(result.success).toBe(true);
  });
});

describe('CreditInfoSchema', () => {
  it('should validate credit info', () => {
    const result = CreditInfoSchema.safeParse({
      remaining: 10,
      type: 'reading',
      consumed: 5,
    });
    expect(result.success).toBe(true);
  });

  it('should reject negative remaining', () => {
    const result = CreditInfoSchema.safeParse({ remaining: -1 });
    expect(result.success).toBe(false);
  });
});

describe('CreditErrorResponseSchema', () => {
  it('should validate credit error', () => {
    const result = CreditErrorResponseSchema.safeParse({
      error: 'No credits',
      code: 'no_credits',
      remaining: 0,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid code', () => {
    const result = CreditErrorResponseSchema.safeParse({
      error: 'Error',
      code: 'invalid_code',
      remaining: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('PremiumTierSchema', () => {
  it('should accept valid tiers', () => {
    expect(PremiumTierSchema.safeParse('free').success).toBe(true);
    expect(PremiumTierSchema.safeParse('basic').success).toBe(true);
    expect(PremiumTierSchema.safeParse('premium').success).toBe(true);
    expect(PremiumTierSchema.safeParse('enterprise').success).toBe(true);
  });

  it('should reject invalid tiers', () => {
    expect(PremiumTierSchema.safeParse('gold').success).toBe(false);
  });
});

describe('UserPlanInfoSchema', () => {
  it('should validate complete plan info', () => {
    const result = UserPlanInfoSchema.safeParse({
      tier: 'premium',
      isPremium: true,
      credits: { remaining: 100 },
      features: ['tarot', 'saju'],
    });
    expect(result.success).toBe(true);
  });
});

describe('RateLimitErrorResponseSchema', () => {
  it('should validate rate limit error', () => {
    const result = RateLimitErrorResponseSchema.safeParse({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests',
        status: 429,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('RateLimitHeadersSchema', () => {
  it('should validate rate limit headers', () => {
    const result = RateLimitHeadersSchema.safeParse({
      'Retry-After': '60',
      'X-RateLimit-Limit': '100',
      'X-RateLimit-Remaining': '0',
    });
    expect(result.success).toBe(true);
  });
});

describe('SSEDataSchema', () => {
  it('should validate SSE data with default event', () => {
    const result = SSEDataSchema.safeParse({
      data: 'some text',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.event).toBe('message');
    }
  });

  it('should accept valid event types', () => {
    for (const event of ['message', 'error', 'done', 'chunk']) {
      const result = SSEDataSchema.safeParse({ event, data: 'text' });
      expect(result.success).toBe(true);
    }
  });
});

describe('ValidationErrorResponseSchema', () => {
  it('should validate validation error', () => {
    const result = ValidationErrorResponseSchema.safeParse({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        status: 422,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('UnauthorizedResponseSchema', () => {
  it('should validate 401 response', () => {
    const result = UnauthorizedResponseSchema.safeParse({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Not authenticated',
        status: 401,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('ForbiddenResponseSchema', () => {
  it('should validate 403 response', () => {
    const result = ForbiddenResponseSchema.safeParse({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'Access denied',
        status: 403,
      },
    });
    expect(result.success).toBe(true);
  });
});

describe('validateSuccessResponse', () => {
  it('should return parsed data for valid response', () => {
    const result = validateSuccessResponse(z.string(), {
      success: true,
      data: 'hello',
    });
    expect(result.data).toBe('hello');
  });

  it('should throw for invalid response', () => {
    expect(() =>
      validateSuccessResponse(z.string(), {
        success: false,
        data: 'hello',
      })
    ).toThrow();
  });
});

describe('validateErrorResponse', () => {
  it('should return parsed error for valid response', () => {
    const result = validateErrorResponse({
      success: false,
      error: { code: 'ERR', message: 'msg', status: 500 },
    });
    expect(result.error.code).toBe('ERR');
  });

  it('should throw for invalid response', () => {
    expect(() => validateErrorResponse({ success: true })).toThrow();
  });
});

describe('safeValidateResponse', () => {
  it('should return data for valid input', () => {
    const result = safeValidateResponse(z.string(), 'hello');
    expect(result).toBe('hello');
  });

  it('should return null for invalid input', () => {
    const result = safeValidateResponse(z.number(), 'not a number');
    expect(result).toBeNull();
  });
});

describe('createValidatedSuccessResponse', () => {
  it('should create valid success response', () => {
    const result = createValidatedSuccessResponse(z.string(), 'test data');
    expect(result.success).toBe(true);
    expect(result.data).toBe('test data');
  });

  it('should include meta when provided', () => {
    const result = createValidatedSuccessResponse(z.string(), 'data', {
      timestamp: '2024-01-01T00:00:00Z',
    });
    expect(result.meta?.timestamp).toBe('2024-01-01T00:00:00Z');
  });
});

describe('createValidatedErrorResponse', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should create valid error response', () => {
    const result = createValidatedErrorResponse('NOT_FOUND', 'Not found', 404);
    expect(result.success).toBe(false);
    expect(result.error.code).toBe('NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('should include details in development', () => {
    process.env.NODE_ENV = 'development';
    const result = createValidatedErrorResponse('ERR', 'msg', 500, { debug: true });
    expect(result.error.details).toEqual({ debug: true });
  });

  it('should exclude details in production', () => {
    process.env.NODE_ENV = 'production';
    const result = createValidatedErrorResponse('ERR', 'msg', 500, { debug: true });
    expect(result.error.details).toBeUndefined();
  });
});

describe('isSuccessResponse', () => {
  it('should return true for success response', () => {
    expect(isSuccessResponse({ success: true, data: {} })).toBe(true);
  });

  it('should return false for error response', () => {
    expect(isSuccessResponse({ success: false, error: {} })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isSuccessResponse(null)).toBe(false);
  });

  it('should return false for non-object', () => {
    expect(isSuccessResponse('string')).toBe(false);
  });

  it('should return false when data is missing', () => {
    expect(isSuccessResponse({ success: true })).toBe(false);
  });
});

describe('isErrorResponse', () => {
  it('should return true for error response', () => {
    expect(isErrorResponse({ success: false, error: {} })).toBe(true);
  });

  it('should return false for success response', () => {
    expect(isErrorResponse({ success: true, data: {} })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isErrorResponse(null)).toBe(false);
  });

  it('should return false when error is missing', () => {
    expect(isErrorResponse({ success: false })).toBe(false);
  });
});

describe('isCreditError', () => {
  it('should return true for valid credit error', () => {
    expect(
      isCreditError({
        error: 'No credits',
        code: 'no_credits',
        remaining: 0,
      })
    ).toBe(true);
  });

  it('should return false for non-credit error', () => {
    expect(isCreditError({ error: 'Unknown', code: 'unknown', remaining: 0 })).toBe(false);
  });

  it('should return false for null', () => {
    expect(isCreditError(null)).toBe(false);
  });
});

describe('ResponseSchemas', () => {
  it('should export all schemas', () => {
    expect(ResponseSchemas.Success).toBeDefined();
    expect(ResponseSchemas.Error).toBeDefined();
    expect(ResponseSchemas.ApiResponse).toBeDefined();
    expect(ResponseSchemas.CreditError).toBeDefined();
    expect(ResponseSchemas.RateLimitError).toBeDefined();
    expect(ResponseSchemas.ValidationError).toBeDefined();
    expect(ResponseSchemas.Unauthorized).toBeDefined();
    expect(ResponseSchemas.Forbidden).toBeDefined();
    expect(ResponseSchemas.DreamAnalysis).toBeDefined();
    expect(ResponseSchemas.TarotReading).toBeDefined();
    expect(ResponseSchemas.DestinyMap).toBeDefined();
    expect(ResponseSchemas.Compatibility).toBeDefined();
  });
});
