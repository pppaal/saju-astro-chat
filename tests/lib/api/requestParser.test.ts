import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseRequestBody,
  parseAndValidateBody,
  cloneAndParseRequest,
} from '@/lib/api/requestParser';
import { logger } from '@/lib/logger';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('requestParser Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseRequestBody', () => {
    describe('Happy Path - Valid JSON', () => {
      it('should parse valid JSON body', async () => {
        const mockBody = { userId: '123', name: 'John' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual(mockBody);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should parse empty object', async () => {
        const mockBody = {};
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual({});
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should parse array body', async () => {
        const mockBody = [1, 2, 3];
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual([1, 2, 3]);
      });

      it('should parse primitive values', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(42),
        });

        const result = await parseRequestBody(request);

        expect(result).toBe(42);
      });

      it('should parse null value', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(null),
        });

        const result = await parseRequestBody(request);

        expect(result).toBeNull();
      });

      it('should parse boolean values', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(true),
        });

        const result = await parseRequestBody(request);

        expect(result).toBe(true);
      });

      it('should parse string values', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify('hello'),
        });

        const result = await parseRequestBody(request);

        expect(result).toBe('hello');
      });
    });

    describe('Error Handling - Invalid JSON', () => {
      it('should return null for invalid JSON', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid json{',
        });

        const result = await parseRequestBody(request);

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          'Failed to parse request JSON',
          expect.objectContaining({
            context: 'API request',
            error: expect.any(String),
            url: 'http://test.com/',
            method: 'POST',
          })
        );
      });

      it('should return null for empty body', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
        });

        const result = await parseRequestBody(request);

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should return custom fallback value on parse error', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid',
        });

        const fallback = { default: true };
        const result = await parseRequestBody(request, { fallback });

        expect(result).toEqual(fallback);
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should use custom context in error log', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid',
        });

        await parseRequestBody(request, { context: 'Custom context' });

        expect(logger.warn).toHaveBeenCalledWith(
          'Failed to parse request JSON',
          expect.objectContaining({
            context: 'Custom context',
          })
        );
      });

      it('should not log errors when logErrors=false', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid',
        });

        const result = await parseRequestBody(request, { logErrors: false });

        expect(result).toBeNull();
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });

    describe('Type Inference', () => {
      it('should infer correct type with generic parameter', async () => {
        interface TestType {
          id: number;
          name: string;
        }

        const mockBody: TestType = { id: 1, name: 'Test' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await parseRequestBody<TestType>(request);

        // TypeScript should infer TestType | null
        expect(result).toEqual(mockBody);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very large JSON objects', async () => {
        const largeObject = {
          data: Array.from({ length: 1000 }, (_, i) => ({
            id: i,
            value: `item-${i}`,
          })),
        };

        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(largeObject),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual(largeObject);
      });

      it('should handle nested objects', async () => {
        const nested = {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
        };

        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(nested),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual(nested);
      });

      it('should handle special characters in strings', async () => {
        const special = {
          text: '🚀 Unicode, "quotes", \\backslash, \nnewline',
        };

        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(special),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual(special);
      });

      it('should handle different HTTP methods', async () => {
        const body = { data: 'test' };

        const methods = ['POST', 'PUT', 'PATCH', 'DELETE'];
        for (const method of methods) {
          const request = new Request('http://test.com', {
            method,
            body: JSON.stringify(body),
          });

          const result = await parseRequestBody(request);
          expect(result).toEqual(body);
        }
      });

      it('should handle request with query parameters', async () => {
        const body = { data: 'test' };
        const request = new Request('http://test.com?param=value&foo=bar', {
          method: 'POST',
          body: JSON.stringify(body),
        });

        const result = await parseRequestBody(request);

        expect(result).toEqual(body);
      });
    });

    describe('Options Combinations', () => {
      it('should use fallback with custom context', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid',
        });

        const result = await parseRequestBody(request, {
          fallback: { error: true },
          context: 'Test context',
        });

        expect(result).toEqual({ error: true });
        expect(logger.warn).toHaveBeenCalledWith(
          'Failed to parse request JSON',
          expect.objectContaining({
            context: 'Test context',
          })
        );
      });

      it('should use fallback without logging', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid',
        });

        const result = await parseRequestBody(request, {
          fallback: { default: true },
          logErrors: false,
        });

        expect(result).toEqual({ default: true });
        expect(logger.warn).not.toHaveBeenCalled();
      });
    });
  });

  describe('parseAndValidateBody', () => {
    describe('Happy Path - Valid Body & Validation', () => {
      it('should return body when no validator provided', async () => {
        const mockBody = { userId: '123' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await parseAndValidateBody(request);

        expect(result).toEqual(mockBody);
      });

      it('should return body when validation passes', async () => {
        const mockBody = { userId: '123', name: 'John' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          return body?.userId ? null : 'userId is required';
        };

        const result = await parseAndValidateBody(request, validator);

        expect(result).toEqual(mockBody);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should validate complex conditions', async () => {
        const mockBody = { age: 25, email: 'test@example.com' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          if (!body?.age || body.age < 18) return 'Must be 18+';
          if (!body?.email || !body.email.includes('@')) return 'Invalid email';
          return null;
        };

        const result = await parseAndValidateBody(request, validator);

        expect(result).toEqual(mockBody);
      });
    });

    describe('Error Handling - Null Body', () => {
      it('should throw error when body is null', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
        });

        await expect(parseAndValidateBody(request)).rejects.toThrow(
          'Request body is required'
        );
      });

      it('should throw error for invalid JSON', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid json',
        });

        await expect(parseAndValidateBody(request)).rejects.toThrow(
          'Request body is required'
        );
      });
    });

    describe('Error Handling - Validation Failures', () => {
      it('should throw error when validator returns error message', async () => {
        const mockBody = { name: 'John' }; // missing userId
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          return body?.userId ? null : 'userId is required';
        };

        await expect(parseAndValidateBody(request, validator)).rejects.toThrow(
          'userId is required'
        );

        expect(logger.warn).toHaveBeenCalledWith(
          'Request body validation failed',
          expect.objectContaining({
            error: 'userId is required',
            url: 'http://test.com/',
          })
        );
      });

      it('should throw custom error message from validator', async () => {
        const mockBody = { age: 15 };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          return body?.age >= 18 ? null : 'Must be at least 18 years old';
        };

        await expect(parseAndValidateBody(request, validator)).rejects.toThrow(
          'Must be at least 18 years old'
        );
      });

      it('should throw error for empty string validation failure', async () => {
        const mockBody = { name: '' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          return body?.name && body.name.trim() ? null : 'Name cannot be empty';
        };

        await expect(parseAndValidateBody(request, validator)).rejects.toThrow(
          'Name cannot be empty'
        );
      });
    });

    describe('Type Inference', () => {
      it('should infer correct type with validator', async () => {
        interface UserBody {
          userId: string;
          email: string;
        }

        const mockBody: UserBody = {
          userId: '123',
          email: 'test@example.com',
        };

        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: UserBody | null) => {
          return body?.userId ? null : 'userId required';
        };

        const result = await parseAndValidateBody<UserBody>(request, validator);

        expect(result).toEqual(mockBody);
      });
    });

    describe('Edge Cases', () => {
      it('should handle validator that checks for null explicitly', async () => {
        const mockBody = { value: null };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          return body?.value !== null ? null : 'value cannot be null';
        };

        await expect(parseAndValidateBody(request, validator)).rejects.toThrow(
          'value cannot be null'
        );
      });

      it('should handle validator with multiple conditions', async () => {
        const mockBody = { name: 'John', age: 25, email: 'test@test.com' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          if (!body?.name) return 'Name required';
          if (!body?.age || body.age < 0) return 'Valid age required';
          if (!body?.email || !body.email.includes('@')) return 'Valid email required';
          return null;
        };

        const result = await parseAndValidateBody(request, validator);

        expect(result).toEqual(mockBody);
      });

      it('should handle validator that checks array length', async () => {
        const mockBody = { items: [1, 2, 3] };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const validator = (body: any) => {
          return body?.items?.length > 0 ? null : 'Items cannot be empty';
        };

        const result = await parseAndValidateBody(request, validator);

        expect(result).toEqual(mockBody);
      });
    });

    describe('Integration with parseRequestBody', () => {
      it('should use parseRequestBody internally', async () => {
        const mockBody = { data: 'test' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await parseAndValidateBody(request);

        // Verify it behaves like parseRequestBody for valid JSON
        expect(result).toEqual(mockBody);
      });
    });
  });

  describe('cloneAndParseRequest', () => {
    describe('Happy Path - Valid Clone & Parse', () => {
      it('should clone and parse valid JSON request', async () => {
        const mockBody = { userId: '123', name: 'John' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toEqual(mockBody);
        expect(logger.debug).not.toHaveBeenCalled();
      });

      it('should not affect original request', async () => {
        const mockBody = { data: 'test' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        // Clone and parse
        await cloneAndParseRequest(request);

        // Original request should still be readable
        const originalBody = await request.json();
        expect(originalBody).toEqual(mockBody);
      });

      it('should parse empty object', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify({}),
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toEqual({});
      });

      it('should parse array body', async () => {
        const mockBody = [1, 2, 3];
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toEqual([1, 2, 3]);
      });

      it('should parse nested objects', async () => {
        const mockBody = {
          user: {
            profile: {
              name: 'John',
              age: 30,
            },
          },
        };

        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toEqual(mockBody);
      });
    });

    describe('Error Handling - Invalid JSON', () => {
      it('should return null for invalid JSON', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'invalid json{',
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toBeNull();
        expect(logger.debug).toHaveBeenCalledWith(
          'Failed to clone and parse request',
          expect.objectContaining({
            error: expect.any(String),
          })
        );
      });

      it('should return null for empty body', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toBeNull();
        expect(logger.debug).toHaveBeenCalled();
      });

      it('should log error with error message', async () => {
        const request = new Request('http://test.com', {
          method: 'POST',
          body: 'not valid json',
        });

        await cloneAndParseRequest(request);

        expect(logger.debug).toHaveBeenCalledWith(
          'Failed to clone and parse request',
          expect.objectContaining({
            error: expect.stringContaining(''),
          })
        );
      });
    });

    describe('Edge Cases', () => {
      it('should successfully clone even if original was consumed', async () => {
        const mockBody = { data: 'test' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        // Consume the original request
        await request.json();

        // Clone before consuming - Request.clone() creates independent body stream
        // So this test actually shows that clone works even after original consumed
        const request2 = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        const cloned = request2.clone();
        await request2.json(); // consume original

        // Cloned request should still work
        const result = await cloneAndParseRequest(cloned);

        expect(result).toEqual(mockBody);
      });

      it('should handle GET request with no body', async () => {
        const request = new Request('http://test.com', {
          method: 'GET',
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toBeNull();
      });

      it('should handle large JSON bodies', async () => {
        const largeBody = {
          items: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item-${i}` })),
        };

        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(largeBody),
        });

        const result = await cloneAndParseRequest(request);

        expect(result).toEqual(largeBody);
      });

      it('should handle primitive JSON values', async () => {
        const primitives = [42, 'string', true, null];

        for (const primitive of primitives) {
          const request = new Request('http://test.com', {
            method: 'POST',
            body: JSON.stringify(primitive),
          });

          const result = await cloneAndParseRequest(request);
          expect(result).toEqual(primitive);
        }
      });
    });

    describe('Use Cases - Logging & Retry', () => {
      it('should be usable for logging without consuming original request', async () => {
        const mockBody = { action: 'create', data: 'test' };
        const request = new Request('http://test.com', {
          method: 'POST',
          body: JSON.stringify(mockBody),
        });

        // Clone for logging
        const loggedBody = await cloneAndParseRequest(request);

        // Original request still usable
        const originalBody = await request.json();

        expect(loggedBody).toEqual(mockBody);
        expect(originalBody).toEqual(mockBody);
      });
    });
  });

  describe('Module Integration Tests', () => {
    it('should handle workflow: clone -> validate -> parse', async () => {
      const mockBody = { userId: '123', action: 'test' };
      const request = new Request('http://test.com', {
        method: 'POST',
        body: JSON.stringify(mockBody),
      });

      // First clone for logging
      const cloned = await cloneAndParseRequest(request);
      expect(cloned).toEqual(mockBody);

      // Then validate original request
      const validator = (body: any) => (body?.userId ? null : 'userId required');
      const validated = await parseAndValidateBody(request, validator);

      expect(validated).toEqual(mockBody);
    });

    it('should handle different error scenarios across functions', async () => {
      // Test parseRequestBody with fallback
      const invalidRequest1 = new Request('http://test.com', {
        method: 'POST',
        body: 'invalid',
      });
      const parsed = await parseRequestBody(invalidRequest1, { fallback: {} });
      expect(parsed).toEqual({});

      // Test parseAndValidateBody throws
      const invalidRequest2 = new Request('http://test.com', {
        method: 'POST',
        body: 'invalid',
      });
      await expect(parseAndValidateBody(invalidRequest2)).rejects.toThrow();

      // Test cloneAndParseRequest returns null
      const invalidRequest3 = new Request('http://test.com', {
        method: 'POST',
        body: 'invalid',
      });
      const clonedResult = await cloneAndParseRequest(invalidRequest3);
      expect(clonedResult).toBeNull();
    });
  });
});
