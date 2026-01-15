import { describe, it, expect, vi } from 'vitest';
import { ApiError, ErrorCodes, errorResponse, successResponse, handleApiError } from '@/lib/errors/ApiError';

vi.mock('@/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

describe('ApiError', () => {
  describe('ErrorCodes', () => {
    it('should have all standard error codes', () => {
      expect(ErrorCodes.INVALID_BODY).toBe('invalid_body');
      expect(ErrorCodes.UNAUTHORIZED).toBe('unauthorized');
      expect(ErrorCodes.FORBIDDEN).toBe('forbidden');
      expect(ErrorCodes.NOT_FOUND).toBe('not_found');
      expect(ErrorCodes.RATE_LIMITED).toBe('rate_limited');
      expect(ErrorCodes.INTERNAL_ERROR).toBe('internal_error');
    });
  });

  describe('ApiError class', () => {
    it('should create error with code and status', () => {
      const error = new ApiError(ErrorCodes.INVALID_BODY, 400);
      expect(error.code).toBe('invalid_body');
      expect(error.statusCode).toBe(400);
      expect(error.name).toBe('ApiError');
    });

    it('should include details', () => {
      const details = { field: 'email', reason: 'invalid' };
      const error = new ApiError(ErrorCodes.VALIDATION_FAILED, 400, details);
      expect(error.details).toEqual(details);
    });

    it('should get localized message in English', () => {
      const error = new ApiError(ErrorCodes.UNAUTHORIZED, 401);
      expect(error.getMessage('en')).toBe('Unauthorized');
    });

    it('should get localized message in Korean', () => {
      const error = new ApiError(ErrorCodes.UNAUTHORIZED, 401);
      expect(error.getMessage('ko')).toBe('인증이 필요합니다');
    });

    it('should convert to NextResponse', async () => {
      const error = new ApiError(ErrorCodes.NOT_FOUND, 404);
      const response = error.toResponse('en');
      expect(response.status).toBe(404);
      
      const body = await response.json();
      expect(body.error).toBe('not_found');
      expect(body.message).toBe('Not found');
    });
  });

  describe('Factory Methods', () => {
    it('should create badRequest error', () => {
      const error = ApiError.badRequest();
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe(ErrorCodes.INVALID_BODY);
    });

    it('should create unauthorized error', () => {
      const error = ApiError.unauthorized();
      expect(error.statusCode).toBe(401);
    });

    it('should create forbidden error', () => {
      const error = ApiError.forbidden();
      expect(error.statusCode).toBe(403);
    });

    it('should create notFound error', () => {
      const error = ApiError.notFound();
      expect(error.statusCode).toBe(404);
    });

    it('should create rateLimited error', () => {
      const error = ApiError.rateLimited();
      expect(error.statusCode).toBe(429);
    });

    it('should create internal error', () => {
      const error = ApiError.internal();
      expect(error.statusCode).toBe(500);
    });

    it('should create serviceUnavailable error', () => {
      const error = ApiError.serviceUnavailable();
      expect(error.statusCode).toBe(503);
    });
  });

  describe('errorResponse', () => {
    it('should create error response', async () => {
      const response = errorResponse(ErrorCodes.INVALID_BODY, 400, 'en');
      expect(response.status).toBe(400);
      
      const body = await response.json();
      expect(body.error).toBe('invalid_body');
    });
  });

  describe('successResponse', () => {
    it('should create success response', async () => {
      const data = { result: 'success' };
      const response = successResponse(data);
      expect(response.status).toBe(200);
      
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it('should allow custom status code', async () => {
      const response = successResponse({ created: true }, 201);
      expect(response.status).toBe(201);
    });
  });

  describe('handleApiError', () => {
    it('should handle ApiError', async () => {
      const apiError = new ApiError(ErrorCodes.NOT_FOUND, 404);
      const response = handleApiError(apiError, 'en');
      expect(response.status).toBe(404);
    });

    it('should handle standard Error', async () => {
      const error = new Error('Something went wrong');
      const response = handleApiError(error, 'en');
      expect(response.status).toBe(500);
    });

    it('should handle unknown errors', async () => {
      const response = handleApiError('string error', 'en');
      expect(response.status).toBe(500);
    });
  });
});
