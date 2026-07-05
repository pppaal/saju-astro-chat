// src/app/api/cron/threads-token-refresh/route.ts
//
// Threads 장기 토큰 주간 갱신 — 60일 만료를 영구 회피한다. 새 토큰은 암호화해
// Redis 에 저장되고(threadsToken.ts), 발행/조회수 코드가 그걸 우선 사용한다.
// 보안은 다른 cron 과 동일: IP 레이트리밋 → timing-safe CRON_SECRET.
//
// Vercel cron: vercel.json — 매주 월요일 20:30 UTC (= 화요일 05:30 KST).

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { createErrorResponse, ErrorCodes } from '@/lib/api/errorHandler'
import { extractLocale } from '@/lib/api/middleware'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { refreshThreadsToken } from '@/lib/social/threadsToken'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 30

function validateCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error('[Cron threads-token-refresh] CRON_SECRET not set - rejecting request')
    return false
  }
  return timingSafeCompare(authHeader ?? '', `Bearer ${cronSecret}`)
}

async function handle(request: Request): Promise<NextResponse> {
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 미설정(토큰 자체가 없음)이면 조용히 no-op — Threads 를 안 쓰는 배포에서
  // 크론이 에러 알람을 만들지 않게.
  if (!(process.env.THREADS_ACCESS_TOKEN || '').trim()) {
    return NextResponse.json({ success: true, skipped: 'not_configured' })
  }

  const result = await refreshThreadsToken()
  if (!result.ok) {
    // 갱신 실패는 던져서 5xx — Vercel cron 로그/알람에 잡히게 (조용한 만료가
    // 가장 나쁜 실패 모드다).
    logger.error('[Cron threads-token-refresh] failed', { error: result.error })
    return NextResponse.json({ success: false, error: result.error }, { status: 500 })
  }
  return NextResponse.json({ success: true, expiresAt: result.expiresAt })
}

export async function GET(request: Request) {
  return handle(request)
}
export async function POST(request: Request) {
  return handle(request)
}
