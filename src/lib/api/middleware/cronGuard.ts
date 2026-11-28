/**
 * Cron route guard — /api/cron/* 의 단일 인증 경계.
 *
 * cron 호출자는 Vercel Cron 같은 기계라 세션·CSRF 기반의 withApiMiddleware 가
 * 맞지 않는다. 대신 모든 cron 라우트가 이 가드 하나를 거친다:
 *   1. IP 레이트리밋 (기본 5회/60초) — 시크릿 brute-force 방지라 인증 *전*에 건다.
 *      정상 cron 은 하루 몇 번이라 영향 없음. 초과 시 429.
 *   2. `Authorization: Bearer ${CRON_SECRET}` 를 timing-safe 로 비교 — 단순 === 는
 *      문자 단위 조기 반환으로 시크릿 prefix 를 타이밍으로 추측할 여지를 준다.
 *      CRON_SECRET 이 없거나 비어 있으면 fail-closed: 전부 401 + 에러 로그.
 * 통과하면 handler(request) 를 그대로 호출한다. 핸들러 내부 에러 처리는 라우트 몫.
 *
 * 사용:
 *   async function handle(): Promise<NextResponse> { ... }
 *   export const GET = withCronAuth('reset-credits', handle)
 *   export const POST = GET // 일부 cron 서비스는 POST 만 지원
 *
 * 전 cron 라우트의 401/429 경계는 tests/app/api/cron/cronAuth.all.test.ts 가 핀.
 */

import { logger } from '@/lib/logger'
import { rateLimit } from '@/lib/rateLimit'
import { getClientIp } from '@/lib/request-ip'
import { timingSafeCompare } from '@/lib/security/timingSafe'
import { createErrorResponse, ErrorCodes } from '../errorHandler'
import { extractLocale } from './context'

export type CronHandler = (request: Request) => Promise<Response>

export interface CronAuthOptions {
  /** IP 당 창 안에서 허용할 호출 수 (기본 5). */
  limit?: number
  /** 레이트리밋 창 길이, 초 (기본 60). */
  windowSeconds?: number
}

const DEFAULT_LIMIT = 5
const DEFAULT_WINDOW_SECONDS = 60

function hasValidCronSecret(request: Request, name: string): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    logger.error(`[Cron ${name}] CRON_SECRET not set - rejecting request`)
    return false
  }
  return timingSafeCompare(request.headers.get('authorization') ?? '', `Bearer ${cronSecret}`)
}

/**
 * cron 핸들러를 IP 레이트리밋 + CRON_SECRET 인증으로 감싼다.
 * `name` 은 cron 디렉터리 이름 — 레이트리밋 키(`cron:${name}:${ip}`), 에러
 * 응답의 route(`cron/${name}`), 로그 접두어에 쓰인다.
 */
export function withCronAuth(
  name: string,
  handler: CronHandler,
  { limit = DEFAULT_LIMIT, windowSeconds = DEFAULT_WINDOW_SECONDS }: CronAuthOptions = {}
): CronHandler {
  const route = `cron/${name}`
  return async (request) => {
    const ip = getClientIp(request.headers)
    const rl = await rateLimit(`cron:${name}:${ip}`, { limit, windowSeconds })
    if (!rl.allowed) {
      return createErrorResponse({
        code: ErrorCodes.RATE_LIMITED,
        locale: extractLocale(request),
        route,
      })
    }
    if (!hasValidCronSecret(request, name)) {
      return createErrorResponse({
        code: ErrorCodes.UNAUTHORIZED,
        locale: extractLocale(request),
        route,
      })
    }
    return handler(request)
  }
}
