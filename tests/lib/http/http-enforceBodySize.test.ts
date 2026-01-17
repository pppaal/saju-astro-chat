/**
 * @file Tests for http module - enforceBodySize function
 * 커버리지 향상을 위한 http 모듈 테스트
 */

import { describe, it, expect, vi } from 'vitest';

// Mock NextResponse
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body, init) => ({
      body,
      status: init?.status ?? 200,
      headers: new Map(),
    })),
  },
}));

describe('enforceBodySize', () => {
  it('should export enforceBodySize function', async () => {
    const { enforceBodySize } = await import('@/lib/http');
    expect(enforceBodySize).toBeDefined();
    expect(typeof enforceBodySize).toBe('function');
  });

  it('should return null when Content-Length header is absent', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue(null),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest);
    expect(result).toBeNull();
  });

  it('should return null when Content-Length is not a valid number', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('invalid'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest);
    expect(result).toBeNull();
  });

  it('should return null when Content-Length is within limit', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('1000'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).toBeNull();
  });

  it('should return null when Content-Length equals limit', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('10000'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).toBeNull();
  });

  it('should return 413 response when Content-Length exceeds limit', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('100000'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(413);
    expect(result?.body).toEqual({ error: 'payload_too_large', limit: 10000 });
  });

  it('should use default maxBytes of 256KB when not specified', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('260000'),
      },
    } as unknown as Request;

    // Default is 256 * 1024 = 262144 bytes
    const result = enforceBodySize(mockRequest);
    expect(result).toBeNull(); // 260000 < 262144

    // Test with larger value
    const mockRequest2 = {
      headers: {
        get: vi.fn().mockReturnValue('300000'),
      },
    } as unknown as Request;

    const result2 = enforceBodySize(mockRequest2);
    expect(result2).not.toBeNull();
    expect(result2?.status).toBe(413);
  });

  it('should handle passthrough headers', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('500000'),
      },
    } as unknown as Request;

    const passthroughHeaders = {
      'X-Custom-Header': 'custom-value',
      'X-Another-Header': 'another-value',
    };

    const result = enforceBodySize(mockRequest, 10000, passthroughHeaders);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(413);
    // Headers should be set on the response
    expect(result?.headers).toBeDefined();
  });

  it('should return null for Infinity Content-Length', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('Infinity'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).toBeNull(); // Infinity is not finite
  });

  it('should return null for NaN Content-Length', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('NaN'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).toBeNull();
  });

  it('should handle zero Content-Length', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('0'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).toBeNull();
  });

  it('should handle negative Content-Length', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const mockRequest = {
      headers: {
        get: vi.fn().mockReturnValue('-100'),
      },
    } as unknown as Request;

    const result = enforceBodySize(mockRequest, 10000);
    expect(result).toBeNull(); // -100 < 10000
  });
});
