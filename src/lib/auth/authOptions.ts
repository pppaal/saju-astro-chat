import type { NextAuthOptions } from 'next-auth'
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/db/prisma'
import { revokeGoogleTokensForAccount, revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke'
import { encryptToken, hasTokenEncryptionKey } from '@/lib/security/tokenCrypto'
import { generateReferralCode } from '@/lib/referral'
import { sendWelcomeEmail } from '@/lib/email'
import { logger } from '@/lib/logger'

// ============================================
// OAuth providers (Google, Kakao)
// - Persist only expected fields to Prisma (drop provider-specific extras)
// - Add more providers by setting env vars without changing core logic
// ============================================

const ALLOWED_ACCOUNT_FIELDS = new Set([
  'id',
  'userId',
  'type',
  'provider',
  'providerAccountId',
  'refresh_token',
  'access_token',
  'expires_at',
  'token_type',
  'scope',
  'id_token',
  'session_state',
])

function getCookieDomain() {
  const explicit = process.env.NEXTAUTH_COOKIE_DOMAIN?.trim()
  if (explicit) {
    return explicit
  }

  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) {
    return undefined
  }

  try {
    const host = new URL(baseUrl).hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.localhost')) {
      return undefined
    }
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return undefined
    }
    if (host.startsWith('www.')) {
      return `.${host.slice(4)}`
    }
    const parts = host.split('.')
    if (parts.length === 2) {
      return `.${host}`
    }
    return undefined
  } catch {
    return undefined
  }
}

const cookieDomain = getCookieDomain()

function ensureEncryptionKey() {
  if (hasTokenEncryptionKey()) {
    return
  }
  const msg = 'TOKEN_ENCRYPTION_KEY is required to store OAuth tokens securely'

  // Strict enforcement: always throw in production
  if (process.env.NODE_ENV === 'production') {
    logger.error('[auth] CRITICAL: Missing TOKEN_ENCRYPTION_KEY in production')
    throw new Error(msg)
  }

  // Development: allow but warn loudly
  logger.warn(`[auth] ${msg} (development only: tokens will remain plaintext)`)
}

function encryptAccountTokens(account: AdapterAccount) {
  const copy = { ...account }
  if (copy.refresh_token) {
    copy.refresh_token = encryptToken(copy.refresh_token) ?? undefined
  }
  if (copy.access_token) {
    copy.access_token = encryptToken(copy.access_token) ?? undefined
  }
  if (copy.id_token) {
    copy.id_token = encryptToken(copy.id_token) ?? undefined
  }
  return copy
}

// Full custom Prisma adapter for Prisma 7.x compatibility.
// @next-auth/prisma-adapter@1.0.7 uses compound unique keys (provider_providerAccountId)
// which cause P2022 errors with Prisma 7.x. This adapter avoids compound keys entirely.
function createFilteredPrismaAdapter(): Adapter {
  ensureEncryptionKey()

  return {
    createUser: async (user: Omit<AdapterUser, 'id'>) => {
      try {
        const referralCode = generateReferralCode()
        const createdUser = await prisma.user.create({
          data: { ...user, referralCode },
        })
        return createdUser as AdapterUser
      } catch (error) {
        logger.error('[auth] createUser failed:', error)
        throw error
      }
    },
    getUser: async (id: string) => {
      try {
        const user = await prisma.user.findUnique({ where: { id } })
        return (user as AdapterUser) ?? null
      } catch (error) {
        logger.warn('[auth] getUser full select failed, using safe select:', error)
        const user = await prisma.$queryRaw<AdapterUser[]>`
          SELECT "id", "name", "email", "emailVerified", "image"
          FROM "User" WHERE "id" = ${id} LIMIT 1
        `
        return user[0] ?? null
      }
    },
    getUserByEmail: async (email: string) => {
      try {
        const user = await prisma.user.findUnique({ where: { email } })
        return (user as AdapterUser) ?? null
      } catch (error) {
        logger.warn('[auth] getUserByEmail full select failed, using safe select:', error)
        const user = await prisma.$queryRaw<AdapterUser[]>`
          SELECT "id", "name", "email", "emailVerified", "image"
          FROM "User" WHERE "email" = ${email} LIMIT 1
        `
        return user[0] ?? null
      }
    },
    getUserByAccount: async (
      providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
    ) => {
      try {
        // Use raw SQL to avoid Prisma 7.x driver adapter P2022 bug with compound unique keys
        const users = await prisma.$queryRaw<AdapterUser[]>`
          SELECT u.* FROM "User" u
          INNER JOIN "Account" a ON a."userId" = u."id"
          WHERE a."provider" = ${providerAccountId.provider}
            AND a."providerAccountId" = ${providerAccountId.providerAccountId}
          LIMIT 1
        `
        return users[0] ?? null
      } catch (error) {
        logger.error('[auth] getUserByAccount failed:', error)
        throw error
      }
    },
    updateUser: async (user: Partial<AdapterUser> & Pick<AdapterUser, 'id'>) => {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: user,
      })
      return updated as AdapterUser
    },
    deleteUser: async (userId: string) => {
      await prisma.user.delete({ where: { id: userId } })
    },
    linkAccount: async (account: AdapterAccount) => {
      try {
        const filteredAccount: Record<string, unknown> = {}
        for (const [key, value] of Object.entries(account)) {
          if (ALLOWED_ACCOUNT_FIELDS.has(key)) {
            filteredAccount[key] = value
          }
        }
        const securedAccount = encryptAccountTokens(filteredAccount as AdapterAccount)
        await prisma.account.create({ data: securedAccount as never })
      } catch (error) {
        logger.error('[auth] linkAccount failed:', error)
        throw error
      }
    },
    unlinkAccount: async (
      providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
    ) => {
      try {
        // Use raw SQL to avoid Prisma 7.x driver adapter P2022 bug with compound unique keys
        await prisma.$executeRaw`
          DELETE FROM "Account"
          WHERE "provider" = ${providerAccountId.provider}
            AND "providerAccountId" = ${providerAccountId.providerAccountId}
        `
      } catch (error) {
        logger.error('[auth] unlinkAccount failed:', error)
        throw error
      }
    },
    createSession: async (session) => {
      return await prisma.session.create({ data: session })
    },
    getSessionAndUser: async (sessionToken: string) => {
      const sessionAndUser = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })
      if (!sessionAndUser) return null
      const { user, ...session } = sessionAndUser
      return { session, user: user as AdapterUser }
    },
    updateSession: async (session) => {
      return await prisma.session.update({
        where: { sessionToken: session.sessionToken },
        data: session,
      })
    },
    deleteSession: async (sessionToken: string) => {
      await prisma.session.delete({ where: { sessionToken } })
    },
    createVerificationToken: async (data) => {
      return await prisma.verificationToken.create({ data })
    },
    useVerificationToken: async (identifier_token) => {
      try {
        return await prisma.verificationToken.delete({
          where: { identifier_token },
        })
      } catch {
        return null
      }
    },
  }
}

const providers: NextAuthOptions['providers'] = []

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: 'select_account',
        },
      },
    })
  )
}

if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthOptions = {
  adapter: createFilteredPrismaAdapter(),
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === 'production'
          ? '__Secure-next-auth.session-token'
          : 'next-auth.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        domain: cookieDomain,
      },
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      logger.warn(
        `[auth] signIn callback: provider=${account?.provider} user=${user?.email} profile=${!!profile}`
      )
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id ?? token.id
        token.email = user.email ?? token.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      // Send welcome email for new OAuth users
      if (isNewUser && user?.email && user?.id) {
        // Get user's referral code from DB
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id as string },
          select: { referralCode: true },
        })
        sendWelcomeEmail(
          user.id as string,
          user.email,
          user.name || '',
          'ko',
          dbUser?.referralCode || undefined
        ).catch((err) => {
          logger.error('[auth] Failed to send welcome email:', err)
        })
      }

      if (process.env.NODE_ENV !== 'production') {
        return
      }
      Sentry.withScope((scope) => {
        scope.setTag('auth_event', 'sign_in')
        scope.setTag('provider', account?.provider ?? 'unknown')
        scope.setExtra('isNewUser', isNewUser ?? false)
        if (user?.id) {
          scope.setUser({ id: String(user.id), email: user.email ?? undefined })
        }
        Sentry.captureMessage('auth.sign_in')
      })
    },
    async signOut({ token }) {
      if (!token?.id) {
        return
      }
      try {
        await revokeGoogleTokensForUser(String(token.id))
        if (process.env.NODE_ENV === 'production') {
          Sentry.withScope((scope) => {
            scope.setTag('auth_event', 'sign_out')
            scope.setUser({ id: String(token.id) })
            Sentry.captureMessage('auth.sign_out')
          })
        }
      } catch (e) {
        logger.error('[auth] signOut revoke failed', e)
        if (process.env.NODE_ENV === 'production') {
          Sentry.captureException(e)
        }
      }
    },
  },
}
