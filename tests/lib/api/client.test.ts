import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should export ApiClient class', async () => {
    const { ApiClient } = await import('@/lib/api/ApiClient');

    expect(ApiClient).toBeDefined();
    expect(typeof ApiClient).toBe('function');
  });

  it('should export apiClient instance', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient');

    expect(apiClient).toBeDefined();
  });

  it('should export createApiClient function', async () => {
    const { createApiClient } = await import('@/lib/api/ApiClient');

    expect(typeof createApiClient).toBe('function');
  });

  it('should have get method on apiClient', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient');

    expect(typeof apiClient.get).toBe('function');
  });

  it('should have post method on apiClient', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient');

    expect(typeof apiClient.post).toBe('function');
  });

  it('should have postStream method on apiClient', async () => {
    const { apiClient } = await import('@/lib/api/ApiClient');

    expect(typeof apiClient.postStream).toBe('function');
  });
});

describe('Error Handler', () => {
  it('should export ErrorCodes object', async () => {
    const { ErrorCodes } = await import('@/lib/api/errorHandler');

    expect(ErrorCodes).toBeDefined();
    expect(typeof ErrorCodes).toBe('object');
  });

  it('should export createErrorResponse function', async () => {
    const { createErrorResponse } = await import('@/lib/api/errorHandler');

    expect(typeof createErrorResponse).toBe('function');
  });

  it('should export withErrorHandler function', async () => {
    const { withErrorHandler } = await import('@/lib/api/errorHandler');

    expect(typeof withErrorHandler).toBe('function');
  });

  it('should export createSuccessResponse function', async () => {
    const { createSuccessResponse } = await import('@/lib/api/errorHandler');

    expect(typeof createSuccessResponse).toBe('function');
  });
});

describe('API Middleware', () => {
  it('should export extractLocale function', async () => {
    const { extractLocale } = await import('@/lib/api/middleware');

    expect(typeof extractLocale).toBe('function');
  });

  it('should export withApiMiddleware function', async () => {
    const { withApiMiddleware } = await import('@/lib/api/middleware');

    expect(typeof withApiMiddleware).toBe('function');
  });

  it('should export validateRequired function', async () => {
    const { validateRequired } = await import('@/lib/api/middleware');

    expect(typeof validateRequired).toBe('function');
  });

  it('should export apiError function', async () => {
    const { apiError } = await import('@/lib/api/middleware');

    expect(typeof apiError).toBe('function');
  });

  it('should export apiSuccess function', async () => {
    const { apiSuccess } = await import('@/lib/api/middleware');

    expect(typeof apiSuccess).toBe('function');
  });
});

describe('API Validation', () => {
  it('should export validateFields function', async () => {
    const { validateFields } = await import('@/lib/api/validation');

    expect(typeof validateFields).toBe('function');
  });

  it('should export Patterns object', async () => {
    const { Patterns } = await import('@/lib/api/validation');

    expect(Patterns).toBeDefined();
    expect(Patterns.EMAIL).toBeDefined();
    expect(Patterns.DATE).toBeDefined();
    expect(Patterns.TIME).toBeDefined();
  });

  it('should export CommonValidators object', async () => {
    const { CommonValidators } = await import('@/lib/api/validation');

    expect(CommonValidators).toBeDefined();
  });

  it('should export validateDestinyMapInput function', async () => {
    const { validateDestinyMapInput } = await import('@/lib/api/validation');

    expect(typeof validateDestinyMapInput).toBe('function');
  });

  it('should export validateTarotInput function', async () => {
    const { validateTarotInput } = await import('@/lib/api/validation');

    expect(typeof validateTarotInput).toBe('function');
  });

  it('should export validateDreamInput function', async () => {
    const { validateDreamInput } = await import('@/lib/api/validation');

    expect(typeof validateDreamInput).toBe('function');
  });
});

describe('API Sanitizers', () => {
  it('should export isRecord function', async () => {
    const { isRecord } = await import('@/lib/api/sanitizers');

    expect(typeof isRecord).toBe('function');
  });

  it('should export cleanStringArray function', async () => {
    const { cleanStringArray } = await import('@/lib/api/sanitizers');

    expect(typeof cleanStringArray).toBe('function');
  });

  it('should export normalizeMessages function', async () => {
    const { normalizeMessages } = await import('@/lib/api/sanitizers');

    expect(typeof normalizeMessages).toBe('function');
  });

  it('should export sanitizeString function', async () => {
    const { sanitizeString } = await import('@/lib/api/sanitizers');

    expect(typeof sanitizeString).toBe('function');
  });

  it('should export sanitizeNumber function', async () => {
    const { sanitizeNumber } = await import('@/lib/api/sanitizers');

    expect(typeof sanitizeNumber).toBe('function');
  });

  it('should export sanitizeBoolean function', async () => {
    const { sanitizeBoolean } = await import('@/lib/api/sanitizers');

    expect(typeof sanitizeBoolean).toBe('function');
  });

  it('should export sanitizeHtml function', async () => {
    const { sanitizeHtml } = await import('@/lib/api/sanitizers');

    expect(typeof sanitizeHtml).toBe('function');
  });

  it('should export sanitizeEnum function', async () => {
    const { sanitizeEnum } = await import('@/lib/api/sanitizers');

    expect(typeof sanitizeEnum).toBe('function');
  });
});

describe('API Schemas', () => {
  it('should export LocaleSchema', async () => {
    const { LocaleSchema } = await import('@/lib/api/schemas');

    expect(LocaleSchema).toBeDefined();
  });

  it('should export DateStringSchema', async () => {
    const { DateStringSchema } = await import('@/lib/api/schemas');

    expect(DateStringSchema).toBeDefined();
  });

  it('should export BirthDataSchema', async () => {
    const { BirthDataSchema } = await import('@/lib/api/schemas');

    expect(BirthDataSchema).toBeDefined();
  });

  it('should export DestinyMapRequestSchema', async () => {
    const { DestinyMapRequestSchema } = await import('@/lib/api/schemas');

    expect(DestinyMapRequestSchema).toBeDefined();
  });

  it('should export TarotInterpretRequestSchema', async () => {
    const { TarotInterpretRequestSchema } = await import('@/lib/api/schemas');

    expect(TarotInterpretRequestSchema).toBeDefined();
  });

  it('should export DreamRequestSchema', async () => {
    const { DreamRequestSchema } = await import('@/lib/api/schemas');

    expect(DreamRequestSchema).toBeDefined();
  });

  it('should export parseBody function', async () => {
    const { parseBody } = await import('@/lib/api/schemas');

    expect(typeof parseBody).toBe('function');
  });

  it('should export safeParseBody function', async () => {
    const { safeParseBody } = await import('@/lib/api/schemas');

    expect(typeof safeParseBody).toBe('function');
  });
});
