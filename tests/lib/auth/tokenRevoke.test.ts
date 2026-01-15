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

// Mock tokenCrypto
vi.mock('@/lib/security/tokenCrypto', () => ({
  decryptToken: vi.fn((token: string | null | undefined) => {
    if (!token) return null;
    if (token.startsWith('encrypted_')) {
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
  },
}));

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

import {
  revokeGoogleTokensForAccount,
  revokeGoogleTokensForUser,
} from '@/lib/auth/tokenRevoke';
import { prisma } from '@/lib/db/prisma';
import { decryptToken } from '@/lib/security/tokenCrypto';

describe('tokenRevoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('revokeGoogleTokensForAccount', () => {
    it('should return early if provider is not google', async () => {
      const account = {
        provider: 'github',
        providerAccountId: '123',
        access_token: 'token',
      };

      const result = await revokeGoogleTokensForAccount(account);

      expect(result).toEqual({ revoked: false, cleared: false });
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should revoke token and clear account data for google provider', async () => {
      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: 'refresh-token-xyz',
        access_token: null,
        id_token: null,
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await revokeGoogleTokensForAccount(account);

      expect(result.revoked).toBe(true);
      expect(result.cleared).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://oauth2.googleapis.com/revoke',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );
      expect(prisma.account.updateMany).toHaveBeenCalledWith({
        where: {
          provider: 'google',
          providerAccountId: 'google-123',
        },
        data: {
          access_token: null,
          refresh_token: null,
          id_token: null,
          session_state: null,
          scope: null,
          token_type: null,
          expires_at: null,
        },
      });
    });

    it('should use access_token when refresh_token is not available', async () => {
      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: null,
        access_token: 'access-token-xyz',
        id_token: null,
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await revokeGoogleTokensForAccount(account);

      expect(result.revoked).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should use id_token when other tokens are not available', async () => {
      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: null,
        access_token: null,
        id_token: 'id-token-xyz',
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await revokeGoogleTokensForAccount(account);

      expect(result.revoked).toBe(true);
    });

    it('should still clear data when no token is available', async () => {
      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: null,
        access_token: null,
        id_token: null,
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await revokeGoogleTokensForAccount(account);

      expect(result.revoked).toBe(false);
      expect(result.cleared).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(prisma.account.updateMany).toHaveBeenCalled();
    });

    it('should handle Google revocation API failure gracefully', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 400 });

      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: 'invalid-token',
        access_token: null,
        id_token: null,
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      // Should not throw, should still clear data
      const result = await revokeGoogleTokensForAccount(account);

      expect(result.cleared).toBe(true);
    });

    it('should handle fetch exception gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: 'token',
        access_token: null,
        id_token: null,
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      // Should not throw
      const result = await revokeGoogleTokensForAccount(account);

      expect(result.cleared).toBe(true);
    });

    it('should not decrypt tokens when refresh token is present', async () => {
      const account = {
        provider: 'google',
        providerAccountId: 'google-123',
        refresh_token: 'encrypted_refresh',
        access_token: null,
        id_token: null,
      };

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      await revokeGoogleTokensForAccount(account);

      expect(decryptToken).not.toHaveBeenCalled();
    });
  });

  describe('revokeGoogleTokensForUser', () => {
    it('should return no_account reason when account not found', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce(null);

      const result = await revokeGoogleTokensForUser('user-123');

      expect(result).toEqual({
        revoked: false,
        cleared: false,
        reason: 'no_account',
      });
    });

    it('should find account, decrypt tokens, and revoke', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'account-1',
        provider: 'google',
        providerAccountId: 'google-456',
        access_token: 'encrypted_access',
        refresh_token: 'encrypted_refresh',
        id_token: 'encrypted_id',
        type: 'oauth',
        userId: 'user-123',
        token_type: 'Bearer',
        scope: 'openid email profile',
        session_state: null,
        expires_at: null,
      });

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await revokeGoogleTokensForUser('user-123');

      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { provider: 'google', userId: 'user-123' },
        select: {
          id: true,
          provider: true,
          providerAccountId: true,
          access_token: true,
          refresh_token: true,
          id_token: true,
        },
      });

      expect(decryptToken).toHaveBeenCalled();
      expect(result.revoked).toBe(true);
      expect(result.cleared).toBe(true);
    });

    it('should handle account with all null tokens', async () => {
      vi.mocked(prisma.account.findFirst).mockResolvedValueOnce({
        id: 'account-1',
        provider: 'google',
        providerAccountId: 'google-789',
        access_token: null,
        refresh_token: null,
        id_token: null,
        type: 'oauth',
        userId: 'user-123',
        token_type: null,
        scope: null,
        session_state: null,
        expires_at: null,
      });

      vi.mocked(prisma.account.updateMany).mockResolvedValueOnce({ count: 1 });

      const result = await revokeGoogleTokensForUser('user-123');

      expect(result.revoked).toBe(false);
      expect(result.cleared).toBe(true);
    });
  });
});
