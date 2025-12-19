import type { NextAuthOptions } from 'next-auth'
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'
import { revokeGoogleTokensForAccount, revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke'
import { encryptToken, hasTokenEncryptionKey } from '@/lib/security/tokenCrypto'
import { generateReferralCode } from '@/lib/referral'

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
  session: {
    strategy: 'jwt',
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
    async signIn({ account }) {
      if (!account) return
      try {
        await revokeGoogleTokensForAccount(account)
      } catch (e) {
        console.error('[auth] signIn revoke failed', e)
      }
    },
    async signOut({ token }) {
      if (!token?.id) return
      try {
        await revokeGoogleTokensForUser(String(token.id))
      } catch (e) {
        console.error('[auth] signOut revoke failed', e)
      }
    },
  },
}
