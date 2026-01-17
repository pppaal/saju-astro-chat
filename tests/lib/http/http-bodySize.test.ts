import { describe, it, expect } from 'vitest';

describe('HTTP enforceBodySize', () => {
  it('should export enforceBodySize function', async () => {
    const { enforceBodySize } = await import('@/lib/http');
    expect(typeof enforceBodySize).toBe('function');
  });

  it('should return null when Content-Length header is absent', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers();
    const request = { headers } as Request;

    const result = enforceBodySize(request);
    expect(result).toBeNull();
  });

  it('should return null when Content-Length is within limit', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': '1000' });
    const request = { headers } as Request;

    const result = enforceBodySize(request, 2000);
    expect(result).toBeNull();
  });

  it('should return null when Content-Length equals limit', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': '1000' });
    const request = { headers } as Request;

    const result = enforceBodySize(request, 1000);
    expect(result).toBeNull();
  });

  it('should return 413 response when Content-Length exceeds limit', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': '500000' });
    const request = { headers } as Request;

    const result = enforceBodySize(request, 1000);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(413);
  });

  it('should use default maxBytes of 256KB', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': '100000' });
    const request = { headers } as Request;

    const result = enforceBodySize(request);
    expect(result).toBeNull();
  });

  it('should return null for non-finite Content-Length', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': 'invalid' });
    const request = { headers } as Request;

    const result = enforceBodySize(request);
    expect(result).toBeNull();
  });

  it('should include error and limit in response body', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': '500000' });
    const request = { headers } as Request;

    const result = enforceBodySize(request, 1000);
    expect(result).not.toBeNull();

    const body = await result!.json();
    expect(body.error).toBe('payload_too_large');
    expect(body.limit).toBe(1000);
  });

  it('should pass through custom headers', async () => {
    const { enforceBodySize } = await import('@/lib/http');

    const headers = new Headers({ 'content-length': '500000' });
    const request = { headers } as Request;

    const passthroughHeaders = { 'X-Custom-Header': 'custom-value' };
    const result = enforceBodySize(request, 1000, passthroughHeaders);

    expect(result).not.toBeNull();
    expect(result!.headers.get('X-Custom-Header')).toBe('custom-value');
  });
});
