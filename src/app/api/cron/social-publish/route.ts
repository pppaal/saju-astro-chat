// src/app/api/cron/social-publish/route.ts
//
// 시간 분산 자동 발행(Threads·Instagram) — 하루 3회(아침/점심/저녁) 돌면서
// 매 회 플랫폼별 초안 1개씩 발행한다. "한 번에 우르르" 대신 사람처럼 나눠
// 올려 도달·체감을 지킨다. 플랫폼별 하루 상한(SOCIAL_THREADS_DAILY_LIMIT
// 기본 2 · SOCIAL_IG_DAILY_LIMIT 기본 1)까지만 나가고, 자동모드
// (SOCIAL_AUTO_PUBLISH)가 꺼져 있으면 no-op(어드민 수동 발행만).
// 유튜브는 영상 렌더링이 없어 수동 유지.
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
  pickNextPlatformDraft,
  platformDailyLimit,
  publishedPlatformCount,
  type AutoPublishPlatform,
} from '@/lib/social/schedule'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const AUTO_PLATFORMS: readonly AutoPublishPlatform[] = ['threads', 'instagram']

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron social-publish] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

interface PlatformOutcome {
  platform: AutoPublishPlatform
  published: number
  id?: string
  error?: string
  reason?: string
}

async function publishOneFor(
  platform: AutoPublishPlatform,
  date: string,
  locales: Array<'ko' | 'en'>
): Promise<PlatformOutcome> {
  const limit = platformDailyLimit(platform)
  const already = publishedPlatformCount(await getDrafts(date), platform)
  if (already >= limit) return { platform, published: 0, reason: 'limit' }

  const draft = await pickNextPlatformDraft(date, locales, platform)
  if (!draft) return { platform, published: 0, reason: 'none_pending' }

  const { results } = await publishAndRecord(draft, [platform])
  const ok = results.some((r) => r.ok && r.platform === platform)
  const err = results.find((r) => r.platform === platform && !r.ok)?.error
  logger.info('[Cron social-publish] published', { date, platform, id: draft.id, ok, err })
  return { platform, published: ok ? 1 : 0, id: draft.id, error: err }
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
  const targets = AUTO_PLATFORMS.filter((p) => configuredPlatforms().includes(p))
  // 자동모드 OFF 또는 자동 발행 가능 플랫폼 미설정이면 no-op(수동 발행 흐름).
  if (locales.length === 0 || targets.length === 0) {
    return NextResponse.json({ success: true, skipped: 'auto_publish_off' })
  }

  const date = todayKeyKST()
  const outcomes: PlatformOutcome[] = []
  let anyThrew = false
  for (const platform of targets) {
    try {
      outcomes.push(await publishOneFor(platform, date, locales))
    } catch (error) {
      // 한 플랫폼 실패가 다른 플랫폼 발행을 막지 않게 — 초안은 남아 다음
      // 크론/수동 발행에서 재시도된다.
      anyThrew = true
      logger.error('[Cron social-publish] publish failed', { date, platform, error })
      outcomes.push({ platform, published: 0, error: 'publish_failed' })
    }
  }

  // 전 플랫폼이 예외로 죽었으면 5xx — 조용한 미발행보다 알람이 낫다.
  if (anyThrew && outcomes.every((o) => o.published === 0)) {
    return NextResponse.json({ success: false, date, outcomes }, { status: 500 })
  }
  return NextResponse.json({
    success: true,
    date,
    published: outcomes.reduce((n, o) => n + o.published, 0),
    outcomes,
  })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
