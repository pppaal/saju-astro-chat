/**
 * Tests for Auth Options configuration
 * src/lib/auth/authOptions.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock dependencies before importing authOptions
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    account: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    verificationToken: {
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// @next-auth/prisma-adapter is no longer used (replaced with custom adapter for Prisma 7.x)

vi.mock('@/lib/auth/tokenRevoke', () => ({
  revokeGoogleTokensForAccount: vi.fn(),
  revokeGoogleTokensForUser: vi.fn(),
}))

vi.mock('@/lib/security/tokenCrypto', () => ({
  encryptToken: vi.fn((token) => (token ? `encrypted_${token}` : null)),
  hasTokenEncryptionKey: vi.fn(() => true),
}))

vi.mock('@/lib/referral', () => ({
  generateReferralCode: vi.fn(() => 'REF123ABC'),
}))

vi.mock('@/lib/email', () => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@sentry/nextjs', () => ({
  withScope: vi.fn((callback) =>
    callback({ setTag: vi.fn(), setExtra: vi.fn(), setUser: vi.fn() })
  ),
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}))

// Mock providers
vi.mock('next-auth/providers/google', () => ({
  default: vi.fn(() => ({ id: 'google', name: 'Google' })),
}))

vi.mock('next-auth/providers/kakao', () => ({
  default: vi.fn(() => ({ id: 'kakao', name: 'Kakao' })),
}))

describe('authOptions', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('providers configuration', () => {
    it('should include Google provider when configured', async () => {
      process.env.GOOGLE_CLIENT_ID = 'google-client-id'
      process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      const googleProvider = authOptions.providers.find((p) => p.id === 'google')
      expect(googleProvider).toBeDefined()
    })

    it('should not include Kakao provider (not implemented)', async () => {
      process.env.KAKAO_CLIENT_ID = 'kakao-client-id'
      process.env.KAKAO_CLIENT_SECRET = 'kakao-client-secret'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      const kakaoProvider = authOptions.providers.find((p) => p.id === 'kakao')
      expect(kakaoProvider).toBeUndefined()
    })
  })

  describe('session configuration', () => {
    it('should use JWT strategy', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.session?.strategy).toBe('jwt')
    })

    it('should have 30 day max age', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.session?.maxAge).toBe(30 * 24 * 60 * 60)
    })
  })

  describe('pages configuration', () => {
    it('should set custom sign in page', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.pages?.signIn).toBe('/auth/signin')
    })
  })

  describe('cookies configuration', () => {
    it('should use secure cookie in production', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.name).toBe('__Secure-next-auth.session-token')
      expect(authOptions.cookies?.sessionToken?.options?.secure).toBe(true)
    })

    it('should use non-secure cookie in development', async () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.name).toBe('next-auth.session-token')
    })

    it('should set httpOnly and sameSite', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.httpOnly).toBe(true)
      expect(authOptions.cookies?.sessionToken?.options?.sameSite).toBe('lax')
    })
  })

  describe('callbacks', () => {
    it('should add user id to jwt token', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      const token = await authOptions.callbacks?.jwt?.({
        token: { email: 'test@example.com' },
        user: { id: 'user-123', email: 'test@example.com' },
        trigger: 'signIn',
        account: null,
        session: undefined,
      })

      expect(token?.id).toBe('user-123')
      expect(token?.email).toBe('test@example.com')
    })

    it('should add user id to session', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      const session = await authOptions.callbacks?.session?.({
        session: {
          user: { email: 'test@example.com' },
          expires: new Date().toISOString(),
        },
        token: { id: 'user-123', email: 'test@example.com' },
        trigger: 'getSession',
        newSession: undefined,
      })

      expect(session?.user?.id).toBe('user-123')
    })

    it('should preserve token when user is not provided', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      const originalToken = { id: 'existing-id', email: 'existing@example.com' }
      const token = await authOptions.callbacks?.jwt?.({
        token: originalToken,
        user: undefined,
        trigger: 'update',
        account: null,
        session: undefined,
      })

      expect(token?.id).toBe('existing-id')
      expect(token?.email).toBe('existing@example.com')
    })

    it('should handle session without user', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { authOptions } = await import('@/lib/auth/authOptions')

      const session = await authOptions.callbacks?.session?.({
        session: {
          expires: new Date().toISOString(),
        },
        token: { id: 'user-123', email: 'test@example.com' },
        trigger: 'getSession',
        newSession: undefined,
      })

      expect(session).toBeDefined()
    })
  })

  describe('events', () => {
    it('should send welcome email for new users', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'development'

      const { sendWelcomeEmail } = await import('@/lib/email')
      const { prisma } = await import('@/lib/db/prisma')

      ;(prisma.user.findUnique as any).mockResolvedValue({ referralCode: 'REF123' })

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signIn?.({
        user: { id: 'user-123', email: 'new@example.com', name: 'Test User' },
        account: { provider: 'google', type: 'oauth', providerAccountId: '123' },
        isNewUser: true,
        profile: undefined,
      })

      expect(sendWelcomeEmail).toHaveBeenCalledWith(
        'user-123',
        'new@example.com',
        'Test User',
        'ko',
        'REF123'
      )
    })

    it('should not send welcome email for existing users', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'development'

      const { sendWelcomeEmail } = await import('@/lib/email')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signIn?.({
        user: { id: 'user-123', email: 'existing@example.com' },
        account: { provider: 'google', type: 'oauth', providerAccountId: '123' },
        isNewUser: false,
        profile: undefined,
      })

      expect(sendWelcomeEmail).not.toHaveBeenCalled()
    })

    it('should handle welcome email failure gracefully', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'development'

      const { sendWelcomeEmail } = await import('@/lib/email')
      const { prisma } = await import('@/lib/db/prisma')
      const { logger } = await import('@/lib/logger')

      ;(prisma.user.findUnique as any).mockResolvedValue({ referralCode: 'REF123' })
      ;(sendWelcomeEmail as any).mockRejectedValue(new Error('Email failed'))

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signIn?.({
        user: { id: 'user-123', email: 'new@example.com', name: 'Test' },
        account: { provider: 'google', type: 'oauth', providerAccountId: '123' },
        isNewUser: true,
        profile: undefined,
      })

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 100))

      expect(logger.error).toHaveBeenCalled()
    })

    it('should capture Sentry event on sign in (production)', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'production'

      const Sentry = await import('@sentry/nextjs')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signIn?.({
        user: { id: 'user-123', email: 'user@example.com' },
        account: { provider: 'google', type: 'oauth', providerAccountId: '123' },
        isNewUser: false,
        profile: undefined,
      })

      expect(Sentry.withScope).toHaveBeenCalled()
      expect(Sentry.captureMessage).toHaveBeenCalledWith('auth.sign_in')
    })

    it('should revoke tokens on sign out', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'development'

      const { revokeGoogleTokensForUser } = await import('@/lib/auth/tokenRevoke')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signOut?.({
        token: { id: 'user-123', email: 'user@example.com' },
        session: null,
      })

      expect(revokeGoogleTokensForUser).toHaveBeenCalledWith('user-123')
    })

    it('should handle sign out without token', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { revokeGoogleTokensForUser } = await import('@/lib/auth/tokenRevoke')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signOut?.({
        token: {},
        session: null,
      })

      expect(revokeGoogleTokensForUser).not.toHaveBeenCalled()
    })

    it('should handle token revocation error', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'development'

      const { revokeGoogleTokensForUser } = await import('@/lib/auth/tokenRevoke')
      const { logger } = await import('@/lib/logger')

      ;(revokeGoogleTokensForUser as any).mockRejectedValue(new Error('Revoke failed'))

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signOut?.({
        token: { id: 'user-123' },
        session: null,
      })

      expect(logger.error).toHaveBeenCalled()
    })

    it('should capture Sentry exception on sign out error (production)', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      process.env.NODE_ENV = 'production'

      const { revokeGoogleTokensForUser } = await import('@/lib/auth/tokenRevoke')
      const Sentry = await import('@sentry/nextjs')

      const error = new Error('Revoke failed')
      ;(revokeGoogleTokensForUser as any).mockRejectedValue(error)

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      await authOptions.events?.signOut?.({
        token: { id: 'user-123' },
        session: null,
      })

      expect(Sentry.captureException).toHaveBeenCalledWith(error)
    })
  })

  describe('getCookieDomain', () => {
    it('should use explicit NEXTAUTH_COOKIE_DOMAIN when set', async () => {
      process.env.NEXTAUTH_COOKIE_DOMAIN = '.example.com'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBe('.example.com')
    })

    it('should handle localhost', async () => {
      process.env.NEXTAUTH_URL = 'http://localhost:3000'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBeUndefined()
    })

    it('should handle IP addresses', async () => {
      process.env.NEXTAUTH_URL = 'http://192.168.1.1:3000'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBeUndefined()
    })

    it('should handle www subdomain', async () => {
      process.env.NEXTAUTH_URL = 'https://www.example.com'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBe('.example.com')
    })

    it('should handle two-part domains', async () => {
      process.env.NEXTAUTH_URL = 'https://example.com'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBe('.example.com')
    })

    it('should handle three-part domains', async () => {
      process.env.NEXTAUTH_URL = 'https://app.example.com'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBeUndefined()
    })

    it('should handle invalid URL gracefully', async () => {
      process.env.NEXTAUTH_URL = 'not-a-valid-url'
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBeUndefined()
    })

    it('should handle missing NEXTAUTH_URL', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'
      delete process.env.NEXTAUTH_URL
      delete process.env.NEXTAUTH_COOKIE_DOMAIN

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      expect(authOptions.cookies?.sessionToken?.options?.domain).toBeUndefined()
    })
  })

  describe('adapter - createUser', () => {
    it('should generate referral code for new users', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { prisma } = await import('@/lib/db/prisma')
      const { generateReferralCode } = await import('@/lib/referral')

      ;(prisma.user.create as any).mockResolvedValue({
        id: 'user-123',
        email: 'new@example.com',
        referralCode: 'REF123ABC',
      })

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      const adapter = authOptions.adapter
      if (adapter && 'createUser' in adapter) {
        await adapter.createUser({
          email: 'new@example.com',
          emailVerified: null,
        })

        expect(generateReferralCode).toHaveBeenCalled()
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            email: 'new@example.com',
            referralCode: 'REF123ABC',
          }),
        })
      }
    })
  })

  describe('adapter - linkAccount', () => {
    it('should filter out unknown account fields', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { prisma } = await import('@/lib/db/prisma')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      const adapter = authOptions.adapter
      if (adapter && 'linkAccount' in adapter) {
        await adapter.linkAccount({
          userId: 'user-123',
          type: 'oauth',
          provider: 'google',
          providerAccountId: '123',
          access_token: 'token123',
          unknownField: 'should be filtered',
        } as any)

        const callArgs = (prisma.account.create as any).mock.calls[0][0].data
        expect(callArgs).not.toHaveProperty('unknownField')
        expect(callArgs).toHaveProperty('access_token')
      }
    })

    it('should encrypt tokens before saving', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { prisma } = await import('@/lib/db/prisma')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      const adapter = authOptions.adapter
      if (adapter && 'linkAccount' in adapter) {
        await adapter.linkAccount({
          userId: 'user-123',
          type: 'oauth',
          provider: 'google',
          providerAccountId: '123',
          access_token: 'plaintext_token',
          refresh_token: 'plaintext_refresh',
          id_token: 'plaintext_id',
        } as any)

        const callArgs = (prisma.account.create as any).mock.calls[0][0].data
        expect(callArgs.access_token).toBe('encrypted_plaintext_token')
        expect(callArgs.refresh_token).toBe('encrypted_plaintext_refresh')
        expect(callArgs.id_token).toBe('encrypted_plaintext_id')
      }
    })

    it('should handle null tokens', async () => {
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { prisma } = await import('@/lib/db/prisma')

      vi.resetModules()
      const { authOptions } = await import('@/lib/auth/authOptions')

      const adapter = authOptions.adapter
      if (adapter && 'linkAccount' in adapter) {
        await adapter.linkAccount({
          userId: 'user-123',
          type: 'oauth',
          provider: 'google',
          providerAccountId: '123',
        } as any)

        const callArgs = (prisma.account.create as any).mock.calls[0][0].data
        expect(callArgs).not.toHaveProperty('access_token')
        expect(callArgs).not.toHaveProperty('refresh_token')
      }
    })
  })

  describe('ensureEncryptionKey', () => {
    it('should throw in production without encryption key', async () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { hasTokenEncryptionKey } = await import('@/lib/security/tokenCrypto')
      ;(hasTokenEncryptionKey as any).mockReturnValue(false)

      vi.resetModules()

      await expect(import('@/lib/auth/authOptions')).rejects.toThrow(
        'TOKEN_ENCRYPTION_KEY is required'
      )
    })

    it('should warn in development without encryption key', async () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXTAUTH_SECRET = 'test-secret'

      const { hasTokenEncryptionKey } = await import('@/lib/security/tokenCrypto')
      const { logger } = await import('@/lib/logger')

      ;(hasTokenEncryptionKey as any).mockReturnValue(false)

      vi.resetModules()
      await import('@/lib/auth/authOptions')

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('TOKEN_ENCRYPTION_KEY is required')
      )
    })
  })
})
