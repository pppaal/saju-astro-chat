// /api/cron/winback-push — 휴면 사용자 윈백 푸시.
//
// "예전엔 크레딧을 썼는데(CONSUME) 최근 N일째 안 쓴" 사용자 중 활성 푸시
// 구독자에게 무료 미끼(오늘의 타로/궁합)를 보내 재유입시킨다. CONSUME 을
// 활동 신호로 쓰는 이유: 자동 지급/월 리셋(GRANT/SIGNUP_BONUS)에 오염되지
// 않는 "진짜 사용"이기 때문. 과발송 방지로 Redis 마커(유저당 1회/창)를 둔다.
//
// 보안은 다른 cron 과 동일: IP 레이트리밋 → timing-safe CRON_SECRET.
// Vercel cron: 매일 04:00 UTC (= 한국 오후 13:00 KST, 점심 후 한가한 시간).

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { cacheGetMany, cacheSet } from '@/lib/cache/redis-cache'
import { sendPushToTargets, type PushPayload, type PushTarget } from '@/lib/push/sender'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

// 휴면 기준 — 마지막 CONSUME 이 이보다 오래면 휴면.
const DORMANT_DAYS = 14
// 같은 유저에게 윈백을 다시 보내기까지 최소 간격(마커 TTL).
const WINBACK_COOLDOWN_DAYS = 21
const markerKey = (userId: string) => `winback:sent:${userId}`

function validateCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron winback-push] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(request.headers.get('authorization') ?? '', `Bearer ${cronSecret}`)
}

// 날짜로 도는 결정론 미끼 — LLM 없이 무료 도구로 유도.
function winbackPayload(locale: 'ko' | 'en', now: Date): PushPayload {
  const ko = locale === 'ko'
  const variants: PushPayload[] = ko
    ? [
        {
          title: '오늘의 타로 한 장 🔮',
          body: '오랜만이에요. 오늘 당신을 위한 카드가 기다려요.',
          url: '/free',
        },
        {
          title: '요즘 흐름이 궁금하다면 🌙',
          body: '무료로 오늘의 운세와 큰 날을 다시 확인해보세요.',
          url: '/free',
        },
        {
          title: '궁합이 궁금한 사람 있나요? 💞',
          body: '두 사람 생년월일만으로 무료로 확인할 수 있어요.',
          url: '/compatibility/free',
        },
      ]
    : [
        {
          title: 'Your card for today 🔮',
          body: 'It’s been a while — a card is waiting for you.',
          url: '/free',
        },
        {
          title: 'Curious about your flow? 🌙',
          body: 'Check today’s fortune and key days, free.',
          url: '/free',
        },
        {
          title: 'Someone on your mind? 💞',
          body: 'Check your match free — just two birth dates.',
          url: '/compatibility/free',
        },
      ]
  const idx =
    (now.getUTCFullYear() * 372 + now.getUTCMonth() * 31 + now.getUTCDate()) % variants.length
  return { ...variants[idx], tag: 'winback' }
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:winback-push:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/winback-push',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  const cutoff = new Date(now.getTime() - DORMANT_DAYS * 86_400_000)

  // 활성 구독(연속실패 5 미만)만.
  const subs = await prisma.pushSubscription.findMany({
    where: { failCount: { lt: 5 } },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
      failCount: true,
      locale: true,
      userId: true,
    },
    orderBy: { createdAt: 'asc' },
  })
  if (subs.length === 0) {
    return NextResponse.json({ success: true, sent: 0, dormant: 0, total: 0 })
  }

  const userIds = [...new Set(subs.map((s) => s.userId))]

  // 유저별 마지막 CONSUME 시각 — 진짜 사용 신호.
  const lastConsume = await prisma.creditTransaction.groupBy({
    by: ['userId'],
    where: { userId: { in: userIds }, type: 'CONSUME' },
    _max: { createdAt: true },
  })
  const lastConsumeAt = new Map<string, Date>()
  for (const r of lastConsume) {
    if (r._max.createdAt) lastConsumeAt.set(r.userId, r._max.createdAt)
  }

  // 휴면 = 한 번이라도 CONSUME 했고(활성화된 적 있음) 그게 cutoff 이전.
  const dormantUserIds = userIds.filter((id) => {
    const last = lastConsumeAt.get(id)
    return last !== undefined && last < cutoff
  })
  if (dormantUserIds.length === 0) {
    return NextResponse.json({ success: true, sent: 0, dormant: 0, total: subs.length })
  }

  // 최근에 이미 윈백 보낸 유저는 제외(쿨다운).
  const markers = await cacheGetMany<string>(dormantUserIds.map(markerKey))
  const eligible = new Set(dormantUserIds.filter((_, i) => !markers[i]))
  if (eligible.size === 0) {
    return NextResponse.json({
      success: true,
      sent: 0,
      dormant: dormantUserIds.length,
      total: subs.length,
    })
  }

  const targets: PushTarget[] = subs
    .filter((s) => eligible.has(s.userId))
    .map((s) => ({
      id: s.id,
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
      failCount: s.failCount,
    }))

  const localeBySubId = new Map(subs.map((s) => [s.id, s.locale === 'en' ? 'en' : 'ko'] as const))

  const summary = await sendPushToTargets(
    targets,
    (t) => winbackPayload(localeBySubId.get(t.id) ?? 'ko', now),
    { ttlSeconds: 24 * 60 * 60, label: 'winback' }
  )

  // 쿨다운 마커 — 발송 시도한 유저 단위로(중복 발송 방지). 발송 성공/실패 무관하게
  // 마킹해 다음 날 다시 쏘지 않게 한다(실패는 sender 가 failCount 로 별도 정리).
  await Promise.all(
    [...eligible].map((id) =>
      cacheSet(markerKey(id), now.toISOString(), WINBACK_COOLDOWN_DAYS * 86_400)
    )
  )

  logger.warn('[Cron winback-push] completed', {
    ...summary,
    dormant: dormantUserIds.length,
    eligible: eligible.size,
  })
  return NextResponse.json({ success: true, ...summary, dormant: dormantUserIds.length })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
