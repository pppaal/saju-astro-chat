/**
 * /api/cron/ops-report — 일/주간 운영 다이제스트를 운영자에게 발송.
 *
 * 보안은 reset-credits / daily-fortune 과 동일: IP 레이트리밋(5/min) →
 * timing-safe CRON_SECRET 검증. 발송 채널(이메일/웹훅)이 전혀 설정돼 있지
 * 않아도 throw 하지 않고 요약만 돌려준다.
 *
 * 동작:
 *   1. ?period=daily|weekly 로 집계 구간 결정 (기본 daily)
 *   2. collectOpsSnapshot — overview/anomalies 와 동일 기준으로 핵심 지표 집계
 *   3. formatOpsDigest — subject/html/text 생성
 *   4. notifyOps — 어드민 이메일(Resend) + Slack/Discord 웹훅으로 팬아웃
 *
 * 응답: { success, period, dispatch, snapshot(요약) }
 *
 * Vercel cron: vercel.json — daily 23:00 UTC, weekly Mon 23:30 UTC.
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { collectOpsSnapshot, formatOpsDigest, type OpsPeriod } from '@/lib/admin/opsSnapshot'
import { notifyOps } from '@/lib/notify/ops'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron ops-report] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

function resolvePeriod(request: Request): OpsPeriod {
  const p = new URL(request.url).searchParams.get('period')
  return p === 'weekly' ? 'weekly' : 'daily'
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:ops-report:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'cron/ops-report',
      })
    }

    if (!validateCronSecret(request)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'cron/ops-report',
      })
    }

    const period = resolvePeriod(request)
    logger.warn('[Cron ops-report] collecting snapshot', { period })

    const snapshot = await collectOpsSnapshot(period)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? null
    const digest = formatOpsDigest(snapshot, { locale: 'ko', baseUrl })
    const dispatch = await notifyOps({
      subject: digest.subject,
      html: digest.html,
      text: digest.text,
    })

    logger.warn('[Cron ops-report] dispatched', { period, dispatch })

    return NextResponse.json({
      success: true,
      period,
      dispatch,
      snapshot: {
        generatedAt: snapshot.generatedAt,
        users: snapshot.users,
        purchases: snapshot.purchases,
        anomaliesFlagged: snapshot.anomalies.flaggedCount,
      },
    })
  } catch (err: unknown) {
    logger.error('[Cron ops-report error]', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/ops-report',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

// 일부 cron 서비스는 POST 를 사용.
export async function POST(request: Request) {
  return GET(request)
}
