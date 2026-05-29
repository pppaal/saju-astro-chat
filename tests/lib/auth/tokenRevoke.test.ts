import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock prisma before imports
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    account: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

// Mock tokenCrypto. By default, treat the input as plaintext and pass through.
// Tests that exercise the "ciphertext from DB" path can override per-call.
vi.mock('@/lib/security/tokenCrypto', () => ({
  decryptToken: vi.fn((token: string | null | undefined) => {
    if (!token) return null;
    if (typeof token === 'string' && token.startsWith('encrypted_')) {
      return token.replace('encrypted_', 'decrypted_');
    }
    return token;
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

// Mock fetch globally — controls Google's response per test.
const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof fetch;

import {
  revokeGoogleTokensForAccount,
  revokeGoogleTokensForUser,
} from '@/lib/auth/tokenRevoke';
import { prisma } from '@/lib/db/prisma';
import { decryptToken } from '@/lib/security/tokenCrypto';
import { logger } from '@/lib/logger';

const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue({ ok: true, status: 200 });
});

afterEach(() => {
  vi.resetAllMocks();
});

// ===========================================================================
// revokeGoogleTokensForAccount — low-level, plaintext-only contract
// ===========================================================================

describe('revokeGoogleTokensForAccount', () => {
  it('returns not_google when provider is not google (no fetch, no scrub)', async () => {
    const result = await revokeGoogleTokensForAccount({
      provider: 'github',
      providerAccountId: '123',
      access_token: 'token',
    });

    expect(result).toEqual({ revoked: false, reason: 'not_google' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(prisma.account.updateMany).not.toHaveBeenCalled();
  });

  it('prefers refresh_token over access_token when both present', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await revokeGoogleTokensForAccount({
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: 'access-xyz',
      refresh_token: 'refresh-xyz',
    });

    expect(result).toEqual({ revoked: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).body?.toString()).toBe(
      'token=refresh-xyz'
    );
  });

  it('falls back to access_token when refresh_token is null', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });

    const result = await revokeGoogleTokensForAccount({
      provider: 'google',
      providerAccountId: 'google-1',
      refresh_token: null,
      access_token: 'access-xyz',
    });

    expect(result).toEqual({ revoked: true });
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).body?.toString()).toBe('token=access-xyz');
  });

  it('returns no_revokable_token when only id_token-equivalent (no access/refresh) is present, never POSTs to Google', async () => {
    // Note: the new signature does NOT accept id_token at all — Google /revoke
    // rejects it. This documents the behavior at the type boundary: any caller
    // that previously relied on id_token will hit no_revokable_token.
    const result = await revokeGoogleTokensForAccount({
      provider: 'google',
      providerAccountId: 'google-1',
      refresh_token: null,
      access_token: null,
    });

    expect(result).toEqual({
      revoked: false,
      reason: 'no_revokable_token',
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns google_error when Google responds non-OK (e.g. 500)', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const result = await revokeGoogleTokensForAccount({
      provider: 'google',
      providerAccountId: 'google-1',
      refresh_token: 'refresh-xyz',
    });

    expect(result).toEqual({ revoked: false, reason: 'google_error' });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  it('returns network_error when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('boom'));

    const result = await revokeGoogleTokensForAccount({
      provider: 'google',
      providerAccountId: 'google-1',
      refresh_token: 'refresh-xyz',
    });

    expect(result).toEqual({ revoked: false, reason: 'network_error' });
    expect(logger.error).toHaveBeenCalled();
  });

  it('refuses to POST a value that looks like ciphertext (defensive guard)', async () => {
    // Ciphertext shape is iv.b64 "." authTag.b64 "." data.b64 — exactly three
    // non-empty base64-ish segments. A real plaintext OAuth token never has
    // this exact shape.
    const looksEncrypted = 'aaaaaaaaaaaa.bbbbbbbb.ccccccccccccccccccccc';

    const result = await revokeGoogleTokensForAccount({
      provider: 'google',
      providerAccountId: 'google-1',
      refresh_token: looksEncrypted,
    });

    expect(result).toEqual({ revoked: false, reason: 'google_error' });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});

// ===========================================================================
// revokeGoogleTokensForUser — wraps account lookup + decrypt + scrub policy
// ===========================================================================

describe('revokeGoogleTokensForUser', () => {
  it('returns no_account when no Google account is on file', async () => {
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce(null);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(result).toEqual({
      revoked: false,
      cleared: false,
      reason: 'no_account',
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(prisma.account.updateMany).not.toHaveBeenCalled();
  });

  it('id_token alone in DB → no_revokable_token, no POST, no scrub-from-failure (scrub still runs because nothing to revoke)', async () => {
    // The DB row holds only an id_token. The new contract: id_token is NEVER
    // sent to Google. Result: revoked=false, reason=no_revokable_token. The
    // row IS scrubbed because there's literally nothing to keep around for a
    // future retry.
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: null,
      refresh_token: null,
      id_token: 'id-token-here',
    } as never);
    vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({
      count: 1,
    } as never);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      revoked: false,
      cleared: true,
      reason: 'no_revokable_token',
    });
    expect(prisma.account.updateMany).toHaveBeenCalledTimes(1);
  });

  it('refresh_token in DB + Google 200 → POSTed, scrub runs', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: 'encrypted_access',
      refresh_token: 'encrypted_refresh',
      id_token: 'encrypted_id',
    } as never);
    vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({
      count: 1,
    } as never);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(decryptToken).toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      GOOGLE_REVOKE_URL,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      })
    );
    // The decrypted refresh_token (not the ciphertext) is what gets POSTed.
    const [, init] = mockFetch.mock.calls[0];
    expect((init as RequestInit).body?.toString()).toBe(
      'token=decrypted_refresh'
    );
    expect(prisma.account.updateMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      revoked: true,
      cleared: true,
      reason: undefined,
    });
  });

  it('refresh_token in DB + Google 500 → POSTed, scrub does NOT run, error logged', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: null,
      refresh_token: 'encrypted_refresh',
      id_token: null,
    } as never);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    // Critical: DB row left intact for retry. This is the orphan-grant fix.
    expect(prisma.account.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      revoked: false,
      cleared: false,
      reason: 'google_error',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('refresh_token in DB + fetch throws (network down) → scrub does NOT run, error logged', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ENETUNREACH'));
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: null,
      refresh_token: 'encrypted_refresh',
      id_token: null,
    } as never);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(prisma.account.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      revoked: false,
      cleared: false,
      reason: 'network_error',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('ciphertext somehow passed through (decryptToken returns ciphertext-shaped value) → no silent ciphertext POST, treated as failure, scrub does NOT run', async () => {
    // Simulate a regression where decryptToken returns a value that still
    // looks like ciphertext. The low-level POST guard kicks in: refuse to POST,
    // return google_error, and the wrapper leaves the row alone.
    vi.mocked(decryptToken).mockImplementation((t) =>
      t === 'encrypted_refresh'
        ? 'aaaaaaaaaaaa.bbbbbbbb.ccccccccccccccccccccc'
        : null
    );
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: null,
      refresh_token: 'encrypted_refresh',
      id_token: null,
    } as never);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(prisma.account.updateMany).not.toHaveBeenCalled();
    expect(result).toEqual({
      revoked: false,
      cleared: false,
      reason: 'google_error',
    });
    expect(logger.error).toHaveBeenCalled();
  });

  it('account row with all-null tokens → no_revokable_token, scrub runs (housekeeping)', async () => {
    vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
      id: 'acc-1',
      provider: 'google',
      providerAccountId: 'google-1',
      access_token: null,
      refresh_token: null,
      id_token: null,
    } as never);
    vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({
      count: 1,
    } as never);

    const result = await revokeGoogleTokensForUser('user-123');

    expect(mockFetch).not.toHaveBeenCalled();
    expect(prisma.account.updateMany).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      revoked: false,
      cleared: true,
      reason: 'no_revokable_token',
    });
  });
});
