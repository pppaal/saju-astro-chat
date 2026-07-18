// src/app/api/cron/social-publish/route.ts
//
// 시간 분산 자동 발행(Threads·Instagram) — 하루 3회(아침/점심/저녁) 돌면서
// 플랫폼별 하루 상한을 3회에 나눠 소진한다(회당 ceil(상한/3)개). 기본 상한은
// Threads 6(테마 6종 전부 = 회당 2개) · IG 2(피드 도배 방지, 회당 1개) —
// SOCIAL_THREADS_DAILY_LIMIT / SOCIAL_IG_DAILY_LIMIT 로 조절. 자동모드
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

// 하루 3회 크론이 도는 전제 — 하루 상한을 3회에 나눠 소진한다. Threads 상한
// 6이면 회당 2개(아침/점심/저녁 2개씩 = 테마 6종 전부), IG 상한 2면 회당 1개.
// "한 번에 우르르" 방지(도달·체감)와 "테마별 전부 발행"을 동시에 만족.
const CRON_RUNS_PER_DAY = 3

async function publishBatchFor(
  platform: AutoPublishPlatform,
  date: string,
  locales: Array<'ko' | 'en'>
): Promise<PlatformOutcome> {
  const limit = platformDailyLimit(platform)
  const perRun = Math.max(1, Math.ceil(limit / CRON_RUNS_PER_DAY))

  let published = 0
  let lastId: string | undefined
  let lastErr: string | undefined
  for (let i = 0; i < perRun; i++) {
    const already = publishedPlatformCount(await getDrafts(date), platform)
    if (already >= limit) {
      if (published === 0) return { platform, published, reason: 'limit' }
      break
    }
    const draft = await pickNextPlatformDraft(date, locales, platform)
    if (!draft) {
      if (published === 0) return { platform, published, reason: 'none_pending' }
      break
    }
    const { results } = await publishAndRecord(draft, [platform])
    const ok = results.some((r) => r.ok && r.platform === platform)
    const err = results.find((r) => r.platform === platform && !r.ok)?.error
    logger.info('[Cron social-publish] published', { date, platform, id: draft.id, ok, err })
    lastId = draft.id
    if (ok) published += 1
    if (err) {
      // 발행 실패(토큰 만료 등)는 반복해도 같은 결과 — 이번 run 은 중단하고
      // 다음 크론/수동에서 재시도. 초안은 미발행으로 남는다.
      lastErr = err
      break
    }
  }
  return { platform, published, id: lastId, error: lastErr }
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
      outcomes.push(await publishBatchFor(platform, date, locales))
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
