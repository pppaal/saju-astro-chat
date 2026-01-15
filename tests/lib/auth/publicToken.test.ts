import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { requirePublicToken } from '@/lib/auth/publicToken';

vi.mock('@/lib/metrics', () => ({
  recordCounter: vi.fn(),
}));

describe('requirePublicToken', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should fail in production when PUBLIC_API_TOKEN not set', () => {
    delete process.env.PUBLIC_API_TOKEN;
    process.env.NODE_ENV = 'production';
    const req = new Request('http://localhost/api/test');
    const result = requirePublicToken(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('not configured');
  });

  it('should pass in dev mode when PUBLIC_API_TOKEN not set', () => {
    delete process.env.PUBLIC_API_TOKEN;
    process.env.NODE_ENV = 'development';
    const req = new Request('http://localhost/api/test');
    const result = requirePublicToken(req);
    expect(result.valid).toBe(true);
  });

  it('should pass when valid token provided', () => {
    process.env.PUBLIC_API_TOKEN = 'secret123';
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-api-token': 'secret123' },
    });
    const result = requirePublicToken(req);
    expect(result.valid).toBe(true);
    expect(result.reason).toBeUndefined();
  });

  it('should fail when token does not match', () => {
    process.env.PUBLIC_API_TOKEN = 'secret123';
    const req = new Request('http://localhost/api/test', {
      headers: { 'x-api-token': 'wrong' },
    });
    const result = requirePublicToken(req);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid or missing');
  });

  it('should fail when token header is missing', () => {
    process.env.PUBLIC_API_TOKEN = 'secret123';
    const req = new Request('http://localhost/api/test');
    const result = requirePublicToken(req);
    expect(result.valid).toBe(false);
  });
});
