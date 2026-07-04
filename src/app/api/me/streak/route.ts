/**
 * /api/me/streak — 방문 스트릭 체크인 (로그인 사용자 교차기기 영속).
 *
 * POST { today: 'YYYY-MM-DD' } — 클라이언트 *로컬* 날짜로 체크인.
 *   같은 날 재호출은 count 유지(자연 멱등), 어제에 이어지면 +1, 공백이면 1 리셋
 *   — 판정은 클라 칩과 동일한 순수 로직(computeStreak, SSOT)을 재사용한다.
 *   today 는 서버 UTC 날짜 ±2일 이내만 허용(시간대 스펙트럼 커버 + 조작 상한).
 *   스트릭은 과금 무관 코스메틱 지표라 이 이상의 검증은 두지 않는다.
 *
 * 반환: { count, longest } — StreakChip 이 그대로 렌더.
 * 익명 사용자는 이 라우트를 타지 않고 localStorage 경로(StreakChip 폴백) 유지.
 */

import { NextRequest } from 'next/server'
import {
  withApiMiddleware,
  createAuthenticatedGuard,
  apiSuccess,
  apiError,
  ErrorCodes,
  type ApiContext,
} from '@/lib/api/middleware'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { streakCheckinSchema } from '@/lib/api/zodValidation'
import { computeStreak } from '@/lib/calendar/streak'

export const dynamic = 'force-dynamic'

/** 'YYYY-MM-DD' → UTC epoch day. (streak.ts 내부 규약과 동일 — 정오 파싱.) */
function toDayNum(ymd: string): number {
  const [y, m, d] = ymd.split('-').map(Number)
  return Math.floor(Date.UTC(y, m - 1, d, 12) / 86_400_000)
}

export const POST = withApiMiddleware(
  async (req: NextRequest, context: ApiContext) => {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid JSON')
    }

    const parsed = streakCheckinSchema.safeParse(body)
    if (!parsed.success) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'Invalid streak payload')
    }

    const { today } = parsed.data
    // 서버 UTC 날짜 ±2일 상한 — 지구상 어느 시간대의 "오늘"도 UTC ±1일 안이므로
    // 2일이면 여유 포함 전부 커버되고, 그 밖(과거·미래 조작)은 거부.
    const serverDay = Math.floor(Date.now() / 86_400_000)
    const clientDay = toDayNum(today)
    if (!Number.isFinite(clientDay) || Math.abs(clientDay - serverDay) > 2) {
      return apiError(ErrorCodes.VALIDATION_ERROR, 'today is out of range')
    }

    const userId = context.userId!
    const prev = await prisma.visitStreak.findUnique({ where: { userId } })
    const next = computeStreak(prev ? { last: prev.last, count: prev.count } : null, today)
    const longest = Math.max(prev?.longest ?? 1, next.count)

    const row = await prisma.visitStreak.upsert({
      where: { userId },
      create: { userId, last: next.last, count: next.count, longest },
      update: { last: next.last, count: next.count, longest },
      select: { count: true, longest: true },
    })

    logger.info('[streak] checkin', { userId, count: row.count })
    return apiSuccess({ count: row.count, longest: row.longest })
  },
  createAuthenticatedGuard({
    route: '/api/me/streak',
    limit: 30,
    windowSeconds: 60,
  })
)
