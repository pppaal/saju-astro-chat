// /api/cron/threads-tarot — Threads 데일리 자동 게시(주제 로테이션).
//
// 슬롯마다 주제가 다르다: 아침=타로 / 오후=사주(일진) / 저녁=점성(하늘).
// 슬롯의 주제 빌더로 게시물(캡션 + 해시태그 + 이미지/공유링크)을 만들어
// threadsAdapter 로 올린다(buildDailyThreadPost). 소셜에서 들어온 사람이 무료
// 퍼널(/free)로 이어지는 유입 루프가 목적.
//
// 보안은 다른 cron 과 동일: IP 레이트리밋 → timing-safe CRON_SECRET.
// 토큰(THREADS_*) 미설정이면 503 'not_configured' (throw 금지 — 배포는 깨지지
// 않고, 토큰 넣으면 그때부터 발행). 슬롯·날짜별 1회 가드로 Vercel cron 과
// GitHub Actions 가 같은 슬롯을 둘 다 때려도 한 번만 게시.
//
// Vercel cron / GitHub Actions: 하루 3회 — 00:00 / 05:00 / 10:00 UTC
// (= KST 09:00 / 14:00 / 19:00). 슬롯은 KST 시각대로 핸들러가 판정한다.

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { threadsAdapter } from '@/lib/social/publish/threads'
import { slotFromKst, isThreadSlot, type ThreadSlot } from '@/lib/social/tarotThread'
import { buildDailyThreadPost } from '@/lib/social/threadDaily'
import { claimDailyOnce } from '@/lib/cron/dailyOnce'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function validateCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron threads-tarot] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(request.headers.get('authorization') ?? '', `Bearer ${cronSecret}`)
}

// 게시 로케일 — 기본 ko. THREADS_POST_LOCALE=en 으로 영어 계정에 맞출 수 있음.
function postLocale(): 'ko' | 'en' {
  return (process.env.THREADS_POST_LOCALE || '').trim().toLowerCase() === 'en' ? 'en' : 'ko'
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:threads-tarot:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/threads-tarot',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 토큰 미설정 — 기능 비활성. 빌드/기동은 깨지지 않고 cron 만 503.
  if (!threadsAdapter.isConfigured()) {
    return createErrorResponse({
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message: 'not_configured',
      locale: extractLocale(request),
      route: 'cron/threads-tarot',
    })
  }

  const now = new Date()
  // 슬롯: ?slot= 으로 수동 지정 가능(테스트/수동 실행), 없으면 KST 시각대로.
  const url = new URL(request.url)
  const slotParam = url.searchParams.get('slot')
  const slot: ThreadSlot = isThreadSlot(slotParam) ? slotParam : slotFromKst(now)

  // 슬롯·날짜별 1회 — 두 스케줄러가 같은 슬롯을 때려도 한 번만 게시.
  if (!(await claimDailyOnce(`threads-tarot:${slot}`, now))) {
    logger.warn('[Cron threads-tarot] already posted this slot — skipping', { slot })
    return NextResponse.json({ success: true, slot, skipped: 'already_posted', posted: false })
  }

  const locale = postLocale()
  const post = await buildDailyThreadPost(slot, locale, now)
  if (!post) {
    logger.error('[Cron threads-tarot] failed to build post', { slot, locale })
    return NextResponse.json({ success: false, slot, error: 'build_failed' }, { status: 500 })
  }

  const result = await threadsAdapter.publish({
    caption: post.caption,
    hashtags: post.hashtags,
    imageUrl: post.imageUrl,
  })

  logger.warn('[Cron threads-tarot] completed', {
    slot,
    topic: post.topic,
    locale,
    summary: post.summary,
    shareUrl: post.shareUrl,
    ok: result.ok,
    externalId: result.externalId,
    error: result.error,
  })

  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        slot,
        topic: post.topic,
        error: result.error ?? result.skipped ?? 'publish_failed',
      },
      { status: 502 }
    )
  }

  return NextResponse.json({
    success: true,
    slot,
    topic: post.topic,
    posted: true,
    summary: post.summary,
    shareUrl: post.shareUrl,
    url: result.url,
  })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
