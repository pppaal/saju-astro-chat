// src/app/api/cron/social-publish/route.ts
//
// Threads 시간 분산 자동 발행 — 하루 3회(아침/점심/저녁) 돌면서 매 회 초안
// 1개를 발행한다. "한 번에 우르르" 대신 사람처럼 나눠 올려 도달·체감을 지킨다.
// 하루 상한(SOCIAL_THREADS_DAILY_LIMIT, 기본 2)까지만 나가고, 자동모드
// (SOCIAL_AUTO_PUBLISH)가 꺼져 있으면 no-op(어드민 수동 발행만).
//
// Vercel cron: vercel.json — 22/03/10 UTC (= 07/12/19 KST). 생성 크론(21 UTC)
// 뒤에 첫 발행이 오도록 배치. 보안은 다른 cron 과 동일.

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { getDrafts } from '@/lib/social/draftStore'
import { todayKeyKST } from '@/lib/social/generateDrafts'
import { autoPublishLocales, configuredPlatforms, publishAndRecord } from '@/lib/social/publish'
import {
  pickNextThreadsDraft,
  publishedThreadsCount,
  threadsDailyLimit,
} from '@/lib/social/schedule'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron social-publish] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:social-publish:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/social-publish',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const locales = autoPublishLocales()
  // 자동모드 OFF 또는 Threads 미설정이면 아무것도 하지 않는다(수동 발행 흐름).
  if (locales.length === 0 || !configuredPlatforms().includes('threads')) {
    return NextResponse.json({ success: true, skipped: 'auto_publish_off' })
  }

  const date = todayKeyKST()
  const limit = threadsDailyLimit()
  const already = publishedThreadsCount(await getDrafts(date))
  if (already >= limit) {
    return NextResponse.json({ success: true, date, published: 0, already, limit, reason: 'limit' })
  }

  const draft = await pickNextThreadsDraft(date, locales)
  if (!draft) {
    return NextResponse.json({ success: true, date, published: 0, already, reason: 'none_pending' })
  }

  try {
    const { results } = await publishAndRecord(draft, ['threads'])
    const ok = results.some((r) => r.ok && r.platform === 'threads')
    const err = results.find((r) => r.platform === 'threads' && !r.ok)?.error
    logger.info('[Cron social-publish] published', { date, id: draft.id, ok, err })
    return NextResponse.json({
      success: true,
      date,
      published: ok ? 1 : 0,
      id: draft.id,
      error: err,
    })
  } catch (error) {
    // 발행 실패는 5xx 로 — 조용한 미발행보다 알람이 낫다. 초안은 남아 다음
    // 크론/수동 발행에서 재시도된다.
    logger.error('[Cron social-publish] publish failed', { date, id: draft.id, error })
    return NextResponse.json({ success: false, error: 'publish_failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
