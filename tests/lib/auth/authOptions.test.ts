/**
 * Tests for Auth Options configuration
 * src/lib/auth/authOptions.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies before importing authOptions
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@next-auth/prisma-adapter', () => ({
  PrismaAdapter: vi.fn(() => ({
    createUser: vi.fn(),
    linkAccount: vi.fn(),
  })),
}));

vi.mock('@/lib/auth/tokenRevoke', () => ({
  revokeGoogleTokensForAccount: vi.fn(),
  revokeGoogleTokensForUser: vi.fn(),
}));

vi.mock('@/lib/security/tokenCrypto', () => ({
  encryptToken: vi.fn((token) => token ? `encrypted_${token}` : null),
  hasTokenEncryptionKey: vi.fn(() => true),
}));

vi.mock('@/lib/referral', () => ({
  generateReferralCode: vi.fn(() => 'REF123ABC'),
}));

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback) => callback({ setTag: vi.fn(), setExtra: vi.fn(), setUser: vi.fn() })),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

// Mock providers
vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google', name: 'Google' })),
}));

vi.mock('next-auth/providers/kakao', () => ({
  default: vi.fn(() => ({ id: 'kakao', name: 'Kakao' })),
}));

describe('authOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('providers configuration', () => {
    it('should include Google provider when configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      const googleProvider = authOptions.providers.find((p) => p.id === 'google');
      expect(googleProvider).toBeDefined();
    });

    it('should include Kakao provider when configured', async () => {
      process.env.KAKAO_CLIENT_ID = 'kakao-client-id';
      process.env.KAKAO_CLIENT_SECRET = 'kakao-client-secret';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      const kakaoProvider = authOptions.providers.find((p) => p.id === 'kakao');
      expect(kakaoProvider).toBeDefined();
    });
  });

  describe('session configuration', () => {
    it('should use JWT strategy', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      expect(authOptions.session?.strategy).toBe('jwt');
    });

    it('should have 30 day max age', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60);
    });
  });

  describe('pages configuration', () => {
    it('should set custom sign in page', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      expect(authOptions.pages?.signIn).toBe('/auth/signin');
    });
  });

  describe('cookies configuration', () => {
    it('should use secure cookie in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      vi.resetModules();
      const { authOptions } = await import('@/lib/auth/authOptions');

      expect(authOptions.cookies?.sessionToken?.name).toBe('__Secure-next-auth.session-token');
      expect(authOptions.cookies?.sessionToken?.options?.secure).toBe(true);
    });

    it('should use non-secure cookie in development', async () => {
      process.env.NODE_ENV = 'development';
      process.env.NEXTAUTH_SECRET = 'test-secret';

      vi.resetModules();
      const { authOptions } = await import('@/lib/auth/authOptions');

      expect(authOptions.cookies?.sessionToken?.name).toBe('next-auth.session-token');
    });

    it('should set httpOnly and sameSite', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      expect(authOptions.cookies?.sessionToken?.options?.httpOnly).toBe(true);
      expect(authOptions.cookies?.sessionToken?.options?.sameSite).toBe('lax');
    });
  });

  describe('callbacks', () => {
    it('should add user id to jwt token', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      const token = await authOptions.callbacks?.jwt?.({
        token: { email: 'test@example.com' },
        user: { id: 'user-123', email: 'test@example.com' },
        trigger: 'signIn',
        account: null,
        session: undefined,
      });

      expect(token?.id).toBe('user-123');
      expect(token?.email).toBe('test@example.com');
    });

    it('should add user id to session', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret';

      const { authOptions } = await import('@/lib/auth/authOptions');

      const session = await authOptions.callbacks?.session?.({
        session: {
          user: { email: 'test@example.com' },
          expires: new Date().toISOString(),
        },
        token: { id: 'user-123', email: 'test@example.com' },
        trigger: 'getSession',
        newSession: undefined,
      });

      expect(session?.user?.id).toBe('user-123');
    });
  });
});
