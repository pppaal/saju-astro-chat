import { describe, it, expect } from 'vitest';

describe('API Error Handler Module', () => {
  it('should export ErrorCodes object', async () => {
    const { ErrorCodes } = await import('@/lib/api');
    expect(ErrorCodes).toBeDefined();
    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
  });

  it('should export createErrorResponse function', async () => {
    const { createErrorResponse } = await import('@/lib/api');
    expect(typeof createErrorResponse).toBe('function');
  });

  it('should export createSuccessResponse function', async () => {
    const { createSuccessResponse } = await import('@/lib/api');
    expect(typeof createSuccessResponse).toBe('function');
  });

  it('should export withErrorHandler function', async () => {
    const { withErrorHandler } = await import('@/lib/api');
    expect(typeof withErrorHandler).toBe('function');
  });
});

describe('ErrorCodes', () => {
  it('should have all client error codes', async () => {
    const { ErrorCodes } = await import('@/lib/api');

    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST');
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCodes.RATE_LIMITED).toBe('RATE_LIMITED');
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR');
    expect(ErrorCodes.PAYLOAD_TOO_LARGE).toBe('PAYLOAD_TOO_LARGE');
  });

  it('should have all server error codes', async () => {
    const { ErrorCodes } = await import('@/lib/api');

    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCodes.SERVICE_UNAVAILABLE).toBe('SERVICE_UNAVAILABLE');
    expect(ErrorCodes.BACKEND_ERROR).toBe('BACKEND_ERROR');
    expect(ErrorCodes.TIMEOUT).toBe('TIMEOUT');
    expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR');
  });
});

describe('createErrorResponse', () => {
  it('should create error response with correct status', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
    });

    expect(response.status).toBe(400);
  });

  it('should create 401 for unauthorized', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.UNAUTHORIZED,
    });

    expect(response.status).toBe(401);
  });

  it('should create 403 for forbidden', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.FORBIDDEN,
    });

    expect(response.status).toBe(403);
  });

  it('should create 404 for not found', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.NOT_FOUND,
    });

    expect(response.status).toBe(404);
  });

  it('should create 429 for rate limited', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
    });

    expect(response.status).toBe(429);
  });

  it('should create 500 for internal error', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
    });

    expect(response.status).toBe(500);
  });

  it('should include error code in response body', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
    });

    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('BAD_REQUEST');
  });

  it('should use custom message when provided', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      message: 'Custom error message',
    });

    const body = await response.json();
    expect(body.error.message).toBe('Custom error message');
  });

  it('should use localized message based on locale', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const responseKo = createErrorResponse({
      code: ErrorCodes.BAD_REQUEST,
      locale: 'ko',
    });

    const bodyKo = await responseKo.json();
    expect(bodyKo.error.message).toContain('잘못된');
  });

  it('should include custom headers', async () => {
    const { createErrorResponse, ErrorCodes } = await import('@/lib/api');

    const response = createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      headers: { 'Retry-After': '60' },
    });

    expect(response.headers.get('Retry-After')).toBe('60');
  });
});

describe('createSuccessResponse', () => {
  it('should create success response with data', async () => {
    const { createSuccessResponse } = await import('@/lib/api');

    const response = createSuccessResponse({ id: 1, name: 'Test' });
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.data).toEqual({ id: 1, name: 'Test' });
  });

  it('should use default 200 status', async () => {
    const { createSuccessResponse } = await import('@/lib/api');

    const response = createSuccessResponse({ message: 'ok' });
    expect(response.status).toBe(200);
  });

  it('should allow custom status', async () => {
    const { createSuccessResponse } = await import('@/lib/api');

    const response = createSuccessResponse({ id: 1 }, { status: 201 });
    expect(response.status).toBe(201);
  });

  it('should include meta when provided', async () => {
    const { createSuccessResponse } = await import('@/lib/api');

    const response = createSuccessResponse(
      { items: [] },
      { meta: { page: 1, total: 100 } }
    );

    const body = await response.json();
    expect(body.meta).toEqual({ page: 1, total: 100 });
  });

  it('should include custom headers', async () => {
    const { createSuccessResponse } = await import('@/lib/api');

    const response = createSuccessResponse(
      { data: 'test' },
      { headers: { 'X-Custom': 'value' } }
    );

    expect(response.headers.get('X-Custom')).toBe('value');
  });
});

describe('withErrorHandler', () => {
  it('should wrap handler function', async () => {
    const { withErrorHandler } = await import('@/lib/api');

    const handler = async () => new Response('OK');
    const wrapped = withErrorHandler(handler, '/test');

    expect(typeof wrapped).toBe('function');
  });
});
