/**
 * /api/cron/threads-token-refresh — Threads 장기 토큰(~60일 만료) 자동 갱신.
 *
 * 보안은 다른 cron 과 동일: IP 레이트리밋(5/min) → timing-safe CRON_SECRET.
 * 주기적으로(주 1회) 호출되어 토큰을 다시 ~60일 연장 → DB 에 재저장한다.
 * 토큰이 없거나(미설정) 메타가 갱신을 거부하면 throw 없이 skipped 반환.
 *
 * Vercel cron: vercel.json — 매주 1회 (만료 60일보다 훨씬 짧은 주기).
 */

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { refreshThreadsTokenAndStore } from '@/lib/social/threadsToken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron threads-token-refresh] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:threads-token-refresh:${ip}`, { limit: 5, windowSeconds: 60 })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route: 'cron/threads-token-refresh',
      })
    }

    if (!validateCronSecret(request)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route: 'cron/threads-token-refresh',
      })
    }

    const outcome = await refreshThreadsTokenAndStore()
    return NextResponse.json({ success: outcome.status === 'refreshed', ...outcome })
  } catch (err: unknown) {
    logger.error('[Cron threads-token-refresh error]', err)
    return createErrorResponse({
      code: ErrorCodes.INTERNAL_ERROR,
      route: 'cron/threads-token-refresh',
      originalError: err instanceof Error ? err : new Error(String(err)),
    })
  }
}

export async function POST(request: Request) {
  return GET(request)
}
