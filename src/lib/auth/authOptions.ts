import type { NextAuthOptions } from 'next-auth'
import type { Adapter, AdapterAccount } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from '@/lib/db/prisma'
import { revokeGoogleTokensForAccount, revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke'

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

// Custom adapter that filters out unknown account fields before saving
function createFilteredPrismaAdapter(): Adapter {
  const baseAdapter = PrismaAdapter(prisma)

  return {
    ...baseAdapter,
    linkAccount: async (account: AdapterAccount) => {
      const filteredAccount: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(account)) {
        if (ALLOWED_ACCOUNT_FIELDS.has(key)) {
          filteredAccount[key] = value
        }
      }
      return baseAdapter.linkAccount?.(filteredAccount as AdapterAccount)
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
