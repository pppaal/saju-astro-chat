/**
 * Response Builders Tests
 * API 응답 빌더 유틸리티 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  successResponse,
  errorResponse,
  validationErrorResponse,
  missingFieldsResponse,
  serverErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  methodNotAllowedResponse,
  jsonErrorResponse,
} from '@/lib/api/response-builders';

describe('ResponseBuilders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('successResponse', () => {
    it('should create success response with data', async () => {
      const data = { name: 'test', value: 123 };
      const response = successResponse(data);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.name).toBe('test');
      expect(json.value).toBe(123);
    });

    it('should merge additional fields', async () => {
      const data = { name: 'test' };
      const additionalFields = { extra: 'field', count: 5 };
      const response = successResponse(data, additionalFields);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.name).toBe('test');
      expect(json.extra).toBe('field');
      expect(json.count).toBe(5);
    });

    it('should return 200 status', () => {
      const response = successResponse({ data: 'test' });
      expect(response.status).toBe(200);
    });

    it('should handle empty object', async () => {
      const response = successResponse({});
      const json = await response.json();

      expect(json.success).toBe(true);
    });

    it('should handle array data', async () => {
      const data = { items: [1, 2, 3] };
      const response = successResponse(data);
      const json = await response.json();

      expect(json.success).toBe(true);
      expect(json.items).toEqual([1, 2, 3]);
    });
  });

  describe('errorResponse', () => {
    it('should create error response with message', async () => {
      const response = errorResponse('Something went wrong');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Something went wrong');
    });

    it('should use default status 400', () => {
      const response = errorResponse('Bad request');
      expect(response.status).toBe(400);
    });

    it('should use custom status code', () => {
      const response = errorResponse('Forbidden', 403);
      expect(response.status).toBe(403);
    });

    it('should handle various status codes', () => {
      expect(errorResponse('test', 401).status).toBe(401);
      expect(errorResponse('test', 404).status).toBe(404);
      expect(errorResponse('test', 500).status).toBe(500);
      expect(errorResponse('test', 503).status).toBe(503);
    });
  });

  describe('validationErrorResponse', () => {
    it('should create validation error with field and message', async () => {
      const response = validationErrorResponse('email', 'Invalid email format');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Validation failed for email: Invalid email format');
      expect(json.field).toBe('email');
    });

    it('should return 400 status', () => {
      const response = validationErrorResponse('name', 'Required');
      expect(response.status).toBe(400);
    });

    it('should handle complex field names', async () => {
      const response = validationErrorResponse('user.address.zipCode', 'Invalid format');
      const json = await response.json();

      expect(json.field).toBe('user.address.zipCode');
      expect(json.error).toContain('user.address.zipCode');
    });
  });

  describe('missingFieldsResponse', () => {
    it('should list single missing field', async () => {
      const response = missingFieldsResponse('name');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Missing required fields: name');
      expect(json.missingFields).toEqual(['name']);
    });

    it('should list multiple missing fields', async () => {
      const response = missingFieldsResponse('name', 'email', 'password');
      const json = await response.json();

      expect(json.error).toBe('Missing required fields: name, email, password');
      expect(json.missingFields).toEqual(['name', 'email', 'password']);
    });

    it('should return 400 status', () => {
      const response = missingFieldsResponse('field1');
      expect(response.status).toBe(400);
    });
  });

  describe('serverErrorResponse', () => {
    it('should create server error with default message', async () => {
      const response = serverErrorResponse();
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Internal server error');
    });

    it('should create server error with custom message', async () => {
      const response = serverErrorResponse('Database connection failed');
      const json = await response.json();

      expect(json.error).toBe('Database connection failed');
    });

    it('should return 500 status', () => {
      const response = serverErrorResponse();
      expect(response.status).toBe(500);
    });

    it('should log error when provided', () => {
      const error = new Error('Test error');
      serverErrorResponse('Error occurred', error);

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[Server Error]:'),
        expect.objectContaining({ message: 'Test error' })
      );
    });

    it('should not log when error is not provided', () => {
      serverErrorResponse('Error occurred');

      expect(console.error).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects', () => {
      serverErrorResponse('Error', { code: 'ERR_001' });

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[Server Error]:'),
        expect.objectContaining({ code: 'ERR_001' })
      );
    });
  });

  describe('notFoundResponse', () => {
    it('should create not found response with default resource', async () => {
      const response = notFoundResponse();
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Resource not found');
    });

    it('should create not found response with custom resource', async () => {
      const response = notFoundResponse('User');
      const json = await response.json();

      expect(json.error).toBe('User not found');
    });

    it('should return 404 status', () => {
      const response = notFoundResponse();
      expect(response.status).toBe(404);
    });

    it('should handle various resource names', async () => {
      expect((await notFoundResponse('Order').json()).error).toBe('Order not found');
      expect((await notFoundResponse('Product').json()).error).toBe('Product not found');
      expect((await notFoundResponse('Session').json()).error).toBe('Session not found');
    });
  });

  describe('unauthorizedResponse', () => {
    it('should create unauthorized response with default message', async () => {
      const response = unauthorizedResponse();
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('should create unauthorized response with custom message', async () => {
      const response = unauthorizedResponse('Invalid API key');
      const json = await response.json();

      expect(json.error).toBe('Invalid API key');
    });

    it('should return 401 status', () => {
      const response = unauthorizedResponse();
      expect(response.status).toBe(401);
    });
  });

  describe('methodNotAllowedResponse', () => {
    it('should list single allowed method', async () => {
      const response = methodNotAllowedResponse('GET');
      const json = await response.json();

      expect(json.success).toBe(false);
      expect(json.error).toBe('Method not allowed');
      expect(json.allowedMethods).toEqual(['GET']);
    });

    it('should list multiple allowed methods', async () => {
      const response = methodNotAllowedResponse('GET', 'POST', 'PUT');
      const json = await response.json();

      expect(json.allowedMethods).toEqual(['GET', 'POST', 'PUT']);
    });

    it('should return 405 status', () => {
      const response = methodNotAllowedResponse('GET');
      expect(response.status).toBe(405);
    });

    it('should set Allow header', () => {
      const response = methodNotAllowedResponse('GET', 'POST');
      expect(response.headers.get('Allow')).toBe('GET, POST');
    });

    it('should handle all HTTP methods', async () => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      const response = methodNotAllowedResponse(...methods);
      const json = await response.json();

      expect(json.allowedMethods).toEqual(methods);
      expect(response.headers.get('Allow')).toBe('GET, POST, PUT, PATCH, DELETE');
    });
  });

  describe('jsonErrorResponse', () => {
    it('should create plain Response with JSON error', async () => {
      const response = jsonErrorResponse('Stream error');
      const json = await response.json();

      expect(json.error).toBe('Stream error');
    });

    it('should use default status 400', () => {
      const response = jsonErrorResponse('Error');
      expect(response.status).toBe(400);
    });

    it('should use custom status code', () => {
      const response = jsonErrorResponse('Not found', 404);
      expect(response.status).toBe(404);
    });

    it('should set correct Content-Type header', () => {
      const response = jsonErrorResponse('Error');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });

    it('should return Response (not NextResponse)', () => {
      const response = jsonErrorResponse('Error');
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in error messages', async () => {
      const response = errorResponse('Error with "quotes" and <tags>');
      const json = await response.json();

      expect(json.error).toBe('Error with "quotes" and <tags>');
    });

    it('should handle unicode in messages', async () => {
      const response = errorResponse('오류가 발생했습니다');
      const json = await response.json();

      expect(json.error).toBe('오류가 발생했습니다');
    });

    it('should handle empty string message', async () => {
      const response = errorResponse('');
      const json = await response.json();

      expect(json.error).toBe('');
    });

    it('should handle very long messages', async () => {
      const longMessage = 'x'.repeat(10000);
      const response = errorResponse(longMessage);
      const json = await response.json();

      expect(json.error.length).toBe(10000);
    });
  });
});
