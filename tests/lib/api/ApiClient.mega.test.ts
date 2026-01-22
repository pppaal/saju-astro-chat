/**
 * ApiClient MEGA Test Suite
 * Comprehensive testing for API client functionality
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient, apiFetch, createApiClient, apiClient } from '@/lib/api/ApiClient';

// Mock fetch globally
global.fetch = vi.fn();

// Mock dependencies
vi.mock('@/lib/backend-url', () => ({
  getBackendUrl: vi.fn(() => 'http://localhost:5000'),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

// Test constants
const TEST_CONSTANTS = {
  URLS: {
    BACKEND: 'http://localhost:5000',
    TEST: 'http://test.com',
    CUSTOM: 'http://custom.com',
    API_PATH: '/api/test',
    OTHER_PATH: '/other/path',
    STREAM_PATH: '/api/stream',
    SSE_PATH: '/api/sse',
  },
  TOKENS: {
    API: 'test-token',
    ADMIN: 'secret-token',
  },
  TIMEOUTS: {
    DEFAULT: 5000,
    CUSTOM: 10000,
    SHORT: 100,
    LONG: 30000,
  },
  STATUS_CODES: {
    SUCCESS: [200, 201, 204],
    CLIENT_ERROR: [400, 401, 403, 404, 429],
    SERVER_ERROR: [500, 502, 503, 504],
  },
} as const;

// Helper functions
interface MockResponseOptions {
  data?: unknown;
  status?: number;
  headers?: Record<string, string>;
}

/**
 * Test builder class for creating mock responses and fetch calls
 */
class ApiClientTestBuilder {
  /**
   * Creates a mock Response object with JSON data
   */
  static createMockResponse(options: MockResponseOptions = {}): Response {
    const { data, status = 200, headers = {} } = options;
    const responseHeaders = new Headers(headers);

    if (data !== undefined && !responseHeaders.has('Content-Type')) {
      responseHeaders.set('Content-Type', 'application/json');
    }

    return new Response(
      data !== undefined ? JSON.stringify(data) : '',
      { status, headers: responseHeaders }
    );
  }

  /**
   * Creates a mock error Response
   */
  static createErrorResponse(status: number, message = ''): Response {
    return new Response(message, { status });
  }

  /**
   * Sets up fetch mock to resolve with given response
   */
  static mockFetchWith(response: Response): void {
    vi.mocked(fetch).mockResolvedValue(response);
  }

  /**
   * Sets up fetch mock to reject with given error
   */
  static mockFetchError(error: Error | string): void {
    vi.mocked(fetch).mockRejectedValue(error);
  }

  /**
   * Expects fetch to have been called with specific URL and options
   */
  static expectFetchCalledWith(
    url: string,
    expectedOptions: Partial<RequestInit>
  ): void {
    expect(fetch).toHaveBeenCalledWith(url, expect.objectContaining(expectedOptions));
  }

  /**
   * Expects fetch headers to contain specific header
   */
  static expectHeadersContain(
    url: string,
    headerKey: string,
    headerValue: string
  ): void {
    expect(fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        headers: expect.objectContaining({
          [headerKey]: headerValue,
        }),
      })
    );
  }

  /**
   * Expects fetch headers NOT to contain specific header
   */
  static expectHeadersNotContain(
    url: string,
    headerKey: string
  ): void {
    expect(fetch).toHaveBeenCalledWith(
      url,
      expect.objectContaining({
        headers: expect.not.objectContaining({
          [headerKey]: expect.any(String),
        }),
      })
    );
  }
}

// Backward compatibility aliases
const createMockResponse = ApiClientTestBuilder.createMockResponse;
const createErrorResponse = ApiClientTestBuilder.createErrorResponse;

// Global test setup
beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.NEXT_PUBLIC_API_TOKEN;
  delete process.env.ADMIN_API_TOKEN;
});

describe('ApiClient MEGA - apiFetch', () => {
  it('should call fetch with URL and options', async () => {
    ApiClientTestBuilder.mockFetchWith(new Response());
    await apiFetch('/test', { method: 'GET' });

    ApiClientTestBuilder.expectFetchCalledWith('/test', { method: 'GET' });
  });

  it('should add X-API-Token for /api/ routes', async () => {
    process.env.NEXT_PUBLIC_API_TOKEN = TEST_CONSTANTS.TOKENS.API;
    ApiClientTestBuilder.mockFetchWith(new Response());

    await apiFetch(TEST_CONSTANTS.URLS.API_PATH);

    ApiClientTestBuilder.expectHeadersContain(
      TEST_CONSTANTS.URLS.API_PATH,
      'X-API-Token',
      TEST_CONSTANTS.TOKENS.API
    );
  });

  it('should not add token for non-API routes', async () => {
    process.env.NEXT_PUBLIC_API_TOKEN = TEST_CONSTANTS.TOKENS.API;
    ApiClientTestBuilder.mockFetchWith(new Response());

    await apiFetch(TEST_CONSTANTS.URLS.OTHER_PATH);

    ApiClientTestBuilder.expectHeadersNotContain(
      TEST_CONSTANTS.URLS.OTHER_PATH,
      'X-API-Token'
    );
  });

  it('should merge custom headers', async () => {
    ApiClientTestBuilder.mockFetchWith(new Response());

    await apiFetch('/test', {
      headers: { 'Custom-Header': 'value' },
    });

    ApiClientTestBuilder.expectHeadersContain('/test', 'Custom-Header', 'value');
  });

  it('should handle no options', async () => {
    ApiClientTestBuilder.mockFetchWith(new Response());
    await apiFetch('/test');

    expect(fetch).toHaveBeenCalledWith('/test', expect.any(Object));
  });
});

describe('ApiClient MEGA - constructor', () => {
  it('should use default backend URL', () => {
    const client = new ApiClient();
    expect(client).toBeDefined();
  });

  it('should accept custom base URL', () => {
    const client = new ApiClient(TEST_CONSTANTS.URLS.CUSTOM);
    expect(client).toBeDefined();
  });

  it('should accept custom timeout', () => {
    const client = new ApiClient(undefined, TEST_CONSTANTS.TIMEOUTS.LONG);
    expect(client).toBeDefined();
  });

  it('should use both custom URL and timeout', () => {
    const client = new ApiClient(TEST_CONSTANTS.URLS.CUSTOM, TEST_CONSTANTS.TIMEOUTS.LONG);
    expect(client).toBeDefined();
  });
});

describe('ApiClient MEGA - POST requests', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST, TEST_CONSTANTS.TIMEOUTS.DEFAULT);
  });

  it('should make successful POST request', async () => {
    ApiClientTestBuilder.mockFetchWith(
      createMockResponse({ data: { result: 'success' } })
    );

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, { data: 'test' });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ result: 'success' });
  });

  it('should handle POST error responses', async () => {
    ApiClientTestBuilder.mockFetchWith(createErrorResponse(400));

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    expect(result.ok).toBe(false);
    expect(result.status).toBe(400);
    expect(result.error).toBe('HTTP 400');
  });


  it('should include Authorization header with token', async () => {
    process.env.ADMIN_API_TOKEN = TEST_CONSTANTS.TOKENS.ADMIN;
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST);

    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    ApiClientTestBuilder.expectHeadersContain(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      'Authorization',
      `Bearer ${TEST_CONSTANTS.TOKENS.ADMIN}`
    );
  });

  it('should include X-API-KEY header with token', async () => {
    process.env.ADMIN_API_TOKEN = TEST_CONSTANTS.TOKENS.ADMIN;
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST);

    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    ApiClientTestBuilder.expectHeadersContain(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      'X-API-KEY',
      TEST_CONSTANTS.TOKENS.ADMIN
    );
  });

  it('should not include token when includeApiToken is false', async () => {
    process.env.ADMIN_API_TOKEN = TEST_CONSTANTS.TOKENS.ADMIN;
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST);

    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.post(TEST_CONSTANTS.URLS.API_PATH, {}, { includeApiToken: false });

    ApiClientTestBuilder.expectHeadersNotContain(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      'Authorization'
    );
  });

  it('should include custom headers', async () => {
    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.post(TEST_CONSTANTS.URLS.API_PATH, {}, {
      headers: { 'X-Custom': 'value' },
    });

    ApiClientTestBuilder.expectHeadersContain(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      'X-Custom',
      'value'
    );
  });

  it('should stringify body', async () => {
    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.post(TEST_CONSTANTS.URLS.API_PATH, { foo: 'bar' });

    ApiClientTestBuilder.expectFetchCalledWith(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      { body: JSON.stringify({ foo: 'bar' }) }
    );
  });

  it('should complete request successfully', async () => {
    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: { success: true } }));

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({ success: true });
  });

  it('should include response headers', async () => {
    ApiClientTestBuilder.mockFetchWith(
      createMockResponse({ data: {}, status: 200, headers: { 'X-Response': 'value' } })
    );

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    expect(result.headers).toBeDefined();
    expect(result.headers?.get('X-Response')).toBe('value');
  });

  it('should handle network errors', async () => {
    ApiClientTestBuilder.mockFetchError(new Error('Network error'));

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBe('Network error');
  });

  it('should handle non-Error exceptions', async () => {
    ApiClientTestBuilder.mockFetchError('string error');

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toBe('Unknown error');
  });
});

describe('ApiClient MEGA - GET requests', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST, TEST_CONSTANTS.TIMEOUTS.DEFAULT);
  });

  it('should make successful GET request', async () => {
    ApiClientTestBuilder.mockFetchWith(
      createMockResponse({ data: { result: 'success' } })
    );

    const result = await client.get(TEST_CONSTANTS.URLS.API_PATH);

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.data).toEqual({ result: 'success' });
  });

  it('should handle GET error responses', async () => {
    ApiClientTestBuilder.mockFetchWith(createErrorResponse(404));

    const result = await client.get(TEST_CONSTANTS.URLS.API_PATH);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.error).toBe('HTTP 404');
  });


  it('should use GET method', async () => {
    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.get(TEST_CONSTANTS.URLS.API_PATH);

    ApiClientTestBuilder.expectFetchCalledWith(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      { method: 'GET' }
    );
  });

  it('should include headers', async () => {
    ApiClientTestBuilder.mockFetchWith(createMockResponse({ data: {} }));

    await client.get(TEST_CONSTANTS.URLS.API_PATH, {
      headers: { 'X-Custom': 'value' },
    });

    ApiClientTestBuilder.expectHeadersContain(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.API_PATH}`,
      'X-Custom',
      'value'
    );
  });

  it('should handle network errors', async () => {
    ApiClientTestBuilder.mockFetchError(new Error('Network error'));

    const result = await client.get(TEST_CONSTANTS.URLS.API_PATH);

    expect(result.ok).toBe(false);
    expect(result.status).toBe(500);
  });
});

describe('ApiClient MEGA - postStream', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST);
  });

  it('should return Response for streaming', async () => {
    const mockResponse = new Response('stream data');
    ApiClientTestBuilder.mockFetchWith(mockResponse);

    const result = await client.postStream(TEST_CONSTANTS.URLS.STREAM_PATH, {});

    expect(result).toBe(mockResponse);
  });

  it('should include cache: no-store', async () => {
    ApiClientTestBuilder.mockFetchWith(new Response());

    await client.postStream(TEST_CONSTANTS.URLS.STREAM_PATH, {});

    ApiClientTestBuilder.expectFetchCalledWith(
      `${TEST_CONSTANTS.URLS.TEST}${TEST_CONSTANTS.URLS.STREAM_PATH}`,
      { cache: 'no-store' }
    );
  });

  it('should throw on error', async () => {
    ApiClientTestBuilder.mockFetchError(new Error('Stream error'));

    await expect(client.postStream(TEST_CONSTANTS.URLS.STREAM_PATH, {})).rejects.toThrow('Stream error');
  });

  it('should return response successfully', async () => {
    const mockResponse = new Response('stream data');
    ApiClientTestBuilder.mockFetchWith(mockResponse);

    const response = await client.postStream(TEST_CONSTANTS.URLS.STREAM_PATH, {});

    expect(response).toBe(mockResponse);
  });
});

describe('ApiClient MEGA - postSSEStream', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST);
  });

  it('should return success for valid SSE stream', async () => {
    const mockResponse = new Response('data: test\n\n', {
      headers: { 'content-type': 'text/event-stream' },
    });
    ApiClientTestBuilder.mockFetchWith(mockResponse);

    const result = await client.postSSEStream(TEST_CONSTANTS.URLS.SSE_PATH, {});

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.response).toBe(mockResponse);
    }
  });

  it('should reject non-SSE responses', async () => {
    ApiClientTestBuilder.mockFetchWith(new Response('', {
      headers: { 'content-type': 'application/json' },
    }));

    const result = await client.postSSEStream(TEST_CONSTANTS.URLS.SSE_PATH, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Response is not SSE stream');
    }
  });

  it('should handle HTTP errors', async () => {
    ApiClientTestBuilder.mockFetchWith(new Response('Error message', {
      status: 500,
    }));

    const result = await client.postSSEStream(TEST_CONSTANTS.URLS.SSE_PATH, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(500);
      expect(result.error).toBe('Error message');
    }
  });

  it('should handle network errors', async () => {
    ApiClientTestBuilder.mockFetchError(new Error('Network failed'));

    const result = await client.postSSEStream(TEST_CONSTANTS.URLS.SSE_PATH, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Network failed');
      expect(result.status).toBe(500);
    }
  });

  it('should handle error reading response text', async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      text: vi.fn().mockRejectedValue(new Error('Cannot read')),
    };
    ApiClientTestBuilder.mockFetchWith(mockResponse as any);

    const result = await client.postSSEStream(TEST_CONSTANTS.URLS.SSE_PATH, {});

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Unknown error');
    }
  });
});

describe('ApiClient MEGA - createApiClient factory', () => {
  it('should create new instance', () => {
    const client = createApiClient();
    expect(client).toBeInstanceOf(ApiClient);
  });

  it('should create with custom URL', () => {
    const client = createApiClient(TEST_CONSTANTS.URLS.CUSTOM);
    expect(client).toBeInstanceOf(ApiClient);
  });

  it('should create with custom timeout', () => {
    const client = createApiClient(undefined, TEST_CONSTANTS.TIMEOUTS.LONG);
    expect(client).toBeInstanceOf(ApiClient);
  });

  it('should create multiple independent instances', () => {
    const client1 = createApiClient(TEST_CONSTANTS.URLS.CUSTOM);
    const client2 = createApiClient(TEST_CONSTANTS.URLS.TEST);

    expect(client1).not.toBe(client2);
  });
});

describe('ApiClient MEGA - singleton apiClient', () => {
  it('should export singleton instance', () => {
    expect(apiClient).toBeInstanceOf(ApiClient);
  });

  it('should be reusable', () => {
    const ref1 = apiClient;
    const ref2 = apiClient;

    expect(ref1).toBe(ref2);
  });
});

describe('ApiClient MEGA - All status codes', () => {
  let client: ApiClient;

  beforeEach(() => {
    client = new ApiClient(TEST_CONSTANTS.URLS.TEST);
  });

  const allStatusCodes = [
    ...TEST_CONSTANTS.STATUS_CODES.SUCCESS,
    ...TEST_CONSTANTS.STATUS_CODES.CLIENT_ERROR,
    ...TEST_CONSTANTS.STATUS_CODES.SERVER_ERROR,
  ];

  const isSuccessStatus = (status: number) => status >= 200 && status < 300;

  it.each(allStatusCodes)('should handle status %i for POST', async (status) => {
    const response = isSuccessStatus(status)
      ? createMockResponse({ data: {}, status })
      : createErrorResponse(status);

    ApiClientTestBuilder.mockFetchWith(response);

    const result = await client.post(TEST_CONSTANTS.URLS.API_PATH, {});

    expect(result.status).toBe(status);
    expect(result.ok).toBe(isSuccessStatus(status));
  });

  it.each(allStatusCodes)('should handle status %i for GET', async (status) => {
    const response = isSuccessStatus(status)
      ? createMockResponse({ data: {}, status })
      : createErrorResponse(status);

    ApiClientTestBuilder.mockFetchWith(response);

    const result = await client.get(TEST_CONSTANTS.URLS.API_PATH);

    expect(result.status).toBe(status);
    expect(result.ok).toBe(isSuccessStatus(status));
  });
});