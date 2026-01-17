import { describe, it, expect } from 'vitest';

describe('SignIn URL Module', () => {
  it('should export DEFAULT_SIGNIN_PATH constant', async () => {
    const { DEFAULT_SIGNIN_PATH } = await import('@/lib/auth/signInUrl');
    expect(DEFAULT_SIGNIN_PATH).toBe('/auth/signin');
  });

  it('should export buildSignInUrl function', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    expect(typeof buildSignInUrl).toBe('function');
  });
});

describe('buildSignInUrl', () => {
  it('should return signin path (with callbackUrl in jsdom environment)', async () => {
    const { buildSignInUrl, DEFAULT_SIGNIN_PATH } = await import('@/lib/auth/signInUrl');
    // Provide explicit callbackUrl to avoid relying on window.location
    const result = buildSignInUrl('/test');
    expect(result).toContain(DEFAULT_SIGNIN_PATH);
  });

  it('should include callback URL with auth refresh', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    const result = buildSignInUrl('/dashboard');
    expect(result).toContain('/auth/signin');
    expect(result).toContain('callbackUrl=');
    expect(result).toContain('authRefresh');
  });

  it('should handle URL with existing query params', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    const result = buildSignInUrl('/page?foo=bar');
    expect(result).toContain('callbackUrl=');
    expect(result).toContain('authRefresh');
  });

  it('should handle absolute URLs', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    const result = buildSignInUrl('https://example.com/page');
    expect(result).toContain('/auth/signin');
    expect(result).toContain('callbackUrl=');
  });

  it('should not duplicate authRefresh param', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    const result = buildSignInUrl('/page?authRefresh=1');
    const decoded = decodeURIComponent(result);
    const authRefreshCount = (decoded.match(/authRefresh/g) || []).length;
    expect(authRefreshCount).toBe(1);
  });

  it('should preserve hash fragments', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    const result = buildSignInUrl('/page#section');
    expect(decodeURIComponent(result)).toContain('#section');
  });

  it('should URL encode the callback URL', async () => {
    const { buildSignInUrl } = await import('@/lib/auth/signInUrl');
    const result = buildSignInUrl('/page?key=value&other=test');
    expect(result).toContain('callbackUrl=');
    expect(result).toContain('%2F');
  });
});
