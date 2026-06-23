// /api/cron/anomaly-check — 이상징후 자동 경보.
//
// /admin/anomalies 는 운영자가 들여다봐야 보이는 수동 화면이다. 이 cron 은
// 같은 신호(기간 내 과다 소비 / 무료 크레딧 과다 수령)를 임계값과 비교해,
// 넘으면 자동으로 GitHub 이슈를 만들고(에러 자동수정 루프와 동일 채널) 로그·
// 카운터를 남긴다. 같은 유저·같은 종류는 하루 한 번만(Redis 디듀프).
//
// 보안은 다른 cron 과 동일: IP 레이트리밋 → timing-safe CRON_SECRET.
// 임계값은 env(ANOMALY_*), 미설정 시 합리적 기본값. GitHub 미설정이면 로그만.
// Vercel cron: 매시간 정각.

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { recordCounter } from '@/lib/metrics/index'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { cacheGet, cacheSet } from '@/lib/cache/redis-cache'
import { createGithubIssue, isGithubAutofixConfigured } from '@/lib/ops/githubIssue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function num(name: string, fallback: number): number {
  const v = Number((process.env[name] || '').trim())
  return Number.isFinite(v) && v > 0 ? v : fallback
}

// 같은 유저·종류는 하루 한 번만 경보.
const DEDUPE_TTL_SECONDS = 24 * 60 * 60
const dedupeKey = (kind: string, userId: string, day: string) => `anomaly:${kind}:${userId}:${day}`

function validateCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron anomaly-check] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(request.headers.get('authorization') ?? '', `Bearer ${cronSecret}`)
}

interface Breach {
  kind: 'consume' | 'free_grant'
  userId: string
  value: number
  threshold: number
}

async function alertBreach(
  breach: Breach,
  windowHours: number
): Promise<'filed' | 'logged' | 'duplicate'> {
  const day = new Date().toISOString().slice(0, 10)
  const key = dedupeKey(breach.kind, breach.userId, day)
  if (await cacheGet<string>(key)) return 'duplicate'

  const user = await prisma.user.findUnique({
    where: { id: breach.userId },
    select: { email: true, name: true },
  })
  const label = breach.kind === 'consume' ? '과다 소비' : '무료 크레딧 과다 수령'
  recordCounter('anomaly.detected', 1, { kind: breach.kind })
  logger.warn('[Cron anomaly-check] breach', {
    kind: breach.kind,
    userId: breach.userId,
    email: user?.email ?? null,
    value: breach.value,
    threshold: breach.threshold,
  })

  let filed: 'filed' | 'logged' = 'logged'
  if (isGithubAutofixConfigured()) {
    try {
      await createGithubIssue({
        title: `[Anomaly] ${label} — ${user?.email ?? breach.userId}`,
        body: [
          `**Automated anomaly alert** (last ${windowHours}h)`,
          '',
          `- **Type:** ${label} (${breach.kind})`,
          `- **User:** ${user?.name ?? ''} ${user?.email ?? ''} (\`${breach.userId}\`)`,
          `- **Value:** ${breach.value} (threshold ${breach.threshold})`,
          '',
          'Review for abuse: check the credit ledger and recent activity for this user.',
          'If legitimate, raise the threshold via the ANOMALY_* env vars.',
        ].join('\n'),
        labels: ['anomaly'],
      })
      filed = 'filed'
    } catch (err) {
      logger.error('[Cron anomaly-check] github issue failed', err)
    }
  }
  await cacheSet(key, '1', DEDUPE_TTL_SECONDS)
  return filed
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:anomaly-check:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/anomaly-check',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const windowHours = num('ANOMALY_WINDOW_HOURS', 24)
  const consumeThreshold = num('ANOMALY_CONSUME_THRESHOLD', 1000)
  const freeThreshold = num('ANOMALY_FREE_THRESHOLD', 500)
  const since = new Date(Date.now() - windowHours * 60 * 60 * 1000)

  const [consumeGroups, grantGroups] = await Promise.all([
    prisma.creditTransaction.groupBy({
      by: ['userId'],
      where: { type: 'CONSUME', createdAt: { gte: since } },
      _sum: { amount: true },
    }),
    prisma.bonusCreditPurchase.groupBy({
      by: ['userId'],
      where: { stripePaymentId: null, createdAt: { gte: since } },
      _sum: { amount: true },
    }),
  ])

  const breaches: Breach[] = []
  for (const g of consumeGroups) {
    const consumed = Math.abs(g._sum.amount ?? 0)
    if (consumed >= consumeThreshold) {
      breaches.push({
        kind: 'consume',
        userId: g.userId,
        value: consumed,
        threshold: consumeThreshold,
      })
    }
  }
  for (const g of grantGroups) {
    const granted = g._sum.amount ?? 0
    if (granted >= freeThreshold) {
      breaches.push({
        kind: 'free_grant',
        userId: g.userId,
        value: granted,
        threshold: freeThreshold,
      })
    }
  }

  let filed = 0
  let duplicate = 0
  for (const b of breaches) {
    const r = await alertBreach(b, windowHours)
    if (r === 'filed') filed += 1
    else if (r === 'duplicate') duplicate += 1
  }

  logger.warn('[Cron anomaly-check] completed', {
    breaches: breaches.length,
    filed,
    duplicate,
    windowHours,
  })
  return NextResponse.json({
    success: true,
    breaches: breaches.length,
    filed,
    duplicate,
    githubConfigured: isGithubAutofixConfigured(),
  })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
