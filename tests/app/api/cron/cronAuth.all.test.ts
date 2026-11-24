/**
 * /api/cron/* 전 라우트의 인증 경계를 한 표로 고정한다.
 *
 * cron 은 withApiMiddleware 가 아니라 CRON_SECRET bearer(timing-safe) + IP
 * 레이트리밋으로만 보호된다 — 전부 withCronAuth(src/lib/api/middleware/
 * cronGuard.ts) 한 곳을 거친다. 라우트가 가드를 빠뜨리거나 우회하면 하나가
 * 새도 모르므로, 모든 cron 라우트 × GET/POST 에 같은 질문을 던진다:
 *   - 헤더 없음 / 틀린 시크릿 / Bearer 없는 시크릿 → 401 UNAUTHORIZED, 핸들러 미도달
 *   - CRON_SECRET 미설정·빈 문자열 → 401 (fail-closed) + 에러 로그
 *   - 레이트리밋 초과 → 시크릿이 맞아도 429 RATE_LIMITED, 핸들러 미도달
 *   - 맞는 시크릿 → 핸들러 도달 + 200
 * "핸들러 도달" 은 라우트마다 인증 직후 처음 닿는 의존성(sentinel)으로 본다.
 * 하위 의존성은 전부 mock 이라 실제 DB/외부 호출은 없다.
 *
 * 새 cron 라우트를 추가하면 아래 CRON_ROUTES 표에도 넣어야 한다(완전성 테스트).
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { readdirSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'

vi.mock('@/lib/rateLimit', () => ({ rateLimit: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
vi.mock('@/lib/db/prisma', () => ({
  prisma: {
    pushSubscription: { findMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() },
    creditTransaction: { groupBy: vi.fn() },
    bonusCreditPurchase: { groupBy: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}))
vi.mock('@/lib/cache/redis-cache', () => ({
  cacheGet: vi.fn(),
  cacheSet: vi.fn(),
  cacheGetMany: vi.fn(),
}))
vi.mock('@/lib/ops/githubIssue', () => ({
  createGithubIssue: vi.fn(),
  isGithubAutofixConfigured: vi.fn(),
}))
vi.mock('@/lib/telemetry', () => ({ captureException: vi.fn(), captureServerError: vi.fn() }))
vi.mock('@/lib/push/webPush', () => ({ getWebPush: vi.fn() }))
vi.mock('@/lib/push/sender', () => ({ sendPushToTargets: vi.fn() }))
vi.mock('@/lib/push/keyDay', () => ({ buildKeyDayPayload: vi.fn() }))
vi.mock('@/lib/credits/creditService', () => ({ expireBonusCredits: vi.fn() }))
vi.mock('@/lib/credits/sweepExpiredIdempotency', () => ({ sweepExpiredIdempotency: vi.fn() }))
vi.mock('@/lib/db/dataRetention', () => ({ sweepDataRetention: vi.fn() }))
vi.mock('@/lib/credits/reconcileActivity', () => ({ findOrphanedCharges: vi.fn() }))
vi.mock('@/lib/seo/indexnow', () => ({ isIndexNowConfigured: vi.fn(), pingIndexNow: vi.fn() }))
vi.mock('@/lib/social/igToken', () => ({ refreshIgToken: vi.fn() }))
vi.mock('@/lib/social/threadsToken', () => ({ refreshThreadsToken: vi.fn() }))
vi.mock('@/lib/social/draftStore', () => ({
  ensureDrafts: vi.fn(),
  updateDraft: vi.fn(),
  listDraftDates: vi.fn(),
  getDrafts: vi.fn(),
}))
vi.mock('@/lib/social/generateDrafts', () => ({
  generateDailyDrafts: vi.fn(),
  todayKeyKST: vi.fn(),
}))
vi.mock('@/lib/social/video', () => ({ isVideoConfigured: vi.fn(), renderCardReel: vi.fn() }))
vi.mock('@/lib/tarot/shareLink', () => ({ siteBaseUrl: vi.fn() }))
vi.mock('@/lib/social/insights', () => ({
  insightsConfigured: vi.fn(),
  refreshMetricsForDate: vi.fn(),
}))
vi.mock('@/lib/social/publish', () => ({
  autoPublishLocales: vi.fn(),
  configuredPlatforms: vi.fn(),
  publishAndRecord: vi.fn(),
}))
vi.mock('@/lib/social/schedule', () => ({
  pickNextPlatformDraft: vi.fn(),
  platformDailyLimit: vi.fn(),
  publishedPlatformCount: vi.fn(),
}))

import * as anomalyCheck from '@/app/api/cron/anomaly-check/route'
import * as dailyFortune from '@/app/api/cron/daily-fortune/route'
import * as igTokenRefresh from '@/app/api/cron/ig-token-refresh/route'
import * as indexnow from '@/app/api/cron/indexnow/route'
import * as keydayPush from '@/app/api/cron/keyday-push/route'
import * as reconcileActivity from '@/app/api/cron/reconcile-activity/route'
import * as resetCredits from '@/app/api/cron/reset-credits/route'
import * as socialDrafts from '@/app/api/cron/social-drafts/route'
import * as socialInsights from '@/app/api/cron/social-insights/route'
import * as socialPublish from '@/app/api/cron/social-publish/route'
import * as threadsTokenRefresh from '@/app/api/cron/threads-token-refresh/route'
import * as winbackPush from '@/app/api/cron/winback-push/route'

import { rateLimit } from '@/lib/rateLimit'
import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db/prisma'
import { getWebPush } from '@/lib/push/webPush'
import { sendPushToTargets } from '@/lib/push/sender'
import { isGithubAutofixConfigured } from '@/lib/ops/githubIssue'
import { cacheGetMany } from '@/lib/cache/redis-cache'
import { expireBonusCredits } from '@/lib/credits/creditService'
import { sweepExpiredIdempotency } from '@/lib/credits/sweepExpiredIdempotency'
import { sweepDataRetention } from '@/lib/db/dataRetention'
import { findOrphanedCharges } from '@/lib/credits/reconcileActivity'
import { isIndexNowConfigured } from '@/lib/seo/indexnow'
import { refreshIgToken } from '@/lib/social/igToken'
import { refreshThreadsToken } from '@/lib/social/threadsToken'
import { ensureDrafts } from '@/lib/social/draftStore'
import { todayKeyKST } from '@/lib/social/generateDrafts'
import { isVideoConfigured } from '@/lib/social/video'
import { insightsConfigured } from '@/lib/social/insights'
import { autoPublishLocales, configuredPlatforms } from '@/lib/social/publish'

const SECRET = 'cron-secret-for-auth-matrix'
const CLIENT_IP = '203.0.113.7'

type CronHandler = (request: Request) => Promise<Response>
interface CronRoute {
  name: string
  mod: { GET: CronHandler; POST: CronHandler }
  // 인증을 통과한 핸들러가 처음 닿는 의존성 — 401/429 에선 절대 호출되면 안 된다.
  sentinel: () => unknown
}

const CRON_ROUTES: CronRoute[] = [
  {
    name: 'anomaly-check',
    mod: anomalyCheck,
    sentinel: () => prisma.creditTransaction.groupBy,
  },
  { name: 'daily-fortune', mod: dailyFortune, sentinel: () => getWebPush },
  { name: 'ig-token-refresh', mod: igTokenRefresh, sentinel: () => refreshIgToken },
  { name: 'indexnow', mod: indexnow, sentinel: () => isIndexNowConfigured },
  { name: 'keyday-push', mod: keydayPush, sentinel: () => prisma.pushSubscription.findMany },
  { name: 'reconcile-activity', mod: reconcileActivity, sentinel: () => findOrphanedCharges },
  { name: 'reset-credits', mod: resetCredits, sentinel: () => expireBonusCredits },
  { name: 'social-drafts', mod: socialDrafts, sentinel: () => ensureDrafts },
  { name: 'social-insights', mod: socialInsights, sentinel: () => insightsConfigured },
  { name: 'social-publish', mod: socialPublish, sentinel: () => autoPublishLocales },
  {
    name: 'threads-token-refresh',
    mod: threadsTokenRefresh,
    sentinel: () => refreshThreadsToken,
  },
  { name: 'winback-push', mod: winbackPush, sentinel: () => prisma.pushSubscription.findMany },
]

const m = (fn: unknown) => fn as Mock

/** 인증만 통과하면 모든 핸들러가 부작용 없이 200 으로 끝나도록 의존성을 세팅. */
function arrangeHappyPath() {
  m(rateLimit).mockResolvedValue({ allowed: true })
  m(prisma.pushSubscription.findMany).mockResolvedValue([])
  m(prisma.creditTransaction.groupBy).mockResolvedValue([])
  m(prisma.bonusCreditPurchase.groupBy).mockResolvedValue([])
  m(isGithubAutofixConfigured).mockReturnValue(false)
  m(cacheGetMany).mockResolvedValue([])
  m(getWebPush).mockReturnValue({ sendNotification: vi.fn() })
  m(sendPushToTargets).mockResolvedValue({ sent: 0, pruned: 0, failed: 0 })
  m(expireBonusCredits).mockResolvedValue({ expired: 0, totalAmount: 0 })
  m(sweepExpiredIdempotency).mockResolvedValue({})
  m(sweepDataRetention).mockResolvedValue({})
  m(findOrphanedCharges).mockResolvedValue({ scanned: 0, linked: 0, orphaned: [] })
  m(isIndexNowConfigured).mockReturnValue(false)
  m(refreshIgToken).mockResolvedValue({ ok: true, expiresAt: '2027-01-01T00:00:00.000Z' })
  m(refreshThreadsToken).mockResolvedValue({ ok: true, expiresAt: '2027-01-01T00:00:00.000Z' })
  m(todayKeyKST).mockReturnValue('2026-11-24')
  m(ensureDrafts).mockResolvedValue({ drafts: [], created: 0 })
  m(isVideoConfigured).mockReturnValue(false)
  m(insightsConfigured).mockReturnValue(false)
  m(autoPublishLocales).mockReturnValue([])
  m(configuredPlatforms).mockReturnValue([])
}

/** 401/429 는 전 라우트 공통 createErrorResponse 봉투 — { success:false, error:{ code } }. */
async function expectErrorCode(res: Response, status: number, code: string) {
  expect(res.status).toBe(status)
  const body = await res.json()
  expect(body).toMatchObject({ success: false, error: { code, status } })
}

function makeRequest(name: string, method: 'GET' | 'POST', authorization?: string) {
  const headers: Record<string, string> = { 'x-forwarded-for': CLIENT_IP }
  if (authorization !== undefined) headers.authorization = authorization
  return new Request(`http://localhost:3000/api/cron/${name}`, { method, headers })
}

describe('cron 인증 매트릭스 — /api/cron/* 전 라우트', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = {
      ...originalEnv,
      CRON_SECRET: SECRET,
      // 토큰 갱신 cron 이 not_configured 로 빠지지 않고 실제 갱신 경로까지 가게.
      IG_ACCESS_TOKEN: 'ig-token-for-test',
      THREADS_ACCESS_TOKEN: 'threads-token-for-test',
    }
    arrangeHappyPath()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('표가 src/app/api/cron 아래 모든 라우트를 덮는다', () => {
    const cronDir = resolve(process.cwd(), 'src/app/api/cron')
    const onDisk = readdirSync(cronDir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(cronDir, d.name, 'route.ts')))
      .map((d) => d.name)
      .sort()
    expect(CRON_ROUTES.map((r) => r.name).sort()).toEqual(onDisk)
  })

  describe.each(CRON_ROUTES)('$name', ({ name, mod, sentinel }) => {
    describe.each(['GET', 'POST'] as const)('%s', (method) => {
      const call = (authorization?: string) => mod[method](makeRequest(name, method, authorization))

      it('Authorization 헤더가 없으면 401, 핸들러 미도달', async () => {
        const res = await call()
        await expectErrorCode(res, 401, 'UNAUTHORIZED')
        expect(sentinel()).not.toHaveBeenCalled()
      })

      it('틀린 시크릿은 401 — 그 전에 IP 레이트리밋을 먼저 건다', async () => {
        const res = await call('Bearer wrong-secret')
        await expectErrorCode(res, 401, 'UNAUTHORIZED')
        expect(sentinel()).not.toHaveBeenCalled()
        expect(rateLimit).toHaveBeenCalledWith(`cron:${name}:${CLIENT_IP}`, {
          limit: 5,
          windowSeconds: 60,
        })
      })

      it('Bearer 접두어 없는 시크릿은 401', async () => {
        const res = await call(SECRET)
        await expectErrorCode(res, 401, 'UNAUTHORIZED')
        expect(sentinel()).not.toHaveBeenCalled()
      })

      it('CRON_SECRET 미설정이면 맞는 형식이어도 401 (fail-closed) + 에러 로그', async () => {
        delete process.env.CRON_SECRET
        const res = await call(`Bearer ${SECRET}`)
        await expectErrorCode(res, 401, 'UNAUTHORIZED')
        expect(sentinel()).not.toHaveBeenCalled()
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('CRON_SECRET not set'))
      })

      it('CRON_SECRET 이 빈 문자열이면 401 ("Bearer " 로 뚫리지 않음)', async () => {
        process.env.CRON_SECRET = ''
        const res = await call('Bearer ')
        await expectErrorCode(res, 401, 'UNAUTHORIZED')
        expect(sentinel()).not.toHaveBeenCalled()
      })

      it('레이트리밋 초과면 시크릿이 맞아도 429, 핸들러 미도달', async () => {
        m(rateLimit).mockResolvedValueOnce({ allowed: false })
        const res = await call(`Bearer ${SECRET}`)
        await expectErrorCode(res, 429, 'RATE_LIMITED')
        expect(sentinel()).not.toHaveBeenCalled()
      })

      it('맞는 시크릿이면 핸들러에 도달해 200', async () => {
        const res = await call(`Bearer ${SECRET}`)
        expect(res.status).toBe(200)
        expect(sentinel()).toHaveBeenCalledTimes(1)
      })
    })
  })
})
