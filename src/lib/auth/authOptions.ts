import type { NextAuthOptions } from 'next-auth'
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/db/prisma'
import { revokeGoogleTokensForAccount, revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke'
import { encryptToken, hasTokenEncryptionKey } from '@/lib/security/tokenCrypto'
import { generateReferralCode } from '@/lib/referral'
import { sendWelcomeEmail } from '@/lib/email'

// ============================================
// OAuth providers (Google, Kakao)
// - Persist only expected fields to Prisma (drop provider-specific extras)
// - Add more providers by setting env vars without changing core logic
// ============================================

const ALLOWED_ACCOUNT_FIELDS = new Set([
  'id', 'userId', 'type', 'provider', 'providerAccountId',
  'refresh_token', 'access_token', 'expires_at', 'token_type',
  'scope', 'id_token', 'session_state',
])

function getCookieDomain() {
  const explicit = process.env.NEXTAUTH_COOKIE_DOMAIN?.trim()
  if (explicit) return explicit

  const baseUrl = process.env.NEXTAUTH_URL
  if (!baseUrl) return undefined

  try {
    const host = new URL(baseUrl).hostname.toLowerCase()
    if (host === 'localhost' || host.endsWith('.localhost')) return undefined
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return undefined
    if (host.startsWith('www.')) return `.${host.slice(4)}`
    const parts = host.split('.')
    if (parts.length === 2) return `.${host}`
    return undefined
  } catch {
    return undefined
  }
}

const cookieDomain = getCookieDomain()

function ensureEncryptionKey() {
  if (hasTokenEncryptionKey()) return
  const msg = 'TOKEN_ENCRYPTION_KEY is required to store OAuth tokens securely'
  if (process.env.NODE_ENV === 'production') {
    throw new Error(msg)
  }
  console.warn(`[auth] ${msg} (development only: tokens will remain plaintext)`)
}

function encryptAccountTokens(account: AdapterAccount) {
  const copy = { ...account }
  if (copy.refresh_token) copy.refresh_token = encryptToken(copy.refresh_token) ?? undefined
  if (copy.access_token) copy.access_token = encryptToken(copy.access_token) ?? undefined
  if (copy.id_token) copy.id_token = encryptToken(copy.id_token) ?? undefined
  return copy
}

// Custom adapter that filters out unknown account fields before saving
// and generates referral codes for new users
function createFilteredPrismaAdapter(): Adapter {
  ensureEncryptionKey()
  const baseAdapter = PrismaAdapter(prisma)

  return {
    ...baseAdapter,
    // Generate referralCode for new OAuth users
    createUser: async (user: Omit<AdapterUser, "id">) => {
      const referralCode = generateReferralCode()
      const createdUser = await prisma.user.create({
        data: {
          ...user,
          referralCode,
        },
      })
      return createdUser as AdapterUser
    },
    linkAccount: async (account: AdapterAccount) => {
      const filteredAccount: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(account)) {
        if (ALLOWED_ACCOUNT_FIELDS.has(key)) {
          filteredAccount[key] = value
        }
      }
      const securedAccount = encryptAccountTokens(filteredAccount as AdapterAccount)
      return baseAdapter.linkAccount?.(securedAccount)
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
          prompt: "select_account",
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
      name: process.env.NODE_ENV === 'production'
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
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id ?? token.id
        token.email = (user as any).email ?? token.email
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
          console.error('[auth] Failed to send welcome email:', err)
        })
      }

      if (process.env.NODE_ENV !== 'production') return
      Sentry.withScope((scope) => {
        scope.setTag('auth_event', 'sign_in')
        scope.setTag('provider', account?.provider ?? 'unknown')
        scope.setExtra('isNewUser', isNewUser ?? false)
        if (user?.id) scope.setUser({ id: String(user.id), email: user.email ?? undefined })
        Sentry.captureMessage('auth.sign_in')
      })
    },
    async signOut({ token }) {
      if (!token?.id) return
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
        console.error('[auth] signOut revoke failed', e)
        if (process.env.NODE_ENV === 'production') {
          Sentry.captureException(e)
        }
      }
    },
  },
}
