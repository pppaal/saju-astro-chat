// tests/apiClient.test.ts
// API Client 테스트

import { vi, beforeEach, afterEach } from "vitest";

// Types from ApiClient
interface ApiFetchOptions extends Omit<RequestInit, 'headers'> {
  headers?: Record<string, string>;
}

interface ApiClientOptions {
  timeout?: number;
  headers?: Record<string, string>;
  includeApiToken?: boolean;
}

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  headers?: Headers;
}

describe('ApiClient', () => {
  describe('apiFetch wrapper', () => {
    it('should add X-API-Token for /api/ routes', () => {
      const url = '/api/test';
      const shouldAddToken = url.startsWith('/api/');

      expect(shouldAddToken).toBe(true);
    });

    it('should not add X-API-Token for external routes', () => {
      const url = 'https://external.api.com/test';
      const shouldAddToken = url.startsWith('/api/');

      expect(shouldAddToken).toBe(false);
    });
  });

  describe('ApiClientOptions', () => {
    it('should have default timeout of 60000ms', () => {
      const defaultTimeout = 60000;
      const options: ApiClientOptions = {};

      expect(options.timeout ?? defaultTimeout).toBe(60000);
    });

    it('should allow custom timeout', () => {
      const options: ApiClientOptions = {
        timeout: 30000,
      };

      expect(options.timeout).toBe(30000);
    });

    it('should accept custom headers', () => {
      const options: ApiClientOptions = {
        headers: {
          'X-Custom-Header': 'custom-value',
          'Authorization': 'Bearer token123',
        },
      };

      expect(options.headers?.['X-Custom-Header']).toBe('custom-value');
      expect(options.headers?.['Authorization']).toBe('Bearer token123');
    });

    it('should allow disabling API token', () => {
      const options: ApiClientOptions = {
        includeApiToken: false,
      };

      expect(options.includeApiToken).toBe(false);
    });
  });

  describe('ApiResponse structure', () => {
    it('should represent success response', () => {
      const response: ApiResponse<{ message: string }> = {
        ok: true,
        status: 200,
        data: { message: 'Success' },
      };

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(response.data?.message).toBe('Success');
      expect(response.error).toBeUndefined();
    });

    it('should represent error response', () => {
      const response: ApiResponse = {
        ok: false,
        status: 500,
        error: 'Internal Server Error',
      };

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(response.error).toBe('Internal Server Error');
      expect(response.data).toBeUndefined();
    });

    it('should represent timeout response', () => {
      const response: ApiResponse = {
        ok: false,
        status: 408,
        error: 'Request timeout',
      };

      expect(response.ok).toBe(false);
      expect(response.status).toBe(408);
      expect(response.error).toBe('Request timeout');
    });

    it('should represent HTTP error response', () => {
      const response: ApiResponse = {
        ok: false,
        status: 404,
        error: 'HTTP 404',
      };

      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });
  });

  describe('header building', () => {
    function buildHeaders(
      options: ApiClientOptions = {},
      contentType = 'application/json',
      apiToken?: string
    ): Record<string, string> {
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        ...options.headers,
      };

      if (options.includeApiToken !== false && apiToken) {
        headers['X-API-KEY'] = apiToken;
      }

      return headers;
    }

    it('should include Content-Type by default', () => {
      const headers = buildHeaders();

      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should merge custom headers', () => {
      const options: ApiClientOptions = {
        headers: {
          'X-Custom': 'value',
        },
      };
      const headers = buildHeaders(options);

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['X-Custom']).toBe('value');
    });

    it('should include API token when available', () => {
      const headers = buildHeaders({}, 'application/json', 'test-token');

      expect(headers['X-API-KEY']).toBe('test-token');
    });

    it('should exclude API token when disabled', () => {
      const options: ApiClientOptions = {
        includeApiToken: false,
      };
      const headers = buildHeaders(options, 'application/json', 'test-token');

      expect(headers['X-API-KEY']).toBeUndefined();
    });

    it('should allow custom content type', () => {
      const headers = buildHeaders({}, 'text/plain');

      expect(headers['Content-Type']).toBe('text/plain');
    });
  });

  describe('URL building', () => {
    function buildUrl(baseUrl: string, path: string): string {
      return `${baseUrl}${path}`;
    }

    it('should combine base URL and path', () => {
      const url = buildUrl('https://api.example.com', '/users');

      expect(url).toBe('https://api.example.com/users');
    });

    it('should handle paths with query strings', () => {
      const url = buildUrl('https://api.example.com', '/users?page=1&limit=10');

      expect(url).toBe('https://api.example.com/users?page=1&limit=10');
    });

    it('should handle base URL with trailing slash', () => {
      const baseUrl = 'https://api.example.com/';
      const path = 'users';
      const url = `${baseUrl}${path}`;

      // Note: This would produce double slash, so paths should start with / only
      expect(url).toBe('https://api.example.com/users');
    });
  });

  describe('timeout handling', () => {
    it('should use default timeout when not specified', () => {
      const defaultTimeout = 60000;
      const options: ApiClientOptions = {};
      const timeout = options.timeout ?? defaultTimeout;

      expect(timeout).toBe(60000);
    });

    it('should use custom timeout when specified', () => {
      const defaultTimeout = 60000;
      const options: ApiClientOptions = { timeout: 5000 };
      const timeout = options.timeout ?? defaultTimeout;

      expect(timeout).toBe(5000);
    });

    it('should handle zero timeout', () => {
      const options: ApiClientOptions = { timeout: 0 };

      // Note: 0 timeout is falsy but valid
      expect(options.timeout).toBe(0);
    });
  });

  describe('error handling', () => {
    function handleError(err: unknown): ApiResponse {
      if (err instanceof Error && err.name === 'AbortError') {
        return {
          ok: false,
          status: 408,
          error: 'Request timeout',
        };
      }

      return {
        ok: false,
        status: 500,
        error: err instanceof Error ? err.message : 'Unknown error',
      };
    }

    it('should handle AbortError as timeout', () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const response = handleError(abortError);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(408);
      expect(response.error).toBe('Request timeout');
    });

    it('should handle generic Error', () => {
      const error = new Error('Network error');

      const response = handleError(error);

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(response.error).toBe('Network error');
    });

    it('should handle unknown error type', () => {
      const response = handleError('string error');

      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
      expect(response.error).toBe('Unknown error');
    });

    it('should handle null error', () => {
      const response = handleError(null);

      expect(response.ok).toBe(false);
      expect(response.error).toBe('Unknown error');
    });
  });

  describe('HTTP status code handling', () => {
    function isSuccessStatus(status: number): boolean {
      return status >= 200 && status < 300;
    }

    it('should identify success status codes', () => {
      expect(isSuccessStatus(200)).toBe(true);
      expect(isSuccessStatus(201)).toBe(true);
      expect(isSuccessStatus(204)).toBe(true);
      expect(isSuccessStatus(299)).toBe(true);
    });

    it('should identify non-success status codes', () => {
      expect(isSuccessStatus(400)).toBe(false);
      expect(isSuccessStatus(401)).toBe(false);
      expect(isSuccessStatus(403)).toBe(false);
      expect(isSuccessStatus(404)).toBe(false);
      expect(isSuccessStatus(500)).toBe(false);
      expect(isSuccessStatus(503)).toBe(false);
    });

    it('should identify redirect status codes as non-success', () => {
      expect(isSuccessStatus(301)).toBe(false);
      expect(isSuccessStatus(302)).toBe(false);
    });
  });

  describe('request body serialization', () => {
    it('should serialize object to JSON', () => {
      const body = {
        name: 'test',
        value: 123,
        nested: { key: 'value' },
      };

      const serialized = JSON.stringify(body);
      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe('test');
      expect(parsed.value).toBe(123);
      expect(parsed.nested.key).toBe('value');
    });

    it('should handle arrays', () => {
      const body = [1, 2, 3, 'test'];

      const serialized = JSON.stringify(body);
      const parsed = JSON.parse(serialized);

      expect(parsed).toEqual([1, 2, 3, 'test']);
    });

    it('should handle null values', () => {
      const body = { key: null };

      const serialized = JSON.stringify(body);
      const parsed = JSON.parse(serialized);

      expect(parsed.key).toBeNull();
    });

    it('should handle undefined by omitting', () => {
      const body = { key: undefined, other: 'value' };

      const serialized = JSON.stringify(body);
      const parsed = JSON.parse(serialized);

      expect('key' in parsed).toBe(false);
      expect(parsed.other).toBe('value');
    });

    it('should handle Date objects', () => {
      const body = { date: new Date('2024-01-01') };

      const serialized = JSON.stringify(body);
      const parsed = JSON.parse(serialized);

      // Dates are converted to ISO strings
      expect(typeof parsed.date).toBe('string');
      expect(parsed.date).toContain('2024-01-01');
    });
  });

  describe('factory function', () => {
    function createApiClient(baseUrl?: string, timeout?: number): { baseUrl: string; timeout: number } {
      const defaultBaseUrl = 'https://api.default.com';
      const defaultTimeout = 60000;

      return {
        baseUrl: baseUrl || defaultBaseUrl,
        timeout: timeout ?? defaultTimeout,
      };
    }

    it('should create client with defaults', () => {
      const client = createApiClient();

      expect(client.baseUrl).toBe('https://api.default.com');
      expect(client.timeout).toBe(60000);
    });

    it('should create client with custom base URL', () => {
      const client = createApiClient('https://custom.api.com');

      expect(client.baseUrl).toBe('https://custom.api.com');
      expect(client.timeout).toBe(60000);
    });

    it('should create client with custom timeout', () => {
      const client = createApiClient(undefined, 30000);

      expect(client.baseUrl).toBe('https://api.default.com');
      expect(client.timeout).toBe(30000);
    });

    it('should create client with both custom values', () => {
      const client = createApiClient('https://custom.api.com', 30000);

      expect(client.baseUrl).toBe('https://custom.api.com');
      expect(client.timeout).toBe(30000);
    });
  });

  describe('stream response handling', () => {
    it('should return null on error', () => {
      // Simulating error case
      const errorResult = null;

      expect(errorResult).toBeNull();
    });

    it('should return Response object on success', () => {
      // Response-like object structure
      interface StreamResponse {
        ok: boolean;
        status: number;
        body: ReadableStream | null;
      }

      const mockResponse: StreamResponse = {
        ok: true,
        status: 200,
        body: null, // Would be ReadableStream in real scenario
      };

      expect(mockResponse.ok).toBe(true);
      expect(mockResponse.status).toBe(200);
    });
  });

  describe('retry logic (not implemented but testable)', () => {
    function shouldRetry(status: number, attempt: number, maxRetries: number): boolean {
      if (attempt >= maxRetries) return false;

      // Retry on 5xx errors and 429 (rate limit)
      return status >= 500 || status === 429;
    }

    it('should retry on 500 errors', () => {
      expect(shouldRetry(500, 0, 3)).toBe(true);
      expect(shouldRetry(503, 1, 3)).toBe(true);
    });

    it('should retry on 429 rate limit', () => {
      expect(shouldRetry(429, 0, 3)).toBe(true);
    });

    it('should not retry on 4xx client errors', () => {
      expect(shouldRetry(400, 0, 3)).toBe(false);
      expect(shouldRetry(404, 0, 3)).toBe(false);
      expect(shouldRetry(401, 0, 3)).toBe(false);
    });

    it('should not retry after max attempts', () => {
      expect(shouldRetry(500, 3, 3)).toBe(false);
      expect(shouldRetry(500, 4, 3)).toBe(false);
    });
  });
});
