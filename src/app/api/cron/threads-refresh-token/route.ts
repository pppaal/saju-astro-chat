// /api/cron/threads-refresh-token — Threads 장기 토큰 자동 갱신.
//
// Threads long-lived 토큰은 약 60일 뒤 만료된다. 매일 이 cron 이 refresh
// 엔드포인트로 새 60일 토큰을 받아 Redis 에 보관(threadsToken)해, 발행이
// 영구히 살아있게 한다. 토큰(env 초기 시드)이 아예 없으면 503 not_configured.
//
// 보안은 다른 cron 과 동일: IP 레이트리밋 → timing-safe CRON_SECRET.
// Vercel cron / GitHub Actions: 매일 03:00 UTC (= KST 12:00).

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { refreshThreadsToken } from '@/lib/social/publish/threadsToken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function validateCronSecret(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron threads-refresh-token] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(request.headers.get('authorization') ?? '', `Bearer ${cronSecret}`)
}

async function handle(request: Request): Promise<NextResponse> {
  const ip = getClientIp(request.headers)
  const rl = await rateLimit(`cron:threads-refresh-token:${ip}`, { limit: 5, windowSeconds: 60 })
  if (!rl.allowed) {
    return createErrorResponse({
      code: ErrorCodes.RATE_LIMITED,
      locale: extractLocale(request),
      route: 'cron/threads-refresh-token',
    })
  }
  if (!validateCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await refreshThreadsToken()

  // 토큰 자체가 없으면 기능 미설정 — 빌드/기동은 안 깨지고 503.
  if (!result.ok && result.error === 'no_token') {
    return createErrorResponse({
      code: ErrorCodes.SERVICE_UNAVAILABLE,
      message: 'not_configured',
      locale: extractLocale(request),
      route: 'cron/threads-refresh-token',
    })
  }

  if (!result.ok) {
    logger.error('[Cron threads-refresh-token] refresh failed', { error: result.error })
    return NextResponse.json({ success: false, error: result.error }, { status: 502 })
  }

  logger.warn('[Cron threads-refresh-token] refreshed', { expiresIn: result.expiresIn })
  return NextResponse.json({ success: true, expiresIn: result.expiresIn })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
