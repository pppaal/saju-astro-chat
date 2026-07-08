import type { NextAuthConfig } from 'next-auth'
import type { Adapter, AdapterAccount, AdapterUser } from 'next-auth/adapters'
import GoogleProvider from 'next-auth/providers/google'
import KakaoProvider from 'next-auth/providers/kakao'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/db/prisma'
import { withDbRetry } from '@/lib/db/retry'
import { revokeGoogleTokensForAccount, revokeGoogleTokensForUser } from '@/lib/auth/tokenRevoke'
import { encryptToken, hasTokenEncryptionKey } from '@/lib/security/tokenCrypto'
import { generateReferralCode } from '@/lib/referral'
import { logger } from '@/lib/logger'

// ============================================
// OAuth providers (Google)
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

  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL
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
        const createdUser = await withDbRetry(
          () =>
            prisma.user.create({
              data: {
                ...user,
                settings: {
                  create: {
                    referralCode,
                  },
                },
              },
            }),
          { label: 'adapter.createUser' }
        )
        return createdUser as AdapterUser
      } catch (error) {
        logger.error('[auth] createUser failed:', error)
        throw error
      }
    },
    // 매 세션 refresh 마다 호출되는 hot path — 25+ 컬럼 + 관계 전부 가져
    // 오던 default SELECT 를 next-auth 가 실제로 쓰는 5 컬럼만 명시.
    // 이벤트 트래픽 시 분당 수천 회 호출 → pgbouncer connection 시간 단축.
    getUser: async (id: string) => {
      const user = await withDbRetry(
        () =>
          prisma.user.findUnique({
            where: { id },
            select: { id: true, name: true, email: true, emailVerified: true, image: true },
          }),
        { label: 'adapter.getUser' }
      )
      return (user as AdapterUser) ?? null
    },
    getUserByEmail: async (email: string) => {
      const user = await withDbRetry(
        () =>
          prisma.user.findUnique({
            where: { email },
            select: { id: true, name: true, email: true, emailVerified: true, image: true },
          }),
        { label: 'adapter.getUserByEmail' }
      )
      return (user as AdapterUser) ?? null
    },
    getUserByAccount: async (
      providerAccountId: Pick<AdapterAccount, 'provider' | 'providerAccountId'>
    ) => {
      try {
        // Use raw SQL to avoid Prisma 7.x driver adapter P2022 bug with compound unique keys
        const users = await withDbRetry(
          () => prisma.$queryRaw<AdapterUser[]>`
          SELECT u.* FROM "User" u
          INNER JOIN "Account" a ON a."userId" = u."id"
          WHERE a."provider" = ${providerAccountId.provider}
            AND a."providerAccountId" = ${providerAccountId.providerAccountId}
          LIMIT 1
        `,
          { label: 'adapter.getUserByAccount' }
        )
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
        await withDbRetry(() => prisma.account.create({ data: securedAccount as never }), {
          label: 'adapter.linkAccount',
        })
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
      // 동일하게 hot path. include: { user: true } 가 User 의 모든 컬럼 +
      // 관계까지 join — next-auth 가 실제로 쓰는 건 user 의 5 필드만.
      const sessionAndUser = await prisma.session.findUnique({
        where: { sessionToken },
        select: {
          sessionToken: true,
          userId: true,
          expires: true,
          user: {
            select: { id: true, name: true, email: true, emailVerified: true, image: true },
          },
        },
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

const providers: NextAuthConfig['providers'] = []

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

// 카카오 로그인 — 한국 시장 핵심 진입로. 구글 OAuth 는 카톡/인스타 인앱
// 브라우저에서 disallowed_useragent 로 막히지만(외부 브라우저 점프 우회 중)
// 카카오 OAuth 는 웹뷰에서도 동작해, 카톡으로 퍼진 공유 링크의 로그인 전환이
// 끊기지 않는다. User.email 은 nullable — 카카오가 이메일 미제공(동의 항목
// 미승인)이어도 가입은 진행된다. env 미설정 시 버튼/provider 모두 비노출.
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    })
  )
}

export const authOptions: NextAuthConfig = {
  adapter: createFilteredPrismaAdapter(),
  providers,
  // v5 는 AUTH_SECRET 을 우선 읽지만, 기존 배포 env(NEXTAUTH_SECRET)와의
  // 호환을 위해 명시적으로 둘 다 지원한다.
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  // Vercel/프록시 뒤에서 Host 헤더 신뢰 (v4 의 NEXTAUTH_URL 기반 동작 대체).
  trustHost: true,
  pages: {
    signIn: '/auth/signin',
    // 기본 @auth/core 에러 페이지("There is a problem with the server
    // configuration")는 영문 + 날것이라 사용자에게 그대로 노출되면 마치
    // 서비스가 죽은 것처럼 보인다. 실제로는 OAuth 콜백 중 어댑터가 일시적
    // DB 실패로 throw → CallbackRouteError → 무조건 ?error=Configuration 으로
    // 떨어지는 경우가 대부분이라, 한국어로 "잠시 후 다시 시도" 안내 + 재시도
    // 버튼을 주는 커스텀 페이지로 대체한다. (이 페이지는 인증을 요구하지
    // 않으므로 ErrorPageLoop 위험 없음.)
    error: '/auth/error',
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
      // Don't log the raw email (PII) on every sign-in; log presence only.
      logger.info(
        `[auth] signIn callback: provider=${account?.provider} hasEmail=${!!user?.email} profile=${!!profile}`
      )
      return true
    },
    async jwt({ token, user, trigger, session: updatedSession }) {
      if (user) {
        token.id = user.id ?? token.id
        token.email = user.email ?? token.email
        token.name = user.name ?? token.name
      }
      // /profile 에서 이름 변경 시 useSession().update({ name }) 호출 → trigger='update'
      // 햄버거 등 useSession 으로 name 읽는 컴포넌트가 즉시 반영되도록 token 갱신.
      // pricing 의 EmailCollectionModal 에서 결제 직전 이메일 보충 시도
      // useSession().update({ email }) 형태로 jwt 콜백을 호출. 단 client 가
      // 보낸 email 을 그대로 신뢰하면 악성 client 가 임의 이메일을 token 에
      // 박을 수 있어서 (이후 /api/checkout 의 Stripe customer_email 로 사용)
      // 위험. 그래서 update + email 트리거를 보면 token 의 user id 로 DB 의
      // 진짜 email 을 다시 읽어 token.email 을 sync 한다. /api/me/email 에서
      // 이미 DB 에 commit 된 상태여야 정상 흐름.
      if (trigger === 'update' && updatedSession && typeof updatedSession === 'object') {
        const next = updatedSession as { name?: unknown; email?: unknown }
        if (typeof next.name === 'string' && next.name.trim()) {
          token.name = next.name.trim()
        }
        // email 갱신 요청이 들어오면 DB 에서 fresh read. update() 가 payload
        // 없이 호출돼도 (next-auth 의 일반 refresh 패턴) email 키 자체가
        // 존재하면 trigger 로 본다.
        if ('email' in next && token.id) {
          try {
            const fresh = await prisma.user.findUnique({
              where: { id: String(token.id) },
              select: { email: true },
            })
            if (fresh?.email) {
              token.email = fresh.email
            }
          } catch (err) {
            logger.warn('[auth] jwt update: failed to refresh email from DB', err)
          }
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        if (typeof token.name === 'string') {
          session.user.name = token.name
        }
      }
      return session
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
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
    // v5 의 signOut 이벤트 메시지는 세션 전략에 따라 { session } | { token }
    // 유니언 — JWT 전략이므로 token 쪽만 사용한다.
    async signOut(message) {
      const token = 'token' in message ? message.token : null
      if (!token?.id) {
        return
      }
      const userId = String(token.id)
      try {
        const result = await revokeGoogleTokensForUser(userId)

        // `revokeGoogleTokensForUser` no longer wipes DB tokens on Google-side
        // failure (it used to scrub unconditionally, which orphaned the grant
        // at Google with no refresh_token left to ever revoke it). When the
        // call fails we surface that here so it's visible in logs and Sentry
        // and the row is left intact for a retry path (next signOut, cron, or
        // manual admin action).
        if (!result.cleared && result.reason !== 'no_account') {
          logger.error(
            `[auth] signOut: Google token revoke failed; DB row left intact for retry. userId=${userId} reason=${result.reason}`
          )
          if (process.env.NODE_ENV === 'production') {
            Sentry.withScope((scope) => {
              scope.setTag('auth_event', 'sign_out_revoke_failed')
              scope.setTag('revoke_reason', result.reason ?? 'unknown')
              scope.setUser({ id: userId })
              Sentry.captureMessage('auth.sign_out_revoke_failed', 'error')
            })
          }
        } else if (process.env.NODE_ENV === 'production') {
          Sentry.withScope((scope) => {
            scope.setTag('auth_event', 'sign_out')
            scope.setUser({ id: userId })
            Sentry.captureMessage('auth.sign_out')
          })
        }
      } catch (e) {
        logger.error('[auth] signOut revoke threw', e)
        if (process.env.NODE_ENV === 'production') {
          Sentry.captureException(e)
        }
      }
    },
  },
}
