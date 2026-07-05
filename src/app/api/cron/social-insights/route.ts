// src/app/api/cron/social-insights/route.ts
//
// 발행된 Threads 게시물의 조회수/좋아요를 매일 자동 수집 — 어드민이 버튼을
// 누르지 않아도 대시보드가 항상 최신이 되도록. 최근 7일(인덱스 기준)만 갱신
// — 그 이후 글은 수치가 사실상 굳는다. 보안은 다른 cron 과 동일.
//
// Vercel cron: vercel.json — 매일 22:30 UTC (= 한국 아침 07:30 KST).

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { listDraftDates } from '@/lib/social/draftStore'
import { insightsConfigured, refreshMetricsForDate } from '@/lib/social/insights'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

const REFRESH_RECENT_DATES = 7

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron social-insights] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:social-insights:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/social-insights',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!insightsConfigured()) {
    return NextResponse.json({ success: true, skipped: 'not_configured' })
  }

  const dates = (await listDraftDates()).slice(0, REFRESH_RECENT_DATES)
  let totalUpdated = 0
  let firstError: string | null = null
  for (const date of dates) {
    const { updated, firstError: err } = await refreshMetricsForDate(date)
    totalUpdated += updated
    if (err && !firstError) firstError = err
  }

  logger.info('[Cron social-insights] done', { dates: dates.length, totalUpdated, firstError })
  // 부분 실패(권한 등)는 200 + 필드로 보고 — 게시물 0건인 날이 섞여 있는 게
  // 정상 상태라, 여기서 5xx 를 내면 노이즈 알람이 된다.
  return NextResponse.json({
    success: true,
    dates: dates.length,
    updated: totalUpdated,
    firstError,
  })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
